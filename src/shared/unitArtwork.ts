// ===========================================================================
// A unit's picture — the SAME answer for every widget that draws one.
//
// Moved here from #05's spaceImages.ts so #19 My Account can show the tenant's
// unit with the artwork the space cards use, without bundling #05's fallback
// JPEGs into a second widget: this module carries no assets, only the rules
// for where the operator's own artwork lives and which file to ask for.
//
// Three tiers, most specific first, and the <img> walks them on error:
//
//   1. {siteId}/dms3rep/multi/{Stem}_{Amenity}.png   the site's own, by amenity
//   2. {siteId}/dms3rep/multi/{Stem}.png             the site's own, by band
//   3. duda-unit-images/{Stem}.png                   the shared S3 set, by band
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
// ===========================================================================
import type { SpaceType, UnitSize } from '../widget-space-list/types';

export type { SpaceType, UnitSize };

/**
 * Area (sq ft) → size bucket, per the client's guide (2026-07-30):
 *
 *   Small        ≤ 50    5×5, 5×10
 *   Medium    51–150     8×10, 8×12, 10×10, 10×15
 *   Large    151–300     10×20, 10×22, 10×25, 10×30, 15×20 (and 20×15, also 300)
 *   Extra Large  > 300   15×30, 20×30
 *
 * The previous thresholds (24 / 76 / 151) put every live tier but the two largest
 * in the wrong bucket — 5×10 read as Medium, 10×10 as Large, 10×20 as Extra Large.
 *
 * `other` is kept for a tier whose width/length don't parse (area 0), so it can't
 * silently land in Small. `extra_small` is no longer produced — it stays in the
 * UnitSize union because the label/open-state maps are keyed on the full union.
 */
export function classifySize(area: number): UnitSize {
  if (area <= 0) return 'other';
  if (area <= 50) return 'small';
  if (area <= 150) return 'medium';
  if (area <= 300) return 'large';
  return 'extra_large';
}

const DUDA_CDN = 'https://irp.cdn-website.com';

/**
 * Band → filename stem.
 *
 * `XSmall` / `XLarge`, NOT `ExtraSmall` / `ExtraLarge`. This is the operator's
 * convention, confirmed against the live CDN 2026-09-01: XSmall.png and
 * XLarge.png return 200, the Extra* spellings 403. Guessing the long form
 * would have meant every extra-small and extra-large card silently skipping
 * artwork that was sitting there.
 *
 * No spaces, since a filename with one needs percent-encoding and is easy to
 * get subtly wrong (a double space, a non-breaking space).
 *
 * `other` is absent on purpose — the bucket for a tier whose dimensions did not
 * parse, so there is no meaningful picture to ask for.
 */
const MEDIA_FILE_STEM: Partial<Record<UnitSize, string>> = {
  extra_small: 'XSmall',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  extra_large: 'XLarge',
};

/**
 * Amenity label -> the token used in a filename.
 *
 * A MAP RATHER THAN A RULE, because the names operators actually use are not
 * derivable from the API labels: "Drive-Up Access" is filed as Driveup, and
 * "Climate Control" as Climate_Controlled — one drops a word and a hyphen, the
 * other gains a suffix. No single transform produces both.
 *
 * Keys are lower-cased and stripped of punctuation before lookup, so
 * "Drive-Up Access", "drive up access" and "DriveUp  Access" all land on the
 * same entry. Anything unlisted falls through to amenitySlug() below, which is
 * predictable and needs no code change — the map exists only to honour names
 * already chosen for the common ones.
 */
const AMENITY_FILE_TOKEN: Record<string, string> = {
  driveupaccess: 'Driveup',
  driveup: 'Driveup',
  climatecontrol: 'Climate_Controlled',
  climatecontrolled: 'Climate_Controlled',
  interioraccess: 'Interior_Access',
};

/** Lookup key: letters and digits only, lower-cased. */
const amenityKey = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Fallback for an amenity with no alias: punctuation runs become single
 * underscores. "24 Hours access" -> "24_Hours_access". Left as the operator
 * capitalised it, since the filename has to match a real upload and guessing
 * at title case would be one more way to miss.
 */
function amenitySlug(label: string): string {
  return label.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function amenityFileToken(label?: string): string | undefined {
  const raw = (label ?? '').trim();
  if (!raw) return undefined;
  const alias = AMENITY_FILE_TOKEN[amenityKey(raw)];
  if (alias) return alias;
  // An amenity of only punctuation slugs to '', which is not a filename.
  return amenitySlug(raw) || undefined;
}

/**
 * Parking's fallback picture.
 *
 * Parking is NOT filed by size band. A bay is described by what fits in it, not
 * by how many square feet it is, so the operator's library is named for the
 * vehicles — Car.png, Car_RV.png, Car_RV_Boat.png, Covered_Car_RV.png and so
 * on. The broadest of those is the safe default: a bay that takes a boat also
 * takes a car, so the picture is never a promise the space cannot keep.
 */
const PARKING_DEFAULT_STEM = 'Car_RV_Boat';

/**
 * Types that are NOT filed by size band, and the file the operator names
 * them by. Parking is the vehicle picture (see above). Wine is one file,
 * `Wine_Storage.png` — a wine locker is sold as what it is, not by its square
 * footage, and the operator uploaded exactly that name (Media Manager,
 * 2026-10-09). Storage, and any type not listed, keeps the band stems.
 */
const TYPE_STEM: Record<string, string> = {
  parking: PARKING_DEFAULT_STEM,
  wine: 'Wine_Storage',
};

/**
 * The only stems the shared S3 set carries (probed 2026-09-09: the five bands
 * and Car_RV_Boat return 200; everything else 403). A type-named file such as
 * Wine_Storage lives in the site's own Media Manager alone, so asking S3 for
 * it would be one guaranteed-failed request per wine card.
 */
const S3_STEMS = new Set(['XSmall', 'Small', 'Medium', 'Large', 'XLarge', PARKING_DEFAULT_STEM]);

/**
 * The shared S3/CloudFront set, used when the site's own Media Manager has
 * nothing for a band.
 *
 * Every site gets these without uploading anything, which is the point: the
 * Duda library is per-site and mostly empty, so before this a card on a fresh
 * site fell straight past the operator artwork to the bundled render.
 *
 * ONLY THE SIX BASE STEMS EXIST HERE. Probed 2026-09-09: XSmall, Small,
 * Medium, Large, XLarge and Car_RV_Boat all return 200 as .png; every amenity
 * variant (Small_Driveup, Covered_Car_RV, …) returns 403. So this tier
 * contributes the band picture alone — asking it for an amenity file would be
 * one guaranteed-failed request per card, every time.
 *
 * A miss answers 403, exactly as Duda's CDN does, so the card's existing
 * walk-on-error needs no special case. CORS is open and the type is image/png.
 */
const S3_FALLBACK_BASE = 'https://dr2r4w0s7b8qm.cloudfront.net/duda-unit-images';

/**
 * Operator artwork for a size band, MOST specific first.
 *
 *   1. {Band}_{Amenity}.png   e.g. Small_Driveup.png
 *   2. {Band}.png             e.g. Small.png
 *   3. the shared S3 set's {Band}.png
 *
 * Returned as an ordered list rather than one url because the card walks it:
 * each entry is tried and the next is used when the browser reports the image
 * did not load. There is no way to know in advance which exists — a missing
 * file answers 403 from Duda's CDN, and only a real request reveals that.
 *
 * The amenity is the one ALREADY SHOWN as the card subtitle, so the picture
 * and the caption beside it can never disagree.
 *
 * `.png` only. Trying `.jpg` as well would double the failed requests on every
 * site that has uploaded nothing, to catch a case an operator fixes by
 * renaming one file.
 */
export function mediaManagerImagesFor(
  size: UnitSize,
  opts: {
    siteId?: string;
    baseUrl?: string;
    amenity?: string;
    type?: SpaceType;
    /** Override the shared S3 set; '' disables that tier entirely. */
    s3BaseUrl?: string;
  } = {},
): string[] {
  const parking = opts.type === 'parking';
  const typeStem = opts.type ? TYPE_STEM[opts.type.toLowerCase()] : undefined;
  // Storage is filed by band; parking and wine are filed by TYPE and fall
  // back to their one named picture instead (see TYPE_STEM).
  const stem = typeStem ?? MEDIA_FILE_STEM[size];
  // No stem means no picture to ask ANY host for — `other`, the bucket for a
  // tier whose dimensions did not parse.
  if (!stem) return [];

  const out: string[] = [];

  let root = (opts.baseUrl ?? '').trim().replace(/\/+$/, '');
  if (!root) {
    const id = (opts.siteId ?? '').trim();
    // 'dev-site' is the harness placeholder: a request against it can only
    // 403, so it is treated as no site at all.
    if (id && id !== 'dev-site') root = `${DUDA_CDN}/${encodeURIComponent(id)}/dms3rep/multi`;
  }

  if (root) {
    const token = amenityFileToken(opts.amenity);
    /*
     * Parking's specific file is the amenity ALONE — Covered_Car_RV.png, not
     * Car_RV_Boat_Covered_Car_RV.png. The names already say what the space is,
     * so prefixing the default would describe it twice and match nothing that
     * has been uploaded.
     */
    /*
     * Wine has ONE file, by type: no amenity variant is tried, because none
     * was uploaded and the first candidate is also the first request.
     */
    const names = typeStem && !parking
      ? [stem]
      : token
        ? [parking ? token : `${stem}_${token}`, stem]
        : [stem];
    out.push(...names.map((n) => `${root}/${n}.png`));
  }

  /*
   * The shared set, LAST among the artwork: the site's own upload always wins,
   * and this only answers when the operator has not provided that band.
   *
   * Reached with no site id at all — the Duda tier needs one, this does not —
   * so the harness and a site whose Media Manager is empty both still get real
   * artwork instead of dropping to the bundled render.
   *
   * Base stem only, because that is all that exists there (see the constant).
   */
  const s3 = (opts.s3BaseUrl ?? S3_FALLBACK_BASE).trim().replace(/\/+$/, '');
  if (s3 && S3_STEMS.has(stem)) out.push(`${s3}/${stem}.png`);

  return out;
}

/**
 * Step an <img> to the next candidate whenever one fails, and hide it once
 * they are exhausted. Walking the list IS the existence check: a missing file
 * answers 403 — from Duda's CDN and from CloudFront alike — and only a real
 * request reveals it.
 *
 * Position is read from the element's CURRENT src rather than kept in state,
 * so the handler stays pure and a re-render cannot rewind it.
 *
 * Hiding is inline `visibility:hidden`, which keeps the image's box: the
 * stylesheets give every unit image a fixed box so the card is its final
 * height before the file arrives, and collapsing it on the last failure would
 * shrink the card under the reader. An empty slot of the right size is the
 * honest answer, and it is the one that doesn't move.
 */
export function walkImagesOnError(
  candidates: string[],
): (e: { currentTarget: HTMLImageElement }) => void {
  return (e) => {
    const el = e.currentTarget;
    const i = candidates.findIndex((c) => el.src === c || el.src.endsWith(c));
    const next = candidates[(i < 0 ? 0 : i) + 1];
    if (next && el.src !== next) {
      el.src = next;
      return;
    }
    // Out of candidates: nothing here is a picture of this space.
    el.style.visibility = 'hidden';
  };
}
