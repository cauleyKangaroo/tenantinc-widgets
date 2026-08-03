// Widget #06 — Promotions
import { createWidget } from '@shared/createWidget';
import { Promotions } from './Promotions';
import type { PromotionsProps } from './Promotions';

export const { init, clean } = createWidget<PromotionsProps>(Promotions);
