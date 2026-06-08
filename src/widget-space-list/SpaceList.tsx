import React, { useMemo, useState } from 'react';
import './SpaceList.css';
import type { SpaceListProps, AdditionalPanelPosition } from './types';
import { DEMO_UNITS } from './data';
import {
  DEFAULT_FILTERS,
  FilterState,
  filterUnits,
  activeFilterCount,
} from './filters';
import { getSection } from './sections';
import { FilterPanel } from './components/FilterPanel';
import { GridView } from './components/GridView';
import { ListView } from './components/ListView';
import { SectionPanel } from './components/SectionPanel';

/**
 * Decide where the Additional Panel actually renders.
 * - null  → AP hidden (no section selected, or unknown key).
 * - Otherwise the requested position, except a side that collides with the
 *   filter panel falls back to 'bottom' (defensive — Duda "Show if" should
 *   already prevent the collision, but never let the AP vanish or overlap).
 */
function resolveApPosition(
  filterPosition: 'left' | 'top' | 'right',
  apSection: string | undefined,
  apPosition: AdditionalPanelPosition
): AdditionalPanelPosition | null {
  if (!getSection(apSection)) return null;
  if (apPosition === filterPosition) return 'bottom';
  return apPosition;
}

export function SpaceList({
  layoutMode = 'grid',
  filterPosition = 'right',
  additionalPanelSection,
  additionalPanelPosition = 'bottom',
}: SpaceListProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [collapsed, setCollapsed] = useState(false);

  // DEMO_UNITS is the static data seam — see data.ts / HANDOFF.md.
  const visibleUnits = useMemo(() => filterUnits(DEMO_UNITS, filters), [filters]);
  const badge = activeFilterCount(filters);

  const apPos = resolveApPosition(filterPosition, additionalPanelSection, additionalPanelPosition);

  // The three regions — filter panel, additional panel, and the listing — are
  // placed into shell slots below. The filter panel is just the filter panel.
  const filterPanel = (
    <FilterPanel
      filters={filters}
      onChange={setFilters}
      badge={badge}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed((c) => !c)}
      onReset={() => setFilters(DEFAULT_FILTERS)}
    />
  );

  const additionalPanel = apPos ? (
    <aside className={`suf-additional-panel ap-${apPos}`}>
      <SectionPanel section={additionalPanelSection} />
    </aside>
  ) : null;

  const leftSlot =
    filterPosition === 'left' ? filterPanel : apPos === 'left' ? additionalPanel : null;
  const rightSlot =
    filterPosition === 'right' ? filterPanel : apPos === 'right' ? additionalPanel : null;
  const topSlot = filterPosition === 'top' ? filterPanel : null;
  const bottomSlot = apPos === 'bottom' ? additionalPanel : null;

  return (
    <div className={`suf-wrapper filter-${filterPosition}${apPos ? ` ap-${apPos}` : ''}`}>
      {topSlot}
      <div className="suf-row">
        {leftSlot}
        <main className="suf-listing-area">
          {layoutMode === 'list' ? (
            <ListView units={visibleUnits} />
          ) : (
            <GridView units={visibleUnits} />
          )}
        </main>
        {rightSlot}
      </div>
      {bottomSlot}
    </div>
  );
}
