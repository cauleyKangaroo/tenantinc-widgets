// Filter panel (Figma 10557:146492) — state, derived options, and the matching.
//
// #08 filters PROPERTIES but every facet except distance describes a UNIT, so a
// property matches when AT LEAST ONE of its spaces does. That's deliberate: a
// facility with one climate-controlled 5x5 genuinely is a result for "Climate
// Controlled", and hiding it because its other units aren't would be wrong.
//
// Options are DERIVED from the loaded spaces, not hardcoded, so the panel can
// never offer a facet that matches nothing. Price and distance stay fixed lists
// — they're ranges the design specifies, not facets present in the data.

import type { CityFacility, CityUnit } from './data';

export interface FilterState {
  types: string[];
  sizes: string[];
  features: string[];
  amenities: string[];
  promotions: string[];
  minPrice: string;
  maxPrice: string;
  maxDistance: string;
}

/** Size pills, in ascending order — a derived set would sort alphabetically
 *  ("Large, Medium, Small"), which reads as nonsense on a size control. */
export const SIZE_ORDER = ['Small', 'Medium', 'Large'];

export const PRICE_OPTIONS = ['$0', '$50', '$100', '$250', '$500', '$1,000', '$2,000'];
export const DISTANCE_OPTIONS = ['5 miles', '10 miles', '20 miles', '50 miles'];

/**
 * Nothing pre-selected.
 *
 * The Figma frame shows pills already active, and this used to copy that — but
 * that's the DESIGN illustrating its own states, not a sane default. Now the
 * facets really filter, opening the page with five of them on would hide most
 * of the city's properties before the visitor touched anything.
 */
export const INITIAL_FILTERS: FilterState = {
  types: [],
  sizes: [],
  features: [],
  amenities: [],
  promotions: [],
  minPrice: '',
  maxPrice: '',
  maxDistance: '',
};

/** Count shown in the badge — one per active facet, plus the ranges when set. */
export function activeFilterCount(f: FilterState): number {
  return f.types.length + f.sizes.length + f.features.length
    + f.amenities.length + f.promotions.length
    + (f.minPrice ? 1 : 0) + (f.maxPrice ? 1 : 0) + (f.maxDistance ? 1 : 0);
}

/** "$1,000" → 1000; "" / unparseable → null (meaning "no bound"). */
export function parseMoney(v: string): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** "20 miles" → 20; "" → null. */
export function parseMiles(v: string): number | null {
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Derived options
// ---------------------------------------------------------------------------

export interface FilterOptions {
  types: string[];
  sizes: string[];
  features: string[];
  amenities: string[];
  promotions: string[];
}

function uniqueSorted(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
}

/** Every facet actually present across the city's spaces. */
export function deriveFilterOptions(facilities: CityFacility[]): FilterOptions {
  const units = facilities.flatMap((f) => f.units);
  return {
    types: uniqueSorted(units.map((u) => u.spaceType)),
    // Ordered small→large rather than alphabetically; see SIZE_ORDER.
    sizes: SIZE_ORDER.filter((s) => units.some((u) => u.sizeBucket === s)),
    features: uniqueSorted(units.flatMap((u) => u.features ?? [])),
    amenities: uniqueSorted(units.flatMap((u) => u.amenities ?? [])),
    // Promotions are a property-level banner as well as a unit field, so read
    // both — a facility can carry a promo its individual tiers don't repeat.
    promotions: uniqueSorted([
      ...facilities.map((f) => f.promo),
      ...units.map((u) => u.promo),
    ]),
  };
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/** Does one space satisfy every ACTIVE unit-level facet? (AND across facets.) */
function unitMatches(u: CityUnit, f: FilterState, min: number | null, max: number | null): boolean {
  if (f.types.length && !(u.spaceType && f.types.includes(u.spaceType))) return false;
  if (f.sizes.length && !(u.sizeBucket && f.sizes.includes(u.sizeBucket))) return false;
  // Features/amenities are OR within a facet: ticking two shows units with
  // either, which is what a visitor broadening a search expects.
  if (f.features.length && !f.features.some((v) => (u.features ?? []).includes(v))) return false;
  if (f.amenities.length && !f.amenities.some((v) => (u.amenities ?? []).includes(v))) return false;
  // Price bounds apply to what the customer would actually pay today. A unit
  // with no price (0) is excluded from a bounded search rather than treated as
  // free — otherwise "under $50" would surface every unpriced tier.
  if (min != null || max != null) {
    const p = u.startingPrice;
    if (!(p > 0)) return false;
    if (min != null && p < min) return false;
    if (max != null && p > max) return false;
  }
  return true;
}

/**
 * The spaces a card actually lists, per the design: three, with "See All
 * Spaces" beneath for the rest. Live properties carry 26–38 tiers, so this is
 * a display cap only — `facility.units` keeps them all, because the filters
 * match against the full set (cap in the data instead and filtering by
 * "Parking" would miss a property whose three cheapest happen to be storage).
 *
 * WHICH three: the cheapest, so the card leads with the best value — matching
 * `priceLabel` (also the cheapest) and #05's nearby cards.
 *
 * When unit facets are active, only MATCHING spaces are eligible. Showing three
 * storage units to someone who filtered for Parking would look like the filter
 * was ignored.
 */
export function visibleUnits(fac: CityFacility, f: FilterState, limit = 3): CityUnit[] {
  const min = parseMoney(f.minPrice);
  const max = parseMoney(f.maxPrice);
  const unitFacetsActive =
    f.types.length || f.sizes.length || f.features.length || f.amenities.length
    || min != null || max != null;

  const eligible = unitFacetsActive
    ? fac.units.filter((u) => unitMatches(u, f, min, max))
    : fac.units;

  // Priced units first, cheapest to dearest; unpriced ones sink rather than
  // leading the card with "$0".
  return [...eligible]
    .sort((a, b) => {
      const pa = a.startingPrice > 0 ? a.startingPrice : Infinity;
      const pb = b.startingPrice > 0 ? b.startingPrice : Infinity;
      return pa - pb;
    })
    .slice(0, limit);
}

/**
 * The facilities a visitor should see.
 *
 * Distance is facility-level and only applied when the distance is KNOWN — an
 * unknown one (NaN: no visitor location, or a property with no coordinates)
 * must not be filtered out, or setting a radius would empty the page on data
 * that simply lacks lat/lng.
 */
export function filterFacilities(facilities: CityFacility[], f: FilterState): CityFacility[] {
  const min = parseMoney(f.minPrice);
  const max = parseMoney(f.maxPrice);
  const maxMiles = parseMiles(f.maxDistance);
  const unitFacetsActive =
    f.types.length || f.sizes.length || f.features.length || f.amenities.length
    || min != null || max != null;

  return facilities.filter((fac) => {
    if (maxMiles != null && Number.isFinite(fac.distanceMiles) && fac.distanceMiles > maxMiles) {
      return false;
    }
    if (f.promotions.length) {
      const promos = [fac.promo, ...fac.units.map((u) => u.promo)].filter(Boolean) as string[];
      if (!f.promotions.some((p) => promos.includes(p))) return false;
    }
    if (!unitFacetsActive) return true;
    return fac.units.some((u) => unitMatches(u, f, min, max));
  });
}
