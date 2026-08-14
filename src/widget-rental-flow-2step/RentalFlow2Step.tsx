import React, { useCallback, useEffect, useRef, useState } from 'react';
import './RentalFlow2Step.css';
import { Step2 } from './Step2';
import {
  fetchProperty, fetchSpaceGroups, extractProtectionPlans, fetchLeaseDocument,
  extractSelectionContext, fetchSelectionFromOffers, findUnitForSelection, fetchMoveInQuote, fetchUnitNumber,
  holdUnit, releaseHold, HOLD_TTL_SECONDS, defaultRentalCtx, reserveSpace,
  type ProtectionPlan, type LeaseDocument, type SelectionContext, type MoveInQuote,
  type UnitHold, type RentalCtx,
} from './api';
import cfg from './config.json';
import { Confirmation, type EntryMode } from './Confirmation';
import { GP_BRIDGE_IS_PROTOTYPE } from './gpHostedFields';
import { OrderRail } from './OrderRail';
import { Shimmer } from '@shared/Shimmer';
import { FormField, Button, Checkbox, DateModal, isPossiblePhone, type FieldType, type PhoneCountry } from '@shared/ui';
import { resolvePropertyId } from '@shared/propertyBinding';
import { resolveCompanyIdFromSources } from '@shared/companySource';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Local calendar date → YYYY-MM-DD (facility-local, no UTC shift). */
const ymd = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// ---------------------------------------------------------------------------
// Widget #99 (TBD) — Rental Flow (2 Step). Figma: Mariposa — Duda.
// Step 1 ("Secure your space now", 8507-23264): contact form + Rent/Reserve.
//   Rent → Move-In Date lightbox (8507-23637). Confirming closes the modal and
//   crossfades to…
// Step 2 ("Secure your space today", 8507-23329): full checkout form.
// ---------------------------------------------------------------------------

export interface RentalFlow2StepProps {
  eyebrow?: string;
  heading?: string;
  /** Underlined link at the end of the SMS-consent paragraph. */
  termsHref?: string;
  /** Operator-editable copy shown under the Reserve button when the reservation
   *  API call fails. Kept generic on purpose — raw status codes / backend text
   *  stay in the console, never in front of the shopper. */
  reserveFailedMessage?: string;
  /** Operator-editable confirmation-page headings (reservation vs rental). */
  reservationHeading?: string;
  rentalHeading?: string;
  /** Selection handed off from the value-tiers page (?size= / ?tier=) —
   *  display context only; the transaction re-resolves server-side. */
  size?: string;
  tier?: string;
  /** Facility handed off from value-tiers (?propertyId=/?companyId=) — resolved
   *  per instance like #14 (bound → Company collection → config), never hardcoded. */
  propertyId?: string;
  companyId?: string;
  /** Tier's group id from the value-tiers handoff (?unitGroupId=) — the proxy
   *  reserve route needs it for the ownership check. */
  unitGroupId?: string;
  /** Proxy base URL for the Reserve write (e.g. https://proxy.host). Empty →
   *  reserve is unavailable (writes never hit the direct edge key). */
  proxyBaseUrl?: string;
  /** "Change Space" link target on the order rail (the value-tiers page). */
  changeSpaceUrl?: string;
  /** Protection-plan brochure PDF, opened from step 2's "Learn More" lightbox. */
  brochureUrl?: string;
  /** Global Payments CLIENT-side (publishable) key for Hosted Fields card
   *  tokenization. The server-side key must NEVER be passed here. */
  gpApiKey?: string;
  /** GP environment; keep 'test' until launch cutover. */
  gpEnvironment?: 'test' | 'prod';
  /** Duda runtime trio, passed by the Widget Builder shim (see #05's shim
   *  for the pattern). inEditor gates editor-vs-published behavior — in
   *  this widget it SUPPRESSES real writes (no unit holds while an editor
   *  fiddles with the page); siteId/elementId identify this placement for
   *  observability and future per-site config lookups. */
  inEditor?: boolean;
  siteId?: string;
  elementId?: string;
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// A single labelled field — now the shared @shared/ui <FormField>. `valid`
// drives the green success state; `error` (submit attempted while invalid)
// turns it red with a concise message. Resting/focus states are the kit's CSS.
function Field({
  id, label, type = 'text', value, valid, error, onChange, phoneCountry,
}: {
  id: string;
  label: string;
  type?: FieldType;
  value: string;
  valid?: boolean;
  /** Submit was attempted while this field is invalid — red state. */
  error?: boolean;
  onChange: (v: string) => void;
  /** Opt in libphonenumber as-you-type formatting for a tel field. */
  phoneCountry?: PhoneCountry;
}) {
  const errorMsg = error
    ? type === 'email'
      ? 'Enter a valid email address'
      : type === 'tel'
        ? 'Enter a valid phone number'
        : `${label} is required`
    : undefined;
  return (
    <FormField
      id={id}
      label={label}
      type={type}
      value={value}
      onChange={onChange}
      required
      state={valid ? 'success' : 'default'}
      error={errorMsg}
      phoneCountry={phoneCountry}
    />
  );
}

// Skeleton only appears past this delay, so fast responses never flash it.
const SKELETON_DELAY_MS = 200;

// Loading skeleton (Figma screen 11): grey blocks mirroring the step-1
// card + order rail footprint, so nothing demo-looking paints first.
function RfSkeleton() {
  return (
    <div className="rf-layout" aria-hidden="true">
      <div className="rf-main">
        <div className="rf-card">
          <Shimmer w={260} h={22} mb={12} />
          <Shimmer w="100%" h={16} mb={20} />
          <Shimmer w="100%" h={64} mb={24} r={8} />
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <Shimmer w="50%" h={46} r={8} /><Shimmer w="50%" h={46} r={8} />
          </div>
          <Shimmer w="100%" h={16} mb={20} />
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <Shimmer w="50%" h={46} r={8} /><Shimmer w="50%" h={46} r={8} />
          </div>
          <Shimmer w={220} h={14} mb={10} />
          <Shimmer w="100%" h={48} mb={28} r={8} />
          <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            <Shimmer w="50%" h={44} r={8} /><Shimmer w="50%" h={44} r={8} />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Shimmer w="50%" h={44} r={8} /><Shimmer w="50%" h={44} r={8} />
          </div>
        </div>
      </div>
      <aside className="rfr-card" style={{ padding: 20 }}>
        <Shimmer w="100%" h={160} mb={18} r={10} />
        <Shimmer w={180} h={16} mb={12} />
        <Shimmer w="100%" h={14} mb={10} />
        <Shimmer w="100%" h={14} mb={10} />
        <Shimmer w={140} h={14} mb={18} />
        <Shimmer w="100%" h={14} mb={10} />
        <Shimmer w="100%" h={18} />
      </aside>
    </div>
  );
}

// Container-width breakpoint: below this the rail becomes the sticky
// top bar (mobile export m01–m05 / spec-05). Same value as #14.
const MOBILE_BP = 640;

const fmtBarCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Sticky collapsed cost bar (mobile): "Total Cost to Move-In: $X /
// Holding Space for 14:59" + chevron. Tapping toggles the full rail
// card in a drop-down sheet (spec-05 Total Cost Dropdown Card).
function MobileRailBar({
  total, holdRemaining, expanded, onToggle,
}: {
  total?: number;
  holdRemaining?: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="rfm-bar" onClick={onToggle} aria-expanded={expanded}>
      <span className="rfm-bar-left">
        <span className="rfm-bar-title">Total Cost to Move-In:</span>
        {holdRemaining != null && (
          <span className="rfm-bar-hold">Holding Space for <b>{fmtBarCountdown(holdRemaining)}</b></span>
        )}
      </span>
      <span className="rfm-bar-right">
        <span className="rfm-bar-total">{total != null ? `$${total.toFixed(2)}` : '—'}</span>
        <span className={`rfm-bar-chev${expanded ? ' rfm-bar-chev--up' : ''}`} aria-hidden="true">▾</span>
      </span>
    </button>
  );
}

// Payment interstitial (Figma screen 10 / mobile m06) — modal overlay
// while the lease+payment finalize. Purely presentational; the parent
// decides when to show it and where to go next.
function PaymentInterstitial({ firstName, brandName }: { firstName: string; brandName: string }) {
  return (
    <div className="rf-interstitial-overlay" role="status" aria-live="polite">
      <div className="rf-interstitial">
        <h3 className="rf-interstitial-h">
          <span className="rf-interstitial-name">{firstName},</span> we’re finalizing your lease &amp; payment
        </h3>
        <div className="rf-interstitial-bar"><div className="rf-interstitial-fill" /></div>
        <p className="rf-interstitial-p">
          Thank you for choosing {brandName}.<br />
          Please sit tight as we wrap up your payment.
        </p>
        {GP_BRIDGE_IS_PROTOTYPE && (
          <p className="rf-demo-banner">
            Demo preview — no payment, lease, or reservation was created.
          </p>
        )}
      </div>
    </div>
  );
}

export interface Contact { first: string; last: string; email: string; phone: string; business: boolean }

// Step 1 — "Secure your space now" contact form.
function Step1Form({
  eyebrow, heading, termsHref, brandName, onRent, onReserve, reserveError,
}: {
  eyebrow: string;
  heading: string;
  termsHref: string;
  brandName: string;
  onRent: (c: Contact) => void;
  onReserve: (c: Contact) => void;
  reserveError?: string;
}) {
  const [business, setBusiness] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [attempted, setAttempted] = useState(false);

  // These four are the "contact information" the lease POST ultimately
  // requires — Rent/Reserve don't proceed until they're present.
  const checks: Array<[string, boolean]> = [
    ['rf-email', isValidEmail(email)],
    ['rf-phone', isPossiblePhone(phone, 'US')],
    ['rf-first', first.trim().length > 0],
    ['rf-last', last.trim().length > 0],
  ];
  const gate = (proceed: (c: Contact) => void) => () => {
    const firstInvalid = checks.find(([, ok]) => !ok);
    if (firstInvalid) {
      setAttempted(true);
      document.getElementById(firstInvalid[0])?.focus();
      return;
    }
    proceed({ first: first.trim(), last: last.trim(), email: email.trim(), phone: phone.trim(), business });
  };
  const bad = (id: string) => attempted && !(checks.find(([k]) => k === id)?.[1]);

  return (
    <div className="rf-card">
      <div className="rf-title">
        <p className="rf-eyebrow">{eyebrow}</p>
        <h2 className="rf-heading">{heading}</h2>
      </div>

      <Checkbox checked={business} onChange={setBusiness} className="rf-business">
        I am renting as a business
      </Checkbox>

      <div className="rf-form">
        <div className="rf-row">
          <Field id="rf-email" label="Email" type="email" value={email}
            valid={isValidEmail(email)} error={bad('rf-email')} onChange={setEmail} />
          <Field id="rf-phone" label="Phone" type="tel" value={phone} phoneCountry="US"
            valid={isPossiblePhone(phone, 'US')} error={bad('rf-phone')} onChange={setPhone} />
        </div>

        {phone.trim().length > 0 && (
          <p className="rf-consent">
            By providing your mobile number, you agree to receive text messages from
            {' '}{brandName}. Message frequency may vary. Standard rates apply. Reply HELP
            for assistance or STOP to unsubscribe.{' '}
            <a href={termsHref}>See Terms and Privacy Policy.</a>
          </p>
        )}

        <div className="rf-row">
          <Field id="rf-first" label="First Name" value={first}
            valid={first.trim().length > 0} error={bad('rf-first')} onChange={setFirst} />
          <Field id="rf-last" label="Last Name" value={last}
            valid={last.trim().length > 0} error={bad('rf-last')} onChange={setLast} />
        </div>
      </div>

      <div className="rf-actions">
        <Button tone="cta" block onClick={gate(onRent)}>Rent</Button>
        <div className="rf-or"><span>or</span></div>
        <Button tone="cta" fill="outline" block onClick={gate(onReserve)}>Reserve</Button>
      </div>
      {reserveError && <p className="rf-form-error" role="alert">{reserveError}</p>}
    </div>
  );
}

// Quick crossfade between steps.
const FADE_MS = 160;

/** thank-you page params (?type=…): confirmation mode instead of the flow. */
export interface ConfirmationData {
  kind: 'rental' | 'reservation';
  unitNumber?: string; code?: string; name?: string; phone?: string;
  moveInDate?: string; reservationDate?: string; entry?: EntryMode; errorMessage?: string;
  /** Immutable order-summary snapshot taken at success — the confirmation rail
   *  renders from THIS, never a live refetch (the unit is now reserved). */
  rail?: {
    property?: import('./api').PropertyInfo;
    selection?: SelectionContext;
    quote?: MoveInQuote;
  };
}

/** One-time random id for the confirmation payload handoff. */
function makeConfirmationNonce(): string {
  try { return crypto.randomUUID().replace(/-/g, ''); } catch { /* older browser */ }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}
const fmtDisplayDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Persist the confirmation payload under a one-time nonce and return the
 *  `?type=&c=` params for the redirect. The transactional/PII values live in
 *  sessionStorage (never the URL); the nonce is the only thing in the query. */
function stashConfirmation(data: ConfirmationData): string {
  const nonce = makeConfirmationNonce();
  try { sessionStorage.setItem(`hb_conf_${nonce}`, JSON.stringify(data)); } catch { /* unavailable */ }
  return nonce;
}

/**
 * Resolve the confirmation to render. Real success is bound to a one-time nonce
 * written at the end of the transaction: the payload is read ONCE and deleted,
 * so a crafted `?type=…` URL — guessed nonce, or altered code/unit/date — can
 * never fake a confirmed page. The editor gets a demo preview; error pages stay
 * URL-driven (they carry no success claim).
 */
function readConfirmationPayload(inEditor: boolean): ConfirmationData | undefined {
  try {
    const p = new URLSearchParams(window.location.search);
    const type = p.get('type');
    if (type !== 'rental' && type !== 'reservation') return undefined;

    if (inEditor) {
      return {
        kind: type, name: 'John', unitNumber: '#111', code: '87368976',
        phone: '(949) 456-8765', moveInDate: 'Jun 20, 2026', reservationDate: 'Jun 18, 2026', entry: 'gate',
      };
    }

    const nonce = p.get('c');
    if (nonce && /^[A-Za-z0-9_-]{6,64}$/.test(nonce)) {
      const key = `hb_conf_${nonce}`;
      const raw = sessionStorage.getItem(key);
      if (raw) {
        sessionStorage.removeItem(key); // single-use
        const data = JSON.parse(raw) as ConfirmationData;
        if (data && data.kind === type) return data;
      }
    }

    // Error page: no success claim, low-sensitivity — still allowed via URL.
    const rawErr = p.get('errorMessage');
    const errorMessage = rawErr
      ? rawErr.slice(0, 140).replace(/https?:\/\/\S+|www\.\S+/gi, '').replace(/[\d()+\-.\s]{10,}/g, ' ').trim() || undefined
      : undefined;
    if (errorMessage) return { kind: type, errorMessage };

    return undefined;
  } catch {
    return undefined;
  }
}

export function RentalFlow2Step({
  eyebrow = 'Great choice!',
  heading = 'Secure your space now',
  termsHref = '#',
  brochureUrl,
  reserveFailedMessage = 'We couldn’t complete your reservation right now. Please try again in a moment — if it keeps happening, contact the facility and we’ll be glad to help.',
  reservationHeading = 'Your reservation is confirmed!',
  rentalHeading = 'Your Space is ready!',
  size: sizeArg,
  tier: tierArg,
  propertyId: propertyIdArg,
  companyId: companyIdArg,
  unitGroupId: unitGroupIdArg,
  proxyBaseUrl = cfg.proxyBaseUrl ?? '',
  changeSpaceUrl,
  gpApiKey,
  gpEnvironment = 'test',
  inEditor = false,
  siteId,
  elementId,
}: RentalFlow2StepProps) {
  // The value-tiers Select hands off via the URL (?size/tier/propertyId/
  // companyId/unitGroupId). Read those first, falling back to props (Duda
  // content fields) — mirrors #14. Without this, companyId is undefined and the
  // widget wrongly queries the Company collection / its config-default facility.
  const urlParam = (k: string): string | undefined => {
    try { return new URLSearchParams(window.location.search).get(k) || undefined; } catch { return undefined; }
  };
  const sizeProp = sizeArg ?? urlParam('size');
  const tierProp = tierArg ?? urlParam('tier');
  const propertyIdProp = propertyIdArg ?? urlParam('propertyId');
  const companyIdProp = companyIdArg ?? urlParam('companyId');
  const unitGroupIdProp = unitGroupIdArg ?? urlParam('unitGroupId');
  const unitIdProp = urlParam('unitId');
  // "Change Space" returns to the value-tiers page the shopper came from.
  const backToSpacesUrl = (() => {
    try {
      const ref = document.referrer;
      if (ref && new URL(ref).origin === window.location.origin) return ref;
    } catch { /* referrer unavailable */ }
    return undefined;
  })();
  // Placement context for every log line — which site/element misbehaved.
  const where = [siteId && `site ${siteId}`, elementId && `element ${elementId}`]
    .filter(Boolean).join(', ');
  const logTag = `[RentalFlow2Step${where ? ` ${where}` : ''}${inEditor ? ' (editor)' : ''}]`;

  const cfgCtx = React.useMemo(() => defaultRentalCtx(), []);
  const effectivePropertyId = resolvePropertyId({ propertyId: propertyIdProp }, cfgCtx.propertyId);
  const [effectiveCompanyId, setEffectiveCompanyId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    resolveCompanyIdFromSources('#99 rental-flow', { companyId: companyIdProp }, cfgCtx.companyId)
      .then((id) => { if (!cancelled) setEffectiveCompanyId(id); })
      .catch(() => { if (!cancelled) setEffectiveCompanyId(cfgCtx.companyId); });
    return () => { cancelled = true; };
  }, [companyIdProp, cfgCtx.companyId]);
  const ctx: RentalCtx = React.useMemo(
    () => ({
      companyId: effectiveCompanyId ?? '',
      propertyId: effectivePropertyId,
      spaceGroupId: propertyIdProp ? undefined : cfgCtx.spaceGroupId,
      // Phase-2 writes (hold / hold-aware quote) go through the proxy, scoped to
      // the handed-off group — mirrors the Reserve boundary. Both required, else
      // the legacy direct-edge test-tenant path is used.
      proxyBaseUrl,
      unitGroupId: unitGroupIdProp,
    }),
    [effectiveCompanyId, effectivePropertyId, propertyIdProp, cfgCtx.spaceGroupId, proxyBaseUrl, unitGroupIdProp],
  );
  const [step, setStep] = useState<1 | 2>(1);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [intent, setIntent] = useState<'rent' | 'reserve'>('rent');
  const [contact, setContact] = useState<Contact | undefined>(undefined);
  const [reserving, setReserving] = useState(false);
  const [reserveError, setReserveError] = useState<string | undefined>(undefined);
  const [moveIn, setMoveIn] = useState<Date>(startOfToday);
  const timer = useRef<number | undefined>(undefined);

  // READ-ONLY wiring (GETs only — see api.ts). Each fetch fails soft to the
  // hard-coded demo content so the widget still renders in the editor, the
  // dev harness offline, or if the API shifts shape.
  const [brandName, setBrandName] = useState('UAT Tenant V2');
  const [propertyInfo, setPropertyInfo] = useState<import('./api').PropertyInfo | undefined>(undefined);
  const [plans, setPlans] = useState<ProtectionPlan[]>([]);
  const [leaseDoc, setLeaseDoc] = useState<LeaseDocument | undefined>(undefined);
  const [selection, setSelection] = useState<SelectionContext | undefined>(undefined);
  const [quote, setQuote] = useState<MoveInQuote | undefined>(undefined);
  const [quoteFailed, setQuoteFailed] = useState(false);

  // FIRST WRITE: entering step 2 places a real hold on the quoted unit
  // (test tenant only — api.ts writesEnabled() guard fails closed elsewhere).
  // 409 = someone else holds it; the unit also vanishes from
  // units/available, so recovery is re-pick → re-quote → re-hold once.
  const [hold, setHold] = useState<UnitHold | undefined>(undefined);
  const [finalizing, setFinalizing] = useState<{ firstName: string } | undefined>(undefined);
  // Office/Gate hours fallback for the confirmation page: the immutable success
  // snapshot occasionally predates propertyInfo loading, so it can lack hours.
  // Hours are read-only + non-sensitive (unlike the money block), so it's safe
  // to refetch them here when the snapshot is missing them. Fail-soft.
  const [confHours, setConfHours] = useState<{ officeHours?: string[]; gateHours?: string[] } | undefined>(undefined);

  // Mobile mode is CONTAINER-width based (widgets embed at any width).
  // Observer attaches to the persistent wrapper — both the skeleton and
  // the live tree share the same root div, so it survives the swap
  // (lesson learned the hard way on #14).
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;
    // Synchronous seed: RO's first callback is async (and throttled to
    // nothing in hidden tabs) — without this a phone gets a desktop flash.
    setIsMobile(node.getBoundingClientRect().width < MOBILE_BP);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setIsMobile(w < MOBILE_BP);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // Skeleton until BOTH base fetches settle (success or failure) — the
  // quote may trickle in later; money keeps its documented demo fallback.
  const [loading, setLoading] = useState(true);
  const [pastDelay, setPastDelay] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setPastDelay(true), SKELETON_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);
  const [holdRemaining, setHoldRemaining] = useState<number | undefined>(undefined);
  const [holdExpired, setHoldExpired] = useState(false);
  const holdRef = useRef<UnitHold | undefined>(undefined);
  holdRef.current = hold;

  useEffect(() => {
    if (step !== 2 || !quote || hold || holdExpired) return;
    if (inEditor) {
      console.log(`${logTag} editor mode — real unit hold suppressed`);
      return;
    }
    let cancelled = false;
    (async () => {
      let result = await holdUnit(ctx, { id: quote.unitId, number: quote.unitNumber });
      if (result.ok === false && result.reason === 'conflict' && !cancelled) {
        console.warn(`${logTag} unit already held — re-picking:`, result.detail);
        const other = await findUnitForSelection(ctx, selection?.size, selection?.price, true); // fresh list — cached one contains the 409'd unit
        if (other && other.id !== quote.unitId && !cancelled) {
          const q = await fetchMoveInQuote(ctx, other);
          if (q && !cancelled) setQuote(q); // rail follows the new unit
          result = await holdUnit(ctx, other);
        }
      }
      if (!cancelled && result.ok) {
        setHold(result.hold);
        // The held unit is now authoritative. Drop any quote that isn't its
        // own (e.g. the pre-hold unit after a conflict re-pick) and re-quote
        // hold-aware — the plain GET 409s once held, so POST { hold_token } is
        // the only source. Fail CLOSED: never show another unit's money.
        const held = result.hold;
        setQuote((prev) => (prev && prev.unitId === held.unitId ? prev : undefined));
        fetchMoveInQuote(ctx, { id: held.unitId, number: held.unitNumber }, held.holdToken)
          .then((q) => {
            if (cancelled) return;
            if (q) setQuote(q);
            else { setQuote(undefined); setQuoteFailed(true); }
          })
          .catch((err) => {
            console.warn(`${logTag} hold-aware re-quote failed — failing closed:`, err);
            if (!cancelled) { setQuote(undefined); setQuoteFailed(true); }
          });
      } else if (!result.ok && result.reason !== 'writes-disabled') {
        console.warn(`${logTag} hold not acquired:`, result.reason, result.detail);
      }
    })();
    return () => { cancelled = true; };
  }, [step, quote, hold, holdExpired, selection, inEditor, logTag, ctx]);

  // Countdown driven by the acquisition timestamp, not a decrementing
  // counter — survives re-renders and background-tab throttling.
  useEffect(() => {
    if (!hold) { setHoldRemaining(undefined); return undefined; }
    const tick = () => {
      const left = HOLD_TTL_SECONDS - Math.floor((Date.now() - hold.heldAt) / 1000);
      setHoldRemaining(Math.max(0, left));
      if (left <= 0) {
        console.warn(`${logTag} hold expired`);
        setHold(undefined);
        setHoldExpired(true); // stop auto-renew — require an explicit reacquire
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [hold, logTag]);

  // Release on unmount. (Navigating away entirely skips this — the server
  // expires the hold on its own; release is best-effort by design.)
  useEffect(() => () => {
    if (holdRef.current) void releaseHold(ctx, holdRef.current);
  }, [ctx]);

  useEffect(() => {
    let cancelled = false;
    let settled = 0;
    // On the confirmation page the unit is already reserved — a live re-fetch
    // would drop it or re-price it. The rail renders from the success snapshot
    // instead, so skip all data loading here.
    try {
      const confType = new URLSearchParams(window.location.search).get('type');
      if (confType === 'rental' || confType === 'reservation') { setLoading(false); return () => { cancelled = true; }; }
    } catch { /* ignore */ }
    // Duda re-renders the same root when panel props change — reset all
    // derived state so a stale selection/quote can't survive a context switch.
    setLoading(true);
    setSelection(undefined);
    setQuote(undefined);
    setQuoteFailed(false);
    if (holdRef.current) {
      void releaseHold(ctx, holdRef.current);
      setHold(undefined);
    }
    // Wait for the async company id before hitting the facility API.
    if (effectiveCompanyId === null) return () => { cancelled = true; };
    const settle = () => { if (!cancelled && ++settled >= 2) setLoading(false); };
    fetchProperty(ctx)
      .then((p) => {
        if (cancelled || !p) return;
        if (p.name) setBrandName(p.name);
        setPropertyInfo(p);
      })
      .catch((err) => console.error(`${logTag} fetchProperty error:`, err))
      .finally(settle);
    fetchSpaceGroups(ctx)
      .then((raw) => {
        if (cancelled) return;
        setPlans(extractProtectionPlans(raw));
        if (unitIdProp || unitGroupIdProp || sizeProp) {
          const sel = extractSelectionContext(raw, unitGroupIdProp, sizeProp);
          // Prefer the richer /offers selection (amenities, real promo rate) —
          // the same data the value-tiers card uses. Set the rail's selection
          // ONCE, from offers when available, so it never flashes the thin
          // space-groups price before the promo rate loads.
          if (unitGroupIdProp) {
            fetchSelectionFromOffers(ctx, unitGroupIdProp, { tier: tierProp, unitId: unitIdProp, size: sizeProp })
              .then((rich) => { if (!cancelled) setSelection(rich ?? sel ?? undefined); })
              .catch(() => { if (!cancelled && sel) setSelection(sel); });
          } else if (sel) {
            setSelection(sel);
          }
          const resolveUnit: Promise<{ id: string; number?: string } | undefined> = unitIdProp
            // Handoff gives only a unitId; resolve its number so the rail and the
            // confirmation can show "Space #…" (the reserve response omits it).
            ? fetchUnitNumber(ctx, unitIdProp).then((number) => ({ id: unitIdProp, number }))
            : sel
              ? findUnitForSelection(ctx, sel.size, sel.price)
              : Promise.resolve(undefined);
          resolveUnit
            .then((unit) => (unit ? fetchMoveInQuote(ctx, unit) : undefined))
            .then((q) => {
              if (cancelled) return;
              if (q) setQuote(q);
              else setQuoteFailed(true);
            })
            .catch((err) => {
              console.warn(`${logTag} move-in quote unavailable — rail shows the technical-difficulty note:`, err);
              if (!cancelled) setQuoteFailed(true);
            });
          if (!sel && !unitIdProp) console.warn(`${logTag} handoff selection not found in live data`, { tierProp, sizeProp, unitGroupIdProp });
        }
      })
      .catch((err) => console.error(`${logTag} fetchSpaceGroups error:`, err))
      .finally(settle);
    fetchLeaseDocument(ctx)
      .then((doc) => { if (!cancelled) setLeaseDoc(doc); })
      .catch((err) => console.error(`${logTag} fetchLeaseDocument error:`, err));
    return () => { cancelled = true; };
  }, [sizeProp, tierProp, unitIdProp, unitGroupIdProp, logTag, ctx, effectiveCompanyId]);

  const goToStep = useCallback((next: 1 | 2) => {
    setPhase('out');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setStep(next);
      setPhase('in');
    }, FADE_MS);
  }, []);

  // Read the one-time confirmation payload exactly once (it self-deletes), then
  // reuse it across re-renders via the ref.
  const confirmationRef = useRef<ConfirmationData | undefined | 'unread'>('unread');
  if (confirmationRef.current === 'unread') confirmationRef.current = readConfirmationPayload(inEditor);
  const confirmation = confirmationRef.current;

  // Fill missing office/gate hours on the confirmation page (snapshot may predate
  // the property load). Read-only, fail-soft; runs only when hours are absent.
  useEffect(() => {
    const conf = confirmationRef.current;
    if (!conf || conf === 'unread') return;
    const p = conf.rail?.property;
    if ((p?.officeHours?.length ?? 0) > 0 || (p?.gateHours?.length ?? 0) > 0) return;
    if (!effectiveCompanyId) return;
    let cancelled = false;
    fetchProperty(ctx)
      .then((info) => { if (!cancelled && info) setConfHours({ officeHours: info.officeHours, gateHours: info.gateHours }); })
      .catch(() => { /* fail-soft: hours just stay hidden */ });
    return () => { cancelled = true; };
  }, [ctx, effectiveCompanyId]);
  if (confirmation) {
    // Reservations are REAL (hold + reserve POSTs exist), so they show real
    // response data and NO demo banner. The prototype banner stays only for
    // the RENTAL flow, whose payment step is still the GP bridge prototype.
    //
    // The rail renders from the IMMUTABLE success snapshot — never live state —
    // because the unit is now reserved and would re-price/vanish. Editor
    // preview has no snapshot and falls back to whatever live state exists.
    const snap = confirmation.rail;
    const snapProp = snap?.property ?? propertyInfo;
    const fmtPhone = snapProp?.phone
      ? snapProp.phone.replace(/^1?(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')
      : undefined;
    // Drop the confirmation params so "Rent Online Now"/"Try again" re-enter the
    // flow (checkout) for the SAME unit instead of replaying the confirmation.
    const checkoutUrl = (() => {
      try {
        const u = new URL(window.location.href);
        ['type', 'c', 'errorMessage'].forEach((k) => u.searchParams.delete(k));
        return u.toString();
      } catch { return undefined; }
    })();
    const goToCheckout = () => { if (checkoutUrl) window.location.assign(checkoutUrl); };
    return (
      <div className="rf-wrapper">
        {GP_BRIDGE_IS_PROTOTYPE && confirmation.kind === 'rental' && (
          <div className="rf-demo-banner rf-demo-banner--page" role="note">
            Demo preview — no payment or lease was created.
          </div>
        )}
        <div className="rfc-layout">
          <Confirmation
            {...confirmation}
            confirmedHeading={confirmation.kind === 'reservation' ? reservationHeading : rentalHeading}
            facilityPhone={fmtPhone}
            officeHours={snapProp?.officeHours?.length ? snapProp.officeHours : confHours?.officeHours}
            gateHours={snapProp?.gateHours?.length ? snapProp.gateHours : confHours?.gateHours}
            rentUrl={confirmation.kind === 'reservation' ? checkoutUrl : undefined}
            onRetry={goToCheckout}
          />
          {/* Right column is the SAME shared order-summary rail (via OrderRail),
              fed from the immutable success snapshot. */}
          <OrderRail property={snapProp} selection={snap?.selection} quote={snap?.quote} estimate={confirmation.kind === 'reservation'} />
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="rf-wrapper" ref={wrapRef}>{pastDelay ? <RfSkeleton /> : null}</div>;
  }

  const rail = (
    <OrderRail
      property={propertyInfo}
      selection={selection}
      quote={quote}
      changeSpaceUrl={changeSpaceUrl ?? backToSpacesUrl}
      holdRemaining={isMobile ? undefined : holdRemaining}
      quoteFailed={quoteFailed}
      quoteAssumesToday={moveIn.getTime() > startOfToday().getTime()}
    />
  );

  return (
    <div className={`rf-wrapper${isMobile ? ' rf-wrapper--mobile' : ''}`} ref={wrapRef}>
      {isMobile && (
        <div className="rfm-top">
          <MobileRailBar
            total={quote?.totalDue}
            holdRemaining={holdRemaining}
            expanded={railOpen}
            onToggle={() => setRailOpen((o) => !o)}
          />
          {railOpen && <div className="rfm-sheet">{rail}</div>}
        </div>
      )}
      <div className="rf-layout">
        <div className="rf-main">
          {step === 2 && holdExpired && (
            <div className="rf-hold-expired" role="alert">
              <span>Your hold expired — your space wasn’t reserved. Reacquire it to continue.</span>
              <Button tone="cta" onClick={() => setHoldExpired(false)}>Reacquire space</Button>
            </div>
          )}
          <div className={`rf-step rf-step--${phase}`}>
        {step === 1 ? (
          <Step1Form
            eyebrow={eyebrow}
            heading={heading}
            termsHref={termsHref}
            brandName={brandName}
            reserveError={reserveError}
            onRent={(c) => { setContact(c); setIntent('rent'); setDateModalOpen(true); }}
            onReserve={(c) => { setContact(c); setIntent('reserve'); setReserveError(undefined); setDateModalOpen(true); }}
          />
        ) : (
          <Step2
            moveIn={moveIn}
            plan={plans[0]}
            leaseDocName={leaseDoc?.name}
            brochureUrl={brochureUrl}
            onEditDate={() => setDateModalOpen(true)}
            gpApiKey={gpApiKey}
            gpEnvironment={gpEnvironment}
            payNowTotal={quote?.totalDue}
            onPaymentComplete={(info) => {
              setFinalizing(info);
              // Prototype bridge: no server-side sale endpoint yet (B4), so
              // after the finalizing beat, land on the confirmation page with
              // the REAL held unit number.
              const unitNo = hold?.unitNumber ?? quote?.unitNumber;
              const nonce = stashConfirmation({
                kind: 'rental',
                name: info.firstName,
                unitNumber: unitNo ? `#${unitNo}` : undefined,
                moveInDate: fmtDisplayDate(moveIn),
                rail: { property: propertyInfo, selection, quote },
              });
              window.setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('unit_number');
                url.searchParams.set('type', 'rental');
                url.searchParams.set('c', nonce);
                window.location.assign(url.toString());
              }, 3200);
            }}
          />
        )}
          </div>
        </div>
        {!isMobile && rail}
      </div>

      {finalizing && <PaymentInterstitial firstName={finalizing.firstName} brandName={brandName} />}

      <DateModal
        open={dateModalOpen}
        onClose={() => setDateModalOpen(false)}
        selected={moveIn}
        onSelect={setMoveIn}
        title={intent === 'reserve' ? 'Select your Move-In Date' : undefined}
        ctaLabel={intent === 'reserve' ? 'Reserve Now' : undefined}
        busy={reserving}
        onConfirm={async () => {
          if (intent === 'reserve') {
            if (!contact) { setDateModalOpen(false); return; }
            // Whole reserve handler is guarded: any await (find/hold/reserve)
            // can reject, and an unhandled rejection would freeze the modal in
            // its busy state with no message. finally always clears `reserving`.
            setReserving(true);
            try {
              // Documented reserve flow: hold the chosen unit, then reserve it
              // (reserveSpace re-prices via lease-setup). Reuse an existing hold
              // if one is already live for this unit.
              const picked = quote?.unitId
                ? { id: quote.unitId, number: quote.unitNumber }
                : await findUnitForSelection(ctx, selection?.size, selection?.price);
              if (!picked?.id || !unitGroupIdProp) {
                setDateModalOpen(false);
                setReserveError('This space is no longer available to reserve. Please pick another.');
                return;
              }
              let heldToken = hold && hold.unitId === picked.id ? hold.holdToken : undefined;
              if (!heldToken) {
                const h = await holdUnit(ctx, picked);
                if (!h.ok) {
                  setDateModalOpen(false);
                  setReserveError(h.reason === 'conflict'
                    ? 'That space was just taken. Please pick another.'
                    : 'This space is no longer available to reserve. Please pick another.');
                  return;
                }
                setHold(h.hold);
                heldToken = h.hold.holdToken;
              }
              const result = await reserveSpace(ctx, {
                unit: picked,
                holdToken: heldToken,
                startDate: ymd(moveIn),
                platform: brandName ? `${brandName} Website` : 'website',
                contact: { first: contact.first, last: contact.last, email: contact.email, phone: contact.phone },
              });
              setDateModalOpen(false);
              if (result.ok) {
                // Bind the confirmation to a one-time nonce: the payload (incl.
                // PII + code) lives in sessionStorage; only the nonce is in the URL.
                const nonce = stashConfirmation({
                  kind: 'reservation',
                  name: contact.first,
                  phone: contact.phone,
                  unitNumber: result.unitNumber ? `#${result.unitNumber}` : undefined,
                  code: result.reservationId,
                  moveInDate: fmtDisplayDate(moveIn),
                  reservationDate: fmtDisplayDate(new Date()),
                  // Immutable snapshot of the AUTHORITATIVE reserve-time cost
                  // (what we submitted), falling back to the step-2 quote.
                  rail: { property: propertyInfo, selection, quote: result.quote ?? quote },
                });
                const url = new URL(window.location.href);
                ['unit_number', 'code', 'move_in_date', 'reservation_date'].forEach((k) => url.searchParams.delete(k));
                url.searchParams.set('type', 'reservation');
                url.searchParams.set('c', nonce);
                window.location.assign(url.toString());
              } else {
                // Keep the raw API detail (status codes, backend text) in the
                // console for debugging, but never show it to the shopper — the
                // UI gets a calm, professional message instead.
                console.error(`${logTag} reserve failed:`, result.error);
                setReserveError(reserveFailedMessage);
              }
            } catch (err) {
              console.error(`${logTag} reserve error:`, err);
              setDateModalOpen(false);
              setReserveError('Something went wrong completing your reservation. Please try again.');
            } finally {
              setReserving(false);
            }
            return;
          }
          setDateModalOpen(false);
          if (step === 1) goToStep(2);
        }}
      />
    </div>
  );
}
