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

/** "5 x 5" → "5’ x 5’"; anything unexpected passes through untouched. */
function prettyDimensions(raw: string): string {
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
      return {
        id: str(r.sizeId) || str(r.__rowId) || `size-${i}`,
        name: plainText(r.name),
        dimensions,
        dimensionsLabel: prettyDimensions(dimensions),
        sizeLabel: plainText(r.sizeLabel),
        category: str(r.category),
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
