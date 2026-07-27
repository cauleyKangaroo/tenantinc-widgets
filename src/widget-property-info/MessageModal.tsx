import React, { useEffect, useState } from 'react';
import { EnvelopeIcon, CloseIcon, MapPinIcon } from './icons';

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

function Field({ label, required, type = 'text', textarea }: { label: string; required?: boolean; type?: string; textarea?: boolean }) {
  const [value, setValue] = useState('');
  const filled = value.trim().length > 0;
  return (
    <label className={`pi-msg-field${textarea ? ' pi-msg-field--area' : ''}${filled ? ' pi-msg-field--filled' : ''}`}>
      {textarea ? (
        <textarea className="pi-msg-field-input" value={value} onChange={(e) => setValue(e.target.value)} />
      ) : (
        <input className="pi-msg-field-input" type={type} value={value} onChange={(e) => setValue(e.target.value)} />
      )}
      <span className="pi-msg-field-label">{label}{required && <span className="pi-req">*</span>}</span>
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

  if (!open) return null;

  const facilityName = selected?.name ?? 'STORAGE FACILITY';
  const canReselect = facilities.length > 1;

  return (
    <div className="pi-msg-overlay" onMouseDown={onClose}>
      <div className="pi-msg-modal" role="dialog" aria-modal="true" aria-label="Send Message" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pi-msg-head">
          <span className="pi-msg-title"><EnvelopeIcon size={24} /><span>Send Message</span></span>
          <button type="button" className="pi-msg-close" aria-label="Close" onClick={onClose}><CloseIcon size={18} /></button>
        </div>

        <div className="pi-msg-body">
          {/* Facility: dropdown (unselected) or name + address (selected) */}
          <div className="pi-msg-facility-area">
            {selected ? (
              <button
                type="button"
                className={`pi-msg-facility${canReselect ? ' pi-msg-facility--btn' : ''}`}
                onClick={() => canReselect && setListOpen((o) => !o)}
              >
                <span className="pi-msg-facility-name">{selected.name}</span>
                {selected.address && (
                  <span className="pi-msg-facility-addr"><MapPinIcon size={24} /><span>{selected.address}</span></span>
                )}
              </button>
            ) : (
              <>
                <p className="pi-msg-facility-heading">Select Facility</p>
                <button type="button" className="pi-msg-dd-btn" onClick={() => setListOpen((o) => !o)}>
                  <span>Select Facility</span>
                  <ChevronDown size={24} />
                </button>
              </>
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

          <div className="pi-msg-form">
            <p className="pi-msg-note">fields marked with <span className="pi-req">*</span> are mandatory</p>
            <div className="pi-msg-row">
              <Field label="First Name" required />
              <Field label="Last Name" required />
            </div>
            <div className="pi-msg-row">
              <Field label="Email" required type="email" />
              <Field label="Mobile" required type="tel" />
            </div>
            <Field label="Leave us a Message" required textarea />
          </div>
        </div>

        <div className="pi-msg-foot">
          <label className="pi-msg-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span className={`pi-msg-check${consent ? ' pi-msg-check--on' : ''}`} aria-hidden="true">
              {consent && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6.5 9.5 17 4.5 12" /></svg>
              )}
            </span>
            <span className="pi-msg-consent-text">
              By providing your phone number, you consent to receive informational text messages from {facilityName}.
              Message frequency varies. Message &amp; data rates may apply. Reply HELP for help or STOP to unsubscribe at any time.
            </span>
          </label>
          <a className="pi-msg-terms" href={termsHref}>Click to see our Terms and Privacy Policy</a>

          <div className="pi-msg-actions">
            <div className="pi-msg-captcha" aria-hidden="true">
              <span className="pi-msg-captcha-box" />
              <span className="pi-msg-captcha-label">I'm not a robot</span>
              <span className="pi-msg-captcha-brand">reCAPTCHA</span>
            </div>
            <div className="pi-msg-buttons">
              <button type="button" className="pi-msg-cancel" onClick={onClose}>Cancel</button>
              <button type="button" className="pi-msg-submit">Submit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
