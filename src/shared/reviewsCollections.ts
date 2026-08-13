// ===========================================================================
// Reviews from the Duda `GoogleReviews` / `YelpReviews` collections.
//
// Both are NATIVE collections, so every column arrives as a string and text can
// be rich-text wrapped — hence num()/plainText() throughout.
//
// Source-level values (business average, total ratings, business name/url) are
// DENORMALISED onto every row, so they're read off the first row rather than
// aggregated. Per-row values are the individual review.
//
// Field notes, verified against the live collections (site d0aa72e3):
//   GoogleReviews  rating "4.8" = business average   userRatingsTotal "518" = total
//                  reviewRating "5" = this review    relativeTime "2 months ago" (free)
//                  profilePhotoUrl, authorName, reviewText, reviewDate, placeName
//   YelpReviews    businessRating "3.7" = business average   businessUrl = reviews page
//                  reviewRating "5" = this review    userName, userImageUrl, reviewText
//                  NO relativeTime — it's computed from reviewDate here.
//                  Count is ambiguous: `reviewCount` looks like the *reviewer's* own
//                  Yelp review count, while `ratedReviews` tracks the business, so
//                  ratedReviews wins with the row count as a last resort.
// ===========================================================================

import { readCollection, hasCollectionsApi, str, num, plainText, logSource } from './dudaCollections';

export type ReviewPlatform = 'google' | 'yelp';

export interface ReviewItem {
  id: string;
  author: string;
  /** Stars for this individual review (1–5). */
  rating: number;
  text: string;
  /** "2 months ago" — given by Google, computed for Yelp. */
  timeAgo: string;
  /** Reviewer avatar URL, '' when absent. */
  avatar: string;
  /** Sort key: ms since epoch, 0 when the row has no usable date. */
  timestamp: number;
}

export interface ReviewSourceData {
  platform: ReviewPlatform;
  /** Business name from the collection, e.g. "Storage Outlet". */
  name: string;
  /** Business average, e.g. 4.8. */
  score: number;
  /** Total ratings for the business. */
  count: number;
  /** Link to the platform's reviews page; '' when the collection has none. */
  reviewsUrl: string;
  reviews: ReviewItem[];
}

export const GOOGLE_COLLECTION = 'GoogleReviews';
export const YELP_COLLECTION = 'YelpReviews';

const MS_DAY = 86400000;

/** "2 months ago" from a date — Yelp gives no relativeTime of its own. */
function relativeFrom(d: Date | null): string {
  if (!d) return '';
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / MS_DAY));
  if (days < 1) return 'today';
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/** Dates arrive as "2026-05-20T01:32:13+00:00"; guard anything unparseable. */
function toDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Read one platform's reviews. Returns null when the collection is unavailable
 * or empty, so the caller keeps its own fallback data.
 */
export async function fetchReviewSource(
  platform: ReviewPlatform,
  widgetTag: string,
): Promise<ReviewSourceData | null> {
  const collectionName = platform === 'google' ? GOOGLE_COLLECTION : YELP_COLLECTION;
  const label = `${platform} reviews`;

  if (!hasCollectionsApi()) {
    logSource(widgetTag, label, false, 'no dmAPI — not in Duda');
    return null;
  }

  const rows = await readCollection(collectionName);
  if (rows.length === 0) {
    logSource(widgetTag, label, false, `${collectionName} empty or missing`);
    return null;
  }

  const head = rows[0];

  const reviews: ReviewItem[] = rows
    .map((r, i) => {
      const when = toDate(r.reviewDate) ?? toDate(r.timeCreated);
      const given = str(r.relativeTime); // Google only
      return {
        id: str(r.reviewKey) || str(r.reviewId) || `${platform}-${i}`,
        author: plainText(platform === 'google' ? r.authorName : r.userName),
        rating: num(r.reviewRating, num(r.rating, 0)),
        text: plainText(r.reviewText),
        timeAgo: given || relativeFrom(when),
        avatar: str(platform === 'google' ? r.profilePhotoUrl : r.userImageUrl),
        timestamp: when ? when.getTime() : 0,
      };
    })
    .filter((r) => r.text || r.author)
    .sort((a, b) => b.timestamp - a.timestamp);

  const source: ReviewSourceData = {
    platform,
    name: plainText(platform === 'google' ? head.placeName : head.businessName)
      || (platform === 'google' ? 'Google' : 'Yelp'),
    score: platform === 'google' ? num(head.rating) : num(head.businessRating),
    // Google states the total outright; Yelp only tracks it on `ratedReviews`.
    count: platform === 'google'
      ? num(head.userRatingsTotal, reviews.length)
      : num(head.ratedReviews, reviews.length),
    // Both collections now carry an explicit `reviewsUrl` — the destination for
    // the whole score block. Yelp's older `businessUrl` stays as a fallback;
    // Google never had one, so an empty value there just means "don't link".
    reviewsUrl: str(head.reviewsUrl) || str(head.businessUrl),
    reviews,
  };

  logSource(widgetTag, label, true, `${collectionName}, ${rows.length} rows, score ${source.score}`);
  return source;
}

/** A business-level rating, without the individual reviews. */
export interface RatingSummary {
  /** Business/place name the rating belongs to, as the collection spells it. */
  name: string;
  score: number;
  count: number;
  reviewsUrl: string;
}

/** Lowercase alphanumerics only, so "Storage Outlet - Bakersfield1" and
 *  "Storage Outlet Bakersfield 1" reduce to the same key. */
function nameKey(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Google ratings grouped by PLACE, for a widget showing several properties at
 * once (#08's city page).
 *
 * `fetchReviewSource` above answers "what is this site's rating" by reading
 * row 0 — right for #03, which renders one property, but it would stamp the
 * same score on every card of a multi-property city page.
 *
 * So this groups the rows by `placeName` instead. Two shapes both work:
 *   - one business (the common case) → a single entry, and `overall` is it
 *   - one row-set per facility        → an entry each, matched by name
 *
 * `overall` is the row-0 figure, kept as the fallback for a property with no
 * matching place — better a site-level rating than none, and it's exactly what
 * #03 would have shown.
 *
 * Fails soft to empty (no dmAPI in the editor/harness, collection missing).
 */
export async function fetchGoogleRatingsByPlace(widgetTag: string): Promise<{
  byPlace: Map<string, RatingSummary>;
  overall: RatingSummary | null;
}> {
  const empty = { byPlace: new Map<string, RatingSummary>(), overall: null };
  if (!hasCollectionsApi()) {
    logSource(widgetTag, 'google ratings', false, 'no dmAPI — not in Duda');
    return empty;
  }

  const rows = await readCollection(GOOGLE_COLLECTION);
  if (rows.length === 0) {
    logSource(widgetTag, 'google ratings', false, `${GOOGLE_COLLECTION} empty or missing`);
    return empty;
  }

  const byPlace = new Map<string, RatingSummary>();
  for (const r of rows) {
    const name = plainText(r.placeName);
    if (!name) continue;
    const key = nameKey(name);
    // First row per place wins; later rows are that place's other reviews and
    // repeat the same business-level score.
    if (byPlace.has(key)) continue;
    const score = num(r.rating);
    if (!(score > 0)) continue;
    byPlace.set(key, {
      name,
      score,
      count: num(r.userRatingsTotal),
      reviewsUrl: str(r.reviewsUrl),
    });
  }

  const head = rows[0];
  const headScore = num(head.rating);
  const overall: RatingSummary | null = headScore > 0
    ? {
      name: plainText(head.placeName) || 'Google',
      score: headScore,
      count: num(head.userRatingsTotal, rows.length),
      reviewsUrl: str(head.reviewsUrl),
    }
    : null;

  logSource(
    widgetTag, 'google ratings', true,
    `${GOOGLE_COLLECTION}, ${rows.length} rows, ${byPlace.size} place(s)`,
  );
  return { byPlace, overall };
}

/**
 * The rating for one property, by name.
 *
 * Exact key match first, then a containment match either way — the collection's
 * `placeName` is whatever Google calls the business ("Storage Outlet Bakersfield")
 * while the API's property name is whatever the operator typed ("Storage Outlet -
 * Bakersfield1"), and the two rarely agree character for character. Falls back to
 * the site-wide figure, then null.
 */
export function ratingForProperty(
  propertyName: string,
  ratings: { byPlace: Map<string, RatingSummary>; overall: RatingSummary | null },
): RatingSummary | null {
  const key = nameKey(propertyName);
  if (!key) return ratings.overall;

  const exact = ratings.byPlace.get(key);
  if (exact) return exact;

  // Only worth attempting when there are several places to tell apart; with one
  // business the overall figure IS that business, and a loose match could only
  // ever agree with it.
  if (ratings.byPlace.size > 1) {
    for (const [k, v] of ratings.byPlace) {
      if (k.includes(key) || key.includes(k)) return v;
    }
  }
  return ratings.overall;
}

/** Both platforms at once; each is independent, so one failing doesn't hide the other. */
export async function fetchAllReviewSources(widgetTag: string): Promise<{
  google: ReviewSourceData | null;
  yelp: ReviewSourceData | null;
}> {
  const [google, yelp] = await Promise.all([
    fetchReviewSource('google', widgetTag),
    fetchReviewSource('yelp', widgetTag),
  ]);
  return { google, yelp };
}
