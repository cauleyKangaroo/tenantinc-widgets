// Cross-widget promo channel. The Promotions widget (#06) and the Space List
// widget (#05) are separate AMD bundles on the same Duda page, so they talk via
// a window CustomEvent plus a URL param (for deep-links / reloads).

import { MOBILE_STICKY_QUERY } from './stickyStack';

export const PROMO_EVENT = 'tenantinc:show-promo';
export const PROMO_PARAM = 'promo';

export interface PromoSelection {
  promoId: string;
  promoTitle: string;
}

/** Announce a promo selection: update the URL and fire the event for listeners. */
export function emitShowPromo(sel: PromoSelection): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(PROMO_PARAM, sel.promoId);
    window.history.replaceState(null, '', url.toString());
  } catch { /* non-browser / sandboxed — event still fires */ }
  try {
    window.dispatchEvent(new CustomEvent<PromoSelection>(PROMO_EVENT, { detail: sel }));
  } catch { /* no window */ }
}

/** The promo id currently in the URL, or null. */
export function readPromoFromUrl(): string | null {
  try { return new URLSearchParams(window.location.search).get(PROMO_PARAM); } catch { return null; }
}

/** Clear the promo from the URL (used when a filter is dismissed). */
export function clearPromoInUrl(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(PROMO_PARAM);
    window.history.replaceState(null, '', url.toString());
  } catch { /* ignore */ }
}

/** Smooth-scroll the page to the Space List widget, if present. */
export function scrollToSpaceList(): void {
  try {
    const el = document.querySelector('.sl-wrapper');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch { /* ignore */ }
}

/** Where the pinned bars (fixed or sticky) covering the top of the viewport
 *  end, in viewport px — 0 when nothing is pinned there. Walks down the stack,
 *  so two bars pinned one under the other both count. */
function pinnedCoverBottom(): number {
  let y = 1;
  for (let i = 0; i < 5; i++) {
    let el: Element | null = document.elementFromPoint(window.innerWidth / 2, y);
    let pinned: Element | null = null;
    while (el && el !== document.body && el !== document.documentElement) {
      const pos = getComputedStyle(el).position;
      if (pos === 'fixed' || pos === 'sticky') { pinned = el; break; }
      el = el.parentElement;
    }
    if (!pinned) break;
    y = pinned.getBoundingClientRect().bottom + 1;
  }
  return y - 1;
}

/** Calls `fn` once the window has stopped scrolling (a smooth scroll ending),
 *  or after a second and a half at most. */
function afterScrollSettles(fn: () => void): void {
  const started = performance.now();
  let last = -1;
  let still = 0;
  const tick = () => {
    const y = window.scrollY;
    still = y === last ? still + 1 : 0;
    last = y;
    const elapsed = performance.now() - started;
    if ((still >= 3 && elapsed > 120) || elapsed > 1500) { fn(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * "See Qualifying Units": scroll to the Space List, then — on a phone — make
 * sure its "Showing spaces with …" banner is fully in view.
 *
 * The plain scroll lands the list's top edge at the top of the window, but on
 * mobile the bars that pin there (#03's contact row, #05's filter bar) cover
 * it. They only pin once the page has scrolled past them, so their height
 * cannot be known up front: it is measured once the scroll settles, and the
 * banner eased down to sit 16px below them. Desktop has no pinned bars, so it
 * keeps the plain scroll.
 */
export function scrollToPromoResults(): void {
  scrollToSpaceList();
  if (!window.matchMedia?.(MOBILE_STICKY_QUERY).matches) return;
  afterScrollSettles(() => {
    try {
      const banner = document.querySelector('.sl-promo-banner') ?? document.querySelector('.sl-wrapper');
      if (!banner) return;
      const want = pinnedCoverBottom() + 16;
      /* The list's heading too, as desktop shows it. On a phone #05 hides its
         own title and #18 draws "Storage Units in …" (.slh-title) just above
         it, outside .sl-wrapper — so the scroll to the list left it behind.
         Bring the heading in when there is one above the banner, as long as
         the banner still fits below; otherwise the banner alone, as before. */
      const heading = document.querySelector('.slh-title');
      const b = banner.getBoundingClientRect();
      let target = b.top;
      if (heading && heading.getClientRects().length) {
        const h = heading.getBoundingClientRect();
        const bannerFits = b.bottom - (h.top - want) <= window.innerHeight;
        if (h.top < b.top && bannerFits) target = h.top;
      }
      const delta = target - want;
      if (delta < 0) window.scrollBy({ top: delta, behavior: 'smooth' });
    } catch { /* ignore */ }
  });
}

/**
 * URL hash that lands a visitor ON the Space List — `…/property-page#spaces`.
 *
 * Written by the rental flow's "Change Space" link (#99), read by the Space
 * List (#05) once its units are in. A hash rather than a query param: it never
 * reaches the server, and a page with no Space List simply ignores it.
 */
export const SPACES_HASH = 'spaces';

/** `url` with its hash replaced by the Space List's. Unparseable ⇒ unchanged. */
export function withSpacesHash(url: string): string {
  const base = url.split('#')[0];
  return base ? `${base}#${SPACES_HASH}` : url;
}

/** True when the page was opened asking for the Space List. */
export function wantsSpaceList(): boolean {
  try { return window.location.hash.replace(/^#/, '').toLowerCase() === SPACES_HASH; } catch { return false; }
}
