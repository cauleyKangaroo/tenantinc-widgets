// ---------------------------------------------------------------------------
// One image, three fallbacks, used by every card that shows a space.
//
//   1. unit.mediaImage  the operator's own artwork from the Duda Media Manager
//   2. unit.image       the bundled render for this dimension / size band
//   3. defaultImg       the generic placeholder
//
// Step 2 is the reason this exists. The cards already fell back on error, but
// straight to the GENERIC default — so simply pointing `src` at the Media
// Manager URL would have dropped a 10x20 card from its own 10x20 render to a
// plain placeholder every time the operator had not uploaded Large.png. That
// is worse than doing nothing, and it would only show on sites that had
// started using the feature.
//
// Missing files come back 403 rather than 404 (Duda's CDN), which changes
// nothing here: `error` fires either way.
// ---------------------------------------------------------------------------
import type { Unit } from '../types';

/** What to request first: operator artwork when there is any, else the bundle. */
export function unitImageSrc(unit: Pick<Unit, 'image' | 'mediaImage'>, fallback: string): string {
  return unit.mediaImage || unit.image || fallback;
}

/**
 * Walk down the chain on each failure.
 *
 * Guarded against a loop: a browser that fails the final image too would
 * otherwise re-fire `error` on the same src forever. Comparing against the
 * value we are about to set stops that, and `dataset` is not needed — the
 * current src IS the position in the chain.
 */
export function unitImageOnError(
  unit: Pick<Unit, 'image' | 'mediaImage'>,
  fallback: string,
): (e: { currentTarget: HTMLImageElement }) => void {
  return (e) => {
    const el = e.currentTarget;
    const next = el.src.endsWith(unit.image) || !unit.image ? fallback : unit.image;
    if (el.src !== next) el.src = next;
  };
}
