import React from 'react';
import type { SpaceListProps } from '../types';

// ---------------------------------------------------------------------------
// Loading placeholders, one shape per layout.
//
// Each skeleton card is built from the REAL card's class names — panels,
// columns, heading, feature list, price row, CTA column — so every layout rule
// and container-query step in SpaceList.css sizes the placeholder exactly as it
// will size the card. A generic grid card stood in for all three layouts
// before, so the list and default layouts changed shape (and height) the
// moment the units arrived.
//
// Text lines are <Ghost>: transparent no-break spaces inside the real text
// element, so the line box (font size x line height, wrapping included) is the
// real one, with the shimmer painted on the run itself.
// ---------------------------------------------------------------------------

/** Transparent text with one no-break run per number — normal spaces between
 *  the runs are where it may wrap, like the words of a real label. */
function Ghost({ words }: { words: number[] }) {
  return <span className="sl-skel-text">{words.map((n) => ' '.repeat(n)).join(' ')}</span>;
}

/** Four ticks — the usual count in the live data. `lines` adds one for the
 *  grid card, whose narrow info column wraps one of the four onto a second
 *  line; a fixed extra tick is that height at every width. */
function SkelFeatures({ lines = 4 }: { lines?: number }) {
  return (
    <ul className="sl-features" role="list">
      {[[10, 8], [14], [9, 11], [12], [11]].slice(0, lines).map((w, i) => (
        <li key={i}><Ghost words={w} /></li>
      ))}
    </ul>
  );
}

/** The price row's box, at the height of its tallest column (IN-STORE + strike). */
function SkelPrice() {
  return (
    <div className="sl-prices-row">
      <div className="sl-skeleton-line sl-skeleton-price" />
    </div>
  );
}

function SkeletonGridCard() {
  return (
    <div className="sl-unit-card sl-skeleton-card">
      <div className="sl-card-display-panel">
        <div className="sl-card-top">
          <div className="sl-card-info">
            <div className="sl-unit-heading">
              <div className="sl-unit-title"><Ghost words={[12]} /></div>
              <div className="sl-unit-subtype"><Ghost words={[12, 10]} /></div>
            </div>
            <SkelFeatures lines={5} />
          </div>
          <div className="sl-card-image-col">
            {/* The image class reserves the photo's box (see .sl-unit-img). */}
            <div className="sl-unit-img sl-skeleton-image" />
            <span className="sl-see-fits"><Ghost words={[6, 8]} /></span>
          </div>
        </div>
      </div>
      <div className="sl-card-action-panel">
        <div className="sl-card-pricing">
          <SkelPrice />
          <div className="sl-cta-col"><div className="sl-skeleton-btn" /></div>
        </div>
      </div>
    </div>
  );
}

function SkeletonListCard() {
  return (
    <div className="sl-list-card sl-skeleton-card">
      <div className="sl-lc-display">
        <div className="sl-lc-left">
          <div className="sl-lc-image-col">
            <div className="sl-lc-img sl-skeleton-image" />
            <span className="sl-lc-see-fits"><Ghost words={[6, 8]} /></span>
          </div>
          <div className="sl-lc-info">
            <div className="sl-lc-size-label"><Ghost words={[14]} /></div>
            <div className="sl-lc-amenities">
              {/* The subtype chip leads the amenities, as in ListCard. */}
              <span className="sl-lc-subtype"><Ghost words={[9, 7]} /></span>
              <SkelFeatures />
            </div>
          </div>
        </div>
        {/* Six pills: two rows at both the 4-across desktop grid and the
            3-across narrow frame — the middle of what the live groups hold. */}
        <div className="sl-lc-sizes">
          {Array.from({ length: 6 }, (_, i) => <span className="sl-lc-size sl-skel-pill" key={i} />)}
        </div>
      </div>
      <div className="sl-lc-action">
        <div className="sl-lc-price-button">
          <div className="sl-lc-price"><SkelPrice /></div>
          <div className="sl-lc-btn-col"><div className="sl-skeleton-btn" /></div>
        </div>
      </div>
    </div>
  );
}

function SkeletonDefaultCard() {
  return (
    <div className="sl-default-card sl-skeleton-card">
      <div className="sl-dv-display">
        <div className="sl-dv-image-col">
          <div className="sl-dv-img sl-skeleton-image" />
          <span className="sl-dv-see-fits"><Ghost words={[6, 8]} /></span>
        </div>
        <div className="sl-dv-info">
          <div className="sl-dv-heading">
            <div className="sl-dv-title"><Ghost words={[12]} /></div>
            <div className="sl-dv-subtype"><Ghost words={[12, 10]} /></div>
          </div>
          <SkelFeatures />
        </div>
      </div>
      <div className="sl-dv-action">
        <div className="sl-dv-actions">
          {/* Narrow frame only (hidden above it, as in DefaultCard): the
              comma-joined amenity sentence, which runs to two lines there. */}
          <div className="sl-dv-grey">
            <div className="sl-dv-features-line"><Ghost words={[10, 8, 12, 9, 11, 10, 8, 12, 9]} /></div>
          </div>
          <div className="sl-dv-price-button">
            <div className="sl-dv-price"><SkelPrice /></div>
            <div className="sl-dv-btn-col"><div className="sl-skeleton-btn" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A size-group accordion as GridView / DefaultView draw it, open. Not
 *  `.expanded`: that turns the title into a black pill. */
function SkeletonAccordion({ children }: { children: React.ReactNode }) {
  return (
    <div className="sl-accordion">
      <div className="sl-accordion-header">
        <span className="sl-accordion-title"><Ghost words={[14]} /></span>
      </div>
      <div className="sl-accordion-body">{children}</div>
    </div>
  );
}

export function SkeletonLoader({ layoutMode }: { layoutMode: SpaceListProps['layoutMode'] }) {
  if (layoutMode === 'list') {
    // ListView puts one card per size group straight into the view — no
    // accordions for storage.
    return (
      <div className="sl-list-view sl-skeleton" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => <SkeletonListCard key={i} />)}
      </div>
    );
  }
  if (layoutMode === 'default') {
    return (
      <div className="sl-default-view sl-skeleton" aria-hidden="true">
        {[3, 2].map((n, a) => (
          <SkeletonAccordion key={a}>
            <div className="sl-dv-rows">
              {Array.from({ length: n }, (_, i) => <SkeletonDefaultCard key={i} />)}
            </div>
          </SkeletonAccordion>
        ))}
      </div>
    );
  }
  return (
    <div className="sl-grid-view sl-skeleton" aria-hidden="true">
      {[3, 4, 2].map((n, a) => (
        <SkeletonAccordion key={a}>
          <div className="sl-cards-grid">
            {Array.from({ length: n }, (_, i) => <SkeletonGridCard key={i} />)}
          </div>
        </SkeletonAccordion>
      ))}
    </div>
  );
}
