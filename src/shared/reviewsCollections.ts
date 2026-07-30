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
    reviewsUrl: platform === 'google' ? str(head.authorUrl && '') : str(head.businessUrl),
    reviews,
  };

  logSource(widgetTag, label, true, `${collectionName}, ${rows.length} rows, score ${source.score}`);
  return source;
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
