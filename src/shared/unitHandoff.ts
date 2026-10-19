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
  /**
   * The operator's struck-through IN-STORE rule, mirrored from the space list
   * that wrote this record — the RULE, never the computed figure, so the rail
   * applies it to the price it is actually showing.
   *
   * Carried here because this route bypasses the URL entirely: without it a
   * "Select" that links straight to /rental loses the strike the card had just
   * shown, while one routed through the tier popup keeps it. See
   * @shared/instorePrice.
   */
  instoreMode?: string;
  instoreAmount?: number;
  instoreValue?: number;
  instoreLabel?: string;
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
// ── A found reservation, on its way to the rental flow ──────────────────────
//
// "Find my Reservation" on #03 looks a code up and sends the customer to the
// rental page to complete it. Like the unit pick above, the details travel in
// localStorage and only the ids go on the URL: the reservation names a person
// (the contact), and that does not belong in a link that can be copied.
//
// Separate from UnitSelection on purpose: that one describes a pricing TIER
// the flow still has to resolve to a unit, while a reservation already names
// the exact unit — and the flow must treat it differently (quote and lease by
// reservation_id, never hold or re-pick).

const RESERVATION_KEY = 'ti.reservation';

export interface ReservationHandoff {
  /** The reservation record id — what the quote and the lease are made with. */
  reservationId: string;
  /** The customer-facing code they typed. */
  code: string;
  unitId: string;
  unitNumber?: string;
  propertyId?: string;
  companyId?: string;
  /** Display size, when the lookup could tell. */
  size?: string;
  /** The reserving contact, to prefill step 1. */
  contact?: { first: string; last: string; email: string; phone: string };
  /** The reserving contact's record id (Lease.Tenants[0].contact_id), so the
   *  lease made from the reservation names the SAME contact rather than
   *  creating a second one from the typed details. */
  contactId?: string;
  savedAt: number;
}

export function saveReservationHandoff(h: Omit<ReservationHandoff, 'savedAt'>): void {
  if (!h.reservationId || !h.unitId) return;
  try {
    window.localStorage.setItem(RESERVATION_KEY, JSON.stringify({ ...h, savedAt: Date.now() } as ReservationHandoff));
  } catch { /* storage unavailable — the URL ids still get the flow there */ }
}

export function readReservationHandoff(maxAgeMs = MAX_AGE_MS): ReservationHandoff | null {
  try {
    const raw = window.localStorage.getItem(RESERVATION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<ReservationHandoff>;
    if (!p || typeof p.reservationId !== 'string' || !p.reservationId || typeof p.unitId !== 'string' || !p.unitId) return null;
    const savedAt = typeof p.savedAt === 'number' ? p.savedAt : 0;
    if (!savedAt || Date.now() - savedAt > maxAgeMs) return null;
    return { ...p, reservationId: p.reservationId, unitId: p.unitId, code: p.code ?? '', savedAt } as ReservationHandoff;
  } catch {
    return null;
  }
}

export function clearReservationHandoff(): void {
  try { window.localStorage.removeItem(RESERVATION_KEY); } catch { /* nothing to do */ }
}

export function rentalHref(path?: string): string {
  const trimmed = (path ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_RENTAL_PATH;
  return trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed) ? trimmed : `/${trimmed}`;
}
