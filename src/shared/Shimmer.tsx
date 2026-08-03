// ===========================================================================
// Skeleton primitive.
//
// Widgets that read an API or a Duda collection must never paint their demo
// constants first — a visitor sees plausible-looking names, prices or reviews
// that are then replaced, which reads as a glitch (and briefly shows data for the
// wrong property). The fix is always the same shape: hold a `loading` flag until
// the fetch settles, render skeletons while it's true, and keep the demo constant
// as the fallback for an EMPTY result only (which also covers the dev harness,
// where there's no API or dmAPI at all).
//
// Styles are inline with a single injected keyframe rather than per-widget CSS:
// each widget is its own bundle, so a shared component that carried class names
// would need the same CSS copied into every stylesheet.
// ===========================================================================

import React, { useEffect } from 'react';

const STYLE_ID = 'ti-shimmer-style';

function ensureKeyframes() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
@keyframes ti-shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
@media (prefers-reduced-motion: reduce) { .ti-shimmer { animation: none !important; } }`;
  document.head.appendChild(style);
}

export interface ShimmerProps {
  /** CSS width — number means px. Default '100%'. */
  w?: number | string;
  /** CSS height — number means px. Default 16. */
  h?: number | string;
  /** Corner radius. Default 6. */
  r?: number | string;
  /** Bottom margin, for stacks of bars. */
  mb?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

const size = (v: number | string | undefined, fallback: number | string) =>
  v === undefined ? fallback : typeof v === 'number' ? `${v}px` : v;

/** One shimmering placeholder block. */
export function Shimmer({ w, h, r = 6, mb, className, style }: ShimmerProps) {
  useEffect(ensureKeyframes, []);
  return (
    <span
      aria-hidden="true"
      className={['ti-shimmer', className].filter(Boolean).join(' ')}
      style={{
        display: 'block',
        width: size(w, '100%'),
        height: size(h, 16),
        marginBottom: mb === undefined ? undefined : size(mb, 0),
        borderRadius: size(r, 6),
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '600px 100%',
        animation: 'ti-shimmer 1.4s infinite linear',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
