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

/** Every Nuxt .env checked (prod and uat) carries these values. */
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

/**
 * A code that must match a pattern, upper-cased. Anything else → the default:
 * a malformed currency or country makes BOTH wallet sheets refuse to open, so
 * a typo must not reach them.
 */
function code(v: unknown, pattern: RegExp, fallback: string, field: string): string {
  const raw = boundText(v).trim().toUpperCase();
  if (!raw) return fallback;
  if (pattern.test(raw)) return raw;
  console.warn(`[rental] ${field} "${raw}" is not valid — using ${fallback}.`);
  return fallback;
}

function environment(v: unknown): GooglePayEnvironment {
  const raw = boundText(v).trim().toUpperCase();
  if (raw === 'PRODUCTION' || raw === 'PROD' || raw === 'LIVE') return 'PRODUCTION';
  if (raw === 'TEST' || raw === 'SANDBOX') return 'TEST';
  if (raw) console.warn(`[rental] content field googlePayEnvironment "${raw}" is not TEST or PRODUCTION — using ${WALLET_DEFAULTS.googlePayEnvironment}.`);
  return WALLET_DEFAULTS.googlePayEnvironment;
}

/** ISO 4217 currency, ISO 3166-1 alpha-2 country — upper-cased before testing. */
const CURRENCY = /^[A-Z]{3}$/;
const COUNTRY = /^[A-Z]{2}$/;

/** Content-panel values over the defaults, each one validated on its own. */
export function resolveWalletConfig(p: WalletConfigProps): WalletConfig {
  const d = WALLET_DEFAULTS;
  return {
    googlePayEnabled: toggle(p.googlePayEnabled, d.googlePayEnabled),
    googlePayEnvironment: environment(p.googlePayEnvironment),
    googlePayMerchantId: text(p.googlePayMerchantId, d.googlePayMerchantId),
    googlePayGateway: text(p.googlePayGateway, d.googlePayGateway),
    googlePayGatewayMerchantId: text(p.googlePayGatewayMerchantId, d.googlePayGatewayMerchantId),
    googlePayMerchantName: text(p.googlePayMerchantName, d.googlePayMerchantName),
    applePayEnabled: toggle(p.applePayEnabled, d.applePayEnabled),
    applePayMerchantIdentifier: text(p.applePayMerchantIdentifier, d.applePayMerchantIdentifier),
    // Site text, else USD / US. Validated, so a typo falls to the default
    // rather than reaching the wallets.
    currencyCode: code(p.currency_code, CURRENCY, d.currencyCode, 'site text currency_code'),
    countryCode: code(p.country_code, COUNTRY, d.countryCode, 'site text country_code'),
  };
}
