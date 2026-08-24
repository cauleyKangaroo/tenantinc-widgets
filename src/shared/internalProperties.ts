// ===========================================================================
// `PropertiesInternal` — the site's own per-property extras
//
// A SECOND collection alongside `Properties`, keyed by the same property `id`.
// `Properties` is EXTERNAL: it mirrors the Hummingbird endpoint and the operator
// cannot add columns to it. `PropertiesInternal` is the site's own, so anything
// the API doesn't carry lives here — the gallery/hero photos (see
// ./propertyImages) and now **`priorityOrder`**, the hand-curated rank behind
// #07's "featured facilities" mode.
//
// Read-only and fails soft everywhere: no dmAPI (the Duda editor and the dev
// harness), collection missing, column empty → an empty map / an empty list, and
// the caller keeps its own ordering.
//
// **Only #07 reads this module.** It lives in `shared/` next to `propertyImages`
// because it describes a collection rather than a widget, but nothing else
// imports it and no other widget's data path changed to make room for it.
//
// It is very likely a NATIVE collection (the operator types into it in Duda's
// WYSIWYG), so every text value can arrive wrapped as
// `<p class="rteBlock">3</p>`. Numbers therefore have to go through
// `plainText()` BEFORE `num()` — `parseFloat('<p …>3</p>')` is NaN, which would
// silently push every property to the bottom of the featured list.
// ===========================================================================

import { readCollection, str, num, plainText, type CollectionRow } from './dudaCollections';
import { boundJson } from './propertyBinding';

/** Collection name — case-sensitive, it's the lookup key. */
export const INTERNAL_PROPERTIES_COLLECTION = 'PropertiesInternal';

/** Column holding the curated rank. Lower sorts first. */
const PRIORITY_FIELD = 'priorityOrder';

/** Rank with no usable value — sorts after every real one. */
export const NO_PRIORITY = Number.POSITIVE_INFINITY;

/**
 * Columns whose value is STRUCTURED — an object or an array, not a scalar.
 *
 * `Address` is the one that matters most here: it carries `lat`/`lng`, so it is
 * what nearest-first ordering measures from.
 */
const JSON_FIELDS = [
  'Address',
  'Phones',
  'Emails',
  'AccessHours',
  'SocialMedia',
  'unit_type_counts',
  'Images',
] as const;

/**
 * Scalar columns that must be plain TEXT before anything keys or renders off them.
 *
 * `id` is the critical one: it is the join key between this collection, the
 * property rows and the `priorityOrder` map. `str()` does not strip markup, so on
 * a native collection an id would arrive as `<p class="rteBlock">340079517</p>`
 * and match NOTHING — featured ordering would silently apply to no property at
 * all. `name` is here because it is rendered and is the sort tie-break.
 */
const TEXT_FIELDS = ['id', 'name', 'slug'] as const;

/**
 * Make one row's structured columns actual objects/arrays.
 *
 * The two collection kinds hand these over differently, and this collection could
 * be either:
 *
 *  - **External** — values arrive already parsed. `typeof v === 'object'`, nothing
 *    to do, and the loop skips them.
 *  - **Native** — the operator pasted the value into a WYSIWYG cell, so it arrives
 *    as TEXT, very likely wrapped: `<p class="rteBlock">{"lat":35.36992,…}</p>`.
 *
 * Without this the native case is silently useless: `extractNearbyProperties`
 * requires `Address` to be an object and skips the row outright when it isn't, so
 * a collection holding perfectly good coordinates would produce no list at all and
 * fall through to `Properties`. `plainText()` strips the wrapper, then `boundJson`
 * parses only when the text actually looks like JSON — a plain display string like
 * "5281 California, Irvine" is left alone rather than warned about.
 *
 * Non-destructive: a row with nothing to convert is returned as-is.
 */
function normalizeRow(row: CollectionRow): CollectionRow {
  let out: CollectionRow | null = null;
  for (const field of JSON_FIELDS) {
    const v = row[field];
    if (v == null || typeof v === 'object') continue;
    const parsed = boundJson<unknown>(plainText(v));
    if (parsed == null) continue;
    out = out ?? { ...row };
    out[field] = parsed;
  }
  for (const field of TEXT_FIELDS) {
    const v = row[field];
    if (typeof v !== 'string') continue;
    const text = plainText(v);
    if (text === v) continue;
    out = out ?? { ...row };
    out[field] = text;
  }
  return out ?? row;
}

/**
 * All rows of the collection, promise-cached so #07 reads it once per page.
 *
 * The PROMISE is cached, not the rows, so this widget's two callers — the source
 * list (`fetchProperties`) and the `priorityOrder` map — join one in-flight
 * request instead of each firing their own. Page-lifetime only; a reload picks up
 * collection edits.
 *
 * `propertyImages.ts` keeps its own identical cache over the same collection, so
 * a page carrying both reads it twice. That duplication is DELIBERATE: hoisting
 * the cache into `dudaCollections` would put this widget's change in the read
 * path of every other widget's images, and one extra read-only in-page call is
 * the cheaper price.
 */
const rowCache = new Map<string, Promise<CollectionRow[]>>();

export async function readInternalProperties(
  collectionName: string = INTERNAL_PROPERTIES_COLLECTION,
): Promise<CollectionRow[]> {
  const hit = rowCache.get(collectionName);
  if (hit) return hit;
  // Normalised once, inside the cache, so every consumer sees `Address` as an
  // object whichever kind of collection this site's is.
  const p = readCollection(collectionName).then((rows) => rows.map(normalizeRow));
  rowCache.set(collectionName, p);
  return p;
}

/**
 * One row's `priorityOrder`, or `NO_PRIORITY` when it has none.
 *
 * `num()` alone would turn a blank cell into 0 — the STRONGEST rank — so an
 * operator who set a priority on three facilities would see the other ninety
 * seven jump ahead of them. Hence the explicit empty check.
 */
export function rowPriority(row: CollectionRow): number {
  const raw = plainText(row[PRIORITY_FIELD]);
  if (!raw) return NO_PRIORITY;
  const n = num(raw, NaN);
  return Number.isFinite(n) ? n : NO_PRIORITY;
}

/**
 * `priorityOrder` per property id, for the whole collection, in ONE read.
 *
 * Ids missing from the map simply have no curated rank; callers must treat that
 * as `NO_PRIORITY` rather than as an error, because the collection is allowed to
 * cover only the handful of facilities the operator wants to feature.
 */
export async function fetchPriorityOrder(
  collectionName: string = INTERNAL_PROPERTIES_COLLECTION,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const row of await readInternalProperties(collectionName)) {
    // Already plain text — normalizeRow stripped any WYSIWYG wrapper, so this key
    // matches the id the cards carry.
    const id = str(row.id).trim();
    if (!id) continue;
    const p = rowPriority(row);
    if (p !== NO_PRIORITY) out.set(id, p);
  }
  return out;
}

/**
 * Sort by curated `priorityOrder`, then by name.
 *
 * Name is the tie-break the spec asks for: two properties sharing a
 * `priorityOrder` order by name. `localeCompare` with `numeric` keeps
 * "Storage Outlet 2" before "Storage Outlet 10".
 *
 * Unranked properties still sort to the tail (`NO_PRIORITY`) rather than being
 * dropped here, because dropping is the CALLER's decision — #07 filters them out
 * before calling this, since featured is an opt-in list. Keeping the tail ordered
 * anyway matters for any caller that doesn't: without a second key their order
 * would be whatever the API happened to return, i.e. it could change between page
 * loads.
 *
 * Pure and non-mutating: returns a new array.
 */
export function sortByPriorityThenName<T extends { id: string; name: string }>(
  properties: T[],
  priorities: Map<string, number>,
): T[] {
  return [...properties].sort((a, b) => {
    const pa = priorities.get(a.id) ?? NO_PRIORITY;
    const pb = priorities.get(b.id) ?? NO_PRIORITY;
    if (pa !== pb) return pa - pb;
    return (a.name || '').localeCompare(b.name || '', 'en', { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Rows of `PropertiesInternal` that carry actual PROPERTY data, not just photos.
 *
 * #07 is asked to source its list from `PropertiesInternal`, but that collection
 * exists primarily to hold the extras — on a site where it only has `id`,
 * `heroimage`, `images` and `priorityOrder` there is no name, address, phone or
 * coordinates to render, and handing those rows to the extractor would produce a
 * grid of blank cards. So the caller checks first and falls back to `Properties`
 * when the answer is "photos only".
 *
 * The bar is an `Address` OBJECT — deliberately not "an Address object OR a
 * name". A name alone is the trap: on a native collection a hand-typed `name`
 * arrives as `<p class="rteBlock">Apex Storage</p>`, and a row carrying only that
 * would clear a name-based check, take over from `Properties`, and render markup
 * where the facility name goes with no address, phone or coordinates behind it.
 * `Address` is also the field nearest-first ordering measures from, so a row
 * without one cannot be placed in a distance-sorted list anyway.
 *
 * Rows are `normalizeRow`d before they get here, so a native collection whose
 * `Address` cell holds JSON text clears this bar too — the check is about the
 * value being STRUCTURED, not about which kind of collection produced it.
 */
export function propertyLikeRows(rows: CollectionRow[]): CollectionRow[] {
  return rows.filter((r) => {
    if (!str(r.id)) return false;
    const addr = r.Address;
    return !!addr && typeof addr === 'object' && !Array.isArray(addr);
  });
}
