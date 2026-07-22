import React, { useCallback, useRef, useState } from 'react';
import './RentalFlow2Step.css';
import { CheckTick } from './icons';
import { MoveInDateModal } from './MoveInDateModal';
import { Step2 } from './Step2';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
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

// Step 1 — "Secure your space now" contact form.
function Step1Form({
  eyebrow, heading, termsHref, onRent,
}: {
  eyebrow: string;
  heading: string;
  termsHref: string;
  onRent: () => void;
}) {
  const [business, setBusiness] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');

  return (
    <div className="rf-card">
      <div className="rf-title">
        <p className="rf-eyebrow">{eyebrow}</p>
        <h2 className="rf-heading">{heading}</h2>
      </div>

      <label className={`rf-business${business ? ' rf-business--checked' : ''}`}>
        <input type="checkbox" checked={business} onChange={(e) => setBusiness(e.target.checked)} />
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
        <button type="button" className="rf-btn rf-btn--rent" onClick={onRent}>Rent</button>
        <div className="rf-or"><span>or</span></div>
        <button type="button" className="rf-btn rf-btn--reserve">Reserve</button>
      </div>
    </div>
  );
}

// Quick crossfade between steps.
const FADE_MS = 160;

export function RentalFlow2Step({
  eyebrow = 'Great choice!',
  heading = 'Secure your space now',
  termsHref = '#',
}: RentalFlow2StepProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [moveIn, setMoveIn] = useState<Date>(startOfToday);
  const timer = useRef<number | undefined>(undefined);

  const goToStep = useCallback((next: 1 | 2) => {
    setPhase('out');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setStep(next);
      setPhase('in');
    }, FADE_MS);
  }, []);

  return (
    <div className="rf-wrapper">
      <div className={`rf-step rf-step--${phase}`}>
        {step === 1 ? (
          <Step1Form
            eyebrow={eyebrow}
            heading={heading}
            termsHref={termsHref}
            onRent={() => setDateModalOpen(true)}
          />
        ) : (
          <Step2 moveIn={moveIn} onEditDate={() => setDateModalOpen(true)} />
        )}
      </div>

      <MoveInDateModal
        open={dateModalOpen}
        onClose={() => setDateModalOpen(false)}
        selected={moveIn}
        onSelect={setMoveIn}
        onConfirm={() => {
          setDateModalOpen(false);
          if (step === 1) goToStep(2);
        }}
      />
    </div>
  );
}
