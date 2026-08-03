// Widget #01 — Utility Bar
import { createWidget } from '@shared/createWidget';
import { UtilityBar } from './UtilityBar';
import type { UtilityBarProps } from './UtilityBar';

export const { init, clean } = createWidget<UtilityBarProps>(UtilityBar);
