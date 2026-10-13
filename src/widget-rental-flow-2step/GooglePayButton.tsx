// ===========================================================================
// Google Pay — the rental flow's wallet button.
//
// Port of the Nuxt site's components/GooglePayButton.vue, with three fixes:
//   1. The authJwt is fetched when the button MOUNTS, not inside the click.
//      Nuxt awaited it between the tap and loadPaymentData, which can cost the
//      user gesture — and Chrome then blocks the payment popup.
//   2. One environment value for both the button and the payment request
//      (Nuxt built its button for PRODUCTION and paid against the env value).
//   3. Failures show inline through `onError`, never alert(); a cancelled sheet
//      shows nothing at all.
//
// The button itself is Google's (createButton), not a redrawn mark — Google's
// brand rules require their own rendering.
// ===========================================================================

import { useEffect, useRef, useState } from 'react';
import { fetchGooglePayJwt, type RentalCtx, type WalletPayment } from './api';
import { GOOGLE_PAY_SDK_URL, type WalletConfig } from './walletConfig';

// --- The slice of pay.js this uses ------------------------------------------
// Typed locally and read through a cast rather than declared on Window:
// @shared/googleMaps already declares `window.google` as the Maps namespace,
// and a second global declaration of the same property would conflict.

interface GoogleBillingAddress {
  name?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
}
interface GooglePaymentData {
  paymentMethodData: {
    tokenizationData: { token: string };
    info?: { billingAddress?: GoogleBillingAddress };
  };
}
interface GooglePaymentsClient {
  isReadyToPay(request: Record<string, unknown>): Promise<{ result: boolean }>;
  createButton(options: {
    onClick: (e: Event) => void;
    buttonColor?: 'default' | 'black' | 'white';
    buttonType?: string;
    buttonSizeMode?: 'static' | 'fill';
    buttonRadius?: number;
  }): HTMLElement;
  loadPaymentData(request: Record<string, unknown>): Promise<GooglePaymentData>;
}
interface GooglePayApi {
  PaymentsClient: new (options: { environment: string }) => GooglePaymentsClient;
}

const googlePayApi = (): GooglePayApi | undefined =>
  (window as unknown as { google?: { payments?: { api?: GooglePayApi } } }).google?.payments?.api;

/**
 * Load pay.js once per PAGE, however many widgets ask. Reuses a tag something
 * else already injected rather than adding a second. Resolves null on failure
 * and never rejects — a missing wallet is not an error worth surfacing.
 */
let sdkLoader: Promise<GooglePayApi | null> | null = null;
function loadGooglePaySdk(): Promise<GooglePayApi | null> {
  if (sdkLoader) return sdkLoader;
  sdkLoader = new Promise<GooglePayApi | null>((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return; }
    const ready = googlePayApi();
    if (ready) { resolve(ready); return; }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_PAY_SDK_URL}"]`);
    const tag = existing ?? document.createElement('script');
    tag.addEventListener('load', () => resolve(googlePayApi() ?? null));
    tag.addEventListener('error', () => {
      console.warn('[rental] Google Pay SDK failed to load — hiding the button.');
      resolve(null);
    });
    if (!existing) {
      tag.src = GOOGLE_PAY_SDK_URL;
      tag.async = true;
      document.head.appendChild(tag);
    }
  });
  return sdkLoader;
}

// --- The request -------------------------------------------------------------

const CARD_PARAMETERS = {
  allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
  allowedCardNetworks: ['MASTERCARD', 'VISA', 'AMEX', 'DISCOVER', 'JCB'],
};

/** isReadyToPay takes the card method WITHOUT tokenization or billing. */
const READY_REQUEST = {
  apiVersion: 2,
  apiVersionMinor: 0,
  allowedPaymentMethods: [{ type: 'CARD', parameters: CARD_PARAMETERS }],
};

function paymentRequest(config: WalletConfig, total: number, merchantName: string, authJwt: string): Record<string, unknown> {
  return {
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [{
      type: 'CARD',
      parameters: {
        ...CARD_PARAMETERS,
        /*
         * Not in the Nuxt request. Duda has no address form on the wallet path,
         * and the tenant contact and payment_method both carry a billing
         * address, so the sheet supplies it. Additive: it does not change the
         * token, and every field is optional downstream.
         */
        billingAddressRequired: true,
        billingAddressParameters: { format: 'FULL' },
      },
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        parameters: { gateway: config.googlePayGateway, gatewayMerchantId: config.googlePayGatewayMerchantId },
      },
    }],
    transactionInfo: {
      totalPriceStatus: 'FINAL',
      // Two decimals — Nuxt's toString() sent "70.5" for $70.50.
      totalPrice: total.toFixed(2),
      currencyCode: config.currencyCode,
      countryCode: config.countryCode,
    },
    merchantInfo: {
      merchantId: config.googlePayMerchantId,
      merchantName,
      // Must match the domain_name the JWT was minted for — Hummingbird signs
      // exactly this value as merchantOrigin.
      merchantOrigin: window.location.hostname,
      authJwt,
    },
  };
}

/** "Jane Q Smith" → first "Jane", last "Q Smith". */
function splitName(name?: string): { first?: string; last?: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return {};
  return { first: parts[0], last: parts.slice(1).join(' ') || undefined };
}

/**
 * Hummingbird does not stamp an expiry on the JWT, but Google rejects a stale
 * `iat`, and a shopper can sit on this step for a while. Re-minted in the
 * background on this interval so the one in hand at click time is fresh.
 */
const JWT_REFRESH_MS = 10 * 60 * 1000;
/** Retry cadence while NO token is in hand (first mint failed). */
const JWT_RETRY_MS = 30 * 1000;

export function GooglePayButton({
  config, total, ctx, canOpen, onToken, onError,
}: {
  /** The content panel's wallet settings, already validated. */
  config: WalletConfig;
  /** The move-in total to charge. */
  total: number;
  ctx: RentalCtx;
  /**
   * The step's validation gate. MUST be synchronous — it runs between the tap
   * and loadPaymentData, and anything async there loses the user gesture.
   * Returns false (and shows its own errors) when the sheet must not open.
   */
  canOpen: () => boolean;
  /** The sheet succeeded. The token is single-use — hand it on, do not keep it.
   *  Google's sheet has already closed by now, so any result is not awaited. */
  onToken: (wallet: WalletPayment) => void | Promise<boolean>;
  /** Something the shopper should see, inline beside the buttons. */
  onError: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  /* State, not a ref: the client is bound to the environment, so changing
     TEST/PRODUCTION in the content panel has to rebuild the button too. */
  const [client, setClient] = useState<GooglePaymentsClient | null>(null);
  const jwtRef = useRef<string | undefined>(undefined);
  /** A sheet is open — a second tap must not stack another. */
  const openRef = useRef(false);
  /** 'pending' while the SDK and isReadyToPay resolve; 'off' hides the button. */
  const [sdk, setSdk] = useState<'pending' | 'ready' | 'off'>('pending');
  /** The JWT endpoint refused outright: Google Pay cannot work on this host. */
  const [jwtFailed, setJwtFailed] = useState(false);

  /* The SDK binds its click handler ONCE, at createButton. Reading the props
     through a ref means that handler always sees this render's total, gate
     and callbacks rather than the ones from the render that made the button. */
  const latest = useRef({ config, total, canOpen, onToken, onError });
  latest.current = { config, total, canOpen, onToken, onError };

  // SDK → client → isReadyToPay, again whenever the environment changes.
  const environment = config.googlePayEnvironment;
  useEffect(() => {
    let cancelled = false;
    setClient(null);
    setSdk('pending');
    void loadGooglePaySdk().then(async (api) => {
      if (cancelled) return;
      if (!api) { setSdk('off'); return; }
      try {
        const next = new api.PaymentsClient({ environment });
        const { result } = await next.isReadyToPay(READY_REQUEST);
        if (cancelled) return;
        setClient(result ? next : null);
        setSdk(result ? 'ready' : 'off');
      } catch (err) {
        console.warn('[rental] Google Pay isReadyToPay failed:', err);
        if (!cancelled) setSdk('off');
      }
    });
    return () => { cancelled = true; };
  }, [environment]);

  // The authJwt, fetched ahead of the click and kept fresh.
  useEffect(() => {
    let cancelled = false;
    jwtRef.current = undefined;
    setJwtFailed(false);
    let timer: number | undefined;
    const mint = () => {
      void fetchGooglePayJwt(ctx).then((jwt) => {
        if (cancelled) return;
        if (jwt) {
          jwtRef.current = jwt;
          // Recovery: a FIRST mint can fail transiently (network, a cold
          // backend), and without clearing this the button stayed hidden for
          // the life of the page even once a later mint succeeded.
          setJwtFailed(false);
        } else if (!jwtRef.current) {
          // A failed REFRESH keeps the token already in hand; only a failure
          // with nothing to fall back on hides the button.
          setJwtFailed(true);
        }
        // Re-mint on the refresh cadence while a token is in hand, and much
        // sooner while there is none, so a recovered backend shows the button
        // within seconds rather than ten minutes.
        timer = window.setTimeout(mint, jwtRef.current ? JWT_REFRESH_MS : JWT_RETRY_MS);
      });
    };
    mint();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [ctx]);

  // Google's own button, mounted into the host once everything is ready.
  useEffect(() => {
    const host = hostRef.current;
    if (sdk !== 'ready' || jwtFailed || !host || !client) return undefined;

    /* SYNCHRONOUS from the tap to loadPaymentData — no await anywhere on this
       path, or Chrome treats the popup as unsolicited and blocks it. */
    const handleClick = (e: Event) => {
      e.preventDefault();
      const p = latest.current;
      if (openRef.current) return;
      if (!p.canOpen()) return;
      const jwt = jwtRef.current;
      if (!jwt) {
        p.onError('Google Pay is still loading. Please try again in a moment.');
        return;
      }
      openRef.current = true;
      client.loadPaymentData(paymentRequest(p.config, p.total, p.config.googlePayMerchantName, jwt))
        .then((data) => {
          const token = data.paymentMethodData.tokenizationData.token;
          const addr = data.paymentMethodData.info?.billingAddress;
          void latest.current.onToken({
            type: 'googlepay',
            token,
            ...splitName(addr?.name),
            address: [addr?.address1, addr?.address2, addr?.address3].filter(Boolean).join(', ') || undefined,
            city: addr?.locality,
            state: addr?.administrativeArea,
            zip: addr?.postalCode,
          });
        })
        .catch((err: { statusCode?: string; statusMessage?: string }) => {
          // Closing the sheet is a choice, not a failure.
          if (err?.statusCode === 'CANCELED') return;
          console.warn('[rental] Google Pay failed:', err?.statusCode, err?.statusMessage ?? err);
          latest.current.onError('Google Pay could not complete the payment. Please try again or choose another payment method.');
        })
        .finally(() => { openRef.current = false; });
    };

    const button = client.createButton({
      onClick: handleClick,
      buttonColor: 'black',
      buttonType: 'pay',
      buttonSizeMode: 'fill',
      buttonRadius: 12,
    });
    // Never a submit button, whatever form a host page wraps us in.
    button.setAttribute('type', 'button');
    button.querySelectorAll('button').forEach((b) => b.setAttribute('type', 'button'));
    host.appendChild(button);
    return () => { button.remove(); };
  }, [sdk, jwtFailed, client]);

  // Unsupported here (no SDK, not ready to pay, or no JWT for this host):
  // nothing at all, rather than a button that can only fail.
  if (sdk === 'off' || jwtFailed) return null;
  // The host holds the button's 64px while the SDK loads, so the grid does not
  // jump when it arrives.
  return <div ref={hostRef} className="rf2-wallet rf2-wallet--google" />;
}
