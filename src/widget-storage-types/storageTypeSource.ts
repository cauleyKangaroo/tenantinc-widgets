// ===========================================================================
// Which storage types exist, what each card says, and which image it uses.
//
// THREE EXISTING SOURCES, deliberately:
//
//   • The Duda PAGE TREE owns existence, title, URL, visibility and order.
//   • `featurePage` supplies the optional card paragraph. Its existing `name`
//     column is the join key; an optional `amenity_name` handles the few cases
//     where a marketing name cannot be inferred from the Hummingbird key.
//   • `PropertiesInternal.amenities[].image` supplies the artwork already
//     associated with that amenity. No separate StorageTypes collection.
//
// Missing enrichment never removes a real page. It keeps the page-tree title,
// uses sample copy, and shows the card's neutral image placeholder.
// ===========================================================================

import { readCollection, plainText, imageUrl, type CollectionRow } from '@shared/dudaCollections';
import { readInternalProperties, INTERNAL_PROPERTIES_COLLECTION } from '@shared/internalProperties';
import { readSitePages, findSitePage, descendantPages, parseRoutes, type SitePage } from '@shared/sitePages';

export const FEATURE_PAGE_COLLECTION = 'featurePage';
export const DEFAULT_STORAGE_TYPE_ABSTRACT =
  'Discover secure, convenient storage options designed to fit your needs.';

export interface StorageType {
  slug: string;
  title: string;
  href: string;
  abstract: string;
  image: string;
  imageAlt: string;
}

/** `/storage-types/rv-storage` → `rv-storage`. */
export function slugOf(path: string): string {
  const clean = (path || '').split(/[?#]/)[0].replace(/\/+$/, '');
  const tail = clean.split('/').filter(Boolean).pop();
  return (tail || '').toLowerCase();
}

/** Human labels, URL segments and Hummingbird names share this identity form. */
function keyOf(value: unknown): string {
  return plainText(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Generic marketing suffixes are not part of the amenity identity. */
function candidateKeys(...values: unknown[]): string[] {
  const out = new Set<string>();
  for (const value of values) {
    const key = keyOf(value);
    if (!key) continue;
    out.add(key);
    out.add(key.replace(/_(storage|storage_units|units|access)$/, ''));
  }
  return [...out].filter(Boolean);
}

interface FeatureCopy {
  description: string;
  amenityName: string;
}

/**
 * Existing `featurePage` rows indexed by normalized name/optional slug.
 * `amenity_name` is optional: it is needed only for non-inferable mappings,
 * e.g. "Boat & RV Wash Bay" → `washrack`.
 */
async function readFeatureCopy(collectionName: string): Promise<Map<string, FeatureCopy>> {
  const out = new Map<string, FeatureCopy>();
  if (!collectionName) return out;

  const rows = await readCollection(collectionName).catch(() => [] as CollectionRow[]);
  for (const row of rows) {
    const name = plainText(row.name).trim();
    const description = plainText(row.description).trim();
    const amenityName = plainText(row.amenity_name).trim();
    const keys = candidateKeys(name, row.slug);
    for (const key of keys) {
      if (out.has(key)) {
        console.warn(`[#20 storage-types] duplicate featurePage key "${key}" ignored — the first row wins`);
        continue;
      }
      out.set(key, { description, amenityName });
    }
  }
  return out;
}

/** One canonical image per amenity key, using the first non-empty URL. */
async function readAmenityImages(collectionName: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const rows = await readInternalProperties(collectionName).catch(() => [] as CollectionRow[]);
  for (const row of rows) {
    if (!Array.isArray(row.amenities)) continue;
    for (const raw of row.amenities) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
      const amenity = raw as Record<string, unknown>;
      const key = keyOf(amenity.name);
      const image = imageUrl(amenity.image);
      if (key && image && !out.has(key)) out.set(key, image);
    }
  }
  return out;
}

function firstMatch<T>(map: Map<string, T>, keys: string[]): T | undefined {
  for (const key of keys) {
    const value = map.get(key);
    if (value !== undefined) return value;
  }
  return undefined;
}

export interface StorageTypesQuery {
  /** Comma-separated route(s) holding the type pages. */
  route: string;
  /** Existing collection containing `name` and `description`. */
  collectionName: string;
  /** Existing per-property collection containing `amenities[].image`. */
  internalCollectionName?: string;
  /** Exclude this slug — the page a related row sits on. */
  excludeSlug?: string;
  /** Drop pages hidden from navigation. */
  skipHidden?: boolean;
}

export async function fetchStorageTypes(
  widgetTag: string,
  {
    route,
    collectionName,
    internalCollectionName = INTERNAL_PROPERTIES_COLLECTION,
    excludeSlug = '',
    skipHidden = false,
  }: StorageTypesQuery,
): Promise<StorageType[]> {
  const [pages, copy, amenityImages] = await Promise.all([
    readSitePages(widgetTag),
    readFeatureCopy(collectionName),
    readAmenityImages(internalCollectionName),
  ]);

  const branches = parseRoutes(route)
    .map((r) => findSitePage(pages, r))
    .filter((b): b is SitePage => b !== null);
  if (!branches.length) return [];

  const exclude = excludeSlug.trim().toLowerCase();
  const seen = new Set<string>();
  const out: StorageType[] = [];

  for (const branch of branches) {
    for (const page of descendantPages(branch, { skipHidden })) {
      const slug = slugOf(page.path);
      if (!slug || slug === exclude || seen.has(slug)) continue;
      seen.add(slug);

      const pageKeys = candidateKeys(slug, page.title);
      const authored = firstMatch(copy, pageKeys);
      const imageKeys = candidateKeys(authored?.amenityName, slug, page.title);
      const image = firstMatch(amenityImages, imageKeys) ?? '';

      out.push({
        slug,
        title: page.title,
        href: page.path,
        abstract: authored?.description || DEFAULT_STORAGE_TYPE_ABSTRACT,
        image,
        imageAlt: page.title,
      });
    }
  }

  // The page tree is the single ordering source, so index, nav and related rows
  // cannot drift into three independently curated sequences.
  return out;
}
