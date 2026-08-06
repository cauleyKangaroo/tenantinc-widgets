// ===========================================================================
// "Find Storage" location tree, built from the `Properties` collection.
//
// Each property carries a `slug` of the form  state/city/property-name-<id>,
// e.g. "california/bellflower/storage-outlet-bellflower-340079517". Grouping
// those three segments gives the nav its three levels:
//
//   California                 ← level 1, slug segment 0
//     Bellflower               ← level 2, slug segment 1
//       Storage Outlet - Bellflower   ← level 3, one per property
//
// WHY THE SLUG AND NOT `Address`. The slug IS the page URL, so the tree has to
// group by it or the links won't match the pages they sit under. Be aware the two
// disagree in the live data (verified 2026-08-06): Chula Vista and Escondido are
// Californian properties whose slugs say `arizona/...`, and Gardena's slug says
// `california/irvine/storage-outlet-escondido-...`. That is a data problem to fix
// upstream — this module renders faithfully whatever the slugs say, because
// silently "correcting" them would produce nav links to pages that don't exist.
//
// The LEAF LABEL is the deliberate exception: it uses the property's real `name`
// when there is one, falling back to the slug tail. The name is authoritative and
// already properly punctuated, and it stops a stale slug from mislabelling a
// facility ("Storage Outlet Escondido" for what is actually Gardena).
// ===========================================================================

import { readCollection, str, logSource, hasCollectionsApi } from './dudaCollections';
import { PROPERTIES_COLLECTION } from './propertiesSource';

/** One facility — the third level. */
export interface NavProperty {
  id: string;
  label: string;
  href: string;
  /** The raw slug, for callers that build their own URLs. */
  slug: string;
}

/** One city — the second level. */
export interface NavCity {
  /** Slug segment, e.g. "huntington-beach". */
  key: string;
  label: string;
  properties: NavProperty[];
}

/** One state — the first level. */
export interface NavState {
  /** Slug segment, e.g. "california". */
  key: string;
  label: string;
  cities: NavCity[];
}

/** "huntington-beach" → "Huntington Beach". */
export function slugLabel(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * The property segment carries a trailing numeric id
 * ("storage-outlet-bellflower-340079517") which must not appear in the label.
 * Only a PURELY numeric tail is dropped, so a facility legitimately named
 * "... - Unit 5" keeps it.
 */
export function propertySlugLabel(segment: string): string {
  return slugLabel(segment.replace(/-\d+$/, ''));
}

export interface ParsedSlug {
  state: string;
  city: string;
  property: string;
}

/**
 * Split "california/bellflower/storage-outlet-bellflower-340079517".
 *
 * Returns null unless all three levels are present — a property we cannot place
 * is left out of the nav rather than dropped into a blank or "Undefined" branch.
 * Leading/trailing slashes are tolerated; any extra segments are folded into the
 * property part so a deeper path still lands under the right city.
 */
export function parseSlug(slug: unknown): ParsedSlug | null {
  const parts = str(slug).split('/').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  return {
    state: parts[0].toLowerCase(),
    city: parts[1].toLowerCase(),
    property: parts.slice(2).join('/'),
  };
}

export interface BuildTreeOptions {
  /**
   * Path the property pages live under, prefixed to every slug. The Duda dynamic
   * pages sit at `/storage-units/<slug>`, which is #02's default.
   *
   * Normalised before use, so `storage-units`, `/storage-units` and
   * `/storage-units/` all behave the same — a missing leading slash would make the
   * href relative to the current page, and a trailing one would double up into
   * `/storage-units//california/…`.
   */
  basePath?: string;
}

/** '' | 'x' | '/x' | '/x/' → '' | '/x'. */
export function normaliseBasePath(basePath: string): string {
  const trimmed = basePath.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** Row shape this module needs — a subset of a `Properties` collection row. */
export interface PropertyRowLike {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
}

/**
 * Group property rows into state → city → property.
 *
 * Everything is sorted alphabetically by label at each level, so the menu order
 * is stable regardless of the order the collection hands rows back in.
 */
export function buildLocationTree(
  rows: PropertyRowLike[],
  opts: BuildTreeOptions = {},
): NavState[] {
  const base = normaliseBasePath(opts.basePath ?? '');
  const states = new Map<string, { label: string; cities: Map<string, { label: string; properties: NavProperty[] }> }>();

  for (const row of rows) {
    const parsed = parseSlug(row.slug);
    if (!parsed) continue;

    let state = states.get(parsed.state);
    if (!state) {
      state = { label: slugLabel(parsed.state), cities: new Map() };
      states.set(parsed.state, state);
    }

    let city = state.cities.get(parsed.city);
    if (!city) {
      city = { label: slugLabel(parsed.city), properties: [] };
      state.cities.set(parsed.city, city);
    }

    const slug = str(row.slug).replace(/^\/+|\/+$/g, '');
    city.properties.push({
      id: str(row.id),
      // Real name first — see the header note on stale slugs.
      label: str(row.name) || propertySlugLabel(parsed.property),
      href: `${base}/${slug}`,
      slug,
    });
  }

  const byLabel = <T extends { label: string }>(a: T, b: T) => a.label.localeCompare(b.label);

  return [...states.entries()]
    .map(([key, s]) => ({
      key,
      label: s.label,
      cities: [...s.cities.entries()]
        .map(([cityKey, c]) => ({
          key: cityKey,
          label: c.label,
          properties: [...c.properties].sort(byLabel),
        }))
        .sort(byLabel),
    }))
    .sort(byLabel);
}

/**
 * The location tree straight from the `Properties` collection.
 *
 * Fails soft to [] — no dmAPI (Duda editor / dev harness), collection missing, or
 * no row carrying a usable slug — so the caller keeps its own fallback menu.
 */
export async function fetchLocationTree(
  widgetTag: string,
  opts: BuildTreeOptions & { collectionName?: string } = {},
): Promise<NavState[]> {
  const { collectionName = PROPERTIES_COLLECTION, ...treeOpts } = opts;

  if (!hasCollectionsApi()) {
    logSource(widgetTag, 'location tree', false, 'no dmAPI — not on a published Duda page');
    return [];
  }

  const rows = await readCollection(collectionName);
  const tree = buildLocationTree(rows as PropertyRowLike[], treeOpts);

  if (!tree.length) {
    logSource(
      widgetTag, 'location tree', false,
      rows.length
        ? `${collectionName} has ${rows.length} row(s) but none with a state/city/property slug`
        : `${collectionName} empty or missing`,
    );
    return [];
  }

  const counts = tree.reduce(
    (acc, s) => {
      acc.cities += s.cities.length;
      acc.props += s.cities.reduce((n, c) => n + c.properties.length, 0);
      return acc;
    },
    { cities: 0, props: 0 },
  );
  logSource(
    widgetTag, 'location tree', true,
    `${collectionName} → ${tree.length} state(s), ${counts.cities} cities, ${counts.props} properties`,
  );
  return tree;
}
