// ===========================================================================
// "What Does My Plan Cover?" — the Protection Plan coverage card.
// Figma: Mariposa — Duda, node 8509-36480.
//
// The Figma node is the CARD only, and it now has TWO presentations: a hover
// popover on desktop, and this lightbox on tablet/mobile where hover does not
// exist. `PlanCoverageBody` is the card's contents, exported so both render
// exactly the same thing from one source rather than drifting apart.
//
// The lightbox wraps it in the same overlay shell as MoveInDateModal (Escape,
// click-outside to close, scroll lock). The five coverage rows and the Download
// Brochure button are the design; the close button is an addition, because a
// modal needs a way out that isn't Escape — the popover has none, as moving the
// pointer away is its dismissal.
// ===========================================================================

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseCircleIcon } from '@shared/ui';
import { FireGlyph, DropGlyph, EyeGlyph, WindGlyph, SnowGlyph, DownloadIcon } from './planIcons';

/** The covered causes, in the design's order. */
const COVERAGE: { icon: React.ReactNode; text: string }[] = [
  { icon: <FireGlyph />, text: 'Fire or Lightening, Explosion' },
  { icon: <DropGlyph />, text: 'Smoke or Water Damage; No Flooding' },
  { icon: <EyeGlyph />, text: 'Vandalism, Malicious Mischief or Burglary' },
  { icon: <WindGlyph />, text: 'Windstorm or Hail' },
  { icon: <SnowGlyph />, text: 'Weight of Ice, Snow or Sleet; Building Collapse' },
];

/**
 * The card's contents: heading, intro, the five covered causes, brochure.
 *
 * Everything the Figma frame contains — the close button is NOT here, because
 * it belongs to the modal shell rather than to the design.
 */
export function PlanCoverageBody({
  brochureUrl, titleId,
}: {
  /** Brochure PDF. Absent → the button is inert rather than a dead link. */
  brochureUrl?: string;
  /** Set by the modal so its aria-labelledby has something to point at. */
  titleId?: string;
}) {
  return (
    <>
      <div className="rf-pp-head">
        <p className="rf-pp-title" id={titleId}>What Does My Plan Cover?</p>
        <p className="rf-pp-sub">
          Our Plan will pay for loss of or damage to your property from many causes including:
        </p>
      </div>

      <ul className="rf-pp-list">
        {COVERAGE.map((row) => (
          <li className="rf-pp-row" key={row.text}>
            <span className="rf-pp-ico" aria-hidden="true">{row.icon}</span>
            <span className="rf-pp-text">{row.text}</span>
          </li>
        ))}
      </ul>

      {/* Anchor when there's a real URL so it downloads properly (and
          middle-click works); a disabled button when there isn't, rather than
          an <a href="#"> that looks live and does nothing. */}
      {brochureUrl ? (
        <a className="rf-pp-brochure" href={brochureUrl} download target="_blank" rel="noreferrer">
          <DownloadIcon size={24} />
          Download Brochure
        </a>
      ) : (
        <button type="button" className="rf-pp-brochure" disabled>
          <DownloadIcon size={24} />
          Download Brochure
        </button>
      )}
    </>
  );
}

export function ProtectionPlanModal({
  open, onClose, brochureUrl,
}: {
  open: boolean;
  onClose: () => void;
  /** Brochure PDF. Absent → the button is inert rather than a dead link. */
  brochureUrl?: string;
}) {
  // Escape closes, and the page behind doesn't scroll while it's up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const overlay = (
    <div className="rf-overlay" onClick={onClose} role="presentation">
      <div
        className="rf-pp-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rf-pp-title"
        // Stop a click inside the card reaching the overlay's close handler.
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="rf-pp-close" onClick={onClose} aria-label="Close">
          {/* Filled disc: .rf-pp modal is #fff. */}
          <CloseCircleIcon size={18} />
        </button>

        <PlanCoverageBody brochureUrl={brochureUrl} titleId="rf-pp-title" />
      </div>
    </div>
  );

  // Portalled to <body>. A `position: fixed` overlay is contained by the
  // nearest ancestor with LAYOUT containment, and the flow's content column is
  // `container-type: inline-size` so its contents size off the column rather
  // than the browser — which would pin this overlay to that column instead of
  // the viewport. Same reason as ProcessingModal; see the note there.
  return typeof document !== 'undefined' && document.body
    ? createPortal(overlay, document.body)
    : overlay;
}
