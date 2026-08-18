import React, { useEffect, useRef, useState } from 'react';
import { CheckTick, CalendarIcon, FileArrowIcon, ChevronSolidIcon, InfoIcon, CreditCardIcon, BankIcon, GooglePayMark, ApplePayMark } from './icons';
import { mountGpHostedFields, GpTokenResult, GpFieldValidity } from './gpHostedFields';
import { ProtectionPlanModal } from './ProtectionPlanModal';
import { LeaseModal } from './LeaseModal';
import { RfCheckbox } from './RfCheckbox';
import { BankForm, CardForm, PaymentFormSkeleton } from './PaymentSection';
// The protection-plan lightbox's styles (rf-pp-*) live here. Imported from Step2
// rather than the shell because Step2 is now the only screen that mounts it.
import './screens.css';
import { FormField, Button, isPossiblePhone, type FieldType, type PhoneCountry } from '@shared/ui';

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
  label, required, value, onChange, type = 'text', error, phoneCountry,
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
      label={label}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      error={errorMsg}
      phoneCountry={phoneCountry}
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

export function Step2({
  moveIn, plans = [], leaseDocName, onEditDate, gpApiKey, gpEnvironment = 'test', payNowTotal, onPaymentComplete,
  brochureUrl,
}: {
  moveIn: Date;
  /** Protection plans to choose between. Empty → the "confirmed at checkout"
   *  note, since no API exposes them pre-lease yet. */
  plans?: import('./api').ProtectionPlan[];
  /** Protection-plan brochure PDF for the "Learn More" lightbox. Absent → the
   *  modal's download button is inert rather than a dead link. */
  brochureUrl?: string;
  /** Lease template name from the documents API. */
  leaseDocName?: string;
  onEditDate: () => void;
  /** Global Payments CLIENT-side (publishable) key — hosted-fields tokenization only. */
  gpApiKey?: string;
  gpEnvironment?: 'test' | 'prod';
  /** Authoritative move-in total (hold-aware quote) — printed on the pay button. */
  payNowTotal?: number;
  /** Card tokenized — parent takes over (interstitial → confirmation). */
  onPaymentComplete?: (info: { firstName: string }) => void;
}) {
  const [business, setBusiness] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [military, setMilitary] = useState(false);
  const [altContact, setAltContact] = useState(true);
  const [vehicle, setVehicle] = useState(false);

  // Conditional-section fields (Figma 8507-23979 scenarios / screens 12-13).
  const [bizAddress, setBizAddress] = useState('');
  const [bizFirst, setBizFirst] = useState('');
  const [bizLast, setBizLast] = useState('');
  const [dob, setDob] = useState('');
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
  // "Learn More" brochure lightbox for the protection plan (Figma via master's
  // rental-flow work). The plan CARD is API-driven (see `plan`); this modal is
  // the explanatory content behind it.
  const [planOpen, setPlanOpen] = useState(false);
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
  /** No GP key ⇒ the static forms stand in for hosted fields. */
  const staticPay = !gpApiKey;

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

  /** Static "Pay Now" — hands straight to the parent's finalizing sequence. */
  const payStatically = () => onPaymentComplete?.({ firstName: first.trim() || 'there' });


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
        <button type="button" className="rf2-movein" onClick={onEditDate}>
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
            <button type="button" className="rf2-link rf2-link--btn" onClick={() => setPlanOpen(true)}>Learn More</button>
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
                          onClick={() => { setPlanChoice(p.id); setPlanListOpen(false); }}
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
                    onClick={() => { setPlanChoice('own'); setPlanListOpen(false); }}
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
            /* NO-DEMO-MONEY: plans aren't exposed pre-lease by any API we
               have yet (Jaweed Q#2) — say so instead of faking $2,000/$12. */
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
                <FieldAbove label="Date of Birth" required value={dob} onChange={setDob} error={bad('dob')} />
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
              <FileArrowIcon size={24} />View Document
            </button>
          </div>
          <div className="rf2-agree-doc">
            <LeaseDocBody title={leaseDocName} />
          </div>
          <RfCheckbox
            checked={agree}
            onChange={setAgree}
            className={`rf2-agree-bar${bad('agree') ? ' rf2-agree-bar--error' : ''}`}
          >
            <span className="rf2-agree-text"><b>I agree</b> to the terms and conditions as set out by the rental agreement.</span>
          </RfCheckbox>
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
          <div className="rf2-paygrid">
            <button type="button" className="rf2-pay rf2-pay--dark" onClick={() => selectPayMethod('gpay')}><GooglePayMark /></button>
            <button type="button" className="rf2-pay rf2-pay--dark" onClick={() => selectPayMethod('apple')}><ApplePayMark /></button>
            <Button
              tone="dark"
              fill="outline"
              block
              icon={<CreditCardIcon size={24} />}
              className={`rf2-pay-btn${payMethod === 'card' ? ' rf2-pay--selected' : ''}`}
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
          </div>
          {payAttempted && !formComplete && (
            <p className="rf2-gp-note rf2-gp-note--error">
              Complete the highlighted fields (and accept the rental agreement) to continue to payment.
            </p>
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
                <CardForm total={payNowTotal ?? 0} onPay={payStatically} />
              ) : (
                <BankForm total={payNowTotal ?? 0} onPay={payStatically} />
              )}
            </section>
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
