// Widget #09 — Reviews
import { createWidget } from '@shared/createWidget';
import { Reviews } from './Reviews';
import type { ReviewsProps } from './Reviews';

export const { init, clean } = createWidget<ReviewsProps>(Reviews);
