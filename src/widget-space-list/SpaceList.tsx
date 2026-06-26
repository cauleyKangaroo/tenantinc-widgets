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
import { PROMOTION_OPTIONS } from './data';
import { FilterPanel } from './components/FilterPanel';
import { FilterModal } from './components/FilterModal';
import { TopFilterBar } from './components/TopFilterBar';
import { GridView } from './components/GridView';
import { ListView } from './components/ListView';
import { SectionAccordion } from './components/SectionAccordion';
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { writeFiltersToUrl(filters); }, [filters]);

  const amenityOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const u of units) {
      if (filters.types.length > 0 && !filters.types.includes(u.type)) continue;
      for (const a of u.amenities) {
        seen.add(a);
        if (seen.size >= 5) break;
      }
    }
    return Array.from(seen);
  }, [units, filters.types]);

  const featureOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const u of units) {
      if (filters.types.length > 0 && !filters.types.includes(u.type)) continue;
      for (const f of u.filterBarFeatures) seen.add(f);
    }
    return Array.from(seen).sort();
  }, [units, filters.types]);

  const visibleUnits = useMemo(() => filterUnits(units, filters, searchTerm), [units, filters, searchTerm]);
  const badge = activeFilterCount(filters);

  const sidebarFilterPanel = (
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

  const hasSections = isStore || isNearby || isReviews || isFAQ || isBlog || isSizeGuide;
  const sectionPanel = hasSections ? (
    <SectionAccordion
      isStore={isStore}
      isNearby={isNearby}
      isReviews={isReviews}
      isFAQ={isFAQ}
      isBlog={isBlog}
      isSizeGuide={isSizeGuide}
    />
  ) : null;

  // Section accordion always sits opposite the filter panel.
  // filter=right → accordion left | filter=left → accordion right | filter=top → accordion right
  let leftSlot: React.ReactNode  = null;
  let rightSlot: React.ReactNode = null;
  let topSlot: React.ReactNode   = null;

  if (filterPosition === 'top') {
    topSlot = (
      <>
        <TopFilterBar
          filters={filters}
          onChange={setFilters}
          featureOptions={featureOptions}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          panelOpen={panelOpen}
          onTogglePanel={() => setPanelOpen((o) => !o)}
        />
        {panelOpen && (
          <FilterModal
            filters={filters}
            onChange={setFilters}
            badge={badge}
            onClose={() => setPanelOpen(false)}
            onReset={() => setFilters(DEFAULT_FILTERS)}
            amenityOptions={amenityOptions}
            featureOptions={featureOptions}
            promotionOptions={PROMOTION_OPTIONS}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}
      </>
    );
    rightSlot = sectionPanel;
  } else if (filterPosition === 'left') {
    leftSlot  = sidebarFilterPanel;
    rightSlot = sectionPanel;
  } else {
    leftSlot  = sectionPanel;
    rightSlot = sidebarFilterPanel;
  }

  return (
    <div className={`sl-wrapper filter-${filterPosition}`}>
      {topSlot}
      <div className="sl-row">
        {leftSlot}
        <main className="sl-listing-area">
          {loading ? (
            <SkeletonLoader />
          ) : layoutMode === 'list' ? (
            <ListView units={visibleUnits} config={config} />
          ) : (
            <GridView units={visibleUnits} config={config} />
          )}
        </main>
        {rightSlot}
      </div>
    </div>
  );
}
