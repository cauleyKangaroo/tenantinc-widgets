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

// ---------------------------------------------------------------------------
// Operator artwork from the site's Duda Media Manager.
//
// An uploaded file is served from Duda's CDN at a path built only from the
// SITE ID and the filename (verified live 2026-09-01):
//
//   https://irp.cdn-website.com/{siteId}/dms3rep/multi/Small.png
//
// The Media Manager FOLDER does not appear in that path — a file dropped into
// a "spaces" folder is served flat from dms3rep/multi/ like every other. So
// there is nothing to look up and no proxy to build: the folder is an
// organising device in Duda's UI, and the only question that matters is
// whether the FILE resolves, which the browser answers by itself.
//
// `siteId` arrives as a Duda prop (data.siteId) and is populated in the editor
// as well as on a published page — it is what already keys the saved accordion
// config. That is why this works where anything built on `window.dmAPI` could
// not: dmAPI is published-site only.
//
// Returns undefined rather than a guess when there is no site id, so the card
// keeps its bundled render instead of requesting a URL that cannot exist.
// ---------------------------------------------------------------------------

const DUDA_CDN = 'https://irp.cdn-website.com';

/**
 * Band → filename stem.
 *
 * No spaces, deliberately: "Extra Small.png" would need percent-encoding in the
 * URL and is easy for an operator to get subtly wrong (two spaces, a non-break
 * space). `other` is absent on purpose — it is the bucket for a tier whose
 * dimensions did not parse, so there is no meaningful picture to ask for.
 */
const MEDIA_FILE_STEM: Partial<Record<UnitSize, string>> = {
  extra_small: 'ExtraSmall',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  extra_large: 'ExtraLarge',
};

/**
 * The operator's own image for a size band, or undefined.
 *
 * `.png` only. Trying `.jpg` as well would double the failed requests on every
 * site that has uploaded nothing, to catch a case an operator can fix by
 * renaming one file.
 *
 * `baseUrl` overrides the derived CDN root — a different region, images hosted
 * elsewhere, or the dev harness pointing at a real site.
 */
export function mediaManagerImageFor(
  size: UnitSize,
  siteId?: string,
  baseUrl?: string,
): string | undefined {
  const stem = MEDIA_FILE_STEM[size];
  if (!stem) return undefined;
  const base = (baseUrl ?? '').trim().replace(/\/+$/, '');
  if (base) return `${base}/${stem}.png`;
  const id = (siteId ?? '').trim();
  // 'dev-site' is the harness placeholder: a real request against it can only
  // 403, so it is treated as no site at all.
  if (!id || id === 'dev-site') return undefined;
  return `${DUDA_CDN}/${encodeURIComponent(id)}/dms3rep/multi/${stem}.png`;
}
