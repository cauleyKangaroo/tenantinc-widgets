// Static screens — DEV HARNESS ONLY, not a Duda widget.
// Deliberately has no widget number: it must never be added to a Duda page.
// See src/static-screens/StaticScreens.tsx and flows/index.ts.
import { createWidget } from '@shared/createWidget';
import { StaticScreens } from './StaticScreens';

export const { init, clean } = createWidget(StaticScreens);
