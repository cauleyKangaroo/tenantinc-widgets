import React, { useState } from 'react';
import { CheckTick, CalendarIcon, FileArrowIcon, ChevronIcon, InfoIcon, CreditCardIcon, BankIcon, GooglePayMark, ApplePayMark } from './icons';

// ---------------------------------------------------------------------------
// Rental Flow — step 2, "Secure your space today" (Figma 8507-23329).
// Contact form + selected move-in date, Protection Plan, Additional Info
// toggles, Rental Agreement (+ "I agree"), and Payment method selection.
// ---------------------------------------------------------------------------

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const formatDate = (d: Date) => `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

// Label-above text field (empty state, grey border).
function FieldAbove({
  label, required, value, onChange, type = 'text',
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="rf2-field">
      <span className="rf2-field-label">{label}{required && <span className="rf-req">*</span>}</span>
      <input className="rf2-field-input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
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
    <label className={`rf2-checkline${small ? ' rf2-checkline--sm' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={`rf2-box${checked ? ' rf2-box--on' : ''}`}>{checked && <CheckTick size={16} />}</span>
      <span className="rf2-checklabel">{children}</span>
    </label>
  );
}

export function Step2({
  moveIn, onEditDate,
}: {
  moveIn: Date;
  onEditDate: () => void;
}) {
  const [business, setBusiness] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [military, setMilitary] = useState(false);
  const [altContact, setAltContact] = useState(true);
  const [vehicle, setVehicle] = useState(false);
  const [agree, setAgree] = useState(false);
  const [autopay, setAutopay] = useState(false);

  const noop = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="rf-card rf2-card">
      <div className="rf-title">
        <p className="rf-eyebrow">Great choice!</p>
        <h2 className="rf-heading">Secure your space today</h2>
      </div>

      <label className={`rf-business${business ? ' rf-business--checked' : ''}`}>
        <input type="checkbox" checked={business} onChange={(e) => setBusiness(e.target.checked)} />
        <span className="rf-checkbox">{business && <CheckTick size={18} />}</span>
        <span className="rf-business-label">I am renting as a business</span>
      </label>

      <div className="rf2-form">
        <div className="rf2-row">
          <FieldAbove label="Email" required value={email} onChange={setEmail} type="email" />
          <FieldAbove label="Phone Number" required value={phone} onChange={setPhone} type="tel" />
        </div>
        <div className="rf2-row">
          <FieldAbove label="First Name" required value={first} onChange={setFirst} />
          <FieldAbove label="Last Name" required value={last} onChange={setLast} />
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
            <a className="rf2-link" href="#" onClick={noop}>Learn More</a>
          </div>
          <div className="rf2-plan">
            <div className="rf2-plan-body">
              <div className="rf2-plan-left">
                <span className="rf2-plan-cov"><b>$2,000</b> Coverage</span>
                <span className="rf2-plan-best">Best Value</span>
              </div>
              <span className="rf2-plan-price"><b>$12</b><span>/mo</span></span>
            </div>
            <button type="button" className="rf2-plan-drop" aria-label="More plans">
              <ChevronIcon size={14} className="rf2-chev-down" />
            </button>
          </div>
        </section>

        {/* Additional Information */}
        <section className="rf2-plain">
          <span className="rf2-h">Additional Information</span>
          <div className="rf2-checks">
            <Check small checked={military} onChange={setMilitary}>I am active military</Check>
            <Check small checked={altContact} onChange={setAltContact}>I am providing an alternate contact</Check>
            <Check small checked={vehicle} onChange={setVehicle}>I am storing a vehicle</Check>
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
              <p className="rf2-doc-title">Self Storage Rental Agreement</p>
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
          <label className="rf2-agree-bar">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span className={`rf2-box${agree ? ' rf2-box--on' : ''}`}>{agree && <CheckTick size={16} />}</span>
            <span className="rf2-agree-text"><b>I agree</b> to the terms and conditions as set out by the rental agreement.</span>
          </label>
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
            <button type="button" className="rf2-pay rf2-pay--dark"><GooglePayMark /></button>
            <button type="button" className="rf2-pay rf2-pay--dark"><ApplePayMark /></button>
            <button type="button" className="rf2-pay rf2-pay--outline"><CreditCardIcon size={24} />Credit / Debit</button>
            <button type="button" className="rf2-pay rf2-pay--outline"><BankIcon size={24} />Pay by Bank</button>
          </div>
        </section>
      </div>
    </div>
  );
}
