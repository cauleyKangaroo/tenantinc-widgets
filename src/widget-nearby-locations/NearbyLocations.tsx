import React, { useEffect, useState } from 'react';
import './NearbyLocations.css';
import { PROPERTY_IMAGES, cover, propertyImage } from '@shared/demoImages';
import {
  StarRating,
  PhoneIcon,
  TagIcon,
  MapPinIcon,
  ChevronRight,
} from './icons';
import { NearbyMap, type MapPoint } from '@shared/NearbyMap';
import { useSwipe } from '@shared/useSwipe';
import {
  fetchProperties,
  extractProperties,
  getUserLocation,
  haversineMiles,
  fetchPropertySpaces,
  formatDistance,
  CURRENT_PROPERTY_ID,
  type NearbyProperty,
  type NearbySpace,
} from './nearbyApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Space = NearbySpace;

/** Card-ready property: live fields + presentation extras (image, fee, rating). */
interface Property extends NearbyProperty {
  /** CSS gradient / demo cover — Images aren't in the API yet. */
  image: string;
  adminFee: number;
  /** Rating/reviews aren't in the properties API; present only on demo data. */
  rating?: number;
  reviewCount?: number;
}

// ---------------------------------------------------------------------------
// Demo data — fallback when the API is unreachable or returns nothing
// ---------------------------------------------------------------------------

const SPACES: Space[] = [
  { size: '5’ x 5’', subtype: 'Climate Controlled', inStorePrice: 55, startingPrice: 25 },
  { size: '10’ x 10’', subtype: 'Drive Up', inStorePrice: 174, startingPrice: 140 },
  { size: '10’ x 12’', subtype: 'Drive Up', inStorePrice: 580, startingPrice: 450 },
];

const ADDRESS = '8478 3rd Street, Fullerton, CA 02027';
const PHONE = '(555) 555-5555';

const DEMO_PROPERTIES: Property[] = [
  { id: 'p1', name: '3rd Street Storage', distanceMiles: 1.7, rating: 4.5, reviewCount: 32, address: ADDRESS, phone: PHONE, lat: 0, lng: 0, image: cover(PROPERTY_IMAGES[0]), promo: '$1 Move-In', adminFee: 20, spaces: SPACES },
  { id: 'p2', name: 'Storfun Storage', distanceMiles: 2.5, rating: 4.5, reviewCount: 32, address: ADDRESS, phone: PHONE, lat: 0, lng: 0, image: cover(PROPERTY_IMAGES[1]), promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
  { id: 'p3', name: 'Green Street Storage', distanceMiles: 3, rating: 4.5, reviewCount: 32, address: ADDRESS, phone: PHONE, lat: 0, lng: 0, image: cover(PROPERTY_IMAGES[2]), promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
  { id: 'p4', name: 'Lakeside Self Storage', distanceMiles: 4.1, rating: 4, reviewCount: 18, address: ADDRESS, phone: PHONE, lat: 0, lng: 0, image: cover(PROPERTY_IMAGES[3]), promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
  { id: 'p5', name: 'Uptown Storage Co.', distanceMiles: 5.3, rating: 5, reviewCount: 47, address: ADDRESS, phone: PHONE, lat: 0, lng: 0, image: cover(PROPERTY_IMAGES[4]), promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
  { id: 'p6', name: 'Riverside Storage', distanceMiles: 6.2, rating: 4.5, reviewCount: 29, address: ADDRESS, phone: PHONE, lat: 0, lng: 0, image: cover(PROPERTY_IMAGES[5]), promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
];

const CARDS_PER_PAGE = 3;
const MAX_NEARBY = 6;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SpaceRow({ space }: { space: Space }) {
  return (
    <div className="nl-space-row">
      <div className="nl-space-info">
        <span className="nl-space-size">{space.size}</span>
        <span className="nl-space-subtype">{space.subtype}</span>
      </div>
      <div className="nl-space-prices">
        <span className="nl-price-tag"><TagIcon size={16} /></span>
        <div className="nl-price-strike">
          <span className="nl-price-strike-label">IN-STORE</span>
          <span className="nl-price-strike-value">${space.inStorePrice}</span>
        </div>
        <span className="nl-price-divider" />
        <div className="nl-price-start">
          <span className="nl-price-start-label">STARTING AT</span>
          <span className="nl-price-start-value">${space.startingPrice}</span>
        </div>
        <button className="nl-select-btn">Select</button>
      </div>
    </div>
  );
}

function PropertyCard({ property }: { property: Property }) {
  return (
    <div className="nl-card">
      <div className="nl-card-image" style={{ background: property.image }}>
        <div className="nl-card-image-overlay" />
        {property.distanceMiles != null && (
          <span className="nl-card-distance">{formatDistance(property.distanceMiles)}</span>
        )}
        <div className="nl-card-data">
          <span className="nl-card-name">{property.name}</span>
          {property.rating != null && (
            <div className="nl-card-rating">
              <span className="nl-card-rating-num">{property.rating}</span>
              <StarRating rating={property.rating} size={16} />
              <a className="nl-card-reviews" href="#">{property.reviewCount} Reviews</a>
            </div>
          )}
          {property.address && (
            <a className="nl-card-meta" href="#">
              <MapPinIcon size={16} />
              <span>{property.address}</span>
            </a>
          )}
          {property.phone && (
            <a className="nl-card-meta" href={`tel:${property.phone.replace(/[^0-9+]/g, '')}`}>
              <PhoneIcon size={16} />
              <span>{property.phone}</span>
            </a>
          )}
        </div>
      </div>

      <div className="nl-card-body">
        {property.promo && (
          <div className="nl-promo">
            <TagIcon size={16} />
            <span className="nl-promo-text">{property.promo}</span>
          </div>
        )}

        {property.spaces.length > 0 && (
          <div className="nl-spaces">
            {property.spaces.map((space, i) => (
              <React.Fragment key={`${space.size}-${i}`}>
                {i > 0 && <span className="nl-space-divider" />}
                <SpaceRow space={space} />
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="nl-card-footer">
          <span className="nl-admin-fee">+ Plus ${property.adminFee} Admin Fee</span>
          <a className="nl-see-all" href="#">
            See All Spaces
          </a>
        </div>
      </div>
    </div>
  );
}

/** Loading placeholder mirroring the card's own geometry (image, promo, 3 space
 *  rows, footer) so the grid doesn't reflow when the real cards arrive. */
function SkeletonCard() {
  return (
    <div className="nl-card nl-skeleton-card" aria-hidden="true">
      <div className="nl-card-image nl-skeleton-block" />
      <div className="nl-card-body">
        <div className="nl-skeleton-line nl-skeleton-promo" />
        <div className="nl-spaces">
          {[0, 1, 2].map((i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="nl-space-divider" />}
              <div className="nl-skeleton-space-row">
                <div className="nl-skeleton-lines">
                  <div className="nl-skeleton-line nl-skeleton-size" />
                  <div className="nl-skeleton-line nl-skeleton-subtype" />
                </div>
                <div className="nl-skeleton-line nl-skeleton-price" />
                <div className="nl-skeleton-block nl-skeleton-btn" />
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="nl-card-footer">
          <div className="nl-skeleton-line nl-skeleton-fee" />
          <div className="nl-skeleton-line nl-skeleton-seeall" />
        </div>
      </div>
    </div>
  );
}

function Dots({ count, active, onPick }: { count: number; active: number; onPick: (i: number) => void }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <button key={i} className={`nl-dot${i === active ? ' active' : ''}`} onClick={() => onPick(i)} aria-label={`Page ${i + 1}`} />
      ))}
    </>
  );
}


// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface NearbyLocationsProps {
  heading?: string;
  subheading?: string;
  /** Duda setting: only show properties within this many miles. 0/unset = nearest-first. */
  radiusMiles?: number;
  /** Fixed admin fee shown on each card (not per-property in the API). */
  adminFee?: number;
}

export function NearbyLocations({
  heading = 'Nearby Properties',
  subheading = 'Browse other storage facilities in the area and compare available spaces and prices.',
  radiusMiles = 0,
  adminFee = 20,
}: NearbyLocationsProps) {
  const [page, setPage] = useState(0);
  const [mobileIdx, setMobileIdx] = useState(0);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  // null = still loading; [] = loaded but nothing to show.
  const [apiProperties, setApiProperties] = useState<Property[] | null>(null);
  // Reference coordinates (map centre).
  const [refLoc, setRefLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Properties + a geolocation attempt run together (geo may prompt).
        const [raw, userLoc] = await Promise.all([fetchProperties(), getUserLocation()]);
        const all = extractProperties(raw);

        // Reference point: the visitor's location, else the current property's.
        const current = all.find((p) => p.id === CURRENT_PROPERTY_ID);
        const ref = userLoc
          ? { ...userLoc, source: 'user' as const }
          : current
            ? { lat: current.lat, lng: current.lng, source: 'property' as const }
            : null;
        if (!ref) { if (!cancelled) setApiProperties([]); return; }

        // Distance to every other property, nearest first; optional radius filter.
        let ranked = all
          .filter((p) => p.id !== CURRENT_PROPERTY_ID)
          .map((p) => ({ ...p, distanceMiles: haversineMiles(ref, p) }))
          .sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
        if (radiusMiles > 0) ranked = ranked.filter((p) => (p.distanceMiles ?? Infinity) <= radiusMiles);

        const top = ranked.slice(0, MAX_NEARBY);

        // Stage 1: show cards immediately with distance/name/address/phone so the
        // section paints without waiting on the per-property enrichment calls.
        const base: Property[] = top.map((p, i) => ({
          ...p, spaces: [], image: propertyImage(p.imageUrl, i), adminFee,
        }));
        if (!cancelled) { setRefLoc({ lat: ref.lat, lng: ref.lng }); setApiProperties(base); }

        // Stage 2: enrich each card with spaces + promo, patching them in as each
        // property resolves (parallel, fail-soft — one failure can't block others).
        top.forEach((p) => {
          fetchPropertySpaces(p.id).then(({ promo, spaces }) => {
            if (cancelled) return;
            setApiProperties((prev) =>
              prev ? prev.map((c) => (c.id === p.id ? { ...c, promo, spaces } : c)) : prev,
            );
          });
        });
      } catch (err) {
        console.error('[NearbyLocations] load error:', err);
        if (!cancelled) setApiProperties([]);
      }
    })();

    return () => { cancelled = true; };
  }, [radiusMiles, adminFee]);

  // While loading we render skeleton cards — showing DEMO_PROPERTIES here meant
  // real-looking names/prices flashed up and were then replaced. Demo data is
  // still the fallback for an EMPTY result, so the section never renders blank in
  // the editor/preview.
  const loading = apiProperties === null;
  const properties = apiProperties && apiProperties.length ? apiProperties : DEMO_PROPERTIES;
  const noneInRadius = !loading && apiProperties!.length === 0 && radiusMiles > 0;

  const totalPages = Math.ceil(properties.length / CARDS_PER_PAGE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const pageCards = properties.slice(safePage * CARDS_PER_PAGE, safePage * CARDS_PER_PAGE + CARDS_PER_PAGE);

  const mobileSwipe = useSwipe({
    onSwipeLeft: () => setMobileIdx((i) => Math.min(properties.length - 1, i + 1)),
    onSwipeRight: () => setMobileIdx((i) => Math.max(0, i - 1)),
  });

  // Map pins from the live properties (price = cheapest starting rate).
  const mapPoints: MapPoint[] = (apiProperties ?? []).map((p, i) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    label: p.spaces[0] ? `$${p.spaces[0].startingPrice}` : undefined,
    name: p.name,
    address: p.address,
    distance: p.distanceMiles != null ? formatDistance(p.distanceMiles) : undefined,
    active: i === mobileIdx,
  }));

  return (
    <div className="nl-wrapper">

      {/* ── Desktop ─────────────────────────────────────────────────────── */}
      <div className="nl-desktop">
        <div className="nl-heading-block">
          <div className="nl-title">{heading}</div>
          <p className="nl-subtitle">{subheading}</p>
        </div>

        {noneInRadius ? (
          <p className="nl-empty">No properties found within {radiusMiles} miles.</p>
        ) : (
          <>
            <div className="nl-grid">
              {loading
                ? Array.from({ length: CARDS_PER_PAGE }, (_, i) => <SkeletonCard key={i} />)
                : pageCards.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
            </div>

            {!loading && totalPages > 1 && (
              <div className="nl-pagination">
                <button className="nl-page-btn nl-page-btn-prev" onClick={() => setPage(() => Math.max(0, safePage - 1))} disabled={safePage === 0} aria-label="Previous">
                  <ChevronRight size={40} />
                </button>
                <Dots count={totalPages} active={safePage} onPick={setPage} />
                <button className="nl-page-btn" onClick={() => setPage(() => Math.min(totalPages - 1, safePage + 1))} disabled={safePage === totalPages - 1} aria-label="Next">
                  <ChevronRight size={40} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Mobile ──────────────────────────────────────────────────────── */}
      <div className="nl-mobile">
        <div className="nl-mobile-title">
          <span>Nearby Storage</span>
        </div>

        <div className="nl-mobile-tabs">
          <button className={`nl-mobile-tab${mobileView === 'list' ? ' active' : ''}`} onClick={() => setMobileView('list')}>List View</button>
          <button className={`nl-mobile-tab${mobileView === 'map' ? ' active' : ''}`} onClick={() => setMobileView('map')}>Map View</button>
        </div>

        {mobileView === 'list' ? (
          noneInRadius ? (
            <p className="nl-empty">No properties found within {radiusMiles} miles.</p>
          ) : (
            <>
              {loading ? (
                <SkeletonCard />
              ) : (
                <>
                  {/* Dots are the indicator, swiping is the control — this view
                      never had arrows to begin with. */}
                  <div {...mobileSwipe.handlers}>
                    <PropertyCard property={properties[Math.min(mobileIdx, properties.length - 1)]} />
                  </div>
                  <div className="nl-pagination nl-pagination-dots">
                    <Dots count={properties.length} active={Math.min(mobileIdx, properties.length - 1)} onPick={setMobileIdx} />
                  </div>
                </>
              )}
            </>
          )
        ) : refLoc && mapPoints.length ? (
          <NearbyMap center={refLoc} points={mapPoints} className="nl-map" />
        ) : (
          <div className="nl-map"><span className="nl-map-selected">Map unavailable</span></div>
        )}
      </div>

    </div>
  );
}
