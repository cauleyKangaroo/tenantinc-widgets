// ===========================================================================
// A Google Business place's rating and review count, live, through the proxy.
//
//   GET {base}/api/reviews/google/fetch?placeId=…   header X-Duda-Site-Id
//     → { ok, placeId, placeName, rating: "4.6", userRatingsTotal: "396",
//         reviewsUrl, reviews: [≤5] }
//
// Verified live 2026-10-16 against both the My Account proxy and the default
// proxy host with Storage Outlet Bellflower (ChIJEUz4fajSwoARiBkHtXE1snA →
// 4.6, 396). The route needs a site id (header or `siteId` query); the proxy
// holds the Google key, so nothing secret reaches the page.
//
// WHY, when the GoogleReviews collection already carries a rating: that
// collection holds ONE business's rows, matched to cards by name, so a
// multi-property widget (#07) stamped the same site-level figure on every
// card or none at all. The place id on PropertiesInternal is per property.
//
// Promise-cached per place id for the page's life: several widgets, or one
// widget's several renders, cost one call per place. Fails soft to null on
// a missing base, a refused request, a timeout or a shape we do not read.
// ===========================================================================

import { DEFAULT_PLACES_BASE } from './placesApi';
import type { RatingSummary } from './reviewsCollections';

const TIMEOUT_MS = 6000;
/** Google place ids are opaque URL-safe tokens; validate rather than trust. */
const PLACE_ID = /^[A-Za-z0-9_-]{10,512}$/;

const cache = new Map<string, Promise<RatingSummary | null>>();

export interface PlaceRatingOptions {
  /** Proxy base. Omitted → the shared default host. */
  base?: string;
  /** Duda's data.siteId — the reviews route refuses without one. */
  siteId?: string;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

export function fetchPlaceRating(placeId: string, opts: PlaceRatingOptions = {}): Promise<RatingSummary | null> {
  const id = placeId.trim();
  if (!PLACE_ID.test(id)) return Promise.resolve(null);
  const base = (opts.base || DEFAULT_PLACES_BASE).replace(/\/$/, '');
  const siteId = (opts.siteId ?? '').trim();
  const key = `${base}|${siteId}|${id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = (async (): Promise<RatingSummary | null> => {
    const params = new URLSearchParams({ placeId: id });
    if (siteId) params.set('siteId', siteId);
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${base}/api/reviews/google/fetch?${params}`, {
        headers: siteId ? { 'X-Duda-Site-Id': siteId } : undefined,
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      const d = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!d || d.ok === false) return null;
      const score = parseFloat(str(d.rating));
      const count = parseInt(str(d.userRatingsTotal), 10);
      if (!Number.isFinite(score)) return null;
      return {
        name: str(d.placeName),
        score,
        count: Number.isFinite(count) ? count : 0,
        reviewsUrl: str(d.reviewsUrl),
      };
    } catch {
      return null;
    } finally {
      window.clearTimeout(t);
    }
  })();
  cache.set(key, p);
  return p;
}

/** Tests and the harness only. */
export function clearPlaceRatingCache(): void {
  cache.clear();
}
