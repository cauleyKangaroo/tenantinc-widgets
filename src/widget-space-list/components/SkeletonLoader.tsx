import React from 'react';

function SkeletonCard() {
  return (
    <div className="sl-unit-card sl-skeleton-card">
      <div className="sl-card-display-panel">
        <div className="sl-card-top">
          <div className="sl-card-info">
            <div className="sl-skeleton-line sl-skeleton-title" />
            <div className="sl-skeleton-line sl-skeleton-subtitle" />
            <div className="sl-skeleton-line sl-skeleton-feature" />
            <div className="sl-skeleton-line sl-skeleton-feature sl-skeleton-feature--short" />
          </div>
          <div className="sl-card-image-col">
            <div className="sl-skeleton-image" />
          </div>
        </div>
      </div>
      <div className="sl-card-action-panel">
        <div className="sl-card-pricing">
          <div className="sl-skeleton-line sl-skeleton-price" />
          <div className="sl-skeleton-btn" />
        </div>
      </div>
    </div>
  );
}

function SkeletonAccordion({ cardCount }: { cardCount: number }) {
  return (
    <div className="sl-accordion">
      <div className="sl-accordion-header">
        <div className="sl-skeleton-line sl-skeleton-accordion-title" />
      </div>
      <div className="sl-accordion-body">
        <div className="sl-cards-grid">
          {Array.from({ length: cardCount }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </div>
  );
}

export function SkeletonLoader() {
  return (
    <div className="sl-grid-view sl-skeleton">
      <SkeletonAccordion cardCount={3} />
      <SkeletonAccordion cardCount={4} />
      <SkeletonAccordion cardCount={2} />
    </div>
  );
}
