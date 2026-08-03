// ---------------------------------------------------------------------------
// DEMO card imagery for the Space List.
//
// The API does not yet return an image (nor an image-type key) per unit, so we
// DERIVE a card image from the fields it does return: dimensions, size and type.
//   • exact dimension match (5x10 / 10x10 / 10x15 / 10x20 / 10x30) → that render
//   • otherwise the nearest render by size category
//   • parking → covered vs. open space
// When the backend adds an image/type field to the unit, replace the body of
// spaceImageFor() with a direct lookup on it — nothing else needs to change.
// ---------------------------------------------------------------------------
import type { SpaceType, UnitSize } from './types';

import locker from './assets/spaces/locker.jpg';
import s5x10 from './assets/spaces/5x10.jpg';
import s10x10 from './assets/spaces/10x10.jpg';
import s10x15 from './assets/spaces/10x15.jpg';
import s10x20 from './assets/spaces/10x20.jpg';
import s10x30 from './assets/spaces/10x30.jpg';
import parkingCovered from './assets/spaces/parking-covered.jpg';
import parkingOpen from './assets/spaces/parking.jpg';

const BY_DIMS: Record<string, string> = {
  '5x10': s5x10,
  '10x10': s10x10,
  '10x15': s10x15,
  '10x20': s10x20,
  '10x30': s10x30,
};

const BY_SIZE: Record<UnitSize, string> = {
  other: locker,
  extra_small: locker,
  small: locker,
  medium: s10x10,
  large: s10x20,
  extra_large: s10x30,
};

/** "10' x 20'" → "10x20" (grabs the first two numbers, ignores quotes/spacing). */
function normalizeDims(dimensions: string): string {
  const m = dimensions.match(/(\d+)\D+(\d+)/);
  return m ? `${m[1]}x${m[2]}` : '';
}

export function spaceImageFor(unit: {
  type: SpaceType;
  dimensions: string;
  size: UnitSize;
  subtype?: string;
}): string {
  if (unit.type === 'parking') {
    // "Covered" / "Enclosed" parking → the covered render; "Outdoor" etc. → open.
    return /cover|enclos/i.test(unit.subtype ?? '') ? parkingCovered : parkingOpen;
  }
  return BY_DIMS[normalizeDims(unit.dimensions)] ?? BY_SIZE[unit.size] ?? s10x10;
}
