// Widget #13 — Footer
import { createWidget } from '@shared/createWidget';
import { Footer } from './Footer';
import type { FooterProps } from './Footer';

export const { init, clean } = createWidget<FooterProps>(Footer);
