// ===========================================================================
// Card tokenization — Global Payments / Heartland, from the browser.
//
// The card is typed into OUR fields, then tokenized here so the payload can
// carry a `token` alongside the number. Today Hummingbird's lease call needs
// the real number and ignores the token (verified: a masked number returns
// 500 "Card Number is invalid."), but the token field is documented and
// accepted, so sending it now means the swap is theirs to make and not ours.
//
// This is NOT hosted fields. Hosted fields would keep the number out of our
// JavaScript entirely, but the iframe assets for a pkapi_ key are gone —
// hps.github.io/token/gp-<version>/ 404s for every version — and the lease
// call could not use the result anyway. See server/RENTAL_FLOW_API.md.
//
// The key here is the PUBLIC (publishable) one. It can only create tokens; it
// cannot charge, refund or read anything, which is why it is safe in a bundle.
// ===========================================================================

/** The certification key is a sandbox key, and it has its own host. */
const CERT_HOST = 'https://cert.api2.heartlandportico.com';
const PROD_HOST = 'https://api2.heartlandportico.com';
const PATH = '/Hps.Exchange.PosGateway.Hpf.v1/api/token';

export interface CardToken {
  /** Single-use "supt_…" token. Expires in ~30 minutes. */
  token: string;
  /** "************1111" — the gateway's own mask, not one we compose. */
  masked: string;
}

/**
 * Card brand from the number, for `payment_method.card_type`.
 *
 * Derived locally because the tokenizer does not return it — its response is
 * only the token and the mask. The names are the ones the rental API
 * documents; anything unrecognised is "Unknown" rather than a guess, since a
 * wrong brand on a payment record is worse than an honest blank.
 */
export function cardBrand(number: string): string {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'MasterCard';
  if (/^3[47]/.test(n)) return 'AMEX';
  if (/^(6011|65|64[4-9])/.test(n)) return 'Discover';
  if (/^35/.test(n)) return 'JCB';
  if (/^(30[0-5]|36|38)/.test(n)) return 'Diners';
  if (/^62/.test(n)) return 'China UnionPay';
  return 'Unknown';
}

/**
 * Exchange a card for a single-use token.
 *
 * Returns null on ANY failure and never throws. Tokenization is additive here:
 * the lease succeeds on the card number alone, so a gateway outage must not
 * stop someone renting a garage. The caller sends what it has.
 */
export async function tokenizeCard(
  publicKey: string,
  card: { number: string; cvv: string; expMonth: string; expYear: string },
): Promise<CardToken | null> {
  const key = publicKey.trim();
  if (!key) return null;
  // The key names its own environment: pkapi_cert_… is sandbox, pkapi_prod_…
  // is live. Deriving it here means one config value, and no way for a prod
  // key to be pointed at cert by a stale environment setting.
  const host = /^pkapi_cert_/.test(key) ? CERT_HOST : PROD_HOST;
  try {
    const res = await fetch(`${host}${PATH}?api_key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'token',
        token_type: 'supt',
        _method: 'post',
        card: {
          number: card.number.replace(/\D/g, ''),
          cvc: card.cvv,
          exp_month: card.expMonth,
          exp_year: card.expYear,
        },
      }),
    });
    if (!res.ok) {
      console.warn(`[gpTokenize] tokenization failed: ${res.status} ${res.statusText}`);
      return null;
    }
    const json = await res.json() as { token_value?: string; card?: { number?: string } };
    if (typeof json?.token_value !== 'string' || !json.token_value) return null;
    return { token: json.token_value, masked: json.card?.number ?? '' };
  } catch (err) {
    console.warn('[gpTokenize] tokenization threw:', err);
    return null;
  }
}
