import type { Unit, FilterType, UnitSize } from './types';
import { SIZE_ORDER } from './data';

// ---------------------------------------------------------------------------
// Filter state + logic
//
// Semantics (documented so they're easy to tune for production):
//   • type      — single select; a unit must match the chosen type.
//   • sizes     — multi select, OR within the group; empty = all sizes.
//   • features  — multi select, OR within the group; empty = all. A feature
//                 matches if the unit's subtype/features/amenities contain the
//                 feature's label (e.g. "Climate Controlled").
//   • amenities — multi select, AND; a unit must have every checked amenity.
// ---------------------------------------------------------------------------

export interface FilterState {
  type: FilterType;
  sizes: UnitSize[];
  features: string[]; // FEATURE_OPTIONS values, e.g. 'climate'
  amenities: string[]; // amenity labels, e.g. 'Smart Phone Access'
}

/** Mirrors the original widget's default active pills / checked boxes. */
export const DEFAULT_FILTERS: FilterState = {
  type: 'all',
  sizes: [],
  features: [],
  amenities: [],
};

function unitMatchesFeature(unit: Unit, featureName: string): boolean {
  return (unit.filterBarFeatures ?? []).includes(featureName);
}

export function filterUnits(units: Unit[], f: FilterState, searchTerm = ''): Unit[] {
  const term = searchTerm.trim().toLowerCase();
  return units.filter((unit) => {
    if (f.type !== 'all' && unit.type !== f.type) return false;
    if (f.sizes.length > 0 && !f.sizes.includes(unit.size)) return false;
    if (f.features.length > 0 && !f.features.some((fv) => unitMatchesFeature(unit, fv))) {
      return false;
    }
    if (!f.amenities.every((a) => unit.amenities.includes(a))) return false;
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

/**
 * Badge count = number of active filters, matching the original widget which
 * counted active pills (type + sizes + features) plus checked amenity boxes.
 */
export function activeFilterCount(f: FilterState): number {
  return 1 /* type is always one active pill */ + f.sizes.length + f.features.length + f.amenities.length;
}
