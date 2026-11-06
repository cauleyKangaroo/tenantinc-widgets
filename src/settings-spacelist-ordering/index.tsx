import { createWidget } from '@shared/createWidget';
import { SpacelistSettings, type SpacelistSettingsProps } from './SpacelistSettings';

// Same { init, clean } contract as every widget — but the caller is the hosted
// shell page (spacelist-ordering-settings.html), not Duda's renderExternalApp:
// this app runs inside the Widget Builder's settings iframe, so the shell reads
// Duda's query params and passes them as props. See SpacelistSettings.tsx.
export const { init, clean } = createWidget<SpacelistSettingsProps>(SpacelistSettings);
