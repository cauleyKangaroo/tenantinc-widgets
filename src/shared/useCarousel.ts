// ===========================================================================
// Sliding carousel — index state, drag-to-follow, and a windowed dot count.
//
// Replaces the slice-and-swap pattern every carousel in this repo used to share
// (`items.slice(page * per, …)` re-rendered into a static grid). That was an
// instant cut with nothing to animate: the cards never moved, they were simply
// replaced. Here the whole strip is rendered once and a single transform moves
// it, so the browser has something real to tween.
//
// Three things this owns, because each one was reimplemented (or missing) per
// widget:
//
//  • Step-by-one paging with clamped bounds, so arrows can be `disabled` at the
//    ends rather than silently doing nothing.
//  • Drag that FOLLOWS the finger and snaps on release. @shared/useSwipe only
//    classifies a finished gesture, so mid-drag there was no movement at all —
//    the card jumped after the fact. Both still exist: useSwipe is right for
//    things that only need "which way did they flick" (a lightbox).
//  • A dot WINDOW. 20 posts must not mean 20 dots.
//
// The hook is transport-agnostic: it returns an offset in *percent of one step*,
// so the consumer decides how wide a step is (a third of the row on desktop, the
// full width on mobile) without this file knowing anything about layout.
// ===========================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Most dots on screen at once; the window slides past this many items. */
export const MAX_DOTS = 6;

/** Minimum horizontal travel before a drag counts as a drag and not a tap. */
const DRAG_MIN_PX = 8;

/** Fraction of a step that must be dragged to advance on release. */
const SNAP_RATIO = 0.25;

/** Smooth mode: finger speed (px/ms) over the last moments that counts as a
 *  flick and advances, however short the drag. */
const FLICK_PX_PER_MS = 0.3;
/** Smooth mode: how far back (ms) the release speed is measured over. */
const FLICK_WINDOW_MS = 100;
/** Smooth mode: the CSS custom property the drag offset is written to. */
export const CAROUSEL_DRAG_VAR = '--carousel-drag';

export interface UseCarouselOptions {
  /** Total items in the strip. */
  count: number;
  /** How many are visible at once (3 on the desktop grid, 1 on mobile). */
  perView?: number;
  /** Enable finger-follow dragging. Off for pointer-only desktop rails. */
  draggable?: boolean;
  /**
   * OPT-IN smooth drag. With the moving track's element here, the hook writes
   * the drag offset straight onto it as `--carousel-drag` (in steps) instead of
   * setting state on every touchmove — so a swipe no longer re-renders the
   * whole widget dozens of times a second, which is what made a heavy carousel
   * stutter on a phone. React renders only when a drag starts and ends. A quick
   * flick also advances even when shorter than SNAP_RATIO.
   *
   * The consumer adds the variable into its transform:
   *   translateX(calc((offsetPct/100 + var(--carousel-drag, 0)) * <step>))
   * Without it, behaviour is exactly as before (state-driven drag).
   */
  trackRef?: React.RefObject<HTMLElement | null>;
}

export interface CarouselApi {
  /** Current index — the first visible item. Always within bounds. */
  index: number;
  /** Highest reachable index, i.e. `count - perView` floored at 0. */
  maxIndex: number;
  /** Jump to an index (dot click). Clamped. */
  goTo: (i: number) => void;
  next: () => void;
  prev: () => void;
  canPrev: boolean;
  canNext: boolean;
  /**
   * How far the strip is currently pushed, in percent of ONE STEP. Combine with
   * the step width the consumer owns:
   *   `transform: translateX(calc(${offsetPct}% / perView))` for a flex track
   *   whose children are `100 / perView` percent wide.
   */
  offsetPct: number;
  /** True while a finger is down and moving — suppress the CSS transition. */
  dragging: boolean;
  /** Spread onto the moving track. Empty object when `draggable` is false. */
  handlers: React.HTMLAttributes<HTMLElement>;
  /**
   * True for the click that ends a drag. A drag finishes with a click on the
   * card underneath it, which would otherwise navigate to that blog post.
   */
  didDrag: React.MutableRefObject<boolean>;
  /** Wrap a click handler so it no-ops on the click that ends a drag. */
  ignoreAfterDrag: (fn: () => void) => () => void;
}

export function useCarousel({ count, perView = 1, draggable = false, trackRef }: UseCarouselOptions): CarouselApi {
  const [index, setIndex] = useState(0);
  const [dragPct, setDragPct] = useState(0);
  const [dragging, setDragging] = useState(false);

  const maxIndex = Math.max(0, count - perView);

  // Clamp on render rather than correcting in an effect: a collection that
  // shrinks between reads must never leave us parked past the end for a frame.
  const safeIndex = Math.min(index, maxIndex);

  const goTo = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(maxIndex, i)));
  }, [maxIndex]);

  const next = useCallback(() => goTo(safeIndex + 1), [goTo, safeIndex]);
  const prev = useCallback(() => goTo(safeIndex - 1), [goTo, safeIndex]);

  // ── Drag ────────────────────────────────────────────────────────────────
  // Tracked in refs, not state: these update on every touchmove and none of
  // them should cost a render on their own. Only `dragPct` does.
  const start = useRef<{ x: number; y: number } | null>(null);
  const stepPx = useRef(1);
  /** null until the axis is decided; then true = horizontal (we own the drag). */
  const axis = useRef<boolean | null>(null);
  const didDrag = useRef(false);
  /** Smooth mode only: the live drag offset (in steps), and recent finger
   *  positions for the release speed. Refs — they change every touchmove. */
  const dragSteps = useRef(0);
  const samples = useRef<Array<{ x: number; t: number }>>([]);

  /** Smooth mode: write the offset to the track, no render. */
  const writeDrag = useCallback((steps: number) => {
    dragSteps.current = steps;
    const el = trackRef?.current;
    if (!el) return;
    if (steps === 0) el.style.removeProperty(CAROUSEL_DRAG_VAR);
    else el.style.setProperty(CAROUSEL_DRAG_VAR, steps.toFixed(4));
  }, [trackRef]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    axis.current = null;
    didDrag.current = false;
    samples.current = [{ x: t.clientX, t: e.timeStamp }];
    // Measure the step from the live element — the consumer's CSS owns the
    // width, so reading it here keeps this file out of the layout business.
    const el = e.currentTarget as HTMLElement;
    stepPx.current = Math.max(1, el.getBoundingClientRect().width / perView);
  }, [perView]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const from = start.current;
    if (!from) return;
    const t = e.touches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;

    // Decide the axis ONCE, on the first move that clears the tap threshold.
    // Re-deciding mid-gesture makes a diagonal drag flicker between scrolling
    // the page and moving the carousel.
    if (axis.current === null) {
      if (Math.abs(dx) < DRAG_MIN_PX && Math.abs(dy) < DRAG_MIN_PX) return;
      axis.current = Math.abs(dx) > Math.abs(dy);
    }
    // A vertical drag is the user scrolling the page. Leave it entirely alone.
    if (!axis.current) return;

    didDrag.current = true;
    if (!dragging) setDragging(true);

    let moved = dx / stepPx.current;
    // Rubber-band past the ends instead of stopping dead: a strip that refuses
    // to move reads as broken, one that resists reads as "nothing that way".
    if ((safeIndex === 0 && moved > 0) || (safeIndex === maxIndex && moved < 0)) {
      moved *= 0.35;
    }
    if (trackRef) {
      writeDrag(moved);
      // Keep only the last FLICK_WINDOW_MS of positions for the release speed.
      const s = samples.current;
      s.push({ x: t.clientX, t: e.timeStamp });
      while (s.length > 2 && e.timeStamp - s[0].t > FLICK_WINDOW_MS) s.shift();
    } else {
      setDragPct(moved * 100);
    }
  }, [dragging, maxIndex, safeIndex, trackRef, writeDrag]);

  const onTouchEnd = useCallback(() => {
    start.current = null;
    const moved = trackRef ? dragSteps.current : dragPct / 100;
    // Smooth mode: clear the offset in the same tick as the index change below,
    // so the CSS transition runs from where the finger left the strip.
    if (trackRef) writeDrag(0);
    else setDragPct(0);
    setDragging(false);
    if (axis.current !== true) return;
    // A flick: fast enough at release, in the direction it was dragged.
    let flick = 0;
    if (trackRef) {
      const s = samples.current;
      const a = s[0];
      const b = s[s.length - 1];
      const dt = b && a ? b.t - a.t : 0;
      const v = dt > 0 ? (b.x - a.x) / dt : 0;
      if (Math.abs(v) >= FLICK_PX_PER_MS && Math.sign(v) === Math.sign(moved) && moved !== 0) {
        flick = v < 0 ? 1 : -1;
      }
    }
    // One step per gesture, however far they flung it — the arrows move by one
    // and the swipe must agree, or the dots mean two different things.
    if (moved <= -SNAP_RATIO || flick === 1) goTo(safeIndex + 1);
    else if (moved >= SNAP_RATIO || flick === -1) goTo(safeIndex - 1);
  }, [dragPct, goTo, safeIndex, trackRef, writeDrag]);

  const ignoreAfterDrag = useCallback((fn: () => void) => () => {
    if (didDrag.current) { didDrag.current = false; return; }
    fn();
  }, []);

  const handlers = useMemo(
    () => (draggable
      // Smooth mode also ends on touchcancel (a call, a system gesture), so the
      // offset written to the track can never be left behind.
      ? { onTouchStart, onTouchMove, onTouchEnd, ...(trackRef ? { onTouchCancel: onTouchEnd } : {}) }
      : {}),
    [draggable, onTouchStart, onTouchMove, onTouchEnd, trackRef],
  );

  return {
    index: safeIndex,
    maxIndex,
    goTo,
    next,
    prev,
    canPrev: safeIndex > 0,
    canNext: safeIndex < maxIndex,
    offsetPct: -safeIndex * 100 + dragPct,
    dragging,
    handlers,
    didDrag,
    ignoreAfterDrag,
  };
}

/**
 * Which dots to render when there are more positions than `max`.
 *
 * Returns the visible slice plus flags for whether it is clipped at either end,
 * so a consumer can shrink the edge dots and imply "there's more this way".
 * The window only moves once the active dot reaches its edge — a window that
 * re-centres on every step makes the dots slide while the cards do too, and the
 * reader loses track of which thing is moving.
 */
export function dotWindow(total: number, active: number, max: number = MAX_DOTS) {
  if (total <= max) return { start: 0, end: total, clippedStart: false, clippedEnd: false };

  // Keep one dot of lookahead on each side where possible, so the active dot is
  // never flush against the edge unless it truly is the first/last item.
  const half = Math.floor((max - 1) / 2);
  let start = active - half;
  if (start < 0) start = 0;
  if (start > total - max) start = total - max;

  return {
    start,
    end: start + max,
    clippedStart: start > 0,
    clippedEnd: start + max < total,
  };
}

/** True when the visitor has asked for less motion — skip the slide entirely. */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return reduce;
}
