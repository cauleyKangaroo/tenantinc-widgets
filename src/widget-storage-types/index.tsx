// Widget #20 — Storage Types (index grid + related carousel)
import { createWidget } from '@shared/createWidget';
import { StorageTypes } from './StorageTypes';
import type { StorageTypesProps } from './StorageTypes';

export const { init, clean } = createWidget<StorageTypesProps>(StorageTypes);
