// ===========================================================================
// The phone number of the property a Duda dynamic page is showing — for #02's
// navbar ONLY.
//
// Deliberately separate from `fetchPropertyContact()` (propertyContact.ts):
// that one also feeds #13 footer, #19 My Account and useSocialProfiles, and its
// phone pick (first active entry) is left exactly as it is for them.
//
// SOURCE: `PropertiesInternal` first — the collection the property pages are
// bound to (its rows carry `page_item_url`) and the one the nav's Find Storage
// menu already reads, so the read is shared. `Properties` is the fallback.
//
// WHICH NUMBER. A property's `phones` list holds several entries, and on the
// live data the first ones are `"type":"Office"` with `"phone":""` while the
// real number is the `"type":"Main"` entry (verified on Bellflower,
// 2026-11-11). So: skip empty numbers, prefer an active Main, then any active
// number, then any number at all. None ⇒ null, and the nav keeps the site's
// business number.
//
// FAILS SOFT: not a dynamic page, no dmAPI (Duda editor, dev harness), no row,
// no usable number → null.
// ===========================================================================

import { readCollection, hasCollectionsApi, str, plainText, logSource, type CollectionRow } from './dudaCollections';
import { readInternalProperties, INTERNAL_PROPERTIES_COLLECTION } from './internalProperties';
import { PROPERTIES_COLLECTION } from './propertiesSource';
import { boundJson } from './propertyBinding';
import { formatPhone } from './propertyContact';
import { dynamicPageKeys } from './dynamicPage';

export interface PagePhone {
  /** Formatted, e.g. "(562) 925-0534". */
  phone: string;
  /** Digits for the tel: link, e.g. "15629250534". */
  digits: string;
}

/** The row's phone entries, whether they arrive as an array or a JSON string. */
function phoneEntries(row: CollectionRow): Record<string, unknown>[] {
  const raw = row.Phones ?? row.phones;
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? boundJson<unknown>(plainText(raw)) : null;
  return Array.isArray(list) ? (list.filter((e) => e && typeof e === 'object') as Record<string, unknown>[]) : [];
}

/** Main + active → any active → any; empty numbers never count. */
export function pickPropertyPhone(row: CollectionRow): PagePhone | null {
  const usable = phoneEntries(row)
    .map((e) => ({
      digits: str(e.phone ?? e.number).replace(/\D/g, ''),
      active: Number(e.status) !== 0,
      main: str(e.type).trim().toLowerCase() === 'main',
    }))
    .filter((e) => e.digits.length > 0);
  const best = usable.find((e) => e.main && e.active) ?? usable.find((e) => e.active) ?? usable[0];
  return best ? { phone: formatPhone(best.digits), digits: best.digits } : null;
}

const slugOf = (row: CollectionRow): string =>
  plainText(row.slug).trim().replace(/^\/+|\/+$/g, '').toLowerCase();

/** The row for this page: by id first, then by slug against the page's URL. */
function findRow(rows: CollectionRow[], ids: string[], urls: string[]): CollectionRow | undefined {
  for (const id of ids) {
    const hit = rows.find((r) => plainText(r.id).trim() === id);
    if (hit) return hit;
  }
  for (const url of urls) {
    const hit = rows.find((r) => {
      const slug = slugOf(r);
      return slug !== '' && (url === slug || url.endsWith(`/${slug}`));
    });
    if (hit) return hit;
  }
  return undefined;
}

/** The current dynamic page's property phone, or null to keep the default. */
export async function fetchPagePropertyPhone(widgetTag: string): Promise<PagePhone | null> {
  const { ids, urls } = await dynamicPageKeys();
  if (!ids.length && !urls.length) return null; // not a dynamic page / not in Duda
  if (!hasCollectionsApi()) return null;

  const sources: Array<[string, () => Promise<CollectionRow[]>]> = [
    [INTERNAL_PROPERTIES_COLLECTION, () => readInternalProperties()],
    [PROPERTIES_COLLECTION, () => readCollection(PROPERTIES_COLLECTION)],
  ];
  for (const [name, read] of sources) {
    const row = findRow(await read(), ids, urls);
    const phone = row ? pickPropertyPhone(row) : null;
    if (phone) {
      logSource(widgetTag, 'page property phone', true, `${name} → ${str(row?.name) || ids[0] || urls[0]}, ${phone.phone}`);
      return phone;
    }
  }
  logSource(widgetTag, 'page property phone', false, `no row with a phone for ids [${ids.join(', ')}] / urls [${urls.join(', ')}]`);
  return null;
}
