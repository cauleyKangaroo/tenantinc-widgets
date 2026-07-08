import React, { useState } from 'react';
import { PROPERTY_IMAGES, cover } from '@shared/demoImages';

type ViewMode = 'list' | 'map';

interface NearbyUnit {
  dimensions: string;
  subtype: string;
  inStore: number;
  startingAt: number;
}

interface NearbyProperty {
  id: number;
  name: string;
  distance: string;
  rating: number;
  reviewCount: number;
  address: string;
  phone: string;
  promotion: string;
  units: NearbyUnit[];
  adminFee: number;
}

const PROPERTIES: NearbyProperty[] = [
  { id: 1, name: '3rd Street Storage',  distance: '1.7 Miles', rating: 4.5, reviewCount: 32, address: '8478 3rd Street, Fullerton, CA 02027',   phone: '(555) 555-5555', promotion: 'Short Promotion Title', adminFee: 20, units: [{ dimensions: "5' x 5'", subtype: 'Climate Controlled', inStore: 55,  startingAt: 25  }, { dimensions: "10' x 10'", subtype: 'Drive Up', inStore: 174, startingAt: 140 }, { dimensions: "10' x 12'", subtype: 'Drive Up', inStore: 580, startingAt: 450 }] },
  { id: 2, name: 'Storfun Storage',      distance: '2.5 Miles', rating: 4.5, reviewCount: 19, address: '210 Holt Ave, Pomona, CA 91768',          phone: '(555) 555-1111', promotion: 'First Month Free', adminFee: 20, units: [{ dimensions: "5' x 5'", subtype: 'Climate Controlled', inStore: 60,  startingAt: 30  }, { dimensions: "10' x 10'", subtype: 'Climate Controlled', inStore: 190, startingAt: 155 }, { dimensions: "10' x 20'", subtype: 'Drive Up', inStore: 320, startingAt: 260 }] },
  { id: 3, name: 'Green Street Storage', distance: '3.0 Miles', rating: 4.2, reviewCount: 41, address: '540 Green St, Covina, CA 91722',          phone: '(555) 555-2222', promotion: 'No Admin Fee Today', adminFee: 0,  units: [{ dimensions: "5' x 5'", subtype: 'Drive Up', inStore: 45,  startingAt: 22  }, { dimensions: "10' x 10'", subtype: 'Drive Up', inStore: 160, startingAt: 130 }, { dimensions: "10' x 15'", subtype: 'Drive Up', inStore: 200, startingAt: 170 }] },
  { id: 4, name: 'Maple Avenue Storage', distance: '3.8 Miles', rating: 4.8, reviewCount: 18, address: '100 Maple Ave, Fullerton, CA 02028',      phone: '(555) 555-3333', promotion: 'Short Promotion Title', adminFee: 20, units: [{ dimensions: "5' x 10'", subtype: 'Climate Controlled', inStore: 90,  startingAt: 65  }, { dimensions: "10' x 10'", subtype: 'Climate Controlled', inStore: 174, startingAt: 140 }, { dimensions: "10' x 20'", subtype: 'Drive Up', inStore: 310, startingAt: 250 }] },
  { id: 5, name: 'Central Self Storage', distance: '4.1 Miles', rating: 4.7, reviewCount: 54, address: '22 Central Blvd, Fullerton, CA 02029',   phone: '(555) 555-4444', promotion: 'Short Promotion Title', adminFee: 20, units: [{ dimensions: "5' x 5'", subtype: 'Drive Up', inStore: 55,  startingAt: 25  }, { dimensions: "10' x 10'", subtype: 'Drive Up', inStore: 174, startingAt: 140 }, { dimensions: "10' x 12'", subtype: 'Drive Up', inStore: 580, startingAt: 450 }] },
];

// ── Icons ─────────────────────────────────────────────────────────────────────

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#509e2f" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.41 11.58l-9-9A2 2 0 0011 2H4a2 2 0 00-2 2v7a2 2 0 00.59 1.42l9 9a2 2 0 002.82 0l7-7a2 2 0 000-2.84zM6.5 8A1.5 1.5 0 115 6.5 1.5 1.5 0 016.5 8z"/>
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.66A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>
    </svg>
  );
}

function ChevronRightIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

// ── Stars (with half-star support) ────────────────────────────────────────────

function Stars({ rating, size = 16, color = '#FBBC05' }: { rating: number; size?: number; color?: string }) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const path  = 'M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2Z';

  return (
    <div className="sl-nb2-stars">
      {Array.from({ length: full }).map((_, i) => (
        <svg key={`f${i}`} width={size} height={size} viewBox="0 0 24 24" fill={color}><path d={path}/></svg>
      ))}
      {half && (
        <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill="#e0e0e0" style={{ position: 'absolute' }}><path d={path}/></svg>
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ position: 'absolute', clipPath: 'inset(0 50% 0 0)' }}><path d={path}/></svg>
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <svg key={`e${i}`} width={size} height={size} viewBox="0 0 24 24" fill="#e0e0e0"><path d={path}/></svg>
      ))}
    </div>
  );
}

// ── Property card ─────────────────────────────────────────────────────────────

function PropertyCard({ p, index }: { p: NearbyProperty; index: number }) {
  return (
    <div className="sl-nb2-card">

      {/* Image area */}
      <div className="sl-nb2-img" style={{ background: cover(PROPERTY_IMAGES[index % PROPERTY_IMAGES.length]) }}>
        <div className="sl-nb2-img-overlay" />
        <span className="sl-nb2-distance">{p.distance}</span>
        <div className="sl-nb2-prop-info">
          <p className="sl-nb2-prop-name">{p.name}</p>
          <div className="sl-nb2-prop-rating">
            <span className="sl-nb2-prop-score">{p.rating}</span>
            <Stars rating={p.rating} size={16} color="#FBBC05" />
            <a href="#" className="sl-nb2-prop-reviews">{p.reviewCount} Reviews</a>
          </div>
          <div className="sl-nb2-prop-meta">
            <div className="sl-nb2-prop-meta-row">
              <MapPinIcon />
              <a href="#" className="sl-nb2-prop-meta-link">{p.address}</a>
            </div>
            <div className="sl-nb2-prop-meta-row">
              <PhoneIcon />
              <a href="#" className="sl-nb2-prop-meta-link">{p.phone}</a>
            </div>
          </div>
        </div>
      </div>

      {/* Available spaces */}
      <div className="sl-nb2-spaces">

        {/* Promo banner */}
        {p.promotion && (
          <div className="sl-nb2-promo">
            <TagIcon />
            <span className="sl-nb2-promo-title">{p.promotion}</span>
          </div>
        )}

        {/* Unit rows */}
        <div className="sl-nb2-units">
          {p.units.map((u, i) => (
            <div key={i} className="sl-nb2-unit-row">
              <div className="sl-nb2-unit-info">
                <span className="sl-nb2-unit-dims">{u.dimensions}</span>
                <span className="sl-nb2-unit-type">{u.subtype}</span>
              </div>
              <div className="sl-nb2-unit-pricing">
                <TagIcon />
                <div className="sl-nb2-instore">
                  <span className="sl-nb2-instore-label">IN-STORE</span>
                  <span className="sl-nb2-instore-price">${u.inStore}</span>
                </div>
                <div className="sl-nb2-vdivider" />
                <div className="sl-nb2-starting">
                  <span className="sl-nb2-starting-label">STARTING AT</span>
                  <span className="sl-nb2-starting-price">${u.startingAt}</span>
                </div>
                <button className="sl-nb2-select">Select</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sl-nb2-footer">
          {p.adminFee > 0 && (
            <span className="sl-nb2-admin-fee">+ Plus ${p.adminFee} Admin Fee</span>
          )}
          <a href="#" className="sl-nb2-see-all">
            <ChevronRightIcon size={20} />
            See All Spaces
          </a>
        </div>

      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NearbySection() {
  const [view, setView] = useState<ViewMode>('list');
  const [page, setPage] = useState(0);

  const total = PROPERTIES.length;
  const property = PROPERTIES[page];

  return (
    <div className="sl-nb2">

      {/* View toggle */}
      <div className="sl-nb2-view-tabs">
        <button className={`sl-nb2-view-tab${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>List View</button>
        <button className={`sl-nb2-view-tab${view === 'map'  ? ' active' : ''}`} onClick={() => setView('map')}>Map View</button>
      </div>

      {/* Content */}
      <div className="sl-nb2-content">
        {view === 'map' ? (
          <div className="sl-nb2-map-placeholder">
            <span>Map view coming soon</span>
          </div>
        ) : (
          <PropertyCard p={property} index={page} />
        )}
      </div>

      {/* Pagination */}
      <div className="sl-nb2-pagination">
        <button className="sl-nb2-arrow" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="24 12 16 20 24 28"/>
          </svg>
        </button>
        {PROPERTIES.map((_, i) => (
          <button key={i} className={`sl-nb2-dot${i === page ? ' active' : ''}`} onClick={() => setPage(i)} />
        ))}
        <button className="sl-nb2-arrow" onClick={() => setPage((p) => Math.min(total - 1, p + 1))} disabled={page === total - 1}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 12 24 20 16 28"/>
          </svg>
        </button>
      </div>

    </div>
  );
}
