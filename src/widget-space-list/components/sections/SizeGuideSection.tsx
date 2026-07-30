import React, { useEffect, useState } from 'react';
import { SIZE_IMAGES, cover } from '@shared/demoImages';
import { fetchSizes, groupSizesByLabel } from '@shared/sizesCollection';

// ── Data ──────────────────────────────────────────────────────────────────────

interface SizeCategory {
  tab: string;
  title: string;
  imageBg: string;
}

const CATEGORIES: SizeCategory[] = [
  {
    tab: 'Extra Small',
    title: 'Extra Small 4x4',
    imageBg: cover(SIZE_IMAGES['5x5']),
  },
  {
    tab: 'Small',
    title: 'Small 5x5',
    imageBg: cover(SIZE_IMAGES['5x5']),
  },
  {
    tab: 'Medium',
    title: 'Medium 10x10',
    imageBg: cover(SIZE_IMAGES['5x10']),
  },
  {
    tab: 'Large',
    title: 'Large 10x20',
    imageBg: cover(SIZE_IMAGES['10x20']),
  },
  {
    tab: 'Extra Large',
    title: 'Extra Large 10x30',
    imageBg: cover(SIZE_IMAGES['10x30']),
  },
];

// ── Play button ───────────────────────────────────────────────────────────────

function PlayButton() {
  return (
    <div className="sl-sg2-play">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <circle cx="28" cy="28" r="28" fill="rgba(255,255,255,0.85)" />
        <polygon points="23,18 43,28 23,38" fill="#637381" />
      </svg>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SizeGuideSection({ showVideos = true }: { showVideos?: boolean }) {
  const [activeTab, setActiveTab] = useState('Small');

  // Sizes from the Duda `Sizes` collection; CATEGORIES is the fallback. The
  // collection's `sizeLabel` supplies the tab set, so the tabs are live too.
  const [live, setLive] = useState<SizeCategory[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSizes('#05 size guide accordion')
      .then((sizes) => {
        if (cancelled || !sizes) return;
        // One tab per size band, using that band's first size for the card.
        const bands = groupSizesByLabel(sizes).map((b) => {
          const first = b.items[0];
          return {
            tab: b.label,
            title: [first.name, first.dimensionsLabel].filter(Boolean).join(' ').trim(),
            // The collection's thumbnailImage is empty on every row so far, so
            // keep the bundled imagery as the poster until it's populated.
            imageBg: CATEGORIES.find((c) => c.tab === b.label)?.imageBg ?? CATEGORIES[0].imageBg,
          };
        });
        if (bands.length) setLive(bands);
      })
      .catch((err) => console.error('[SizeGuideSection] Sizes read error:', err));
    return () => { cancelled = true; };
  }, []);

  const cats = live ?? CATEGORIES;
  const category = cats.find((c) => c.tab === activeTab) ?? cats[0];

  return (
    <div className="sl-sg2">

      {/* Category pills */}
      <div className="sl-sg2-tabs">
        {cats.map((c) => (
          <button
            key={c.tab}
            className={`sl-sg2-tab${activeTab === c.tab ? ' active' : ''}`}
            onClick={() => setActiveTab(c.tab)}
          >
            {c.tab}
          </button>
        ))}
      </div>

      {/* Scrollable content area */}
      <div className="sl-sg2-content">

        {/* Video thumbnail — hidden when "Show videos in Size Guide?" is off */}
        {showVideos && (
          <div className="sl-sg2-image" style={{ background: category.imageBg }}>
            <PlayButton />
          </div>
        )}

        {/* Title + CTA only — the descriptive body copy was removed. */}
        <p className="sl-sg2-title">{category.title}</p>
        <a href="#" className="sl-sg2-cta">See Available Spaces</a>

      </div>
    </div>
  );
}
