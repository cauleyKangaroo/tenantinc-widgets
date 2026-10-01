// ===========================================================================
// The struck-through "IN-STORE" price — ONE formula, shared by every widget
// that shows the pair.
//
// This number is NOT from the API. It is the operator's own walk-in rate,
// configured on the Space List widget in Duda (`instorePriceMode` +
// `instorePriceAmount`) and derived from the web price. The storage API's own
// standard rate (`costs.Unit.set_rate` on an offer) is a DIFFERENT number and
// deliberately not used here: the site advertises the operator's figure, and
// the listing and the rental rail have to agree with each other before they
// agree with the API.
//
// It lives in @shared because the value travels: #05's card computes it, then
// the same mode+amount ride the tier handoff to #14 and on to the rental
// flow's order rail. Three widgets, one formula — a second copy would drift
// and quote two different savings for the same unit.
// ===========================================================================

/** How the in-store price is derived from the web price. */
export type InstoreMode = 'percentOfWeb' | 'percentDiff' | 'additionOfWeb';

const MODES: InstoreMode[] = ['percentOfWeb', 'percentDiff', 'additionOfWeb'];

/** Whitelist a mode off a URL/prop. Anything unrecognised ⇒ undefined. */
export function asInstoreMode(v: unknown): InstoreMode | undefined {
  return MODES.includes(v as InstoreMode) ? (v as InstoreMode) : undefined;
}

/**
 * A usable amount, or 0.
 *
 * Duda number fields arrive as strings, and an untouched control sends ''.
 * Anything blank, NaN or negative means "no calculation", which reads as 0.
 */
export function asInstoreAmount(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * The in-store price for a web price, or undefined when there is nothing to
 * show.
 *
 *   percentOfWeb   → web + amount%   (100 @ 10 → 110)
 *   additionOfWeb  → web + amount    (100 @ 10 → 110)
 *   percentDiff    → same as percentOfWeb; the intended distinction was never
 *                    specified, so it mirrors A rather than inventing one.
 *
 * Returns undefined when no amount is configured. It deliberately does NOT
 * fall back to any API figure: that fallback is what produced an IN-STORE of
 * $200 beside an ONLINE of $79 on a 5' x 5' (the $200 being the *best* tier's
 * unit price, read off the tier's `units.max_price`), advertising a 60%
 * saving that does not exist.
 *
 * Also undefined when the result would not be strictly above `web` — a
 * "standard" price at or below what is being charged is not a saving, and
 * showing it as one is a false discount claim. This is why the value is
 * recomputed from each surface's OWN price rather than passed around as a
 * finished figure: a strike calculated from the listing's cheapest tier would
 * sit *below* the price of a dearer tier the shopper went on to choose.
 */
export function instoreFrom(web: number, mode?: InstoreMode, amount?: number): number | undefined {
  const amt = asInstoreAmount(amount);
  if (!amt || !Number.isFinite(web) || web <= 0) return undefined;
  const raw = mode === 'additionOfWeb' ? web + amt : web * (1 + amt / 100);
  return raw > web ? raw : undefined;
}
