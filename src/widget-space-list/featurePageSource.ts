// ===========================================================================
// Feature-page copy from the Duda `featurePage` collection.
//
// WHICH features exist stays live (the property's own filter-bar amenities —
// see collectFilterBarFeatures). This module supplies only WHAT each one says.
//
// Three columns:
//   name        the amenity name to match, e.g. "Climate Controlled"
//   description one paragraph, printed under the <h1>
//   content     rich text, printed under the space listing
//
// `featurePage` is a NATIVE collection — a human authors it in Duda's WYSIWYG —
// so every column comes back wrapped as `<p class="rteBlock">…</p>`. That
// matters differently per column:
//   • `name` is a LOOKUP KEY. Left wrapped it would never match an amenity, so
//     it goes through plainText().
//   • `description` lands in a single <p> next to the "Show all spaces" button,
//     so it is flattened too — arbitrary markup there would break that row.
//   • `content` is rich text by design and is kept RAW, then rendered (and
//     sanitised) by @shared/richText.
//
// Fails soft the whole way down: no dmAPI (Duda editor, dev harness), collection
// missing, network error → [] and the caller keeps its bundled FEATURE_COPY.
// ===========================================================================

import { readCollection, hasCollectionsApi, str, plainText, logSource } from '@shared/dudaCollections';
import { featureSlug, type FeatureHighlight } from './featureHighlights';

/** Collection name. Case-sensitive — it IS the lookup key. */
export const FEATURE_PAGE_COLLECTION = 'featurePage';

const NAME_COLUMN = 'name';
const DESCRIPTION_COLUMN = 'description';
const CONTENT_COLUMN = 'content';

// One read per collection per page, shared by every widget instance on it.
// Promise-cached (not value-cached) so two instances mounting together make one
// request rather than two.
const cache = new Map<string, Promise<FeatureHighlight[]>>();

/**
 * Read the feature copy rows.
 *
 * Returns entries shaped as `FeatureHighlight` so they drop straight into
 * `buildFeatureHighlights(labels, copy)` — but note these are COPY, not rows:
 * a row naming a feature this property doesn't have is simply never looked up.
 *
 * `detailsTitle` is deliberately absent. The collection has no such column, and
 * `content` is rich text — an editor who wants a heading writes one in it, which
 * `.sl-rich h2` already styles.
 */
export function fetchFeaturePageCopy(
  collectionName: string = FEATURE_PAGE_COLLECTION,
): Promise<FeatureHighlight[]> {
  const cached = cache.get(collectionName);
  if (cached) return cached;

  const pending = load(collectionName).catch((err) => {
    // Never let a rejected promise stay in the cache — the next mount retries.
    cache.delete(collectionName);
    console.warn(`[featurePage] read of "${collectionName}" failed`, err);
    return [] as FeatureHighlight[];
  });
  cache.set(collectionName, pending);
  return pending;
}

async function load(collectionName: string): Promise<FeatureHighlight[]> {
  if (!hasCollectionsApi()) {
    logSource('#05 space-list', 'feature page copy', false, 'no dmAPI — not in Duda');
    return [];
  }

  // One get() only. `pageSize` is 100 and a feature list is a handful of rows;
  // if this ever needs to exceed 100 it has to walk `page` (see dudaCollections).
  const rows = await readCollection(collectionName);
  const bySlug = new Map<string, FeatureHighlight>();

  for (const row of rows) {
    const name = plainText(row[NAME_COLUMN]);
    const slug = featureSlug(name);
    // A row with no usable name can't be matched to anything — skip it rather
    // than keeping copy nothing will ever reach.
    if (!slug) {
      console.warn(`[featurePage] row skipped: blank "${NAME_COLUMN}" column`);
      continue;
    }
    if (bySlug.has(slug)) {
      // First wins, same as the one-row Company collection: guessing between two
      // descriptions for one feature is worse than picking deterministically.
      console.warn(`[featurePage] duplicate row for "${name}" ignored — the first one wins`);
      continue;
    }
    bySlug.set(slug, {
      slug,
      name,
      description: plainText(row[DESCRIPTION_COLUMN]),
      details: str(row[CONTENT_COLUMN]),
    });
  }

  const copy = Array.from(bySlug.values());
  logSource(
    '#05 space-list',
    'feature page copy',
    copy.length > 0,
    copy.length > 0
      ? `${collectionName}, ${copy.length} row${copy.length === 1 ? '' : 's'}`
      : `${collectionName} empty or absent`,
  );
  return copy;
}

/** Drop the cached read. Only needed by tests and the dev harness. */
export function resetFeaturePageCache(): void {
  cache.clear();
}
