// ===========================================================================
// Unit sizes from the Duda `Sizes` collection.
//
// NATIVE collection, so every column is a string (`length: "5"`,
// `active: "true"`) and `primaryContent` is rich-text HTML with entities.
//
// Verified fields (site d0aa72e3): sizeId, name ("Storage Locker"),
// dimensions ("5 x 5"), width/height/length, sizeLabel ("Extra Small"),
// category ("extra_small"), sortOrder ("1"), active, videoId, videoUrl
// (Wistia embed), mediaType ("wistia"), thumbnailImage (EMPTY on every row so
// far), primaryContent / secondaryContent (rich text), doorWidth/doorHeight/
// ceilingHeight (empty).
//
// `category` lines up with the widget's own size bands, and `sizeLabel` matches
// the space-list Size Guide tab set exactly (Extra Small … Extra Large).
// ===========================================================================

import { readCollection, hasCollectionsApi, str, num, bool, plainText, logSource } from './dudaCollections';

export const SIZES_COLLECTION = 'Sizes';

export interface SizeItem {
  id: string;
  /** Display name, e.g. "Storage Locker". */
  name: string;
  /** Raw dimensions from the collection, e.g. "5 x 5". */
  dimensions: string;
  /** Pretty dimensions, e.g. "5’ x 5’". */
  dimensionsLabel: string;
  /** Band label, e.g. "Extra Small" — matches the Size Guide tabs. */
  sizeLabel: string;
  /** Band key, e.g. "extra_small". */
  category: string;
  /** Numeric feet from the row's own width/length columns, falling back to
   *  `dimensions`; 0 when neither parses ("Storage Locker"). */
  width: number;
  length: number;
  sortOrder: number;
  /** Wistia (or other) embed URL; '' when absent. */
  videoUrl: string;
  videoId: string;
  mediaType: string;
  /** Poster image; '' on every row seen so far — callers need a fallback. */
  thumbnail: string;
  /** Rich-text body copy, plain-texted. Currently unused by the cards. */
  content: string;
}

/**
 * A size from the API in `XxY` form → `X’ x Y’` ("5x10" → "5’ x 10’").
 * Also takes "5 x 10", "10X20", "10 × 15" and decimals ("7.5x10"). Anything
 * that is not a plain W x L — "Storage Locker", "Covered Parking", or a value
 * already formatted — is returned untouched, so it is safe on any size name.
 */
export function formatSizeDimensions(raw: string): string {
  const m = raw.match(/^\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*$/i);
  return m ? `${m[1]}’ x ${m[2]}’` : raw;
}

/**
 * Active sizes in `sortOrder`. Returns null when the collection is unavailable
 * or empty so callers keep their own demo data.
 */
export async function fetchSizes(widgetTag: string): Promise<SizeItem[] | null> {
  if (!hasCollectionsApi()) {
    logSource(widgetTag, 'sizes', false, 'no dmAPI — not in Duda');
    return null;
  }

  const rows = await readCollection(SIZES_COLLECTION);
  if (rows.length === 0) {
    logSource(widgetTag, 'sizes', false, `${SIZES_COLLECTION} empty or missing`);
    return null;
  }

  const sizes: SizeItem[] = rows
    // `active` is the collection's own on/off switch.
    .filter((r) => bool(r.active, true))
    .map((r, i) => {
      const dimensions = str(r.dimensions);
      const parsed = parseDimensions(dimensions);
      return {
        id: str(r.sizeId) || str(r.__rowId) || `size-${i}`,
        name: plainText(r.name),
        dimensions,
        dimensionsLabel: formatSizeDimensions(dimensions),
        sizeLabel: plainText(r.sizeLabel),
        category: str(r.category),
        // The columns are authoritative; `dimensions` covers rows where the
        // editor filled one but not the other.
        width: num(r.width, 0) || parsed.width,
        length: num(r.length, 0) || parsed.length,
        sortOrder: num(r.sortOrder, i),
        videoUrl: str(r.videoUrl),
        videoId: str(r.videoId),
        mediaType: str(r.mediaType),
        thumbnail: str(r.thumbnailImage),
        content: plainText(r.primaryContent),
      };
    })
    .filter((s) => s.name || s.dimensions)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (sizes.length === 0) {
    logSource(widgetTag, 'sizes', false, `${SIZES_COLLECTION} has no active rows`);
    return null;
  }

  logSource(widgetTag, 'sizes', true, `${SIZES_COLLECTION}, ${sizes.length} active of ${rows.length}`);
  return sizes;
}

/**
 * Width/length out of any "W x L" spelling — "5 x 4", "5' x 4'", "10X20",
 * "10 × 15", decimals. {0, 0} when the text is not a size ("Storage Locker").
 */
export function parseDimensions(raw: string): { width: number; length: number } {
  const m = String(raw).match(/(\d+(?:\.\d+)?)\s*['’′]?\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  return m
    ? { width: parseFloat(m[1]), length: parseFloat(m[2]) }
    : { width: 0, length: 0 };
}

/** Canonical band order — matches both the collection's `category` keys and
 *  the space list's `UnitSize`, which are the same key space by design. */
const BAND_ORDER = ['extra_small', 'small', 'medium', 'large', 'extra_large'];

/**
 * The Sizes row whose video "See what fits" should play for one unit:
 *
 *   1. the unit's own band (`category`): its exact W×L (either orientation),
 *   2. else the band's nearest row by W×L area,
 *   3. else the nearest row from the NEXT bands up, in order,
 *   4. else the nearest row anywhere (bands below — better than nothing).
 *
 * A parking space only ever matches a parking row — a 10x20 parking spot
 * playing the 10x20 storage-unit video would be confidently wrong.
 *
 * `sizes` should already be narrowed to rows that can actually play (a video
 * id the caller's player accepts). Null when nothing fits.
 */
export function pickSizeForUnit(
  sizes: SizeItem[],
  unit: { dimensions: string; band: string; parking?: boolean },
): SizeItem | null {
  if (!sizes.length) return null;
  const { width, length } = parseDimensions(unit.dimensions);
  const area = width * length;

  // Nearest by footprint; rows with no footprint rank last, ties by sortOrder.
  const nearest = (pool: SizeItem[]): SizeItem | null => {
    if (!pool.length) return null;
    const scored = pool.map((s) => {
      const sArea = s.width * s.length;
      return { s, d: sArea > 0 && area > 0 ? Math.abs(sArea - area) : Number.MAX_SAFE_INTEGER };
    });
    scored.sort((a, b) => a.d - b.d || a.s.sortOrder - b.s.sortOrder);
    return scored[0].s;
  };

  if (unit.parking) {
    const parkingRows = sizes.filter((s) => /parking/i.test(s.category) || /parking/i.test(s.sizeLabel));
    return nearest(parkingRows);
  }
  const rows = sizes.filter((s) => !/parking/i.test(s.category) && !/parking/i.test(s.sizeLabel));

  const band = unit.band.toLowerCase();
  const sameBand = rows.filter((s) => s.category.toLowerCase() === band);
  const exact = sameBand.find((s) =>
    (s.width === width && s.length === length) || (s.width === length && s.length === width));
  if (exact) return exact;
  const inBand = nearest(sameBand);
  if (inBand) return inBand;

  const from = BAND_ORDER.indexOf(band);
  for (let i = from + 1; i < BAND_ORDER.length; i++) {
    const next = nearest(rows.filter((s) => s.category.toLowerCase() === BAND_ORDER[i]));
    if (next) return next;
  }
  return nearest(rows);
}

/** Group by `sizeLabel` (the tab set), preserving sortOrder within each band. */
export function groupSizesByLabel(sizes: SizeItem[]): { label: string; category: string; items: SizeItem[] }[] {
  const bands: { label: string; category: string; items: SizeItem[] }[] = [];
  for (const s of sizes) {
    const label = s.sizeLabel || 'Other';
    let band = bands.find((b) => b.label === label);
    if (!band) {
      band = { label, category: s.category, items: [] };
      bands.push(band);
    }
    band.items.push(s);
  }
  return bands;
}
