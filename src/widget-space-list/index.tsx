import { createWidget } from '@shared/createWidget';
import { SpaceList } from './SpaceList';
import type { SpaceListProps } from './types';

export const { init, clean } = createWidget<SpaceListProps>(SpaceList);
