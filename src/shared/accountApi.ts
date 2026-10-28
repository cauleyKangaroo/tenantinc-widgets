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
  | { ok: false; unauthorized: true; message: string; detail?: string; retryable?: boolean }
  /** `retryable`: the OUTCOME IS UNKNOWN (network drop, 502/503/504) — a
   *  retry must reuse the same Idempotency-Key. A definite failure gets a
   *  fresh key next attempt (client contract, 2026-10-23). */
  | { ok: false; unauthorized?: false; message: string; detail?: string; retryable?: boolean };

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

// ---------------------------------------------------------------------------
// Protection-plan coverage on a lease — list, preview, apply.
//
// Three calls under /api/account/leases/{lease}/coverage, verified live
// 2026-10-12 against the Oladipo test account:
//
//   GET  …/coverage           { current, scheduled, options[] }
//   POST …/coverage/preview   { insuranceId } → the plan, premium and the
//                              date it would start (a dry run; saves nothing)
//   POST …/coverage           { insuranceId } → the GET shape with the new
//                              plan under `scheduled` (starts next billing cycle)
//
// The body takes ONLY insuranceId — any other key is a 400. The proxy's own
// refusals are customer-ready and specific, so they are surfaced verbatim:
//   409 coverage_downgrade_not_allowed  "Your protection plan can only be
//       upgraded online. Please contact the facility to choose a lower plan."
//   409 coverage_already_scheduled      "That protection plan already starts
//       with your next billing cycle."
//   400 coverage_option_invalid         "That protection plan is not offered
//       for this space."
//
// Two things about the data worth knowing before drawing it: `upgradable` is
// decided by PREMIUM, not by the coverage amount (a $3000-at-$12 tenant is
// offered "$2000 at $20" as an upgrade), and the current plan is NOT in
// `options[]` and nothing there is `isCurrent` — "your plan" comes only from
// `current`. Both are the API's call; the widget draws what it is given.
// ---------------------------------------------------------------------------

export interface CoveragePlan {
  insuranceId: string;
  name: string;
  monthlyPremium: number;
  /** "3000" — the API spells the amount as a string. */
  coverage: string;
  deductible: number | null;
  /** When it starts (preview / scheduled) or started (current). */
  startDate?: string;
  billedThrough?: string;
}

export interface CoverageOption {
  id: string;
  name: string;
  description: string;
  coverage: string;
  deductible: number | null;
  monthlyPremium: number;
  isCurrent: boolean;
  upgradable: boolean;
}

export interface LeaseCoverage {
  current: CoveragePlan | null;
  scheduled: CoveragePlan | null;
  options: CoverageOption[];
}

const numOr = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const strOr = (v: unknown): string => (typeof v === 'string' ? v : '');

function readPlan(v: unknown): CoveragePlan | null {
  if (!v || typeof v !== 'object') return null;
  const p = v as Record<string, unknown>;
  const insuranceId = strOr(p.insuranceId);
  if (!insuranceId) return null;
  return {
    insuranceId,
    name: strOr(p.name),
    monthlyPremium: numOr(p.monthlyPremium, 0),
    coverage: strOr(p.coverage) || String(p.coverage ?? ''),
    deductible: typeof p.deductible === 'number' ? p.deductible : null,
    startDate: strOr(p.startDate) || undefined,
    billedThrough: strOr(p.billedThrough) || undefined,
  };
}

function readCoverage(data: Record<string, unknown>): LeaseCoverage | null {
  const rows = Array.isArray(data.options) ? (data.options as Record<string, unknown>[]) : null;
  if (!rows) return null;
  return {
    current: readPlan(data.current),
    scheduled: readPlan(data.scheduled),
    options: rows
      .map((o) => ({
        id: strOr(o.id),
        name: strOr(o.name),
        description: strOr(o.description),
        coverage: strOr(o.coverage) || String(o.coverage ?? ''),
        deductible: typeof o.deductible === 'number' ? o.deductible : null,
        monthlyPremium: numOr(o.monthlyPremium, 0),
        isCurrent: o.isCurrent === true,
        upgradable: o.upgradable === true,
      }))
      .filter((o) => o.id),
  };
}

/** The lease's current plan, any scheduled change, and the plans on offer. */
export async function fetchLeaseCoverage(
  cfg: LoginApiConfig,
  token: string,
  leaseId: string,
): Promise<AuthedResult<LeaseCoverage>> {
  return getJson(cfg, token, `/api/account/leases/${encodeURIComponent(leaseId)}/coverage`, readCoverage);
}

/**
 * Authenticated POST. Like getJson, but the proxy's refusal MESSAGE is kept
 * when it has one: for these endpoints it is written for the customer and
 * names the actual reason (a downgrade, a plan not offered), which a generic
 * sentence would hide.
 */
async function postAuthed<T>(
  cfg: LoginApiConfig,
  token: string,
  path: string,
  body: unknown,
  pick: (data: Record<string, unknown>) => T | null,
  fallback: string,
): Promise<AuthedResult<T>> {
  let res: Response;
  let json: unknown;
  try {
    res = await fetch(url(cfg, path), {
      method: 'POST',
      headers: { ...headers(cfg), Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
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
    return { ok: false, unauthorized: true, message: 'Your session has expired. Please sign in again.', detail: failureDetail(json, res) };
  }
  if (!res.ok) {
    const err = (json as { error?: { message?: unknown } } | undefined)?.error;
    const said = typeof err?.message === 'string' ? err.message.trim() : '';
    return { ok: false, message: said || fallback, detail: failureDetail(json, res) };
  }
  const data = (json as { data?: Record<string, unknown> } | undefined)?.data;
  const picked = data ? pick(data) : null;
  if (!picked) {
    return { ok: false, message: fallback, detail: `unexpected ${path} payload: ${JSON.stringify(data ?? json).slice(0, 200)}` };
  }
  return { ok: true, data: picked };
}

/** Dry run: what the plan would cost and when it would start. Saves nothing. */
export async function previewCoverage(
  cfg: LoginApiConfig,
  token: string,
  leaseId: string,
  insuranceId: string,
): Promise<AuthedResult<CoveragePlan>> {
  return postAuthed(
    cfg, token, `/api/account/leases/${encodeURIComponent(leaseId)}/coverage/preview`, { insuranceId },
    (d) => readPlan(d), 'We could not price that plan right now. Please try again.',
  );
}

/** Schedule the plan from the next billing cycle. Answers with the GET shape. */
export async function applyCoverage(
  cfg: LoginApiConfig,
  token: string,
  leaseId: string,
  insuranceId: string,
): Promise<AuthedResult<LeaseCoverage>> {
  return postAuthed(
    cfg, token, `/api/account/leases/${encodeURIComponent(leaseId)}/coverage`, { insuranceId },
    readCoverage, 'We could not change your coverage right now. Please try again.',
  );
}

// ---------------------------------------------------------------------------
// Paying a lease.
//
//   POST /api/account/leases/{lease}/payments      header Idempotency-Key
//   { amount, invoices: [{ id, amount }], paymentMethod }
//     paymentMethod: { type: "saved", id }                       a card on file
//                    { type: "hosted-card", token, zip,
//                      saveToAccount, autopay }                  a GP token
//                    { type: "card", cardNumber, expMonth, expYear,
//                      cvv, nameOnCard, saveToAccount, autopay,
//                      address: { line1, city, state, zip, country } }
//                                              a typed card — gateways with no
//                                              hosted fields (authorizenet)
//                    { type: "ach", accountNumber, routingNumber,
//                      accountType: "checking" | "savings",
//                      firstName, lastName, saveToAccount, autopay,
//                      address: { line1, city, state, zip, country } }
//                                                                 Pay by Bank
//                    { type: "google-pay" | "apple-pay", token }  a wallet
//
// Both per the proxy's own contract (TenantInc, 2026-10-15) — camelCase like
// the card methods, NOT #99's snake_case upstream objects. The wallet token
// is exactly what #99 collects: Google's tokenizationData.token string, or
// Apple's whole token object JSON-stringified. Single-use, never enrols.
//
// PER LEASE — one call per space. The endpoint is under the lease, and the
// invoices are that lease's; several spaces mean several calls, each with
// its own Idempotency-Key. A hosted-field token is single-use, so a new card
// paying several spaces saves itself on the first call and pays the rest
// as a saved method — see MakePaymentPanel.
//
// The success shape has NOT been seen: every live attempt on 2026-10-12 was
// refused before validation with 409 payments_not_accepted ("This lease is
// not accepting online payments. Please contact the facility.") — the test
// leases were 529 days late. So the receipt is read defensively, field by
// field, and whatever the proxy says on a refusal is surfaced as it is.
// ---------------------------------------------------------------------------

export type LeasePaymentMethod =
  | { type: 'saved'; id: string }
  | { type: 'hosted-card'; token: string; zip: string; saveToAccount: boolean; autopay: boolean }
  /* A Stripe property's bank payment: the routing/account never leave the
     browser raw — Stripe mints a us_bank_account PaymentMethod and this
     carries its single-use pm_… (client contract, 2026-10-23). `zip` is
     REQUIRED: omitting it is payment_rejected "billing address zip code is
     required" (verified live on Bellflower, 2026-10-28). */
  | { type: 'hosted-ach'; token: string; zip: string; saveToAccount: boolean; autopay: boolean }
  | LeaseCardPaymentMethod
  | LeaseBankPaymentMethod
  | LeaseWalletPaymentMethod;

/**
 * A TYPED card — a property whose gateway has no hosted-fields integration
 * (`authorizenet` today, per its gateway reply: hosted GP key and Stripe
 * config both null). The real digits go to the API, exactly as the rental
 * flow's typed-card path sends them for a move-in on the same gateway.
 * Spelled camelCase with the address as one object, matching the ach method
 * beside it — the proxy's convention for every payment method it lists.
 */
export interface LeaseCardPaymentMethod {
  type: 'card';
  /** Digits only. */
  cardNumber: string;
  /** "09" */
  expMonth: string;
  /** Full year — "2027". */
  expYear: string;
  cvv: string;
  nameOnCard: string;
  saveToAccount: boolean;
  autopay: boolean;
  address: { line1: string; line2?: string; city: string; state: string; zip: string; country: string };
}

/** Google Pay / Apple Pay — the proxy's wallet payment method. */
export interface LeaseWalletPaymentMethod {
  type: 'google-pay' | 'apple-pay';
  /** SINGLE-USE, as #99 collects it: Google's tokenizationData.token; Apple's
   *  whole token object, JSON-stringified. */
  token: string;
}

/** Pay by Bank — the proxy's ACH payment method. */
export interface LeaseBankPaymentMethod {
  type: 'ach';
  /** Digits only. */
  accountNumber: string;
  /** Digits only — nine of them. */
  routingNumber: string;
  accountType: 'checking' | 'savings';
  firstName: string;
  lastName: string;
  saveToAccount: boolean;
  autopay: boolean;
  address: { line1: string; line2?: string; city: string; state: string; zip: string; country: string };
}

export interface LeasePaymentRequest {
  amount: number;
  /** The open invoices this pays. Absent on a PREPAY. */
  invoices?: Array<{ id: string; amount: number }>;
  /** Months ahead to prepay — its own payment, with `amount` from the prepay
   *  quote (never rent × months: the quote carries tax and fees). */
  prepayMonths?: number;
  paymentMethod: LeasePaymentMethod;
}

/**
 * What prepaying N months would cost, and how far it pays the lease through.
 *
 *   GET /api/account/leases/{lease}/prepay?months=N
 *     → { months, total, paidThrough, invoices: [{ periodStart, periodEnd,
 *         due, subTotal, totalTax, totalDiscounts, totalDue, balance, lines }] }
 *
 * Verified live 2026-10-14: a $93 lease quoted 101.14 for one month (tax and
 * fees on top), paid through 2026-11-30 — which is why the quote, not the
 * rent, is what the payment sends.
 */
export interface PrepayQuote {
  months: number;
  total: number;
  /** YYYY-MM-DD. */
  paidThrough: string;
}

function readPrepayQuote(d: Record<string, unknown>): PrepayQuote | null {
  if (typeof d.total !== 'number') return null;
  return { months: typeof d.months === 'number' ? d.months : 0, total: d.total, paidThrough: strOr(d.paidThrough) };
}

export async function fetchPrepayQuote(
  cfg: LoginApiConfig,
  token: string,
  leaseId: string,
  months: number,
): Promise<AuthedResult<PrepayQuote>> {
  return getJson(cfg, token, `/api/account/leases/${encodeURIComponent(leaseId)}/prepay?months=${encodeURIComponent(String(months))}`, readPrepayQuote);
}

export interface LeasePaymentReceipt {
  /** The payment's number / id, whichever the proxy calls it. */
  number: string;
  amount: number | null;
  /** "xxxx 1111" when the reply says which card; '' otherwise. */
  method: string;
  /** A payment method saved by this payment, if the reply names one. */
  savedPaymentMethodId: string;
  raw: Record<string, unknown>;
}

function readReceipt(raw: Record<string, unknown>): LeasePaymentReceipt {
  // Live reply (2026-10-14): { payment: { id, amount, status }, message } —
  // the receipt sits under `payment`. Older/flat shapes are read as before.
  const d = (raw.payment && typeof raw.payment === 'object' ? { ...raw, ...(raw.payment as Record<string, unknown>) } : raw);
  const pm = (d.paymentMethod && typeof d.paymentMethod === 'object' ? d.paymentMethod : {}) as Record<string, unknown>;
  const last4 = strOr(d.last4) || strOr(pm.last4) || strOr(d.cardLast4);
  return {
    number: strOr(d.number) || strOr(d.paymentNumber) || strOr(d.confirmationNumber) || strOr(d.paymentId) || strOr(d.id),
    amount: typeof d.amount === 'number' ? d.amount : typeof d.total === 'number' ? d.total : null,
    method: last4 ? `xxxx ${last4}` : '',
    savedPaymentMethodId: strOr(d.paymentMethodId) || strOr(d.savedPaymentMethodId) || strOr(pm.id),
    raw: d,
  };
}

export async function payLease(
  cfg: LoginApiConfig,
  token: string,
  leaseId: string,
  body: LeasePaymentRequest,
  idempotencyKey: string,
): Promise<AuthedResult<LeasePaymentReceipt>> {
  let res: Response;
  let json: unknown;
  try {
    res = await fetch(url(cfg, `/api/account/leases/${encodeURIComponent(leaseId)}/payments`), {
      method: 'POST',
      headers: { ...headers(cfg), Authorization: `Bearer ${token}`, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    });
    json = await res.json().catch(() => undefined);
  } catch (err) {
    // Outcome unknown: the request may have landed. The retry keeps its key.
    return { ok: false, retryable: true, message: 'We could not reach the server. Check your connection and try again.', detail: err instanceof Error ? err.message : String(err) };
  }
  if (res.status === 401) {
    return { ok: false, unauthorized: true, message: 'Your session has expired. Please sign in again.', detail: failureDetail(json, res) };
  }
  if (!res.ok) {
    const err = (json as { error?: { message?: unknown } } | undefined)?.error;
    const said = typeof err?.message === 'string' ? err.message.trim() : '';
    // A bad gateway is "outcome unknown" too; any other status is a definite no.
    const retryable = res.status === 502 || res.status === 503 || res.status === 504;
    return { ok: false, retryable, message: said || 'Your payment could not be processed. Please try a different payment method or contact your bank for assistance.', detail: failureDetail(json, res) };
  }
  const data = (json as { data?: Record<string, unknown> } | undefined)?.data;
  return { ok: true, data: readReceipt(data ?? {}) };
}
