import React from 'react';

/**
 * The one chevron glyph for the whole widget's disclosure UI: the Pika chevron
 * used by the sidebar accordion headers (SectionAccordion), the three sidebar
 * carousels (Nearby Storage, Reviews, Storage Blogs) and the FAQ accordion.
 *
 * Exported as a bare path so every caller draws the SAME curve. The callers all
 * need different wrappers — one rotates per direction, one takes a className and
 * flips 180deg on open — so sharing the path rather than a single component is
 * what actually keeps them from drifting apart.
 *
 * Drawn pointing DOWN in a 24x24 box. Render at 24 with no scaling to keep the
 * stroke a true 2px.
 */
export const CHEVRON_PATH =
  'M6 9C7.57701 11.1808 9.42293 13.1364 11.4899 14.8172C11.7897 15.0609 12.2103 15.0609 12.5101 14.8172C14.5771 13.1364 16.423 11.1808 18 9';

/**
 * Left/right chevron for the sidebar carousels.
 *
 * Rotated rather than re-drawn, so no mirrored Bézier coordinates have to be
 * maintained by hand: the down-chevron at +90deg points left, -90deg right.
 * Fixed at 24x24 — the arrow buttons (40px on Nearby/Blogs, 28px on Reviews)
 * flex-centre it, so their footprints and hit targets are unaffected.
 */
export function CarouselChevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: `rotate(${dir === 'left' ? 90 : -90}deg)` }}
      aria-hidden="true"
    >
      <path d={CHEVRON_PATH} />
    </svg>
  );
}
