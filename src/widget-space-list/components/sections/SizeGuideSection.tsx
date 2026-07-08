import React, { useState } from 'react';
import { SIZE_IMAGES, cover } from '@shared/demoImages';

// ── Data ──────────────────────────────────────────────────────────────────────

type ContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'para'; text: string }
  | { type: 'bullets'; items: string[] };

interface SizeCategory {
  tab: string;
  title: string;
  imageBg: string;
  content: ContentBlock[];
}

const CATEGORIES: SizeCategory[] = [
  {
    tab: 'Extra Small',
    title: 'Extra Small 4x4',
    imageBg: cover(SIZE_IMAGES['5x5']),
    content: [
      { type: 'heading', text: 'How big is a storage locker?' },
      { type: 'para',    text: "Storage locker units (about 4x4x4ft) are convenient and often more cost-effective than other storage unit sizes. Perfect for keeping just a few items safe when you don't need much space." },
      { type: 'para',    text: 'The most you\'ll be able to comfortably fit in this unit is:' },
      { type: 'bullets', items: ['A few boxes', 'Small household appliances', 'Documents and files', 'Holiday decorations'] },
      { type: 'heading', text: 'What fits in an extra small unit?' },
      { type: 'para',    text: 'An extra small storage unit is ideal for students, travellers, and minimalists who need a secure spot for a handful of belongings. Think of it as a very large safety deposit box. If you only need a small amount of extra storage, this is the most affordable option available.' },
    ],
  },
  {
    tab: 'Small',
    title: 'Small 5x5',
    imageBg: cover(SIZE_IMAGES['5x5']),
    content: [
      { type: 'heading', text: 'How big is a storage locker?' },
      { type: 'para',    text: "This unit is ideal for storing seasonal decorations and equipment that you don't want to keep at home and for a few loose items you have around your house, business, or dorm." },
      { type: 'para',    text: 'The most you\'ll be able to comfortably fit in this unit is:' },
      { type: 'bullets', items: ['A twin mattress set', 'A dresser', 'A couple of large boxes'] },
      { type: 'heading', text: 'What fits in a storage locker?' },
      { type: 'para',    text: "Hi there, you found us! I'm here to help you choose the perfect storage unit to fit your needs and your budget. Let's look at a small unit. The 5x5 is a great size for keeping your belongings safe for the future. Renting a small unit is like having another large closet. Imagine how that would clean up your home! When full, this unit can fit items like a twin mattress set, a dresser, and many boxes. You might also store seasonal decorations, yard equipment, and even valuable keepsakes like family photos and heirlooms. If this unit is large enough to declutter your home or garage, rent your space online now. Demand for self storage is higher than ever and the best deals are always online." },
    ],
  },
  {
    tab: 'Medium',
    title: 'Medium 10x10',
    imageBg: cover(SIZE_IMAGES['5x10']),
    content: [
      { type: 'heading', text: 'How big is a 10x10 storage unit?' },
      { type: 'para',    text: 'A 10x10 storage unit is about the size of a standard bedroom — large enough to hold furniture and belongings from a one or two-bedroom apartment.' },
      { type: 'para',    text: 'The most you\'ll be able to comfortably fit in this unit is:' },
      { type: 'bullets', items: ['Full bedroom set', 'Sofa and armchairs', 'Dining table and chairs', 'Appliances and boxes'] },
      { type: 'heading', text: 'What fits in a medium storage unit?' },
      { type: 'para',    text: "A medium unit is one of our most popular sizes. Whether you're moving, downsizing, or just need more room at home, a 10x10 gives you the flexibility to store a wide variety of household items. It's also a great option for small business owners who need space for equipment or inventory." },
    ],
  },
  {
    tab: 'Large',
    title: 'Large 10x20',
    imageBg: cover(SIZE_IMAGES['10x20']),
    content: [
      { type: 'heading', text: 'How big is a 10x20 storage unit?' },
      { type: 'para',    text: 'A 10x20 storage unit is the same size as a single-car garage. It is perfect for storing all the contents of a three-bedroom home or a substantial amount of business inventory.' },
      { type: 'para',    text: 'The most you\'ll be able to comfortably fit in this unit is:' },
      { type: 'bullets', items: ['Full three-bedroom household', 'Multiple furniture sets', 'Large appliances', 'Boxes, bikes, and outdoor equipment'] },
      { type: 'heading', text: 'What fits in a large storage unit?' },
      { type: 'para',    text: "Large units are ideal for long-distance moves, home renovations, or any situation where you need to clear out a whole house worth of belongings. With drive-up access available at many locations, loading and unloading is convenient. Book online today to secure the best available rate." },
    ],
  },
  {
    tab: 'Extra Large',
    title: 'Extra Large 10x30',
    imageBg: cover(SIZE_IMAGES['10x30']),
    content: [
      { type: 'heading', text: 'How big is a 10x30 storage unit?' },
      { type: 'para',    text: 'A 10x30 storage unit provides up to 300 square feet of space — enough for the contents of a large five-bedroom home, a commercial operation, or multiple vehicles.' },
      { type: 'para',    text: 'The most you\'ll be able to comfortably fit in this unit is:' },
      { type: 'bullets', items: ['Five-bedroom home contents', 'Commercial equipment and stock', 'Multiple vehicles or large RV', 'Workshop or studio supplies'] },
      { type: 'heading', text: 'What fits in an extra large storage unit?' },
      { type: 'para',    text: "Extra large units are our biggest standard offering and suit contractors, retailers, collectors, and families undergoing major life transitions. Drive-up access makes it easy to come and go. If you need even more space, ask our team about our specialty vehicle and RV storage options." },
    ],
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

export function SizeGuideSection() {
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

        {/* Video thumbnail */}
        <div className="sl-sg2-image" style={{ background: category.imageBg }}>
          <PlayButton />
        </div>

        {/* Title */}
        <p className="sl-sg2-title">{category.title}</p>

        {/* Body */}
        <div className="sl-sg2-body">
          {category.content.map((block, i) => {
            if (block.type === 'heading') {
              return <p key={i} className="sl-sg2-body-heading">{block.text}</p>;
            }
            if (block.type === 'bullets') {
              return (
                <ul key={i} className="sl-sg2-list">
                  {block.items.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              );
            }
            return <p key={i} className="sl-sg2-body-para">{block.text}</p>;
          })}
        </div>

        {/* CTA */}
        <a href="#" className="sl-sg2-cta">See Available Spaces</a>

      </div>
    </div>
  );
}
