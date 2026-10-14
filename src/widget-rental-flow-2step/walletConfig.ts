// ===========================================================================
// Apple Pay / Google Pay — configuration.
//
// The Nuxt website reads these from `$env.SDK_*` (HBPaymentSectionRadio
// created()). Here they come from two places, each with the value in
// WALLET_DEFAULTS as its default:
//
//   - CONTENT-PANEL fields, forwarded by the JS tab as `data.config.<name>`
//     like every other prop: the enable toggles, the Google environment and
//     merchant/gateway ids, and Apple's merchant identifier.
//   - SITE TEXTS, for currency and country ONLY: `currency_code` and
//     `country_code` in the Content Library's custom texts, forwarded by the
//     JS tab from `window.siteObject` exactly as `api_domain` is (see
//     @shared/apiConfig). They describe the SITE, not one widget, so there is
//     deliberately no panel field for them. Not set → USD / US.
//
// A value left blank, unsubstituted ({{…}}) or unrecognisable falls back to
// its default, so a site that has not set something behaves exactly as it did.
// None of them is a secret — every value ends up in the page anyway.
//
// Deliberately NOT configurable: the SDK URLs and Apple's API version. They
// describe the code that consumes them, not the merchant, and changing one
// without changing the code would break the button.
// ===========================================================================

import { boundText } from '@shared/propertyBinding';

export type GooglePayEnvironment = 'TEST' | 'PRODUCTION';

export interface WalletConfig {
  /** Offer Google Pay at all. Nuxt reads googlePayments.available per facility. */
  googlePayEnabled: boolean;
  /**
   * ONE value for both the button and loadPaymentData — Nuxt built its button
   * with 'PRODUCTION' and then paid with the env value. A TEST client returns
   * dummy tokens a real gateway cannot charge.
   *
   * The content-panel dropdown — Test or Production, nothing else, so on an
   * instance that has the field it always decides. Only where the field is
   * MISSING (an instance saved before it existed, or a JS tab not forwarding
   * it) does this FOLLOW THE SITE — the `environment` site text: production →
   * PRODUCTION, anything else → TEST — so such a live site does not get a
   * Google Pay button whose TEST tokens fail at the lease charge.
   */
  googlePayEnvironment: GooglePayEnvironment;
  googlePayMerchantId: string;
  googlePayGateway: string;
  googlePayGatewayMerchantId: string;
  /** Merchant name on the Google Pay sheet. Tenant Inc unless the content
   *  panel names another — never the property's name: the merchant of record
   *  is Tenant Inc, whichever facility the space belongs to. */
  googlePayMerchantName: string;
  /** Offer Apple Pay at all. Nuxt reads applePayments.available per facility. */
  applePayEnabled: boolean;
  /** Apple ignores this on JS sessions (the merchant session carries the real
   *  one); Nuxt sends it, so it is kept. */
  applePayMerchantIdentifier: string;
  /** ISO 4217, e.g. USD. Both wallets. From the `currency_code` site text. */
  currencyCode: string;
  /** ISO 3166-1 alpha-2, e.g. US. Both wallets. From the `country_code` site text. */
  countryCode: string;
}

/** Every Nuxt .env checked (prod and uat) carries these values.
 *  `googlePayEnvironment` here is the NON-production default only — see the
 *  field's note and environment() for how a production site gets PRODUCTION. */
export const WALLET_DEFAULTS: Readonly<WalletConfig> = {
  googlePayEnabled: true,
  googlePayEnvironment: 'TEST',
  googlePayMerchantId: 'BCR2DN4TZL4LJIY4',
  googlePayGateway: 'globalpayments',
  googlePayGatewayMerchantId: '777703693370',
  googlePayMerchantName: 'Tenant Inc',
  applePayEnabled: true,
  applePayMerchantIdentifier: 'merchant.com.tenantinc.hummingbird',
  currencyCode: 'USD',
  countryCode: 'US',
};

export const GOOGLE_PAY_SDK_URL = 'https://pay.google.com/gp/p/js/pay.js';
export const APPLE_PAY_API_VERSION = 3;
/**
 * Apple's SDK — what makes ApplePaySession exist outside Safari. `1.latest`
 * is what Apple's own engineers name for production (1.2.0 is the beta pin).
 * A site Content-Security-Policy must allow applepay.cdn-apple.com.
 */
export const APPLE_PAY_SDK_URL = 'https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js';

/**
 * The content-panel fields, exactly as the JS tab forwards them. Every one is
 * optional and `unknown`: Duda sends strings for text/dropdown fields and
 * booleans for toggles, and a binding can send anything.
 */
export interface WalletConfigProps {
  googlePayEnabled?: unknown;
  googlePayEnvironment?: unknown;
  googlePayMerchantId?: unknown;
  googlePayGateway?: unknown;
  googlePayGatewayMerchantId?: unknown;
  googlePayMerchantName?: unknown;
  applePayEnabled?: unknown;
  applePayMerchantIdentifier?: unknown;
  /** Site texts (Content Library → custom), snake_case like `api_domain`: the
   *  Duda side is the published contract, so the names are not camelCased.
   *  The ONLY source for currency and country — there is no panel field. */
  currency_code?: unknown;
  country_code?: unknown;
  /** Site text `environment` (e.g. "staging", "production") — the default for
   *  googlePayEnvironment when the panel dropdown is not set. */
  environment?: unknown;
}

/** A toggle: real booleans, or the usual spellings of one. Else the default. */
function toggle(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  switch (boundText(v).trim().toLowerCase()) {
    case 'true': case '1': case 'yes': case 'on': return true;
    case 'false': case '0': case 'no': case 'off': return false;
    default: return fallback;
  }
}

/** Free text, trimmed; blank or unsubstituted → the default. */
function text(v: unknown, fallback: string): string {
  return boundText(v).trim() || fallback;
}

/*
 * REAL ISO membership, not just length. `USS` or `ZZ` are the right shape and
 * still make both wallet sheets refuse to open, so shape alone is not enough.
 * Checked against the browser's own CLDR data — the tables its payment UI is
 * built on — rather than an allowlist of ~250 codes to keep current here:
 *
 *   CURRENCY  Intl.supportedValuesOf('currency') — the codes in CURRENT use.
 *             Not DisplayNames alone: CLDR still names withdrawn codes, and
 *             `USS` (US Dollar Same-day, withdrawn 2014) is exactly that.
 *   COUNTRY   Intl.DisplayNames with `fallback: 'none'`, which answers
 *             undefined for a region it does not know.
 *
 * CLDR also NAMES a few placeholder codes ("Unknown Region", "Unknown
 * Currency", the test currency, the user-assigned ranges), so those are
 * refused explicitly. An older browser steps down — DisplayNames for currency
 * where supportedValuesOf is missing, the shape check where neither exists;
 * neither wallet runs on such a browser anyway.
 */
type CodeKind = 'currency' | 'region';
type DisplayNamesLike = { of(code: string): string | undefined };
type DisplayNamesCtor = new (locales: string[], options: { type: CodeKind; fallback: 'none' }) => DisplayNamesLike;

const NOT_REAL: Record<CodeKind, RegExp> = {
  // XXX "no currency", XTS "testing"; the precious-metal/fund codes are left in.
  currency: /^(XXX|XTS)$/,
  // ZZ "unknown"; AA, QM–QZ, XA–XZ are ISO's user-assigned ranges. XK
  // (Kosovo) is user-assigned too but in real use, so it is allowed.
  region: /^(AA|ZZ|Q[M-Z]|X[A-JL-Z])$/,
};
const SHAPE: Record<CodeKind, RegExp> = { currency: /^[A-Z]{3}$/, region: /^[A-Z]{2}$/ };

/** Active ISO 4217 codes, or null where the browser cannot list them. */
let activeCurrencies: Set<string> | null | undefined;
function currencyList(): Set<string> | null {
  if (activeCurrencies === undefined) {
    const list = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    try {
      activeCurrencies = list ? new Set(list('currency')) : null;
    } catch {
      activeCurrencies = null;
    }
  }
  return activeCurrencies;
}

const displayNames: Partial<Record<CodeKind, DisplayNamesLike | null>> = {};
function namer(kind: CodeKind): DisplayNamesLike | null {
  if (displayNames[kind] === undefined) {
    const Ctor = (Intl as unknown as { DisplayNames?: DisplayNamesCtor }).DisplayNames;
    try {
      displayNames[kind] = Ctor ? new Ctor(['en'], { type: kind, fallback: 'none' }) : null;
    } catch {
      displayNames[kind] = null;
    }
  }
  return displayNames[kind] ?? null;
}

/** An ISO 4217 currency / ISO 3166-1 alpha-2 region that actually exists. */
function isRealCode(kind: CodeKind, c: string): boolean {
  if (!SHAPE[kind].test(c) || NOT_REAL[kind].test(c)) return false;
  if (kind === 'currency') {
    const active = currencyList();
    if (active) return active.has(c);
  }
  const names = namer(kind);
  if (!names) return true; // no CLDR data: shape is all we can check
  try {
    return names.of(c) !== undefined;
  } catch {
    return false;
  }
}

/**
 * A currency or country code, upper-cased. Anything that is not a real ISO
 * code → the default: a bad one makes BOTH wallet sheets refuse to open, so a
 * typo must not reach them.
 */
function code(v: unknown, kind: CodeKind, fallback: string, field: string): string {
  const raw = boundText(v).trim().toUpperCase();
  if (!raw) return fallback;
  if (isRealCode(kind, raw)) return raw;
  console.warn(`[rental] ${field} "${raw}" is not a valid ISO ${kind === 'currency' ? 'currency' : 'country'} code — using ${fallback}.`);
  return fallback;
}

/** The `environment` site text names a production site. */
function siteIsProduction(v: unknown): boolean {
  const s = boundText(v).trim().toLowerCase();
  return s === 'production' || s === 'prod' || s === 'live';
}

/** Panel dropdown when it holds a real choice; else the site's environment. */
function environment(panel: unknown, site: unknown): GooglePayEnvironment {
  const siteDefault: GooglePayEnvironment = siteIsProduction(site) ? 'PRODUCTION' : WALLET_DEFAULTS.googlePayEnvironment;
  const raw = boundText(panel).trim().toUpperCase();
  if (raw === 'PRODUCTION' || raw === 'PROD' || raw === 'LIVE') return 'PRODUCTION';
  if (raw === 'TEST' || raw === 'SANDBOX') return 'TEST';
  if (raw) console.warn(`[rental] content field googlePayEnvironment "${raw}" is not TEST or PRODUCTION — using ${siteDefault} from the site environment.`);
  return siteDefault;
}

/** Content-panel values over the defaults, each one validated on its own. */
export function resolveWalletConfig(p: WalletConfigProps): WalletConfig {
  const d = WALLET_DEFAULTS;
  return {
    googlePayEnabled: toggle(p.googlePayEnabled, d.googlePayEnabled),
    googlePayEnvironment: environment(p.googlePayEnvironment, p.environment),
    googlePayMerchantId: text(p.googlePayMerchantId, d.googlePayMerchantId),
    googlePayGateway: text(p.googlePayGateway, d.googlePayGateway),
    googlePayGatewayMerchantId: text(p.googlePayGatewayMerchantId, d.googlePayGatewayMerchantId),
    googlePayMerchantName: text(p.googlePayMerchantName, d.googlePayMerchantName),
    applePayEnabled: toggle(p.applePayEnabled, d.applePayEnabled),
    applePayMerchantIdentifier: text(p.applePayMerchantIdentifier, d.applePayMerchantIdentifier),
    // Site text, else USD / US. Validated, so a typo falls to the default
    // rather than reaching the wallets.
    currencyCode: code(p.currency_code, 'currency', d.currencyCode, 'site text currency_code'),
    countryCode: code(p.country_code, 'region', d.countryCode, 'site text country_code'),
  };
}
