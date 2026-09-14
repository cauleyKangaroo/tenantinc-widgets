// Widget #20 — Storage Type Locations
import { createWidget } from '@shared/createWidget';
import { StorageTypeLocations } from './StorageTypeLocations';
import type { StorageTypeLocationsProps } from './StorageTypeLocations';

export const { init, clean } = createWidget<StorageTypeLocationsProps>(StorageTypeLocations);
