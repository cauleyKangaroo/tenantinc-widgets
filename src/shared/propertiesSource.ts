// ===========================================================================
// Properties: Duda collection first, keyed REST call as the fallback.
//
// The site now has an EXTERNAL Duda collection ("Properties") pointed at the same
// endpoint our widgets call directly, with the collection path set to
// `applicationData.<appId>[0].data.properties`. Duda applies that path for us, so
// each collection row IS a property object.
//
// VERIFIED on the live page (2026-07-29) — the JS API hands back the parsed JSON,
// NOT stringified or rich-text-wrapped values, even though the Duda UI labels
// every column "Rich Text":
//   Address           → object  {id, address, address2, city, state, zip, lat, lng…}
//   Phones / Emails   → array   [{id, type, phone, sort, status…}]
//   AccessHours       → array   [{type:'call_center', hours:[{day, open_time…}]}]
//   unit_type_counts  → array   [{unit_type, total_count, vacant_count, unit_type_id}]
//   occupancy         → number  73.36        status / unit_count / lease_count → number
//   is_day_closed     → boolean false        name / utc_offset / gds_id        → string
// (Native collections like BlogPosts DO wrap text as `<p class="rteBlock">…</p>`,
// because an editor authors those in a WYSIWYG. External rows pass through as-is,
// so `plainText()` is not needed here.)
//
// That means the rows are the exact shape the existing extractors already parse —
// `extractPropertyExtras` (#05) and `extractNearbyProperties` (#07, #05 nearby) —
// so this module hands them back inside the REST envelope and nothing downstream
// has to change.
//
// Why fall back at all: `window.dmAPI` is published-site only (undefined in the
// Duda editor and in the dev harness), and a collection can be renamed, unbound,
// or pointed at a different company. `requirePropertyId` makes that last case
// safe: if the collection doesn't contain the property this widget is configured
// for, we don't trust it and use the REST call instead.
// ===========================================================================

import { readCollection, str, type CollectionRow } from './dudaCollections';

/** Default external collection name (case-sensitive — it's the lookup key). */
export const PROPERTIES_COLLECTION = 'Properties';

export interface PropertiesSourceOptions {
  /** Collection to read. Defaults to 'Properties'. */
  collectionName?: string;
  /**
   * Only use the collection if it contains this property id. Prevents a
   * collection bound to another company from silently replacing good REST data.
   */
  requirePropertyId?: string;
}

/** Rows that actually look like properties (an `id` is the minimum bar). */
export async function readPropertiesFromCollection(
  collectionName: string = PROPERTIES_COLLECTION,
): Promise<CollectionRow[]> {
  const rows = await readCollection(collectionName);
  return rows.filter((r) => !!str(r.id));
}

/**
 * Wrap a property list in the REST response envelope, so callers can feed either
 * source to the same extractor.
 */
export function asPropertiesResponse(properties: unknown[], appId: string): unknown {
  return { applicationData: { [appId]: [{ status: 200, data: { properties } }] } };
}

/**
 * Properties from the Duda collection when it's available AND trustworthy,
 * otherwise from `directFetch` (the keyed REST call).
 *
 * Never throws on the collection path — `readCollection` already fails soft — so
 * the only error that can surface is one `directFetch` itself raises, exactly as
 * before this module existed.
 */
export async function fetchPropertiesPreferCollection(
  appId: string,
  directFetch: () => Promise<unknown>,
  opts: PropertiesSourceOptions = {},
): Promise<unknown> {
  const { collectionName = PROPERTIES_COLLECTION, requirePropertyId } = opts;

  const rows = await readPropertiesFromCollection(collectionName);
  const usable =
    rows.length > 0 &&
    (!requirePropertyId || rows.some((r) => str(r.id) === requirePropertyId));

  if (usable) return asPropertiesResponse(rows, appId);

  if (rows.length > 0 && requirePropertyId) {
    // Worth saying out loud: the collection read fine but is bound to a different
    // company/property set, which is a configuration mismatch to fix in Duda.
    // eslint-disable-next-line no-console
    console.warn(
      `[propertiesSource] "${collectionName}" has ${rows.length} row(s) but none with id ` +
      `"${requirePropertyId}" — falling back to the API.`,
    );
  }

  return directFetch();
}
