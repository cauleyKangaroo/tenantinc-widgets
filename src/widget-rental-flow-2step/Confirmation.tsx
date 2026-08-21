import React from 'react';
import { Button, CalendarIcon } from '@shared/ui';
import { KeyIcon, MessageIcon, TickCircleIcon, WriteReviewIcon } from './planIcons';
import reviewStars from './assets/review-stars.svg';
// The official badges, exported from Figma (8754-50342 / 8754-50343) and
// inlined as data URIs by webpack — the AMD bundle can't fetch remote assets.
// Apple's is a raster (Figma flattens the placed .svg); downscaled to 3x its
// 128px slot rather than shipping the 1280px original for a 42KB saving.
import appleWalletBadge from './assets/wallet-apple.png';
import googleWalletBadge from './assets/wallet-google.svg';

// ---------------------------------------------------------------------------
// Confirmation & failure pages (Figma: Reservation Confirmation 8507-24998,
// rental 8507-24218, no gate code 8509-35881, Smart Entry 8507-24706). Rendered
// on the thank-you page from a one-time confirmation payload (see
// stashConfirmation/readConfirmationPayload in RentalFlow2Step). The order-
// summary rail (right column) is composed by the caller from the shared
// <SummaryRail>; this file is the left column.
// ---------------------------------------------------------------------------

export type EntryMode = 'gate' | 'none' | 'smart';

export interface ConfirmationProps {
  kind: 'rental' | 'reservation';
  errorMessage?: string;
  name?: string;
  phone?: string;
  unitNumber?: string;
  code?: string;
  entry?: EntryMode;
  moveInDate?: string;
  reservationDate?: string;
  facilityPhone?: string;
  officeHours?: string[];
  gateHours?: string[];
  /** "Rent Online Now" target (reservation → rental). Hidden if absent. */
  rentUrl?: string;
  /** Failure page "Try again" handler. */
  onRetry?: () => void;
  /** Operator's review link — the review card renders only when set. */
  reviewUrl?: string;
  /** Backend confirmed an SMS was sent — only then do we claim it + show Resend. */
  smsSent?: boolean;
  /** Real resend handler — the Resend control renders only when provided. */
  onResend?: () => void;
  /** Wallet-pass URLs — the wallet buttons render only when provided. */
  appleWalletUrl?: string;
  googleWalletUrl?: string;
  /** Backend confirmed the id is a customer-facing code (else "Reference"). */
  codeIsPublic?: boolean;
  /** Operator-editable success heading (already resolved for this kind by the
   *  parent). Falls back to the built-in reservation/rental copy. */
  confirmedHeading?: string;
}

// Figma's own placeholder values (8507-24349). Used only when the real thing is
// absent, so a populated page never shows them — but note that the SMS line is
// a CLAIM: see the comment where it renders.
const DEMO_PHONE = '(949) 456-8765';
const DEMO_REVIEW_URL = 'https://www.google.com/maps';

const WHATS_NEXT = [
  'Show up at your facility on or before your move-in date.',
  'A lock is required and is available at your facility.',
  'Bring your government-issued ID to complete your rental.',
  'Moving supplies are available at the facility.',
  'Call your facility manager with any questions you may have.',
  'If you decide you need a different unit, we can easily make that change for you.',
];

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function GoogleG() {
  return (
    <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17Z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7A22 22 0 0 0 24 46Z" />
      <path fill="#FBBC05" d="M11.69 28.18A13.2 13.2 0 0 1 11 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A22 22 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7Z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.94 4.34 14.12l7.35 5.7C13.42 14.62 18.27 10.75 24 10.75Z" />
    </svg>
  );
}
// Apple/Google Wallet badges. Shown on every gate-code confirmation even before
// the backend can mint passes — non-interactive until a pass URL is supplied
// (Apple .pkpass / Google Save JWT), at which point it becomes a real link.
//
// The artwork is the platforms' own badge, not a lookalike built from a logo and
// two lines of text: both Apple and Google publish these as fixed assets whose
// wordmark, spacing and corner radius are prescribed, so redrawing them is both
// wrong and off-guidelines. Each keeps the exact size the frame gives it — they
// are NOT the same height, and forcing them to match would distort one of them.
const WALLET_BADGES = {
  apple: { src: appleWalletBadge, label: 'Apple Wallet', w: 128.378, h: 39.717 },
  google: { src: googleWalletBadge, label: 'Google Wallet', w: 139.009, h: 37.510 },
} as const;

function WalletBadge({ brand, href }: { brand: 'apple' | 'google'; href?: string }) {
  const { src, label, w, h } = WALLET_BADGES[brand];
  const img = (
    <img className="rfc-wb-img" src={src} width={w} height={h} alt={`Add to ${label}`} />
  );
  const cls = `rfc-wb rfc-wb--${brand}`;
  return href
    ? <a className={cls} href={href} target="_blank" rel="noreferrer">{img}</a>
    : <span className={cls} role="img" aria-label={`Add to ${label} — coming soon`}>{img}</span>;
}

export function Confirmation({
  kind,
  errorMessage,
  name,
  phone,
  unitNumber,
  code,
  entry = 'gate',
  moveInDate,
  reservationDate,
  facilityPhone,
  officeHours,
  gateHours,
  rentUrl,
  onRetry,
  reviewUrl,
  // Kept in the signature, deliberately unused: the sent bar renders
  // unconditionally for review (see the note where it renders) and this is the
  // gate that has to come back before launch. Deleting it would erase the
  // record of what the correct behaviour is.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  smsSent,
  onResend,
  appleWalletUrl,
  googleWalletUrl,
  confirmedHeading,
}: ConfirmationProps) {
  const isReservation = kind === 'reservation';
  const codeLabel = isReservation ? 'Reservation Code' : 'Access Code';

  if (errorMessage) {
    return (
      <div className="rf-card rfc-card">
        <div className="rf-title">
          {name && <p className="rf-eyebrow rfc-error-eyebrow">{name},</p>}
          <h2 className="rf-heading">We couldn&rsquo;t complete your {kind}</h2>
        </div>
        <div className="rfc-error-panel">
          <p className="rfc-error-msg">{errorMessage}</p>
          <p className="rfc-error-sub">
            Your card was not charged. You can try again{facilityPhone ? (
              <>, or call the facility at <a href={`tel:${facilityPhone.replace(/\D/g, '')}`}>{facilityPhone}</a> and we&rsquo;ll finish it together</>
            ) : ''}.
          </p>
        </div>
        {onRetry && <Button tone="cta" className="rfc-retry" onClick={onRetry}>Try again</Button>}
      </div>
    );
  }

  return (
    <div className="rf-card rfc-card">
      <div className="rf-title">
        {name && <p className="rf-eyebrow">{name},</p>}
        <h2 className="rf-heading">
          {confirmedHeading ?? (isReservation ? 'Your reservation is confirmed!' : 'Your Space is ready!')}
        </h2>
      </div>

      {/* Renders unconditionally so the block is visible without a backend that
          can confirm an SMS. NOTE: with smsSent false this states something that
          did not happen — fine for review, wrong on a live page. Gate it back on
          `smsSent` before this ships, or make the copy conditional. */}
      <div className="rfc-sent">
        <span className="rfc-sent-icon"><MessageIcon size={24} /></span>
        <span className="rfc-sent-txt">
          We&rsquo;ve sent your {isReservation ? 'Reservation' : 'Access'} Code to {phone ?? DEMO_PHONE}
        </span>
        <button type="button" className="rfc-resend" onClick={onResend}>Resend</button>
      </div>

      <section className="rfc-panel">
        {unitNumber && <div className="rfc-space-head">Space {unitNumber}</div>}

        {/* Code card on the left, details (dates/hours + rent nudge) beside it
            on the right — the code card is a fixed 328px so the details column
            keeps enough width that "Reservation Date: …, 2026" never wraps. */}
        <div className="rfc-cols">
          <div className="rfc-code-card">
            {entry === 'smart' ? (
              <div className="rfc-code-top">
                <span className="rfc-code-label">Smart Entry System</span>
                <span className="rfc-code">App access enabled</span>
                <span className="rfc-code-note">Doors unlock from the mobile app — no code needed.</span>
              </div>
            ) : entry === 'none' ? (
              <div className="rfc-code-top">
                <span className="rfc-code-label">Access</span>
                <span className="rfc-code-note">See the facility manager at move-in for your access details.</span>
              </div>
            ) : (
              <>
                <div className="rfc-code-top">
                  <span className="rfc-code-label"><KeyIcon size={24} />{codeLabel}</span>
                  {code
                    ? <span className="rfc-code">{isReservation ? code : `#${code}*`}</span>
                    : <span className="rfc-code-note">Shown at the facility on move-in.</span>}
                </div>
                {/* Wallet strip — shown even before pass URLs exist (Figma). */}
                <div className="rfc-wallet">
                  <span className="rfc-wallet-title">Add to your Wallet</span>
                  <div className="rfc-wallet-row">
                    <WalletBadge brand="apple" href={appleWalletUrl} />
                    <WalletBadge brand="google" href={googleWalletUrl} />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="rfc-details">
            <div className="rfc-info-dates">
              <CalendarIcon className="rfc-info-cal" />
              <div>
                {isReservation && reservationDate && (
                  <p><b>Reservation Date:</b> {reservationDate}</p>
                )}
                {moveInDate && <p><b>Move-in Date:</b> {moveInDate}</p>}
              </div>
            </div>
            {((officeHours && officeHours.length > 0) || (gateHours && gateHours.length > 0)) && (
              <div className="rfc-info-hours">
                <ClockIcon className="rfc-info-cal" />
                <div>
                  {officeHours && officeHours.length > 0 && (
                    <p className="rfc-hours"><b>Office Hours</b>{officeHours.map((l) => <React.Fragment key={l}><br />{l}</React.Fragment>)}</p>
                  )}
                  {gateHours && gateHours.length > 0 && (
                    <p className="rfc-hours rfc-hours--gate"><b>Gate Hours</b>{gateHours.map((l) => <React.Fragment key={l}><br />{l}</React.Fragment>)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full-width row under the code card: prompt on the left, Rent Online
            Now button spanning the rest of the row on the right. */}
        {isReservation && rentUrl && (
          <div className="rfc-rentnow">
            <span>Want to save time &amp; money<br />on the move-in day?</span>
            <Button tone="cta" href={rentUrl}>Rent Online Now</Button>
          </div>
        )}
      </section>

      {/* Also unconditional now. Harmless without a real operator link — it is a
          prompt, not a claim — but the href falls back to a generic destination,
          so wire `reviewUrl` before launch. */}
      <section className="rfc-review">
        <p className="rfc-review-q">
          Our goal is to simplify the move-in process.{' '}
          <span className="rfc-review-accent">How are we doing?</span>
        </p>
        <div className="rfc-review-right">
          {/* The five stars are ONE exported asset, not five copies of a star:
              the frame spaces them 41.671px apart inside a 194.356x27 box, and
              rebuilding that from a repeated glyph is a gap to get wrong. */}
          <div className="rfc-review-rating">
            <span className="rfc-review-g"><GoogleG /></span>
            <img className="rfc-review-stars" src={reviewStars} width={194.356} height={27.0004} alt="Rate us out of five" />
          </div>
          <a className="rfc-review-link" href={reviewUrl ?? DEMO_REVIEW_URL} target="_blank" rel="noreferrer">
            <WriteReviewIcon size={24} />
            Write a Review
          </a>
        </div>
      </section>

      <section className="rfc-next">
        <div className="rfc-next-title">What&rsquo;s Next?</div>
        <div className="rfc-next-list">
          {WHATS_NEXT.map((item) => (
            <div className="rfc-next-item" key={item}>
              <span className="rfc-next-check"><TickCircleIcon size={28} /></span>
              <span>{facilityPhone ? item.replace('facility manager', `facility manager ${facilityPhone}`) : item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
