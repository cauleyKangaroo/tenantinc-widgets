import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseSolidIcon, MapPinIcon, PhoneIcon } from '@shared/ui/icons';
import type { LeadInput } from '@shared/leadsApi';
import { MessageModal } from './MessageModal';
import './ContactConfirmation.css';

// ---------------------------------------------------------------------------
// "Great, We'll contact you soon." lightbox (Figma 12447-90822).
//
// SHARED: shown after #05's waitlist form AND after the rental flow's "space no
// longer available" Contact me. One component so the two cannot drift — the
// same reason MessageModal is shared.
//
// Each caller maps its own property shape onto `ConfirmationFacility`. Anything
// not supplied is left out rather than faked: a phone number or opening hours
// on this card are things a shopper will act on.
//
// Portalled to <body>: both callers sit inside `container-type` ancestors,
// which contain a `position: fixed` overlay. Outside every widget wrapper, so
// all of ContactConfirmation.css is self-contained.
// ---------------------------------------------------------------------------

export interface ConfirmationFacility {
  name?: string;
  /** One line, e.g. "1301 E. Mission Ave, Fullerton, CA 02027". */
  address?: string;
  phones?: { number: string; note?: string }[];
  /** e.g. { title: 'Office Hours', lines: ['Mon-Sat: 8:00 AM - 5:00 PM'] }. */
  hours?: { title: string; lines: string[] }[];
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** message/message-default — traced from the Figma export. */
function MessageIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...stroke}>
      <path d="M16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V12.2C3 13.8802 3 14.7202 3.32698 15.362C3.6146 15.9265 4.07354 16.3854 4.63803 16.673C5.27976 17 6.11984 17 7.8 17H8V21L13 17H16.2C17.8802 17 18.7202 17 19.362 16.673C19.9265 16.3854 20.3854 15.9265 20.673 15.362C21 14.7202 21 13.8802 21 12.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3Z" />
      <path d="M7 8H17" />
      <path d="M7 12H14" />
    </svg>
  );
}

/** envelope/envelope-default — traced from the Figma export. */
function EnvelopeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...stroke}>
      <path d="M21.8032 7.76159L16.295 11.2668C14.7385 12.2573 13.9602 12.7526 13.1238 12.9455C12.3843 13.1161 11.6157 13.1161 10.8762 12.9455C10.0398 12.7526 9.26153 12.2573 7.70499 11.2668L2.19678 7.76159M21.8032 7.76159C22 8.72189 22 10.006 22 12C22 14.8003 22 16.2004 21.455 17.27C20.9757 18.2108 20.2108 18.9757 19.27 19.455C18.2004 20 16.8003 20 14 20H10C7.19974 20 5.79961 20 4.73005 19.455C3.78924 18.9757 3.02433 18.2108 2.54497 17.27C2 16.2004 2 14.8003 2 12C2 10.006 2 8.72189 2.19678 7.76159M21.8032 7.76159C21.7237 7.37332 21.6119 7.03798 21.455 6.73005C20.9757 5.78924 20.2108 5.02433 19.27 4.54497C18.2004 4 16.8003 4 14 4H10C7.19974 4 5.79961 4 4.73005 4.54497C3.78924 5.02433 3.02433 5.78924 2.54497 6.73005C2.38807 7.03798 2.27634 7.37332 2.19678 7.76159" />
    </svg>
  );
}

/** Clock (mdiClockOutline) — a filled mark in the export, so fill not stroke. */
function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 7H12.5V12.2L17 14.9L16.2 16.2L11 13V7Z" />
    </svg>
  );
}

/** "1301 E. Mission Ave, Fullerton, CA 02027" → street / remainder, as the design breaks it. */
function splitAddress(address: string): [string, string] {
  const i = address.indexOf(', ');
  if (i === -1) return [address, ''];
  // A composed address can carry an empty address-2 as ",," — one comma here.
  return [`${address.slice(0, i).replace(/,+$/, '')},`, address.slice(i + 2).replace(/^[,\s]+/, '')];
}

function ConfirmationCard({
  phone, facility, onClose, onSendMessage, onResend,
}: {
  phone: string;
  facility: ConfirmationFacility;
  onClose: () => void;
  onSendMessage?: () => void;
  onResend?: () => void;
}) {
  const { name, address = '', phones = [], hours = [] } = facility;
  const [street, locality] = splitAddress(address);
  const shownHours = hours.filter((s) => s.lines.length > 0);

  return (
    <div
      className="hb-cc-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hb-cc-heading"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Not in the frame — a dialog still needs a visible way out. */}
      <button type="button" className="hb-cc-close" aria-label="Close" onClick={onClose}>
        <CloseSolidIcon size={18} />
      </button>

      <h2 id="hb-cc-heading" className="hb-cc-heading">
        <span className="hb-cc-kicker">Great,</span>
        <span>We’ll contact you soon.</span>
      </h2>

      <div className="hb-cc-sent" role="status">
        <MessageIcon />
        <span className="hb-cc-sent-text">We’ve sent a confirmation to {phone}</span>
        {/* No resend exists yet; hidden until a caller supplies one. */}
        {onResend && (
          <button type="button" className="hb-cc-link hb-cc-resend" onClick={onResend}>Resend</button>
        )}
      </div>

      <div className="hb-cc-info">
        <p className="hb-cc-info-lead">
          In the meantime feel free to reach out to us for any storage related needs.
        </p>
        {name && <p className="hb-cc-info-name">{name}</p>}

        <div className="hb-cc-cols">
          <div className="hb-cc-col">
            {address && (
              <a
                className="hb-cc-row"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPinIcon size={24} />
                <span className="hb-cc-u">{street}{locality && <><br />{locality}</>}</span>
              </a>
            )}

            {phones.length > 0 && (
              <div className="hb-cc-phones">
                {phones.map((p, i) => (
                  <div className="hb-cc-row" key={`${p.number}-${i}`}>
                    {/* One icon for the group; later rows keep its slot so the
                        numbers line up (the frame's second icon is invisible). */}
                    {i === 0 ? <PhoneIcon size={24} /> : <span className="hb-cc-icon-slot" aria-hidden="true" />}
                    <span>
                      <a className="hb-cc-u" href={`tel:${p.number.replace(/[^\d+]/g, '')}`}>{p.number}</a>
                      {p.note && ` (${p.note})`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {onSendMessage && (
              <button type="button" className="hb-cc-row hb-cc-link" onClick={onSendMessage}>
                <EnvelopeIcon />
                <span className="hb-cc-u">Send us a Message</span>
              </button>
            )}
          </div>

          {shownHours.length > 0 && (
            <div className="hb-cc-col hb-cc-hours">
              <ClockIcon />
              <div>
                {shownHours.map((s) => (
                  <React.Fragment key={s.title}>
                    <p className="hb-cc-hours-title">{s.title}</p>
                    {s.lines.map((line) => <p key={line}>{line}</p>)}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ContactConfirmationModal({
  open, onClose, phone, facility, submitMessage, onResend,
}: {
  open: boolean;
  onClose: () => void;
  /** The number the shopper entered, as they saw it formatted. */
  phone: string;
  facility: ConfirmationFacility;
  /**
   * The caller's lead call. Supplied ⇒ "Send us a Message" swaps in the shared
   * MessageModal, preselected on this facility; absent ⇒ the link is hidden,
   * since there would be nothing to send it with.
   */
  submitMessage?: (input: LeadInput) => Promise<unknown>;
  onResend?: () => void;
}) {
  const [messageOpen, setMessageOpen] = useState(false);

  useEffect(() => { if (open) setMessageOpen(false); }, [open]);

  // MessageModal owns Escape and the scroll lock while it is up.
  useEffect(() => {
    if (!open || messageOpen) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, messageOpen, onClose]);

  if (!open) return null;

  // It brings its own overlay, so it replaces this one rather than stacking.
  const content = messageOpen && submitMessage ? (
    <MessageModal
      open
      onClose={onClose}
      facilities={[{ name: facility.name || 'This Facility', address: facility.address }]}
      defaultFacility={{ name: facility.name || 'This Facility', address: facility.address }}
      submitLead={submitMessage}
    />
  ) : (
    <div className="hb-cc-overlay" onMouseDown={onClose}>
      <ConfirmationCard
        phone={phone}
        facility={facility}
        onClose={onClose}
        onSendMessage={submitMessage ? () => setMessageOpen(true) : undefined}
        onResend={onResend}
      />
    </div>
  );

  return typeof document !== 'undefined' && document.body ? createPortal(content, document.body) : content;
}
