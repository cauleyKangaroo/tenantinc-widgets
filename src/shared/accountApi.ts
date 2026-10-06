// ===========================================================================
// The My Account API — sign-in (#17) and the account page (#19).
//
// Five calls, in the order a session is built and then used:
//   send     POST /api/account/verification/send   — emails/texts a one-time code
//   verify   POST /api/account/verification/verify — exchanges it for a token
//   select   POST /api/account/contacts/select     — when an address has several
//                                                    contacts, picks one
//   me       GET  /api/account/me                  — cheap token check
//   contact  GET  /api/account/contact             — the full record for a session
//
// NOT the Hummingbird edge API. This is Tenant's own proxy, so it takes neither
// `x-storageapi-key` nor an app id — it identifies the caller by Duda site:
// every request carries `X-Duda-Site-Id`. Nothing secret belongs in this file
// and nothing is sent that is not already public on the page.
//
// The base URL arrives from the Duda JS tab as `login_api_base`, snake_case for
// the same reason the credential props are (see @shared/apiConfig): it is a
// Content Library site text and the Duda side is the published contract.
//
// EVERY function here fails SOFT and returns a tagged result instead of
// throwing. A login card that throws renders a blank box; one that returns
// `{ ok: false }` can say what went wrong.
// ===========================================================================

/** Where the proxy lives, and which site is asking. */
export interface LoginApiConfig {
  baseUrl: string;
  siteId: string;
}

/** Exactly one of these — sending both or neither is a 400. */
export type Identifier = { email: string } | { phone: string };

export interface SendCodeOk {
  ok: true;
  /** Which channel the code actually went to, as the server decided. */
  channel: string;
  /** Seconds the code stays valid. */
  expiresIn: number;
  /** Seconds before a resend is accepted — drives the cooldown. */
  resendAfter: number;
}

export interface ApiFailure {
  ok: false;
  /** Safe to show a reader. */
  message: string;
  /** For the console, not the card. */
  detail?: string;
}

export type SendCodeResult = SendCodeOk | ApiFailure;

export interface AccountContact {
  id: string;
  /** Present on the single-contact (authenticated) shape. */
  name?: string;
  /** Present on the multi-contact (select_contact) shape. */
  first?: string;
  last?: string;
  maskedPhone?: string;
}

export type VerifyResult =
  | { ok: true; status: 'authenticated'; token: string; expiresIn: number; contact: AccountContact }
  | { ok: true; status: 'select_contact'; token: string; expiresIn: number; contacts: AccountContact[] }
  | ApiFailure;

/** True when the widget has been given somewhere to call. */
export function loginApiReady(cfg: LoginApiConfig): boolean {
  return !!(cfg.baseUrl && cfg.siteId);
}

const headers = (cfg: LoginApiConfig) => ({
  'Content-Type': 'application/json',
  'X-Duda-Site-Id': cfg.siteId,
});

const url = (cfg: LoginApiConfig, path: string) =>
  `${cfg.baseUrl.replace(/\/+$/, '')}${path}`;

/*
 * What the proxy says went wrong, for the CONSOLE.
 *
 * Verified against the live service: failures come back as
 *   { ok: false, error: { code, message, details? }, requestId }
 * — nested, not a flat `message`, and `error` is an object rather than a string.
 * The first version of this read `body.message` / `body.error` and would have
 * found neither, silently losing the reason.
 *
 * Deliberately NOT shown to the reader. The real messages are operational
 * ("No Duda site with that id.", "A Duda site id is required: send an
 * X-Duda-Site-Id header…") — accurate, useless to a customer, and they name our
 * plumbing. The card shows our own wording; this goes to the console with the
 * requestId, which is what the proxy's own logs are searchable by.
 */
function failureDetail(body: unknown, res: Response): string {
  const b = body as {
    error?: { code?: unknown; message?: unknown; details?: unknown };
    requestId?: unknown;
  } | null;
  /*
   * `error.details` is the useful half of a validation failure: an array of
   * { path, message } naming the offending FIELD. Without it a 400 reads only
   * as "Request validation failed.", which says nothing at all — the first
   * version of this dropped it and cost a debugging round trip.
   */
  const details = Array.isArray(b?.error?.details)
    ? (b.error.details as Array<{ path?: unknown; message?: unknown }>)
      .map((d) => [d.path, d.message].filter((x) => typeof x === 'string' && x).join(': '))
      .filter(Boolean)
      .join('; ')
    : '';

  return [
    `${res.status} ${res.statusText}`,
    typeof b?.error?.code === 'string' ? b.error.code : '',
    typeof b?.error?.message === 'string' ? b.error.message : '',
    details,
    typeof b?.requestId === 'string' ? `requestId=${b.requestId}` : '',
  ].filter(Boolean).join(' | ');
}

async function postJson(
  cfg: LoginApiConfig,
  path: string,
  body: unknown,
): Promise<{ res: Response; json: unknown } | { failure: ApiFailure }> {
  try {
    const res = await fetch(url(cfg, path), {
      method: 'POST',
      headers: headers(cfg),
      body: JSON.stringify(body),
    });
    // Read the body even on a non-2xx: that is where the reason lives.
    const json = await res.json().catch(() => undefined);
    return { res, json };
  } catch (err) {
    return {
      failure: {
        ok: false,
        message: 'We could not reach the server. Check your connection and try again.',
        detail: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

/**
 * Ask for a one-time code.
 *
 * `identifier` must carry exactly one of email/phone — the caller decides which,
 * because the card knows what the reader typed and the server rejects both.
 */
export async function sendCode(
  cfg: LoginApiConfig,
  identifier: Identifier,
): Promise<SendCodeResult> {
  const out = await postJson(cfg, '/api/account/verification/send', identifier);
  if ('failure' in out) return out.failure;

  const { res, json } = out;
  if (!res.ok) {
    return {
      ok: false,
      message: 'We could not send a code. Check the details and try again.',
      detail: failureDetail(json, res),
    };
  }

  const data = (json as { data?: Record<string, unknown> } | undefined)?.data;
  return {
    ok: true,
    channel: typeof data?.channel === 'string' ? data.channel : '',
    expiresIn: typeof data?.expiresIn === 'number' ? data.expiresIn : 600,
    resendAfter: typeof data?.resendAfter === 'number' ? data.resendAfter : 60,
  };
}

/*
 * The authenticated / select_contact pair, shared by `verifyCode` and
 * `selectContact` — step 1c returns the SAME shape as 1b, so parsing it twice
 * would be two places to get a session token wrong.
 */
function readAuthenticated(json: unknown): VerifyResult {
  const data = (json as { data?: Record<string, unknown> } | undefined)?.data;
  const token = typeof data?.token === 'string' ? data.token : '';
  const expiresIn = typeof data?.expiresIn === 'number' ? data.expiresIn : 3600;

  if (data?.status === 'authenticated' && token) {
    const c = (data.contact ?? {}) as Record<string, unknown>;
    return {
      ok: true,
      status: 'authenticated',
      token,
      expiresIn,
      contact: { id: String(c.id ?? ''), name: typeof c.name === 'string' ? c.name : undefined },
    };
  }

  if (data?.status === 'select_contact' && token) {
    const rows = Array.isArray(data.contacts) ? (data.contacts as Record<string, unknown>[]) : [];
    return {
      ok: true,
      status: 'select_contact',
      token,
      expiresIn,
      contacts: rows.map((c) => ({
        id: String(c.id ?? ''),
        first: typeof c.first === 'string' ? c.first : undefined,
        last: typeof c.last === 'string' ? c.last : undefined,
        maskedPhone: typeof c.maskedPhone === 'string' ? c.maskedPhone : undefined,
      })),
    };
  }

  // A 200 we do not recognise. Treated as a failure rather than a silent pass:
  // letting an unknown shape through would log an unauthenticated reader in.
  return {
    ok: false,
    message: 'We could not complete sign-in. Please try again.',
    detail: `unexpected payload: ${JSON.stringify(data ?? json).slice(0, 200)}`,
  };
}

/**
 * Exchange a code for a session.
 *
 * MUST use the same channel as `sendCode` — the server pairs them, so an email
 * code verified against a phone is not the same request.
 *
 * Two success shapes, and the caller has to handle both: one contact logs
 * straight in, several need a choice first.
 */
export async function verifyCode(
  cfg: LoginApiConfig,
  identifier: Identifier,
  code: string,
): Promise<VerifyResult> {
  const out = await postJson(cfg, '/api/account/verification/verify', { ...identifier, code });
  if ('failure' in out) return out.failure;

  const { res, json } = out;
  if (!res.ok) {
    return {
      ok: false,
      message: 'That code is incorrect. Check it and try again.',
      detail: failureDetail(json, res),
    };
  }

  return readAuthenticated(json);
}

// ---------------------------------------------------------------------------
// Authenticated reads
//
// A session token is 1 HOUR with no refresh, and it is tied to the company that
// issued it — the same X-Duda-Site-Id must be sent or the proxy answers 401
// invalid_token. So `unauthorized` is a routine outcome, not an error: it means
// sign in again, and every caller has to be able to tell it apart from a
// network blip that should just be retried.
// ---------------------------------------------------------------------------

/** A read that needs the session token. */
export type AuthedResult<T> =
  | { ok: true; data: T }
  | { ok: false; unauthorized: true; message: string; detail?: string }
  | { ok: false; unauthorized?: false; message: string; detail?: string };

async function getJson<T>(
  cfg: LoginApiConfig,
  token: string,
  path: string,
  pick: (data: Record<string, unknown>) => T | null,
): Promise<AuthedResult<T>> {
  let res: Response;
  let json: unknown;
  try {
    res = await fetch(url(cfg, path), {
      headers: { 'X-Duda-Site-Id': cfg.siteId, Authorization: `Bearer ${token}` },
    });
    json = await res.json().catch(() => undefined);
  } catch (err) {
    return {
      ok: false,
      message: 'We could not reach the server. Check your connection and try again.',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (res.status === 401) {
    return {
      ok: false,
      unauthorized: true,
      message: 'Your session has expired. Please sign in again.',
      detail: failureDetail(json, res),
    };
  }
  if (!res.ok) {
    return {
      ok: false,
      message: 'We could not load your account. Please try again.',
      detail: failureDetail(json, res),
    };
  }

  const data = (json as { data?: Record<string, unknown> } | undefined)?.data;
  const picked = data ? pick(data) : null;
  if (!picked) {
    return {
      ok: false,
      message: 'We could not load your account. Please try again.',
      detail: `unexpected ${path} payload: ${JSON.stringify(data ?? json).slice(0, 200)}`,
    };
  }
  return { ok: true, data: picked };
}

export interface MeResult {
  contact: AccountContact;
  channel: string;
}

/**
 * Cheap token check — the proxy answers from the token itself, with no call
 * upstream. The account page's gate, so a dead session is caught before any
 * expensive read.
 */
export function fetchMe(cfg: LoginApiConfig, token: string): Promise<AuthedResult<MeResult>> {
  return getJson(cfg, token, '/api/account/me', (d) => {
    const c = d.contact as Record<string, unknown> | undefined;
    if (!c?.id) return null;
    return {
      contact: { id: String(c.id), name: typeof c.name === 'string' ? c.name : undefined },
      channel: typeof d.channel === 'string' ? d.channel : '',
    };
  });
}

/*
 * The full record.
 *
 * TYPED LOOSELY ON PURPOSE. The live response carries a good deal more than the
 * guide's sample — paymentMethods, secondaryContacts, military, dob and several
 * driverLicense* fields are all present and none are documented, while the
 * documented `driverLicense` came back null. Pinning an interface to the sample
 * would silently drop whatever is not in it, so the shape is kept open and each
 * consumer reads the fields it renders. Verified live 2026-10-05.
 */
export interface AccountRecord {
  id: string;
  first?: string;
  last?: string;
  email?: string;
  phones?: Array<Record<string, unknown>>;
  addresses?: Array<Record<string, unknown>>;
  paymentMethods?: Array<Record<string, unknown>>;
  reservations?: Array<Record<string, unknown>>;
  leases?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/** The whole contact record. Calls TenantInc, so it is the expensive one. */
export function fetchContact(
  cfg: LoginApiConfig,
  token: string,
): Promise<AuthedResult<AccountRecord>> {
  return getJson(cfg, token, '/api/account/contact', (d) => (
    d.id ? ({ ...d, id: String(d.id) } as AccountRecord) : null
  ));
}

/**
 * Spend a SELECTION token on one contact, getting a session token back.
 *
 * Only after a `select_contact` verify. The response is the same authenticated
 * shape as verify, so the caller stores it exactly the same way.
 */
export async function selectContact(
  cfg: LoginApiConfig,
  selectionToken: string,
  contactId: string,
): Promise<VerifyResult> {
  let res: Response;
  let json: unknown;
  try {
    res = await fetch(url(cfg, '/api/account/contacts/select'), {
      method: 'POST',
      headers: { ...headers(cfg), Authorization: `Bearer ${selectionToken}` },
      body: JSON.stringify({ contactId }),
    });
    json = await res.json().catch(() => undefined);
  } catch (err) {
    return {
      ok: false,
      message: 'We could not reach the server. Check your connection and try again.',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      // A selection token lasts 10 minutes — by far the likeliest failure.
      message: res.status === 401
        ? 'That took too long. Please start again.'
        : 'We could not open that account. Please try again.',
      detail: failureDetail(json, res),
    };
  }
  return readAuthenticated(json);
}

// ---------------------------------------------------------------------------
// Updating the contact
// ---------------------------------------------------------------------------

/** A phone as the update endpoint wants it. */
export interface ContactPhoneInput {
  number: string;
  type?: string;
  sms?: boolean;
}

/** An address as the update endpoint wants it — note `line1`, not `address`. */
export interface ContactAddressInput {
  /** Present = update THAT address. Absent = add a new one. */
  id?: string;
  type?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  primary?: boolean;
}

export interface SecondaryContactInput {
  id?: string;
  first?: string;
  last?: string;
  email?: string;
  /*
   * A NEW secondary contact must be one or the other. Omitting both is
   * rejected outright:
   *
   *   400 validation_failed
   *   secondaryContacts.0.isAlternate — "a new secondary contact must be an
   *   alternate or an emergency contact"
   *
   * The guide's example shows only `isEmergency: true` and never mentions this
   * one, so sending `isEmergency: false` for an alternate — the obvious
   * reading — fails every time. Verified live 2026-10-06.
   */
  isAlternate?: boolean;
  isEmergency?: boolean;
  leaseId?: string;
  phone?: ContactPhoneInput;
  address?: Omit<ContactAddressInput, 'id' | 'primary' | 'type'>;
}

/**
 * The PATCH body. Every section is optional and only what is sent is changed —
 * which is the whole reason this is a PATCH and why the form must not send a
 * section it does not actually edit.
 */
export interface ContactUpdate {
  details?: {
    first?: string;
    middle?: string;
    last?: string;
    suffix?: string;
    dob?: string;
    driverLicense?: string;
    driverLicenseState?: string;
    driverLicenseCountry?: string;
    driverLicenseCity?: string;
    driverLicenseExpiration?: string;
  };
  addresses?: ContactAddressInput[];
  secondaryContacts?: SecondaryContactInput[];
  military?: Record<string, unknown>;
}

/**
 * PATCH the contact record.
 *
 * The id is NOT sent and cannot be: the proxy takes the contact from the token,
 * so a session can only ever edit its own record.
 *
 * An ADDRESS or SECONDARY CONTACT carrying an `id` updates that row; one
 * without adds a new row. Re-sending an edited address without its id would
 * therefore leave the original in place and append a duplicate, so the caller
 * must carry ids through from the record it loaded.
 */
export function updateContact(
  cfg: LoginApiConfig,
  token: string,
  body: ContactUpdate,
): Promise<AuthedResult<AccountRecord>> {
  return sendJson(cfg, token, 'PATCH', '/api/account/contact', body);
}

async function sendJson(
  cfg: LoginApiConfig,
  token: string,
  method: 'PATCH' | 'POST' | 'PUT',
  path: string,
  body: unknown,
): Promise<AuthedResult<AccountRecord>> {
  let res: Response;
  let json: unknown;
  try {
    res = await fetch(url(cfg, path), {
      method,
      headers: { ...headers(cfg), Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    json = await res.json().catch(() => undefined);
  } catch (err) {
    return {
      ok: false,
      message: 'We could not reach the server. Your changes were not saved.',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (res.status === 401) {
    return {
      ok: false,
      unauthorized: true,
      message: 'Your session has expired. Please sign in again.',
      detail: failureDetail(json, res),
    };
  }
  if (!res.ok) {
    return {
      ok: false,
      // 400 validation_failed names the offending path in error.details; that
      // reaches the console, because it is a field path and not reader prose.
      message: 'We could not save your changes. Check the details and try again.',
      detail: failureDetail(json, res),
    };
  }

  const data = (json as { data?: Record<string, unknown> } | undefined)?.data;
  /*
   * A 200 with no recognisable record still SAVED. Reporting failure would make
   * a reader redo an edit that already went through, so this succeeds with
   * whatever came back and lets the caller refetch.
   */
  return { ok: true, data: (data ?? {}) as AccountRecord };
}

// ---------------------------------------------------------------------------
// Lease documents
// ---------------------------------------------------------------------------

export interface DocumentFile {
  blob: Blob;
  /** Content-Disposition's name when the server sent one, else the caller's. */
  filename: string;
}

/**
 * A lease document's file.
 *
 * GET /api/account/leases/{leaseId}/documents/{documentId}/file
 *
 * WHY THIS IS A FETCH AND NOT A LINK. The endpoint is authenticated by the
 * `Authorization` header, and a browser sends no such header when it follows an
 * <a href> or opens a window — so a link gets 401 every time. The bytes have to
 * be fetched here and handed to the page as a blob.
 *
 * The file lives under its LEASE rather than the contact, so both ids are
 * required; the contact record carries them on each lease's `documents`.
 */
export async function fetchDocumentFile(
  cfg: LoginApiConfig,
  token: string,
  leaseId: string,
  documentId: string,
  fallbackName: string,
): Promise<AuthedResult<DocumentFile>> {
  const path = `/api/account/leases/${encodeURIComponent(leaseId)}`
    + `/documents/${encodeURIComponent(documentId)}/file`;

  let res: Response;
  try {
    res = await fetch(url(cfg, path), {
      headers: { 'X-Duda-Site-Id': cfg.siteId, Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    return {
      ok: false,
      message: 'We could not reach the server. Please try again.',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (!res.ok) {
    /*
     * A failure comes back as JSON even though a success is binary, so the body
     * is only read on the error path — reading it as text on success would pull
     * a whole PDF into memory as a string.
     */
    const json = await res.json().catch(() => undefined);
    if (res.status === 401) {
      return {
        ok: false,
        unauthorized: true,
        message: 'Your session has expired. Please sign in again.',
        detail: failureDetail(json, res),
      };
    }
    return {
      ok: false,
      message: 'We could not open that document. Please try again.',
      detail: failureDetail(json, res),
    };
  }

  const blob = await res.blob();
  return { ok: true, data: { blob, filename: filenameFrom(res) || fallbackName } };
}

/** The server's own filename, when it offers one. */
function filenameFrom(res: Response): string {
  const cd = res.headers.get('content-disposition') ?? '';
  // RFC 5987 form first — it carries the encoding and wins when both appear.
  const star = /filename\*=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  if (star?.[1]) {
    try { return decodeURIComponent(star[1]); } catch { return star[1]; }
  }
  const plain = /filename="?([^";]+)"?/i.exec(cd);
  return plain?.[1] ?? '';
}

/**
 * Hand a fetched file to the browser as a download.
 *
 * An object URL rather than a data: one — a lease PDF can be megabytes and a
 * data: URL would base64 the whole thing into the DOM. Revoked on the next
 * frame: revoking immediately can cancel the download in some browsers, and
 * never revoking leaks the blob for the life of the page.
 */
export function saveBlob(file: DocumentFile): void {
  const href = URL.createObjectURL(file.blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = file.filename;
  // Firefox requires the anchor to be in the document for a programmatic click.
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}
