// ===========================================================================
// Account links that decide where to go BEFORE navigating.
//
// The nav's "Pay Bill" and "My Account" pointed at /my-account unconditionally.
// A signed-out visitor therefore loaded the whole account page, which rendered
// nothing while it checked the token, then navigated AGAIN to /login — a blank
// flash and a stutter for a journey that was never going to work.
//
// readSession() is synchronous (sessionStorage), so the same question can be
// answered at click time for free. The link goes straight where it belongs.
//
// NOT a security boundary, and it must not be mistaken for one. Anything in
// the browser is readable and writable by the reader; #19 still checks the
// token with the server and still redirects if it is rejected. All this
// decides is which URL to open, which is a UX question, not an access one.
// Forging a session here buys you a page that immediately bounces you out.
// ===========================================================================

import type { MouseEvent } from 'react';
import { readSession } from './accountSession';

/**
 * Where an account link should go right now.
 *
 * `gated` must mirror #19's own gate (`loginApiReady(api) && !inEditor`). When
 * the login API is not configured #19 is NOT gated and shows the account page
 * to everyone, so diverting to /login would send people somewhere they did not
 * need to go. One rule, asked in two places.
 */
export function accountDestination(target: string, loginUrl: string, gated: boolean): string {
  if (!gated) return target;
  return readSession() ? target : loginUrl;
}

/**
 * Props for an account <a>: the destination as it looks now, plus a click that
 * re-asks.
 *
 * Both halves earn their place. The href is resolved at RENDER so hover,
 * middle-click and cmd-click all get the real destination and the element
 * stays an ordinary link. It is re-asked on CLICK because the nav renders once
 * and a session can appear or expire in another tab long afterwards.
 *
 * Modified clicks are left entirely alone — the browser owns "open in a new
 * tab", and the href is already correct for it.
 */
export function accountLinkProps(target: string, loginUrl: string, gated: boolean): {
  href: string;
  onClick: (e: MouseEvent<HTMLAnchorElement>) => void;
} {
  const href = accountDestination(target, loginUrl, gated);
  return {
    href,
    onClick: (e) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const fresh = accountDestination(target, loginUrl, gated);
      // Only when the answer has CHANGED since render. Navigating by hand is
      // otherwise worth avoiding: Duda's editor and preview route anchors
      // themselves, and window.location steps around that.
      if (fresh === href) return;
      e.preventDefault();
      window.location.href = fresh;
    },
  };
}
