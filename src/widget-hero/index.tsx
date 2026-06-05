import { createWidget } from '@shared/createWidget';
import { Hero } from './Hero';
import type { HeroProps } from '@shared/types';

export const { init, clean } = createWidget<HeroProps>(Hero);
