import React, { useMemo, useState } from 'react';
import './SizeGuide.css';
import { ChevronRight, PlayButton } from './icons';

// ---------------------------------------------------------------------------
// Types + demo data
// ---------------------------------------------------------------------------

interface SizeUnit {
  id: string;
  title: string;
  /** CSS gradient placeholder until live video thumbnails are wired in. */
  image: string;
  /** Lead paragraph(s). */
  description: string;
  /** Bulleted facts (sq ft, what fits). */
  bullets: string[];
}

interface Category {
  key: string;
  label: string;
  units: SizeUnit[];
}

const G1 = 'linear-gradient(135deg, #d8dde3 0%, #b9c1cb 100%)';
const G2 = 'linear-gradient(135deg, #cfd6dd 0%, #aeb7c2 100%)';
const G3 = 'linear-gradient(135deg, #dde1e6 0%, #c2cad3 100%)';

const CATEGORIES: Category[] = [
  {
    key: 'small',
    label: 'Small',
    units: [
      { id: 's1', title: 'Storage Locker', image: G1, description: 'Storage locker units (about 5x5x4ft) are convenient and often more cost effective than other storage unit sizes. In this video we show you how big our locker storage units are and what you can fit inside.', bullets: ['25 sq ft', 'Closet-sized storage with less height'] },
      { id: 's2', title: '5’ x 5’', image: G2, description: 'Ever wondered what a 5x5 storage unit looks like or what fits in a 5x5 foot storage unit? In this video we show you how big our 5x5 storage unit is and what you can fit inside.', bullets: ['25 sq ft', 'Closet-sized storage'] },
      { id: 's3', title: '5’ x 10’', image: G3, description: 'Ever wondered what a 5x10 storage unit looks like or what fits in a 5x10 foot storage unit? In this video we show you how big our 5x10 storage unit is and what you can fit inside.', bullets: ['50 sq ft', 'Small apartment extras'] },
      { id: 's4', title: '5’ x 15’', image: G1, description: 'A 5x15 unit offers extra depth for longer items while keeping a compact footprint. See what fits inside and whether it suits your move.', bullets: ['75 sq ft', 'Contents of a one-bedroom apartment'] },
    ],
  },
  {
    key: 'medium',
    label: 'Medium',
    units: [
      { id: 'm1', title: '10’ x 10’', image: G2, description: 'A 10x10 storage unit is one of our most popular sizes — roughly half of a standard one-car garage. Great for the contents of a two-bedroom home.', bullets: ['100 sq ft', 'Two bedrooms of furniture'] },
      { id: 'm2', title: '10’ x 15’', image: G3, description: 'A 10x15 unit comfortably holds the contents of a larger apartment or a small house, including major appliances.', bullets: ['150 sq ft', 'Three bedrooms of furniture'] },
      { id: 'm3', title: '10’ x 20’', image: G1, description: 'A 10x20 unit is about the size of a standard one-car garage and ideal for whole-home moves or vehicle storage.', bullets: ['200 sq ft', 'Contents of a full house'] },
    ],
  },
  {
    key: 'large',
    label: 'Large',
    units: [
      { id: 'l1', title: '10’ x 25’', image: G3, description: 'A 10x25 unit suits large household moves and business inventory, with room to organize and access your items.', bullets: ['250 sq ft', 'Large home + appliances'] },
      { id: 'l2', title: '10’ x 30’', image: G2, description: 'Our largest standard unit — comparable to a two-car garage. Perfect for major moves, commercial storage, or vehicles.', bullets: ['300 sq ft', 'Five+ bedrooms or commercial use'] },
    ],
  },
  {
    key: 'vehicle',
    label: 'Vehicle',
    units: [
      { id: 'v1', title: 'Covered Parking', image: G1, description: 'Covered parking shields your car, motorcycle, or trailer from the elements while keeping it secure behind gated access.', bullets: ['Up to 20 ft', 'Cars, motorcycles, trailers'] },
      { id: 'v2', title: 'Uncovered Parking', image: G3, description: 'An economical outdoor space for vehicles and trailers within our secured, monitored lot.', bullets: ['Up to 25 ft', 'Cars, trucks, trailers'] },
    ],
  },
  {
    key: 'boat-rv',
    label: 'Boat / RV',
    units: [
      { id: 'b1', title: 'RV Storage', image: G2, description: 'Spacious drive-up spaces sized for recreational vehicles, with easy maneuvering and gated security.', bullets: ['Up to 40 ft', 'Motorhomes and travel trailers'] },
      { id: 'b2', title: 'Boat Storage', image: G1, description: 'Keep your boat protected and out of the driveway in a space designed for trailered watercraft.', bullets: ['Up to 35 ft', 'Boats on trailers'] },
    ],
  },
];

const CARDS_PER_PAGE = 3;

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function SizeCard({ unit, mobile }: { unit: SizeUnit; mobile?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="sg-card">
      <div className="sg-card-image" style={{ background: unit.image }}>
        <PlayButton size={72} />
      </div>
      <div className="sg-card-body">
        <h3 className="sg-card-title">{unit.title}</h3>
        <div className={`sg-card-desc${mobile && !expanded ? ' clamp' : ''}`}>
          <p>{unit.description}</p>
          <ul>
            {unit.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
        {mobile && (
          <button className="sg-readmore" onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'Read less' : 'Read more'}
          </button>
        )}
        <a className="sg-see-all" href="#">See Available Spaces</a>
      </div>
    </div>
  );
}

function Dots({ count, active, onPick }: { count: number; active: number; onPick: (i: number) => void }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <button key={i} className={`sg-dot${i === active ? ' active' : ''}`} onClick={() => onPick(i)} aria-label={`Page ${i + 1}`} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface SizeGuideProps {
  heading?: string;
  subheading?: string;
}

export function SizeGuide({
  heading = 'Size Guide',
  subheading = 'Sizes are approximate and may vary by facility.',
}: SizeGuideProps) {
  const [catIdx, setCatIdx] = useState(0);
  const [page, setPage] = useState(0);
  const [mobileIdx, setMobileIdx] = useState(0);

  const category = CATEGORIES[catIdx];
  const totalPages = Math.ceil(category.units.length / CARDS_PER_PAGE);

  function selectCategory(i: number) {
    setCatIdx(i);
    setPage(0);
    setMobileIdx(0);
  }

  const pageUnits = useMemo(
    () => category.units.slice(page * CARDS_PER_PAGE, page * CARDS_PER_PAGE + CARDS_PER_PAGE),
    [category, page],
  );

  const tabs = (
    <div className="sg-tabs">
      {CATEGORIES.map((c, i) => (
        <button key={c.key} className={`sg-tab${i === catIdx ? ' active' : ''}`} onClick={() => selectCategory(i)}>
          {c.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="sg-wrapper">
      <div className="sg-header">
        <div className="sg-heading-block">
          <div className="sg-title">{heading}</div>
          <p className="sg-subtitle">{subheading}</p>
        </div>
        {tabs}
      </div>

      {/* ── Desktop: 3-up grid ──────────────────────────────────────────── */}
      <div className="sg-desktop">
        <div className="sg-grid">
          {pageUnits.map((unit) => (
            <SizeCard key={unit.id} unit={unit} />
          ))}
        </div>
        {totalPages > 1 && (
          <div className="sg-pagination">
            <button className="sg-page-btn sg-page-btn-prev" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous">
              <ChevronRight size={40} />
            </button>
            <Dots count={totalPages} active={page} onPick={setPage} />
            <button className="sg-page-btn" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} aria-label="Next">
              <ChevronRight size={40} />
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile: single card ─────────────────────────────────────────── */}
      <div className="sg-mobile">
        <SizeCard key={`${category.key}-${mobileIdx}`} unit={category.units[mobileIdx]} mobile />
        {category.units.length > 1 && (
          <div className="sg-pagination sg-pagination-dots">
            <Dots count={category.units.length} active={mobileIdx} onPick={setMobileIdx} />
          </div>
        )}
      </div>
    </div>
  );
}
