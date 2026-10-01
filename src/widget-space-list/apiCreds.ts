// ===========================================================================
// #05's REST credentials — ONE store, shared by every module in this widget.
//
// Unlike #03, which makes all its calls from a single api.ts, #05 reaches the
// API from four places: api.ts (space-groups), propertyApi.ts (properties +
// leads) and the two sidebar sections that count/list nearby properties. They
// must all see the SAME credentials, so the store lives here and they import
// it, rather than each holding its own.
//
// `SpaceList` calls `configureApi` during render, before any of those modules
// can fetch. Unset props leave the build-time config.json values in place, so
// the Duda editor and the dev harness behave exactly as they always have.
//
// See @shared/apiConfig for the resolution rules (including why `api_domain`
// may be written with or without the trailing `/applications`).
// ===========================================================================

import cfg from './config.json';
import { createApiCredsStore, type ApiCredProps } from '@shared/apiConfig';

export type { ApiCredProps };

const store = createApiCredsStore('#05 space-list', {
  baseUrl: cfg.baseUrl,
  appId: cfg.appId,
  apiKey: cfg.apiKey,
});

/** The credentials to use right now. Never null — config.json until configured. */
export const creds = store.creds;

/** Apply the site's props. Safe to call on every render; ignores an empty set. */
export const configureApi = store.configure;

/**
 * The creds plus a company id, in the shape the shared API modules take
 * (`@shared/leadsApi`, `@shared/nearbyProperties`, `@shared/spaceGroups`).
 *
 * This replaces the old `{ ...cfg, companyId }` spread. That spread looked
 * harmless but pinned baseUrl/appId/apiKey to the build-time file, so a section
 * using it would have kept calling the old host with the old key while the rest
 * of the widget had moved to the site's own.
 */
export function credsWithCompany(companyId: string) {
  return { ...creds(), companyId };
}
