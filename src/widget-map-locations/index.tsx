// Widget #08 — Map Locations (city page)
import { createWidget } from '@shared/createWidget';
import { MapLocations } from './MapLocations';
import type { MapLocationsProps } from './MapLocations';

export const { init, clean } = createWidget<MapLocationsProps>(MapLocations);
