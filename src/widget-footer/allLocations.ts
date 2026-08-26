// ===========================================================================
// #13's "All Storage Locations" panel — the whole portfolio, read from the
// `PropertiesInternal` collection.
//
// Figma 11592:217875. Each entry is three lines inside ONE link:
//
//   Self Storage In San Diego, CA      ← the frame's own label form
//   4567 Mission Blvd                  ← street
//   San Diego, CA 92109                ← city, state zip
//
// THE LABEL IS THE CITY, NOT THE FACILITY NAME. That is what the frame shows —
// it is an SEO block, not a facility list — which means two facilities in one
// city produce two identical first lines (the live portfolio has two in
// Bakersfield). The street line underneath is what tells them apart, and the
// frame's own sample data repeats "Self Storage In Irvine, CA" three times, so
// this is the design's intent rather than an oversight.
//
// Source is `PropertiesInternal` for the same reason #07 uses it: it is the
// site's OWN collection, so its rows are the operator's intent, and
// `readInternalProperties` is promise-cached — a page carrying both #07 and #13
// reads the collection once.
//
// FAILS SOFT to []. No dmAPI (the Duda editor, the dev harness), no collection,
// rows with no parsed `Address`: the caller renders the frame's demo entries in
// the editor and nothing at all on a published page. See the note on
// `hasCollectionsApi` in Footer.tsx for why those two cases differ.
// ===========================================================================

import type { CollectionRow } from '@shared/dudaCollections';
import { str } from '@shared/dudaCollections';
import { readInternalProperties, propertyLikeRows } from '@shared/internalProperties';

/** One entry in the panel. */
export interface FooterLocation {
  /** Property id — the React key, and the only field guaranteed present. */
  id: string;
  /** "Self Storage In San Diego, CA" — line one, the link text. */
  label: string;
  /** Street line, or '' when the row has no street. */
  street: string;
  /** "San Diego, CA 92109", assembled from whichever parts exist. */
  cityStateZip: string;
  /**
   * `/storage-units/<slug>`, or '' when the row has no slug.
   *
   * **The slug is COLLECTION-ONLY** — verified live 2026-08-25 that the REST
   * `/properties` response carries no `slug` field. So this is '' wherever the
   * collection isn't the source, and the entry renders as plain text rather than
   * a dead link. Same call as #07's "See All Spaces".
   */
  href: string;
}

/** Only the shape we read off the row's parsed `Address`. */
interface RowAddress {
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

/**
 * Normalise `propertyBasePath` exactly as #07, #08 and #02 do: a missing
 * leading slash makes every link relative to whatever page the footer sits on —
 * fatal on a property page at `/storage-units/california/…`, where it would
 * produce `/storage-units/california/storage-units/…` — and a trailing one
 * doubles the separator.
 */
export function normalizeBasePath(basePath: string): string {
  const t = String(basePath ?? '').trim().replace(/\/+$/, '');
  if (!t) return '';
  return t.startsWith('/') ? t : `/${t}`;
}

function toLocation(row: CollectionRow, base: string): FooterLocation | null {
  const id = str(row.id);
  // `propertyLikeRows` already proved Address is an object; this is the cast.
  const addr = (row.Address ?? {}) as RowAddress;
  const city = str(addr.city);
  const state = str(addr.state);
  const zip = str(addr.zip);
  // A row with no city cannot produce the frame's label at all, and a bare
  // "Self Storage In , " is worse than one fewer entry.
  if (!city) return null;

  const street = [str(addr.address), str(addr.address2)].filter(Boolean).join(' ');
  const slug = str(row.slug).replace(/^\/+/, '');

  return {
    id,
    label: `Self Storage In ${state ? `${city}, ${state}` : city}`,
    street,
    // Assembled part by part rather than templated, so a row missing a zip
    // doesn't render "San Diego, CA " with a trailing space, and one missing a
    // state doesn't render ", 92109".
    cityStateZip: [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    href: slug ? `${base}/${slug}` : '',
  };
}

/**
 * Sorted state → city → street.
 *
 * The tie-breaks are load-bearing for the same reason #07's are: several
 * facilities share a city (two in Bakersfield live), and a comparator that
 * returns 0 for them leaves their relative order unspecified — the panel could
 * come back in a different order on each load. `numeric` so "4567 Mission"
 * sorts after "789 Market" the way a reader expects.
 */
function byStateCityStreet(a: FooterLocation, b: FooterLocation): number {
  const cmp = (x: string, y: string) => x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' });
  // The label carries city + state, so comparing it settles both at once.
  return cmp(a.label, b.label) || cmp(a.street, b.street);
}

/**
 * Every facility in `PropertiesInternal`, panel-ready. `[]` on any failure.
 *
 * Deliberately NOT filtered by coordinates: verified live 2026-08-13 that every
 * property on the current company has `lat: null, lng: null`, and this panel is
 * a list of addresses — it never plots anything.
 */
export async function fetchAllLocations(basePath: string): Promise<FooterLocation[]> {
  const base = normalizeBasePath(basePath);
  const rows = propertyLikeRows(await readInternalProperties());
  return rows
    .map((row) => toLocation(row, base))
    .filter((l): l is FooterLocation => l !== null)
    .sort(byStateCityStreet);
}
