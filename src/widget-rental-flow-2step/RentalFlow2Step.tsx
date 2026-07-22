import React, { useState } from 'react';
import './RentalFlow2Step.css';
import { CheckTick } from './icons';
import { MoveInDateModal } from './MoveInDateModal';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// ---------------------------------------------------------------------------
// Widget #99 (TBD) — Rental Flow (2 Step), first screen ("Secure your space").
// Figma: Mariposa — Duda — 8507-23264.
// A white card: eyebrow + heading, "renting as a business" toggle, a contact
// form (Email/Phone validate to a green "filled" state, First/Last start
// empty), SMS-consent copy, then Rent / or / Reserve actions.
// ---------------------------------------------------------------------------

export interface RentalFlow2StepProps {
  eyebrow?: string;
  heading?: string;
  /** Underlined link at the end of the SMS-consent paragraph. */
  termsHref?: string;
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidPhone = (v: string) => v.replace(/\D/g, '').length >= 10;

// A single labelled field. Empty + unfocused → label sits centred as a
// placeholder (First/Last state). Focused or filled → label floats to the top
// (Email/Phone state); when `valid` the border turns green and a tick appears.
function Field({
  id, label, type = 'text', value, valid, onChange,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  valid?: boolean;
  onChange: (v: string) => void;
}) {
  const filled = value.trim().length > 0;
  return (
    <div className={`rf-field${filled ? ' rf-field--filled' : ''}${valid ? ' rf-field--valid' : ''}`}>
      <input
        id={id}
        className="rf-field-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <label className="rf-field-label" htmlFor={id}>
        {label}<span className="rf-req">*</span>
      </label>
      {valid && <CheckTick size={24} className="rf-field-check" />}
    </div>
  );
}

export function RentalFlow2Step({
  eyebrow = 'Great choice!',
  heading = 'Secure your space now',
  termsHref = '#',
}: RentalFlow2StepProps) {
  const [business, setBusiness] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [moveIn, setMoveIn] = useState<Date>(startOfToday);

  return (
    <div className="rf-wrapper">
      <div className="rf-card">
        <div className="rf-title">
          <p className="rf-eyebrow">{eyebrow}</p>
          <h2 className="rf-heading">{heading}</h2>
        </div>

        <label className={`rf-business${business ? ' rf-business--checked' : ''}`}>
          <input
            type="checkbox"
            checked={business}
            onChange={(e) => setBusiness(e.target.checked)}
          />
          <span className="rf-checkbox">{business && <CheckTick size={18} />}</span>
          <span className="rf-business-label">I am renting as a business</span>
        </label>

        <div className="rf-form">
          <div className="rf-row">
            <Field id="rf-email" label="Email" type="email" value={email}
              valid={isValidEmail(email)} onChange={setEmail} />
            <Field id="rf-phone" label="Phone" type="tel" value={phone}
              valid={isValidPhone(phone)} onChange={setPhone} />
          </div>

          <p className="rf-consent">
            By providing your mobile number, you agree to receive text messages from
            UAT Tenant V2. Message frequency may vary. Standard rates apply. Reply HELP
            for assistance or STOP to unsubscribe.{' '}
            <a href={termsHref}>See Terms and Privacy Policy.</a>
          </p>

          <div className="rf-row">
            <Field id="rf-first" label="First Name" value={first} onChange={setFirst} />
            <Field id="rf-last" label="Last Name" value={last} onChange={setLast} />
          </div>
        </div>

        <div className="rf-actions">
          <button type="button" className="rf-btn rf-btn--rent" onClick={() => setDateModalOpen(true)}>Rent</button>
          <div className="rf-or"><span>or</span></div>
          <button type="button" className="rf-btn rf-btn--reserve">Reserve</button>
        </div>
      </div>

      <MoveInDateModal
        open={dateModalOpen}
        onClose={() => setDateModalOpen(false)}
        selected={moveIn}
        onSelect={setMoveIn}
        onConfirm={() => setDateModalOpen(false)}
      />
    </div>
  );
}
