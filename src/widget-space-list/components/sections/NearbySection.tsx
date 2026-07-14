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
    <svg width="16" height="16" viewBox="0 0 16 16" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M8.00027 1.33333C6.89219 1.33333 5.44063 1.71745 4.25329 2.68153C3.04102 3.66586 2.14062 5.2271 2.14062 7.48148C2.14062 9.75511 3.21704 11.6241 4.43297 12.9076C5.0426 13.5511 5.70019 14.0619 6.30394 14.4159C6.88105 14.7544 7.49439 15 8.00027 15C8.50615 15 9.1195 14.7544 9.69661 14.4159C10.3004 14.0619 10.9579 13.5511 11.5676 12.9076C12.7835 11.6241 13.8599 9.75511 13.8599 7.48148C13.8599 5.2271 12.9595 3.66586 11.7473 2.68153C10.5599 1.71745 9.10835 1.33333 8.00027 1.33333ZM5.71973 7.19297C5.71973 5.93338 6.74083 4.91227 8.00043 4.91227C9.26003 4.91227 10.2811 5.93338 10.2811 7.19297C10.2811 8.45257 9.26003 9.47368 8.00043 9.47368C6.74083 9.47368 5.71973 8.45257 5.71973 7.19297Z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.36398 8.11545C5.09378 8.36585 4.78548 8.60104 4.49713 8.81529C5.17576 9.82491 6.022 10.6889 7.01465 11.3862C7.30745 11.0339 7.63607 10.6446 7.98993 10.3227C9.0284 9.37799 10.4636 9.00172 11.8319 9.3155C12.3635 9.43741 12.9969 9.62899 13.5279 9.98616C14.0806 10.358 14.5376 10.9226 14.635 11.7457C14.6743 12.0778 14.6837 12.4752 14.6237 12.8423C14.4172 14.1053 13.1904 14.7659 12.1134 14.6387C10.1192 14.4033 8.32398 13.7873 6.79149 12.8362C5.23715 11.8716 3.96312 10.5682 3.03069 8.98815C2.1549 7.50408 1.58536 5.78439 1.36118 3.88422C1.23416 2.80763 1.894 1.58024 3.15726 1.37366C3.50113 1.31743 3.89134 1.32868 4.18497 1.35516C4.96125 1.42518 5.51945 1.81474 5.90181 2.32153C6.26737 2.80607 6.47181 3.39414 6.60308 3.90659C6.99348 5.43064 6.5179 7.04617 5.36398 8.11545Z" />
    </svg>
  );
}

// ── Stars (with half-star support) ────────────────────────────────────────────

// Canonical round rating star (shared with the Reviews widget).
const ROUND_STAR =
  'M16.5423 5.649L12.0203 4.63275L9.67431 0.562657C9.24231 -0.187552 8.17831 -0.187552 7.74631 0.562657L5.40031 4.63275L0.878308 5.649C0.0453085 5.83655 -0.283691 6.86707 0.282309 7.51841L3.35531 11.0503L2.90631 15.7483C2.82331 16.6137 3.68431 17.2518 4.46631 16.9032L8.71131 15.0164L12.9563 16.9032C13.7383 17.2508 14.5993 16.6137 14.5163 15.7483L14.0673 11.0503L17.1403 7.51841C17.7063 6.86809 17.3773 5.83655 16.5443 5.649H16.5423Z';

function Stars({ rating, size = 16, color = '#FFD000' }: { rating: number; size?: number; color?: string }) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const vb = '0 0 17.15 17';

  return (
    <div className="sl-nb2-stars">
      {Array.from({ length: full }).map((_, i) => (
        <svg key={`f${i}`} width={size} height={size} viewBox={vb} fill={color}><path d={ROUND_STAR}/></svg>
      ))}
      {half && (
        <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={vb} fill="#DFE3E8" style={{ position: 'absolute' }}><path d={ROUND_STAR}/></svg>
          <svg width={size} height={size} viewBox={vb} fill={color} style={{ position: 'absolute', clipPath: 'inset(0 50% 0 0)' }}><path d={ROUND_STAR}/></svg>
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <svg key={`e${i}`} width={size} height={size} viewBox={vb} fill="#DFE3E8"><path d={ROUND_STAR}/></svg>
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
