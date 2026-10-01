import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './AccountLogin.css';
import { CheckTick, CaretDown, UserCircle, InfoSolid } from './icons';
import { hasCollectionsApi, logSource, str } from '@shared/dudaCollections';
import { readPropertiesFromCollection, PROPERTIES_COLLECTION } from '@shared/propertiesSource';
import { skipValidation } from '@shared/devBypass';

// ===========================================================================
// Widget #17 — Account Login
//
// Every state on the Figma "・Login Pages ✅" canvas (9451:55583), in one
// component. That canvas is annotated as three flows, all of which start from
// the same card and are branches of one state machine rather than three
// screens:
//
//   1. "2FA Login with email or Phone" — identify → phone code → email code
//      → (account picker) → done. Both codes, in that order, whichever the
//      reader typed to identify themselves.
//      9451:55590 (empty) · 9503:123086 (valid, green tick) ·
//      9503:122933 (phone-only, with the extra "Login with Email" button) ·
//      9503:123533 (code, empty) · 9503:123840 (phone code, filled) ·
//      9503:132254 (email code) · 12667:34621 (account picker — only when the
//      email is linked to more than one account).
//   2. "Login With Google" / Apple — 9503:125657. NOT BUILT. The social
//      sign-in buttons were removed for now; only the email/phone code flow
//      and the 3rd-party handoff below ship. The Google and Apple marks are
//      still in `icons.tsx` for whenever this comes back.
//   3. "Login to 3rd Party URL" — 10550:44560 / 10550:80208. The card gains a
//      "Select Storage Property" dropdown; a property whose account portal is
//      hosted elsewhere sends the reader there instead of asking for a code.
//
// Mobile: 10640:67357 (350px card).
//
// NOTHING HERE IS CONNECTED. There is no auth backend wired to this repo; the
// screens are built so the APIs can be hooked up without touching the UI.
// Two seams, and nothing else in this file knows how either is done:
//   · `lookupAccount` — who the identifier belongs to: the phone and email the
//     codes go to, and every account linked to them. Returns demo data.
//   · `verifyCode`    — checks a code. Accepts `bypassCode` (default "000000")
//     and rejects everything else, so the flow is walkable end to end.
// ===========================================================================

/** Digits in the one-time code (Figma draws six boxes). */
const OTP_LENGTH = 6;

/** Seconds before "Resend Code" can be used again. */
const RESEND_COOLDOWN_S = 30;

type Step = 'identify' | 'verify-phone' | 'verify-email' | 'choose' | 'done';
type IdentifierKind = 'phone' | 'email';

interface PropertyOption {
  id: string;
  name: string;
  /** Portal hosted off-site; when set, Continue goes here instead of to the code step. */
  loginUrl: string;
}

// ---------------------------------------------------------------------------
// Dev-harness fallback for the property dropdown.
//
// Outside Duda there's no dmAPI to read, so without this the select renders with
// no options and the 3rd-party flow can't be walked at all. Same pattern the blog
// widgets use for their posts.
//
// The locations are #02 navigation-bar's "Find Storage" menu (FIND_STORAGE_MENU),
// so the two agree about where this operator has properties — one city per state
// it covers, plus the real Irvine facility that menu links to. Naming follows
// Figma's example, "Storage Outlet Pomona" (10550:80208).
//
// Duplicated rather than imported: no widget in this repo reaches into another
// widget's directory, and on the published site this list is never used — the
// `Properties` collection is.
// ---------------------------------------------------------------------------

const DEMO_PROPERTIES: PropertyOption[] = [
  // The facility Find Storage › California › Irvine actually points at.
  { id: 'irvine-5281', name: '5281 California — Irvine', loginUrl: '' },
  { id: 'ca-los-angeles', name: 'Storage Outlet Los Angeles', loginUrl: '' },
  { id: 'ca-san-diego', name: 'Storage Outlet San Diego', loginUrl: '' },
  { id: 'ca-newport-beach', name: 'Storage Outlet Newport Beach', loginUrl: '' },
  { id: 'az-phoenix', name: 'Storage Outlet Phoenix', loginUrl: '' },
  { id: 'or-portland', name: 'Storage Outlet Portland', loginUrl: '' },
  // One property deliberately carries a portal URL, so the 3rd-party branch is
  // reachable in the harness — picking this one and pressing Continue redirects
  // instead of asking for a code.
  { id: 'wa-seattle', name: 'Storage Outlet Seattle', loginUrl: 'https://example.com/portal/seattle' },
];

// ---------------------------------------------------------------------------
// Identifier parsing
// ---------------------------------------------------------------------------

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Digits only — "(949) 365-9387" → "9493659387". */
function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

/** US numbers: ten digits, or eleven led by the country code. */
function isPhone(value: string): boolean {
  const d = digitsOf(value);
  return d.length === 10 || (d.length === 11 && d.startsWith('1'));
}

/**
 * Does this look like someone typing a number rather than an address?
 * Used to decide whether to reformat as the reader types — the field takes
 * either, so it can't just assume one.
 */
function looksNumeric(value: string): boolean {
  return value.trim() !== '' && !/[a-zA-Z@]/.test(value);
}

/** Progressive display format: "9493659387" → "(949) 365-9387". */
function formatPhoneInput(value: string): string {
  const d = digitsOf(value).replace(/^1/, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** How the code step names the destination — Figma: "+1 (949) 123-4567". */
function formatDestination(value: string, kind: IdentifierKind): string {
  if (kind === 'email') return value.trim();
  const d = digitsOf(value).replace(/^1/, '');
  if (d.length !== 10) return value.trim();
  return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// ---------------------------------------------------------------------------
// The account seam
// ---------------------------------------------------------------------------

/** One account (rental) on file — a row of the picker (Figma 12667:34621). */
export interface LinkedAccount {
  id: string;
  name: string;
  /** Rented spaces on the account — "(1 Space)" / "(2 Spaces)". */
  spaces: number;
  email: string;
  /** Raw digits. */
  phone: string;
}

export interface AccountLookup {
  /** Where the phone code goes. Raw digits. */
  phone: string;
  /** Where the email code goes. */
  email: string;
  /** Every account linked to that email. More than one ⇒ the picker. */
  accounts: LinkedAccount[];
}

/** The picker frame's own sample rows. */
const DEMO_ACCOUNTS: Omit<LinkedAccount, 'email'>[] = [
  { id: 'demo-1', name: 'Jane Doe', spaces: 1, phone: '9497489365' },
  { id: 'demo-2', name: 'Janey Do', spaces: 2, phone: '9499387777' },
];

/**
 * Who `identifier` belongs to. STUB — returns demo data shaped like the real
 * answer: whichever half the reader typed is echoed back, the other half is
 * the Figma's sample. Async already, so the real request drops in without
 * changing a call site.
 */
async function lookupAccount(
  identifier: string, kind: IdentifierKind, demoAccountCount: number,
): Promise<AccountLookup> {
  const phone = kind === 'phone' ? digitsOf(identifier) : '9491234567';
  const email = kind === 'email' ? identifier.trim() : 'john.doe@tenantinc.com';
  const count = Math.max(1, Math.min(DEMO_ACCOUNTS.length, demoAccountCount));
  return { phone, email, accounts: DEMO_ACCOUNTS.slice(0, count).map((a) => ({ ...a, email })) };
}

/** "9497489365" → "(949) 748-9365". */
function formatPhoneDisplay(digits: string): string {
  const d = digitsOf(digits).replace(/^1/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : digits;
}

// ---------------------------------------------------------------------------
// The verification seam
// ---------------------------------------------------------------------------

/**
 * Check a one-time code. THE ONLY PLACE that decides whether a code is good.
 *
 * Stubbed against `bypassCode` until there's an endpoint to call — swap the body
 * for the real request and the rest of the widget is unchanged. Async already,
 * so that swap doesn't change any call site.
 */
async function verifyCode(code: string, bypassCode: string): Promise<boolean> {
  return code === bypassCode;
}

// ---------------------------------------------------------------------------
// One-time code input
// ---------------------------------------------------------------------------

interface OtpInputProps {
  value: string;
  onChange: (next: string) => void;
  invalid: boolean;
  /** Fires when the last box is filled, so a complete code can submit itself. */
  onComplete: (code: string) => void;
}

function OtpInput({ value, onChange, invalid, onComplete }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))];
    el?.focus();
    el?.select();
  };

  /** Write one box and report the resulting code. */
  const setDigit = (index: number, digit: string) => {
    const chars = value.padEnd(OTP_LENGTH, ' ').split('');
    chars[index] = digit || ' ';
    const next = chars.join('').replace(/ +$/, '');
    onChange(next);
    return next;
  };

  const handleChange = (index: number, raw: string) => {
    // Take the LAST digit typed: with a box already filled, the browser hands us
    // "45" rather than replacing, and the reader means the new character.
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) {
      setDigit(index, '');
      return;
    }
    const next = setDigit(index, digit);
    if (index < OTP_LENGTH - 1) focusBox(index + 1);
    if (next.replace(/\s/g, '').length === OTP_LENGTH) onComplete(next);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      // Backspace in an empty box steps back and clears — otherwise the caret
      // would sit in a box that's already blank and nothing would happen.
      if (!value[index]?.trim() && index > 0) {
        e.preventDefault();
        setDigit(index - 1, '');
        focusBox(index - 1);
      }
      return;
    }
    if (e.key === 'ArrowLeft' && index > 0) { e.preventDefault(); focusBox(index - 1); }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) { e.preventDefault(); focusBox(index + 1); }
  };

  // Codes arrive by SMS and get pasted whole — spread them across the boxes
  // rather than dropping all six characters into the one that has focus.
  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    const chars = value.padEnd(OTP_LENGTH, ' ').split('');
    for (let i = 0; i < pasted.length && index + i < OTP_LENGTH; i++) chars[index + i] = pasted[i];
    const next = chars.join('').replace(/ +$/, '');
    onChange(next);
    const landed = Math.min(index + pasted.length, OTP_LENGTH - 1);
    focusBox(landed);
    if (next.replace(/\s/g, '').length === OTP_LENGTH) onComplete(next);
  };

  return (
    <div className={`al-otp${invalid ? ' al-otp--invalid' : ''}`}>
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className="al-otp-box"
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={2}
          value={value[i]?.trim() ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
          aria-invalid={invalid}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface AccountLoginProps {
  heading?: string;
  subheading?: string;
  /**
   * What the first field accepts.
   *  'phoneOrEmail' — Figma 9451:55590, placeholder "Mobile Number or Email".
   *  'phone'        — Figma 9503:122933: placeholder "Mobile Number", plus a
   *                   third "Login with Email" button that switches to email.
   *  'email'        — email only.
   */
  identifierMode?: 'phoneOrEmail' | 'phone' | 'email';
  /** Show the "Select Storage Property" dropdown (the 3rd-party-URL flow). */
  showPropertySelect?: boolean;
  /** Collection the property list is read from. */
  propertiesCollection?: string;
  /**
   * Column on a property row holding its off-site portal URL. A property with a
   * value here skips the code step and redirects.
   */
  propertyLoginUrlField?: string;
  /** Applies to every property when the column above is absent. */
  thirdPartyLoginUrl?: string;
  /** Where a verified reader lands. Blank shows the built-in confirmation. */
  successUrl?: string;
  /** Code accepted while there's no auth backend. See `verifyCode`. */
  bypassCode?: string;
  /**
   * Accounts the stubbed `lookupAccount` reports for the email — 1 skips the
   * picker, 2 shows it. Harness-only knob; it goes away with the stub.
   */
  demoAccountCount?: number;
}

export function AccountLogin({
  heading = 'Account Login',
  subheading = 'Enter the mobile number associated with your storage account.',
  identifierMode = 'phoneOrEmail',
  showPropertySelect = false,
  propertiesCollection = PROPERTIES_COLLECTION,
  propertyLoginUrlField = 'accountPortalUrl',
  thirdPartyLoginUrl = '',
  successUrl = '',
  bypassCode = '000000',
  demoAccountCount = 1,
}: AccountLoginProps) {
  const [step, setStep] = useState<Step>('identify');

  // 'phone' mode can be switched to email in-session by the "Login with Email"
  // button, so the prop seeds this rather than driving it.
  const [forceEmail, setForceEmail] = useState(false);
  const fieldMode = forceEmail ? 'email' : identifierMode;

  const [identifier, setIdentifier] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [identifyError, setIdentifyError] = useState('');

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [checking, setChecking] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resent, setResent] = useState(false);
  const [lookup, setLookup] = useState<AccountLookup | null>(null);

  const otpHeadingRef = useRef<HTMLHeadingElement>(null);

  // ── Property list (3rd-party flow) ────────────────────────────────────────

  useEffect(() => {
    if (!showPropertySelect) return;
    // No dmAPI means we're not in Duda (dev harness / site editor) — show the
    // demo locations rather than an empty dropdown, and skip the read entirely.
    if (!hasCollectionsApi()) {
      logSource('#17', 'properties', false, 'no dmAPI — not in Duda');
      setProperties(DEMO_PROPERTIES);
      return;
    }
    let cancelled = false;
    readPropertiesFromCollection(propertiesCollection)
      .then((rows) => {
        if (cancelled) return;
        const list = rows
          .map((r) => ({
            id: str(r.id),
            name: str(r.name),
            loginUrl: str(r[propertyLoginUrlField]) || thirdPartyLoginUrl,
          }))
          .filter((p) => p.name);
        logSource('#17', 'properties', true, `${propertiesCollection}, ${list.length} rows`);
        setProperties(list);
      })
      .catch((err) => console.error('[AccountLogin] property read failed:', err));
    return () => { cancelled = true; };
  }, [showPropertySelect, propertiesCollection, propertyLoginUrlField, thirdPartyLoginUrl]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const kind: IdentifierKind = useMemo(() => {
    if (fieldMode === 'email') return 'email';
    if (fieldMode === 'phone') return 'phone';
    return isEmail(identifier) || /[a-zA-Z@]/.test(identifier) ? 'email' : 'phone';
  }, [fieldMode, identifier]);

  const identifierValid = kind === 'email' ? isEmail(identifier) : isPhone(identifier);
  const selectedProperty = properties.find((p) => p.id === propertyId) ?? null;
  const propertyValid = !showPropertySelect || !!propertyId;
  const canContinue = identifierValid && propertyValid;

  const placeholder = fieldMode === 'email'
    ? 'Email'
    : fieldMode === 'phone'
      ? 'Mobile Number'
      : 'Mobile Number or Email';

  // ── Resend cooldown ───────────────────────────────────────────────────────

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // Move focus to the code step's heading when it appears — the card swaps its
  // whole contents, and without this a keyboard or screen-reader user is left
  // on a button that no longer exists.
  useEffect(() => {
    if (step !== 'identify' && step !== 'done') otpHeadingRef.current?.focus();
  }, [step]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleIdentifierChange = (raw: string) => {
    setIdentifyError('');
    // Reformat only while it reads as a number; an email must survive as typed.
    setIdentifier(fieldMode === 'email' || !looksNumeric(raw) ? raw : formatPhoneInput(raw));
  };

  /** Fresh code boxes and cooldown — on entering either code step. */
  const startCodeStep = (next: 'verify-phone' | 'verify-email') => {
    setCode('');
    setCodeError('');
    setResent(false);
    setResendIn(RESEND_COOLDOWN_S);
    setStep(next);
  };

  const finish = () => {
    if (successUrl) {
      window.location.href = successUrl;
      return;
    }
    setStep('done');
  };

  const submitIdentifier = async () => {
    if (showPropertySelect && !propertyId) {
      setIdentifyError('Select a storage property to continue.');
      return;
    }
    /* Harness bypass, compiled out of production builds — @shared/devBypass. */
    if (!skipValidation() && !identifierValid) {
      setIdentifyError(
        kind === 'email' ? 'Enter a valid email address.' : 'Enter a valid 10-digit mobile number.',
      );
      return;
    }
    // 3rd-party flow: the account lives on someone else's portal, so hand off
    // rather than asking for a code we couldn't check.
    if (selectedProperty?.loginUrl) {
      window.location.href = selectedProperty.loginUrl;
      return;
    }
    setLookup(await lookupAccount(identifier, kind, demoAccountCount));
    startCodeStep('verify-phone');
  };

  const submitCode = useCallback(async (candidate: string) => {
    // Count DIGITS, not length: a code with a gap in the middle (click box 6,
    // type) is six characters long but not six digits.
    if (candidate.replace(/\s/g, '').length !== OTP_LENGTH || checking) return;
    setChecking(true);
    setCodeError('');
    try {
      const ok = await verifyCode(candidate, bypassCode);
      if (!ok) {
        setCodeError('That code is incorrect. Check it and try again.');
        return;
      }
      // Phone first, then email — both, whichever the reader identified with.
      if (step === 'verify-phone') {
        startCodeStep('verify-email');
        return;
      }
      if ((lookup?.accounts.length ?? 0) > 1) {
        setStep('choose');
        return;
      }
      finish();
    } finally {
      setChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, bypassCode, successUrl, step, lookup]);

  const resend = () => {
    if (resendIn > 0) return;
    setCode('');
    setCodeError('');
    setResent(true);
    setResendIn(RESEND_COOLDOWN_S);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <div className="al-wrapper">
        <div className="al-card">
          <div className="al-head">
            <h1 className="al-title">You’re signed in</h1>
            <p className="al-sub">Welcome back. Your storage account is ready.</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'choose' && lookup) {
    return (
      <div className="al-wrapper">
        <div className="al-card al-card--choose">
          <div className="al-head al-head--choose">
            <h1 className="al-title al-title--choose" tabIndex={-1} ref={otpHeadingRef}>
              Which account would you like to open?
            </h1>
            <p className="al-sub al-sub--choose">
              More than one rental is linked to{' '}
              <a className="al-sub-link" href={`mailto:${lookup.email}`}>{lookup.email}</a>
              . Select an account to get started. You can switch to another one later.
            </p>
          </div>

          <ul className="al-accounts">
            {lookup.accounts.map((a) => (
              <li key={a.id}>
                {/* The account choice is the seam the real sign-in hangs off;
                    for now any choice completes the flow. */}
                <button type="button" className="al-account" onClick={finish}>
                  <UserCircle className="al-account-avatar" />
                  <span className="al-account-text">
                    <span className="al-account-line">
                      <span className="al-account-name">{a.name}</span>
                      <span className="al-account-spaces">({a.spaces} {a.spaces === 1 ? 'Space' : 'Spaces'})</span>
                    </span>
                    <span className="al-account-detail">
                      {a.email}, <span className="al-account-phone">{formatPhoneDisplay(a.phone)}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="al-merge">
            <InfoSolid className="al-merge-icon" />
            <p className="al-merge-text">
              Want to see all your rentals in one place? Get in touch with us, and we’ll help merge
              your accounts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'verify-phone' || step === 'verify-email') {
    const isEmailStep = step === 'verify-email';
    const destination = isEmailStep
      ? (lookup?.email ?? formatDestination(identifier, 'email'))
      : formatDestination(lookup?.phone ?? identifier, 'phone');
    const complete = code.replace(/\s/g, '').length === OTP_LENGTH;

    return (
      <div className="al-wrapper">
        <div className="al-card">
          <div className="al-head">
            <h1 className="al-title" tabIndex={-1} ref={otpHeadingRef}>
              {isEmailStep ? 'Verify Email' : 'Verify Phone Number'}
            </h1>
            <p className="al-sub">
              Enter the one time code we sent to
              <br />
              {destination}
            </p>
          </div>

          <OtpInput
            key={step}
            value={code}
            onChange={(next) => { setCode(next); setCodeError(''); }}
            invalid={!!codeError}
            onComplete={submitCode}
          />

          {codeError && <p className="al-error" role="alert">{codeError}</p>}
          {resent && !codeError && (
            <p className="al-note" role="status">A new code is on its way.</p>
          )}

          <button
            type="button"
            className="al-cta"
            disabled={(!skipValidation() && !complete) || checking}
            onClick={() => submitCode(code)}
          >
            {checking ? 'Checking…' : 'Continue'}
          </button>

          <button type="button" className="al-resend" onClick={resend} disabled={resendIn > 0}>
            {resendIn > 0 ? `Resend Code in ${resendIn}s` : 'Resend Code'}
          </button>
        </div>
      </div>
    );
  }

  const filled = identifier.trim() !== '';

  return (
    <div className="al-wrapper">
      <div className="al-card">
        <div className="al-head">
          <h1 className="al-title">{heading}</h1>
          <p className="al-sub">{subheading}</p>
        </div>

        <form
          className="al-form"
          onSubmit={(e) => { e.preventDefault(); void submitIdentifier(); }}
          noValidate
        >
          <div className="al-fields">
            {/* ── Property select — Figma 10550:80208 ─────────────────────── */}
            {showPropertySelect && (
              <div className={`al-field al-field--select${propertyId ? ' al-field--filled al-field--valid' : ''}`}>
                <select
                  id="al-property"
                  className="al-field-input al-select"
                  value={propertyId}
                  onChange={(e) => { setPropertyId(e.target.value); setIdentifyError(''); }}
                >
                  <option value="" />
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {/* Label after the control, for the same stacking reason as the
                    identifier field above. */}
                <label className="al-field-label" htmlFor="al-property">Select Storage Property</label>
                <span className="al-field-caret" aria-hidden="true"><CaretDown /></span>
              </div>
            )}

            {/* ── Identifier — Figma 9451:65106 / 9503:123086 ─────────────── */}
            {/* Input BEFORE label is load-bearing, not arbitrary. Both are
                positioned, so DOM order decides which paints on top — and
                browser autofill forces an opaque background onto the input,
                which hides a label stacked underneath it. Ordering it after
                also lets CSS catch `:-webkit-autofill + .al-field-label`, so the
                label still rises when a password manager fills the field
                without firing a change event. */}
            <div className={`al-field${filled ? ' al-field--filled' : ''}${identifierValid ? ' al-field--valid' : ''}`}>
              <input
                id="al-identifier"
                className="al-field-input"
                type={kind === 'email' ? 'email' : 'tel'}
                inputMode={kind === 'email' ? 'email' : 'tel'}
                autoComplete={kind === 'email' ? 'email' : 'tel'}
                value={identifier}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                aria-invalid={!!identifyError}
              />
              <label className="al-field-label" htmlFor="al-identifier">{placeholder}</label>
              {identifierValid && <CheckTick size={24} className="al-field-check" />}
            </div>

            {identifyError && <p className="al-error" role="alert">{identifyError}</p>}

            <button type="submit" className="al-cta" disabled={!canContinue}>
              Continue
            </button>
          </div>

          {/* With Google/Apple removed, the only thing left below the divider is
              the phone-only variant's email escape hatch (Figma 9503:122933) —
              so the divider goes with it rather than ruling off nothing. */}
          {identifierMode === 'phone' && !forceEmail && (
            <>
              <div className="al-or">
                <span className="al-or-rule" />
                <span className="al-or-text">OR</span>
                <span className="al-or-rule" />
              </div>

              <div className="al-social">
                <button
                  type="button"
                  className="al-social-btn"
                  onClick={() => { setForceEmail(true); setIdentifier(''); setIdentifyError(''); }}
                >
                  Login with Email
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
