// Widget #20 — Locations Banner
import { createWidget } from '@shared/createWidget';
import { LocationsBanner } from './LocationsBanner';
import type { LocationsBannerProps } from './LocationsBanner';

export const { init, clean } = createWidget<LocationsBannerProps>(LocationsBanner);
