// ===========================================================================
// Cross-widget sticky stack (mobile)
//
// The ask: #03 property-info's contact row pinned to the top of the page, and
// #05 space-list's filter bar pinning BELOW it once you scroll past it — two bars
// that live in two different widgets, i.e. two different Duda containers.
//
// Why not `position: sticky`: a sticky element only sticks while its own
// containing block is on screen, so #03's row would unstick the moment its Duda
// container scrolled away. Duda's row/column wrappers also frequently set
// `overflow: hidden` (kills sticky outright) and sometimes `transform` — which
// would even re-anchor `position: fixed` to that ancestor instead of the viewport.
//
// So: hoist the bars OUT of their containers into one `position: fixed` element
// appended to <body>, via React portals. Once they're siblings on body, nothing
// in Duda's tree can clip or re-anchor them, and stacking is just flex order —
// no hard-coded offsets to drift when a bar wraps or the promo bar is dismissed.
//
// Each widget calls useStickySlot() and portals its bar into the returned target
// while `target` is non-null. Slots sort by `order`, so which widget mounts first
// doesn't matter.
// ===========================================================================

import { useEffect, useRef, useState } from 'react';

/** Matches the `@media (max-width: 768px)` switch in PropertyInfo.css. */
export const MOBILE_STICKY_QUERY = '(max-width: 768px)';

/** Below the widgets' modals/tooltips (max-int and 2147483000), above page content. */
const STACK_Z_INDEX = '2147482000';

const STACK_ID = 'ti-sticky-stack';
const STYLE_ID = 'ti-sticky-stack-style';

export interface StickySlotOptions {
  /** Unique per widget INSTANCE (two space lists on one page must not collide). */
  id: string;
  /** Lower numbers pin above higher ones. #03 = 10, #05 = 20. */
  order: number;
  /** Usually `isMobile && !inEditor`. False → the bar stays inline, untouched. */
  enabled?: boolean;
  /** Height of the theme's own fixed header, if it has one. */
  offsetTop?: number;
  /** Extra class on the pinned wrapper, for per-widget styling. */
  className?: string;
}

interface Registration {
  order: number;
  el: HTMLElement;
  active: boolean;
}

// ── Cross-BUNDLE singleton ────────────────────────────────────────────────────
// This state cannot live in module scope. Each widget is its own webpack bundle,
// so every bundle gets its OWN copy of this module — module-level state gives one
// registry per widget, which means two #ti-sticky-stack divs both pinned at
// top: 0, overlapping instead of stacking (and heightAbove() blind to the other
// widget's bar). The registry therefore hangs off `window`, the one thing the
// bundles genuinely share — same reason @shared/promoBus coordinates over window
// events rather than imports.

interface StickyGlobal {
  el: HTMLElement | null;
  slots: Map<string, Registration>;
  listeners: Set<() => void>;
}

const GLOBAL_KEY = '__tiStickyStack';

function shared(): StickyGlobal {
  const w = window as unknown as Record<string, StickyGlobal | undefined>;
  let g = w[GLOBAL_KEY];
  if (!g) {
    g = { el: null, slots: new Map(), listeners: new Set() };
    w[GLOBAL_KEY] = g;
  }
  return g;
}

function notify() {
  shared().listeners.forEach((l) => l());
}

/** One-time stylesheet for the pinned wrappers (the module owns no CSS file). */
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${STACK_ID} { position: fixed; top: 0; left: 0; right: 0; display: flex;
  flex-direction: column; pointer-events: none; z-index: ${STACK_Z_INDEX}; }
#${STACK_ID} > .ti-sticky-slot { pointer-events: auto; background: #ffffff;
  box-shadow: 0 2px 6px rgba(71, 84, 116, 0.12);
  animation: ti-sticky-in 180ms ease-out; }
@keyframes ti-sticky-in { from { transform: translateY(-100%); } to { transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) {
  #${STACK_ID} > .ti-sticky-slot { animation: none; }
}`;
  document.head.appendChild(style);
}

function ensureStack(offsetTop: number): HTMLElement {
  ensureStyle();
  const g = shared();
  // Adopt an existing node before creating one, so a bundle that loads later
  // joins the same stack instead of starting a rival.
  if (!g.el || !g.el.isConnected) {
    g.el = document.getElementById(STACK_ID);
  }
  if (!g.el) {
    const el = document.createElement('div');
    el.id = STACK_ID;
    document.body.appendChild(el);
    g.el = el;
  }
  g.el.style.top = `${offsetTop}px`;
  return g.el;
}

function createSlot(id: string, order: number, offsetTop: number, className?: string): HTMLElement {
  const stack = ensureStack(offsetTop);
  const existing = shared().slots.get(id);
  if (existing) return existing.el;

  const el = document.createElement('div');
  el.className = `ti-sticky-slot${className ? ` ${className}` : ''}`;
  // flex `order` does the stacking, so DOM insertion order is irrelevant.
  el.style.order = String(order);
  el.style.display = 'none';
  stack.appendChild(el);
  shared().slots.set(id, { order, el, active: false });
  return el;
}

function removeSlot(id: string) {
  const g = shared();
  const reg = g.slots.get(id);
  if (!reg) return;
  reg.el.remove();
  g.slots.delete(id);
  // Last slot gone (widget unmounted / Duda wiped the subtree) — take the stack
  // with it rather than leaving an empty fixed div on the page.
  if (g.slots.size === 0 && g.el) {
    g.el.remove();
    g.el = null;
  }
  notify();
}

function setActive(id: string, active: boolean) {
  const reg = shared().slots.get(id);
  if (!reg || reg.active === active) return;
  reg.active = active;
  reg.el.style.display = active ? 'block' : 'none';
  notify();
}

/** Combined height of the pinned bars ABOVE this one — our trigger offset. */
function heightAbove(order: number): number {
  let total = 0;
  shared().slots.forEach((reg) => {
    if (reg.active && reg.order < order) total += reg.el.offsetHeight;
  });
  return total;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Viewport media query, kept in sync with the CSS breakpoints. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    // addEventListener is unsupported on Safari < 14, which still ships addListener.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);
  return matches;
}

/**
 * Pin a bar to the shared stack once the page scrolls past it.
 *
 * Render:
 *   <div ref={sentinelRef} />                 // zero-height, sits above the bar
 *   <div ref={slotRef}>                       // keeps the bar's space in the page
 *     {target ? createPortal(bar, target) : bar}
 *   </div>
 */
export function useStickySlot({
  id,
  order,
  enabled = true,
  offsetTop = 0,
  className,
}: StickySlotOptions) {
  // State-backed callback ref, NOT useRef: the sentinel often mounts later than
  // the hook (widgets render a skeleton first), and a plain ref wouldn't re-run
  // the observer effect when the real node finally appears.
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  /** Height of the bars pinned above us; moves our trigger point down. */
  const [above, setAbove] = useState(0);

  // Own a slot in the stack for as long as we're enabled.
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    createSlot(id, order, offsetTop, className);
    notify();
    return () => removeSlot(id);
  }, [enabled, id, order, offsetTop, className]);

  // Re-measure whenever any slot pins/unpins.
  useEffect(() => {
    if (!enabled) { setAbove(0); return; }
    const update = () => setAbove(heightAbove(order));
    update();
    shared().listeners.add(update);
    return () => { shared().listeners.delete(update); };
  }, [enabled, order]);

  useEffect(() => {
    if (!enabled) {
      setTarget(null);
      if (slotRef.current) slotRef.current.style.height = '';
      return;
    }
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const triggerLine = offsetTop + above;

    const io = new IntersectionObserver(
      ([entry]) => {
        // Direction matters: pin only when the sentinel has gone ABOVE the line.
        // Without this check a bar that's still below the fold also reads as
        // "not intersecting", so both bars would render pinned on page load.
        const rootTop = entry.rootBounds?.top ?? triggerLine;
        const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top <= rootTop;
        const reg = shared().slots.get(id);
        if (!reg) return;

        if (scrolledPast) {
          // Freeze the inline gap at the bar's current height BEFORE it leaves,
          // so the document doesn't shorten. If it did, the sentinel would scroll
          // back into view, unpin, lengthen the page again — a flicker loop.
          const slot = slotRef.current;
          if (slot && !slot.style.height) slot.style.height = `${slot.offsetHeight}px`;
          setActive(id, true);
          setTarget(reg.el);
        } else {
          setActive(id, false);
          setTarget(null);
          if (slotRef.current) slotRef.current.style.height = '';
        }
      },
      { rootMargin: `-${triggerLine}px 0px 0px 0px`, threshold: 0 },
    );

    io.observe(sentinel);
    return () => io.disconnect();
  }, [enabled, id, offsetTop, above, sentinel]);

  return { sentinelRef: setSentinel, slotRef, target, pinned: target !== null };
}
