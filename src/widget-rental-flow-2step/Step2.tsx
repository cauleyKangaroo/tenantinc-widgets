import React, { useEffect, useRef, useState } from 'react';
import { CheckTick, CalendarIcon, FileArrowIcon, ChevronIcon, InfoIcon, CreditCardIcon, BankIcon, GooglePayMark, ApplePayMark } from './icons';
import { mountGpHostedFields, GpTokenResult, GpFieldValidity } from './gpHostedFields';
import { ProtectionPlanModal } from './ProtectionPlanModal';
// The protection-plan lightbox's styles (rf-pp-*) live here. Imported from Step2
// rather than the shell because Step2 is now the only screen that mounts it.
import './screens.css';
import { FormField, Button, Checkbox, type FieldType } from '@shared/ui';

// ---------------------------------------------------------------------------
// Rental Flow — step 2, "Secure your space today" (Figma 8507-23329).
// Contact form + selected move-in date, Protection Plan, Additional Info
// toggles, Rental Agreement (+ "I agree"), and Payment method selection.
// ---------------------------------------------------------------------------

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const formatDate = (d: Date) => `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

// Label-above text field (empty state, grey border).
function FieldAbove({
  label, required, value, onChange, type = 'text', error,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: FieldType;
  /** Payment was attempted while this required field is empty/invalid. */
  error?: boolean;
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
    />
  );
}

// Label-above select, visually matched to FieldAbove.
function SelectAbove({
  label, required, value, onChange, options, error,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  error?: boolean;
}) {
  return (
    <label className={`rf2-field${error ? ' rf2-field--error' : ''}`}>
      <span className="rf2-field-label">{label}{required && <span className="rf-req">*</span>}</span>
      <select className="rf2-field-input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled hidden></option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

// Dark-fill checkbox used across the step-2 sections.
function Check({
  checked, onChange, small, children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Checkbox checked={checked} onChange={onChange} className={small ? 'rf2-check--sm' : undefined}>
      {children}
    </Checkbox>
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
  moveIn, plan, leaseDocName, onEditDate, gpApiKey, gpEnvironment = 'test', payNowTotal, onPaymentComplete,
  brochureUrl,
}: {
  moveIn: Date;
  /** First protection plan from the API; card falls back to demo values without it. */
  plan?: import('./api').ProtectionPlan;
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

  // Payment method + Hosted Fields tokenization result. The temporary
  // token is single-use with a 30-minute expiry — comfortably inside the
  // 15-minute unit hold. It is what the (future) server-side move-in
  // charge consumes; no card data exists widget-side.
  const [payMethod, setPayMethod] = useState<'gpay' | 'apple' | 'card' | 'bank' | null>(null);
  const [cardToken, setCardToken] = useState<GpTokenResult | undefined>(undefined);
  const [payAttempted, setPayAttempted] = useState(false);

  // Everything the lease POST / payment step requires. Conditional
  // sections only gate while expanded (their checkbox is optional; the
  // fields inside are not).
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneOk = phone.replace(/\D/g, '').length >= 10;
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
      ['acPhone', acPhone.replace(/\D/g, '').length >= 10],
      ['acEmail', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acEmail.trim())],
      ['acAddress', acAddress.trim().length > 0]] as Array<[string, boolean]> : []),
    ...(vehicle ? [['vehType', vehType.trim().length > 0]] as Array<[string, boolean]> : []),
  ];
  const formComplete = required.every(([, ok]) => ok);
  const bad = (key: string) => payAttempted && !(required.find(([k]) => k === key)?.[1] ?? true);
  const selectPayMethod = (m: 'gpay' | 'apple' | 'card' | 'bank') => {
    if (!formComplete) { setPayAttempted(true); return; }
    setPayMethod(payMethod === m ? null : m);
    setCardToken(undefined);
  };

  const noop = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="rf-card rf2-card">
      <div className="rf-title">
        <p className="rf-eyebrow">Great choice!</p>
        <h2 className="rf-heading">Secure your space today</h2>
      </div>

      <Checkbox checked={business} onChange={setBusiness} className="rf-business">
        I am renting as a business
      </Checkbox>
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
          <FieldAbove label="Phone Number" required value={phone} onChange={setPhone} type="tel" error={bad('phone')} />
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
          {plan?.coverage != null && plan.premium != null ? (
            <div className="rf2-plan">
              <div className="rf2-plan-body">
                <div className="rf2-plan-left">
                  <span className="rf2-plan-cov">
                    <b>${plan.coverage.toLocaleString()}</b> Coverage
                  </span>
                  <span className="rf2-plan-best">{plan.name ?? 'Best Value'}</span>
                </div>
                <span className="rf2-plan-price"><b>${plan.premium}</b><span>/mo</span></span>
              </div>
              <button type="button" className="rf2-plan-drop" aria-label="More plans">
                <ChevronIcon size={14} className="rf2-chev-down" />
              </button>
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
            <Check small checked={military} onChange={setMilitary}>I am active military</Check>
            {military && (
              <div className="rf2-expand">
                <FieldAbove label="Date of Birth" required value={dob} onChange={setDob} error={bad('dob')} />
              </div>
            )}
            <Check small checked={altContact} onChange={setAltContact}>I am providing an alternate contact</Check>
            {altContact && (
              <div className="rf2-expand">
                <div className="rf2-row">
                  <FieldAbove label="First Name" required value={acFirst} onChange={setAcFirst} error={bad('acFirst')} />
                  <FieldAbove label="Last Name" required value={acLast} onChange={setAcLast} error={bad('acLast')} />
                </div>
                <div className="rf2-row">
                  <FieldAbove label="Phone" required value={acPhone} onChange={setAcPhone} type="tel" error={bad('acPhone')} />
                  <FieldAbove label="Email" required value={acEmail} onChange={setAcEmail} type="email" error={bad('acEmail')} />
                </div>
                <FieldAbove label="Address" required value={acAddress} onChange={setAcAddress} error={bad('acAddress')} />
              </div>
            )}
            <Check small checked={vehicle} onChange={setVehicle}>I am storing a vehicle</Check>
            {vehicle && (
              <div className="rf2-expand">
                <SelectAbove label="Vehicle Type" required value={vehType} onChange={setVehType} error={bad('vehType')}
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
                  <SelectAbove label="Country" value={vehCountry} onChange={setVehCountry}
                    options={['United States', 'Canada', 'Mexico']} />
                </div>
                <SelectAbove label="State" value={vehState} onChange={setVehState}
                  options={['AZ', 'CA', 'NV', 'OR', 'TX', 'WA', 'Other']} />
              </div>
            )}
          </div>
        </section>

        {/* Rental Agreement */}
        <section className="rf2-agree">
          <div className="rf2-agree-head">
            <span className="rf2-h">Rental Agreement <span className="rf-req">*</span></span>
            <a className="rf2-link" href="#" onClick={noop}><FileArrowIcon size={24} />View Document</a>
          </div>
          <div className="rf2-agree-doc">
            <div className="rf2-doc-page">
              <p className="rf2-doc-title">{leaseDocName ?? 'Self Storage Rental Agreement'}</p>
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
          </div>
          <Checkbox
            checked={agree}
            onChange={setAgree}
            className={`rf2-agree-bar${bad('agree') ? ' rf2-agree-bar--error' : ''}`}
          >
            <span className="rf2-agree-text"><b>I agree</b> to the terms and conditions as set out by the rental agreement.</span>
          </Checkbox>
        </section>

        {/* Payment */}
        <section className="rf2-panel rf2-payment">
          <span className="rf2-h">Payment</span>
          <div className="rf2-autopay">
            <Check checked={autopay} onChange={setAutopay}>
              <span className="rf2-autopay-label">Autopay Enrollment</span>
            </Check>
            <InfoIcon size={16} className="rf2-autopay-info" />
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
          {payMethod === 'card' && !cardToken && (
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
    </div>
  );
}
