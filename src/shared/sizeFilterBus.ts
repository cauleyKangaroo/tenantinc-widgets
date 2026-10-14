// Cross-widget size filter. The Size Guide (#11) and the Space List (#05) are
// separate AMD bundles on the same Duda page, so — like promoBus — they talk
// through a window CustomEvent. "See Available Spaces" on a size card narrows
// the Space List to that size and scrolls up to it — TAB-SPECIFIC: a 5x10 on
// the guide's Small tab only matches 5x10 storage units in the Space List's
// Small group. The Space List decides (it alone knows its units), and scrolls
// only when something matches.

export const SIZE_FILTER_EVENT = 'tenantinc:show-size';

export interface SizeFilterSelection {
  /** The size in any spelling — "5 x 10", "5’ x 10’", "5' x 10'". */
  dimensions: string;
  /** The card's title, e.g. "5’ x 10’" or "Storage Locker". */
  label: string;
  /** The guide tab's key — "small", "extra_small", "parking", … */
  band?: string;
  /** From the guide's Parking tab: match parking spaces, not a storage band. */
  parking?: boolean;
}

/** The parts of a Space List unit the match reads. */
export interface SizeFilterUnit {
  dimensions: string;
  /** Size band, e.g. "small". */
  size: string;
  /** Space type, e.g. "storage", "parking". */
  type: string;
}

/** "5' x 10'" / "5’ x 10’" / "5 x 10" → "5x10"; '' when it holds no W x L. */
export function sizeKey(dimensions: string): string {
  const m = /(\d+(?:\.\d+)?)\s*['’′]?\s*[x×]\s*(\d+(?:\.\d+)?)/i.exec(dimensions || '');
  return m ? `${Number(m[1])}x${Number(m[2])}` : '';
}

/**
 * Does this unit answer the guide's card? Same size, and the same TAB:
 *   - Parking tab → a parking unit of that size;
 *   - any other tab → a STORAGE unit of that size in the same size band
 *     (the guide's "small" is the Space List's Small group).
 * Commercial, wine and the rest have no guide tab, so they never match.
 */
export function unitMatchesSize(unit: SizeFilterUnit, sel: SizeFilterSelection): boolean {
  const key = sizeKey(sel.dimensions);
  if (!key || sizeKey(unit.dimensions) !== key) return false;
  if (sel.parking) return unit.type === 'parking';
  return unit.type === 'storage' && (!sel.band || unit.size === sel.band);
}

/** Ask the Space List to show this size. It scrolls itself, if anything matches. */
export function emitShowSize(sel: SizeFilterSelection): void {
  try {
    window.dispatchEvent(new CustomEvent<SizeFilterSelection>(SIZE_FILTER_EVENT, { detail: sel }));
  } catch { /* no window */ }
}
