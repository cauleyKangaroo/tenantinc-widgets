import { createWidget } from '@shared/createWidget';
import { Clock } from './Clock';
import type { ClockProps } from '@shared/types';

export const { init, clean } = createWidget<ClockProps>(Clock);
