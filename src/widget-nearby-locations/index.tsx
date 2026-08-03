// Widget #07 — Nearby Locations
import { createWidget } from '@shared/createWidget';
import { NearbyLocations } from './NearbyLocations';
import type { NearbyLocationsProps } from './NearbyLocations';

export const { init, clean } = createWidget<NearbyLocationsProps>(NearbyLocations);
