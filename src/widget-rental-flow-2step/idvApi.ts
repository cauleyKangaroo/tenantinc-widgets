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
  requestTimeoutMs?: number;
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

/** An explicit API rejection is retryable; missing/unusable responses are not. */
export class IdvRequestError extends Error {
  constructor(message: string, public readonly outcomeUnknown: boolean) {
    super(message);
    this.name = 'IdvRequestError';
  }
}

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
function operation(raw: unknown, allowList = false): { status: number; data: JsonRecord; msg?: string } {
  if (allowList && Array.isArray(raw)) return { status: 200, data: raw as unknown as JsonRecord };
  const outer = record(raw, 'response');
  const apps = outer.applicationData;
  if (!apps || typeof apps !== 'object' || Array.isArray(apps)) {
    // Not in the gateway envelope (e.g. a gateway-level error): read it as the
    // bare payload so its status and message still surface.
    const status = typeof outer.status === 'number' ? outer.status : 200;
    const data = outer.data && typeof outer.data === 'object' && (allowList || !Array.isArray(outer.data))
      ? outer.data as JsonRecord
      : outer;
    return { status, data, msg: optionalText(outer.msg) };
  }
  const first = Object.values(apps as Record<string, unknown>)[0];
  if (!Array.isArray(first) || !first[0]) throw new Error('Invalid ID verification gateway envelope.');
  const entry = record(first[0], 'gateway entry');
  return {
    status: typeof entry.status === 'number' ? entry.status : 502,
    data: allowList && Array.isArray(entry.data) ? entry.data as unknown as JsonRecord : record(entry.data ?? {}, 'response data'),
    msg: optionalText(entry.msg) ?? optionalText(entry.message),
  };
}

function comparableName(value: unknown): string {
  // Keep every script's letters and digits; drop accents, case, spaces and punctuation.
  return typeof value === 'string'
    ? value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
    : '';
}

function sameName(recorded: unknown, typed: string): boolean {
  const a = comparableName(recorded);
  return Boolean(a) && a === comparableName(typed);
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
    allowList = false,
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

    const controller = new AbortController();
    let rejectAbort: (reason: Error) => void = () => {};
    const cancelled = new Promise<never>((_, reject) => { rejectAbort = reject; });
    const abort = () => {
      controller.abort();
      rejectAbort(new IdvRequestError('ID verification request interrupted; its outcome may be unknown.', true));
    };
    const timer = setTimeout(abort, config.requestTimeoutMs ?? 20_000);
    init.signal?.addEventListener('abort', abort, { once: true });
    try {
      if (init.signal?.aborted) abort();
      return await Promise.race([
        cancelled,
        (async () => {
          const response = await fetcher(url, { ...init, signal: controller.signal, headers: { ...headers, ...init.headers } });
          const raw = await response.json() as unknown;
          const parsed = operation(raw, allowList);
          if (!response.ok || parsed.status >= 400) {
            const status = response.ok ? parsed.status : response.status ?? parsed.status;
            // A gateway or upstream 5xx can occur after capture/SMS succeeds.
            // Only a 4xx rejection, with no conflicting upstream 5xx, is definite.
            const outcomeUnknown = status < 400 || status >= 500 || parsed.status >= 500;
            throw new IdvRequestError(parsed.msg || `ID verification request failed (${status}).`, outcomeUnknown);
          }
          return parsed.data;
        })(),
      ]);
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener('abort', abort);
    }
  }

  return {
    async lookup(scope: IdvScope, contactId: string, signal?: AbortSignal): Promise<SafeIdvResult | undefined> {
      const data = await call(
        scope,
        `identity-verifications?contact_id=${safeId(contactId)}`,
        { signal },
        true,
      );
      if (data.status === 'pending') throw new Error('Verification is still pending. Check again before starting another session.');
      if (data.status === undefined || data.status === null || data.status === '') {
        // No status on the record: nothing there, or a verified one; anything else is unresolved.
        if (!data.idv_id) return undefined;
        if (data.authenticated !== true && data.verified !== true) throw new Error('Verification status could not be confirmed.');
      } else if (data.status !== 'complete') return undefined;
      if (!data.idv_id || (data.authenticated !== true && data.verified !== true)) throw new Error('Completed verification could not be confirmed.');
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

    async lookupByEmail(scope: IdvScope, email: string, signal?: AbortSignal, name?: { first: string; last: string }): Promise<SafeIdvResult | undefined> {
      const data = await call(scope, `identity-verifications?email=${encodeURIComponent(email.trim())}`, { signal }, true, true);
      if (!Array.isArray(data)) throw new Error('Invalid email verification lookup response.');
      // The lookup is company-wide by email, so a shared address must not lend
      // one person's verification to another: only records whose name (as read
      // off the ID) matches the renter count.
      const all = data.map(row => record(row, 'lookup record'));
      const rows = all.filter(row => !name || (sameName(row.first_name, name.first) && sameName(row.last_name, name.last)));
      // A pending session whose name is not on the record could be this renter's.
      const unnamedPending = Boolean(name) && all.some(row => row.status === 'pending'
        && (!comparableName(row.first_name) || !comparableName(row.last_name)));
      const completed = rows.filter(row => row.status === 'complete');
      if (!completed.length) {
        if (unnamedPending || rows.some(row => row.status === 'pending')) throw new Error('Verification is still pending. Check again before starting another session.');
        return undefined;
      }
      const timestamp = (row: JsonRecord): number => {
        const value = row.verified_at ?? row.created_at ?? row.createdAt ?? row.created ?? row.updated_at ?? row.updatedAt;
        if (typeof value === 'number' && Number.isFinite(value)) return value < 1e12 ? value * 1000 : value;
        // Staging returns "2026-10-14 17:23:51"; Safari only parses the ISO "T" form.
        return typeof value === 'string' ? Date.parse(value.trim().replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T')) : NaN;
      };
      if (completed.length > 1 && completed.some(row => !Number.isFinite(timestamp(row)))) throw new Error('The newest completed verification could not be identified.');
      completed.sort((a, b) => timestamp(b) - timestamp(a));
      const latest = completed[0];
      if (!latest.idv_id || (latest.authenticated !== true && latest.verified !== true)) throw new Error('Completed verification could not be confirmed.');
      return {
        idvId: text(latest.idv_id, 'lookup id'),
        authenticated: true,
        driversLicense: latest.dl_number || latest.dl_state || latest.dl_expiration ? {
          number: optionalText(latest.dl_number),
          state: optionalText(latest.dl_state),
          expiration: optionalText(latest.dl_expiration),
        } : undefined,
      };
    },

    async start(
      scope: IdvScope,
      identity: IdvIdentity,
      device: 'mobile' | 'desktop' = captureDevice(),
      signal?: AbortSignal,
    ): Promise<IdvStartResult> {
      const data = await call(scope, 'identity-verification', {
        method: 'POST',
        signal,
        body: JSON.stringify({
          first: identity.first,
          last: identity.last,
          email: identity.email,
          phone: identity.phone,
          device,
          // Links the verification to an existing lease (rent first, then
          // verify). The email must be the lease's primary tenant email.
          ...(identity.leaseId ? { lease_id: identity.leaseId } : {}),
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
      const address = data.address && typeof data.address === 'object'
        ? data.address as JsonRecord
        : undefined;
      const scanned = address ? {
        street: optionalText(address.address1) ?? optionalText(address.address),
        city: optionalText(address.city),
        state: optionalText(address.stateCode) ?? optionalText(address.state),
        zip: optionalText(address.postalCode) ?? optionalText(address.zip),
      } : undefined;
      return {
        status,
        idvId: returnedId,
        authenticated: data.authenticated === true,
        address: scanned?.street ? scanned : undefined,
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
