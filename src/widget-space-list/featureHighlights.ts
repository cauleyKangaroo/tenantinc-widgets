// ===========================================================================
// Feature Highlights — the sidebar accordion that turns the property landing
// page into a single-feature landing page (Figma 10550-32752).
//
// Clicking a highlight puts `?feature=<snake_case>` on the URL. From there the
// widget:
//   • retitles its <h1> after the feature,
//   • prints the feature's copy under the heading and again under the listing,
//   • locks the listing to units that HAVE that feature, and
//   • drops that feature's own pill from the filter bar — it can't be un-ticked,
//     it IS the page. (Every OTHER pill keeps working, so a visitor can still
//     narrow a feature page by size/amenity.)
//
// TWO SEPARATE THINGS, deliberately:
//
//   • WHICH features exist is LIVE — every amenity flagged `show_in_filter_bar`
//     on this property's tiers, i.e. exactly what the filter bar offers as pills
//     (`collectFilterBarFeatures`). Nothing is hardcoded.
//   • WHAT each one SAYS comes from `FEATURE_COPY` below, joined to the live
//     label by slug. A live feature with no authored entry still gets a row and
//     still filters; it just gets a one-line generated description and no
//     under-listing block, so a gap in the copy is visible rather than filled
//     with plausible filler.
//
// `FEATURE_COPY` moves to a Duda collection later — `name`, `description`,
// `detailsTitle` and `details` are the columns — which is why the copy lives in
// this data module and not inside the components.
// ===========================================================================

import type { Unit } from './types';

/** The URL param the whole feature-page mode hangs off. */
export const FEATURE_PARAM = 'feature';

export interface FeatureHighlight {
  /**
   * snake_case identity, and what appears in the URL. Derived from `name` by
   * `featureSlug` so a row can never carry a slug that disagrees with its label.
   */
  slug: string;
  /** Display label — the accordion row, and what's matched against unit data. */
  name: string;
  /**
   * Alternate spellings this feature answers to in the unit data. The API's
   * amenity names are operator-entered ("Drive Up" vs the Figma's "Drive-Up",
   * "Climate Control" vs "Climate Controlled"), so a single label would filter
   * to nothing on half the properties.
   */
  aliases?: string[];
  /**
   * Verbatim <h1> for this feature's page. Blank composes
   * "<name> Storage Units in <property>", so the heading keeps naming the
   * location the way the unfiltered page does.
   */
  heading?: string;
  /** Paragraph under the heading. */
  description: string;
  /** Optional heading for the block under the listing. */
  detailsTitle?: string;
  /** Long-form copy under the listing. Rich text once it comes from Duda. */
  details: string;
}

/** "Climate Controlled" → "climate_controlled"; "Drive-Up" → "drive_up". */
export function featureSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// ---------------------------------------------------------------------------
// Authored copy, keyed by feature
//
// NOT the list of rows — the property's own filter-bar amenities are. This is
// the prose looked up for each of them, and an entry for a feature the property
// doesn't have simply never gets used. The first three are the Figma's; the rest
// cover common amenity names so there's something to read while this is wired up.
// ---------------------------------------------------------------------------

function feature(f: Omit<FeatureHighlight, 'slug'>): FeatureHighlight {
  return { ...f, slug: featureSlug(f.name) };
}

export const FEATURE_COPY: FeatureHighlight[] = [
  feature({
    name: 'Climate Controlled',
    aliases: ['Climate Control', 'Climate Controlled Units', 'Temperature Controlled'],
    description:
      'Climate controlled units hold a steady temperature and humidity year round, so heat, cold and damp never get a chance to work on what you store.',
    detailsTitle: 'Why choose a climate controlled unit?',
    details:
      'Anything made of wood, leather, paper, fabric or electronics reacts to temperature swings — timber warps, photographs stick together, screens and circuit boards corrode. A climate controlled unit keeps the air inside within a narrow band all year, which makes it the right choice for furniture, documents, instruments, artwork and anything you would not leave in a garage.\n\nUnits are inside the building and reached through a secured corridor, so they also stay cleaner and drier than a drive-up space. Availability is limited on most sites — the sizes above are the ones open right now at this facility.',
  }),
  feature({
    name: 'Drive-Up',
    aliases: ['Drive Up', 'Drive Up Access', 'Drive-Up Access'],
    description:
      'Pull your vehicle right up to the roll-up door and unload straight into the unit — no corridors, no lifts, no carrying boxes further than a step or two.',
    detailsTitle: 'Why choose a drive-up unit?',
    details:
      'Drive-up units sit at ground level with a wide roll-up door you can park directly in front of, which makes them the fastest option to load and the easiest to visit often. They suit bulky items, seasonal stock, tools and trade inventory — anything you would rather not carry.\n\nBecause access is from outside the building, drive-up units are not climate controlled. If you are storing electronics, documents or anything upholstered for a long stretch, compare these with the climate controlled sizes as well.',
  }),
  feature({
    name: 'RV Storage',
    aliases: ['RV Parking', 'RV', 'Recreational Vehicle', 'RV / Boat Storage'],
    description:
      'Purpose-built spaces for motorhomes, travel trailers, boats and oversized vehicles, with room to manoeuvre and gated access on the way in and out.',
    detailsTitle: 'Storing an RV, trailer or boat',
    details:
      'RV and boat spaces are sized by length rather than floor area, so measure from bumper to bumper — including any tongue, ladder or swim platform — and pick the next size up. Wider drive aisles mean you can back a long trailer in without a spotter.\n\nAll vehicle spaces sit inside the gated perimeter and are covered by the same access control and surveillance as the rest of the site. Registration and proof of insurance are needed at move-in for anything driven in.',
  }),
  feature({
    name: '24 Hour Access',
    aliases: ['24 Hour Access', '24/7 Access', '24 Hr Access', 'Extended Access Hours'],
    description:
      'Reach your unit whenever it suits you — these spaces are on the round-the-clock access schedule rather than office hours.',
    detailsTitle: 'Round-the-clock access',
    details:
      'Your gate code works at any hour, which matters if you run a business out of your unit, work shifts, or simply want to avoid the weekend queue. The gate, cameras and lighting stay live the whole time.\n\nOffice hours still apply for anything that needs a person — new rentals, transfers, buying a lock or signing for a delivery.',
  }),
  feature({
    name: 'Ground Floor',
    aliases: ['Ground Level', 'First Floor', 'Ground Floor Unit'],
    description:
      'Every unit on this page is on the ground floor, reached on the level with no stairs and no lift.',
    detailsTitle: 'Ground floor units',
    details:
      'A ground floor unit is the easiest to move in and out of: trolleys roll straight from the loading bay to your door, and nothing has to be lifted or turned to fit through a lift.\n\nThey are the usual pick for heavy furniture, white goods and appliances, and for anyone who visits their unit regularly.',
  }),
];

// ---------------------------------------------------------------------------
// Building the rows from live data
// ---------------------------------------------------------------------------

/**
 * Every amenity name the filter bar can offer, across all of this property's
 * units — the same `show_in_filter_bar === 1` source the pills come from (see
 * `filterBarFeatures` in api.ts).
 *
 * Deliberately NOT narrowed by the active type filter, the way SpaceList's own
 * `featureOptions` is. The accordion is NAVIGATION: a visitor ticking "Parking"
 * must not make the row they are currently reading vanish, which on a feature
 * page would silently drop them back to the full listing mid-scroll.
 */
export function collectFilterBarFeatures(units: Unit[]): string[] {
  const seen = new Set<string>();
  for (const u of units) {
    for (const f of u.filterBarFeatures ?? []) {
      const label = f.trim();
      if (label) seen.add(label);
    }
  }
  return Array.from(seen).sort();
}

/**
 * One row per live filter-bar label, with authored copy joined on where it exists.
 *
 * The slug and the display name both come from the LIVE label, so the row reads
 * exactly what the pill reads and the URL is guessable from what's on screen.
 * The authored entry only contributes prose — plus its own name as an extra
 * alias, so a tier labelled "Climate Controlled" still matches a property whose
 * filter-bar amenity is called "Climate Control".
 */
export function buildFeatureHighlights(
  labels: string[],
  copy: FeatureHighlight[] = FEATURE_COPY,
): FeatureHighlight[] {
  return labels
    .map((label): FeatureHighlight => {
      const authored = copy.find((c) => featureMatchesLabel(c, label));
      return {
        slug: featureSlug(label),
        name: label,
        aliases: authored ? [authored.name, ...(authored.aliases ?? [])] : undefined,
        heading: authored?.heading,
        description: authored?.description ?? `Showing only spaces with ${label}.`,
        detailsTitle: authored?.detailsTitle,
        // Empty on purpose when unauthored: no block renders under the listing,
        // rather than a paragraph of filler pretending to be real copy.
        details: authored?.details ?? '',
      };
    })
    .filter((f) => f.slug);
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/** Every slug a feature answers to — its own plus its aliases'. */
function featureSlugs(f: FeatureHighlight): string[] {
  return [f.slug, ...(f.aliases ?? []).map(featureSlug)].filter(Boolean);
}

/**
 * Resolve a URL param to a feature. Exact slug match first; failing that, a
 * prefix match either way so a hand-typed or CMS-authored `?feature=climate_control`
 * still lands on "Climate Controlled". The 4-char floor keeps that tolerance from
 * matching on a stub like "rv".
 */
export function findFeature(
  features: FeatureHighlight[],
  raw: string | null | undefined,
): FeatureHighlight | null {
  const want = featureSlug(raw ?? '');
  if (!want) return null;

  const exact = features.find((f) => featureSlugs(f).includes(want));
  if (exact) return exact;

  if (want.length < 4) return null;
  return (
    features.find((f) =>
      featureSlugs(f).some((s) => s.length >= 4 && (s.startsWith(want) || want.startsWith(s))),
    ) ?? null
  );
}

/**
 * Which live features have no authored copy, and which authored rows reach no
 * live feature. Diagnostic only — "my description isn't showing" is nearly
 * always a `name` column that doesn't match the amenity, and the join is silent
 * by design (a missing row still renders a working row).
 */
export function copyCoverage(
  labels: string[],
  copy: FeatureHighlight[],
): { missingCopy: string[]; unusedRows: string[] } {
  const authored = new Set(copy.flatMap(featureSlugs));
  const live = new Set(labels.map(featureSlug).filter(Boolean));
  return {
    missingCopy: labels.filter((l) => {
      const slug = featureSlug(l);
      return slug && !authored.has(slug);
    }),
    unusedRows: copy.filter((c) => !featureSlugs(c).some((s) => live.has(s))).map((c) => c.name),
  };
}

/** Does this filter-bar/amenity label name the given feature? */
export function featureMatchesLabel(f: FeatureHighlight, label: string): boolean {
  return featureSlugs(f).includes(featureSlug(label));
}

/**
 * Does this unit have the feature?
 *
 * Checked against every descriptive list the unit carries — not just
 * `filterBarFeatures` the way the filter-bar pills are (see filters.ts) —
 * because a feature PAGE has to work off whatever the operator happened to fill
 * in, and `show_in_filter_bar` is opt-in per amenity. Comparison is on slugs, so
 * "Drive Up" and "Drive-Up" are the same thing.
 */
export function unitHasFeature(unit: Unit, f: FeatureHighlight): boolean {
  const wanted = new Set(featureSlugs(f));
  const labels = [
    unit.subtype,
    ...(unit.filterBarFeatures ?? []),
    ...(unit.amenities ?? []),
    ...(unit.features ?? []),
  ];
  return labels.some((l) => l && wanted.has(featureSlug(l)));
}

// ---------------------------------------------------------------------------
// URL
// ---------------------------------------------------------------------------

export function readFeatureFromUrl(): string | null {
  try {
    return new URLSearchParams(window.location.search).get(FEATURE_PARAM) || null;
  } catch {
    return null;
  }
}

/**
 * Put the feature on the URL (or take it off).
 *
 * `pushState`, not the `replaceState` the size/type filters use: a feature page
 * is a different page as far as a visitor is concerned, so Back has to return to
 * the full listing. SpaceList listens for `popstate` to stay in step.
 */
export function writeFeatureToUrl(slug: string | null): void {
  try {
    const p = new URLSearchParams(window.location.search);
    if (slug) p.set(FEATURE_PARAM, slug);
    else p.delete(FEATURE_PARAM);
    const qs = p.toString();
    window.history.pushState(null, '', qs ? `?${qs}` : window.location.pathname);
  } catch {
    // Sandboxed iframe / no history API — selection still works in-memory.
  }
}
