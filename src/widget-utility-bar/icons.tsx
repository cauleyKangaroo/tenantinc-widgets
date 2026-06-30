import React from 'react';

// ===========================================================================
// Icons for the Utility Bar — the exact mdi Information + Close vectors from
// Figma. Both fill `currentColor` so the bar controls colour.
// ===========================================================================

export function InfoIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 3C9.72 3 3 9.72 3 18C3 26.28 9.72 33 18 33C26.28 33 33 26.28 33 18C33 9.72 26.28 3 18 3ZM16.5 10.5V13.5H19.5V10.5H16.5ZM19.5 24C19.5 24.825 18.825 25.5 18 25.5C17.175 25.5 16.5 24.825 16.5 24V18C16.5 17.175 17.175 16.5 18 16.5C18.825 16.5 19.5 17.175 19.5 18V24ZM6 18C6 24.615 11.385 30 18 30C24.615 30 30 24.615 30 18C30 11.385 24.615 6 18 6C11.385 6 6 11.385 6 18Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path
        d="M29 7.41714L26.5829 5L17 14.5829L7.41714 5L5 7.41714L14.5829 17L5 26.5829L7.41714 29L17 19.4171L26.5829 29L29 26.5829L19.4171 17L29 7.41714Z"
        fill="currentColor"
      />
    </svg>
  );
}
