// ===========================================================================
// Gallery photos for a property, from the `PropertiesInternal` collection.
//
// SEPARATE FROM `Properties` ON PURPOSE. The keyed REST API declares an
// `Images` field but never populated it, so #03's gallery has always fallen
// back to gradient placeholders. The photos live in a second, internal
// collection instead, keyed by the same property id.
//
// Read-only, fails soft to [] everywhere: no dmAPI (the Duda editor and the dev
// harness), collection missing, row missing, column empty. The gallery keeps
// its placeholders in every one of those cases rather than rendering blank.
// ===========================================================================

import { readCollection, str, imageUrl } from './dudaCollections';

/** Collection holding the gallery photos. Name is the lookup key, and it is
 *  case-sensitive — see readCollection. */
export const PROPERTY_IMAGES_COLLECTION = 'PropertiesInternal';

/** Column holding them. Duda's UI labels it "images". */
const IMAGES_FIELD = 'images';

/**
 * Coerce whatever the column hands back into a list of URLs.
 *
 * The shape depends on how the collection was built and cannot be assumed:
 *
 *  - EXTERNAL collection  → a real array, of strings or of `{url}`-ish objects
 *  - NATIVE collection    → one string; either JSON, or several URLs separated
 *                           by newlines/commas/pipes, possibly wrapped in
 *                           `<p class="rteBlock">` by the WYSIWYG
 *  - a single image column → one string or one object
 *
 * Accepting all of them costs a few lines and removes an entire category of
 * "works on my site, blank on theirs". Order is preserved — the first image is
 * the hero — and blanks and duplicates are dropped.
 */
export function toImageList(value: unknown): string[] {
  const out: string[] = [];

  const push = (v: unknown) => {
    const url = imageUrl(v);
    if (url) out.push(url);
  };

  const fromString = (raw: string) => {
    const s = raw.trim();
    if (!s) return;
    // JSON first — a native collection can hold an array as text.
    if (s[0] === '[' || s[0] === '{') {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) { parsed.forEach(push); return; }
        push(parsed);
        return;
      } catch { /* not JSON after all — fall through to splitting */ }
    }
    // Split on newlines, commas and pipes. NOT on spaces: a signed Duda/CDN URL
    // can legitimately contain encoded characters, and a bare space in a URL is
    // far rarer than a filename with one.
    const parts = s.split(/[\n\r|,]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) { parts.forEach(push); return; }
    push(s);
  };

  if (Array.isArray(value)) value.forEach((v) => (typeof v === 'string' ? fromString(v) : push(v)));
  else if (typeof value === 'string') fromString(value);
  else if (value != null) push(value);

  // De-dupe while keeping order — a repeated hero would show as a dead slide.
  return [...new Set(out)];
}

/**
 * Gallery photos for one property id, or [] when there are none.
 *
 * Matches on the `id` column, the same key `Properties` uses, so a dynamic page
 * that already knows its property id needs nothing new bound. `slug` is accepted
 * as a fallback for a collection keyed that way instead.
 */
export async function fetchPropertyImages(
  propertyId: string,
  opts: { collectionName?: string; slug?: string } = {},
): Promise<string[]> {
  const id = str(propertyId).trim();
  const slug = str(opts.slug).trim();
  if (!id && !slug) return [];

  const rows = await readCollection(opts.collectionName ?? PROPERTY_IMAGES_COLLECTION);
  if (!rows.length) return [];

  const row = rows.find((r) => (id && str(r.id) === id))
    ?? (slug ? rows.find((r) => str(r.slug) === slug) : undefined);
  if (!row) return [];

  return toImageList(row[IMAGES_FIELD]);
}
