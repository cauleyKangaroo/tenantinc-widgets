// ===========================================================================
// The city / state page's own copy, from the `Cities` and `States` collections.
//
// The proxy's locations sync builds both: one `Cities` row per city, keyed
// `california/bakersfield`, and one `States` row per state, keyed
// `california` (the `city` column holds the key in both). Each row carries
// two EDITORIAL columns the sync writes empty and never touches again, so an
// editor fills them in Duda:
//
//   text_heading   the page's text heading
//   text_body      the page's body copy (Rich Text)
//
// #08 shows them ahead of its content-menu `seoHeading` / `seoContent`,
// which are per widget instance and so read the same on every city — the
// complaint this exists to fix (2026-10-16). No row, or blank cells, fall
// back to those fields; off the published site (no dmAPI) the read is empty.
//
// Matched on the KEY, case-insensitively, with the URL segments as they are
// ("north-carolina/chapel-hill"); a `city_name` + `state` match is the
// second chance for a row whose key was typed differently.
// ===========================================================================

import { readCollection, plainText, type CollectionRow } from './dudaCollections';

export const CITIES_COLLECTION = 'Cities';
export const STATES_COLLECTION = 'States';

export interface LocationCopy {
  /** Plain text, trimmed. */
  heading?: string;
  /** The cell's markup, for RichText. */
  body?: string;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const key = (v: string): string => v.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
const loose = (v: string): string => v.toLowerCase().replace(/[^a-z0-9]/g, '');

function copyOf(row: CollectionRow): LocationCopy | null {
  const heading = plainText(row.text_heading).trim();
  const rawBody = row.text_body;
  const body = typeof rawBody === 'string' && plainText(rawBody).trim() ? rawBody : undefined;
  if (!heading && !body) return null;
  return { ...(heading ? { heading } : {}), ...(body ? { body } : {}) };
}

/**
 * The copy for a place, or null when there is none to show.
 *
 * `scope.city` set → the `Cities` row for `{state}/{city}`; else the `States`
 * row for `{state}`. Fails soft to null on every path (no dmAPI, collection
 * missing, no row, blank cells).
 */
export async function fetchLocationCopy(
  scope: { state?: string; city?: string },
  names: { cities?: string; states?: string } = {},
): Promise<LocationCopy | null> {
  const state = key(scope.state ?? '');
  const city = key(scope.city ?? '');
  if (!state) return null;
  const wanted = city ? `${state}/${city}` : state;
  const collection = city ? (names.cities || CITIES_COLLECTION) : (names.states || STATES_COLLECTION);
  const rows = await readCollection(collection).catch(() => [] as CollectionRow[]);
  const byKey = rows.find((r) => key(plainText(r.city)) === wanted);
  const row = byKey ?? rows.find((r) => {
    const rowState = loose(plainText(r.state_name)) === loose(state) || loose(plainText(r.state)) === loose(state);
    if (!rowState) return false;
    return city ? loose(plainText(r.city_name)) === loose(city) : true;
  });
  return row ? copyOf(row) : null;
}
