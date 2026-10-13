// ===========================================================================
// Apple Pay — the rental flow's wallet button.
//
// Port of the Nuxt site's components/ApplePayButton.vue, without its bugs:
//   - Nuxt's `applePaySupported` started true and was never set false, so the
//     button never actually hid. Here an unsupported browser renders nothing.
//   - Nuxt's failure branch emitted an undefined `err` (a ReferenceError), and
//     its processPayment() was a stub that always returned true.
//
// NOT SAFARI-ONLY. Apple's JS SDK (1.latest) supplies ApplePaySession in
// third-party browsers — Chrome, Edge, Firefox, on Windows and Linux too — where
// the shopper completes the payment by scanning a code with an iPhone on
// iOS 18+. Safari has the session natively and skips the download. The
// session API is the same either way, so the flow below does not branch.
// ===========================================================================

import React, { useEffect, useState } from 'react';
import { ApplePayMark } from './icons';
import { fetchApplePayMerchantSession, type RentalCtx, type WalletPayment } from './api';
import { APPLE_PAY_API_VERSION, APPLE_PAY_SDK_URL, type WalletConfig } from './walletConfig';

// --- The slice of ApplePaySession this uses ----------------------------------
// Local types read through a cast: TypeScript's DOM lib does not ship Apple
// Pay JS, and the project has no @types package for it.

interface ApplePayContact {
  givenName?: string;
  familyName?: string;
  addressLines?: string[];
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
}
interface ApplePayPaymentAuthorizedEvent {
  payment: { token: unknown; billingContact?: ApplePayContact };
}
interface ApplePaySessionLike {
  onvalidatemerchant: ((event: unknown) => void) | null;
  onpaymentauthorized: ((event: ApplePayPaymentAuthorizedEvent) => void) | null;
  oncancel: ((event: unknown) => void) | null;
  begin(): void;
  abort(): void;
  completeMerchantValidation(merchantSession: unknown): void;
  completePayment(status: number): void;
}
interface ApplePaySessionCtor {
  new (version: number, request: Record<string, unknown>): ApplePaySessionLike;
  canMakePayments(): boolean;
  supportsVersion?(version: number): boolean;
  readonly STATUS_SUCCESS: number;
}

const applePaySession = (): ApplePaySessionCtor | undefined =>
  (window as unknown as { ApplePaySession?: ApplePaySessionCtor }).ApplePaySession;

/**
 * ApplePaySession, natively or from Apple's SDK — loaded once per PAGE, and not
 * at all where Safari already has it. Reuses a tag something else injected.
 * Resolves null on failure (blocked by a CSP, offline) and never rejects.
 */
let sdkLoader: Promise<ApplePaySessionCtor | null> | null = null;
function loadApplePaySdk(): Promise<ApplePaySessionCtor | null> {
  if (sdkLoader) return sdkLoader;
  sdkLoader = new Promise<ApplePaySessionCtor | null>((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return; }
    const native = applePaySession();
    if (native) { resolve(native); return; }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${APPLE_PAY_SDK_URL}"]`);
    const tag = existing ?? document.createElement('script');
    tag.addEventListener('load', () => resolve(applePaySession() ?? null));
    tag.addEventListener('error', () => {
      console.warn('[rental] Apple Pay SDK failed to load — hiding the button.');
      resolve(null);
    });
    if (!existing) {
      tag.src = APPLE_PAY_SDK_URL;
      tag.async = true;
      tag.crossOrigin = 'anonymous';
      document.head.appendChild(tag);
    }
  });
  return sdkLoader;
}

/** iPhone, iPod, or iPad — including iPadOS 13+, which reports itself as a
 *  Mac and gives itself away only by having a touch screen. */
function isAppleMobile(): boolean {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
}

/** A phone or tablet of any platform. Chromium says so outright; everything
 *  else is read from the user agent. */
function isMobileDevice(): boolean {
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (uaData?.mobile) return true;
  return /Mobi|Android|Tablet|Silk|Kindle|KaiOS|HarmonyOS|OpenHarmony|Windows Phone|IEMobile|BlackBerry|BB10|Opera Mini|webOS/i
    .test(navigator.userAgent);
}

/**
 * Whether this DEVICE may be offered Apple Pay at all — checked before the SDK
 * is even downloaded.
 *
 * Desktops: yes, any OS — the third-party flow pays by scanning a code with an
 * iPhone. Mobile: iOS / iPadOS ONLY. On any other phone or tablet (Android,
 * HarmonyOS, KaiOS, …) that same flow would ask the shopper to scan their own
 * phone's screen with a second phone, and the platform has its own wallet —
 * which is why the Nuxt site hid it on Android too.
 */
function applePayDeviceAllowed(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isAppleMobile() || !isMobileDevice();
}

/** Whether to offer Apple Pay on this browser, once the session API exists. */
function applePaySupported(Session: ApplePaySessionCtor | null): boolean {
  if (!Session || !applePayDeviceAllowed()) return false;
  try {
    if (Session.supportsVersion && !Session.supportsVersion(APPLE_PAY_API_VERSION)) return false;
    // Throws InvalidAccessError on an insecure origin rather than returning false.
    // In a third-party browser it cannot see the iPhone's cards, so it answers
    // true and the code-scan flow takes it from there.
    return Session.canMakePayments();
  } catch {
    return false;
  }
}

export function ApplePayButton({
  config, total, ctx, canOpen, onToken, onError,
}: {
  /** The content panel's wallet settings, already validated. */
  config: WalletConfig;
  /** The move-in total to charge. */
  total: number;
  ctx: RentalCtx;
  /**
   * The step's validation gate. MUST be synchronous: `new ApplePaySession()`
   * and `begin()` throw InvalidAccessError outside the tap's call stack.
   */
  canOpen: () => boolean;
  /** The sheet succeeded. The token is single-use — hand it on, do not keep it. */
  onToken: (wallet: WalletPayment) => void;
  /** Something the shopper should see, inline beside the buttons. */
  onError: (message: string) => void;
}) {
  /* Safari answers synchronously; elsewhere the SDK has to arrive first, so
     the button appears a beat later rather than being drawn and withdrawn. */
  const [supported, setSupported] = useState(() => applePaySupported(applePaySession() ?? null));
  useEffect(() => {
    // Nothing to load for a device that can never be offered it.
    if (supported || !applePayDeviceAllowed()) return undefined;
    let cancelled = false;
    void loadApplePaySdk().then((Session) => {
      if (!cancelled && applePaySupported(Session)) setSupported(true);
    });
    return () => { cancelled = true; };
  }, [supported]);
  if (!supported) return null;

  /* EVERYTHING up to session.begin() is synchronous. The merchant-session
     fetch happens inside onvalidatemerchant, which Apple calls after begin()
     and which is allowed to be async. */
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!canOpen()) return;
    const Session = applePaySession();
    if (!Session) return;

    let session: ApplePaySessionLike;
    try {
      session = new Session(APPLE_PAY_API_VERSION, {
        merchantIdentifier: config.applePayMerchantIdentifier,
        currencyCode: config.currencyCode,
        countryCode: config.countryCode,
        total: { label: 'Total Amount', amount: total.toFixed(2) },
        supportedNetworks: ['amex', 'masterCard', 'visa'],
        merchantCapabilities: ['supports3DS', 'supportsEMV', 'supportsCredit', 'supportsDebit'],
        /* Not in the Nuxt request — see the matching note in GooglePayButton.
           Duda has no address form on the wallet path. */
        requiredBillingContactFields: ['postalAddress'],
      });
    } catch (err) {
      // e.g. "Page already has an active payment session".
      console.warn('[rental] Apple Pay session could not start:', err);
      onError('Apple Pay could not be started. Please try again or choose another payment method.');
      return;
    }

    session.onvalidatemerchant = () => {
      fetchApplePayMerchantSession(ctx)
        .then((merchantSession) => {
          if (merchantSession) {
            session.completeMerchantValidation(merchantSession);
          } else {
            session.abort();
            onError('Apple Pay is not available right now. Please choose another payment method.');
          }
        })
        .catch((err) => {
          console.warn('[rental] Apple Pay merchant validation failed:', err);
          session.abort();
          onError('Apple Pay is not available right now. Please choose another payment method.');
        });
    };

    session.onpaymentauthorized = (event) => {
      /* Completed at once, as Nuxt does, and the rental is submitted after.
         Holding the sheet open across documents/finalize + lease would risk
         Apple's 30-second timeout on this handler. A rental failure is shown
         inline by the step instead; nothing is charged until the lease call
         spends the token. */
      session.completePayment(Session.STATUS_SUCCESS);
      const c = event.payment.billingContact;
      onToken({
        type: 'applepay',
        // The WHOLE token object — Hummingbird parses it and reads paymentData.
        token: JSON.stringify(event.payment.token),
        first: c?.givenName,
        last: c?.familyName,
        address: c?.addressLines?.filter(Boolean).join(', ') || undefined,
        city: c?.locality,
        state: c?.administrativeArea,
        zip: c?.postalCode,
      });
    };

    // Closing the sheet is a choice, not a failure.
    session.oncancel = () => {};

    try {
      session.begin();
    } catch (err) {
      console.warn('[rental] Apple Pay session could not begin:', err);
      onError('Apple Pay could not be started. Please try again or choose another payment method.');
    }
  };

  return (
    <button
      type="button"
      className="rf2-pay rf2-pay--dark rf2-wallet rf2-wallet--apple"
      onClick={onClick}
      aria-label="Pay with Apple Pay"
    >
      <span className="rf2-wallet-with" aria-hidden="true">Pay with</span>
      <ApplePayMark />
    </button>
  );
}
