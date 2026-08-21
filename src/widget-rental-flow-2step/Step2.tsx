import React, { useEffect, useRef, useState } from 'react';
import { CheckTick, CalendarIcon, FileArrowIcon, ChevronSolidIcon, InfoIcon, CreditCardIcon, BankIcon, GooglePayMark, ApplePayMark } from './icons';
import { mountGpHostedFields, GpTokenResult, GpFieldValidity } from './gpHostedFields';
import { PlanCoverageBody, ProtectionPlanModal } from './ProtectionPlanModal';
import { LeaseModal } from './LeaseModal';
import { RfCheckbox } from './RfCheckbox';
import { BankForm, CardForm, PaymentFormSkeleton, type CardFormValue } from './PaymentSection';
// The protection-plan lightbox's styles (rf-pp-*) live here. Imported from Step2
// rather than the shell because Step2 is now the only screen that mounts it.
import './screens.css';
import { FormField, Button, isPossiblePhone, type FieldType, type PhoneCountry } from '@shared/ui';

// ---------------------------------------------------------------------------
// Rental Flow — step 2, "Secure your space now" (Figma 8507-23329).
// Contact form + selected move-in date, Protection Plan, Additional Info
// toggles, Rental Agreement (+ "I agree"), and Payment method selection.
// ---------------------------------------------------------------------------

/** How long the static payment form's skeleton shows before the form. */
const FORM_SKELETON_MS = 700;

/**
 * The lease body, rendered BOTH in the inline preview and in the "View
 * Document" lightbox — one definition, so the two can never disagree about
 * what the shopper is agreeing to.
 *
 * Static copy, because the documents API gives us a name/type/signed flag and
 * NO url (see LeaseDocument in api.ts) — there is nothing to embed yet. When a
 * document URL exists this becomes an <iframe>/<embed> and both surfaces get it
 * at once.
 */
function LeaseDocBody({ title }: { title?: string }) {
  return (
    <div className="rf2-doc-page">
      <p className="rf2-doc-title">{title ?? 'Self Storage Rental Agreement'}</p>
      <p className="rf2-doc-h">General Disclosures:</p>
      <p className="rf2-doc-p">
        This Rental Agreement is a month-to-month rental agreement which shall commence on the date of
        execution and shall terminate on the last day of the current month, and each and every month
        thereafter, unless notice is given ten (10) days prior to the end of the last month of tenancy by
        either party, subject to all terms and conditions hereafter stated.
      </p>
      <p className="rf2-doc-p">
        If Tenant elects to hold over or for any reason fails to remove his/her property from the Space after
        the term of this Agreement, then this Agreement shall be automatically renewed, on a month-to-month
        basis. In the event this Agreement is extended or renewed, it is expressly agreed that the covenants
        and terms of this Agreement shall remain in full force and effect.
      </p>
      <p className="rf2-doc-p">
        Tenant agrees to pay the monthly rent in advance on the first day of each month during the term of
        this Agreement. Rent is considered late if not received by the Owner within five (5) days.
      </p>
    </div>
  );
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const formatDate = (d: Date) => `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

// Label-above text field (empty state, grey border).
function FieldAbove({
  label, required, value, onChange, type = 'text', error, phoneCountry, valid,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: FieldType;
  /** Payment was attempted while this required field is empty/invalid. */
  error?: boolean;
  /** Opt in libphonenumber as-you-type formatting for a tel field. */
  phoneCountry?: PhoneCountry;
  /** Override the type-derived rule when a field validates differently. */
  valid?: boolean;
}) {
  const errorMsg = error
    ? type === 'email'
      ? 'Enter a valid email address'
      : type === 'tel'
        ? 'Enter a valid phone number'
        : `${label} is required`
    : undefined;

  /*
   * Green border + tick as soon as the value is good, matching the payment
   * panel (Figma 10080-28126).
   *
   * Derived here from the field's own TYPE rather than wired at each of the
   * ~20 call sites: the rules are the same ones the `required` list applies
   * (a real address for email, a possible number for tel, non-empty
   * otherwise), so deriving them once keeps the tick and the submit gate from
   * ever disagreeing. `valid` overrides it where a field needs a rule of its
   * own.
   *
   * Unlike the red state, this does NOT wait for a submit attempt —
   * confirmation is only useful while the shopper is still in the field.
   */
  const autoValid = type === 'email'
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    : type === 'tel'
      ? isPossiblePhone(value, phoneCountry ?? 'US')
      : value.trim().length > 0;

  return (
    <FormField
      label={label}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      error={errorMsg}
      phoneCountry={phoneCountry}
      state={!errorMsg && (valid ?? autoValid) ? 'success' : 'default'}
    />
  );
}


// Thin alias kept so the step-2 call sites read as before; RfCheckbox owns the
// skin, size and tick. No `small` — every checkbox in the flow is one size now.
function Check({
  checked, onChange, children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <RfCheckbox checked={checked} onChange={onChange}>
      {children}
    </RfCheckbox>
  );
}

// Credit/Debit panel — mounts Global Payments Hosted Fields (PCI iframes)
// into empty divs. Without a client-side key it renders a configuration
// notice instead; card data never touches widget code either way.
function CardFieldsPanel({
  gpApiKey, gpEnvironment, onToken, payNowTotal,
}: {
  gpApiKey?: string;
  gpEnvironment: 'test' | 'prod';
  onToken: (t: GpTokenResult) => void;
  payNowTotal?: number;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | undefined>(undefined);
  const [validity, setValidity] = useState<GpFieldValidity>({});
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gpApiKey) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    mountGpHostedFields({
      apiKey: gpApiKey,
      environment: gpEnvironment,
      targets: {
        number: '#rf2-gp-number',
        expiration: '#rf2-gp-expiration',
        cvv: '#rf2-gp-cvv',
        submit: '#rf2-gp-submit',
      },
      submitText: payNowTotal != null ? `Pay Now $${payNowTotal.toFixed(2)}` : undefined,
      onToken: (t) => { if (!cancelled) onToken(t); },
      onError: (msg) => { if (!cancelled) { setStatus('error'); setError(msg); } },
      onValidity: (v) => { if (!cancelled) { setValidity(v); setStatus('ready'); setError(undefined); } },
    }).then((c) => {
      cleanup = c;
      // The GP iframes appear asynchronously; treat a populated host as ready.
      if (!cancelled && hostRef.current?.querySelector('iframe')) setStatus('ready');
      else if (!cancelled) setStatus('ready'); // fields render momentarily; errors arrive via onError
    });
    return () => { cancelled = true; cleanup?.(); };
  }, [gpApiKey, gpEnvironment, onToken, payNowTotal]);

  if (!gpApiKey) {
    return (
      <div className="rf2-gp rf2-gp--unconfigured">
        Card entry is not configured for this site yet (missing the Global
        Payments client-side key). Set the <code>gpApiKey</code> widget prop.
      </div>
    );
  }
  return (
    <div className="rf2-gp" ref={hostRef}>
      <div className="rf2-gp-grid">
        <label className="rf2-field rf2-gp-slot rf2-gp-slot--number">
          <span className="rf2-field-label">Card Number<span className="rf-req">*</span></span>
          <div id="rf2-gp-number" className="rf2-gp-frame" />
        </label>
        <label className="rf2-field rf2-gp-slot">
          <span className="rf2-field-label">Expiration<span className="rf-req">*</span></span>
          <div id="rf2-gp-expiration" className="rf2-gp-frame" />
        </label>
        <label className="rf2-field rf2-gp-slot">
          <span className="rf2-field-label">CVV<span className="rf-req">*</span></span>
          <div id="rf2-gp-cvv" className="rf2-gp-frame" />
        </label>
      </div>
      <div id="rf2-gp-submit" className="rf2-gp-submit" />
      {status === 'loading' && <p className="rf2-gp-note">Loading secure card fields…</p>}
      {status === 'error' && <p className="rf2-gp-note rf2-gp-note--error">{error}</p>}
      {status === 'ready' && validity.number === false && (
        <p className="rf2-gp-note rf2-gp-note--error">Card number doesn&apos;t look right.</p>
      )}
    </div>
  );
}

/** Desktop pointer devices only — mirrored by a @media block in the CSS. */
const PLAN_HOVER_QUERY = '(min-width: 901px) and (hover: hover) and (pointer: fine)';

export function Step2({
  moveIn, plans = [], leaseDocName, onEditDate, gpApiKey, gpEnvironment = 'test', payNowTotal, onPaymentComplete,
  brochureUrl, onPlanChange, paying, payError,
}: {
  moveIn: Date;
  /** Protection plans to choose between, already narrowed to the space type
   *  being rented. Empty → the "confirmed at checkout" note, which now means
   *  the property has no coverage products configured for that type. */
  plans?: import('./api').ProtectionPlan[];
  /** Protection-plan brochure PDF for the "Learn More" lightbox. Absent → the
   *  modal's download button is inert rather than a dead link. */
  brochureUrl?: string;
  /** Lease template name from the documents API. */
  leaseDocName?: string;
  onEditDate: () => void;
  /** The chosen coverage id, or undefined for "I have my own insurance".
   *  Reported upward because the choice re-prices the move-in quote — it is not
   *  a display-only toggle. */
  onPlanChange?: (insuranceId: string | undefined) => void;
  /** Global Payments CLIENT-side (publishable) key — hosted-fields tokenization only. */
  gpApiKey?: string;
  gpEnvironment?: 'test' | 'prod';
  /** Authoritative move-in total (hold-aware quote) — printed on the pay button. */
  payNowTotal?: number;
  /** Card tokenized — parent takes over (interstitial → confirmation). */
  onPaymentComplete?: (info: {
    firstName: string;
    /** Entered card + billing details. Present only on the static card path —
     *  the hosted-fields path never has card data to give. */
    card?: CardFormValue;
    /** Step 2's own contact fields, which the shopper may have edited after
     *  step 1, so these win over the ones captured there. */
    contact?: { first: string; last: string; email: string; phone: string };
    /** Autopay Enrollment checkbox. */
    autopay?: boolean;
    /** Additional Information ticks, so step 3 can open the matching sections
     *  already expanded instead of asking the same questions twice. */
    sections?: { military: boolean; altContact: boolean; vehicle: boolean };
  }) => void;
  /** Payment in flight — locks the pay button against a double charge. */
  paying?: boolean;
  /** Why the rental could not be completed. Shown by the payment panel so the
   *  shopper sees it next to the button they pressed, with their details still
   *  filled in. */
  payError?: string;
}) {
  const [business, setBusiness] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [military, setMilitary] = useState(false);
  // Off, like every other optional section. On, it opens five REQUIRED fields
  // (name, phone, email, address) that block the step until they are filled —
  // so defaulting it to checked made an optional section mandatory.
  const [altContact, setAltContact] = useState(false);
  const [vehicle, setVehicle] = useState(false);

  // Conditional-section fields (Figma 8507-23979 scenarios / screens 12-13).
  const [bizAddress, setBizAddress] = useState('');
  const [bizFirst, setBizFirst] = useState('');
  const [bizLast, setBizLast] = useState('');
  const [agree, setAgree] = useState(false);
  const [autopay, setAutopay] = useState(false);
  // "Learn More" coverage card (Figma 8509-36480). The plan CARD in the page is
  // API-driven (see `plan`); this is the explanatory content behind it.
  //
  // Desktop pointer devices get it as a hover popover; tablet and mobile keep
  // the tap-to-open lightbox. Gated on hover/pointer as well as width because
  // hover on a touchscreen fires on tap and then STICKS — the card would sit
  // there with nothing to dismiss it. The query is duplicated in
  // RentalFlow2Step.css and the two must stay in step: if they disagree there
  // is a width at which both the popover and the lightbox fire.
  const [planOpen, setPlanOpen] = useState(false);
  const [canHover, setCanHover] = useState(
    // Seeded synchronously rather than in the effect: a desktop user who clicks
    // in the first frame would otherwise get the lightbox.
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(PLAN_HOVER_QUERY).matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(PLAN_HOVER_QUERY);
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  // "View Document" lightbox. The agree checkbox inside it drives the SAME
  // `agree` state as the one on the page, so accepting in either place counts.
  const [leaseOpen, setLeaseOpen] = useState(false);

  // Autopay explainer tooltip (Figma 8509-34934).
  const [tipOpen, setTipOpen] = useState(false);
  const tipRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!tipOpen) return;
    const onDown = (e: MouseEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) setTipOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTipOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [tipOpen]);

  // Protection-plan dropdown. Defaults to the plan the operator marked (name
  // "Best Value"), else the first — never nothing, so the card always states a
  // choice rather than looking unanswered. 'own' is the "I have my own
  // insurance" branch, which is a decision rather than a product and so is not
  // in `plans`.
  const [planListOpen, setPlanListOpen] = useState(false);
  const [planChoice, setPlanChoice] = useState<string | 'own'>(
    () => plans.find((p) => /best value/i.test(p.name ?? ''))?.id ?? plans[0]?.id ?? 'own',
  );
  const chosenPlan = plans.find((p) => p.id === planChoice);
  // Plans arrive from the API AFTER first render, so the initializer above
  // usually runs against an empty list and lands on 'own'. Adopt the real
  // default once they load — but only until the shopper has chosen for
  // themselves, so this can never overwrite a deliberate "own insurance".
  const planTouched = useRef(false);
  useEffect(() => {
    if (planTouched.current || !plans.length) return;
    const preferred = plans.find((p) => /best value/i.test(p.name ?? ''))?.id ?? plans[0]?.id;
    if (preferred && preferred !== planChoice) setPlanChoice(preferred);
  }, [plans, planChoice]);
  const choosePlan = (id: string | 'own') => {
    planTouched.current = true;
    setPlanChoice(id);
    setPlanListOpen(false);
  };
  // Report upward whenever the effective coverage changes ('own' = none).
  useEffect(() => {
    onPlanChange?.(planChoice === 'own' ? undefined : planChoice);
  }, [planChoice, onPlanChange]);

  // Close on outside click / Escape, like a native select.
  const planRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!planListOpen) return;
    const onDown = (e: MouseEvent) => {
      if (planRef.current && !planRef.current.contains(e.target as Node)) setPlanListOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlanListOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [planListOpen]);

  // Payment method + Hosted Fields tokenization result. The temporary
  // token is single-use with a 30-minute expiry — comfortably inside the
  // 15-minute unit hold. It is what the (future) server-side move-in
  // charge consumes; no card data exists widget-side.
  const [payMethod, setPayMethod] = useState<'gpay' | 'apple' | 'card' | 'bank' | null>(null);
  const [cardToken, setCardToken] = useState<GpTokenResult | undefined>(undefined);
  const [payAttempted, setPayAttempted] = useState(false);
  /** Skeleton beat before a static payment form appears (Figma 8507-24610). */
  const [formLoading, setFormLoading] = useState(false);

  // Everything the lease POST / payment step requires. Conditional
  // sections only gate while expanded (their checkbox is optional; the
  // fields inside are not).
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneOk = isPossiblePhone(phone, 'US');
  const required: Array<[key: string, ok: boolean]> = [
    ['email', emailOk],
    ['phone', phoneOk],
    ['first', first.trim().length > 0],
    ['last', last.trim().length > 0],
    ['agree', agree],
    ...(business ? [['bizAddress', bizAddress.trim().length > 0],
      ['bizFirst', bizFirst.trim().length > 0],
      ['bizLast', bizLast.trim().length > 0]] as Array<[string, boolean]> : []),
    // Nothing from Additional Information: those three boxes are a statement of
    // intent now and their fields are collected on step 3.
  ];
  const formComplete = required.every(([, ok]) => ok);
  const bad = (key: string) => payAttempted && !(required.find(([k]) => k === key)?.[1] ?? true);
  /** No GP key ⇒ the static forms stand in for hosted fields. */
  const staticPay = !gpApiKey;

  /** A card/bank panel is open, so its button is replaced by the panel and the
   *  other method relocates beneath it. Wallets are one-tap and never expand. */
  const methodOpen = staticPay && (payMethod === 'card' || payMethod === 'bank');

  const selectPayMethod = (m: 'gpay' | 'apple' | 'card' | 'bank') => {
    if (!formComplete) { setPayAttempted(true); return; }
    const next = payMethod === m ? null : m;
    setPayMethod(next);
    setCardToken(undefined);
    // Skeleton beat when opening a static panel. Real hosted fields do their
    // own loading, so this only stands in for them.
    if (staticPay && next && (next === 'card' || next === 'bank')) {
      setFormLoading(true);
      window.setTimeout(() => setFormLoading(false), FORM_SKELETON_MS);
    }
  };

  /** Static "Pay Now" — hands the parent everything the rental APIs need. */
  const payStatically = (card?: CardFormValue) => onPaymentComplete?.({
    firstName: first.trim() || 'there',
    card,
    contact: { first: first.trim(), last: last.trim(), email: email.trim(), phone },
    autopay,
    sections: { military, altContact, vehicle },
  });


  return (
    <div className="rf-card rf2-card">
      <div className="rf-title">
        <p className="rf-eyebrow">Great choice!</p>
        <h2 className="rf-heading">Secure your space now</h2>
      </div>

      <RfCheckbox checked={business} onChange={setBusiness} className="rf-business">
        I am renting as a business
      </RfCheckbox>
      {business && (
        <div className="rf2-expand rf2-expand--top">
          <FieldAbove label="Business Address" required value={bizAddress} onChange={setBizAddress} error={bad('bizAddress')} />
          <div className="rf2-row">
            <FieldAbove label="Business Rep First Name" required value={bizFirst} onChange={setBizFirst} error={bad('bizFirst')} />
            <FieldAbove label="Business Rep Last Name" required value={bizLast} onChange={setBizLast} error={bad('bizLast')} />
          </div>
        </div>
      )}

      <div className="rf2-form">
        <div className="rf2-row">
          <FieldAbove label="Email" required value={email} onChange={setEmail} type="email" error={bad('email')} />
          <FieldAbove label="Phone Number" required value={phone} onChange={setPhone} type="tel" phoneCountry="US" error={bad('phone')} />
        </div>
        <div className="rf2-row">
          <FieldAbove label="First Name" required value={first} onChange={setFirst} error={bad('first')} />
          <FieldAbove label="Last Name" required value={last} onChange={setLast} error={bad('last')} />
        </div>
        <button type="button" className="rf2-movein rf2-movein--valid" onClick={onEditDate}>
          <span className="rf2-movein-text">
            <span className="rf2-movein-label">Move-in Date<span className="rf-req">*</span></span>
            <span className="rf2-movein-value">{formatDate(moveIn)}</span>
          </span>
          <CalendarIcon size={24} />
        </button>
      </div>

      <div className="rf2-sections">
        {/* Protection Plan */}
        <section className="rf2-panel">
          <div className="rf2-rowhead">
            <span className="rf2-h">Select Protection Plan</span>
            {/* The card is a CHILD of the hover target, not a sibling, so
                moving the pointer onto it keeps :hover true — there is no gap
                to cross and nothing to flicker. It is also positioned OVER the
                trigger, so the pointer is already inside the box the moment it
                appears. :focus-within gives keyboard users the same card. */}
            <div className="rf2-learn">
              <button
                type="button"
                className="rf2-link rf2-link--btn"
                aria-haspopup={canHover ? undefined : 'dialog'}
                // On desktop the click is a no-op: hover and focus both already
                // show the card, so opening a lightbox as well would be the
                // very thing this replaced.
                onClick={() => { if (!canHover) setPlanOpen(true); }}
              >
                Learn More
              </button>
              {canHover && (
                <div className="rf2-learn-pop" role="tooltip">
                  <div className="rf-pp-card">
                    <PlanCoverageBody brochureUrl={brochureUrl} />
                  </div>
                </div>
              )}
            </div>
          </div>
          {plans.length ? (
            <div className="rf2-plan-wrap" ref={planRef}>
              {/* Closed control (Figma 8507-23352). The chevron is a separate
                  cell behind a divider, per the frame — but the whole control
                  toggles, so the small cell is not the only target. */}
              <button
                type="button"
                className="rf2-plan"
                aria-haspopup="listbox"
                aria-expanded={planListOpen}
                onClick={() => setPlanListOpen((o) => !o)}
              >
                <span className="rf2-plan-body">
                  {chosenPlan ? (
                    <>
                      <span className="rf2-plan-left">
                        <span className="rf2-plan-cov">
                          <b>${chosenPlan.coverage?.toLocaleString()}</b> Coverage
                        </span>
                        {/best value/i.test(chosenPlan.name ?? '') && (
                          <span className="rf2-plan-best">Best Value</span>
                        )}
                      </span>
                      <span className="rf2-plan-price"><b>${chosenPlan.premium}</b><span>/mo</span></span>
                    </>
                  ) : (
                    <span className="rf2-plan-own-sel">I Have My Own Insurance</span>
                  )}
                </span>
                <span className="rf2-plan-drop">
                  {/* Solid variant (Figma 8508-32282), not the outline
                      ChevronIcon used elsewhere — a visibly heavier mark. */}
                  <ChevronSolidIcon size={14} className={`rf2-chev-down${planListOpen ? ' rf2-chev-up' : ''}`} />
                </span>
              </button>

              {/* Open list (Figma 8508-32894) */}
              {planListOpen && (
                <div className="rf2-plan-menu" role="listbox" aria-label="Protection plans">
                  {plans.map((p, i) => {
                    const best = /best value/i.test(p.name ?? '');
                    return (
                      <React.Fragment key={p.id}>
                        {/* Divider is a SIBLING of the rows, not a border on them:
                            the frame draws it as its own child of the gap-8
                            column, so 8px sits above AND below each line. A
                            border-top would hug the next row instead. */}
                        {i > 0 && <span className="rf2-plan-sep" aria-hidden="true" />}
                        <button
                          type="button"
                          role="option"
                          aria-selected={planChoice === p.id}
                          className={`rf2-plan-opt${best ? ' rf2-plan-opt--best' : ''}`}
                          onClick={() => choosePlan(p.id)}
                        >
                          <span className="rf2-plan-opt-left">
                            <span className="rf2-plan-opt-cov">
                              <b>${p.coverage?.toLocaleString()}</b> Coverage
                            </span>
                            {best && <span className="rf2-plan-best rf2-plan-best--sm">Best Value</span>}
                          </span>
                          <span className="rf2-plan-price"><b>${p.premium}</b><span>/month</span></span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                  {plans.length > 0 && <span className="rf2-plan-sep" aria-hidden="true" />}
                  {/* Not a plan — a declaration that they will supply their own.
                      Hence no price and its own layout in the frame. */}
                  <button
                    type="button"
                    role="option"
                    aria-selected={planChoice === 'own'}
                    className="rf2-plan-opt rf2-plan-opt--own"
                    onClick={() => choosePlan('own')}
                  >
                    <span className="rf2-plan-own-t">I Have My Own Insurance</span>
                    <span className="rf2-plan-own-d">
                      I’ll provide proof of coverage - I’ll buy the Basic Protection Plan if I
                      don’t provide proof of coverage through my homeowners or renters insurance
                      by the end of the month.
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* NO-DEMO-MONEY: the property returned no coverage products for
               this space type — say so instead of faking $2,000/$12. */
            <div className="rf2-plan rf2-plan--pending">
              Protection plan options and pricing will be confirmed at checkout.
            </div>
          )}
        </section>

        {/* Additional Information */}
        <section className="rf2-plain">
          <span className="rf2-h">Additional Information</span>
          <div className="rf2-checks">
            {/* Plain checkboxes: they RECORD an intent, they do not collect it.
                The fields each one used to reveal live on step 3, after payment,
                where the shopper is not standing between them and a card form —
                and the ones ticked here arrive already open. Nothing in this
                section blocks Pay Now any more. */}
            <Check checked={military} onChange={setMilitary}>I am active military</Check>
            <Check checked={altContact} onChange={setAltContact}>I am providing an alternate contact</Check>
            <Check checked={vehicle} onChange={setVehicle}>I am storing a vehicle</Check>
          </div>
        </section>

        {/* Rental Agreement */}
        <section className="rf2-agree">
          <div className="rf2-agree-head">
            <span className="rf2-h">Rental Agreement <span className="rf-req">*</span></span>
            <button type="button" className="rf2-link rf2-link--btn" onClick={() => setLeaseOpen(true)}>
              <FileArrowIcon size={24} />
              {/* "View Document" wraps to two lines in the narrow header row on
                  mobile. Swapped in CSS rather than by state so it responds to
                  the container, not a re-render; display:none also drops the
                  unused label from the accessibility tree, so only one is
                  announced. */}
              <span className="rf2-link-long">View Document</span>
              <span className="rf2-link-short">View</span>
            </button>
          </div>
          <div className="rf2-agree-doc">
            <LeaseDocBody title={leaseDocName} />
          </div>
          <RfCheckbox
            checked={agree}
            onChange={setAgree}
            className="rf2-agree-bar"
          >
            <span className="rf2-agree-text"><b>I agree</b> to the terms and conditions as set out by the rental agreement.</span>
          </RfCheckbox>
          {/* Says what is wrong instead of ringing the row in red. role="alert"
              so it is announced when it appears, not silently drawn. */}
          {bad('agree') && (
            <p className="rf2-agree-error" role="alert">
              You must accept the rental agreement to continue.
            </p>
          )}
        </section>

        {/* Payment */}
        <section className="rf2-panel rf2-payment">
          <span className="rf2-h">Payment</span>
          <div className={`rf2-autopay${autopay ? ' rf2-autopay--on' : ''}`}>
            <Check checked={autopay} onChange={setAutopay}>
              <span className="rf2-autopay-label">Autopay Enrollment</span>
            </Check>
            {/* Click, not hover: a hover-only tooltip is unreachable on touch,
                and this explains a recurring charge. */}
            <span className="rf2-tip-anchor" ref={tipRef}>
              <button
                type="button"
                className="rf2-autopay-info"
                aria-label="About autopay enrollment"
                aria-expanded={tipOpen}
                onClick={() => setTipOpen((o) => !o)}
              >
                <InfoIcon size={16} />
              </button>
              {tipOpen && (
                <span className="rf2-tip" role="tooltip">
                  Enrolling in autopay automatically charges your payment method each month
                </span>
              )}
            </span>
          </div>
          {/* Wallets always sit at the top. The two method buttons only share
              that grid while NEITHER is open — once one is, the open panel
              takes their place and the other method moves below it
              (Figma 10080-28749). */}
          <div className={`rf2-paygrid${methodOpen ? ' rf2-paygrid--wallets' : ''}`}>
            <button type="button" className="rf2-pay rf2-pay--dark" onClick={() => selectPayMethod('gpay')}><GooglePayMark /></button>
            <button type="button" className="rf2-pay rf2-pay--dark" onClick={() => selectPayMethod('apple')}><ApplePayMark /></button>
            {!methodOpen && (
              <>
                <Button
                  tone="dark"
                  fill="outline"
                  block
                  icon={<CreditCardIcon size={24} />}
                  className="rf2-pay-btn"
                  onClick={() => selectPayMethod('card')}
                >
                  Credit / Debit
                </Button>
                <Button
                  tone="dark"
                  fill="outline"
                  block
                  icon={<BankIcon size={24} />}
                  className="rf2-pay-btn"
                  onClick={() => selectPayMethod('bank')}
                >
                  Pay by Bank
                </Button>
              </>
            )}
          </div>
          {payAttempted && !formComplete && (
            <p className="rf2-gp-note rf2-gp-note--error">
              Complete the highlighted fields (and accept the rental agreement) to continue to payment.
            </p>
          )}
          {payError && (
            <p className="rf2-gp-note rf2-gp-note--error" role="alert">{payError}</p>
          )}
          {/* No Global Payments key on this site yet, so card and bank are the
              static forms from Figma 10080-30277 / 10080-28749 rather than the
              hosted-fields iframes. With a key set, the real GP path below runs
              untouched. Either way the form is preceded by a brief skeleton
              (8507-24610) so the panel doesn't snap in. */}
          {staticPay && (payMethod === 'card' || payMethod === 'bank') && (
            <section
              className="rf-method-panel"
              aria-label={payMethod === 'card' ? 'Credit / Debit' : 'Pay by Bank'}
            >
              <header className="rf-method-panel-head">
                {payMethod === 'card' ? <CreditCardIcon size={24} /> : <BankIcon size={24} />}
                <span>{payMethod === 'card' ? 'Credit / Debit' : 'Pay by Bank'}</span>
              </header>

              {formLoading ? (
                <PaymentFormSkeleton rows={payMethod === 'bank' ? 3 : 2} />
              ) : payMethod === 'card' ? (
                <CardForm total={payNowTotal ?? 0} onPay={payStatically} busy={paying} />
              ) : (
                <BankForm total={payNowTotal ?? 0} onPay={() => payStatically()} />
              )}
            </section>
          )}
          {/* The method NOT open, relocated below the panel — full width, since
              it no longer shares a row (Figma 10080-28749). */}
          {methodOpen && (
            <Button
              tone="dark"
              fill="outline"
              block
              icon={payMethod === 'card' ? <BankIcon size={24} /> : <CreditCardIcon size={24} />}
              className="rf2-pay-btn rf2-pay-btn--alt"
              onClick={() => selectPayMethod(payMethod === 'card' ? 'bank' : 'card')}
            >
              {payMethod === 'card' ? 'Pay by Bank' : 'Credit / Debit'}
            </Button>
          )}

          {!staticPay && payMethod === 'card' && !cardToken && (
            <CardFieldsPanel
              gpApiKey={gpApiKey}
              gpEnvironment={gpEnvironment}
              payNowTotal={payNowTotal}
              onToken={(t) => {
                setCardToken(t);
                // Real flow: temporary_token → server-side sale → lease. Until
                // that endpoint exists (B4), tokenization completes the step.
                onPaymentComplete?.({ firstName: first.trim() || 'there' });
              }}
            />
          )}
          {payMethod === 'card' && cardToken && (
            <div className="rf2-gp rf2-gp--done">
              <CheckTick size={18} />
              <span>
                Card ready{cardToken.maskedCardNumber ? ` — ${cardToken.maskedCardNumber.slice(-8)}` : ''}.
                Charged securely when you complete the rental.
              </span>
              <button type="button" className="rf2-link rf2-gp-change" onClick={() => setCardToken(undefined)}>
                Use a different card
              </button>
            </div>
          )}
        </section>
      </div>

      <ProtectionPlanModal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        brochureUrl={brochureUrl}
      />
      <LeaseModal
        open={leaseOpen}
        onClose={() => setLeaseOpen(false)}
        agree={agree}
        onAgreeChange={setAgree}
      >
        <LeaseDocBody title={leaseDocName} />
      </LeaseModal>
    </div>
  );
}
