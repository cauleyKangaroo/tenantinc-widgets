// ===========================================================================
// Which card gateway a property uses, and its Global Payments PUBLIC key —
// the same lookup the rental flow makes before it mounts hosted fields, so
// #19 My Account can take a card the same way.
//
//   GET {api}/applications/{app}/v2/companies/{co}/properties/{p}/gateway
//     → { gateway: ["tenant_payments"], hosted_card: true,
//         gateway_config: null, public_api_key: "pkapi_…" | null }
//
// Verified live 2026-10-12: COFFEE and Bellflower answer with the cert key;
// Bakersfield1 answers `public_api_key: null` — a property with no key cannot
// take a hosted card, and the caller has to say so rather than fall back to
// plain inputs (the account payments API accepts a token, never a PAN).
//
// Credentials are the site texts (api_domain / app_id / api_key) handed in as
// props, exactly as every other widget takes them — nothing here is secret
// beyond what the page already carries.
// ===========================================================================
import type { ApiCreds } from './apiConfig';

export interface GatewayInfo {
  /** e.g. "tenant_payments". Empty when the property names none. */
  gateway: string;
  hostedCard: boolean;
  /** The GP public key, or '' — no hosted fields without one. */
  publicKey: string;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Resolves to null when the lookup cannot be made or is refused; the caller
 * decides what "no gateway" means on screen.
 */
export async function fetchGatewayInfo(
  creds: ApiCreds,
  companyId: string,
  propertyId: string,
  tag = '[paymentGateway]',
): Promise<GatewayInfo | null> {
  const { baseUrl, appId, apiKey } = creds;
  if (!baseUrl || !appId || !apiKey || !companyId || !propertyId) return null;
  try {
    const res = await fetch(
      `${baseUrl}/applications/${encodeURIComponent(appId)}/v2/companies/${encodeURIComponent(companyId)}`
      + `/properties/${encodeURIComponent(propertyId)}/gateway`,
      { headers: { 'x-storageapi-key': apiKey, 'x-storageapi-date': String(Math.floor(Date.now() / 1000)) } },
    );
    if (!res.ok) { console.warn(`${tag} gateway lookup failed: ${res.status}`); return null; }
    const json = await res.json().catch(() => undefined) as
      { applicationData?: Record<string, Array<{ status?: number; data?: Record<string, unknown>; msg?: string }>> } | undefined;
    const inner = json?.applicationData?.[appId]?.[0];
    if (!inner || inner.status !== 200 || !inner.data) { console.warn(`${tag} gateway lookup rejected:`, inner?.status, inner?.msg); return null; }
    const d = inner.data;
    const list = Array.isArray(d.gateway) ? d.gateway.map(str).filter(Boolean) : [str(d.gateway)].filter(Boolean);
    return { gateway: list[0] ?? '', hostedCard: d.hosted_card === true, publicKey: str(d.public_api_key) };
  } catch (err) {
    console.warn(`${tag} gateway lookup threw:`, err);
    return null;
  }
}
