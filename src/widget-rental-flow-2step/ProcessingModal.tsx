// ===========================================================================
// "We're finalizing your lease & payment" — the lightbox shown after Pay Now.
// Figma: Mariposa — Duda, node 8509-35122.
//
// The Figma frame is one still: a green bar filled to roughly 25%. Nothing in a
// static frame says how it moves, so the animation is the deliberate addition —
// it's the whole point of the screen. It advances on a timer to `onDone`.
//
// NOT REAL PROGRESS, and it doesn't pretend to be. A bar that races to 90% and
// stalls is worse than no bar; this eases toward completion over `durationMs` and
// only reaches 100% when the flow actually finishes. Once there is a real payment
// call, drive `progress` from its stages instead.
//
// Deliberately NOT dismissable — no close button, Escape ignored. A payment is in
// flight; letting someone close the overlay invites a second submission.
//
// MOBILE is not a lightbox at all (Figma 8538-21871): the same content takes the
// whole page, white, with the logo centred at the top. A card floating over a
// dimmed page is a desktop idea; on a phone there is nothing left of the page to
// see around it, so the dim reads as a rendering fault.
//
// This is also the ONLY screen in the flow rendered through a portal — see the
// note at the return.
// ===========================================================================

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import storelocalLogo from '../widget-navigation-bar/Storelocal_logo.png';

/** How long the wrap-up runs before `onDone`, once there is nothing to wait for. */
const DEFAULT_DURATION_MS = 3200;
/** Bar refresh interval — 60ms is smooth without thrashing React. */
const TICK_MS = 60;
/**
 * While `waiting`, the bar eases toward this and stops.
 *
 * It must never reach 100% with a request still in flight: a full bar that then
 * sits there is the "raced to the end and stalled" pattern the header warns
 * about, and it reads as a hang rather than as work.
 */
const WAIT_CAP_PCT = 90;
/**
 * How long the bar takes to creep to the cap. Deliberately much longer than the
 * finish, so it is still moving through a slow call rather than parked.
 */
const WAIT_DURATION_MS = 15000;
/** Once the wait ends, the run from wherever the bar is to 100%. */
const FINISH_MS = 700;

export function ProcessingModal({
  open, firstName, facilityName, durationMs = DEFAULT_DURATION_MS, onDone, note, waiting = false,
}: {
  open: boolean;
  /**
   * A request is still in flight, so do not finish.
   *
   * The modal opens the moment Pay Now is pressed rather than after the rental
   * returns — several seconds of a disabled button told the shopper nothing.
   * While this is true the bar creeps toward WAIT_CAP_PCT and `onDone` is never
   * called; when it goes false the bar completes and the flow moves on.
   */
  waiting?: boolean;
  /** Greeted by name in the heading, as the design shows ("John, we're …"). */
  firstName?: string;
  facilityName?: string;
  durationMs?: number;
  onDone?: () => void;
  /** Extra line under the copy — the demo banner on the prototype bridge. */
  note?: React.ReactNode;
}) {
  const [pct, setPct] = useState(0);
  /* Where the bar had got to when the wait ended — the finish runs from there
     rather than snapping back, which would read as the work restarting. */
  const handoffRef = useRef(0);

  useEffect(() => {
    if (!open) { setPct(0); handoffRef.current = 0; return; }

    const started = Date.now();
    /*
     * Two phases, one timer.
     *
     * WAITING: ease toward the cap over WAIT_DURATION_MS and stay there. onDone
     *   is never called, so nothing downstream fires while the request is out.
     * FINISHING: ease from wherever the bar reached to 100 over FINISH_MS, then
     *   onDone once.
     *
     * Ease-out in both, so it moves confidently at first and settles rather
     * than crawling linearly — it reads as "working", not "stuck".
     */
    const from = waiting ? 0 : handoffRef.current;
    const span = waiting ? WAIT_DURATION_MS : (from > 0 ? FINISH_MS : durationMs);
    let fired = false;

    const id = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / span);
      const eased = 1 - (1 - t) ** 2;
      if (waiting) {
        const next = eased * WAIT_CAP_PCT;
        handoffRef.current = next;
        setPct(next);
        // No onDone: the caller decides when the wait is over.
        return;
      }
      const next = from + (100 - from) * eased;
      setPct(next);
      if (t >= 1 && !fired) {
        fired = true;
        window.clearInterval(id);
        onDone?.();
      }
    }, TICK_MS);

    // Scroll lock only — no Escape handler, on purpose (see the header note).
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearInterval(id);
      document.body.style.overflow = prev;
    };
  }, [open, durationMs, onDone, waiting]);

  if (!open) return null;

  const shown = Math.round(pct);

  const greeting = firstName?.trim();

  const screen = (
    <div className="rf-overlay rf-overlay--solid rf-overlay--proc" role="presentation">
      <div className="rf-proc" role="dialog" aria-modal="true" aria-labelledby="rf-proc-title">
        {/* Mobile only, via CSS — the desktop lightbox floats over a page that
            still shows the sticky header's logo behind it. */}
        <img className="rf-proc-logo" src={storelocalLogo} alt="storelocal storage" />
        <h2 className="rf-proc-title" id="rf-proc-title">
          {greeting && <span className="rf-proc-name">{greeting}, </span>}
          we&rsquo;re finalizing your lease &amp; payment
        </h2>

        <div
          className="rf-proc-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={shown}
          aria-label="Finalizing your lease and payment"
        >
          <div className="rf-proc-bar-fill" style={{ width: `${shown}%` }} />
        </div>

        <p className="rf-proc-copy">
          Thank you for choosing {facilityName || 'Storelocal Storage'}.<br />
          Please sit tight as we wrap up your payment.
        </p>

        {note}
      </div>
    </div>
  );

  // Portalled to <body>. .rf-wrapper is `container-type: inline-size`, which
  // implies `contain: layout` and therefore makes the wrapper the containing
  // block for `position: fixed` children — so an overlay left inside it pins to
  // the WIDGET, not the viewport, and a full-page take-over would start
  // wherever the widget starts rather than at the top of the screen.
  return typeof document !== 'undefined' && document.body
    ? createPortal(screen, document.body)
    : screen;
}
