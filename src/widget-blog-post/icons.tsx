import React from 'react';

// ===========================================================================
// Icons for the Blog Post widget (#16).
//
// Local rather than imported from #15: no widget in this repo reaches into
// another widget's directory. The brand social glyphs DO come from
// @shared/socialIcons — those were already shared.
//
// All glyphs draw with `currentColor` so CSS owns the colour.
// ===========================================================================

/** Share glyph — Figma share/share-01, same vector as the #12/#15 card footers. */
export function ShareIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 22" fill="none" aria-hidden="true">
      <path
        d="M16 8C14.8221 8 13.7631 7.49085 13.0311 6.68062C11.063 7.35027 9.28751 8.33133 7.78967 9.7166C7.92605 10.1195 8 10.5511 8 11C8 11.4489 7.92604 11.8806 7.78963 12.2835C9.28748 13.6687 11.063 14.6498 13.031 15.3194C13.763 14.5092 14.8221 14 16 14C18.2091 14 20 15.7909 20 18C20 20.2091 18.2091 22 16 22C13.7909 22 12 20.2091 12 18C12 17.6949 12.0342 17.3978 12.0988 17.1124C10.1219 16.4057 8.27923 15.3911 6.67613 13.973C5.96734 14.6114 5.02905 15 4 15C1.79086 15 0 13.2091 0 11C0 8.79086 1.79086 7 4 7C5.02908 7 5.9674 7.38861 6.6762 8.02709C8.27928 6.60892 10.1219 5.59439 12.0988 4.88769C12.0342 4.60218 12 4.30508 12 4C12 1.79086 13.7909 0 16 0C18.2091 0 20 1.79086 20 4C20 6.20914 18.2091 8 16 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Figma chevron-big/chevron-big-right — the breadcrumb separator. */
export function ChevronRight({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

