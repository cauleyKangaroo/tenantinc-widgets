// Widget #04 — Homepage Search
// A hero search bar dropped over the homepage image: a City/ZIP/Address input, an
// optional Storage Type dropdown, a Find button, and a "See our N Locations" link.
// Searching navigates to the configured results/city page (real anchors, so Duda
// routes them). Purely presentational — no API/config.json.
import { createWidget } from '@shared/createWidget';
import { HomepageSearch } from './HomepageSearch';
import type { HomepageSearchProps } from './HomepageSearch';

export const { init, clean } = createWidget<HomepageSearchProps>(HomepageSearch);
