import React, { useState } from 'react';
import { SIZE_IMAGES, cover } from '@shared/demoImages';

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

  const category = CATEGORIES.find((c) => c.tab === activeTab) ?? CATEGORIES[1];

  return (
    <div className="sl-sg2">

      {/* Category pills */}
      <div className="sl-sg2-tabs">
        {CATEGORIES.map((c) => (
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
