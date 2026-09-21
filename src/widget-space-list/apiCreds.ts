// ===========================================================================
// The Hummingbird endpoint this Space List instance talks to.
//
// WHY THIS EXISTS. `baseUrl`, `appId` and `apiKey` were module-level constants
// read from config.json at IMPORT time:
//
//   const BASE_URL = cfg.baseUrl;   // runs before any prop exists
//
// which froze them into the published bundle. A new site, a new tenant or a
// new API host therefore meant a rebuild — even though the same bundles are
// meant to serve every site spun up from this template. `companyId` already
// escaped that (it comes from a prop or the `Company` collection); these three
// did not.
//
// The Duda JS tab now forwards them from the site's content library:
//
//   api_domain: custom.api_domain,
//   app_id:     custom.app_id,
//   api_key:    custom.api_key,
//
// CONFIG.JSON IS STILL THE FLOOR, per value. The Duda editor and the dev
// harness pass no props at all, and a site that has not filled the library in
// yet passes some of them — so each field falls back on its own rather than
// all-or-nothing. A half-configured site keeps working instead of rendering
// against an undefined host.
// ===========================================================================

import cfg from './config.json';

export interface ApiCreds {
  baseUrl: string;
  appId: string;
  apiKey: string;
}

/**
 * The props the Duda JS tab forwards. Snake_case because that is what the
 * content library calls them — renaming here would mean the JS tab and this
 * file disagree, which is the kind of mismatch that fails silently.
 */
export interface ApiCredProps {
  api_domain?: string;
  app_id?: string;
  api_key?: string;
}

/**
 * Trim, and treat an unsubstituted `{{token}}` or a literal "undefined"/"null"
 * as NOT SET.
 *
 * Duda hands back the raw token when a content-library field is missing, and
 * `String(undefined)` when the JS tab references something absent. Either would
 * otherwise be used as a hostname or a key — producing a request to
 * `https://{{api_domain}}/…` and a failure nobody can read. Same rule
 * @shared/propertyBinding's boundText applies to bound fields.
 */
function usable(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return '';
  if (s.startsWith('{{') && s.endsWith('}}')) return '';
  if (s === 'undefined' || s === 'null') return '';
  return s;
}

/**
 * The endpoint for this instance: each prop where the site supplied one, the
 * build-time default where it did not.
 *
 * `baseUrl` loses any trailing slash — every caller appends `/applications/…`,
 * and a site that pastes the host with one would otherwise produce `//`.
 */
export function resolveApiCreds(props: ApiCredProps = {}): ApiCreds {
  return {
    baseUrl: (usable(props.api_domain) || cfg.baseUrl).replace(/\/+$/, ''),
    appId: usable(props.app_id) || cfg.appId,
    apiKey: usable(props.api_key) || cfg.apiKey,
  };
}

/** The build-time credentials, for callers with no props to offer. */
export const FALLBACK_CREDS: ApiCreds = resolveApiCreds();
