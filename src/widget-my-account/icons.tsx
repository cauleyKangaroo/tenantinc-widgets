// ===========================================================================
// Icons for #19, each backed by the asset EXPORTED FROM FIGMA (9030-31458)
// rather than redrawn. webpack inlines them as data URIs (`asset/inline`), so
// the AMD bundle stays one self-contained file — the same reason #14 and #99
// carry their artwork this way.
//
// Every wrapper sets BOTH dimensions explicitly at the asset's own intrinsic
// size. Nothing here is sized by a descendant rule or left to `auto`, so the
// four 24px stroke glyphs, the 16px marks and the two Google Pay leaves each
// keep the geometry they were drawn at.
//
// Icons the shared kit ALREADY has — map pin, phone, info circle — are NOT
// duplicated here; MyAccount.tsx imports those from '@shared/ui'. The two
// info marks below are the EXCEPTION: the kit's InfoIcon is an outline
// circle-i, and the autopay states (12239-45881) draw mdiInformation FILLED,
// so the kit glyph does not match and the Figma export is used instead.
// ===========================================================================

import bankAsset from './assets/bank.svg';
import checkAsset from './assets/check.svg';
import chevronRightAsset from './assets/chevron-right.svg';
import chevronRight24Asset from './assets/chevron-right-24.svg';
import creditCardAsset from './assets/credit-card.svg';
import creditCardRemoveAsset from './assets/credit-card-remove.svg';
import creditCardRepeatAsset from './assets/credit-card-repeat.svg';
import gpayGMarkAsset from './assets/gpay-g-mark.svg';
import gpayTypefaceAsset from './assets/gpay-typeface.svg';
import shieldSettingsAsset from './assets/shield-settings.svg';
import carFrontAsset from './assets/car-front.svg';
import envelopeAsset from './assets/envelope.svg';
import fileTextAsset from './assets/file-text.svg';
import userArrowRightAsset from './assets/user-arrow-right.svg';
import userSettingsAsset from './assets/user-settings.svg';
import infoFilledAsset from './assets/info-filled.svg';
import infoNoticeAsset from './assets/info-notice.svg';
import checkTickCircleAsset from './assets/check-tick-circle.svg';
import messageAsset from './assets/message.svg';

interface AssetIconProps {
  className?: string;
}

/** 62px green tick-in-circle — the payment-success banner (12949-90476). */
export function CheckTickCircleIcon({ className }: AssetIconProps) {
  return <img src={checkTickCircleAsset} alt="" width={62} height={62} className={className} aria-hidden="true" />;
}

/** 24px speech bubble — "receipt has been sent" (12949-90476). */
export function MessageIcon({ className }: AssetIconProps) {
  return <img src={messageAsset} alt="" width={24} height={24} className={className} aria-hidden="true" />;
}

/** 24×24 stroke glyphs — the sizes Figma exported them at. */
export function BankIcon({ className }: AssetIconProps) {
  return <img src={bankAsset} alt="" width={24} height={24} className={className} aria-hidden="true" />;
}

export function CreditCardIcon({ className }: AssetIconProps) {
  return <img src={creditCardAsset} alt="" width={24} height={24} className={className} aria-hidden="true" />;
}

export function CreditCardRemoveIcon({ className }: AssetIconProps) {
  return <img src={creditCardRemoveAsset} alt="" width={24} height={24} className={className} aria-hidden="true" />;
}

export function CreditCardRepeatIcon({ className }: AssetIconProps) {
  return <img src={creditCardRepeatAsset} alt="" width={24} height={24} className={className} aria-hidden="true" />;
}

export function ShieldSettingsIcon({ className }: AssetIconProps) {
  return <img src={shieldSettingsAsset} alt="" width={24} height={24} className={className} aria-hidden="true" />;
}

/** 16×16. */
export function AmenityCheckIcon({ className }: AssetIconProps) {
  return <img src={checkAsset} alt="" width={16} height={16} className={className} aria-hidden="true" />;
}

/**
 * mdiInformation, FILLED — sits beside "Autopay Enrollment". 16×16 with the
 * fill baked in at the frame's #101318; the kit's InfoIcon is the outline
 * variant and is a different glyph, not a recolour of this one.
 */
export function InfoFilledIcon({ className }: AssetIconProps) {
  return <img src={infoFilledAsset} alt="" width={16} height={16} className={className} aria-hidden="true" />;
}

/** The same mark at the notice banner's own size and Guidance blue. 24×24. */
export function InfoNoticeIcon({ className }: AssetIconProps) {
  return <img src={infoNoticeAsset} alt="" width={24} height={24} className={className} aria-hidden="true" />;
}

/** InfoNoticeIcon's own path (assets/info-notice.svg), drawn in currentColor
 *  instead of the asset's fixed blue — for places that colour it in CSS. */
export function InfoNoticeCurrentIcon({ className }: AssetIconProps) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Solid rounded triangle — the Payment Activity disclosure on MOBILE (the
 * phone frame draws a filled ▼, not the desktop's outline chevron). Same
 * glyph as #99's ChevronSolidIcon; points right, rotated in CSS.
 */
export function ChevronSolidIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={(size * 8) / 14} height={size} viewBox="0 0 8 14" fill="none" aria-hidden="true">
      <path
        d="M1.58599 0.189675C1.26945 -0.0392302 0.84859 -0.0628562 0.508414 0.129182C0.168238 0.321219 -0.0289727 0.693759 0.00346815 1.08305C0.331619 5.02086 0.331619 8.97915 0.00346815 12.917C-0.0289726 13.3062 0.168238 13.6788 0.508414 13.8708C0.84859 14.0629 1.26945 14.0392 1.58599 13.8103C3.837 12.1825 5.8566 10.2764 7.59304 8.14103C8.13567 7.47372 8.13567 6.52629 7.59304 5.85898C5.8566 3.72356 3.837 1.81746 1.58599 0.189675Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** 32×32 — the Payment Activity disclosure, rotated to point down in CSS. */
export function ChevronBigRightIcon({ className }: AssetIconProps) {
  return <img src={chevronRightAsset} alt="" width={32} height={32} className={className} aria-hidden="true" />;
}

/**
 * The SAME chevron at the size the Edit panel's select draws it — 24, not the
 * 32 above scaled down. Figma exports the glyph at each size it is used, and
 * a 32px stroke squeezed into 24 is a thinner line than the one beside it.
 */
export function ChevronBigRight24Icon({ className }: AssetIconProps) {
  return <img src={chevronRight24Asset} alt="" width={24} height={24} className={className} aria-hidden="true" />;
}

/**
 * The 24px chevron pointing LEFT, for the payment panel's back control.
 *
 * The same exported asset turned 180deg rather than a second file: Figma has
 * no left-facing export of this glyph, and a mirrored stroke chevron is
 * identical to its own reflection — so rotating costs nothing and cannot drift
 * from the right-facing one beside it.
 */
export function ChevronBigLeft24Icon({ className }: AssetIconProps) {
  return (
    <img
      src={chevronRight24Asset}
      alt=""
      width={24}
      height={24}
      className={className}
      style={{ transform: 'rotate(180deg)' }}
      aria-hidden="true"
    />
  );
}

/**
 * Google Pay lockup. The kit's <GooglePayMark /> is NOT reused here: its "Pay"
 * wordmark is #3C4043, which is invisible on this button's #101318 fill. These
 * are the frame's own two leaves — the four-colour G and the white typeface —
 * kept at their exported sizes and overlapped exactly as the design lays them
 * out (the typeface offset 33.1px right, 1.59px down from the mark's origin).
 */
export function GooglePayLockup() {
  return (
    <span className="ma-gpay" role="img" aria-label="Google Pay">
      <img src={gpayGMarkAsset} alt="" width={24.6881} height={25.0421} className="ma-gpay__mark" />
      <img src={gpayTypefaceAsset} alt="" width={43.8769} height={28.4063} className="ma-gpay__type" />
    </span>
  );
}

/**
 * Apple Pay lockup set to match the Google one beside it: Apple's glyph, then
 * the SAME "Pay" typeface leaf at the same size, gap and drop, so both buttons
 * read as one typographic pair (Google's SDK button can't be restyled, so
 * Apple's side follows it). The glyph is Apple's vector, cut from the rental
 * flow's mark, at the Google G's 24.69px width, its body sitting on the
 * G's bottom edge. Matched on the body, not the whole glyph: the leaf is a
 * separate shape, and sizing leaf + body to the G left the apple itself
 * visibly smaller (20.3 × 19 against 24.7 × 25). The leaf rises above.
 */
export function ApplePayLockup() {
  return (
    <span className="ma-applepay" role="img" aria-label="Apple Pay">
      <svg width={24.6881} height={30.37} viewBox="0 0 7.52 9.25" className="ma-applepay__mark"
           xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M5.11121 1.47941C5.42961 1.08116 5.64568 0.54643 5.58869 0C5.1226 0.023176 4.55383 0.307496 4.22453 0.706057C3.92886 1.04736 3.66717 1.60448 3.73539 2.128C4.25861 2.17339 4.78133 1.86648 5.11121 1.47941Z" fill="currentColor" />
        <path d="M5.58275 2.23023C4.82292 2.18497 4.17688 2.66147 3.81402 2.66147C3.45097 2.66147 2.89531 2.25303 2.29433 2.26404C1.51211 2.27553 0.786303 2.7178 0.38936 3.42123C-0.427083 4.82841 0.173901 6.91577 0.967849 8.06184C1.35341 8.62884 1.81807 9.25315 2.43034 9.23072C3.00883 9.20802 3.23557 8.85614 3.93875 8.85614C4.64141 8.85614 4.84566 9.23072 5.45803 9.21938C6.09307 9.20802 6.49008 8.65209 6.87563 8.08454C7.31794 7.43819 7.49901 6.81409 7.51039 6.77983C7.499 6.76848 6.28586 6.30309 6.27461 4.90759C6.26316 3.73913 7.22707 3.18334 7.27243 3.14887C6.7281 2.34381 5.8776 2.25303 5.58275 2.23023Z" fill="currentColor" />
      </svg>
      <img src={gpayTypefaceAsset} alt="" width={43.8769} height={28.4063} className="ma-applepay__type" />
    </span>
  );
}

/* ── Account Info view (8815-115354) ─────────────────────────────────────── */

export function UserSettingsIcon({ className }: AssetIconProps) {
  return <img src={userSettingsAsset} alt="" width={24} height={24} className={className} aria-hidden="true" />;
}

export function EnvelopeIcon({ className }: AssetIconProps) {
  return <img src={envelopeAsset} alt="" width={24} height={24} className={className} aria-hidden="true" />;
}

export function CarFrontIcon({ className }: AssetIconProps) {
  return <img src={carFrontAsset} alt="" width={24} height={24} className={className} aria-hidden="true" />;
}

export function FileTextIcon({ className }: AssetIconProps) {
  return <img src={fileTextAsset} alt="" width={24} height={24} className={className} aria-hidden="true" />;
}

export function UserArrowRightIcon({ className }: AssetIconProps) {
  return <img src={userArrowRightAsset} alt="" width={24} height={24} className={className} aria-hidden="true" />;
}

/* Minus / Plus for the mobile prepay stepper (Figma 9023-27879 / 9023-27873).
   Drawn inline rather than added to the bundled asset set: two strokes each,
   and they need `currentColor` so the buttons can invert on press. */
export function MinusIcon({ className }: AssetIconProps) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  );
}

export function PlusIcon({ className }: AssetIconProps) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/* Phone account menu rows (Pay Bill uses CreditCardIcon above). Inline, like
   the stepper glyphs: 2px #111 strokes on a 24px frame, matching the exported
   credit card beside them. */
/** A space's Account Info — lines in a rounded square. */
export function AccountInfoIcon({ className }: AssetIconProps) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="6" />
      <path d="M8 9h8M8 12h8M8 15h5" />
    </svg>
  );
}

/** Logout — an arrow leaving a door frame. */
export function LogoutIcon({ className }: AssetIconProps) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h3a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-3M15 12H4M8 8l-4 4 4 4" />
    </svg>
  );
}

/** The phone account-menu trigger — three right-aligned bars (Figma "Group 2934"). */
export function SubmenuIcon({ className }: AssetIconProps) {
  return (
    <svg className={className} width="21" height="16" viewBox="0 0 21 16" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M1 1h19M7 8h13M12 15h8" />
    </svg>
  );
}
