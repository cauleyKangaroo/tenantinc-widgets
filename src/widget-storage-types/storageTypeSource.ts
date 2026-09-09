// ===========================================================================
// Which storage types exist, and what each card says.
//
// TWO SOURCES, deliberately:
//
//   • The Duda PAGE TREE decides which types exist. It cannot drift from
//     reality — a type is listed because a page for it exists — so a card can
//     never link to a 404, and adding a page is all it takes to list it.
//   • The `StorageTypes` collection supplies the card copy and imagery, keyed
//     by slug. It is ENRICHMENT: a page with no row still gets a card, with its
//     page title and no blurb, rather than disappearing.
//
// A collection row with no page is skipped — it has nowhere to link to.
// ===========================================================================

import { readCollection, plainText, imageUrl, num } from '@shared/dudaCollections';
import { readSitePages, findSitePage, descendantPages, parseRoutes, type SitePage } from '@shared/sitePages';

export const STORAGE_TYPES_COLLECTION = 'StorageTypes';

export interface StorageType {
  slug: string;
  title: string;
  href: string;
  abstract: string;
  image: string;
  imageAlt: string;
  /** Lower sorts first. Absent rows keep the page tree's own order. */
  sortOrder: number;
  hiddenFromListing: boolean;
}

/** Sorts after every curated rank, so uncurated pages keep the editor's order. */
const NO_ORDER = Number.POSITIVE_INFINITY;

/** `/storage-types/rv-storage` → `rv-storage`. The join key between the two sources. */
export function slugOf(path: string): string {
  const clean = (path || '').split(/[?#]/)[0].replace(/\/+$/, '');
  const tail = clean.split('/').filter(Boolean).pop();
  return (tail || '').toLowerCase();
}

interface CopyRow {
  title: string;
  abstract: string;
  image: string;
  imageAlt: string;
  sortOrder: number;
  hiddenFromListing: boolean;
}

/**
 * Card copy per slug. Fails soft to an empty map: the collection is optional,
 * and its absence must leave the page tree's own list intact.
 *
 * `StorageTypes` is a NATIVE collection — a human authors it — so every text
 * value can arrive wrapped as `<p class="rteBlock">…</p>`. `slug` is the lookup
 * key, so it goes through plainText() or it matches nothing at all.
 */
export async function readStorageTypeCopy(collectionName: string): Promise<Map<string, CopyRow>> {
  const out = new Map<string, CopyRow>();
  if (!collectionName) return out;

  let rows;
  try {
    rows = await readCollection(collectionName);
  } catch {
    return out;
  }

  for (const row of rows) {
    const slug = plainText(row.slug).trim().toLowerCase();
    if (!slug) continue;
    if (out.has(slug)) {
      console.warn(`[#20 storage-types] duplicate row for "${slug}" ignored — the first one wins`);
      continue;
    }
    const rank = plainText(row.sort_order);
    out.set(slug, {
      title: plainText(row.display_name).trim() || plainText(row.title).trim(),
      abstract: plainText(row.abstract).trim(),
      image: imageUrl(row.card_image),
      imageAlt: plainText(row.card_alt).trim(),
      sortOrder: rank ? num(rank, NO_ORDER) : NO_ORDER,
      hiddenFromListing: /^(1|true|yes)$/i.test(plainText(row.hide_from_listing).trim()),
    });
  }
  return out;
}

export interface StorageTypesQuery {
  /** Comma-separated route(s) holding the type pages. */
  route: string;
  collectionName: string;
  /** Exclude this slug — the page a "related" row is sitting on. */
  excludeSlug?: string;
  /** Include pages the editor hid from navigation. */
  skipHidden?: boolean;
}

/**
 * The list a card row renders.
 *
 * Empty when the route names no branch — which is the honest answer to "this
 * site has no storage-type pages", and is what the caller renders nothing for.
 */
export async function fetchStorageTypes(
  widgetTag: string,
  { route, collectionName, excludeSlug = '', skipHidden = false }: StorageTypesQuery,
): Promise<StorageType[]> {
  const [pages, copy] = await Promise.all([
    readSitePages(widgetTag),
    readStorageTypeCopy(collectionName),
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

      const row = copy.get(slug);
      if (row?.hiddenFromListing) continue;

      out.push({
        slug,
        title: row?.title || page.title,
        href: page.path,
        abstract: row?.abstract ?? '',
        image: row?.image ?? '',
        imageAlt: row?.imageAlt || row?.title || page.title,
        sortOrder: row?.sortOrder ?? NO_ORDER,
        hiddenFromListing: false,
      });
    }
  }

  // Curated rank first; everything uncurated keeps the editor's own page order,
  // which is why this is a stable sort on the index rather than on the title.
  return out
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (a.t.sortOrder - b.t.sortOrder) || (a.i - b.i))
    .map(({ t }) => t);
}
