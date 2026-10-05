// ===========================================================================
// The signed-in account session, shared between #17 login and #19 my-account.
//
// #17 writes it on a successful verify, then sends the reader to /my-account —
// a FULL PAGE NAVIGATION, so nothing can be handed over in memory. The token
// has to be written somewhere the next page can read.
//
// sessionStorage, not localStorage: this is a session token with its own
// expiry, and it should not outlive the tab. A reader who closes the browser
// has signed out, which is what someone looking at their storage account on a
// shared machine would expect.
//
// EVERY ACCESS IS GUARDED. sessionStorage throws outright in a private window
// with site data blocked, and returns null when storage was cleared between
// pages. Both are normal, and both mean "not signed in" rather than an error:
// the account page sends the reader back to /login instead of showing a crash.
//
// NOT a security boundary. Anything in the browser is readable by the reader
// and by any script on the page; the server is what decides whether the token
// is good. This only decides what the UI shows first.
// ===========================================================================

const KEY = 'hb.account.session';

export interface AccountSession {
  token: string;
  /** ms epoch the token stops being accepted — derived from the API's expiresIn. */
  expiresAt: number;
  contactId: string;
  /** For the greeting; absent is fine. */
  name?: string;
}

/** Store the session. Returns false when storage refused it. */
export function saveSession(session: AccountSession): boolean {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(session));
    return true;
  } catch {
    // Private window, blocked site data, or a full quota. The caller decides
    // whether to continue — the sign-in itself still succeeded.
    return false;
  }
}

/**
 * The live session, or null.
 *
 * Expiry is checked here so no caller can forget to: a token past `expiresAt`
 * is the same as no token, and returning it would show an account page whose
 * every request then 401s.
 */
export function readSession(): AccountSession | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AccountSession> | null;
    if (!parsed || typeof parsed.token !== 'string' || !parsed.token) return null;
    if (typeof parsed.expiresAt !== 'number' || Date.now() >= parsed.expiresAt) {
      clearSession();
      return null;
    }

    return {
      token: parsed.token,
      expiresAt: parsed.expiresAt,
      contactId: typeof parsed.contactId === 'string' ? parsed.contactId : '',
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
    };
  } catch {
    // Unreadable or not the JSON we wrote. Treat as signed out rather than
    // letting a parse error escape into a render.
    return null;
  }
}

export function clearSession(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* nothing we can do, and nothing that needs saying */
  }
}

/** `expiresIn` seconds from the API → the absolute stamp we store. */
export function expiresAtFrom(expiresInSeconds: number): number {
  const secs = Number.isFinite(expiresInSeconds) && expiresInSeconds > 0 ? expiresInSeconds : 3600;
  return Date.now() + secs * 1000;
}
