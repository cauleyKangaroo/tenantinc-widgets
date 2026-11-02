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
// The exception is the login's "Keep me logged in on this device" box: ticked,
// the session goes to localStorage instead and survives closing the browser
// (still bounded by the token's own expiry). Reads look in both.
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
  /*
   * What the reader signed in WITH — the email or phone they typed.
   *
   * Neither /me nor the verify response carries it, and the account page shows
   * "You're logged in as …". Without this it fell back to the demo constant and
   * showed a stranger's address to a signed-in reader.
   *
   * The identifier, not the account's registered email: it is what they typed
   * and what the code was sent to, so it is the one that answers "as whom?".
   */
  signedInAs?: string;
}

/**
 * Store the session. Returns false when storage refused it.
 *
 * `remember` → localStorage (survives the browser closing); otherwise
 * sessionStorage. Any copy in the other store is dropped so only one exists.
 */
export function saveSession(session: AccountSession, remember = false): boolean {
  try {
    const keep = remember ? window.localStorage : window.sessionStorage;
    keep.setItem(KEY, JSON.stringify(session));
    try {
      (remember ? window.sessionStorage : window.localStorage).removeItem(KEY);
    } catch { /* the save itself succeeded */ }
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
  // Each store on its own: a sessionStorage that THROWS (not just empty) must
  // not stop the remembered copy being read — saveSession(session, true)
  // tolerates exactly that failure, so a remembered login can exist behind a
  // blocked sessionStorage.
  return readFrom(() => window.sessionStorage) ?? readFrom(() => window.localStorage);
}

/** One store's session: parsed, validated, expiry-checked. */
function readFrom(getStore: () => Storage): AccountSession | null {
  let store: Storage;
  let raw: string | null;
  try {
    store = getStore();
    raw = store.getItem(KEY);
  } catch {
    // Private window / blocked site data — this store is unreadable; the
    // caller tries the other one.
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AccountSession> | null;
    if (!parsed || typeof parsed.token !== 'string' || !parsed.token) return null;
    if (typeof parsed.expiresAt !== 'number' || Date.now() >= parsed.expiresAt) {
      // Only THIS store's entry. sessionStorage is per-tab, so a sign-in with
      // "keep me logged in" from another tab cannot clean this tab's stale
      // copy — clearing BOTH stores here was letting that stale copy erase
      // the newer remembered login. Clearing both is sign-out's job.
      try { store.removeItem(KEY); } catch { /* read-only storage */ }
      return null;
    }

    return {
      token: parsed.token,
      expiresAt: parsed.expiresAt,
      contactId: typeof parsed.contactId === 'string' ? parsed.contactId : '',
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      signedInAs: typeof parsed.signedInAs === 'string' ? parsed.signedInAs : undefined,
    };
  } catch {
    // Unreadable or not the JSON we wrote. Treat as signed out rather than
    // letting a parse error escape into a render.
    return null;
  }
}

/** Signs out of both stores, so a remembered session cannot outlive "Log out". */
export function clearSession(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* nothing we can do, and nothing that needs saying */
  }
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* same */
  }
}

/** `expiresIn` seconds from the API → the absolute stamp we store. */
export function expiresAtFrom(expiresInSeconds: number): number {
  const secs = Number.isFinite(expiresInSeconds) && expiresInSeconds > 0 ? expiresInSeconds : 3600;
  return Date.now() + secs * 1000;
}
