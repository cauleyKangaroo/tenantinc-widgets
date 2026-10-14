// ===========================================================================
// The DEFAULT left-hand panel — Figma 8815-115354 ("Account Info - Display").
//
// Heading + Edit, then two columns (Primary Contact | Documents), then
// Alternate Contact beneath the first column, then a tinted action panel with
// the balance, "Pay Now" and two more links.
//
// "Pay Now" is the only route to the Make a Payment screen, so it takes the
// notification orange (Primary/Notifications) rather than the CTA green — one
// of the very few places in the kit where those two differ deliberately.
// ===========================================================================

import { Button, MapPinIcon, PhoneIcon } from '@shared/ui';
import {
  CarFrontIcon, EnvelopeIcon, FileTextIcon, UserArrowRightIcon, UserSettingsIcon,
} from './icons';
import type { AccountDocument, AccountSpace, Contact } from './data';

/** One icon + text row. The address arrives as several lines and keeps them. */
function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="ma-info__row">
      <span className="ma-info__icon">{icon}</span>
      <span className="ma-info__text">{children}</span>
    </li>
  );
}

/**
 * The ALTERNATE contact's row order — name, address, email, phone. The primary
 * contact runs name, email, phone, address, licence instead, so it is spelled
 * out at its own call site rather than both sharing one order and one of them
 * coming out wrong.
 */
function AlternateContact({ contact }: { contact: Contact }) {
  return (
    <ul className="ma-info__list">
      <InfoRow icon={<UserSettingsIcon />}>{contact.name}</InfoRow>
      {contact.address && (
        <InfoRow icon={<MapPinIcon size={24} />}>
          {contact.address.map((l) => <span key={l} className="ma-info__line">{l}</span>)}
        </InfoRow>
      )}
      {contact.email && <InfoRow icon={<EnvelopeIcon />}>{contact.email}</InfoRow>}
      {contact.phone && <InfoRow icon={<PhoneIcon size={24} />}>{contact.phone}</InfoRow>}
    </ul>
  );
}

/*
 * A row can only be fetched when the record gave it both ids and did not say
 * the file is unavailable. The frame's own sample rows have neither id, so they
 * stay inert rather than firing a request for a file that does not exist.
 */
function canOpen(doc: AccountDocument): boolean {
  return !!(doc.leaseId && doc.documentId && doc.available !== false);
}

export function AccountInfoPanel({
  space,
  onPayNow,
  onEdit,
  onOpenDocument,
  busyDocument,
  contact,
  alternate,
  documents,
}: {
  space: AccountSpace;
  onPayNow: () => void;
  /** Opens the Edit panel (8815-115876) in this panel's place. */
  onEdit: () => void;
  /*
   * The signed-in account's REAL details, when they have loaded. Each falls
   * back to the frame's sample so the harness and the Duda editor still render
   * a populated panel with no session.
   */
  contact?: Contact;
  /**
   * Fetch and save a document. Omitted → the rows stay inert, which is what
   * keeps the frame's sample list from firing requests for files that do not
   * exist.
   */
  onOpenDocument?: (doc: AccountDocument) => void;
  /** The label currently downloading, so its row can say so. */
  busyDocument?: string;
  /**
   * `null` is meaningful and not the same as omitted: it says the account HAS
   * no alternate contact, so the block is hidden rather than showing the
   * sample's Jerry Boo.
   */
  alternate?: Contact | null;
  documents?: AccountDocument[];
}) {
  const primary = contact ?? space.primaryContact;
  const alt = alternate !== undefined ? alternate : space.alternateContact;
  const docs = documents ?? space.documents;

  return (
    <section className="ma-account">
      <div className="ma-account__body">
        <header className="ma-account__head">
          <p role="heading" aria-level={2} className="ma-account__title">{space.title}</p>
          <Button tone="dark" className="ma-btn-40" onClick={onEdit}>Edit</Button>
        </header>
        <hr className="ma-account__rule" />

        <div className="ma-account__cols">
          <div className="ma-account__col ma-account__col--contact">
            <p role="heading" aria-level={3} className="ma-account__label">Primary Contact</p>
            <ul className="ma-info__list">
              <InfoRow icon={<UserSettingsIcon />}>{primary.name}</InfoRow>
              {primary.email && <InfoRow icon={<EnvelopeIcon />}>{primary.email}</InfoRow>}
              {primary.phone && <InfoRow icon={<PhoneIcon size={24} />}>{primary.phone}</InfoRow>}
              {primary.address && (
                <InfoRow icon={<MapPinIcon size={24} />}>
                  {primary.address.map((l) => <span key={l} className="ma-info__line">{l}</span>)}
                </InfoRow>
              )}
              {primary.licence && <InfoRow icon={<CarFrontIcon />}>{primary.licence}</InfoRow>}
            </ul>
          </div>

          <div className="ma-account__col ma-account__col--docs">
            <p role="heading" aria-level={3} className="ma-account__label">Documents</p>
            <ul className="ma-info__list ma-docs">
              {/* A lease with nothing filed says so, rather than leaving a
                  heading over an empty list that reads as still loading. */}
              {docs.length === 0 && (
                <li className="ma-docs__row ma-docs__row--empty">No documents for this space yet.</li>
              )}
              {docs.map((doc) => (
                /* The document id, where there is one: two leases can file the
                   same document name, and the sample data has none. */
                <li className="ma-docs__row" key={doc.documentId || doc.label}>
                  <span className="ma-info__icon"><FileTextIcon /></span>
                  {/* A BUTTON, not a link, and deliberately so: the file
                      endpoint authenticates on a header, which a browser never
                      sends when following an href — so a real link would 401.
                      The bytes are fetched and handed over as a blob instead. */}
                  <button
                    type="button"
                    className="ma-docs__link"
                    disabled={!canOpen(doc) || busyDocument === (doc.documentId || doc.label)}
                    onClick={() => onOpenDocument?.(doc)}
                  >
                    {busyDocument === (doc.documentId || doc.label) ? 'Opening…' : doc.label}
                  </button>
                  {/* The date is what separates this month's notice from last
                      month's — see documentsOf in leaseMapping. */}
                  {/* A signed document shows the "Signed" pill IN PLACE of its
                      date (client feedback): the pill is what matters on a
                      lease, and the notices that need dates are never signed. */}
                  {doc.status
                    ? <span className="ma-docs__chip">{doc.status}</span>
                    : doc.date && <span className="ma-docs__date">{doc.date}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {alt && (
          <div className="ma-account__alt">
            <p role="heading" aria-level={3} className="ma-account__label">Alternate Contact</p>
            <AlternateContact contact={alt} />
          </div>
        )}
      </div>

      {/* Action panel — tinted, and square only at the top so it finishes the
          card's rounded bottom. */}
      <div className="ma-action">
        <div className="ma-action__due">
          <p className="ma-action__dueLabel">{space.dueLabel}</p>
          <div className="ma-action__pay">
            <p className="ma-action__amount">{space.dueAmount}</p>
            <button type="button" className="ma-paynow" onClick={onPayNow}>Pay Now</button>
          </div>
        </div>

        {/* Change Address Form and Schedule Move Out — switched off for now
            (2026-10-14): neither has a destination yet, and a link that goes
            nowhere is worse than none. Restore by uncommenting.
                <ul className="ma-info__list ma-action__links">
          <li className="ma-info__row">
            <span className="ma-info__icon"><FileTextIcon /></span>
            <button type="button" className="ma-docs__link">Change Address Form</button>
          </li>
          <li className="ma-info__row">
            <span className="ma-info__icon"><UserArrowRightIcon /></span>
            <button type="button" className="ma-docs__link">Schedule Move Out</button>
          </li>
        </ul>
        */}
      </div>
    </section>
  );
}
