// Cross-widget channel: #05 Space List → #18 Space List Heading. Separate AMD
// bundles on the same Duda page, so they talk via window — the same pattern as
// findStorageBus, tierBus and promoBus.
//
// WHY: on mobile #05 hides its own title and #18 draws it instead (so #06 can
// sit between heading and filters). The title is set on #05's content menu
// (`propertyHeader`), which #18 never sees — so editing it changed desktop and
// not mobile. #05 now publishes the title it renders, and #18 shows that.
//
// The value is ALSO kept on window, not only sent as an event: the bundles load
// in either order, and a #18 that mounts after #05 has already published would
// otherwise miss it.

export const SPACE_LIST_HEADING_EVENT = 'tenantinc:space-list:heading';

const KEY = '__tenantincSpaceListHeading';

type HeadingWindow = Window & { [KEY]?: string };

/** #05: the title it is showing (or '' while it has none to show). */
export function publishSpaceListHeading(title: string): void {
  try {
    const w = window as HeadingWindow;
    if (w[KEY] === title) return;
    w[KEY] = title;
    window.dispatchEvent(new CustomEvent(SPACE_LIST_HEADING_EVENT, { detail: title }));
  } catch {
    /* no window — nothing to tell */
  }
}

/** #18: the last title #05 published, '' if none yet. */
export function readSpaceListHeading(): string {
  try {
    return (window as HeadingWindow)[KEY] ?? '';
  } catch {
    return '';
  }
}

/** #18: called with each new title. Returns the unsubscribe. */
export function onSpaceListHeading(fn: (title: string) => void): () => void {
  const handler = (e: Event) => fn(String((e as CustomEvent).detail ?? ''));
  window.addEventListener(SPACE_LIST_HEADING_EVENT, handler);
  return () => window.removeEventListener(SPACE_LIST_HEADING_EVENT, handler);
}
