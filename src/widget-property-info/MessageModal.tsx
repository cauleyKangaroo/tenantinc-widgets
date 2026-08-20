import React, { useEffect, useState } from 'react';
import { Checkbox } from '@shared/ui/Checkbox';
import { FormField, type FieldType } from '@shared/ui/FormField';
import { isPossiblePhone } from '@shared/ui/phone';
import { EnvelopeIcon, CloseSolidIcon, MapPinIcon } from './icons';
import { createLead } from './api';

// ---------------------------------------------------------------------------
// "Send Message" lightbox (Figma 10199-60873 / 10199-67707). Opens from the
// property-info "Send us a Message" link, mirroring the Hours modal.
// Facility area: a "Select Facility" dropdown when unselected; the facility
// name + address once chosen (auto-selected when there's only one facility).
// ---------------------------------------------------------------------------

export interface Facility { name: string; address?: string; }

function ChevronDown({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9c1.577 2.181 3.423 4.137 5.49 5.817a.8.8 0 0 0 1.02 0C14.577 13.137 16.423 11.181 18 9" />
    </svg>
  );
}

/**
 * Text inputs are the SHARED FormField, so they behave exactly as the rental
 * flow's do: floating label driven by :placeholder-shown (so browser autofill
 * lifts it too), a border that follows the caret via :focus-within, and a
 * green border plus tick once the value validates.
 *
 * The bespoke .pi-msg-field this replaces had a JS-driven `--filled` class, a
 * static border that never acknowledged focus, and no validated state at all.
 *
 * Validation is derived from the field's TYPE, matching how Step 2 does it, so
 * the tick and any submit gate cannot disagree about what "valid" means.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({
  label, required, type = 'text', value, onChange, disabled,
}: {
  label: string; required?: boolean; type?: FieldType;
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  const valid = type === 'email'
    ? EMAIL_RE.test(value.trim())
    : type === 'tel'
      ? isPossiblePhone(value, 'US')
      : value.trim().length > 0;

  return (
    <FormField
      label={label}
      type={type}
      required={required}
      value={value}
      onChange={onChange}
      disabled={disabled}
      phoneCountry={type === 'tel' ? 'US' : undefined}
      state={valid ? 'success' : 'default'}
    />
  );
}

/**
 * The message box. The kit has no textarea, so this stays bespoke — but it
 * borrows the kit's tokens for its border, focus and valid states so it reads
 * as the same control family rather than a lookalike.
 */
function MessageBox({
  label, required, value, onChange, disabled,
}: {
  label: string; required?: boolean; value: string;
  onChange: (v: string) => void; disabled?: boolean;
}) {
  const filled = value.trim().length > 0;
  return (
    <label className={`pi-msg-area${filled ? ' pi-msg-area--valid' : ''}`}>
      {/* Input before label, and placeholder=" ", so the same
          :placeholder-shown rule the kit uses can float it. */}
      <textarea
        className="pi-msg-area-input"
        value={value}
        placeholder=" "
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="pi-msg-area-label">{label}{required && <span className="pi-req">*</span>}</span>
    </label>
  );
}

export function MessageModal({
  open, onClose, facilities, termsHref = '#',
}: {
  open: boolean;
  onClose: () => void;
  facilities: Facility[];
  termsHref?: string;
}) {
  // Always opens on the "Select Facility" dropdown (Figma 10199-60873); picking
  // an option swaps to the name + address state (Figma 10199-67707).
  const [selected, setSelected] = useState<Facility | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [consent, setConsent] = useState(false);

  // Form values + submission state.
  const [form, setForm] = useState({ first: '', last: '', email: '', mobile: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const submitting = status === 'submitting';

  // Reset the form each time the modal is opened.
  useEffect(() => {
    if (!open) return;
    setForm({ first: '', last: '', email: '', mobile: '', message: '' });
    setConsent(false);
    setStatus('idle');
    setError('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  async function handleSubmit() {
    setError('');
    const first = form.first.trim();
    const last = form.last.trim();
    const email = form.email.trim();
    const mobile = form.mobile.trim();
    const message = form.message.trim();

    if (!first || !last || !email || !mobile || !message) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (mobile.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid mobile number.');
      return;
    }
    if (!consent) {
      setError('Please agree to receive messages to continue.');
      return;
    }

    setStatus('submitting');
    try {
      await createLead({ first, last, email, phone: mobile, message });
      setStatus('success');
    } catch (err) {
      console.error('[MessageModal] createLead error:', err);
      setStatus('error');
      setError('Sorry, we couldn’t send your message. Please try again.');
    }
  }

  if (!open) return null;

  const facilityName = selected?.name ?? 'STORAGE FACILITY';
  const canReselect = facilities.length > 1;

  return (
    <div className="pi-msg-overlay" onMouseDown={onClose}>
      <div className="pi-msg-modal" role="dialog" aria-modal="true" aria-label="Send us a Message" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pi-msg-head">
          <span className="pi-msg-title"><EnvelopeIcon size={24} /><span>Send us a Message</span></span>
          <button type="button" className="pi-msg-close" aria-label="Close" onClick={onClose}><CloseSolidIcon size={18} /></button>
        </div>

        {status === 'success' ? (
          <div className="pi-msg-body">
            <div className="pi-msg-success">
              <span className="pi-msg-success-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#028a0c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6.5 9.5 17 4.5 12" /></svg>
              </span>
              <p className="pi-msg-success-title">Message sent!</p>
              <p className="pi-msg-success-text">Thanks for reaching out — a member of our team will be in touch shortly.</p>
              <button type="button" className="pi-msg-submit" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
        <div className="pi-msg-body">
          {/* Facility: dropdown (unselected) or name + address (selected) */}
          <div className="pi-msg-facility-area">
            {selected ? (
              <div className="pi-msg-facility">
                {/* Static, not a button (Figma 10295-76697). Making the whole
                    block clickable is what gave it a hover fill — and that fill
                    was the host's `button:hover`, since this rule never declared
                    one of its own. "Change Property" is the control now. */}
                <div className="pi-msg-facility-info">
                  <span className="pi-msg-facility-name">{selected.name}</span>
                  {selected.address && (
                    <span className="pi-msg-facility-addr"><MapPinIcon size={24} /><span>{selected.address}</span></span>
                  )}
                </div>
                {canReselect && (
                  <button
                    type="button"
                    className="pi-msg-facility-change"
                    onClick={() => setListOpen((o) => !o)}
                  >
                    Change Property
                  </button>
                )}
              </div>
            ) : (
              /* Figma 10295-76823: a single "Select Property" field, no heading above it. */
              <button type="button" className="pi-msg-dd-btn" onClick={() => setListOpen((o) => !o)}>
                <span>Select Property</span>
                <ChevronDown size={24} />
              </button>
            )}
            {listOpen && facilities.length > 0 && (
              <ul className="pi-msg-dd-list">
                {facilities.map((f) => (
                  <li key={f.name}>
                    <button type="button" onClick={() => { setSelected(f); setListOpen(false); }}>{f.name}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Gaps follow the design: 16px between the name/contact rows, 24px
              before the message box. */}
          <div className="pi-msg-form">
            <div className="pi-msg-rows">
              <div className="pi-msg-row">
                <Field label="First Name" required value={form.first} onChange={set('first')} disabled={submitting} />
                <Field label="Last Name" required value={form.last} onChange={set('last')} disabled={submitting} />
              </div>
              <div className="pi-msg-row">
                <Field label="Email" required type="email" value={form.email} onChange={set('email')} disabled={submitting} />
                <Field label="Mobile" required type="tel" value={form.mobile} onChange={set('mobile')} disabled={submitting} />
              </div>
            </div>
            <MessageBox label="Leave us a Message" required value={form.message} onChange={set('message')} disabled={submitting} />
          </div>
        </div>
        )}

        {status !== 'success' && (
        <div className="pi-msg-foot">
          {/* The shared kit's checkbox, so this matches every other one on the
              site. Imported from its own module rather than the @shared/ui
              barrel — that would drag in Button, FormField, SummaryRail and
              paymentIcons' ~39KB of data URIs for a single control. */}
          <Checkbox checked={consent} onChange={setConsent} className="pi-msg-consent">
            <span className="pi-msg-consent-text">
              By providing your phone number, you consent to receive informational text messages from {facilityName}.
              Message frequency varies. Message &amp; data rates may apply. Reply HELP for help or STOP to unsubscribe at any time.
            </span>
          </Checkbox>
          <a className="pi-msg-terms" href={termsHref}>Click to see our Terms and Privacy Policy</a>

          {error && <p className="pi-msg-error" role="alert">{error}</p>}

          <div className="pi-msg-actions">
            <div className="pi-msg-captcha" aria-hidden="true">
              <span className="pi-msg-captcha-box" />
              <span className="pi-msg-captcha-label">I'm not a robot</span>
              <span className="pi-msg-captcha-brand">reCAPTCHA</span>
            </div>
            <div className="pi-msg-buttons">
              <button type="button" className="pi-msg-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
              <button type="button" className="pi-msg-submit" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
