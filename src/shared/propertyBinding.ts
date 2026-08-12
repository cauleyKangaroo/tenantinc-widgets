// ===========================================================================
// Dynamic-page property binding
//
// On a Duda DYNAMIC PAGE the page is bound to a row of the `Properties`
// collection, and the editor picks which row via the page dropdown. Our widgets
// used to hardcode one `propertyId` in config.json, which cannot work there:
// the same widget instance has to render Apex Storage on one page and Storage
// Outlet - Chino on the next.
//
// The editor tells the widget which row by adding content-menu fields and using
// Duda's "Connect to data" on them. The bound value arrives in `data.config.<name>`
// and is forwarded as a prop, exactly like any other content-menu field.
//
// TWO BINDING STRATEGIES, and why both exist
// ------------------------------------------
// 1. BIND `propertyId` TO `Properties > id`  ← strongly preferred, one field
//    The widget then reads the whole `Properties` collection itself and pulls the
//    matching row, so every field (name, address, phones, emails, AccessHours,
//    SocialMedia, lat/lng, unit_type_counts) arrives as PARSED JSON via the
//    Collections JS API — objects stay objects and arrays stay arrays.
//
// 2. BIND EACH FIELD INDIVIDUALLY (`propertyName`, `propertyAddress`, …)
//    Works, and is the only option for scalars if `id` is ever not bindable, but
//    a content-menu field is a TEXT input: Duda has to flatten the value to fit.
//    Scalars (`name`, `utc_offset`) survive cleanly. Objects and arrays
//    (`Address`, `Phones`, `AccessHours`, `SocialMedia`, `unit_type_counts`) may
//    arrive as a JSON string, a display string, or "[object Object]" depending on
//    how Duda serialises them — so the parsers below are deliberately tolerant
//    and give up quietly rather than rendering garbage.
//
// PRECEDENCE is therefore: individually-bound field → collection row found via
// `propertyId` → the widget's existing props/DEFAULTS. An explicitly bound field
// wins because it is unambiguous editor intent.
//
// NOTE ON companyId: this new site points its external collection at a DIFFERENT
// company than the one baked into each config.json. That makes the keyed REST
// fallback wrong here, not just stale — see `resolveRequireId` below and the
// `dynamicPage` notes in CLAUDE.md.
// ===========================================================================

import { readCollection, str, logSource, hasCollectionsApi, type CollectionRow } from './dudaCollections';
import { PROPERTIES_COLLECTION } from './propertiesSource';

/**
 * Content-menu fields an editor can bind with "Connect to data". Every one is
 * optional — an unbound widget behaves exactly as it did before.
 *
 * Typed as `unknown` rather than a concrete shape on purpose: what Duda actually
 * hands over for a collection-bound TEXT field is not guaranteed (see the header),
 * so these go through the coercers below instead of being trusted.
 */
export interface BoundPropertyProps {
  /** `Properties > id` — the single most useful binding. Unlocks everything else. */
  propertyId?: string;
  /**
   * The company the bound property belongs to. NOT a `Properties` column — it is a
   * plain content-menu text field, because a property id is only meaningful inside
   * its company and the new site's properties live under a different company than
   * the one baked into `config.json`. Empty = the configured company.
   */
  companyId?: string;
  /** `Properties > name` */
  propertyName?: unknown;
  /** `Properties > Address` — object with address/city/state/zip and lat/lng. */
  propertyAddress?: unknown;
  /** `Properties > Phones` */
  propertyPhones?: unknown;
  /** `Properties > Emails` */
  propertyEmails?: unknown;
  /** `Properties > AccessHours` — drives the live status lines + "See all Hours". */
  propertyAccessHours?: unknown;
  /** `Properties > SocialMedia` */
  propertySocials?: unknown;
  /** `Properties > unit_type_counts` */
  propertyUnitCounts?: unknown;
  /** `Properties > utc_offset` — IANA tz; hours status is computed in it. */
  propertyTimezone?: unknown;
}

/** The content-menu field names, for docs/validation. Keep in step with the interface. */
export const BOUND_FIELD_NAMES = [
  'propertyId', 'propertyName', 'propertyAddress', 'propertyPhones', 'propertyEmails',
  'propertyAccessHours', 'propertySocials', 'propertyUnitCounts', 'propertyTimezone',
] as const;

// ---------------------------------------------------------------------------
// Coercion — Duda content-menu values are untrusted input
// ---------------------------------------------------------------------------

/**
 * Duda leaves an unbound text field as '' and, on a dynamic page whose row has no
 * value, can pass the literal handlebars token through unsubstituted. Treat all of
 * those as "not set" so they never win precedence over real data.
 */
export function boundText(v: unknown): string {
  if (v == null) return '';
  const s = str(v).trim();
  if (!s) return '';
  // Unsubstituted handlebars ("{{propertyName}}") means the binding didn't resolve.
  if (/^\{\{.*\}\}$/.test(s)) return '';
  // Duda's flattening of an object it can't render as text. Never useful.
  if (s === '[object Object]' || s === 'undefined' || s === 'null') return '';
  return s;
}

/**
 * An object/array bound field, whichever way Duda delivered it.
 *
 * Accepts a value that is already parsed (the Collections JS API path) or a JSON
 * string (the flattened content-menu path). Anything else — including
 * "[object Object]" — yields null, so the caller falls through to the next source
 * rather than displaying nonsense.
 */
export function boundJson<T>(v: unknown): T | null {
  if (v == null) return null;
  if (typeof v === 'object') return v as T;

  const s = boundText(v);
  if (!s) return null;
  // Only attempt a parse when it actually looks like JSON; a plain display string
  // like "5281 California, Irvine" is not an error, it's just not structured.
  if (!/^[[{]/.test(s)) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[propertyBinding] bound field looked like JSON but would not parse:', s.slice(0, 120));
    return null;
  }
}

/**
 * The property id this widget instance should render, or '' when unbound.
 * `configPropertyId` is the config.json value — the pre-dynamic-page default.
 */
export function resolvePropertyId(bound: BoundPropertyProps, configPropertyId = ''): string {
  return boundText(bound.propertyId) || configPropertyId;
}

/**
 * The company id for this instance's REST calls, or the config.json default.
 *
 * A property id is only unique WITHIN a company: `properties/{id}/…` under the wrong
 * company 404s (or, worse, matches nothing and renders empty). So any widget that
 * accepts a bound `propertyId` has to accept the company alongside it — verified
 * live 2026-08-05 that the two live sites are different companies:
 * `QZxjPop2lA` (Storelocal, the configured one) and `kQoBXA8vpn` (Storage Outlet /
 * Apex — the new dynamic-page site).
 */
export function resolveCompanyId(bound: BoundPropertyProps, configCompanyId = ''): string {
  return boundText(bound.companyId) || configCompanyId;
}

/**
 * The id to hand `propertiesSource`'s `requirePropertyId` trust check —
 * **the BOUND id only**, never the config.json one.
 *
 * That check exists to stop a collection bound to another company silently
 * replacing good REST data. It is only meaningful when we actually know which
 * property we want, and Duda is the one that knows: the id is passed in from the
 * JS tab per page.
 *
 * Handing it the configured id instead is actively harmful. That value is a
 * build-time default which on this site belongs to a DIFFERENT company, so the
 * check would look for a property the collection cannot contain, declare the
 * site's own collection untrustworthy, and fall back to a REST call — the exact
 * outcome the check exists to prevent.
 *
 * Unbound therefore means undefined = "no check": use the collection if it has
 * rows. The collection is the site's own data; there is nothing to distrust.
 *
 * The `configPropertyId` parameter is accepted and ignored so call sites read
 * consistently with `resolvePropertyId` beside them.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function resolveRequireId(bound: BoundPropertyProps, configPropertyId = ''): string | undefined {
  return boundText(bound.propertyId) || undefined;
}

// ---------------------------------------------------------------------------
// Collection row lookup
// ---------------------------------------------------------------------------

/**
 * The `Properties` row for one id, straight from the Collections JS API.
 *
 * This is the strategy-1 path: with `propertyId` bound, one read gives the whole
 * property with its nested arrays intact. Fails soft to null — no dmAPI (Duda
 * editor / dev harness), collection renamed, or id absent.
 */
export async function readPropertyRow(
  widgetTag: string,
  propertyId: string,
  collectionName: string = PROPERTIES_COLLECTION,
): Promise<CollectionRow | null> {
  if (!propertyId) return null;
  if (!hasCollectionsApi()) {
    logSource(widgetTag, 'dynamic property', false, 'no dmAPI — not on a published Duda page');
    return null;
  }

  const rows = await readCollection(collectionName);
  const match = rows.find((r) => str(r.id) === propertyId);
  if (!match) {
    logSource(
      widgetTag, 'dynamic property', false,
      rows.length
        ? `${collectionName} has ${rows.length} row(s), none with id ${propertyId}`
        : `${collectionName} empty or missing`,
    );
    return null;
  }

  logSource(widgetTag, 'dynamic property', true, `${collectionName} → ${str(match.name) || propertyId}`);
  return match;
}

/**
 * Overlay the individually-bound fields onto a collection row, so downstream code
 * has ONE object to read regardless of which binding strategy the editor used.
 *
 * Bound fields win (explicit editor intent); the row fills every gap. Values that
 * coerce to "not set" are skipped rather than blanking a good row value — that is
 * what makes an unbound widget behave exactly as before.
 */
export function mergeBoundIntoRow(row: CollectionRow | null, bound: BoundPropertyProps): CollectionRow | null {
  const name = boundText(bound.propertyName);
  const tz = boundText(bound.propertyTimezone);
  const address = boundJson<Record<string, unknown>>(bound.propertyAddress);
  const phones = boundJson<unknown[]>(bound.propertyPhones);
  const emails = boundJson<unknown[]>(bound.propertyEmails);
  const access = boundJson<unknown[]>(bound.propertyAccessHours);
  const socials = boundJson<unknown[]>(bound.propertySocials);
  const counts = boundJson<unknown[]>(bound.propertyUnitCounts);

  // A plain (non-JSON) address string is still a real binding — `boundJson` returns
  // null for it, so it has to be counted separately or a widget with ONLY the
  // address bound would resolve to nothing at all.
  const addressText = !address ? boundText(bound.propertyAddress) : '';

  const anyBound = name || tz || address || addressText || phones || emails || access || socials || counts;
  if (!row && !anyBound) return null;

  const merged: CollectionRow = { ...(row ?? {}) };
  const id = boundText(bound.propertyId);
  if (id) merged.id = id;
  if (name) merged.name = name;
  if (tz) merged.utc_offset = tz;
  if (address) merged.Address = address;
  if (phones) merged.Phones = phones;
  if (emails) merged.Emails = emails;
  if (access) merged.AccessHours = access;
  if (socials) merged.SocialMedia = socials;
  if (counts) merged.unit_type_counts = counts;

  // Keep the plain address for display even though it carries no lat/lng, so the
  // map falls back to hiding rather than pointing somewhere wrong.
  if (addressText) merged.__addressText = addressText;

  return merged;
}

/**
 * The dynamic-page property for a widget, as a `Properties`-shaped row: the bound
 * row (looked up by id) with any individually-bound fields layered on top. null
 * when the page isn't dynamic / nothing is bound / we're not on a published site,
 * in which case callers keep their existing behaviour untouched.
 */
export async function resolveBoundProperty(
  widgetTag: string,
  bound: BoundPropertyProps,
  opts: { configPropertyId?: string; collectionName?: string } = {},
): Promise<CollectionRow | null> {
  const { configPropertyId = '', collectionName = PROPERTIES_COLLECTION } = opts;
  const id = resolvePropertyId(bound, configPropertyId);
  const row = await readPropertyRow(widgetTag, id, collectionName);
  return mergeBoundIntoRow(row, bound);
}
