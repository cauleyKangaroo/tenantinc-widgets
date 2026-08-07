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

// Thin widget adapter: binds the shared nearby-properties layer to this widget's
// own API credentials (config.json). The shared module holds all the logic.

export { getUserLocation, haversineMiles, formatDistance };
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
 * No `requirePropertyId`: that trust check needs a property we actually expect to
 * be there, and this widget is given none. Passing config.json's build-time id
 * would look for a property from a DIFFERENT company, declare the site's own
 * collection untrustworthy and fall back to REST — the opposite of the intent.
 */
export const fetchProperties = async (): Promise<unknown> =>
  sharedFetchProperties(await creds(), {});

export const extractProperties = (raw: unknown): NearbyBaseProperty[] =>
  extractNearbyProperties(raw, cfg.appId);

export const fetchPropertySpaces = async (propertyId: string) =>
  sharedFetchPropertySpaces(await creds(), propertyId);
