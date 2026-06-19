import React, { useEffect, useMemo, useState } from 'react';
import './SpaceList.css';
import type { SpaceListProps, AdditionalPanelPosition, WidgetConfig, Unit } from './types';
import { fetchSpaceGroups, mapApiToUnits } from './api';
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
import { SectionAccordion } from './components/SectionAccordion';

/**
 * Decide where the Additional Panel actually renders.
 * - null  → AP hidden (not active).
 * - Otherwise the requested position, except a side that collides with the
 *   filter panel falls back to 'bottom' (defensive — Duda "Show if" should
 *   already prevent the collision, but never let the AP vanish or overlap).
 */
function resolveApPosition(
  filterPosition: 'left' | 'top' | 'right',
  active: boolean,
  apPosition: AdditionalPanelPosition
): AdditionalPanelPosition | null {
  if (!active) return null;
  if (apPosition === filterPosition) return 'bottom';
  return apPosition;
}

export function SpaceList({
  layoutMode = 'grid',
  filterPosition = 'right',
  additionalPanelMode = 'single',
  additionalPanelSection,
  additionalPanelPosition = 'bottom',
  panelOrder,
  showInstorePrice = true,
  instorePriceLabel = 'IN-STORE',
  showJunkFeeDisclaimer = false,
  showUrgencyMessage = true,
  enableWaitlist = false,
  callOnLimitedAvailability = false,
  ctaButtonCopy = 'Select',
}: SpaceListProps) {
  const config: WidgetConfig = {
    showInstorePrice,
    instorePriceLabel,
    showJunkFeeDisclaimer,
    showUrgencyMessage,
    enableWaitlist,
    callOnLimitedAvailability,
    ctaButtonCopy,
  };
  const [liveUnits, setLiveUnits] = useState<Unit[]>([]);

  useEffect(() => {
    fetchSpaceGroups()
      .then((raw) => {
        console.log('[SpaceList] raw space groups:', raw);
        const mapped = mapApiToUnits(raw);
        console.log('[SpaceList] mapped units:', mapped);
        setLiveUnits(mapped);
      })
      .catch((err) => console.error('[SpaceList] fetchSpaceGroups error:', err));
  }, []);

  const units = liveUnits;

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [collapsed, setCollapsed] = useState(false);

  const amenityOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const u of units) {
      for (const a of u.amenities) seen.add(a);
    }
    return Array.from(seen).sort();
  }, [units]);

  const featureOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const u of units) {
      if (u.type !== filters.type) continue;
      for (const f of u.filterBarFeatures) seen.add(f);
    }
    return Array.from(seen).sort();
  }, [units, filters.type]);

  const visibleUnits = useMemo(() => filterUnits(units, filters), [units, filters]);
  const badge = activeFilterCount(filters);

  // 'all' mode always shows the accordion; 'single' mode needs a valid section.
  const apActive =
    additionalPanelMode === 'all' || !!getSection(additionalPanelSection);
  const apPos = resolveApPosition(filterPosition, apActive, additionalPanelPosition);

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
      amenityOptions={amenityOptions}
      featureOptions={featureOptions}
    />
  );

  const additionalPanel = apPos ? (
    <aside className={`suf-additional-panel ap-${apPos}`}>
      {additionalPanelMode === 'all' ? (
        <SectionAccordion order={panelOrder} />
      ) : (
        <SectionPanel section={additionalPanelSection} />
      )}
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
            <ListView units={visibleUnits} config={config} type={filters.type} />
          ) : (
            <GridView units={visibleUnits} config={config} type={filters.type} />
          )}
        </main>
        {rightSlot}
      </div>
      {bottomSlot}
    </div>
  );
}
