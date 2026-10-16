// ===========================================================================
// A property's reviews, LIVE, through the proxy — Google and Yelp.
//
//   GET {base}/api/reviews/google/fetch?placeId=…      header X-Duda-Site-Id
//     → { placeName, rating, userRatingsTotal, reviewsUrl,
//         reviews: [{ author_name, author_url, profile_photo_url, rating,
//                     text, time (unix s), relative_time_description }] }   ≤5
//   GET {base}/api/reviews/yelp/fetch?businessId=…     header X-Duda-Site-Id
//     → { businessName, businessRating, reviewCount, reviewsUrl,
//         reviews: [{ id, url, text, rating, time_created,
//                     user: { name, image_url, profile_url } }] }         ≤3
//
// Verified live 2026-10-16 (Bellflower: Google 4.6/396 with 5 reviews, Yelp
// alias storage-outlet-bellflower with 3 reviews and 116 in total).
//
// Both ids live on PropertiesInternal — `placeId` and `yelpPlaceId` — so a
// reviews widget given a property id shows THAT property's reviews, where
// the GoogleReviews / YelpReviews collections hold one business for the
// whole site. The collections stay as the fallback for a property with no
// ids (and in the editor and harness, where the collection is unreadable
// too, the demo copy stays).
//
// CAVEATS, as the proxy hands them over:
//   - Google returns at most five reviews, Yelp at most three.
//   - Yelp's `businessRating` is the AVERAGE OF THOSE THREE, not Yelp's own
//     business rating (the proxy's details call has it as `rating` but does
//     not surface it) — so it tends to read high. `reviewCount` IS the real
//     total.
//
// Promise-cached per id for the page's life; fails soft to null.
// ===========================================================================

import { DEFAULT_PLACES_BASE } from './placesApi';
import { relativeFrom, type ReviewItem, type ReviewSourceData } from './reviewsCollections';

const TIMEOUT_MS = 8000;
const ID_SHAPE = /^[A-Za-z0-9_-]{3,512}$/;

export interface LiveReviewsOptions {
  /** Proxy base. Omitted → the shared default host. */
  base?: string;
  /** Duda's data.siteId — the reviews routes refuse without one. */
  siteId?: string;
}

type Dict = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const num = (v: unknown): number => { const n = typeof v === 'number' ? v : parseFloat(str(v)); return Number.isFinite(n) ? n : 0; };

const cache = new Map<string, Promise<ReviewSourceData | null>>();

async function getJson(path: string, params: Record<string, string>, opts: LiveReviewsOptions): Promise<Dict | null> {
  const base = (opts.base || DEFAULT_PLACES_BASE).replace(/\/$/, '');
  const siteId = (opts.siteId ?? '').trim();
  const q = new URLSearchParams(params);
  if (siteId) q.set('siteId', siteId);
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}?${q}`, {
      headers: siteId ? { 'X-Duda-Site-Id': siteId } : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const d = (await res.json().catch(() => null)) as Dict | null;
    return d && d.ok !== false ? d : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(t);
  }
}

function cached(key: string, make: () => Promise<ReviewSourceData | null>): Promise<ReviewSourceData | null> {
  const hit = cache.get(key);
  if (hit) return hit;
  const p = make();
  cache.set(key, p);
  return p;
}

/** Google: the place's rating, total and its (≤5) most relevant reviews. */
export function fetchGoogleReviewsLive(placeId: string, opts: LiveReviewsOptions = {}): Promise<ReviewSourceData | null> {
  const id = placeId.trim();
  if (!ID_SHAPE.test(id)) return Promise.resolve(null);
  return cached(`g|${opts.base ?? ''}|${opts.siteId ?? ''}|${id}`, async () => {
    const d = await getJson('/api/reviews/google/fetch', { placeId: id }, opts);
    if (!d) return null;
    const score = num(d.rating);
    if (!score) return null;
    const reviews: ReviewItem[] = ((Array.isArray(d.reviews) ? d.reviews : []) as Dict[]).map((r, i) => {
      const ts = num(r.time) * 1000;
      return {
        id: `g-${id}-${ts || i}`,
        author: str(r.author_name),
        rating: num(r.rating),
        text: str(r.text),
        timeAgo: str(r.relative_time_description) || relativeFrom(ts ? new Date(ts) : null),
        avatar: str(r.profile_photo_url),
        url: str(r.author_url),
        timestamp: ts,
      };
    }).filter((r) => r.text || r.rating);
    return { platform: 'google', name: str(d.placeName), score, count: Math.round(num(d.userRatingsTotal)), reviewsUrl: str(d.reviewsUrl), reviews };
  });
}

/** Yelp: the business's review count, the (≤3) featured reviews, and their average. */
export function fetchYelpReviewsLive(businessId: string, opts: LiveReviewsOptions = {}): Promise<ReviewSourceData | null> {
  const id = businessId.trim();
  if (!ID_SHAPE.test(id)) return Promise.resolve(null);
  return cached(`y|${opts.base ?? ''}|${opts.siteId ?? ''}|${id}`, async () => {
    const d = await getJson('/api/reviews/yelp/fetch', { businessId: id }, opts);
    if (!d) return null;
    const reviews: ReviewItem[] = ((Array.isArray(d.reviews) ? d.reviews : []) as Dict[]).map((r, i) => {
      const user = (r.user && typeof r.user === 'object' ? r.user : {}) as Dict;
      const when = str(r.time_created) ? new Date(str(r.time_created)) : null;
      const ts = when && !Number.isNaN(when.getTime()) ? when.getTime() : 0;
      return {
        id: str(r.id) || `y-${id}-${i}`,
        author: str(user.name),
        rating: num(r.rating),
        text: str(r.text),
        timeAgo: relativeFrom(ts ? new Date(ts) : null),
        avatar: str(user.image_url),
        url: str(r.url),
        timestamp: ts,
      };
    }).filter((r) => r.text || r.rating);
    const score = num(d.businessRating);
    if (!score && !reviews.length) return null;
    return { platform: 'yelp', name: str(d.businessName), score, count: Math.round(num(d.reviewCount)), reviewsUrl: str(d.reviewsUrl), reviews };
  });
}

/** Tests and the harness only. */
export function clearLiveReviewsCache(): void {
  cache.clear();
}
