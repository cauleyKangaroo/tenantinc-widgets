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
// ===========================================================================

import React, { useEffect, useState } from 'react';

/** How long the simulated wrap-up runs before `onDone`. */
const DEFAULT_DURATION_MS = 3200;
/** Bar refresh interval — 60ms is smooth without thrashing React. */
const TICK_MS = 60;

export function ProcessingModal({
  open, firstName, facilityName, durationMs = DEFAULT_DURATION_MS, onDone,
}: {
  open: boolean;
  /** Greeted by name in the heading, as the design shows ("John, we're …"). */
  firstName?: string;
  facilityName?: string;
  durationMs?: number;
  onDone?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!open) { setElapsed(0); return; }

    const started = Date.now();
    const id = window.setInterval(() => {
      const next = Date.now() - started;
      setElapsed(next);
      if (next >= durationMs) {
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
  }, [open, durationMs, onDone]);

  if (!open) return null;

  // Ease-out so it moves confidently at first and settles, rather than crawling
  // linearly — reads as "working" instead of "stuck".
  const t = Math.min(1, elapsed / durationMs);
  const pct = Math.round((1 - (1 - t) ** 2) * 100);

  const greeting = firstName?.trim();

  return (
    <div className="rf-overlay rf-overlay--solid" role="presentation">
      <div className="rf-proc" role="dialog" aria-modal="true" aria-labelledby="rf-proc-title">
        <h2 className="rf-proc-title" id="rf-proc-title">
          {greeting && <span className="rf-proc-name">{greeting}, </span>}
          we&rsquo;re finalizing your lease &amp; payment
        </h2>

        <div
          className="rf-proc-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Finalizing your lease and payment"
        >
          <div className="rf-proc-bar-fill" style={{ width: `${pct}%` }} />
        </div>

        <p className="rf-proc-copy">
          Thank you for choosing {facilityName || 'Storelocal Storage'}.<br />
          Please sit tight as we wrap up your payment.
        </p>
      </div>
    </div>
  );
}
