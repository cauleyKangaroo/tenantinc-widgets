import React, { useEffect, useMemo, useState } from 'react';
import './SizeGuide.css';
import { ChevronRight, PlayButton } from './icons';
import { SIZE_IMAGES, cover } from '@shared/demoImages';
import { fetchSizes, groupSizesByLabel } from '@shared/sizesCollection';
import { Shimmer } from '@shared/Shimmer';
import storageLocker from './assets/storage-locker.png';

// ---------------------------------------------------------------------------
// Types + demo data
// ---------------------------------------------------------------------------

interface SizeUnit {
  id: string;
  title: string;
  /** CSS gradient placeholder until live video thumbnails are wired in. */
  image: string;
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
      { id: 's1', title: 'Storage Locker', image: cover(storageLocker) },
      { id: 's2', title: '5’ x 5’', image: cover(SIZE_IMAGES['5x5']) },
      { id: 's3', title: '5’ x 10’', image: cover(SIZE_IMAGES['5x10']) },
    ],
  },
  {
    key: 'medium',
    label: 'Medium',
    units: [
      { id: 'm1', title: '10’ x 10’', image: G2 },
      { id: 'm2', title: '10’ x 15’', image: G3 },
      { id: 'm3', title: '10’ x 20’', image: cover(SIZE_IMAGES['10x20']) },
    ],
  },
  {
    key: 'large',
    label: 'Large',
    units: [
      { id: 'l1', title: '10’ x 25’', image: cover(SIZE_IMAGES['10x30']) },
      { id: 'l2', title: '10’ x 30’', image: cover(SIZE_IMAGES['10x30']) },
    ],
  },
  {
    key: 'parking',
    label: 'Parking',
    units: [
      { id: 'v1', title: 'Covered Parking', image: G1 },
      { id: 'v2', title: 'Uncovered Parking', image: G3 },
    ],
  },
];

const CARDS_PER_PAGE = 3;

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

/** Video thumbnail, then just the title and the CTA — both centred beneath it. */
function SizeCard({ unit }: { unit: SizeUnit }) {
  return (
    <div className="sg-card">
      <div className="sg-card-image" style={{ background: unit.image }}>
        <PlayButton size={72} />
      </div>
      <div className="sg-card-body">
        <p className="sg-card-title">{unit.title}</p>
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

  // Sizes from the Duda `Sizes` collection; CATEGORIES is the fallback.
  // Bands come from `sizeLabel`, so the tab set is live too.
  const [live, setLive] = useState<Category[] | null>(null);
  // True until the collection read settles. Without it the demo CATEGORIES painted
  // first and were then replaced by the real bands — a visible flash.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSizes('#11 size guide')
      .then((sizes) => {
        if (cancelled || !sizes) return;
        const bands: Category[] = groupSizesByLabel(sizes).map((b) => ({
          key: b.category || b.label.toLowerCase().replace(/\s+/g, '_'),
          label: b.label,
          units: b.items.map((s, i) => ({
            id: s.id,
            title: s.name || s.dimensionsLabel,
            // thumbnailImage is empty on every row so far, so fall back to the
            // bundled demo art rather than rendering an empty tile.
            image: s.thumbnail ? cover(s.thumbnail) : (CATEGORIES[0].units[i % CATEGORIES[0].units.length]?.image ?? ''),
          })),
        }));
        if (bands.length) setLive(bands);
      })
      .catch((err) => console.error('[SizeGuide] Sizes read error:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Demo bands are the fallback for an EMPTY/failed read only.
  const cats = live ?? CATEGORIES;
  const category = cats[Math.min(catIdx, cats.length - 1)] ?? cats[0];
  const totalPages = Math.max(1, Math.ceil(category.units.length / CARDS_PER_PAGE));

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
      {cats.map((c, i) => (
        <button key={c.key} className={`sg-tab${i === catIdx ? ' active' : ''}`} onClick={() => selectCategory(i)}>
          {c.label}
        </button>
      ))}
    </div>
  );

  // The band names come from the collection too, so the tabs are skeletons as
  // well — otherwise the demo tab labels would flash before the real ones.
  if (loading) {
    return (
      <div className="sg-wrapper">
        <div className="sg-header">
          <div className="sg-heading-block">
            <div className="sg-title">{heading}</div>
            <p className="sg-subtitle">{subheading}</p>
          </div>
          <div className="sg-tabs">
            {[92, 108, 84, 100].map((w, i) => <Shimmer key={i} w={w} h={44} r={100} />)}
          </div>
        </div>
        <div className="sg-grid">
          {[0, 1, 2].map((i) => (
            <div className="sg-card" key={i}>
              <Shimmer h={0} style={{ aspectRatio: '283 / 184', height: 'auto' }} r={16} />
              <Shimmer w="60%" h={28} style={{ margin: '0 auto' }} />
              <Shimmer w={120} h={18} style={{ margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

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
        <SizeCard key={`${category.key}-${mobileIdx}`} unit={category.units[mobileIdx]} />
        {category.units.length > 1 && (
          <div className="sg-pagination sg-pagination-dots">
            <Dots count={category.units.length} active={mobileIdx} onPick={setMobileIdx} />
          </div>
        )}
      </div>
    </div>
  );
}
