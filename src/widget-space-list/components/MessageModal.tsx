import React, { useEffect, useState } from 'react';
import { createLead } from '../propertyApi';

// "Send us a Message" popup for the Space List sidebar — a faithful clone of the
// property-info modal (Figma 10199-60873 / 10199-67707): facility area, lead
// form, SMS consent, reCAPTCHA placeholder, and submit → shared leads API.

export interface Facility { name: string; address?: string; }

function EnvelopeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.8 7.76 16.3 11.27c-1.56.99-2.34 1.48-3.17 1.68-.74.17-1.51.17-2.25 0-.84-.2-1.62-.69-3.17-1.68L2.2 7.76M21.8 7.76c.2.96.2 2.24.2 4.24 0 2.8 0 4.2-.55 5.27a5 5 0 0 1-2.18 2.18C18 20 16.6 20 13.8 20H10c-2.8 0-4.2 0-5.27-.55a5 5 0 0 1-2.18-2.18C2 16.2 2 14.8 2 12c0-2 0-3.28.2-4.24M21.8 7.76a5 5 0 0 0-2.53-3.21C18.2 4 16.8 4 14 4h-4C7.2 4 5.8 4 4.73 4.55A5 5 0 0 0 2.2 7.76" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
function MapPinIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function ChevronDown() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9c1.577 2.181 3.423 4.137 5.49 5.817a.8.8 0 0 0 1.02 0C14.577 13.137 16.423 11.181 18 9" />
    </svg>
  );
}

function Field({
  label, required, type = 'text', textarea, value, onChange, disabled,
}: {
  label: string; required?: boolean; type?: string; textarea?: boolean;
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  const filled = value.trim().length > 0;
  return (
    <label className={`sl-msg-field${textarea ? ' sl-msg-field--area' : ''}${filled ? ' sl-msg-field--filled' : ''}`}>
      {textarea ? (
        <textarea className="sl-msg-field-input" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="sl-msg-field-input" type={type} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      )}
      <span className="sl-msg-field-label">{label}{required && <span className="sl-msg-req">*</span>}</span>
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
  const [selected, setSelected] = useState<Facility | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [consent, setConsent] = useState(false);

  const [form, setForm] = useState({ first: '', last: '', email: '', mobile: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const submitting = status === 'submitting';

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setListOpen(false);
    setForm({ first: '', last: '', email: '', mobile: '', message: '' });
    setConsent(false);
    setStatus('idle');
    setError('');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [open, onClose]);

  async function handleSubmit() {
    setError('');
    const first = form.first.trim();
    const last = form.last.trim();
    const email = form.email.trim();
    const mobile = form.mobile.trim();
    const message = form.message.trim();

    if (!first || !last || !email || !mobile || !message) { setError('Please fill in all required fields.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError('Please enter a valid email address.'); return; }
    if (mobile.replace(/\D/g, '').length < 10) { setError('Please enter a valid mobile number.'); return; }
    if (!consent) { setError('Please agree to receive messages to continue.'); return; }

    setStatus('submitting');
    try {
      await createLead({ first, last, email, phone: mobile, message });
      setStatus('success');
    } catch (err) {
      console.error('[SpaceList MessageModal] createLead error:', err);
      setStatus('error');
      setError('Sorry, we couldn’t send your message. Please try again.');
    }
  }

  if (!open) return null;

  const facilityName = selected?.name ?? 'STORAGE FACILITY';
  const canReselect = facilities.length > 1;

  return (
    <div className="sl-msg-overlay" onMouseDown={onClose}>
      <div className="sl-msg-modal" role="dialog" aria-modal="true" aria-label="Send Message" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sl-msg-head">
          <span className="sl-msg-title"><EnvelopeIcon /><span>Send Message</span></span>
          <button type="button" className="sl-msg-close" aria-label="Close" onClick={onClose}><CloseIcon /></button>
        </div>

        {status === 'success' ? (
          <div className="sl-msg-body">
            <div className="sl-msg-success">
              <span className="sl-msg-success-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#028a0c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6.5 9.5 17 4.5 12" /></svg>
              </span>
              <p className="sl-msg-success-title">Message sent!</p>
              <p className="sl-msg-success-text">Thanks for reaching out — a member of our team will be in touch shortly.</p>
              <button type="button" className="sl-msg-submit" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
        <div className="sl-msg-body">
          {/* Facility: dropdown (unselected) or name + address (selected) */}
          <div className="sl-msg-facility-area">
            {selected ? (
              <button
                type="button"
                className={`sl-msg-facility${canReselect ? ' sl-msg-facility--btn' : ''}`}
                onClick={() => canReselect && setListOpen((o) => !o)}
              >
                <span className="sl-msg-facility-name">{selected.name}</span>
                {selected.address && (
                  <span className="sl-msg-facility-addr"><MapPinIcon /><span>{selected.address}</span></span>
                )}
              </button>
            ) : (
              <>
                <p className="sl-msg-facility-heading">Select Facility</p>
                <button type="button" className="sl-msg-dd-btn" onClick={() => setListOpen((o) => !o)}>
                  <span>Select Facility</span>
                  <ChevronDown />
                </button>
              </>
            )}
            {listOpen && facilities.length > 0 && (
              <ul className="sl-msg-dd-list">
                {facilities.map((f) => (
                  <li key={f.name}>
                    <button type="button" onClick={() => { setSelected(f); setListOpen(false); }}>{f.name}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sl-msg-form">
            <p className="sl-msg-note">fields marked with <span className="sl-msg-req">*</span> are mandatory</p>
            <div className="sl-msg-row">
              <Field label="First Name" required value={form.first} onChange={set('first')} disabled={submitting} />
              <Field label="Last Name" required value={form.last} onChange={set('last')} disabled={submitting} />
            </div>
            <div className="sl-msg-row">
              <Field label="Email" required type="email" value={form.email} onChange={set('email')} disabled={submitting} />
              <Field label="Mobile" required type="tel" value={form.mobile} onChange={set('mobile')} disabled={submitting} />
            </div>
            <Field label="Leave us a Message" required textarea value={form.message} onChange={set('message')} disabled={submitting} />
          </div>
        </div>
        )}

        {status !== 'success' && (
        <div className="sl-msg-foot">
          <label className="sl-msg-consent">
            <input type="checkbox" checked={consent} disabled={submitting} onChange={(e) => setConsent(e.target.checked)} />
            <span className={`sl-msg-check${consent ? ' sl-msg-check--on' : ''}`} aria-hidden="true">
              {consent && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6.5 9.5 17 4.5 12" /></svg>
              )}
            </span>
            <span className="sl-msg-consent-text">
              By providing your phone number, you consent to receive informational text messages from {facilityName}.
              Message frequency varies. Message &amp; data rates may apply. Reply HELP for help or STOP to unsubscribe at any time.
            </span>
          </label>
          <a className="sl-msg-terms" href={termsHref}>Click to see our Terms and Privacy Policy</a>

          {error && <p className="sl-msg-error" role="alert">{error}</p>}

          <div className="sl-msg-actions">
            <div className="sl-msg-captcha" aria-hidden="true">
              <span className="sl-msg-captcha-box" />
              <span className="sl-msg-captcha-label">I'm not a robot</span>
              <span className="sl-msg-captcha-brand">reCAPTCHA</span>
            </div>
            <div className="sl-msg-buttons">
              <button type="button" className="sl-msg-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
              <button type="button" className="sl-msg-submit" onClick={handleSubmit} disabled={submitting}>
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
