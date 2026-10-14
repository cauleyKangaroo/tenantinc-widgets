import { useEffect, useRef, useState } from 'react';
import { UserCircleIcon } from './icons';
import { clearSession, readSession } from '@shared/accountSession';

// ===========================================================================
// The top bar's "My Account" item — a menu of My Account, Pay Bill and Logout.
//
// Logout is the only way out now that #19 has no Log out button of its own. It
// clears the stored session (@shared/accountSession, the same call #19's
// signOut makes) BEFORE navigating: a link alone would leave the token in
// sessionStorage and the next visit to /my-account would walk straight back in.
//
// The last row is Login for a signed-out visitor and Logout only once there is
// a live session (readSession, which also treats an expired token as none).
// Checked each time the menu OPENS rather than once on mount, so it is never
// stale after a login or logout elsewhere on the page.
//
// Same open/close behaviour as LanguageMenu: click toggles, an outside click or
// Escape closes, listeners bound only while open.
// ===========================================================================

export function AccountMenu({
  label = 'My Account',
  accountHref = '/my-account',
  payBillHref = '/login',
  loginHref = '/login',
}: {
  label?: string;
  accountHref?: string;
  payBillHref?: string;
  /** Where Logout lands once the session is cleared. */
  loginHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (!open) setSignedIn(readSession() !== null);
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="nav-acct-wrap" ref={wrapRef}>
      <button
        type="button"
        className="nav-top-item"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <UserCircleIcon size={24} />
        <span>{label}</span>
      </button>

      {open && (
        <div className="nav-acct-menu" role="menu">
          <a role="menuitem" className="nav-acct-opt" href={accountHref}>My Account</a>
          <a role="menuitem" className="nav-acct-opt" href={payBillHref}>Pay Bill</a>
          {signedIn ? (
            <a
              role="menuitem"
              className="nav-acct-opt"
              href={loginHref}
              onClick={(e) => {
                e.preventDefault();
                clearSession();
                window.location.href = loginHref;
              }}
            >
              Logout
            </a>
          ) : (
            <a role="menuitem" className="nav-acct-opt" href={loginHref}>Login</a>
          )}
        </div>
      )}
    </div>
  );
}
