import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './SpaceList.css';
import type { SpaceListProps, WidgetConfig, Unit } from './types';
import cfg from './config.json';
import { fetchSpaceGroups, mapApiToUnits } from './api';
import { fetchProperties, extractPropertyExtras, type PropertyExtras } from './propertyApi';
import {
  DEFAULT_FILTERS,
  FilterState,
  filterUnits,
  activeFilterCount,
  isUnavailable,
} from './filters';
import { readFiltersFromUrl, writeFiltersToUrl } from './urlFilters';
import { PROMOTION_OPTIONS } from './data';
import { FilterModal } from './components/FilterModal';
import { TopFilterBar } from './components/TopFilterBar';
import { GridView } from './components/GridView';
import { ListView } from './components/ListView';
import { DefaultView } from './components/DefaultView';
import { SectionAccordion } from './components/SectionAccordion';
import { ReorderModal } from './components/ReorderModal';
import { SkeletonLoader } from './components/SkeletonLoader';
import { ACCORDION_SECTIONS, type AccordionConfig } from './accordionSections';
import { instanceKey, readAccordionConfig, saveAccordionConfig } from './accordionConfigApi';
import { PROMO_EVENT, readPromoFromUrl, clearPromoInUrl, type PromoSelection } from '@shared/promoBus';

// Wrapper-width breakpoint below which we count as mobile. Keyed off the widget's
// own width, not the viewport, for the same reason as the CSS container queries:
// in Duda the widget often sits in a narrow column inside a wide window.
const MOBILE_BP = 640;

function useIsMobile(breakpoint: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      setIsMobile(entries[0].contentRect.width < breakpoint);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [breakpoint]);
  return { ref, isMobile };
}

export function SpaceList({
  layoutMode = 'grid',
  apLocation = 'right',
  showSideAccordions = true,
  showInstorePrice = true,
  instorePriceLabel = 'IN-STORE',
  instorePriceMode = 'percentOfWeb',
  instorePriceAmount = 0,
  showJunkFeeDisclaimer = false,
  junkFeeCopy = '',
  showUrgencyMessage = true,
  urgencyThreshold = 5,
  sortBy = 'sizeAsc',
  categoryOrdering = 'spaces',
  showUnavailableUnits = false,
  enableWaitlist = false,
  callOnLimitedAvailability = false,
  ctaButtonCopy = 'Select',
  limitedAvailabilityCopy = '',
  startingAtLabel = 'Starting at',
  showSizeGuideVideos = true,
  aboutTitle,
  aboutContent,
  notesContent,
  blogCollection,
  blogBasePath,
  inEditor    = false,
  elementId,
  siteId,
  configApiUrl,
  configCollection = 'accordionConfig',
}: SpaceListProps) {
  const [liveUnits, setLiveUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // The default layout has no mobile frame of its own — below MOBILE_BP it falls
  // back to the grid layout, which does.
  const { ref: wrapperRef, isMobile } = useIsMobile(MOBILE_BP);

  // Second API call: property FAQ / phone / socials for the sidebar accordion.
  // Null until loaded (or on failure) → sections fall back to their demo data.
  const [propertyExtras, setPropertyExtras] = useState<PropertyExtras | null>(null);

  // Section visibility + order are managed entirely in the "Manage accordions"
  // modal (persisted to the collection), not via content-panel isX toggles.
  // Declared after propertyExtras so the sold-out "Call" CTA can carry the same
  // number as the "Call our Storage Experts" card.
  const config: WidgetConfig = {
    showInstorePrice,
    instorePriceLabel,
    instorePriceMode,
    showJunkFeeDisclaimer,
    // Duda text fields arrive as '' until the editor types something, which a
    // default parameter won't catch — so fall back here to the standard wording.
    junkFeeCopy:
      junkFeeCopy.trim() ||
      '* Prices shown exclude applicable taxes and admin fees. Final price confirmed at checkout.',
    showUrgencyMessage,
    // Duda content-menu numbers can arrive as strings ("5") or blank, so floor it
    // to a positive integer and fall back to 5 on anything unusable.
    urgencyThreshold: (() => {
      const n = Math.floor(Number(urgencyThreshold));
      return Number.isFinite(n) && n > 0 ? n : 5;
    })(),
    // Radio values arrive as strings, and an untouched Duda control sends '' —
    // which a default parameter won't catch — so whitelist instead of trusting it.
    sortBy: (['sizeAsc', 'sizeDesc', 'priceAsc', 'priceDesc'] as const).includes(sortBy as never)
      ? (sortBy as WidgetConfig['sortBy'])
      : 'sizeAsc',
    categoryOrdering: categoryOrdering === 'parking' ? 'parking' : 'spaces',
    showUnavailableUnits,
    enableWaitlist,
    callOnLimitedAvailability,
    ctaButtonCopy,
    // Deliberately NO fallback: blank means the editor wants no note at all, so a
    // sold-out unit shows its CTA with nothing underneath. (The junk-fee field
    // still falls back — that one has standard legal wording worth defaulting to.)
    limitedAvailabilityCopy: limitedAvailabilityCopy.trim(),
    startingAtLabel,
    // Percent/currency amount for the in-store calc. Duda number fields arrive as
    // strings; anything unusable (blank, NaN, negative) means "don't calculate".
    instorePriceAmount: (() => {
      const n = Number(instorePriceAmount);
      return Number.isFinite(n) && n > 0 ? n : 0;
    })(),
    contactPhone: propertyExtras?.phones[0]?.number ?? '',
    facilityName: propertyExtras?.name ?? '',
  };

  useEffect(() => {
    fetchSpaceGroups()
      .then((raw) => {
        const mapped = mapApiToUnits(raw);
        setLiveUnits(mapped);
      })
      .catch((err) => console.error('[SpaceList] fetchSpaceGroups error:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchProperties()
      .then((raw) => {
        if (!cancelled) setPropertyExtras(extractPropertyExtras(raw));
      })
      .catch((err) => console.error('[SpaceList] fetchProperties error:', err));
    return () => { cancelled = true; };
  }, []);

  const units = liveUnits;

  const [filters, setFilters] = useState<FilterState>(() => readFiltersFromUrl());
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cross-widget promo filter: the Promotions widget's "See Qualifying Units"
  // sets this (event + URL param) to narrow the list to one promotion's units.
  const [promoId, setPromoId] = useState<string | null>(() => readPromoFromUrl());
  const [promoTitleFromEvent, setPromoTitleFromEvent] = useState<string | null>(null);

  useEffect(() => {
    const onShowPromo = (e: Event) => {
      const detail = (e as CustomEvent<PromoSelection>).detail;
      if (!detail) return;
      setPromoId(detail.promoId);
      setPromoTitleFromEvent(detail.promoTitle);
    };
    window.addEventListener(PROMO_EVENT, onShowPromo);
    return () => window.removeEventListener(PROMO_EVENT, onShowPromo);
  }, []);

  function clearPromoFilter() {
    setPromoId(null);
    setPromoTitleFromEvent(null);
    clearPromoInUrl();
  }

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

  const visibleUnits = useMemo(() => {
    let filtered = filterUnits(units, filters, searchTerm);
    // Cross-widget promo filter: only units allocated to the selected promotion.
    if (promoId) filtered = filtered.filter((u) => u.promoId === promoId);
    // Sold-out units are hidden unless showUnavailableUnits is on. Visibility is
    // this toggle's job ALONE — enableWaitlist no longer hides anything, it only
    // picks the CTA ("Join waitlist" vs "Call") for whatever is shown. So
    // showUnavailableUnits off + waitlist on still shows nothing sold out.
    return showUnavailableUnits ? filtered : filtered.filter((u) => !isUnavailable(u));
  }, [units, filters, searchTerm, showUnavailableUnits, promoId]);
  const badge = activeFilterCount(filters);
  const totalVacant = units.reduce((sum, u) => sum + (u.vacantCount ?? 0), 0);

  // Title for the active-promo banner: the event's title, else the promo name
  // carried on any matching unit (covers deep-links where only the id is known).
  const promoTitle = promoId
    ? (promoTitleFromEvent || units.find((u) => u.promoId === promoId)?.promo || 'Selected Promotion')
    : null;

  const sectionPanel = (
    <SectionAccordion
      config={accordionConfig}
      inEditor={inEditor}
      onReorderClick={() => { setSaveError(null); setReorderOpen(true); }}
      showSizeGuideVideos={showSizeGuideVideos}
      propertyExtras={propertyExtras}
      aboutTitle={aboutTitle}
      aboutContent={aboutContent}
      notesContent={notesContent}
      blogCollection={blogCollection}
      blogBasePath={blogBasePath}
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
        activeCount={badge}
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
    <div className={`sl-wrapper filter-top ap-${apLocation}`} ref={wrapperRef}>
      <div className="sl-heading">
        <p className="sl-select-heading">Select a Space {totalVacant > 0 && `— ${totalVacant} Available`}</p>
        <p className="sl-page-title">Storage Units in {propertyExtras?.name || cfg.propertyName}</p>
      </div>
      <div className="sl-row">
        {showSideAccordions && apLocation === 'left' && sectionPanel}
        <main className="sl-listing-area">
          {topBar}
          {promoId && (
            <div className="sl-promo-banner">
              <span className="sl-promo-banner-tag">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M21.41 11.58l-9-9A2 2 0 0011 2H4a2 2 0 00-2 2v7a2 2 0 00.59 1.42l9 9a2 2 0 002.82 0l7-7a2 2 0 000-2.84zM6.5 8A1.5 1.5 0 115 6.5 1.5 1.5 0 016.5 8z" />
                </svg>
                <span className="sl-promo-banner-text">
                  Showing spaces with <strong>{promoTitle}</strong>
                </span>
              </span>
              <button type="button" className="sl-promo-banner-clear" onClick={clearPromoFilter}>
                Clear
              </button>
            </div>
          )}
          {loading ? (
            <SkeletonLoader />
          ) : layoutMode === 'list' ? (
            <ListView units={visibleUnits} config={config} />
          ) : layoutMode === 'default' && !isMobile ? (
            <DefaultView units={visibleUnits} config={config} />
          ) : (
            <GridView units={visibleUnits} config={config} />
          )}
        </main>
        {showSideAccordions && apLocation === 'right' && sectionPanel}
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
