// ===========================================================================
// Widget #08 — Map Locations (city page). Figma 10622:77201.
//
// Header row (count + Filter / sort pills), then a fixed-height row: a scrolling
// column of property cards on the left and a Google map on the right that stays
// put while the cards scroll. Below that, the city's SEO copy.
//
// The map is the shared keyless `output=embed` iframe with our own DOM bubbles
// projected on top (@shared/NearbyMap) — no Maps JS API, no key, nothing for
// Duda's CSP to block. The Figma bubbles differ from #07's pins, so this widget
// passes `renderPin` rather than restyling the shared component.
//
// STATIC for now: everything comes from ./data.ts. See the note there.
// ===========================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import './MapLocations.css';
import { NearbyMap, type MapPoint, type PositionedPoint } from '@shared/NearbyMap';
import { RichText } from '@shared/richText';
import { CITY_FACILITIES, type CityFacility, type CityUnit } from './data';
import { PROPERTY_IMAGES } from '@shared/demoImages';
import { FilterPanel } from './FilterPanel';
import { INITIAL_FILTERS, activeFilterCount, type FilterState } from './filters';
import { useMediaQuery, MOBILE_STICKY_QUERY } from '@shared/stickyStack';
import { FilterIcon, ChevronDownIcon } from './icons';

// ── Icons (inline SVG — the AMD bundle can't load remote assets) ─────────────

const Icon = {
  search: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.6-3.6" />
    </svg>
  ),
  /** map/map-location — the "Map View" toggle. */
  mapView: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  /** list/list-default — the "List View" toggle. */
  listView: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  ),
  pin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  phone: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  ),
  tag: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#509e2f" aria-hidden="true">
      <path d="M5.5 2h7.1c.5 0 1 .2 1.4.6l7.4 7.4c.8.8.8 2 0 2.8l-7.1 7.1c-.8.8-2 .8-2.8 0L4.1 12.5c-.4-.4-.6-.9-.6-1.4V4A2 2 0 0 1 5.5 2Zm2.5 3.5A1.5 1.5 0 1 0 8 8.5 1.5 1.5 0 0 0 8 5.5Z" />
    </svg>
  ),
};

function Star({ size = 16, half = false, color = '#FFD000' }: { size?: number; half?: boolean; color?: string }) {
  const d = 'M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.35l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z';
  if (!half) return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d={d} /></svg>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="ml-half">
          <stop offset="50%" stopColor={color} />
          <stop offset="50%" stopColor="rgba(255,255,255,0.45)" />
        </linearGradient>
      </defs>
      <path d={d} fill="url(#ml-half)" />
    </svg>
  );
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="ml-stars">
      {Array.from({ length: full }, (_, i) => <Star key={`f${i}`} />)}
      {half && <Star half />}
    </span>
  );
}

// ── Unit row ────────────────────────────────────────────────────────────────

function UnitRow({ unit }: { unit: CityUnit }) {
  return (
    <div className="ml-unit">
      <div className="ml-unit-info">
        <span className="ml-unit-dims">{unit.dimensions}</span>
        <span className="ml-unit-subtype">{unit.subtype}</span>
      </div>

      <div className="ml-unit-prices">
        <span className="ml-unit-tag">{Icon.tag}</span>
        <div className="ml-price-strike">
          <span className="ml-price-label">IN-STORE</span>
          <span className="ml-price-was">${unit.inStorePrice}</span>
        </div>
        <span className="ml-price-divider" />
        <div className="ml-price-start">
          <span className="ml-price-label ml-price-label--dark">STARTING AT</span>
          <span className="ml-price-now">${unit.startingPrice}</span>
        </div>
        <button type="button" className="ml-select">Select</button>
      </div>
    </div>
  );
}

// ── Property card ───────────────────────────────────────────────────────────

function PropertyCard({
  facility,
  index,
  active,
  compact,
  onActivate,
}: {
  facility: CityFacility;
  index: number;
  active: boolean;
  /** Mobile card: unit rows collapse to one "Units starting at $X" button. */
  compact: boolean;
  onActivate: () => void;
}) {
  const cls = [
    'ml-card',
    facility.featured ? 'ml-card--featured' : '',
    active ? 'ml-card--active' : '',
  ].filter(Boolean).join(' ');

  return (
    <article className={cls} onMouseEnter={onActivate}>
      {/* Photo header — image, dark scrim, distance, and the property details */}
      <div className="ml-card-head">
        <img className="ml-card-photo" src={PROPERTY_IMAGES[index % PROPERTY_IMAGES.length]} alt="" />
        <span className="ml-card-scrim" />

        {facility.featured && (
          <div className="ml-featured">
            <Star size={16} color="#fff" />
            <span>Featured Property</span>
          </div>
        )}

        <span className="ml-distance">{facility.distanceMiles} Miles</span>

        <div className="ml-card-data">
          <p className="ml-card-name">{facility.name}</p>

          <div className="ml-rating">
            <span className="ml-rating-score">{facility.rating}</span>
            <Stars rating={facility.rating} />
            <a className="ml-reviews" href="#">{facility.reviewCount} Reviews</a>
          </div>

          <a
            className="ml-card-row"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.address)}`}
            target="_blank"
            rel="noreferrer"
          >
            {Icon.pin}<span>{facility.address}</span>
          </a>

          <a className="ml-card-row" href={`tel:${facility.phone.replace(/[^0-9+]/g, '')}`}>
            {Icon.phone}<span>{facility.phone}</span>
          </a>
        </div>
      </div>

      {/* Available spaces */}
      <div className="ml-card-body">
        {facility.promo && (
          <div className="ml-promo">
            {Icon.tag}
            <span className="ml-promo-text">{facility.promo}</span>
          </div>
        )}

        {compact ? (
          <button type="button" className="ml-cta">
            Units starting at {facility.priceLabel}
          </button>
        ) : (
          <>
            <div className="ml-units">
              {facility.units.map((u) => <UnitRow key={u.id} unit={u} />)}
            </div>

            <div className="ml-card-foot">
              <span className="ml-admin-fee">+ Plus ${facility.adminFee} Admin Fee</span>
              <a className="ml-see-all" href="#">See All Spaces</a>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

// ── Props ───────────────────────────────────────────────────────────────────

export interface MapLocationsProps {
  /** City shown in the heading and the SEO block, e.g. "Fullerton, CA". */
  city?: string;
  /** Heading under the map. */
  seoHeading?: string;
  /** SEO copy. HTML is parsed (see @shared/richText); blank hides the block. */
  seoContent?: string;
  /** Height of the pinned map. Capped to the viewport so it can't overflow it. */
  rowHeight?: number | string;
  /** @deprecated The sort is a real control now — see SORT_OPTIONS. */
  sortLabel?: string;
}

/**
 * Sort options for the header dropdown.
 *
 * PLACEHOLDER SET, pending what the client actually wants. Both reorder for
 * real rather than being decorative, so swapping in the final list is a data
 * change, not a rewrite.
 */
const SORT_OPTIONS = [
  { id: 'distance', label: 'Closest Distance' },
  { id: 'reviews', label: 'Highly Reviewed' },
] as const;

type SortId = typeof SORT_OPTIONS[number]['id'];

/** Sort a copy — never mutate the source list, which is module-level demo data. */
function sortFacilities(list: CityFacility[], by: SortId): CityFacility[] {
  const out = [...list];
  if (by === 'distance') {
    // Missing distance sorts LAST, not as 0 — otherwise a facility with no
    // distance would float to the top of a "Closest Distance" list.
    const miles = (f: CityFacility) =>
      Number.isFinite(f.distanceMiles) ? f.distanceMiles : Infinity;
    return out.sort((a, b) => miles(a) - miles(b));
  }
  // Highly Reviewed: rating first, then review count as the tie-break — a 4.5
  // from 300 people should outrank a 4.5 from 3.
  const rating = (f: CityFacility) => Number(f.rating ?? 0);
  const count = (f: CityFacility) => Number(f.reviewCount ?? 0);
  return out.sort((a, b) => (rating(b) - rating(a)) || (count(b) - count(a)));
}

const DEFAULT_SEO = `<p><strong>Storage in Fullerton</strong></p>
<p>If you are looking for high quality self storage in Fullerton, CA, we can help. We provide customers with a high quality, well-maintained self storage facility at a great price. A friendly, professional on-site manager is always here to help you.</p>
<p><strong>Self Storage Features</strong><br>At our storage facilities, we offer a wide range of features and amenities that make packing and self storage easy. You will find drive-up storage units for simple loading and unloading, delivery receiving services, packing and moving supplies right on site, and long gate access hours.</p>
<p><strong>Secure Storage Units</strong><br>When you rent storage units in Fullerton, CA, you want total security. Our property is covered with 24/7 video surveillance, electronic gate access, and a manager who is always on site.</p>`;

// ── Component ───────────────────────────────────────────────────────────────

export function MapLocations({
  city = 'Fullerton, CA',
  seoHeading,
  seoContent = DEFAULT_SEO,
  rowHeight = 900,
  sortLabel = 'Closest Distance',
}: MapLocationsProps) {
  // Duda text fields arrive as '' until the editor types something, and a default
  // parameter only catches `undefined` — so fall back on blank too, or the
  // headings read "Storage Facilities in ".
  const cityLabel = city.trim() || 'Fullerton, CA';

  const [sortBy, setSortBy] = useState<SortId>('distance');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Re-sorted on every change; CITY_FACILITIES itself is never mutated.
  const facilities = useMemo(() => sortFacilities(CITY_FACILITIES, sortBy), [sortBy]);
  const sortLabelText =
    SORT_OPTIONS.find((o) => o.id === sortBy)?.label ?? SORT_OPTIONS[0].label;

  // Click-outside closes the dropdown. Pointerdown rather than click so it
  // closes before the next control receives its own event.
  useEffect(() => {
    if (!sortOpen) return;
    const onDown = (e: PointerEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSortOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [sortOpen]);
  // Which card/bubble is highlighted. Starts on the featured one, matching the
  // Figma where a card and its bubble share the orange outline.
  const [activeId, setActiveId] = useState<string>(facilities[1]?.id ?? facilities[0]?.id ?? '');
  /** Which bubble has its popup open. Null = none. */
  const [openId, setOpenId] = useState<string | null>(null);

  // Filter panel (Figma 10557:146492) — a centred lightbox, like #05's.
  // Selections are live state so the panel behaves, but nothing is filtered
  // yet: #08's data is still static.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const filterCount = activeFilterCount(filters);

  // Mobile is a different composition, not just a reflow: a search field, a
  // Map/List toggle and "Filter & Sort" replace the desktop header, and only
  // one of the map or the list is on screen at a time (Figma 10609:72429 /
  // 10609:72649). That's DOM structure, so it needs a JS breakpoint rather
  // than the media queries the rest of the layout uses.
  const isMobile = useMediaQuery(MOBILE_STICKY_QUERY);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const showMap = !isMobile || mobileView === 'map';
  const showCards = !isMobile || mobileView === 'list';

  const points: MapPoint[] = facilities.map((f) => ({
    id: f.id,
    lat: f.lat,
    lng: f.lng,
    label: f.priceLabel,
    name: f.name,
    active: f.id === activeId,
  }));

  const center = { lat: facilities[0].lat, lng: facilities[0].lng };

  // Figma bubble: white pill, dark border — orange + shadow when active, with a
  // star ahead of the price. Clicking one opens the popup above it
  // (Figma 10626:79939); the pin render-prop draws both, since NearbyMap only
  // gives us this one hook inside the map box.
  const renderPin = (p: PositionedPoint) => {
    const isActive = p.id === activeId;
    const facility = facilities.find((f) => f.id === p.id);
    const isOpen = p.id === openId;

    return (
      <>
        <button
          type="button"
          className={`ml-bubble${isActive ? ' ml-bubble--active' : ''}`}
          style={{ left: p.left, top: p.top }}
          onClick={(e) => {
            e.stopPropagation();
            setActiveId(p.id);
            setOpenId((cur) => (cur === p.id ? null : p.id));
          }}
          title={p.name}
        >
          {isActive && <Star size={24} color="#101318" />}
          <span>{p.label}</span>
        </button>

        {/* "Selected Location" tab under the active bubble — mobile only. */}
        {isMobile && isActive && (
          <span className="ml-bubble-tag" style={{ left: p.left, top: p.top }}>
            Selected Location
          </span>
        )}

        {isOpen && facility && (
          <div
            /* On a phone the frame parks the popup across the top of the map
               rather than over its bubble, which also keeps it from being
               clipped when the bubble sits near an edge. */
            className={`ml-popup${isMobile ? ' ml-popup--centred' : ''}`}
            style={isMobile ? undefined : { left: p.left, top: p.top }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              className="ml-popup-photo"
              src={PROPERTY_IMAGES[facilities.indexOf(facility) % PROPERTY_IMAGES.length]}
              alt=""
            />
            <div className="ml-popup-body">
              <p className="ml-popup-name">{facility.name}</p>
              <a
                className="ml-popup-address"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.address)}`}
                target="_blank"
                rel="noreferrer"
              >
                {facility.address}
              </a>
              <div className="ml-popup-rating">
                <Star size={16} />
                <span className="ml-popup-score">{facility.rating}</span>
                <a className="ml-popup-reviews" href="#">{facility.reviewCount} Reviews</a>
              </div>
              <span className="ml-popup-from">Units starting at {facility.priceLabel}</span>
              {/* The mobile frame adds a CTA here; the desktop one doesn't. */}
              {isMobile && <button type="button" className="ml-cta">See All Units</button>}
            </div>
            <button
              type="button"
              className="ml-popup-close"
              aria-label="Close"
              onClick={(e) => { e.stopPropagation(); setOpenId(null); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="ml-wrapper" style={{ ['--ml-row-h' as string]: typeof rowHeight === 'number' ? `${rowHeight}px` : rowHeight }}>
      {isMobile ? (
        /* Mobile — search, then a Map/List toggle beside "Filter & Sort",
           then the count. Figma 10609:72429 / 10609:72649. */
        <>
          <div className="ml-mcontrols">
            <div className="ml-search">
              <input
                className="ml-search-input"
                type="text"
                placeholder="Enter ZIP, City, State"
                aria-label="Search by ZIP, city or state"
              />
              <button type="button" className="ml-search-btn" aria-label="Search">
                {Icon.search}
              </button>
            </div>

            <div className="ml-mtoggles">
              {/* Names the view you'd switch TO, as the frames do. */}
              <button
                type="button"
                className="ml-pill"
                onClick={() => setMobileView((v) => (v === 'map' ? 'list' : 'map'))}
              >
                {mobileView === 'map' ? Icon.listView : Icon.mapView}
                <span>{mobileView === 'map' ? 'List View' : 'Map View'}</span>
              </button>

              <button
                type="button"
                className="ml-pill ml-pill--dark"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen(true)}
              >
                <FilterIcon size={24} /><span>Filter &amp; Sort</span>
                {filterCount > 0 && <span className="ml-pill-badge">{filterCount}</span>}
              </button>
            </div>
          </div>

          <p className="ml-heading">
            {facilities.length} Self Storage {facilities.length === 1 ? 'Facility' : 'Facilities'} in {cityLabel}
          </p>
        </>
      ) : (
        /* Desktop — count on the left, Filter + sort pills on the right. */
        <div className="ml-header">
          <p className="ml-heading">
            {facilities.length} Storage {facilities.length === 1 ? 'Facility' : 'Facilities'} in {cityLabel}
          </p>
          <div className="ml-controls">
            <button
              type="button"
              className={`ml-pill${filtersOpen ? ' ml-pill--on' : ''}`}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen(true)}
            >
              <FilterIcon size={24} /><span>Filter</span>
              {filterCount > 0 && <span className="ml-pill-count">{filterCount}</span>}
            </button>

            {/* Sort — a real listbox. Figma shows the closed pill only, so the
                open menu follows the filter modal's surface (white, 12px radius,
                the same elevation) rather than inventing a new one. */}
            <div className="ml-sort" ref={sortRef}>
              <button
                type="button"
                className={`ml-pill${sortOpen ? ' ml-pill--open' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
                onClick={() => setSortOpen((o) => !o)}
              >
                <FilterIcon size={24} />
                <span className="ml-pill-sort">{sortLabelText}</span>
                <ChevronDownIcon size={24} className="ml-pill-chev" />
              </button>
              {sortOpen && (
                <ul className="ml-sort-menu" role="listbox" aria-label="Sort facilities">
                  {SORT_OPTIONS.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={o.id === sortBy}
                        className={`ml-sort-opt${o.id === sortBy ? ' ml-sort-opt--on' : ''}`}
                        onClick={() => { setSortBy(o.id); setSortOpen(false); }}
                      >
                        {o.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop: the cards travel with the page while the map pins beside them
          until the last card clears. Mobile: one or the other. */}
      <div className="ml-row">
        {showCards && (
          <div className="ml-cards">
            {facilities.map((f, i) => (
              <PropertyCard
                key={f.id}
                facility={f}
                index={i}
                active={f.id === activeId}
                compact={isMobile}
                onActivate={() => setActiveId(f.id)}
              />
            ))}
          </div>
        )}

        {showMap && (
          <div className="ml-map">
            <NearbyMap
              center={center}
              points={points}
              height="100%"
              renderPin={renderPin}
              hideCenterMarker
            />
          </div>
        )}
      </div>

      {/* City SEO copy. The mobile map view is a full-screen map, so the frame
          drops the copy there — it comes back with the list. */}
      {seoContent && showCards && (
        <div className="ml-seo">
          <p className="ml-seo-heading">{seoHeading?.trim() || `Self Storage Units in ${cityLabel}`}</p>
          <RichText value={seoContent} className="ml-seo-body" />
        </div>
      )}

      {/* Filter lightbox — its overlay is fixed, so where it sits here is moot. */}
      {filtersOpen && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onClose={() => setFiltersOpen(false)}
          onReset={() => setFilters({
            types: [], sizes: [], features: [], amenities: [], promotions: [],
            minPrice: '$0', maxPrice: '$2,000', maxDistance: '20 miles',
          })}
          onApply={() => setFiltersOpen(false)}
        />
      )}
    </div>
  );
}
