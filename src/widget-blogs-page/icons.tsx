import React from 'react';

// ===========================================================================
// Icons for the Blogs Page widget (#15).
//
// Deliberately local rather than imported from #12 / #05: no widget in this
// repo reaches into another widget's directory, and #12 must stay byte-for-byte
// untouched. The brand social glyphs DO come from @shared/socialIcons — those
// were already shared, so there's nothing to copy.
//
// All glyphs draw with `currentColor` so CSS owns the colour.
// ===========================================================================

/** Share glyph — same vector as #12's card footer (Figma share/share-01). */
export function ShareIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 22" fill="none" aria-hidden="true">
      <path
        d="M16 8C14.8221 8 13.7631 7.49085 13.0311 6.68062C11.063 7.35027 9.28751 8.33133 7.78967 9.7166C7.92605 10.1195 8 10.5511 8 11C8 11.4489 7.92604 11.8806 7.78963 12.2835C9.28748 13.6687 11.063 14.6498 13.031 15.3194C13.763 14.5092 14.8221 14 16 14C18.2091 14 20 15.7909 20 18C20 20.2091 18.2091 22 16 22C13.7909 22 12 20.2091 12 18C12 17.6949 12.0342 17.3978 12.0988 17.1124C10.1219 16.4057 8.27923 15.3911 6.67613 13.973C5.96734 14.6114 5.02905 15 4 15C1.79086 15 0 13.2091 0 11C0 8.79086 1.79086 7 4 7C5.02908 7 5.9674 7.38861 6.6762 8.02709C8.27928 6.60892 10.1219 5.59439 12.0988 4.88769C12.0342 4.60218 12 4.30508 12 4C12 1.79086 13.7909 0 16 0C18.2091 0 20 1.79086 20 4C20 6.20914 18.2091 8 16 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Figma filter/filter-horizontal — the bar's leading circular button. */
export function FilterHorizontalIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        transform="translate(3.6667 0.8333)"
        d="M5 12C3.45 12 2.15833 13.0667 1.78333 14.5H0V16.1667H1.78333C2.15833 17.6 3.45 18.6667 5 18.6667C6.55 18.6667 7.84167 17.6 8.21667 16.1667H16.6667V14.5H8.21667C7.84167 13.0667 6.55 12 5 12ZM5 17C4.08333 17 3.33333 16.25 3.33333 15.3333C3.33333 14.4167 4.08333 13.6667 5 13.6667C5.91667 13.6667 6.66667 14.4167 6.66667 15.3333C6.66667 16.25 5.91667 17 5 17ZM14.8833 6.16667C14.5083 4.73333 13.2167 3.66667 11.6667 3.66667C10.1167 3.66667 8.825 4.73333 8.45 6.16667H0V7.83333H8.45C8.825 9.26667 10.1167 10.3333 11.6667 10.3333C13.2167 10.3333 14.5083 9.26667 14.8833 7.83333H16.6667V6.16667H14.8833ZM11.6667 8.66667C10.75 8.66667 10 7.91667 10 7C10 6.08333 10.75 5.33333 11.6667 5.33333C12.5833 5.33333 13.3333 6.08333 13.3333 7C13.3333 7.91667 12.5833 8.66667 11.6667 8.66667Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Figma search/search-default — sits inside the dark circle at the field's end. */
export function SearchIcon({ size = 24 }: { size?: number }) {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

