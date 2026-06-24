import React, { useEffect, useMemo, useState } from 'react';
import './SpaceList.css';
import type { SpaceListProps, WidgetConfig, Unit } from './types';
import { fetchSpaceGroups, mapApiToUnits } from './api';
import {
  DEFAULT_FILTERS,
  FilterState,
  filterUnits,
  activeFilterCount,
} from './filters';
import { readFiltersFromUrl, writeFiltersToUrl } from './urlFilters';
import { FilterPanel } from './components/FilterPanel';
import { GridView } from './components/GridView';
import { ListView } from './components/ListView';
import { APSections } from './components/APSections';
import { SkeletonLoader } from './components/SkeletonLoader';

export function SpaceList({
  layoutMode = 'grid',
  filterPosition = 'right',
  showInstorePrice = true,
  instorePriceLabel = 'IN-STORE',
  showJunkFeeDisclaimer = false,
  showUrgencyMessage = true,
  enableWaitlist = false,
  callOnLimitedAvailability = false,
  ctaButtonCopy = 'Select',
  isReviews   = false,
  isFeatures  = false,
  isNearby    = false,
  isSizeGuide = false,
  isBlog      = false,
  isStore     = false,
  isNotes     = false,
  isFAQ       = false,
  isHours     = false,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpaceGroups()
      .then((raw) => {
        const mapped = mapApiToUnits(raw);
        setLiveUnits(mapped);
      })
      .catch((err) => console.error('[SpaceList] fetchSpaceGroups error:', err))
      .finally(() => setLoading(false));
  }, []);

  const units = liveUnits;

  const [filters, setFilters] = useState<FilterState>(() => readFiltersFromUrl());
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { writeFiltersToUrl(filters); }, [filters]);

  const amenityOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const u of units) {
      if (filters.type !== 'all' && u.type !== filters.type) continue;
      for (const a of u.amenities) {
        seen.add(a);
        if (seen.size >= 5) break;
      }
    }
    return Array.from(seen);
  }, [units, filters.type]);

  const featureOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const u of units) {
      if (filters.type !== 'all' && u.type !== filters.type) continue;
      for (const f of u.filterBarFeatures) seen.add(f);
    }
    return Array.from(seen).sort();
  }, [units, filters.type]);

  const visibleUnits = useMemo(() => filterUnits(units, filters), [units, filters]);
  const badge = activeFilterCount(filters);

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

  const leftSlot  = filterPosition === 'left'  ? filterPanel : null;
  const rightSlot = filterPosition === 'right' ? filterPanel : null;
  const topSlot   = filterPosition === 'top'   ? filterPanel : null;

  return (
    <div className={`sl-wrapper filter-${filterPosition}`}>
      {topSlot}
      <div className="sl-row">
        {leftSlot}
        <main className="sl-listing-area">
          {loading ? (
            <SkeletonLoader />
          ) : layoutMode === 'list' ? (
            <ListView units={visibleUnits} config={config} type={filters.type} />
          ) : (
            <GridView units={visibleUnits} config={config} type={filters.type} />
          )}
        </main>
        {rightSlot}
      </div>
      <APSections
        isReviews={isReviews}
        isFeatures={isFeatures}
        isNearby={isNearby}
        isSizeGuide={isSizeGuide}
        isBlog={isBlog}
        isStore={isStore}
        isNotes={isNotes}
        isFAQ={isFAQ}
        isHours={isHours}
      />
    </div>
  );
}
