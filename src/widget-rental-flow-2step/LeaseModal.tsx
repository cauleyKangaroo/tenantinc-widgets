// ===========================================================================
// "Rental Agreement" — the step-2 "View Document" lightbox. Figma 8507-23558.
//
// Same overlay shell as ProtectionPlanModal (Escape, click-outside, scroll
// lock), so the two lightboxes in this widget behave identically.
//
// The agree checkbox in the footer is the PAGE's checkbox, not a copy: it reads
// and writes the same `agree` state Step 2 validates on submit. Ticking it here
// therefore ticks it behind the modal, which is the point of putting it in the
// footer — someone who has just read the document can accept it without hunting
// for the control again.
// ===========================================================================

import React, { useEffect, useState } from 'react';
import { CloseIcon } from './icons';
import { RfCheckbox } from './RfCheckbox';

/** Zoom limits for the document viewport. 1 = as rendered on the page. */
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.2;

export function LeaseModal({
  open, onClose, agree, onAgreeChange, children,
}: {
  open: boolean;
  onClose: () => void;
  /** The page's agreement state — shared, not duplicated. */
  agree: boolean;
  onAgreeChange: (v: boolean) => void;
  /** The document itself, passed in so the page and this modal render the
   *  SAME body rather than two copies that could drift apart. */
  children: React.ReactNode;
}) {
  const [zoom, setZoom] = useState(1);

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

  // Reopening starts at 100% rather than resuming someone's last zoom, which
  // would be a surprising state to land in.
  useEffect(() => { if (open) setZoom(1); }, [open]);

  if (!open) return null;

  const clamp = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(z.toFixed(2))));

  return (
    <div className="rf-overlay rf-overlay--sheet" onClick={onClose} role="presentation">
      <div
        className="rf2-lease"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rf2-lease-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rf2-lease-head">
          <p className="rf2-lease-title" id="rf2-lease-title">
            Rental Agreement <span className="rf-req">*</span>
          </p>
          <button type="button" className="rf2-lease-close" onClick={onClose} aria-label="Close">
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="rf2-lease-view">
          {/* transform-origin top-center so zooming grows the page downward from
              its top edge instead of drifting out of the viewport. */}
          <div className="rf2-lease-doc" style={{ transform: `scale(${zoom})` }}>
            {children}
          </div>
        </div>

        {/* Floating zoom pill (bottom-left in the frame). */}
        <div className="rf2-lease-zoom">
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z + ZOOM_STEP))}
            disabled={zoom >= ZOOM_MAX}
            aria-label="Zoom in"
          >+</button>
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z - ZOOM_STEP))}
            disabled={zoom <= ZOOM_MIN}
            aria-label="Zoom out"
          >−</button>
        </div>

        <div className="rf2-lease-foot">
          <RfCheckbox checked={agree} onChange={onAgreeChange}>
            <span className="rf2-agree-text">
              <b>I agree</b> to the terms and conditions as set out by the rental agreement.
            </span>
          </RfCheckbox>
        </div>
      </div>
    </div>
  );
}
