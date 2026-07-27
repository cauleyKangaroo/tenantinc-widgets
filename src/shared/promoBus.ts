// Cross-widget promo channel. The Promotions widget (#06) and the Space List
// widget (#05) are separate AMD bundles on the same Duda page, so they talk via
// a window CustomEvent plus a URL param (for deep-links / reloads).

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
