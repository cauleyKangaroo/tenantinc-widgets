import cfg from './config.json';
import {
  fetchProperties as sharedFetchProperties,
  extractNearbyProperties,
  fetchPropertySpaces as sharedFetchPropertySpaces,
  getUserLocation,
  haversineMiles,
  formatDistance,
  type NearbyApiConfig,
  type NearbyBaseProperty,
  type NearbySpace,
} from '@shared/nearbyProperties';
import { resolveCompanyIdFromSources } from '@shared/companySource';
import { asPropertiesResponse } from '@shared/propertiesSource';
import {
  INTERNAL_PROPERTIES_COLLECTION,
  fetchPriorityOrder,
  propertyLikeRows,
  readInternalProperties,
  sortByPriorityThenName,
} from '@shared/internalProperties';
import { logSource } from '@shared/dudaCollections';

// Thin widget adapter: binds the shared nearby-properties layer to this widget's
// own API credentials (config.json). The shared module holds all the logic.

export { getUserLocation, haversineMiles, formatDistance };
export { fetchPriorityOrder, sortByPriorityThenName, INTERNAL_PROPERTIES_COLLECTION };
export type { NearbySpace };

/** A card-ready property once distance/spaces/promo are attached. */
export interface NearbyProperty extends NearbyBaseProperty {
  distanceMiles: number | null;
  promo?: string;
  spaces: NearbySpace[];
}

/**
 * This widget's credentials, with the company from the `Company` collection.
 *
 * The company is site data, not build output — config.json's value is only the
 * fallback for the Duda editor, the dev harness, and sites with no `Company`
 * collection yet. The read is cached in @shared/companySource, so resolving it per
 * call costs one collection read for the whole page.
 */
async function creds(): Promise<NearbyApiConfig> {
  return { ...cfg, companyId: await resolveCompanyIdFromSources('#07 nearby', {}, cfg.companyId) };
}

/**
 * Every property in the company — this widget lists locations, so it wants them all.
 *
 * SOURCE ORDER: `PropertiesInternal` → `Properties` → keyed REST.
 *
 * `PropertiesInternal` comes first because it is the site's OWN collection: it is
 * where the operator curates this widget (`priorityOrder`, hero photos), so where
 * it also carries property data that data is the operator's intent. But it exists
 * mainly to hold those extras, and on a site where it has only
 * `id`/`heroimage`/`images`/`priorityOrder` there is no name, address or phone to
 * render — `propertyLikeRows` is the check, and a photos-only collection falls
 * through to `Properties` instead of producing a grid of blank cards.
 *
 * **This re-source is #07-only.** Every other collection-backed widget still
 * starts from `Properties`; nothing shared changed to make room for it.
 *
 * No `requirePropertyId` on the fallback: that trust check needs a property we
 * actually expect to be there, and this widget is given none. Passing
 * config.json's build-time id would look for a property from a DIFFERENT company,
 * declare the site's own collection untrustworthy and fall back to REST — the
 * opposite of the intent.
 */
export async function fetchProperties(
  collectionName: string = INTERNAL_PROPERTIES_COLLECTION,
): Promise<unknown> {
  const c = await creds();
  const internal = propertyLikeRows(await readInternalProperties(collectionName));
  if (internal.length) {
    logSource('#07 nearby', 'properties', true, `${collectionName}, ${internal.length} rows`);
    return asPropertiesResponse(internal, c.appId);
  }
  return sharedFetchProperties(c, {});
}

/**
 * `requireCoords: false` — keep properties the API gave no lat/lng for.
 *
 * The default drops them, because ranking by distance needs a position. But this
 * widget already renders a distance-less list (no geolocation and no page
 * property is the normal site-wide case, and `distanceMiles: null` just hides the
 * badge), and "featured" ordering does not use distance at all. Verified live
 * 2026-08-13 that every property on the current company has `lat: null`, so the
 * strict default would drop the whole portfolio and leave the widget showing demo
 * cards. Rows without coordinates come back with lat/lng 0 and `hasCoords` false
 * — callers must check that flag before measuring or plotting them.
 */
export const extractProperties = (raw: unknown): NearbyBaseProperty[] =>
  extractNearbyProperties(raw, cfg.appId, { requireCoords: false });

export const fetchPropertySpaces = async (propertyId: string) =>
  sharedFetchPropertySpaces(await creds(), propertyId);

/** What one property's space lookup yields. */
export interface PropertySpaces {
  promo?: string;
  spaces: NearbySpace[];
}

/**
 * Spaces + promo for SEVERAL properties — **the seam for the batch endpoint.**
 *
 * Today there is no single API for this, so this fans out one
 * `fetchPropertySpaces` per id (each of which is two sequential REST round
 * trips: list the property's space-groups, then read the website group). The
 * caller therefore asks only for the cards actually on screen — 3 for a
 * one-row layout, 6 for two — instead of the whole portfolio.
 *
 * When the single property-spaces API lands, **this function is the only thing
 * that changes**: it already takes a list of ids and reports per id, so the
 * component above it does not move. Credentials are resolved ONCE here rather
 * than per id, which is also what a batch call will want.
 *
 * `onResult` fires **as each property resolves**, not after all of them, so a
 * fast card paints without waiting on the slowest in its page. The returned
 * promise settles when every id has reported.
 *
 * Fails soft PER ID: a property whose lookup throws reports empty spaces, so one
 * bad property can never reject the batch and blank the rest of the page.
 */
export async function fetchSpacesForProperties(
  propertyIds: string[],
  onResult: (propertyId: string, data: PropertySpaces) => void,
): Promise<void> {
  if (!propertyIds.length) return;
  const c = await creds();
  await Promise.all(
    propertyIds.map(async (id) => {
      try {
        onResult(id, await sharedFetchPropertySpaces(c, id));
      } catch {
        onResult(id, { spaces: [] });
      }
    }),
  );
}
