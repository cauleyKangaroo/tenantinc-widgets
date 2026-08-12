// UI kit styleguide — DEV HARNESS ONLY, not a Duda widget.
// Deliberately has no widget number: it must never be added to a Duda page.
// See src/ui-kit/Showcase.tsx.
import { createWidget } from '@shared/createWidget';
import { Showcase } from './Showcase';

export const { init, clean } = createWidget(Showcase);
