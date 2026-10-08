// Widget #99 (TBD) — Rental Flow (2 Step)
import { createWidget } from '@shared/createWidget';
import { RentalFlow2Step } from './RentalFlow2Step';
import type { RentalFlow2StepProps } from './RentalFlow2Step';
import { canRenderLiveIdvHarness, LiveIdvHarness } from './LiveIdvHarness';

function RentalFlowEntry(props: RentalFlow2StepProps) {
  return canRenderLiveIdvHarness(props.liveIdvHarness)
    ? <LiveIdvHarness />
    : <RentalFlow2Step {...props} />;
}

export const { init, clean } = createWidget<RentalFlow2StepProps>(RentalFlowEntry);
