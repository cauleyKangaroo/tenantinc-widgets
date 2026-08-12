// ===========================================================================
// The site's Hummingbird company id, read from the Duda `Company` collection.
//
// WHY THIS EXISTS. `companyId` used to be baked into every widget's config.json
// at build time, which meant a new customer site needed a new build of the
// bundles. This template is meant to be spun up repeatedly, so the company id has
// to be site DATA, not build output: each new site gets its own `Company`
// collection row and reuses the exact same published bundles.
//
// THE COLLECTION. Native ("Internal") collection named `Company`, holding exactly
// ONE row, whose `id` column is the Hummingbird company id (e.g. "kQoBXA8vpn").
// Only the first row is ever read — if someone adds a second it is ignored rather
// than guessed between.
//
// NATIVE, NOT EXTERNAL — the trap. `Properties` is an external collection and
// passes values through as parsed JSON. `Company` is native, so a human types the
// value into a WYSIWYG cell and Duda hands it back wrapped as
// `<p class="rteBlock">kQoBXA8vpn</p>`. Used raw that string would be pasted
// straight into an API URL and every request would 404. Hence `plainText()`.
// See the "Value shapes" section in CLAUDE.md.
//
// FAILS SOFT, ALWAYS. `window.dmAPI` is published-site only — undefined in the
// Duda editor and in the dev harness — and the collection can be missing, empty,
// or renamed. Every one of those returns '' so the caller keeps its config.json
// default and the widget renders exactly as it did before.
// ===========================================================================

import { readCollection, hasCollectionsApi, plainText, logSource } from './dudaCollections';
import { boundText, type BoundPropertyProps } from './propertyBinding';

/** Collection name — case-sensitive, it's the lookup key. */
export const COMPANY_COLLECTION = 'Company';
/** Column on that collection holding the Hummingbird company id. */
export const COMPANY_ID_COLUMN = 'id';

/**
 * In-flight//completed reads, keyed by collection name.
 *
 * Several widgets mount on the same page and each needs the company id before it
 * can fetch anything. Caching the PROMISE (not just the result) means they share a
 * single collection read instead of firing one apiece, and late mounters get the
 * answer immediately rather than waiting on their own round trip.
 */
const cache = new Map<string, Promise<string>>();

/**
 * The site's company id from the `Company` collection, or '' when unavailable.
 *
 * Never throws and never returns rich-text markup.
 */
export function fetchCompanyId(
  widgetTag: string,
  collectionName: string = COMPANY_COLLECTION,
): Promise<string> {
  const cached = cache.get(collectionName);
  if (cached) return cached;

  const pending = readCompanyId(widgetTag, collectionName);
  cache.set(collectionName, pending);
  return pending;
}

async function readCompanyId(widgetTag: string, collectionName: string): Promise<string> {
  if (!hasCollectionsApi()) {
    logSource(widgetTag, 'company id', false, 'no dmAPI — not on a published Duda page');
    return '';
  }

  const rows = await readCollection(collectionName);
  if (!rows.length) {
    logSource(widgetTag, 'company id', false, `${collectionName} empty or missing`);
    return '';
  }

  // Native collection → the cell is rich text, so strip it to the bare id.
  const id = plainText(rows[0][COMPANY_ID_COLUMN]);
  if (!id) {
    logSource(
      widgetTag, 'company id', false,
      `${collectionName} row 1 has no "${COMPANY_ID_COLUMN}" value`,
    );
    return '';
  }

  if (rows.length > 1) {
    // eslint-disable-next-line no-console
    console.warn(
      `[companySource] "${collectionName}" has ${rows.length} rows; using the first ("${id}"). ` +
      'This collection is meant to hold exactly one.',
    );
  }

  logSource(widgetTag, 'company id', true, `${collectionName} → ${id}`);
  return id;
}

/**
 * The company id this widget instance should use.
 *
 * Precedence:
 *   1. a bound/explicit `companyId` prop — unambiguous editor intent, and the
 *      per-instance escape hatch if one widget must target another company;
 *   2. the `Company` collection — the normal path, and what makes the bundles
 *      reusable across sites;
 *   3. `configCompanyId` from config.json — the build-time default, which now
 *      only applies in the Duda editor, the dev harness, and on sites that have
 *      not been given a `Company` collection yet.
 */
export async function resolveCompanyIdFromSources(
  widgetTag: string,
  bound: BoundPropertyProps,
  configCompanyId = '',
  collectionName: string = COMPANY_COLLECTION,
): Promise<string> {
  const explicit = boundText(bound.companyId);
  if (explicit) return explicit;

  const fromCollection = await fetchCompanyId(widgetTag, collectionName);
  return fromCollection || configCompanyId;
}

/** Drop the cached read. Only needed by tests and the dev harness. */
export function clearCompanyIdCache(): void {
  cache.clear();
}
