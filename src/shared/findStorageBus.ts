// Cross-widget channel: any widget → Navigation Bar (#02). Separate AMD bundles
// on the same Duda page, so they talk via a window event — the same pattern as
// tierBus and promoBus.
//
// The event NAMES are not invented here: they are #02's own public hook, already
// documented on its listener effect so a Duda Text link or HTML embed can pop the
// mega menu with a one-liner:
//
//   window.dispatchEvent(new Event('tenantinc:find-storage:open'))
//
// This module is the typed, ACKNOWLEDGED version of that call for widgets in this
// repo. A plain Event still works — #02 listens by name and does not care about
// the event's class — but it tells the caller nothing about whether a nav was
// there to answer. That matters for a control like the breadcrumb's "Find
// Storage" crumb: the nav is a different widget, and a page can perfectly well
// not have one, in which case the crumb needs to know it did nothing rather than
// leaving the reader clicking a control that never responds.

export const FIND_STORAGE_OPEN_EVENT = 'tenantinc:find-storage:open';
export const FIND_STORAGE_CLOSE_EVENT = 'tenantinc:find-storage:close';
export const FIND_STORAGE_TOGGLE_EVENT = 'tenantinc:find-storage:toggle';

/**
 * Ask #02 to open its Find Storage mega menu.
 *
 * Returns true when a nav ACKNOWLEDGED the request (by calling preventDefault),
 * false when nothing answered — no nav on the page, or the bundle has not
 * mounted yet. Callers should treat false as "this did nothing" and fall back or
 * warn rather than assume it worked.
 *
 * The panel is `position: fixed` and full-viewport with its own mobile layout, so
 * it does not matter how far down the page the caller sits or how narrow the
 * window is.
 */
export function openFindStorage(): boolean {
  try {
    // cancelable, so a listener can acknowledge by calling preventDefault —
    // dispatchEvent then returns false. Same handshake as emitOpenTiers.
    const ev = new CustomEvent(FIND_STORAGE_OPEN_EVENT, { cancelable: true });
    return !window.dispatchEvent(ev);
  } catch {
    // No window (SSR / a test env). Nothing was opened, and saying so lets the
    // caller fall back instead of silently swallowing it.
    return false;
  }
}
