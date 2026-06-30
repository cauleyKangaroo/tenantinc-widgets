import React, { useState } from 'react';
import './NearbyLocations.css';
import {
  StarRating,
  PhoneIcon,
  TagIcon,
  MapPinIcon,
  BuildingIcon,
  ChevronRight,
  MapPinArea,
} from './icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Space {
  size: string;
  subtype: string;
  inStorePrice: number;
  startingPrice: number;
}

interface Property {
  id: string;
  name: string;
  /** Distance label, e.g. "1.7 Miles". */
  distance: string;
  rating: number;
  reviewCount: number;
  address: string;
  phone: string;
  /** CSS gradient placeholder until live facility imagery is wired in. */
  image: string;
  promo?: string;
  adminFee: number;
  spaces: Space[];
}

// ---------------------------------------------------------------------------
// Demo data — replace with live API data when available
// ---------------------------------------------------------------------------

const SPACES: Space[] = [
  { size: '5’ x 5’', subtype: 'Climate Controlled', inStorePrice: 55, startingPrice: 25 },
  { size: '10’ x 10’', subtype: 'Drive Up', inStorePrice: 174, startingPrice: 140 },
  { size: '10’ x 12’', subtype: 'Drive Up', inStorePrice: 580, startingPrice: 450 },
];

const ADDRESS = '8478 3rd Street, Fullerton, CA 02027';
const PHONE = '(555) 555-5555';

const PROPERTIES: Property[] = [
  { id: 'p1', name: '3rd Street Storage', distance: '1.7 Miles', rating: 4.5, reviewCount: 32, address: ADDRESS, phone: PHONE, image: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)', promo: '$1 Move-In', adminFee: 20, spaces: SPACES },
  { id: 'p2', name: 'Storfun Storage', distance: '2.5 Miles', rating: 4.5, reviewCount: 32, address: ADDRESS, phone: PHONE, image: 'linear-gradient(135deg, #7c4a3a 0%, #3e2723 100%)', promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
  { id: 'p3', name: 'Green Street Storage', distance: '3 Miles', rating: 4.5, reviewCount: 32, address: ADDRESS, phone: PHONE, image: 'linear-gradient(135deg, #4a6b4f 0%, #1b3a23 100%)', promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
  { id: 'p4', name: 'Lakeside Self Storage', distance: '4.1 Miles', rating: 4, reviewCount: 18, address: ADDRESS, phone: PHONE, image: 'linear-gradient(135deg, #3a5a7c 0%, #1a2f44 100%)', promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
  { id: 'p5', name: 'Uptown Storage Co.', distance: '5.3 Miles', rating: 5, reviewCount: 47, address: ADDRESS, phone: PHONE, image: 'linear-gradient(135deg, #5a4a6b 0%, #2c1f3a 100%)', promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
];

const CARDS_PER_PAGE = 3;

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
        <span className="nl-card-distance">{property.distance}</span>
        <div className="nl-card-data">
          <span className="nl-card-name">{property.name}</span>
          <div className="nl-card-rating">
            <span className="nl-card-rating-num">{property.rating}</span>
            <StarRating rating={property.rating} size={16} />
            <a className="nl-card-reviews" href="#">{property.reviewCount} Reviews</a>
          </div>
          <a className="nl-card-meta" href="#">
            <MapPinIcon size={16} />
            <span>{property.address}</span>
          </a>
          <a className="nl-card-meta" href={`tel:${property.phone}`}>
            <PhoneIcon size={16} />
            <span>{property.phone}</span>
          </a>
        </div>
      </div>

      <div className="nl-card-body">
        {property.promo && (
          <div className="nl-promo">
            <TagIcon size={16} />
            <span className="nl-promo-text">{property.promo}</span>
          </div>
        )}

        <div className="nl-spaces">
          {property.spaces.map((space, i) => (
            <React.Fragment key={space.size}>
              {i > 0 && <span className="nl-space-divider" />}
              <SpaceRow space={space} />
            </React.Fragment>
          ))}
        </div>

        <div className="nl-card-footer">
          <span className="nl-admin-fee">+ Plus ${property.adminFee} Admin Fee</span>
          <a className="nl-see-all" href="#">
            <ChevronRight size={24} />
            See All Spaces
          </a>
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

// ── Mobile Map View — placeholder surface with positioned price pins ────────
function MapView() {
  return (
    <div className="nl-map">
      <div className="nl-map-pin nl-map-pin-1">$25</div>
      <div className="nl-map-pin nl-map-pin-2">$140</div>
      <div className="nl-map-pin nl-map-pin-3">$450</div>
      <div className="nl-map-marker"><MapPinArea size={50} /></div>
      <div className="nl-map-selected">Selected Location</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface NearbyLocationsProps {
  heading?: string;
  subheading?: string;
}

export function NearbyLocations({
  heading = 'Nearby Properties',
  subheading = 'Browse other storage facilities in the area and compare available spaces and prices.',
}: NearbyLocationsProps) {
  const totalPages = Math.ceil(PROPERTIES.length / CARDS_PER_PAGE);
  const [page, setPage] = useState(0);

  const [mobileIdx, setMobileIdx] = useState(0);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  const pageCards = PROPERTIES.slice(page * CARDS_PER_PAGE, page * CARDS_PER_PAGE + CARDS_PER_PAGE);

  return (
    <div className="nl-wrapper">

      {/* ── Desktop ─────────────────────────────────────────────────────── */}
      <div className="nl-desktop">
        <div className="nl-heading-block">
          <div className="nl-title">{heading}</div>
          <p className="nl-subtitle">{subheading}</p>
        </div>

        <div className="nl-grid">
          {pageCards.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="nl-pagination">
            <button className="nl-page-btn nl-page-btn-prev" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous">
              <ChevronRight size={40} />
            </button>
            <Dots count={totalPages} active={page} onPick={setPage} />
            <button className="nl-page-btn" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} aria-label="Next">
              <ChevronRight size={40} />
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile ──────────────────────────────────────────────────────── */}
      <div className="nl-mobile">
        <div className="nl-mobile-title">
          <BuildingIcon size={24} />
          <span>Nearby Storage</span>
        </div>

        <div className="nl-mobile-tabs">
          <button className={`nl-mobile-tab${mobileView === 'list' ? ' active' : ''}`} onClick={() => setMobileView('list')}>List View</button>
          <button className={`nl-mobile-tab${mobileView === 'map' ? ' active' : ''}`} onClick={() => setMobileView('map')}>Map View</button>
        </div>

        {mobileView === 'list' ? (
          <>
            <PropertyCard property={PROPERTIES[mobileIdx]} />
            <div className="nl-pagination nl-pagination-dots">
              <Dots count={PROPERTIES.length} active={mobileIdx} onPick={setMobileIdx} />
            </div>
          </>
        ) : (
          <MapView />
        )}
      </div>

    </div>
  );
}
