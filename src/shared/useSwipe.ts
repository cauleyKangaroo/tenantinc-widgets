// ===========================================================================
// Horizontal swipe gesture, for touch-only affordances.
//
// Several places need "swipe to advance" on mobile because their arrows are
// hidden at phone widths (#03's lightbox, #06's promotions carousel), and each
// one has the same two subtleties:
//
//  • Direction intent — a mostly-vertical drag is the user scrolling the page,
//    not changing slide, so it must be ignored.
//  • Tap vs swipe — a swipe ends in a click event too. Anything that also closes
//    or navigates on click has to know the gesture was a swipe and skip it,
//    which is what the returned `didSwipe` ref is for.
// ===========================================================================

import { useRef } from 'react';

export interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum horizontal travel to count. 40px ignores sloppy taps. */
  minPx?: number;
}

export function useSwipe({ onSwipeLeft, onSwipeRight, minPx = 40 }: UseSwipeOptions) {
  const start = useRef<{ x: number; y: number } | null>(null);
  /** True for the click that follows a swipe — check it before acting on click. */
  const didSwipe = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    didSwipe.current = false;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const from = start.current;
    start.current = null;
    if (!from) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    if (Math.abs(dx) < minPx || Math.abs(dx) <= Math.abs(dy)) return;
    didSwipe.current = true;
    if (dx < 0) onSwipeLeft?.();
    else onSwipeRight?.();
  }

  /** Wrap a click handler so it no-ops on the click that ends a swipe. */
  function ignoreAfterSwipe(fn: () => void) {
    return () => {
      if (didSwipe.current) { didSwipe.current = false; return; }
      fn();
    };
  }

  return { handlers: { onTouchStart, onTouchEnd }, didSwipe, ignoreAfterSwipe };
}
