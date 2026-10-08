// Best-effort session storage for the ID-verification flow.
//
// Storage only ever buys reload recovery (resume a pending session, restore the
// post-purchase screen after the mobile hand-off). It must never break the live
// flow: blocked storage (privacy settings, some embedded contexts), a full quota,
// or a browser that throws merely on touching `sessionStorage` all degrade to
// "nothing saved" instead of an exception. That matters most right after a start
// call, which has already billed a capture and sent the text.

function storage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : undefined;
  } catch {
    return undefined;
  }
}

export function idvSessionGet(key: string): string | null {
  try { return storage()?.getItem(key) ?? null; } catch { return null; }
}

/** True when the value was saved. */
export function idvSessionSet(key: string, value: string): boolean {
  try {
    const s = storage();
    if (!s) return false;
    s.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function idvSessionRemove(key: string): void {
  try { storage()?.removeItem(key); } catch { /* best effort */ }
}
