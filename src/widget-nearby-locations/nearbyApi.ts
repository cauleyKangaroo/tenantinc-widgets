import cfg from './config.json';
import {
  fetchProperties as sharedFetchProperties,
  extractNearbyProperties,
  fetchPropertySpaces as sharedFetchPropertySpaces,
  getUserLocation,
  haversineMiles,
  formatDistance,
  type NearbyBaseProperty,
  type NearbySpace,
} from '@shared/nearbyProperties';

// Thin widget adapter: binds the shared nearby-properties layer to this widget's
// own API credentials (config.json). The shared module holds all the logic.

export { getUserLocation, haversineMiles, formatDistance };
export type { NearbySpace };

export const CURRENT_PROPERTY_ID = cfg.propertyId;

/** A card-ready property once distance/spaces/promo are attached. */
export interface NearbyProperty extends NearbyBaseProperty {
  distanceMiles: number | null;
  promo?: string;
  spaces: NearbySpace[];
}

export const fetchProperties = (): Promise<unknown> => sharedFetchProperties(cfg);

export const extractProperties = (raw: unknown): NearbyBaseProperty[] =>
  extractNearbyProperties(raw, cfg.appId);

export const fetchPropertySpaces = (propertyId: string) =>
  sharedFetchPropertySpaces(cfg, propertyId);
