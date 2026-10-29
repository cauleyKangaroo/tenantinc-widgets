// ===========================================================================
// Duda Content Library — the site's own business info, via
// `dmAPI.loadContentLibrary()`.
//
// The content-library JSON carries the site's primary location under
// `location_data`, with the phone numbers as
//   phones: [{ phoneNumber: "(888) 809-0076", label: "Main" }]
// (live shape, 2026-10-29). This is the number the site owner maintains in
// Duda's Business Info panel, so for site-wide chrome (#02 nav, #13 footer)
// it outranks the `Properties` collection — that row is one facility's line,
// not the site's.
//
// The same object is ALSO on the page as `window.siteObject` — the sites' JS
// tabs already read their site_texts.custom values from it — and that one is
// there synchronously, so it is checked first. It has been seen in two forms:
// the parsed JSON, and a Java-toString rendering ("phones=[{phoneNumber=…,
// label=…}]"), hence the regex fallback, mirroring the JS tab's own
// getCustomValues.
//
// The REST equivalent (GET /api/sites/multiscreen/{siteId}/content) is NOT an
// option from the page: it needs Partner-API Basic auth, which the public
// bundle cannot hold.
//
// Like the Collections API, `loadContentLibrary` exists on PUBLISHED sites
// only, and `dmAPI` is injected by the page's own scripts after an
// external-app widget may already have mounted — so this waits briefly for it
// (the same reasoning as dudaCollections' waitForCollectionsApi). Fails soft
// to null everywhere, and the read is promise-cached per bundle so a page
// holding several callers asks once.
// ===========================================================================

import { str, logSource } from './dudaCollections';
import { withTimeout, TIMEOUTS } from './withTimeout';
import { formatPhone } from './propertyContact';

interface DmContentLibraryAPI {
  loadContentLibrary?: () => Promise<unknown>;
}

function getDm(): DmContentLibraryAPI | null {
  const w = window as unknown as { dmAPI?: DmContentLibraryAPI };
  return w.dmAPI ?? null;
}

export interface SitePhone {
  /** Formatted for display, e.g. "(888) 809-0076". */
  phone: string;
  /** Raw digits for tel: links. */
  digits: string;
  /** The entry's label, e.g. "Main". */
  label: string;
}

type PhoneEntry = { phoneNumber: string; label: string };

/** `location_data.phones` out of a parsed content-library object. */
function phonesFromLibrary(lib: unknown): PhoneEntry[] {
  if (!lib || typeof lib !== 'object') return [];
  const loc = (lib as Record<string, unknown>).location_data;
  if (!loc || typeof loc !== 'object') return [];
  const phones = (loc as Record<string, unknown>).phones;
  if (!Array.isArray(phones)) return [];
  return (phones as Record<string, unknown>[])
    .map((p) => ({ phoneNumber: str(p.phoneNumber), label: str(p.label) }))
    .filter((p) => p.phoneNumber);
}

/**
 * `window.siteObject`, either shape. The string form is a Java toString —
 * "…phones=[{phoneNumber=(888) 809-0076, label=Main}]…" — so it's picked
 * apart the same way the sites' JS tabs pick apart custom=[…].
 */
function phonesFromSiteObject(): PhoneEntry[] {
  const so = (window as unknown as { siteObject?: unknown }).siteObject;
  if (!so) return [];
  if (typeof so === 'object') return phonesFromLibrary(so);
  const m = String(so).match(/phones=\[([^\]]*)\]/);
  if (!m) return [];
  const out: PhoneEntry[] = [];
  m[1].replace(/\{([^}]*)\}/g, (_, entry: string) => {
    const pn = entry.match(/phoneNumber=([^,}]*)/);
    const lb = entry.match(/label=([^,}]*)/);
    if (pn && pn[1].trim()) out.push({ phoneNumber: pn[1].trim(), label: lb ? lb[1].trim() : '' });
    return '';
  });
  return out;
}

/** The "Main" entry when there is one; otherwise the first with a number. */
function pickPhone(phones: PhoneEntry[], widgetTag: string, source: string): SitePhone | null {
  const entry = phones.find((p) => /main/i.test(p.label)) ?? phones[0];
  if (!entry) return null;
  const phone: SitePhone = {
    phone: formatPhone(entry.phoneNumber),
    digits: entry.phoneNumber.replace(/\D/g, ''),
    label: entry.label,
  };
  logSource(widgetTag, 'site phone', true, `${source} → ${phone.phone}${phone.label ? ` (${phone.label})` : ''}`);
  return phone;
}

const API_WAIT_MS = 1500;

function waitForContentLibrary(): Promise<boolean> {
  if (getDm()?.loadContentLibrary) return Promise.resolve(true);
  const deadline = Date.now() + API_WAIT_MS;
  return new Promise((resolve) => {
    const tick = () => {
      if (getDm()?.loadContentLibrary) return resolve(true);
      if (Date.now() >= deadline) return resolve(false);
      window.setTimeout(tick, 100);
    };
    tick();
  });
}

async function readSitePhone(widgetTag: string): Promise<SitePhone | null> {
  // `siteObject` is set by the page's own scripts before widgets mount, so a
  // hit here answers synchronously, with no 1.5s wait to lose.
  try {
    const fromSiteObject = pickPhone(phonesFromSiteObject(), widgetTag, 'siteObject');
    if (fromSiteObject) return fromSiteObject;
  } catch { /* fall through to the API */ }

  if (!(await waitForContentLibrary())) {
    logSource(widgetTag, 'site phone', false, 'no siteObject phone and no dmAPI.loadContentLibrary — Duda editor, dev harness, or an older site');
    return null;
  }
  try {
    const lib = await withTimeout(
      getDm()!.loadContentLibrary!(), TIMEOUTS.collection, null, 'content library',
    );
    const phone = pickPhone(phonesFromLibrary(lib), widgetTag, 'content library');
    if (!phone) logSource(widgetTag, 'site phone', false, 'content library has no location phone');
    return phone;
  } catch (err) {
    logSource(widgetTag, 'site phone', false, `content library read failed: ${String(err)}`);
    return null;
  }
}

let cached: Promise<SitePhone | null> | null = null;

/**
 * The site's main phone number from Duda's Business Info. Null outside a
 * published Duda site, or when the content library carries no phone — callers
 * keep their next source (`Properties` row, then their prop/default).
 */
export function fetchSitePhone(widgetTag: string): Promise<SitePhone | null> {
  cached ??= readSitePhone(widgetTag);
  return cached;
}

/** Tests and the harness only. */
export function clearSitePhoneCache(): void {
  cached = null;
}
