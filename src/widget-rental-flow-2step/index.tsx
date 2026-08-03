// Widget #99 (TBD) — Rental Flow (2 Step)
import { createWidget } from '@shared/createWidget';
import { RentalFlow2Step } from './RentalFlow2Step';
import type { RentalFlow2StepProps } from './RentalFlow2Step';

export const { init, clean } = createWidget<RentalFlow2StepProps>(RentalFlow2Step);
