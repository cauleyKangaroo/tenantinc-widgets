// ===========================================================================
// "Confirm" — the lightbox the Edit panel shows when "Apply change to all
// spaces" is ticked under an alternate or emergency contact that is fully
// filled in. It restates the person about to be written to EVERY lease, so a
// tick meant for one space cannot quietly rewrite the others.
//
// Portalled to <body> like the account sheet: the Edit panel sits inside a
// Duda column whose stacking and overflow would otherwise clip a dialog.
// ===========================================================================
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, MapPinIcon, PhoneIcon } from '@shared/ui';
import { EnvelopeIcon, UserSettingsIcon, InfoNoticeCurrentIcon } from './icons';
import type { ContactForm } from './data';

export function ConfirmContactModal({
  kind, contact, onCancel, onConfirm,
}: {
  kind: 'alternate' | 'emergency';
  contact: ContactForm;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onCancel]);

  const name = `${contact.first} ${contact.last}`.trim();
  const cityLine = [contact.city, [contact.state, contact.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  return createPortal(
    <div
      className="ma-confirm-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="ma-confirm" role="dialog" aria-modal="true" aria-labelledby="ma-confirm-title">
        <header className="ma-confirm__head">
          <h3 id="ma-confirm-title" className="ma-confirm__title">
            <InfoNoticeCurrentIcon className="ma-confirm__warn" />
            Confirm
          </h3>
          <button type="button" className="ma-confirm__close" onClick={onCancel} aria-label="Close">
            <CloseIcon size={24} />
          </button>
        </header>
        <div className="ma-confirm__body">
          <p className="ma-confirm__lede">
            You are changing the {kind} contact for <b>ALL</b> of your spaces to:
          </p>
          <ul className="ma-info__list ma-confirm__list">
            {name && (
              <li className="ma-info__row">
                <span className="ma-info__icon"><UserSettingsIcon /></span>
                <span className="ma-info__text">{name}</span>
              </li>
            )}
            {contact.address && (
              <li className="ma-info__row">
                <span className="ma-info__icon"><MapPinIcon size={24} /></span>
                <span className="ma-info__text">
                  <span className="ma-info__line">{contact.address}</span>
                  {cityLine && <span className="ma-info__line">{cityLine}</span>}
                </span>
              </li>
            )}
            {contact.email && (
              <li className="ma-info__row">
                <span className="ma-info__icon"><EnvelopeIcon /></span>
                <span className="ma-info__text">{contact.email}</span>
              </li>
            )}
            {contact.phone && (
              <li className="ma-info__row">
                <span className="ma-info__icon"><PhoneIcon size={24} /></span>
                <span className="ma-info__text">{contact.phone}</span>
              </li>
            )}
          </ul>
        </div>
        <footer className="ma-confirm__actions">
          <button type="button" className="ma-edit__cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="ma-confirm__ok" onClick={onConfirm}>Confirm</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
