// ===========================================================================
// Duda Collections — client-side READ
//
// Published widgets can read any of the site's collections straight from the
// page via the read-only Collections JS API (`window.dmAPI`). No credentials
// are involved: the API is implicitly scoped to the site it's running on, and
// the data is public by construction (it renders on a public website).
// WRITES are a different story — they need Partner API credentials and have to
// go through a server-side proxy (see accordion-sync.php).
//
// Everything here fails SOFT: outside Duda `window.dmAPI` is simply undefined,
// so callers get an empty array and fall back to their own defaults rather
// than throwing into render.
//
// Extracted from widget-space-list/accordionConfigApi.ts once a second widget
// (blogs listing) needed it. The envelope/field-shape tolerance below is
// hard-won — the API has been seen to return rows several different ways.
//
// VERIFIED on site d0aa72e3 (published page, 2026-07-28). `.get()` resolves to:
//   { name: "BlogPosts", values: [ …rows… ], fields: null, filters: [],
//     language: null, search: null, sortBy: [],
//     page: { pageSize: 100, pageNumber: 0, totalPages: 1 } }
// Two things that matter:
//  • rows are on `.values` (handled below);
//  • `pageSize` is 100 — a collection may hold up to 1000 items, so a single
//    get() is NOT guaranteed to be the whole collection. Fine for small
//    collections; anything that could exceed 100 rows needs to walk `page`.
//
// `window.dmAPI` is PUBLISHED-SITE ONLY — it is undefined in the Duda editor,
// so callers must have something sensible to show there (see BlogsListing,
// which falls back to demo posts).
// ===========================================================================

/** Minimal shape of the bits of the Collections JS API we touch. The real API
 *  also exposes .where()/.orderBy()/limits, which we don't rely on. */
interface DmCollectionQuery {
  get(): Promise<unknown>;
}
interface DmCollectionsAPI {
  data(collectionName: string): DmCollectionQuery;
}
interface DmAPILike {
  loadCollectionsAPI?: () => Promise<DmCollectionsAPI>;
}

export type CollectionRow = Record<string, unknown>;

function getDmAPI(): DmAPILike | null {
  const w = window as unknown as { dmAPI?: DmAPILike };
  return w.dmAPI ?? null;
}

/** True when the Collections JS API is available (i.e. we're inside Duda). */
export function hasCollectionsApi(): boolean {
  return !!getDmAPI()?.loadCollectionsAPI;
}

/** Pull a rows array out of whatever envelope the JS API returns. */
function extractRows(res: unknown): CollectionRow[] {
  if (Array.isArray(res)) return res as CollectionRow[];
  if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>;
    const arr = obj.values ?? obj.data ?? obj.rows;
    if (Array.isArray(arr)) return arr as CollectionRow[];
  }
  return [];
}

/**
 * Rows may arrive flat ({title,…}) or nested under a `data` key
 * ({id, data:{title,…}}) depending on the API surface. Flatten to the fields,
 * keeping the row-level id reachable as `__rowId` for callers that need it.
 */
function flattenRow(row: CollectionRow): CollectionRow {
  const nested = row.data && typeof row.data === 'object' && !Array.isArray(row.data)
    ? (row.data as CollectionRow)
    : null;
  if (!nested) return row;
  return { ...nested, __rowId: row.id };
}

/**
 * Read every row of a collection by name (case-sensitive — it's the lookup key).
 * Returns [] on ANY failure: not in Duda, no dmAPI, collection absent, network
 * error. Never throws.
 */
export async function readCollection(collectionName: string): Promise<CollectionRow[]> {
  try {
    const dmAPI = getDmAPI();
    if (!dmAPI?.loadCollectionsAPI) return [];
    const collections = await dmAPI.loadCollectionsAPI();
    const res = await collections.data(collectionName).get();
    return extractRows(res).map(flattenRow);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[dudaCollections] read of "${collectionName}" failed`, err);
    return [];
  }
}

// ── Field coercion helpers ───────────────────────────────────────────────────
// Collection values are loosely typed: text columns can arrive as numbers,
// image columns as either a URL string or an object wrapping one.

/** Trimmed string, or '' for null/undefined/non-scalar. */
export function str(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

/**
 * Flatten a rich-text column to plain text.
 *
 * Duda's rich-text columns return HTML, not text — an `authorName` of
 * "StoreLocal" arrives as `<p class="rteBlock">StoreLocal</p>` (verified on site
 * d0aa72e3). Rendering that raw would print the markup, so anything destined for
 * a text node has to come through here.
 *
 * Parsed via DOMParser rather than a regex so entities decode correctly; a
 * document parsed this way has no browsing context, so nothing in it executes.
 */
export function plainText(v: unknown): string {
  const s = str(v);
  // Nothing to do for values with no markup or entities.
  if (!s || !/[<&]/.test(s)) return s;
  try {
    const doc = new DOMParser().parseFromString(s, 'text/html');
    return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  } catch {
    return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

/**
 * Coax an image column into a URL. Duda image fields have been seen as a plain
 * string and as an object ({url}/{src}/{path}), so handle both.
 */
export function imageUrl(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of ['url', 'src', 'href', 'path', 'original']) {
      const hit = o[k];
      if (typeof hit === 'string' && hit.trim()) return hit.trim();
    }
  }
  return '';
}

/** Parse a collection date (ISO, epoch ms/seconds, or a display string). */
export function parseDate(v: unknown): Date | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    // Heuristic: seconds-since-epoch values are ~10 digits, ms ~13.
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = str(v);
  if (!s) return null;
  const numeric = /^\d+$/.test(s) ? Number(s) : NaN;
  if (!Number.isNaN(numeric)) return parseDate(numeric);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
