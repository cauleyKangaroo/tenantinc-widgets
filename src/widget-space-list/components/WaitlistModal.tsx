import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FormField, type FieldType } from '@shared/ui/FormField';
import { Button } from '@shared/ui/Button';
import { CloseSolidIcon } from '@shared/ui/icons';
import { isPossiblePhone } from '@shared/ui/phone';
import type { LeadInput } from '@shared/leadsApi';
import { ContactConfirmationModal, type ConfirmationFacility } from '@shared/components/ContactConfirmation';
import { usePropertyExtras } from '../propertyContext';
import type { PropertyExtras } from '../propertyApi';
import './WaitlistModal.css';

// ---------------------------------------------------------------------------
// "Join our Waitlist" lightbox (Figma 12518-96140), opened by a sold-out unit's
// "Join waitlist" CTA when enableWaitlist is on.
//
// Files a lead through the widget's own createLead, the same route as "Send us
// a Message". There is no dedicated waitlist endpoint, so the unit and the
// requested move-in date travel in the lead's content, under its own subject.
//
// On success the form is REPLACED by the shared ContactConfirmationModal (Figma
// 12447-90822) — the same card the rental flow shows after its Contact me.
//
// Portalled to <body>: the listing area is `container-type: inline-size`, which
// contains a `position: fixed` overlay. Being outside .sl-wrapper, every rule in
// WaitlistModal.css is self-contained rather than scoped under it.
// ---------------------------------------------------------------------------

/** hourglass — traced from the Figma export (12511-95996), stroke → currentColor. */
function HourglassIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M10.5 12C10.5 8.48068 4.41441 8.11147 4.01443 4.48436C3.93458 3.76031 4.18955 3.04013 4.69671 2.55723C5.28193 2 6.62415 2 9.30861 2H14.6914C17.3759 2 18.7181 2 19.3033 2.55723C19.8104 3.04013 20.0654 3.76031 19.9856 4.48436C19.5856 8.11147 13.5 8.48068 13.5 12C13.5 15.5193 19.5856 15.8885 19.9856 19.5156C20.0654 20.2397 19.8104 20.9599 19.3033 21.4428C18.7181 22 17.3758 22 14.6914 22L9.3086 22C6.62415 22 5.28192 22 4.69671 21.4428C4.18955 20.9599 3.93458 20.2397 4.01442 19.5156C4.41441 15.8885 10.5 15.5193 10.5 12Z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Today as YYYY-MM-DD in local time, comparable as a string with the input's value. */
function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "2026-09-06" → "Sep 6, 2026" for the lead text; anything else verbatim. */
function readableDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Field({
  label, type = 'text', value, onChange, disabled, autoComplete,
}: {
  label: string; type?: FieldType; value: string; onChange: (v: string) => void;
  disabled?: boolean; autoComplete?: string;
}) {
  // Same type-derived validity as MessageModal, so the green tick and the
  // submit gate cannot disagree.
  const valid = type === 'email'
    ? EMAIL_RE.test(value.trim())
    : type === 'tel'
      ? isPossiblePhone(value, 'US')
      : value.trim().length > 0;
  return (
    <FormField
      label={label}
      type={type}
      required
      value={value}
      onChange={onChange}
      disabled={disabled}
      autoComplete={autoComplete}
      phoneCountry={type === 'tel' ? 'US' : undefined}
      state={valid ? 'success' : 'default'}
    />
  );
}

const EMPTY = { email: '', phone: '', first: '', last: '', moveIn: '' };

/** The sidebar's loaded property, in the shape the shared confirmation reads. */
function toFacility(p: PropertyExtras | null): ConfirmationFacility {
  if (!p) return {};
  return {
    name: p.name,
    address: p.address,
    phones: p.phones,
    hours: [
      { title: 'Office Hours', lines: p.schedule.office.map((r) => `${r.days}: ${r.hours}`) },
      { title: 'Gate Hours', lines: p.schedule.gate.map((r) => `${r.days}: ${r.hours}`) },
    ],
  };
}

export function WaitlistModal({
  open, onClose, unitLabel, submitLead,
}: {
  open: boolean;
  onClose: () => void;
  /** What the shopper is waiting for, e.g. "10' x 10' Climate Controlled". */
  unitLabel: string;
  /** The widget's own createLead — creds and property are the caller's. */
  submitLead: (input: LeadInput) => Promise<unknown>;
}) {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const property = usePropertyExtras();
  // Editing clears a stale validation message rather than leaving it under a
  // form that may already be fixed.
  const set = (key: keyof typeof EMPTY) => (v: string) => {
    setForm((f) => ({ ...f, [key]: v }));
    setError('');
  };
  const submitting = status === 'submitting';

  // Fresh form on every open.
  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setStatus('idle');
    setError('');
  }, [open]);

  // The confirmation owns Escape and the scroll lock once it takes over.
  const done = status === 'success';
  useEffect(() => {
    if (!open || done) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, done, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const email = form.email.trim();
    const phone = form.phone.trim();
    const first = form.first.trim();
    const last = form.last.trim();
    const moveIn = form.moveIn.trim();

    if (!email || !phone || !first || !last || !moveIn) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isPossiblePhone(phone, 'US')) {
      setError('Please enter a valid phone number.');
      return;
    }
    // The kit's date field has no `min`, so a past date is caught here.
    if (/^\d{4}-\d{2}-\d{2}$/.test(moveIn) && moveIn < todayIso()) {
      setError('Please choose a move-in date from today onwards.');
      return;
    }

    setStatus('submitting');
    try {
      await submitLead({
        first, last, email, phone,
        subject: 'Website Waitlist',
        message: `Waitlist request for ${unitLabel}. Preferred move-in date: ${readableDate(moveIn)}.`,
      });
      setStatus('success');
    } catch (err) {
      console.error('[SpaceList] waitlist createLead error:', err);
      setStatus('error');
      setError('Sorry, we couldn’t add you to the waitlist. Please try again.');
    }
  }

  if (!open) return null;

  if (done) {
    return (
      <ContactConfirmationModal
        open
        onClose={onClose}
        phone={form.phone}
        facility={toFacility(property)}
        submitMessage={submitLead}
      />
    );
  }

  const overlay = (
    <div className="sl-wl-overlay" onMouseDown={onClose}>
      <div
        className="sl-wl-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sl-wl-heading"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sl-wl-head">
          <span className="sl-wl-title"><HourglassIcon /><span>Waitlist</span></span>
          <button type="button" className="sl-wl-close" aria-label="Close" onClick={onClose}>
            <CloseSolidIcon size={18} />
          </button>
        </div>

        <div className="sl-wl-body">
          <form className="sl-wl-form" onSubmit={handleSubmit} noValidate>
            <h2 id="sl-wl-heading" className="sl-wl-heading">
              <span className="sl-wl-kicker">Great choice!</span>
              <span>Join our Waitlist</span>
            </h2>
            <p className="sl-wl-text">
              Unfortunately, the space you’re looking for is not currently available. Join our
              waitlist, and we’ll notify you as soon as that space opens up.
            </p>

            <div className="sl-wl-grid">
              <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} disabled={submitting} />
              <Field label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} disabled={submitting} />
              <Field label="First Name" autoComplete="given-name" value={form.first} onChange={set('first')} disabled={submitting} />
              <Field label="Last Name" autoComplete="family-name" value={form.last} onChange={set('last')} disabled={submitting} />
              <Field label="Move-in Date" type="date" value={form.moveIn} onChange={set('moveIn')} disabled={submitting} />
            </div>

            {error && <p className="sl-wl-error" role="alert">{error}</p>}

            <div className="sl-wl-actions">
              <Button type="submit" block busy={submitting}>Join Waitlist</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' && document.body
    ? createPortal(overlay, document.body)
    : overlay;
}
