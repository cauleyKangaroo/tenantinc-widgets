import React, { useMemo, useState } from 'react';
import './SpaceList.css';
import type { SpaceListProps } from './types';
import { DEMO_UNITS } from './data';
import {
  DEFAULT_FILTERS,
  FilterState,
  filterUnits,
  activeFilterCount,
} from './filters';
import { FilterPanel } from './components/FilterPanel';
import { GridView } from './components/GridView';
import { ListView } from './components/ListView';

export function SpaceList({ layoutMode = 'grid', filterPosition = 'right' }: SpaceListProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [collapsed, setCollapsed] = useState(false);

  // DEMO_UNITS is the static data seam — see data.ts / HANDOFF.md.
  const visibleUnits = useMemo(() => filterUnits(DEMO_UNITS, filters), [filters]);
  const badge = activeFilterCount(filters);

  return (
    <div className={`suf-wrapper filter-${filterPosition}`}>
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        badge={badge}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      <main className="suf-listing-area">
        {layoutMode === 'list' ? (
          <ListView units={visibleUnits} />
        ) : (
          <GridView units={visibleUnits} />
        )}
      </main>
    </div>
  );
}
