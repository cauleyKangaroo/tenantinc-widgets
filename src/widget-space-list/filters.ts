import type { Unit, SpaceType, UnitSize } from './types';
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

/** Group units by size, preserving the canonical small→large order. */
export function groupBySize(units: Unit[]): { size: UnitSize; units: Unit[] }[] {
  return SIZE_ORDER.map((size) => ({
    size,
    units: units.filter((u) => u.size === size),
  })).filter((group) => group.units.length > 0);
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
