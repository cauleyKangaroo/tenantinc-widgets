import React, { useEffect, useRef, useState } from 'react';
import { CalendarIcon, FileArrowIcon, ChevronSolidIcon, InfoIcon, CreditCardIcon, BankIcon, GooglePayMark, ApplePayMark } from './icons';
import { PlanCoverageBody, ProtectionPlanModal } from './ProtectionPlanModal';
import { LeaseModal } from './LeaseModal';
import { RfCheckbox } from './RfCheckbox';
import { BankForm, CardForm, PaymentFormSkeleton, type CardFormValue } from './PaymentSection';
// The protection-plan lightbox's styles (rf-pp-*) live here. Imported from Step2
// rather than the shell because Step2 is now the only screen that mounts it.
import './screens.css';
import { FormField, Button, DateModal, isPossiblePhone, type FieldType, type PhoneCountry } from '@shared/ui';

// ---------------------------------------------------------------------------
// Rental Flow — step 2, "Secure your space today" (Figma 8507-23329).
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

/**
 * Dropdown, built on the shared field's skin (Figma 8507-25490 / 8507-25502).
 *
 * The label belongs INSIDE the box, exactly as FieldAbove's <FormField> already
 * puts it — the old label-above markup was what made these three controls the
 * odd ones out in a form where every text input floats its label. So this
 * reuses the kit's own `hb-field` classes rather than restyling a select from
 * scratch: box, 56px height, 16px gutters, #A5B4BF border, focus ring, floated
 * label and the red required marker all arrive from @shared/ui and cannot drift
 * from the inputs sitting beside them.
 *
 * Two things a <select> cannot inherit:
 *  - The kit floats its label off `:placeholder-shown`, which a select never
 *    matches. `.rf2-sel--filled` stands in for it (see the CSS).
 *  - The arrow was the BROWSER's, which is why it looked foreign and sat hard
 *    against the edge. `appearance: none` removes it and ChevronSolidIcon — the
 *    same mark as the protection-plan dropdown (Figma 8508-32282) — goes into
 *    the kit's `hb-field__icons` slot, where the box's own 16px padding indents
 *    it to match the frame without a magic number.
 */
function SelectField({
  label, required, value, onChange, options, error,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  error?: boolean;
}) {
  const cls = [
    'hb-field', 'hb-field--labelled', 'rf2-sel',
    value ? 'rf2-sel--filled' : '',
    /* Green border only, never the kit's tick: the chevron already occupies
       this field's icon slot, and stacking the two is what produced the
       doubled mark on the payment panel's country select. Same rule here. */
    value && !error ? 'rf-valid' : '',
    error ? 'hb-field--error' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <div className="hb-field__box">
        <div className="hb-field__data">
          {/* Select before label, matching FormField, so the CSS sibling
              selector can float the label on focus. */}
          <select
            className="hb-field__input hb-field__select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            /* The visible label is the floating one, which is decorative to AT
               once it has floated — so name the control explicitly. */
            aria-label={label}
            required={required}
            aria-invalid={error || undefined}
          >
            <option value="" disabled hidden />
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <label className="hb-field__label">
            {label}
            {required && <span className="hb-field__required" aria-hidden="true">*</span>}
          </label>
        </div>
        <div className="hb-field__icons">
          <ChevronSolidIcon size={14} className="hb-field__icon rf2-sel-chev" />
        </div>
      </div>
    </div>
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

/** Desktop pointer devices only — mirrored by a @media block in the CSS. */
const PLAN_HOVER_QUERY = '(min-width: 901px) and (hover: hover) and (pointer: fine)';

export function Step2({
  moveIn, plans = [], leaseDocName, onEditDate, payNowTotal, onPaymentComplete,
  brochureUrl, onPlanChange, paying, payError, contact,
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
  }) => void;
  /** What the shopper typed in step 1, used as the starting values here so they
   *  do not retype their own name and email one screen later. */
  contact?: { first: string; last: string; email: string; phone: string; business?: boolean };
  /** Payment in flight — locks the pay button against a double charge. */
  paying?: boolean;
  /** Why the rental could not be completed. Shown by the payment panel so the
   *  shopper sees it next to the button they pressed, with their details still
   *  filled in. */
  payError?: string;
}) {
  const [business, setBusiness] = useState(false);
  // Seeded from step 1. Initialisers, not props: these are editable fields, so
  // step 1 supplies the STARTING value and anything typed here wins from then
  // on — re-syncing on every render would fight the shopper's own edits.
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [first, setFirst] = useState(contact?.first ?? '');
  const [last, setLast] = useState(contact?.last ?? '');
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
  const [dob, setDob] = useState('');
  const [dobOpen, setDobOpen] = useState(false);
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [acFirst, setAcFirst] = useState('');
  const [acLast, setAcLast] = useState('');
  const [acPhone, setAcPhone] = useState('');
  const [acEmail, setAcEmail] = useState('');
  const [acAddress, setAcAddress] = useState('');
  const [vehType, setVehType] = useState('');
  const [vehMake, setVehMake] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehYear, setVehYear] = useState('');
  const [vehColor, setVehColor] = useState('');
  const [vehPlate, setVehPlate] = useState('');
  const [vehCountry, setVehCountry] = useState('');
  const [vehState, setVehState] = useState('');
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
    ...(military ? [['dob', dob.trim().length > 0]] as Array<[string, boolean]> : []),
    ...(altContact ? [['acFirst', acFirst.trim().length > 0],
      ['acLast', acLast.trim().length > 0],
      ['acPhone', isPossiblePhone(acPhone, 'US')],
      ['acEmail', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acEmail.trim())],
      ['acAddress', acAddress.trim().length > 0]] as Array<[string, boolean]> : []),
    ...(vehicle ? [['vehType', vehType.trim().length > 0]] as Array<[string, boolean]> : []),
  ];
  const formComplete = required.every(([, ok]) => ok);
  const bad = (key: string) => payAttempted && !(required.find(([k]) => k === key)?.[1] ?? true);
  /** A card/bank panel is open, so its button is replaced by the panel and the
   *  other method relocates beneath it. Wallets are one-tap and never expand. */
  const methodOpen = payMethod === 'card' || payMethod === 'bank';

  const selectPayMethod = (m: 'gpay' | 'apple' | 'card' | 'bank') => {
    if (!formComplete) { setPayAttempted(true); return; }
    const next = payMethod === m ? null : m;
    setPayMethod(next);
    // Skeleton beat before the panel appears (Figma 8507-24610), so it does
    // not snap in.
    if (next && (next === 'card' || next === 'bank')) {
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
  });


  return (
    <div className="rf-card rf2-card">
      <div className="rf-title">
        <p className="rf-eyebrow">Great choice!</p>
        <h2 className="rf-heading">Secure your space today</h2>
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
            <Check checked={military} onChange={setMilitary}>I am active military</Check>
            {military && (
              <div className="rf2-expand">
                {/* Same shape as the Move-in Date control above: label, value,
                    calendar affordance, opens a modal. A DOB is decades back,
                    so a picker that can jump month and year beats stepping. */}
                <button
                  type="button"
                  className={`rf2-movein rf2-movein--full${bad('dob') ? ' rf2-movein--error' : ''}${dob ? ' rf2-movein--valid' : ''}`}
                  onClick={() => setDobOpen(true)}
                >
                  <span className="rf2-movein-text">
                    <span className="rf2-movein-label">Date of Birth<span className="rf-req">*</span></span>
                    <span className="rf2-movein-value">{dob || 'Select a date'}</span>
                  </span>
                  <CalendarIcon size={24} />
                </button>
              </div>
            )}
            <Check checked={altContact} onChange={setAltContact}>I am providing an alternate contact</Check>
            {altContact && (
              <div className="rf2-expand">
                <div className="rf2-row">
                  <FieldAbove label="First Name" required value={acFirst} onChange={setAcFirst} error={bad('acFirst')} />
                  <FieldAbove label="Last Name" required value={acLast} onChange={setAcLast} error={bad('acLast')} />
                </div>
                <div className="rf2-row">
                  <FieldAbove label="Phone" required value={acPhone} onChange={setAcPhone} type="tel" phoneCountry="US" error={bad('acPhone')} />
                  <FieldAbove label="Email" required value={acEmail} onChange={setAcEmail} type="email" error={bad('acEmail')} />
                </div>
                <FieldAbove label="Address" required value={acAddress} onChange={setAcAddress} error={bad('acAddress')} />
              </div>
            )}
            <Check checked={vehicle} onChange={setVehicle}>I am storing a vehicle</Check>
            {vehicle && (
              <div className="rf2-expand">
                <SelectField label="Vehicle Type" required value={vehType} onChange={setVehType} error={bad('vehType')}
                  options={['Car', 'Truck', 'Motorcycle', 'RV', 'Boat', 'Trailer', 'Other']} />
                <div className="rf2-row">
                  <FieldAbove label="Make" value={vehMake} onChange={setVehMake} />
                  <FieldAbove label="Model" value={vehModel} onChange={setVehModel} />
                </div>
                <div className="rf2-row">
                  <FieldAbove label="Year" value={vehYear} onChange={setVehYear} />
                  <FieldAbove label="Color" value={vehColor} onChange={setVehColor} />
                </div>
                <div className="rf2-row">
                  <FieldAbove label="License Plate Number" value={vehPlate} onChange={setVehPlate} />
                  <SelectField label="Country" value={vehCountry} onChange={setVehCountry}
                    options={['United States', 'Canada', 'Mexico']} />
                </div>
                <SelectField label="State" value={vehState} onChange={setVehState}
                  options={['AZ', 'CA', 'NV', 'OR', 'TX', 'WA', 'Other']} />
              </div>
            )}
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
          {(payMethod === 'card' || payMethod === 'bank') && (
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

        </section>
      </div>

      <ProtectionPlanModal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        brochureUrl={brochureUrl}
      />
      {/* Date-of-birth picker. Browse mode, capped at today — a birth date
          cannot be in the future — and reaching back 120 years. */}
      <DateModal
        open={dobOpen}
        onClose={() => setDobOpen(false)}
        selected={dobDate}
        onSelect={(d) => setDobDate(d)}
        onConfirm={() => {
          if (dobDate) setDob(formatDate(dobDate));
          setDobOpen(false);
        }}
        title="Select your Date of Birth"
        ctaLabel="Confirm Date"
        browse
        onReset={() => { setDobDate(null); setDob(''); setDobOpen(false); }}
        minDate={new Date(new Date().getFullYear() - 120, 0, 1)}
        maxDate={new Date()}
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
