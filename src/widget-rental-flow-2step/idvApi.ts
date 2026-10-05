import type { SafeIdvResult } from './idvState';

/**
 * Direct to the Tenant API with the site's credentials — the only transport.
 * There is no proxy: the start call's abuse protection (binding a start to a
 * real rental, rate limits) has to live in the backend.
 */
export interface IdvCredentials {
  baseUrl: string;
  appId: string;
  apiKey: string;
}

export interface IdvScope {
  companyId: string;
  propertyId: string;
}

export interface IdvIdentity {
  first: string;
  last: string;
  email: string;
  phone: string;
  contactId?: string;
  leaseId?: string;
}

export interface IdvStartResult {
  idvId: string;
  verificationUrl: string;
  notificationStatus?: 'sent' | 'failed' | 'skipped';
  expiresAt: number;
}

export type IdvPollResult =
  | { status: 'pending'; idvId: string }
  | { status: 'failed'; idvId: string; reason?: string }
  | ({ status: 'complete' } & SafeIdvResult);

type JsonRecord = Record<string, unknown>;
type FetchLike = typeof fetch;

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid ID verification ${label}.`);
  }
  return value as JsonRecord;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`Invalid ID verification ${label}.`);
  return value;
}

function numeric(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid ID verification ${label}.`);
  return value;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

/** Confirmed gateway shape: applicationData.<appId>[0].{status,data,msg}. */
function operation(raw: unknown): { status: number; data: JsonRecord; msg?: string } {
  const outer = record(raw, 'response');
  const apps = outer.applicationData;
  if (!apps || typeof apps !== 'object' || Array.isArray(apps)) {
    // Not in the gateway envelope (e.g. a gateway-level error): read it as the
    // bare payload so its status and message still surface.
    const status = typeof outer.status === 'number' ? outer.status : 200;
    const data = outer.data && typeof outer.data === 'object' && !Array.isArray(outer.data)
      ? outer.data as JsonRecord
      : outer;
    return { status, data, msg: optionalText(outer.msg) };
  }
  const first = Object.values(apps as Record<string, unknown>)[0];
  if (!Array.isArray(first) || !first[0]) throw new Error('Invalid ID verification gateway envelope.');
  const entry = record(first[0], 'gateway entry');
  return {
    status: typeof entry.status === 'number' ? entry.status : 502,
    data: record(entry.data ?? {}, 'response data'),
    msg: optionalText(entry.msg) ?? optionalText(entry.message),
  };
}

function safeId(value: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error('Invalid ID verification identifier.');
  return encodeURIComponent(value);
}

/**
 * Which capture experience Incode should serve.
 *
 * Hardcoding 'desktop' showed a hand-off QR code to a renter already holding the
 * phone that would have to scan it. Incode needs a camera, so desktop gets the
 * QR and the SMS; a narrow viewport goes straight to capture on the device in
 * hand. Coarse pointer as well as width: a touch device in landscape is still a
 * phone. Defaults to 'desktop' with no matchMedia — the QR and the SMS both
 * still reach a phone, whereas a wrongly-chosen 'mobile' leaves a desktop user
 * with a camera prompt they cannot satisfy.
 */
export function captureDevice(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'desktop';
  const narrow = window.matchMedia('(max-width: 768px)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return narrow && coarse ? 'mobile' : 'desktop';
}

export function createIdvApi(config: IdvCredentials, fetcher: FetchLike = fetch) {
  const base = config.baseUrl.replace(/\/$/, '');

  async function call(
    scope: IdvScope,
    suffix: string,
    init: RequestInit = {},
    companyOnly = false,
  ): Promise<JsonRecord> {
    const path = companyOnly
      ? `/companies/${safeId(scope.companyId)}/${suffix}`
      : `/companies/${safeId(scope.companyId)}/properties/${safeId(scope.propertyId)}/${suffix}`;
    const url = `${base}/applications/${safeId(config.appId)}/v2${path}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'x-storageapi-key': config.apiKey,
      'x-storageapi-date': String(Math.floor(Date.now() / 1000)),
    };
    if (init.body) headers['Content-Type'] = 'application/json';

    const response = await fetcher(url, { ...init, headers: { ...headers, ...init.headers } });
    const raw = await response.json() as unknown;
    const parsed = operation(raw);
    if (!response.ok || parsed.status >= 400) {
      throw new Error(parsed.msg || `ID verification request failed (${parsed.status}).`);
    }
    return parsed.data;
  }

  return {
    async lookup(scope: IdvScope, contactId: string): Promise<SafeIdvResult | undefined> {
      const data = await call(
        scope,
        `identity-verifications?contact_id=${safeId(contactId)}`,
        {},
        true,
      );
      if (!data.idv_id) return undefined;
      return {
        idvId: text(data.idv_id, 'lookup id'),
        authenticated: data.authenticated === true || data.verified === true,
        driversLicense: data.dl_number || data.dl_state || data.dl_expiration ? {
          number: optionalText(data.dl_number),
          state: optionalText(data.dl_state),
          expiration: optionalText(data.dl_expiration),
        } : undefined,
      };
    },

    async start(
      scope: IdvScope,
      identity: IdvIdentity,
      device: 'mobile' | 'desktop' = captureDevice(),
    ): Promise<IdvStartResult> {
      const data = await call(scope, 'identity-verification', {
        method: 'POST',
        body: JSON.stringify({
          first: identity.first,
          last: identity.last,
          email: identity.email,
          phone: identity.phone,
          device,
          // The guide warns lease_id rejects when email ownership differs. It
          // remains omitted until the backend confirms the relationship rule.
        }),
      });
      const notificationStatus = optionalText(data.notificationStatus);
      if (notificationStatus && !['sent', 'failed', 'skipped'].includes(notificationStatus)) {
        throw new Error('Invalid ID verification notification status.');
      }
      return {
        idvId: text(data.idvId, 'id'),
        verificationUrl: text(data.verificationUrl, 'URL'),
        notificationStatus: notificationStatus as IdvStartResult['notificationStatus'],
        expiresAt: numeric(data.expiresAt, 'expiry'),
      };
    },

    async poll(scope: IdvScope, idvId: string, signal?: AbortSignal): Promise<IdvPollResult> {
      const data = await call(scope, `identity-verification/${safeId(idvId)}`, { signal });
      const status = text(data.status, 'status');
      const returnedId = optionalText(data.idvId) ?? idvId;
      if (status === 'pending') return { status, idvId: returnedId };
      if (status === 'failed') return { status, idvId: returnedId, reason: optionalText(data.reason) };
      if (status !== 'complete') throw new Error('Invalid ID verification status.');
      const license = data.driversLicense && typeof data.driversLicense === 'object'
        ? data.driversLicense as JsonRecord
        : undefined;
      return {
        status,
        idvId: returnedId,
        authenticated: data.authenticated === true,
        driversLicense: license ? {
          number: optionalText(license.number),
          state: optionalText(license.state),
          expiration: optionalText(license.expiration),
        } : undefined,
      };
    },

    async emit(scope: IdvScope, idvId: string, type: string): Promise<void> {
      await call(scope, 'identity-verification/emit', {
        method: 'PUT',
        body: JSON.stringify({ idvId, type }),
      });
    },
  };
}

export type IdvApi = ReturnType<typeof createIdvApi>;
