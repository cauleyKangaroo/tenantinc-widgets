import React from 'react';

function SkeletonCard() {
  return (
    <div className="suf-unit-card suf-skeleton-card">
      <div className="suf-card-display-panel">
        <div className="suf-card-top">
          <div className="suf-card-info">
            <div className="suf-skeleton-line suf-skeleton-title" />
            <div className="suf-skeleton-line suf-skeleton-subtitle" />
            <div className="suf-skeleton-line suf-skeleton-feature" />
            <div className="suf-skeleton-line suf-skeleton-feature suf-skeleton-feature--short" />
          </div>
          <div className="suf-card-image-col">
            <div className="suf-skeleton-image" />
          </div>
        </div>
      </div>
      <div className="suf-card-action-panel">
        <div className="suf-card-pricing">
          <div className="suf-skeleton-line suf-skeleton-price" />
          <div className="suf-skeleton-btn" />
        </div>
      </div>
    </div>
  );
}

function SkeletonAccordion({ cardCount }: { cardCount: number }) {
  return (
    <div className="suf-accordion">
      <div className="suf-accordion-header">
        <div className="suf-skeleton-line suf-skeleton-accordion-title" />
      </div>
      <div className="suf-accordion-body">
        <div className="suf-cards-grid">
          {Array.from({ length: cardCount }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </div>
  );
}

export function SkeletonLoader() {
  return (
    <div className="suf-grid-view suf-skeleton">
      <SkeletonAccordion cardCount={3} />
      <SkeletonAccordion cardCount={4} />
      <SkeletonAccordion cardCount={2} />
    </div>
  );
}
