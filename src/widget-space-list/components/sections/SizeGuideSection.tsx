import React, { useState, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SizeUnit {
  id: number;
  title: string;
  description: string;
  bullets: string[];
}

// ── Placeholder data ──────────────────────────────────────────────────────────

const CATEGORIES = ['Small', 'Medium', 'Large', 'Vehicle', 'Boat / RV'];

const UNITS: Record<string, SizeUnit[]> = {
  Small: [
    { id: 1,  title: 'Storage Locker', description: "Storage locker units (about 5x5x4ft) are convenient and often more cost effective than other storage unit sizes, but what can you fit inside? In this video we will show you how big our locker storage units are and what you can fit inside.", bullets: ['25 sq ft', 'Closet-sized storage with less height'] },
    { id: 2,  title: "5' x 5'",        description: "Ever wondered what a 5x5 storage unit looks like or what fits in a 5x5 foot storage unit? In this video we will show you how big our 5x5 storage unit is and what you can fit inside.",                                   bullets: ['25 sq ft', 'Closet-sized storage'] },
    { id: 3,  title: "5' x 10'",       description: "Ever wondered what a 5x10 storage unit looks like or what fits in a 5x10 foot storage unit? In this video we will show you how big our 5x10 storage unit is and what you can fit inside.",                                  bullets: ['50 sq ft', 'Small apartment extras'] },
    { id: 4,  title: "5' x 15'",       description: "A 5x15 storage unit is a great option for storing the contents of a one-bedroom apartment. In this video we will show you how big our 5x15 storage unit is and what you can fit inside.",                                     bullets: ['75 sq ft', 'One-bedroom apartment'] },
    { id: 5,  title: "10' x 5'",       description: "The 10x5 storage unit is similar in size to a large walk-in closet. In this video we will show you how big our 10x5 storage unit is and what you can fit inside.",                                                            bullets: ['50 sq ft', 'Large closet worth of items'] },
    { id: 6,  title: "5' x 20'",       description: "A 5x20 storage unit is a great option for storing the contents of a small one-bedroom apartment. In this video we will show you how big our 5x20 storage unit is and what you can fit inside.",                               bullets: ['100 sq ft', 'Small apartment or dorm room'] },
  ],
  Medium: [
    { id: 7,  title: "10' x 10'",      description: "A 10x10 storage unit is about the size of a standard bedroom. In this video we will show you how big our 10x10 storage unit is and what you can fit inside.",                                                                 bullets: ['100 sq ft', 'Two-bedroom apartment'] },
    { id: 8,  title: "10' x 15'",      description: "A 10x15 storage unit is a good choice for storing furniture from a two-bedroom apartment. In this video we will show you how big our 10x15 storage unit is and what you can fit inside.",                                     bullets: ['150 sq ft', 'Large two-bedroom apartment'] },
    { id: 9,  title: "10' x 20'",      description: "A 10x20 storage unit is ideal for storing a three-bedroom home. In this video we will show you how big our 10x20 storage unit is and what you can fit inside.",                                                               bullets: ['200 sq ft', 'Three-bedroom home'] },
  ],
  Large: [
    { id: 10, title: "10' x 25'",      description: "A 10x25 storage unit is large enough to store the contents of a three or four-bedroom home. In this video we will show you how big our 10x25 storage unit is and what you can fit inside.",                                    bullets: ['250 sq ft', 'Three to four-bedroom home'] },
    { id: 11, title: "10' x 30'",      description: "A 10x30 storage unit is large enough to hold the contents of a five-bedroom home. In this video we will show you how big our 10x30 storage unit is and what you can fit inside.",                                             bullets: ['300 sq ft', 'Five-bedroom home'] },
    { id: 12, title: "20' x 20'",      description: "A 20x20 storage unit offers a generous amount of space for large furniture, appliances, and other items from a four or five-bedroom home.",                                                                                    bullets: ['400 sq ft', 'Large home or business storage'] },
  ],
  Vehicle: [
    { id: 13, title: "10' x 20'",      description: "Our 10x20 vehicle storage unit is perfect for storing a standard car or small SUV. Drive-up access makes loading and unloading your vehicle easy.",                                                                             bullets: ['200 sq ft', 'Standard car or small SUV'] },
    { id: 14, title: "10' x 25'",      description: "Our 10x25 vehicle storage unit is ideal for storing a full-size truck, van, or larger SUV. Drive-up access makes loading and unloading your vehicle easy.",                                                                    bullets: ['250 sq ft', 'Full-size truck or SUV'] },
    { id: 15, title: "10' x 30'",      description: "Our 10x30 vehicle storage unit is designed for storing oversized vehicles such as large trucks, vans, or cars with trailers.",                                                                                                 bullets: ['300 sq ft', 'Oversized vehicles or trailers'] },
  ],
  'Boat / RV': [
    { id: 16, title: "12' x 30'",      description: "Our 12x30 boat and RV storage unit is ideal for storing a mid-size RV, boat, or other large recreational vehicle. Drive-up access ensures easy entry and exit.",                                                               bullets: ['360 sq ft', 'Mid-size RV or boat'] },
    { id: 17, title: "12' x 40'",      description: "Our 12x40 boat and RV storage unit is designed for larger recreational vehicles, boats with trailers, or motorhomes.",                                                                                                         bullets: ['480 sq ft', 'Large RV, motorhome or boat'] },
    { id: 18, title: "14' x 40'",      description: "Our 14x40 boat and RV storage unit provides maximum space for the largest recreational vehicles, extended motorhomes, and oversized boat trailers.",                                                                            bullets: ['560 sq ft', 'Oversized motorhome or boat trailer'] },
  ],
};

// ── Responsive cards per page ─────────────────────────────────────────────────

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

function PlayButton() {
  return (
    <div className="suf-sg-play">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <circle cx="28" cy="28" r="28" fill="rgba(255,255,255,0.85)" />
        <polygon points="22,18 42,28 22,38" fill="#637381" />
      </svg>
    </div>
  );
}

function UnitCard({ unit }: { unit: SizeUnit }) {
  return (
    <div className="suf-sg-card">
      <div className="suf-sg-thumb">
        <div className="suf-sg-thumb-bg" />
        <PlayButton />
      </div>
      <div className="suf-sg-card-body">
        <div className="suf-sg-card-title">{unit.title}</div>
        <p className="suf-sg-card-desc">{unit.description}</p>
        <ul className="suf-sg-bullets">
          {unit.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
        <a href="#" className="suf-sg-cta">&#8250; See Available Spaces</a>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SizeGuideSection() {
  const [activeCategory, setActiveCategory] = useState('Small');
  const [page, setPage] = useState(0);
  const cardsPerPage = useCardsPerPage();

  const units = UNITS[activeCategory] ?? [];
  const totalPages = Math.ceil(units.length / cardsPerPage);
  const visible = units.slice(page * cardsPerPage, page * cardsPerPage + cardsPerPage);

  useEffect(() => { setPage(0); }, [activeCategory, cardsPerPage]);

  return (
    <section className="suf-section suf-section--sizeguide">

      <div className="suf-rv-header">
        <div className="suf-ap-title">Size Guide</div>
        <p className="suf-rv-subtitle">Sizes are approximate and may vary by facility.</p>
      </div>

      <div className="suf-sg-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`suf-sg-tab${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="suf-sg-grid">
        {visible.map((u) => <UnitCard key={u.id} unit={u} />)}
      </div>

      {totalPages > 1 && (
        <div className="suf-nb-pagination">
          <button
            className="suf-nb-arrow"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} className={`suf-nb-dot${i === page ? ' active' : ''}`} onClick={() => setPage(i)} />
          ))}
          <button
            className="suf-nb-arrow"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </button>
        </div>
      )}

    </section>
  );
}
