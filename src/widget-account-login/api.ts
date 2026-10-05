// ===========================================================================
// #17 Account Login — the My Account verification API.
//
// Two calls, in the order the card needs them:
//   send    POST /api/account/verification/send    — emails/texts a one-time code
//   verify  POST /api/account/verification/verify  — exchanges it for a session
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
    error?: { code?: unknown; message?: unknown };
    requestId?: unknown;
  } | null;
  return [
    `${res.status} ${res.statusText}`,
    typeof b?.error?.code === 'string' ? b.error.code : '',
    typeof b?.error?.message === 'string' ? b.error.message : '',
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
  // letting an unknown shape through would redirect an unauthenticated reader
  // to the account page.
  return {
    ok: false,
    message: 'We could not complete sign-in. Please try again.',
    detail: `unexpected verify payload: ${JSON.stringify(data ?? json).slice(0, 200)}`,
  };
}
