import React, { useEffect, useMemo, useState } from 'react';
import './SpaceList.css';
import type { SpaceListProps, WidgetConfig, Unit } from './types';
import cfg from './config.json';
import { fetchSpaceGroups, mapApiToUnits } from './api';
import {
  DEFAULT_FILTERS,
  FilterState,
  filterUnits,
  activeFilterCount,
} from './filters';
import { readFiltersFromUrl, writeFiltersToUrl } from './urlFilters';
import { PROMOTION_OPTIONS } from './data';
import { FilterModal } from './components/FilterModal';
import { TopFilterBar } from './components/TopFilterBar';
import { GridView } from './components/GridView';
import { ListView } from './components/ListView';
import { SectionAccordion } from './components/SectionAccordion';
import { ReorderModal } from './components/ReorderModal';
import { SkeletonLoader } from './components/SkeletonLoader';
import { ACCORDION_SECTIONS, type AccordionConfig } from './accordionSections';
import { instanceKey, readAccordionConfig, saveAccordionConfig } from './accordionConfigApi';

export function SpaceList({
  layoutMode = 'grid',
  apLocation = 'right',
  showInstorePrice = true,
  instorePriceLabel = 'IN-STORE',
  showJunkFeeDisclaimer = false,
  showUrgencyMessage = true,
  enableWaitlist = false,
  callOnLimitedAvailability = false,
  ctaButtonCopy = 'Select',
  inEditor    = false,
  elementId,
  siteId,
  configApiUrl,
  configCollection = 'accordionConfig',
}: SpaceListProps) {
  // Section visibility + order are managed entirely in the "Manage accordions"
  // modal (persisted to the collection), not via content-panel isX toggles.
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Per-instance accordion arrangement (order + hidden). Read from Duda on
  // mount (step: collections read); null until then = default order, none hidden.
  const [accordionConfig, setAccordionConfig] = useState<AccordionConfig | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => { writeFiltersToUrl(filters); }, [filters]);

  // Read this instance's saved arrangement from the Duda collection on mount.
  // No-ops (keeps defaults) when not in Duda or ids are missing.
  useEffect(() => {
    const key = instanceKey(siteId, elementId);
    if (!key) return;
    let cancelled = false;
    readAccordionConfig(configCollection, key).then((cfg) => {
      if (!cancelled && cfg) setAccordionConfig(cfg);
    });
    return () => { cancelled = true; };
  }, [siteId, elementId, configCollection]);

  // Save the arrangement. With no endpoint/ids (dev harness, not in Duda) we
  // just apply locally. Otherwise POST to the PHP proxy and only commit + close
  // on success; on failure keep the modal open with an inline error to retry.
  async function handleSaveConfig(next: AccordionConfig) {
    setSaveError(null);
    const key = instanceKey(siteId, elementId);
    if (!configApiUrl || !key || !siteId || !elementId) {
      setAccordionConfig(next);
      setReorderOpen(false);
      return;
    }
    setSavingConfig(true);
    try {
      await saveAccordionConfig({ endpoint: configApiUrl, siteId, elementId, config: next });
      setAccordionConfig(next);
      setReorderOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed. Please try again.');
    } finally {
      setSavingConfig(false);
    }
  }

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
  const totalVacant = units.reduce((sum, u) => sum + (u.vacantCount ?? 0), 0);

  const sectionPanel = (
    <SectionAccordion
      config={accordionConfig}
      inEditor={inEditor}
      onReorderClick={() => { setSaveError(null); setReorderOpen(true); }}
    />
  );

  // Filters always render as a top bar inside the main content column so they
  // line up with the title and the listing below them.
  const topBar = (
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

  // Filters are always a top bar inside the listing column; the accordion panel
  // sits on whichever side apLocation specifies.
  return (
    <div className={`sl-wrapper filter-top ap-${apLocation}`}>
      <div className="sl-heading">
        <p className="sl-select-heading">Select a Space {totalVacant > 0 && `— ${totalVacant} Available`}</p>
        <p className="sl-page-title">Storage Units in {cfg.propertyName}</p>
      </div>
      <div className="sl-row">
        {apLocation === 'left' && sectionPanel}
        <main className="sl-listing-area">
          {topBar}
          {loading ? (
            <SkeletonLoader />
          ) : layoutMode === 'list' ? (
            <ListView units={visibleUnits} config={config} />
          ) : (
            <GridView units={visibleUnits} config={config} />
          )}
        </main>
        {apLocation === 'right' && sectionPanel}
      </div>
      {reorderOpen && (
        <ReorderModal
          sections={ACCORDION_SECTIONS}
          config={accordionConfig}
          onClose={() => setReorderOpen(false)}
          onSave={handleSaveConfig}
          saving={savingConfig}
          error={saveError}
        />
      )}
    </div>
  );
}
