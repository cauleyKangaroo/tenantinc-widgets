import type { FilterState } from './filters';
import { DEFAULT_FILTERS } from './filters';
import type { FilterType, UnitSize } from './types';

// All URL params are prefixed so they don't clash with Duda page params.
// Example URL: ?sl_type=storage&sl_features=24+Hour+Access,Ground+Level

const P = 'sl_';

export function readFiltersFromUrl(): FilterState {
  try {
    const p = new URLSearchParams(window.location.search);

    const rawType = p.get(`${P}type`);
    const type: FilterType =
      rawType === 'storage' || rawType === 'parking' ? rawType : DEFAULT_FILTERS.type;

    const sizes = (p.get(`${P}sizes`) ?? '')
      .split(',')
      .filter(Boolean) as UnitSize[];

    const features = (p.get(`${P}features`) ?? '')
      .split(',')
      .filter(Boolean);

    const amenities = (p.get(`${P}amenities`) ?? '')
      .split(',')
      .filter(Boolean);

    return { type, sizes, features, amenities };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function writeFiltersToUrl(filters: FilterState): void {
  try {
    const p = new URLSearchParams(window.location.search);

    if (filters.type === 'all') {
      p.delete(`${P}type`);
    } else {
      p.set(`${P}type`, filters.type);
    }

    if (filters.sizes.length === 0) {
      p.delete(`${P}sizes`);
    } else {
      p.set(`${P}sizes`, filters.sizes.join(','));
    }

    if (filters.features.length === 0) {
      p.delete(`${P}features`);
    } else {
      p.set(`${P}features`, filters.features.join(','));
    }

    if (filters.amenities.length === 0) {
      p.delete(`${P}amenities`);
    } else {
      p.set(`${P}amenities`, filters.amenities.join(','));
    }

    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  } catch {
    // Silently fail if replaceState isn't available (e.g. sandboxed iframe).
  }
}
