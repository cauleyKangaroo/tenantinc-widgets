// Widget #10 — FAQs
import { createWidget } from '@shared/createWidget';
import { FAQs } from './FAQs';
import type { FaqsProps } from './FAQs';

export const { init, clean } = createWidget<FaqsProps>(FAQs);
