import React from 'react';

// ===========================================================================
// Icons for the Size Guide widget. Chevron matches the reviews/nearby/faqs
// widgets for cross-widget consistency.
// ===========================================================================

export function ChevronRight({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Video play overlay shown on each size thumbnail. */
export function PlayButton({ size = 72 }: { size?: number }) {
  return (
    <svg className="sg-play" width={size} height={size} viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <circle cx="36" cy="36" r="34" fill="rgba(255,255,255,0.28)" stroke="#fff" strokeWidth="3" />
      <path d="M30 25.5l16.5 10.5L30 46.5z" fill="#fff" />
    </svg>
  );
}
