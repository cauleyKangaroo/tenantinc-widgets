// Widget #07 — Nearby Locations
import { createWidget } from '@shared/createWidget';
import { NearbyLocations } from './NearbyLocations';

export const { init, clean } = createWidget(NearbyLocations);
