// Generic Duda site-navigation reader.
//
// Wraps `dmAPI.getNavItemsAsync()` so any widget can read the site's page /
// navigation tree — the same tree the Pages panel drives, honouring each page's
// "Hide in navigation" setting. Returns [] on ANY failure (not inside Duda, no
// dmAPI, the call is missing, it throws). Never throws. Deliberately generic:
// section names, icons and menu shape belong to the consuming widget, not here.
//
// Mirrors the getDmAPI()/"return [] on failure" shape of dudaCollections.ts.

/** A normalized navigation node. `children` is always an array (never missing). */
export interface DudaNavItem {
  /** Menu display name. */
  title: string;
  /** Stable internal id — the reliable key for mapping (titles are editable). */
  alias: string;
  /** Site-relative URL. */
  path: string;
  /** Page uuid, when the API provides it. */
  uuid?: string;
  /** Whether the page is shown in navigation (Duda's Hide-in-navigation flag). */
  visible: boolean;
  /** Nested pages (Duda allows up to 3 levels total). */
  children: DudaNavItem[];
}

/** Raw item as the JS API returns it — fields are best-effort/optional. */
interface RawNavItem {
  title?: string;
  alias?: string;
  path?: string;
  uuid?: string;
  /** Canonical on getNavItemsAsync(). */
  visible?: boolean;
  /** Field name used by the deprecated synchronous getNavItems(). */
  inNavigation?: boolean;
  subNav?: RawNavItem[];
}

interface DmAPINav {
  getNavItemsAsync?: () => Promise<RawNavItem[]>;
}

function getDmAPI(): DmAPINav | null {
  const w = window as unknown as { dmAPI?: DmAPINav };
  return w.dmAPI ?? null;
}

/** True when the navigation JS API is available (i.e. we're inside Duda). */
export function hasNavApi(): boolean {
  return typeof getDmAPI()?.getNavItemsAsync === 'function';
}

function normalize(raw: unknown): DudaNavItem[] {
  if (!Array.isArray(raw)) return [];
  const out: DudaNavItem[] = [];
  for (const r of raw as RawNavItem[]) {
    if (!r || typeof r !== 'object') continue;
    // Tolerate both field names — `visible` (async) and `inNavigation` (sync,
    // deprecated) — and default to shown if neither is present.
    const visible = r.visible ?? r.inNavigation ?? true;
    out.push({
      title: typeof r.title === 'string' ? r.title : '',
      alias: typeof r.alias === 'string' ? r.alias : '',
      path: typeof r.path === 'string' ? r.path : '',
      uuid: typeof r.uuid === 'string' ? r.uuid : undefined,
      visible: !!visible,
      children: normalize(r.subNav),
    });
  }
  return out;
}

// dmAPI can be injected a tick after the widget mounts, so a one-shot read can
// race and permanently miss it. Poll for availability up to ~2s before giving up.
const READY_ATTEMPTS = 10;
const READY_DELAY_MS = 200;
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// Promise memoization: one in-flight/successful read is shared across widgets.
// An empty result is NOT cached, so a later call (e.g. once dmAPI is ready) can
// still succeed.
let inFlight: Promise<DudaNavItem[]> | null = null;

/**
 * Read the site's navigation tree. Safe everywhere: returns [] outside Duda
 * (editor JS-less preview, dev harness) or on any error — callers keep their own
 * fallback menu for those contexts. Waits (bounded) for the API to appear so a
 * mount-time race doesn't leave the menu empty for the whole visit.
 */
export async function fetchDudaNavigation(): Promise<DudaNavItem[]> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      let dmAPI = getDmAPI();
      for (let i = 0; i < READY_ATTEMPTS && typeof dmAPI?.getNavItemsAsync !== 'function'; i++) {
        await wait(READY_DELAY_MS);
        dmAPI = getDmAPI();
      }
      if (typeof dmAPI?.getNavItemsAsync !== 'function') return [];
      return normalize(await dmAPI.getNavItemsAsync());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[dudaNav] getNavItemsAsync failed:', err);
      return [];
    }
  })();
  const result = await inFlight;
  if (!result.length) inFlight = null;
  return result;
}

/** Drop the memoized read (mainly for tests / forced re-fetch). */
export function resetDudaNavigationCache(): void {
  inFlight = null;
}
