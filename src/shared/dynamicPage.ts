// ===========================================================================
// The property a Duda DYNAMIC page is showing.
//
// Property landing pages are dynamic pages bound to the `Properties`
// collection; the homepage and the other static pages are not. Duda says which
// through `dmAPI.dynamicPageApi()`:
//
//   isDynamicPage()  → boolean, synchronous   (verified live 2026-11-04:
//                      true on a property page, false on the homepage)
//   pageData()       → Promise of the row the page is bound to
//
// WHY CANDIDATE IDS, NOT ONE FIELD. The row's id has not been confirmed on a
// live page yet, so the likely spots are all offered and the CALLER keeps the
// first that matches a real `Properties` row. A wrong guess therefore finds no
// row and changes nothing, rather than showing another property's data.
//
// FAILS SOFT: no dmAPI (Duda editor, dev harness), a static page, or a
// rejected pageData() all give [].
// ===========================================================================

interface DynamicPageApiLike {
  isDynamicPage?: () => boolean;
  pageData?: () => Promise<unknown> | unknown;
}

function dynamicPageApi(): DynamicPageApiLike | null {
  const dm = (window as unknown as { dmAPI?: { dynamicPageApi?: () => DynamicPageApiLike } }).dmAPI;
  try {
    return dm?.dynamicPageApi?.() ?? null;
  } catch {
    return null;
  }
}

/** True on a Duda dynamic page. False anywhere else, including outside Duda. */
export function isDynamicPage(): boolean {
  try {
    return dynamicPageApi()?.isDynamicPage?.() === true;
  } catch {
    return false;
  }
}

const idOf = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');

/** The ids this dynamic page's row might carry, most likely first, de-duplicated. */
export async function dynamicPagePropertyIds(): Promise<string[]> {
  return (await dynamicPageKeys()).ids;
}

/** Strip slashes so `/a/b/` and `a/b` compare equal. */
const urlKey = (v: unknown): string => idOf(v).replace(/^\/+|\/+$/g, '').toLowerCase();

/**
 * Everything this dynamic page offers to identify its row:
 *  - `ids`  — the row id candidates (see dynamicPagePropertyIds)
 *  - `urls` — the row's page URL (`page_item_url`, which equals the row's
 *             `slug` on PropertiesInternal), plus the browser path as a last
 *             resort. A caller matches a row whose slug equals one of these,
 *             or that the path ends with.
 * Both empty off a dynamic page, outside Duda, or when pageData() rejects.
 */
export async function dynamicPageKeys(): Promise<{ ids: string[]; urls: string[] }> {
  const none = { ids: [], urls: [] };
  const api = dynamicPageApi();
  if (!api?.pageData || !isDynamicPage()) return none;
  try {
    const raw = (await api.pageData()) as Record<string, unknown> | null | undefined;
    if (!raw || typeof raw !== 'object') return none;
    const nested = raw.data && typeof raw.data === 'object' ? (raw.data as Record<string, unknown>) : {};
    const ids = [raw.id, nested.id, raw.propertyId, nested.propertyId, raw.property_id, nested.property_id]
      .map(idOf)
      .filter(Boolean);
    const urls = [raw.page_item_url, nested.page_item_url, nested.slug,
      typeof window !== 'undefined' ? window.location.pathname : '']
      .map(urlKey)
      .filter(Boolean);
    return { ids: [...new Set(ids)], urls: [...new Set(urls)] };
  } catch {
    return none;
  }
}
