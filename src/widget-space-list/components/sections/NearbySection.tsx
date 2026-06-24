import React, { useState, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Placeholder data ──────────────────────────────────────────────────────────

const PROPERTIES: NearbyProperty[] = [
  { id: 1, name: '3rd Street Storage',   distance: '1.7 Miles', rating: 4.5, reviewCount: 32, address: '8478 3rd Street, Fullerton, CA 02027', phone: '(555) 555-5555', promotion: 'Short Promotion Title', units: [{ dimensions: "5' x 5'", subtype: 'Climate Controlled', inStore: 55,  startingAt: 25  }, { dimensions: "10' x 10'", subtype: 'Drive Up', inStore: 174, startingAt: 140 }, { dimensions: "10' x 12'", subtype: 'Drive Up', inStore: 580, startingAt: 450 }], adminFee: 20 },
  { id: 2, name: 'Storfun Storage',       distance: '2.5 Miles', rating: 4.5, reviewCount: 32, address: '8478 3rd Street, Fullerton, CA 02027', phone: '(555) 555-5555', promotion: 'Short Promotion Title', units: [{ dimensions: "5' x 5'", subtype: 'Climate Controlled', inStore: 55,  startingAt: 25  }, { dimensions: "10' x 10'", subtype: 'Drive Up', inStore: 174, startingAt: 140 }, { dimensions: "10' x 12'", subtype: 'Drive Up', inStore: 580, startingAt: 450 }], adminFee: 20 },
  { id: 3, name: 'Green Street Storage',  distance: '3 Miles',   rating: 4.5, reviewCount: 32, address: '8478 3rd Street, Fullerton, CA 02027', phone: '(555) 555-5555', promotion: 'Short Promotion Title', units: [{ dimensions: "5' x 5'", subtype: 'Climate Controlled', inStore: 55,  startingAt: 25  }, { dimensions: "10' x 10'", subtype: 'Drive Up', inStore: 174, startingAt: 140 }, { dimensions: "10' x 12'", subtype: 'Drive Up', inStore: 580, startingAt: 450 }], adminFee: 20 },
  { id: 4, name: 'Maple Avenue Storage',  distance: '3.8 Miles', rating: 4.2, reviewCount: 18, address: '100 Maple Ave, Fullerton, CA 02028',    phone: '(555) 555-1234', promotion: 'Short Promotion Title', units: [{ dimensions: "5' x 5'", subtype: 'Climate Controlled', inStore: 55,  startingAt: 25  }, { dimensions: "10' x 10'", subtype: 'Drive Up', inStore: 174, startingAt: 140 }, { dimensions: "10' x 12'", subtype: 'Drive Up', inStore: 580, startingAt: 450 }], adminFee: 20 },
  { id: 5, name: 'Central Self Storage',  distance: '4.1 Miles', rating: 4.7, reviewCount: 54, address: '22 Central Blvd, Fullerton, CA 02029',  phone: '(555) 555-5678', promotion: 'Short Promotion Title', units: [{ dimensions: "5' x 5'", subtype: 'Climate Controlled', inStore: 55,  startingAt: 25  }, { dimensions: "10' x 10'", subtype: 'Drive Up', inStore: 174, startingAt: 140 }, { dimensions: "10' x 12'", subtype: 'Drive Up', inStore: 580, startingAt: 450 }], adminFee: 20 },
  { id: 6, name: 'Westside Storage Co.',  distance: '5 Miles',   rating: 4.3, reviewCount: 27, address: '77 West End Rd, Fullerton, CA 02030',   phone: '(555) 555-9012', promotion: 'Short Promotion Title', units: [{ dimensions: "5' x 5'", subtype: 'Climate Controlled', inStore: 55,  startingAt: 25  }, { dimensions: "10' x 10'", subtype: 'Drive Up', inStore: 174, startingAt: 140 }, { dimensions: "10' x 12'", subtype: 'Drive Up', inStore: 580, startingAt: 450 }], adminFee: 20 },
];

function useCardsPerPage() {
  const getCount = () => {
    if (window.innerWidth <= 767) return 1;
    if (window.innerWidth <= 1024) return 2;
    return 3;
  };
  const [count, setCount] = useState(getCount);
  useEffect(() => {
    const handler = () => setCount(getCount());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return count;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <div className="suf-nb-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.floor(rating) ? 'filled' : i - 0.5 <= rating ? 'half' : ''}>★</span>
      ))}
    </div>
  );
}

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#509e2f">
      <path d="M21.41 11.58L12.41 2.58A2 2 0 0011 2H4a2 2 0 00-2 2v7a2 2 0 00.59 1.42l9 9a2 2 0 002.82 0l7-7a2 2 0 000-2.84zM6.5 8A1.5 1.5 0 115 6.5 1.5 1.5 0 016.5 8z"/>
    </svg>
  );
}

function PropertyCard({ p }: { p: NearbyProperty }) {
  return (
    <div className="suf-nb-card">
      <div className="suf-nb-image">
        <div className="suf-nb-image-placeholder" />
        <div className="suf-nb-overlay">
          <span className="suf-nb-distance">{p.distance}</span>
          <div className="suf-nb-info">
            <div className="suf-nb-name">{p.name}</div>
            <div className="suf-nb-rating">
              <span className="suf-nb-rating-val">{p.rating}</span>
              <Stars rating={p.rating} />
              <a href="#" className="suf-nb-reviews">{p.reviewCount} Reviews</a>
            </div>
            <div className="suf-nb-meta">
              <span className="suf-nb-meta-row">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <a href="#">{p.address}</a>
              </span>
              <span className="suf-nb-meta-row">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.47 11.47 0 00.57 3.57 1 1 0 01-.25 1.02l-2.2 2.2z"/></svg>
                <a href="#">{p.phone}</a>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="suf-nb-body">
        <div className="suf-nb-promo">
          <span className="suf-nb-promo-dot" />
          {p.promotion}
        </div>

        <div className="suf-nb-units">
          {p.units.map((u, i) => (
            <div key={i} className="suf-nb-unit-row">
              <div className="suf-nb-unit-left">
                <TagIcon />
                <div className="suf-nb-unit-info">
                  <span className="suf-nb-unit-dims">{u.dimensions}</span>
                  <span className="suf-nb-unit-subtype">{u.subtype}</span>
                </div>
              </div>
              <div className="suf-nb-unit-right">
                <div className="suf-nb-price-block">
                  <span className="suf-nb-instore-label">IN-STORE</span>
                  <span className="suf-nb-instore-price">${u.inStore}</span>
                </div>
                <div className="suf-nb-price-block">
                  <span className="suf-nb-starting-label">STARTING AT</span>
                  <span className="suf-nb-starting-price">${u.startingAt}</span>
                </div>
                <button className="suf-nb-select-btn">Select</button>
              </div>
            </div>
          ))}
        </div>

        <div className="suf-nb-footer">
          <span className="suf-nb-admin-fee">+ Plus ${p.adminFee} Admin Fee</span>
          <a href="#" className="suf-nb-see-all">› See All Spaces</a>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NearbySection() {
  const cardsPerPage = useCardsPerPage();
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(PROPERTIES.length / cardsPerPage);
  const visible = PROPERTIES.slice(page * cardsPerPage, page * cardsPerPage + cardsPerPage);

  useEffect(() => {
    setPage(0);
  }, [cardsPerPage]);

  return (
    <section className="suf-section suf-section--nearby">

      <div className="suf-rv-header">
        <div className="suf-ap-title">Nearby Storage</div>
        <p className="suf-rv-subtitle">Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac aliquet odio mattis.</p>
      </div>

      <div className="suf-nb-grid">
        {visible.map((p) => <PropertyCard key={p.id} p={p} />)}
      </div>

      <div className="suf-nb-pagination">
        <button className="suf-nb-arrow" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button key={i} className={`suf-nb-dot${i === page ? ' active' : ''}`} onClick={() => setPage(i)} />
        ))}
        <button className="suf-nb-arrow" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
      </div>

    </section>
  );
}
