import type { Unit, SpaceType, UnitSize, SortBy, CategoryOrdering } from './types';
import { SIZE_ORDER } from './data';

// ---------------------------------------------------------------------------
// Filter state + logic
//
// Semantics:
//   • types     — multi select; empty = show all types. A unit must match at
//                 least one selected type.
//   • sizes     — multi select, OR within the group; empty = all sizes.
//   • features  — multi select, OR within the group; empty = all. A feature
//                 matches if the unit's subtype/features/amenities contain the
//                 feature's label (e.g. "Climate Controlled").
//   • amenities  — multi select, AND; a unit must have every checked amenity.
//   • promotions — multi select, OR; a unit must qualify for at least one
//                  checked promotion.
// ---------------------------------------------------------------------------

export interface FilterState {
  types: SpaceType[];
  sizes: UnitSize[];
  features: string[];
  amenities: string[];
  promotions: string[];
}

/** Default: no filters active — show everything. */
export const DEFAULT_FILTERS: FilterState = {
  types: [],
  sizes: [],
  features: [],
  amenities: [],
  promotions: [],
};

function unitMatchesFeature(unit: Unit, featureName: string): boolean {
  return (unit.filterBarFeatures ?? []).includes(featureName);
}

export function filterUnits(units: Unit[], f: FilterState, searchTerm = ''): Unit[] {
  const term = searchTerm.trim().toLowerCase();
  return units.filter((unit) => {
    if (f.types.length > 0 && !f.types.includes(unit.type)) return false;
    if (f.sizes.length > 0 && !f.sizes.includes(unit.size)) return false;
    if (f.features.length > 0 && !f.features.some((fv) => unitMatchesFeature(unit, fv))) {
      return false;
    }
    if (!f.amenities.every((a) => unit.amenities.includes(a))) return false;
    if (
      f.promotions.length > 0 &&
      !f.promotions.some((p) => (unit.promotions ?? []).includes(p))
    ) {
      return false;
    }
    if (term) {
      const haystack = [unit.dimensions, unit.subtype, ...unit.features].join(' ').toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
}

/**
 * A unit with nothing available to rent — either the API reports zero vacancy or
 * it's explicitly flagged as waitlist.
 *
 * Single source of truth for "unavailable", used by BOTH the listing filter and
 * the CTA button so they can't disagree (they previously used different tests:
 * the filter looked at `availability`, the button at `vacantCount`).
 *
 * Note the strict `=== 0`: the API mapper always sets vacantCount, but the demo
 * units in data.ts don't set it at all. Treating `undefined` as zero would mark
 * every demo unit unavailable and empty the listing whenever the waitlist is off.
 */
export function isUnavailable(u: Unit): boolean {
  return u.vacantCount === 0 || u.availability === 'waitlist';
}

/** Group units by size, preserving the canonical small→large order. */
export function groupBySize(units: Unit[]): { size: UnitSize; units: Unit[] }[] {
  return SIZE_ORDER.map((size) => ({
    size,
    units: units.filter((u) => u.size === size),
  })).filter((group) => group.units.length > 0);
}

// ---------------------------------------------------------------------------
// Ordering — `sortBy` (units within a group) + `categoryOrdering` (which
// category accordion comes first). Both come from Duda radio buttons.
// ---------------------------------------------------------------------------

/**
 * Floor area in sq ft, parsed from the unit's dimensions ("10' x 20'" → 200).
 *
 * Dimensions come straight from the API's tier description, so they're free text.
 * When they don't parse we fall back to the coarse size band's index, which keeps
 * ordering deterministic instead of arbitrary — note this mixes scales, so a
 * dimension-less unit sorts as if it were tiny. Every live tier we've seen parses.
 */
function unitArea(u: Unit): number {
  const m = u.dimensions.match(/(\d+(?:\.\d+)?)\s*['’]?\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (m) return parseFloat(m[1]) * parseFloat(m[2]);
  const idx = SIZE_ORDER.indexOf(u.size);
  return idx >= 0 ? idx : 0;
}

/** Order units by the editor's `sortBy` choice. Returns a new array. */
export function sortUnits(units: Unit[], sortBy: SortBy): Unit[] {
  const sorted = [...units];
  switch (sortBy) {
    case 'sizeDesc':
      return sorted.sort((a, b) => unitArea(b) - unitArea(a));
    case 'priceAsc':
      return sorted.sort((a, b) => a.startingPrice - b.startingPrice);
    case 'priceDesc':
      return sorted.sort((a, b) => b.startingPrice - a.startingPrice);
    case 'sizeAsc':
    default:
      return sorted.sort((a, b) => unitArea(a) - unitArea(b));
  }
}

/**
 * `groupBySize` + `sortBy` in one call — sorts the units, then groups them.
 *
 * Grouping preserves input order within each band, so sorting first is what
 * orders the cards inside an accordion. 'sizeDesc' additionally reverses the
 * bands so Extra Large leads; price sorts keep the canonical small→large bands.
 */
export function groupBySizeSorted(
  units: Unit[],
  sortBy: SortBy,
): { size: UnitSize; units: Unit[] }[] {
  const groups = groupBySize(sortUnits(units, sortBy));
  return sortBy === 'sizeDesc' ? groups.reverse() : groups;
}

/**
 * Order the top-level category accordions. `first` names the category the editor
 * wants to lead; the other follows.
 *
 * Any type we don't name (the API also returns 'commercial') keeps its relative
 * position at the end — Array#sort is stable, so unnamed types stay in the order
 * they appeared in the data.
 */
export function orderTypes(types: SpaceType[], first: CategoryOrdering): SpaceType[] {
  const preferred: string[] = first === 'parking' ? ['parking', 'storage'] : ['storage', 'parking'];
  const rank = (t: SpaceType) => {
    const i = preferred.indexOf(t);
    return i === -1 ? preferred.length : i;
  };
  return [...types].sort((a, b) => rank(a) - rank(b));
}

/** Badge count = number of active filter selections. */
export function activeFilterCount(f: FilterState): number {
  return (
    f.types.length +
    f.sizes.length +
    f.features.length +
    f.amenities.length +
    f.promotions.length
  );
}
