// Widget #18 — Space List Heading
import { createWidget } from '@shared/createWidget';
import { SpaceListHeading } from './SpaceListHeading';
import type { SpaceListHeadingProps } from './SpaceListHeading';

export const { init, clean } = createWidget<SpaceListHeadingProps>(SpaceListHeading);
