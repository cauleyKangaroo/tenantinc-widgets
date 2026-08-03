// ===========================================================================
// Per-instance accordion config — persistence
//
// READ  (always, client-side): the published widget reads its saved arrangement
//        straight from the Duda `accordionConfig` collection via the read-only
//        Collections JS API (window.dmAPI). No credentials needed.
// WRITE (editor only): the reorder modal's Save POSTs to a small PHP proxy that
//        holds the Duda Partner API credentials server-side and upserts the row.
//        The widget never sees those credentials.
//
// Both paths fail SOFT: any error → fall back to defaults / surface a message,
// never throw into render.
// ===========================================================================

import { ACCORDION_SECTIONS, type AccordionConfig, type AccordionKey } from './accordionSections';

const VALID_KEYS = new Set<string>(ACCORDION_SECTIONS.map((s) => s.key));

/** Build the per-instance lookup key. Null unless we have both Duda ids. */
export function instanceKey(siteId?: string, elementId?: string): string | null {
  if (!siteId || !elementId) return null;
  return `${siteId}_${elementId}`;
}

/** Keep only known section keys, de-duped, order preserved. */
function sanitizeKeys(input: unknown): AccordionKey[] {
  if (!Array.isArray(input)) return [];
  const out: AccordionKey[] = [];
  const seen = new Set<string>();
  for (const v of input) {
    if (typeof v === 'string' && VALID_KEYS.has(v) && !seen.has(v)) {
      out.push(v as AccordionKey);
      seen.add(v);
    }
  }
  return out;
}

/** Collection columns store arrays as JSON text; tolerate a comma list too. */
function parseKeyList(v: unknown): AccordionKey[] {
  if (Array.isArray(v)) return sanitizeKeys(v);
  if (typeof v === 'string' && v.trim() !== '') {
    try {
      return sanitizeKeys(JSON.parse(v));
    } catch {
      return sanitizeKeys(v.split(',').map((s) => s.trim()));
    }
  }
  return [];
}

// ── READ via Duda Collections JS API ──────────────────────────────────────────

// Minimal shape of the bits of the Collections JS API we touch. The real API
// also exposes .where()/.orderBy() etc.; we fetch all rows and filter in JS
// because this collection is tiny and it sidesteps any operator-syntax quirks.
interface DmCollectionQuery {
  get(): Promise<unknown>;
}
interface DmCollectionsAPI {
  data(collectionName: string): DmCollectionQuery;
}
interface DmAPILike {
  loadCollectionsAPI?: () => Promise<DmCollectionsAPI>;
}

function getDmAPI(): DmAPILike | null {
  const w = window as unknown as { dmAPI?: DmAPILike };
  return w.dmAPI ?? null;
}

/** Pull a rows array out of whatever envelope the JS API returns. */
function extractRows(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>;
    const arr = obj.values ?? obj.data ?? obj.rows;
    if (Array.isArray(arr)) return arr as Record<string, unknown>[];
  }
  return [];
}

/**
 * Read this instance's saved arrangement. Returns null on ANY failure — not in
 * Duda, no dmAPI, collection absent, no matching row, parse error — so the
 * caller always falls back to the default order with nothing hidden.
 */
export async function readAccordionConfig(
  collectionName: string,
  key: string,
): Promise<AccordionConfig | null> {
  try {
    const dmAPI = getDmAPI();
    if (!dmAPI?.loadCollectionsAPI) return null;
    const collections = await dmAPI.loadCollectionsAPI();
    const res = await collections.data(collectionName).get();
    // Rows may arrive flat ({instanceKey,…}) or nested under a `data` key
    // ({data:{instanceKey,…}}) depending on the API surface — handle both.
    const fieldsOf = (r: Record<string, unknown>): Record<string, unknown> =>
      (r.data && typeof r.data === 'object' ? (r.data as Record<string, unknown>) : r);
    const match = extractRows(res).find((r) => fieldsOf(r).instanceKey === key);
    if (!match) return null;
    const fields = fieldsOf(match);
    return {
      order: parseKeyList(fields.order),
      hidden: parseKeyList(fields.hidden),
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[SpaceList] readAccordionConfig failed; using defaults', err);
    return null;
  }
}

// ── WRITE via PHP proxy → Duda REST API ───────────────────────────────────────

export interface SaveArgs {
  endpoint: string;
  siteId: string;
  elementId: string;
  config: AccordionConfig;
}

/**
 * Persist the arrangement through the PHP proxy. Throws on non-2xx so the modal
 * can show the error and keep itself open for a retry.
 */
export async function saveAccordionConfig({ endpoint, siteId, elementId, config }: SaveArgs): Promise<void> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId,
      elementId,
      instanceKey: `${siteId}_${elementId}`,
      order: config.order,
      hidden: config.hidden,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Save failed (HTTP ${res.status})${text ? `: ${text.slice(0, 1500)}` : ''}`);
  }
}
