// Widget #11 — Size Guide
import { createWidget } from '@shared/createWidget';
import { SizeGuide } from './SizeGuide';
import type { SizeGuideProps } from './SizeGuide';

export const { init, clean } = createWidget<SizeGuideProps>(SizeGuide);
