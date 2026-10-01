// ===========================================================================
// Hummingbird REST credentials — supplied by the SITE, not baked per widget.
//
// WHY THIS EXISTS. `baseUrl`, `appId` and `apiKey` were duplicated, byte for
// byte, across nine widget `config.json` files. They are the same three values
// on every widget of a given site and they change per CUSTOMER, so holding them
// at build time meant a new customer needed a new build of the bundles — the
// same problem `companyId` already solved by moving to the `Company` collection
// (see @shared/companySource).
//
// WHERE THEY COME FROM NOW. Duda's Content Library "custom" site texts, read in
// the page's JS tab from `window.siteObject` and forwarded as props:
//
//   api.scripts.renderExternalApp(url, element, {
//     companyId:  custom.CompanyId,
//     api_domain: custom.api_domain,
//     app_id:     custom.app_id,
//     api_key:    custom.api_key,
//     ...
//   });
//
// The prop names are snake_case because that is what the site texts are called
// and what the JS tab already passes. They are deliberately NOT renamed to
// camelCase here: the Duda side is the published contract and a mismatch would
// fail silently (an unset prop simply falls back to the build-time default).
//
// FAILS SOFT, ALWAYS. Any prop that is missing, empty, an unsubstituted
// `{{handlebars}}` token, or Duda's `"[object Object]"` flattening falls back to
// the value the widget was built with. A site that has not had its custom texts
// filled in yet behaves exactly as it did before.
//
// NOT A SECRET. The bundle is public on GitHub Pages, so the key is readable in
// devtools either way. Moving it here makes it site DATA and rotatable in one
// place; it does not make it private. Only a server-side proxy would.
// ===========================================================================

import { boundText } from './propertyBinding';

/** The three values every keyed Hummingbird request needs. */
export interface ApiCreds {
  /** Full REST base, including the version path — e.g. `https://edge.tenant.dev/api/v3`. */
  baseUrl: string;
  appId: string;
  apiKey: string;
}

/**
 * The props the Duda JS tab passes, named exactly as the site texts are.
 * All `unknown`: what Duda hands over for a content value is not guaranteed, so
 * these go through `boundText` rather than being trusted.
 */
export interface ApiCredProps {
  api_domain?: unknown;
  app_id?: unknown;
  api_key?: unknown;
}

/** The site-text labels these map to, for docs and the setup runbook. */
export const API_CRED_SITE_TEXTS = ['api_domain', 'app_id', 'api_key'] as const;

/**
 * `api_domain` → a usable REST base.
 *
 * The site text can reasonably be written either way, and both have to work:
 *
 *   "https://edge.tenant.dev/api/v3"  → used as-is
 *   "edge.tenant.dev"                 → https:// added, and the version path
 *                                       borrowed from the build-time default
 *
 * That second case is the whole reason this is not a bare string assignment: a
 * bare host would produce `https://edge.tenant.dev/applications/…` and 404 every
 * request. Borrowing the path from the fallback keeps a half-filled site text
 * working instead of breaking every widget on the page.
 *
 * Anything unparseable returns the fallback rather than throwing — a typo in a
 * content field must not take the site down.
 */
export function normalizeApiBase(raw: unknown, fallback: string): string {
  const text = boundText(raw);
  if (!text) return fallback;

  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return fallback;
  }

  const path = url.pathname.replace(/\/+$/, '');
  if (path) return `${url.origin}${path}`;

  // Bare host — take the version path off the default so the shape still matches.
  let fallbackPath = '';
  try {
    fallbackPath = new URL(fallback).pathname.replace(/\/+$/, '');
  } catch {
    /* Default is malformed too; an origin-only base is still better than nothing. */
  }
  return `${url.origin}${fallbackPath}`;
}

/** Props layered over the build-time defaults, field by field. */
export function mergeApiCreds(props: ApiCredProps, defaults: ApiCreds): ApiCreds {
  return {
    baseUrl: normalizeApiBase(props.api_domain, defaults.baseUrl),
    appId: boundText(props.app_id) || defaults.appId,
    apiKey: boundText(props.api_key) || defaults.apiKey,
  };
}

/** True when the JS tab actually supplied at least one of the three. */
export function hasApiCredProps(props: ApiCredProps): boolean {
  return !!(boundText(props.api_domain) || boundText(props.app_id) || boundText(props.api_key));
}

export interface ApiCredsStore {
  /** The creds to use right now. Never null — defaults until configured. */
  creds(): ApiCreds;
  /** Apply the props from one widget instance. Safe to call on every render. */
  configure(props: ApiCredProps): void;
}

/**
 * One creds holder per widget module.
 *
 * MODULE STATE, DELIBERATELY. `appId` is read inside synchronous response
 * parsing (`findProperty` reads `applicationData[appId]`) as well as inside the
 * fetches, so threading it through every signature would touch far more code
 * than it would protect. The values are site-level — every instance of a widget
 * on a page is handed the same three site texts — so a single holder is the
 * honest model.
 *
 * It is per MODULE, so two different widgets never share one. Within a widget,
 * an instance that was given no creds at all is a NO-OP rather than a reset:
 * otherwise a second, unconfigured instance would quietly clobber the first
 * one's values back to the build-time defaults.
 *
 * A genuine disagreement between two configured instances is logged rather than
 * silently resolved — it means the page is passing two different sets, which is
 * a setup error no widget can fix on its own.
 */
export function createApiCredsStore(tag: string, defaults: ApiCreds): ApiCredsStore {
  let current = defaults;
  let configured = false;

  return {
    creds: () => current,
    configure(props: ApiCredProps) {
      if (!hasApiCredProps(props)) return;

      const next = mergeApiCreds(props, defaults);
      if (
        configured
        && (next.baseUrl !== current.baseUrl
          || next.appId !== current.appId
          || next.apiKey !== current.apiKey)
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          `[${tag}] two widget instances were given different API credentials; ` +
          'using the most recent. Check the page\'s JS tab — every instance should ' +
          'receive the same site texts.',
        );
      }

      current = next;
      configured = true;
    },
  };
}
