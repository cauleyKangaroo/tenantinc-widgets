export interface VerificationWindow {
  closed?: boolean;
  opener?: unknown;
  location: { href: string };
  close(): void;
}

function hostMatches(host: string, pattern: string): boolean {
  const expected = pattern.toLowerCase();
  const actual = host.toLowerCase();
  if (expected.startsWith('*.')) {
    const suffix = expected.slice(1);
    return actual.endsWith(suffix) && actual.length > suffix.length;
  }
  return actual === expected;
}

/**
 * Defence in depth. The proxy remains authoritative, but the browser still
 * refuses unexpected schemes, credentials, ports and hosts before navigation.
 * A non-standard port must appear explicitly in an allowlist entry.
 */
export function allowedVerificationUrl(
  raw: string,
  allowedHosts: readonly string[],
): URL | undefined {
  if (allowedHosts.length === 0) return undefined;
  let url: URL;
  try { url = new URL(raw); } catch { return undefined; }
  if (url.protocol !== 'https:' || url.username || url.password) return undefined;
  if (url.port && url.port !== '443' && !allowedHosts.some((host) => hostMatches(url.host, host))) {
    return undefined;
  }
  if (!allowedHosts.some((host) => hostMatches(url.host, host) || (!host.includes(':') && hostMatches(url.hostname, host)))) {
    return undefined;
  }
  return url;
}

/** Open during the click gesture; navigating after an awaited start stays legal. */
export function openVerificationPlaceholder(
  openWindow: () => VerificationWindow | null = () => window.open('', '_blank') as VerificationWindow | null,
): VerificationWindow | null {
  let target: VerificationWindow | null;
  try { target = openWindow(); } catch { return null; }
  // `noopener` in window.open's feature string can make browsers return null,
  // which leaves no handle to navigate after the awaited start call. Sever the
  // opener explicitly while retaining the handle instead.
  try { if (target) target.opener = null; } catch { closeVerificationPlaceholder(target); return null; }
  return target;
}

export function navigateVerificationWindow(
  target: VerificationWindow | null,
  verificationUrl: string,
  allowedHosts: readonly string[],
): boolean {
  if (!target) return false;
  const safeUrl = allowedVerificationUrl(verificationUrl, allowedHosts);
  if (!safeUrl) return false;
  try {
    if (target.closed) return false;
    target.location.href = safeUrl.href;
    return true;
  } catch { return false; }
}

export function closeVerificationPlaceholder(target: VerificationWindow | null): void {
  try { if (target && !target.closed) target.close(); } catch { /* Browser may revoke the handle. */ }
}
