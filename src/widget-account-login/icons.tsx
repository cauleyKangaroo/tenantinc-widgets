import React from 'react';

// ===========================================================================
// Icons for the Account Login widget (#17).
//
// The Google and Apple marks are the vendors' official logos, reproduced as
// paths rather than redrawn — both companies require their exact mark on a
// sign-in button. Figma renders the Apple mark as the  glyph from SF Pro;
// that font isn't available off an Apple device, so the path is used instead.
//
// Everything else draws with `currentColor` so CSS owns the colour.
// ===========================================================================

/** Google "G" — official four-colour mark. */
export function GoogleIcon({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

/** Apple mark — official logo path. */
export function AppleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M17.05 12.79c-.03-2.65 2.16-3.92 2.26-3.98-1.23-1.8-3.15-2.05-3.83-2.08-1.63-.17-3.18.96-4.01.96-.83 0-2.1-.94-3.45-.91-1.77.03-3.4 1.03-4.31 2.61-1.84 3.19-.47 7.91 1.32 10.5.87 1.27 1.91 2.69 3.28 2.64 1.32-.05 1.81-.85 3.4-.85 1.59 0 2.03.85 3.42.82 1.41-.02 2.31-1.29 3.17-2.56.99-1.47 1.4-2.89 1.42-2.96-.03-.01-2.73-1.05-2.76-4.15zM14.46 4.9c.73-.88 1.22-2.11 1.09-3.33-1.05.04-2.32.7-3.07 1.58-.67.78-1.26 2.03-1.1 3.22 1.17.09 2.36-.59 3.08-1.47z" />
    </svg>
  );
}

/** Green tick shown at the right of a valid field (Figma ADA/Green #028a0c). */
export function CheckTick({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** Solid caret for the property select. */
export function CaretDown({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M2.5 5.5h11L8 12z" />
    </svg>
  );
}
