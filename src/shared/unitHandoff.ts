// ===========================================================================
// Unit handoff — "Select" on a space list → the rental page.
//
// The picked unit travels in localStorage rather than the URL, so the link is a
// plain `/rental` with nothing to leak, share wrongly, or get mangled by Duda's
// routing. Written by #05 (space list) and #08 (map locations); read by #99
// (rental flow).
//
// WHY NOT ONLY THE ID. The rental flow resolves a unit against a company and a
// property, and on a multi-property site the id alone is ambiguous — the same
// widget on a different property page would resolve someone else's unit. So the
// record carries the context the flow already accepts as URL params today
// (propertyId / companyId / unitGroupId / size). `unitId` is the required part;
// everything else is a hint that costs nothing to keep.
//
// THE URL STILL WINS in the rental flow. Existing `?unitId=` links and the
// value-tiers handoff keep working exactly as before; this is a fallback, not a
// replacement, so nothing that works today stops working.
// ===========================================================================

/** Where the rental flow lives. Root-relative: Duda serves every page from the
 *  site root on the preview host and the live domain alike, so one path is
 *  right in both without the bundle knowing either. */
export const DEFAULT_RENTAL_PATH = '/rental';

/** localStorage key. Namespaced so it can't collide with anything Duda keeps. */
const STORAGE_KEY = 'ti.unitSelection';

/**
 * How long a stored selection stays good, in ms.
 *
 * localStorage has no expiry of its own, so without this a unit picked weeks
 * ago would silently load the next time someone opened /rental directly. An
 * hour is long enough to survive a detour through the page and short enough
 * that a stale pick never surprises anyone.
 */
const MAX_AGE_MS = 60 * 60 * 1000;

export interface UnitSelection {
  /**
   * The clicked PRICING TIER's id — NOT a rentable unit id.
   *
   * The space lists show tiers (from /space-groups/…/groups); an actual unit is
   * only chosen later, from /units/available. Feeding this to
   * GET /units/{id}/lease-set-up returns no quote, which is why the rental
   * rail must resolve a real unit from `size` + `price` instead. Kept because
   * it identifies exactly which row was clicked.
   */
  tierId: string;
  /** Context so a multi-property site resolves the RIGHT unit. */
  propertyId?: string;
  companyId?: string;
  unitGroupId?: string;
  /**
   * e.g. "10' x 10'". Load-bearing, not decoration: with `price` it is how the
   * rental flow finds a REAL unit for the tier that was clicked.
   */
  size?: string;
  /** The tier's online/starting price — ties the resolved unit to the row the
   *  visitor actually clicked rather than the cheapest of that size. */
  price?: number;
  /** Epoch ms, for the staleness check. */
  savedAt: number;
}

/**
 * Store the picked unit. Fails soft: Safari private mode and a full quota both
 * throw on setItem, and a dead handoff must never break the click that made it.
 */
export function saveUnitSelection(sel: Omit<UnitSelection, 'savedAt'>): void {
  if (!sel.tierId) return;
  try {
    const payload: UnitSelection = { ...sel, savedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* storage disabled/full — the rental page just won't preselect. */
  }
}

/**
 * The stored selection, or null when there is none, it's unreadable, or it has
 * gone stale. Never throws — no storage at all is a normal state (the Duda
 * editor, a sandboxed iframe, privacy settings).
 */
export function readUnitSelection(maxAgeMs = MAX_AGE_MS): UnitSelection | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UnitSelection>;
    if (!parsed || typeof parsed.tierId !== 'string' || !parsed.tierId) return null;
    const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : 0;
    if (!savedAt || Date.now() - savedAt > maxAgeMs) return null;
    return { ...parsed, tierId: parsed.tierId, savedAt } as UnitSelection;
  } catch {
    return null;
  }
}

/** Forget the stored selection — used once the flow has a unit of its own. */
export function clearUnitSelection(): void {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* nothing to do */ }
}

/**
 * Normalise a configured rental path into an href.
 *
 * Mirrors @shared/propertyNav's base-path handling: a missing leading slash
 * would make the link relative to the current page — fatal on a property page
 * at /storage-units/california/… — and a trailing one would double up.
 */
export function rentalHref(path?: string): string {
  const trimmed = (path ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_RENTAL_PATH;
  return trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed) ? trimmed : `/${trimmed}`;
}
