// Widget #14 — Tier Selection
import { createWidget } from '@shared/createWidget';
import { TierSelection } from './TierSelection';
import type { TierSelectionProps } from './TierSelection';

export const { init, clean } = createWidget<TierSelectionProps>(TierSelection);
