// ===========================================================================
// `PropertiesInternal` — the site's own per-property extras
//
// A SECOND collection alongside `Properties`, keyed by the same property `id`.
// `Properties` is EXTERNAL: it mirrors the Hummingbird endpoint and the operator
// cannot add columns to it. `PropertiesInternal` is the site's own, so anything
// the API doesn't carry lives here — the gallery/hero photos (see
// ./propertyImages) and now **`nearbyLocationPriorityOrder`**, the hand-curated
// rank behind
// #07's "featured facilities" mode.
//
// Read-only. Existing callers use the soft rows-only wrapper; configuration-
// critical callers can use the explicit result form and distinguish an API
// failure from a legitimate empty collection.
//
// Read by #07 (featured ordering, batched space groups) and #20 (which facilities
// carry a given amenity). It lives in `shared/` next to `propertyImages` because
// it describes a collection rather than a widget.
//
// It is very likely a NATIVE collection (the operator types into it in Duda's
// WYSIWYG), so every text value can arrive wrapped as
// `<p class="rteBlock">3</p>`. Numbers therefore have to go through
// `plainText()` BEFORE `num()` — `parseFloat('<p …>3</p>')` is NaN, which would
// silently push every property to the bottom of the featured list.
// ===========================================================================

import {
  readCollectionPaged,
  str,
  num,
  bool,
  plainText,
  type CollectionReadResult,
  type CollectionRow,
} from './dudaCollections';
import { boundJson } from './propertyBinding';

/** Collection name — case-sensitive, it's the lookup key. */
export const INTERNAL_PROPERTIES_COLLECTION = 'PropertiesInternal';

/** Column holding the curated rank. Lower sorts first. */
const PRIORITY_FIELD = 'nearbyLocationPriorityOrder';

/**
 * Columns behind the BATCHED space-groups call (see `fetchSpaceGroupBinding`).
 *
 * `spaceGroupId` is the one thing the Hummingbird API cannot tell us on its own:
 * it is not a column on `Properties`, each property has several groups and only
 * one is the public list, so it has to be curated per property — which is exactly
 * what this collection is for. `company_id` rides along because the batch call is
 * scoped to a company and this collection is where the operator states which one.
 */
const COMPANY_FIELD = 'company_id';
const SPACE_GROUP_FIELD = 'spaceGroupId';

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
  // `[{name, image}]` per facility — the property-level amenities #20 filters on.
  'amenities',
] as const;

/**
 * **This collection names its columns in lower case; the API does not.**
 *
 * `PropertiesInternal` mirrors the property object, but its columns are
 * `address` / `phones` / `emails` / `accesshours` / `socialmedia` / `images`,
 * where `Properties` (and therefore `extractNearbyProperties`, which parses both)
 * reads `Address` / `Phones` / … . Verified against the site's actual collection
 * export, 2026-08-25.
 *
 * Getting this wrong is silent and total, not partial: `propertyLikeRows` admits a
 * row only if it has an `Address` OBJECT, so with the capitalised name alone every
 * row failed that test, the whole collection looked like "photos only", and #07
 * fell through to REST — **against config.json's company, which is a different
 * company entirely**. The visible symptom is a list of the wrong facilities whose
 * ids match nothing in the `spaceGroupId` map, so every card then also falls back
 * to the per-property chain and the batched call appears not to be used at all.
 *
 * Copied onto the canonical key rather than renamed, so `propertyImages.ts` — which
 * reads `images`/`heroimage` off the same rows — is untouched. An existing
 * capitalised value always wins: a collection already shaped like the API must not
 * be overwritten by a lower-case column that happens to sit beside it.
 */
const FIELD_ALIASES: Array<readonly [string, string]> = [
  ['address', 'Address'],
  ['phones', 'Phones'],
  ['emails', 'Emails'],
  ['accesshours', 'AccessHours'],
  ['socialmedia', 'SocialMedia'],
  ['images', 'Images'],
];

/**
 * Scalar columns that must be plain TEXT before anything keys or renders off them.
 *
 * `id` is the critical one: it is the join key between this collection, the
 * property rows and the `nearbyLocationPriorityOrder` map. `str()` does not strip
 * markup, so on
 * a native collection an id would arrive as `<p class="rteBlock">340079517</p>`
 * and match NOTHING — featured ordering would silently apply to no property at
 * all. `name` is here because it is rendered and is the sort tie-break.
 */
const TEXT_FIELDS = ['id', 'name', 'slug', COMPANY_FIELD, SPACE_GROUP_FIELD] as const;

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
  const get = (field: string) => (out ?? row)[field];
  const set = (field: string, value: unknown) => {
    out = out ?? { ...row };
    out[field] = value;
  };

  // FIRST, because the parse below works on the canonical names: lift this
  // collection's lower-case columns onto the keys the extractors read. An
  // existing capitalised value wins — see FIELD_ALIASES.
  for (const [lower, canonical] of FIELD_ALIASES) {
    const existing = get(canonical);
    if (existing != null && existing !== '') continue;
    const v = get(lower);
    if (v == null || v === '') continue;
    set(canonical, v);
  }

  for (const field of JSON_FIELDS) {
    const v = get(field);
    if (v == null || typeof v === 'object') continue;
    const parsed = boundJson<unknown>(plainText(v));
    if (parsed == null) continue;
    set(field, parsed);
  }
  for (const field of TEXT_FIELDS) {
    const v = get(field);
    if (typeof v !== 'string') continue;
    const text = plainText(v);
    if (text === v) continue;
    set(field, text);
  }
  return out ?? row;
}

/**
 * All rows of the collection, promise-cached so #07 reads it once per bundle.
 *
 * The PROMISE is cached, not the rows, so this widget's two callers — the source
 * list (`fetchProperties`) and the `nearbyLocationPriorityOrder` map — join one
 * in-flight
 * request instead of each firing their own. Bundle-lifetime only; a reload picks
 * up collection edits.
 *
 * `propertyImages.ts` keeps its own identical cache over the same collection, so
 * a page carrying both reads it twice. That duplication is DELIBERATE: hoisting
 * the cache into `dudaCollections` would put this widget's change in the read
 * path of every other widget's images, and one extra read-only in-page call is
 * the cheaper price.
 */
const rowCache = new Map<string, Promise<CollectionReadResult>>();

/**
 * Strict form for configuration-critical consumers. Unlike the legacy soft
 * wrapper it preserves unavailable/error outcomes, so an outage cannot be
 * mistaken for a legitimate empty collection.
 */
export function readInternalPropertiesResult(
  collectionName: string = INTERNAL_PROPERTIES_COLLECTION,
): Promise<CollectionReadResult> {
  const hit = rowCache.get(collectionName);
  if (hit) return hit;
  /*
   * PAGED, not a single `.get()`.
   *
   * Duda's pageSize is 100 and a collection holds up to 1000 rows, so one read
   * capped this at the first hundred properties — and the widgets built on it
   * promise the COMPLETE set: #20's storage-type locations says "every
   * facility with this type", #07 ranks all of them. Facility 101 onward
   * silently did not exist. Still one request wherever the collection fits in
   * a page, which is every site we run today.
   */
  const pending = readCollectionPaged(collectionName).then((result): CollectionReadResult => {
    if (result.status === 'ok') {
      /*
       * An incomplete read is NOT pinned, and says so in what it returns.
       *
       * Dropping `complete` here handed callers a known prefix indistinguishable
       * from the whole collection — and the cache then held that prefix for the
       * rest of the page, so facilities past the cut-off disappeared for every
       * later mount too, with no retry. Keeping the flag lets a caller that
       * promises the complete set notice; evicting lets the next mount try
       * again, exactly as a transient failure does.
       */
      if (!result.complete) {
        console.warn(
          `[internalProperties] "${collectionName}" could not be read past row ${result.rows.length}; lists built on it will be short`,
        );
        if (rowCache.get(collectionName) === pending) rowCache.delete(collectionName);
      }
      return { status: 'ok', rows: result.rows.map(normalizeRow), complete: result.complete };
    }
    // Do not pin a transient unavailable/error answer for the rest of the page.
    // Concurrent callers still share this promise; a later mount gets a retry.
    if (rowCache.get(collectionName) === pending) rowCache.delete(collectionName);
    // Narrowed by hand: the paged result's status union is wider than the read
    // result's failure shape, and TypeScript cannot see that 'ok' is gone.
    return { status: result.status, detail: result.detail ?? 'collection read failed' };
  });
  rowCache.set(collectionName, pending);
  return pending;
}

export async function readInternalProperties(
  collectionName: string = INTERNAL_PROPERTIES_COLLECTION,
): Promise<CollectionRow[]> {
  const result = await readInternalPropertiesResult(collectionName);
  return result.status === 'ok' ? result.rows : [];
}

/**
 * One row's `nearbyLocationPriorityOrder`, or `NO_PRIORITY` when it has none.
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
 * `nearbyLocationPriorityOrder` per property id, for the whole collection, in ONE
 * read.
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
 * The inputs the BATCHED space-groups call needs, in ONE collection read.
 *
 *   `{ companyId, groupByProperty: Map<propertyId, spaceGroupId> }`
 *
 * #07 used to price its cards with two REST round trips PER PROPERTY (list the
 * property's space-groups, then read the website one), which is why it only ever
 * priced the cards on screen. Both of those calls exist to answer one question —
 * *which group is this property's public list* — and the operator can simply
 * state the answer here. With `spaceGroupId` curated per row, every facility's
 * spaces come back in a single request (see `fetchSpaceGroupSpaces`).
 *
 * **`company_id` is read from this collection, not from `Company`**, because it
 * is the id these `spaceGroupId`s belong to: the two are one setting written on
 * one row, and pairing group ids from here with a company id from somewhere else
 * would ask the API for groups that company does not own. Only the FIRST
 * non-empty value is used; a second, different one is a misconfiguration and
 * warns rather than being guessed between.
 *
 * Fails soft to `{ companyId: '', groupByProperty: new Map() }` — no dmAPI (the
 * Duda editor, the dev harness), no collection, or the columns simply not filled
 * in yet. The caller must then keep the per-property path; see
 * `fetchSpacesForProperties`.
 */
export interface SpaceGroupBinding {
  /** '' when the column is empty — the caller falls back to its own creds. */
  companyId: string;
  /** Property id → the space group holding its public list. */
  groupByProperty: Map<string, string>;
}

export async function fetchSpaceGroupBinding(
  collectionName: string = INTERNAL_PROPERTIES_COLLECTION,
): Promise<SpaceGroupBinding> {
  const groupByProperty = new Map<string, string>();
  let companyId = '';

  for (const row of await readInternalProperties(collectionName)) {
    // Already plain text — normalizeRow put both columns through plainText(), so
    // a native collection's `<p class="rteBlock">Ej67atdZBe</p>` cannot reach the
    // request URL and 404 the whole batch.
    const company = str(row[COMPANY_FIELD]).trim();
    if (company) {
      if (!companyId) companyId = company;
      else if (company !== companyId) {
        console.warn(
          `[#07 nearby] ${collectionName} has more than one ${COMPANY_FIELD} (“${companyId}” and “${company}”); using the first`,
        );
      }
    }

    const id = str(row.id).trim();
    const group = str(row[SPACE_GROUP_FIELD]).trim();
    // Both or neither: the map is a join, so a group with no property to hang it
    // on is unusable and a property with no group has to keep the old path.
    if (id && group) groupByProperty.set(id, group);
  }

  return { companyId, groupByProperty };
}

/** Column behind the rental flow's single-step layout — a Duda ToggleSwitch. */
const SINGLE_STEP_FIELD = 'single_step';

/**
 * Whether this property runs the rental flow as a SINGLE step.
 *
 * The operator ticks a ToggleSwitch per property rather than configuring the
 * widget, because the choice belongs to the facility: one rental page serves
 * every property on a dynamic site, so a content-menu radio there could only
 * say one thing for all of them.
 *
 * `undefined` is deliberately distinct from `false` and means UNANSWERED —
 * no dmAPI (the Duda editor and the dev harness), no collection, no row for
 * this property, or the column simply absent. The caller then keeps whatever
 * it was doing, which is two-step. A missing collection must never silently
 * switch a facility into a layout nobody chose.
 *
 * The switch stores a real boolean (verified live), but the value still goes
 * through `plainText()` before `bool()`: this collection is NATIVE, so a
 * column here can arrive as `<p class="rteBlock">true</p>`, and a future
 * editor pass could change the field type without anyone touching this file.
 */
export async function fetchSingleStep(
  propertyId: string,
  collectionName: string = INTERNAL_PROPERTIES_COLLECTION,
): Promise<boolean | undefined> {
  const wanted = propertyId.trim();
  if (!wanted) return undefined;
  const row = (await readInternalProperties(collectionName))
    .find((r) => str(r.id).trim() === wanted);
  if (!row) return undefined;
  const raw = row[SINGLE_STEP_FIELD];
  if (raw === undefined || raw === null) return undefined;
  /*
   * plainText BEFORE bool, and the empty check after it.
   *
   * `bool()` does not strip markup. On a native collection — which this one is
   * — a value typed into Duda's WYSIWYG arrives as
   * `<p class="rteBlock">true</p>`, which matches neither its true list nor
   * its false list and falls through to the `false` DEFAULT. Not undefined:
   * false. So a property with the switch ON would have been quietly forced
   * back to two-step, and "unanswered" — the state that exists precisely so a
   * read we cannot trust changes nothing — would never have been reached.
   *
   * It is a real boolean today (verified live), and plainText is a no-op on
   * one: `str(true)` is "true" and there is no markup to parse.
   */
  const text = plainText(raw).trim();
  if (!text) return undefined;
  return bool(text);
}

/** Column behind the rental flow's ID-verification policy — a Duda Dropdown. */
const IDV_REQUIREMENT_FIELD = 'idv_requirement';

/**
 * This property's ID-verification setting as the operator chose it
 * (None / Optional / Required), as plain text. The rental flow interprets it.
 *
 * Per property for the same reason as `single_step`: one rental page serves
 * every property. `undefined` means UNANSWERED — no dmAPI, no row, no column,
 * or blank — and the caller applies its own default.
 */
export async function fetchIdvRequirementSetting(
  propertyId: string,
  collectionName: string = INTERNAL_PROPERTIES_COLLECTION,
): Promise<string | undefined> {
  const wanted = propertyId.trim();
  if (!wanted) return undefined;
  const row = (await readInternalProperties(collectionName))
    .find((r) => str(r.id).trim() === wanted);
  if (!row) return undefined;
  const raw = row[IDV_REQUIREMENT_FIELD];
  if (raw === undefined || raw === null) return undefined;
  const text = plainText(raw).trim();
  return text || undefined;
}

/**
 * Sort by curated `nearbyLocationPriorityOrder`, then by name.
 *
 * Name is the tie-break the spec asks for: two properties sharing a
 * `nearbyLocationPriorityOrder` order by name. `localeCompare` with `numeric` keeps
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
 * `heroimage`, `images` and `nearbyLocationPriorityOrder` there is no name,
 * address, phone or
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
