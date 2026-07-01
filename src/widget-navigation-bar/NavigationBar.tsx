import React, { useState } from 'react';
import './NavigationBar.css';
import storelocalLogo from './storelocal-logo.svg';
import {
  ChevronDown,
  PhoneIcon,
  MessageAiIcon,
  MessageDefaultIcon,
  CreditCardIcon,
  UsFlagIcon,
  UserCircleIcon,
  HamburgerIcon,
  CloseIcon,
} from './icons';

// ---------------------------------------------------------------------------
// Types + defaults
// ---------------------------------------------------------------------------

interface NavLink {
  label: string;
  href: string;
  hasDropdown?: boolean;
}

const DEFAULT_LINKS: NavLink[] = [
  { label: 'Find Storage', href: '#', hasDropdown: true },
  { label: 'Storage Types', href: '#', hasDropdown: true },
  { label: 'Resources', href: '#', hasDropdown: true },
  { label: 'Size Guide', href: '#' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface NavigationBarProps {
  /** Override the bundled storelocal logo with a custom image URL. */
  logoUrl?: string;
  /** Colour of the raised logo tile. Default storelocal green. */
  logoBg?: string;
  /** Duda content-menu toggle: show the secondary utility bar on top. Default true. */
  showTopBar?: boolean;
  phone?: string;
  phoneHref?: string;
  /** Second (text/SMS) number shown in the top bar. */
  smsPhone?: string;
  smsPhoneHref?: string;
  liveChatLabel?: string;
  liveChatUrl?: string;
  /** Language label for the top-bar selector, e.g. "EN". */
  language?: string;
  payBillLabel?: string;
  payBillUrl?: string;
  accountLabel?: string;
  accountUrl?: string;
  links?: NavLink[];
}

export function NavigationBar({
  logoUrl,
  logoBg = '#509E2F',
  showTopBar = true,
  phone = '(800) 874-9487',
  phoneHref,
  smsPhone = '(800) 874-9487',
  smsPhoneHref,
  liveChatLabel = 'Live Chat',
  liveChatUrl = '#',
  language = 'EN',
  payBillLabel = 'Pay Bill',
  payBillUrl = '#',
  accountLabel = 'My Account',
  accountUrl = '#',
  links = DEFAULT_LINKS,
}: NavigationBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const telHref = phoneHref ?? `tel:${phone.replace(/[^0-9+]/g, '')}`;
  const smsHref = smsPhoneHref ?? `tel:${smsPhone.replace(/[^0-9+]/g, '')}`;

  const navLinks = (
    <ul className="nav-links">
      {links.map((link) => (
        <li key={link.label}>
          <a className="nav-link" href={link.href}>
            <span>{link.label}</span>
            {link.hasDropdown && <ChevronDown size={20} className="nav-link-chevron" />}
          </a>
        </li>
      ))}
    </ul>
  );

  // Secondary-bar utility row (also reused in the mobile drawer when the top bar is on).
  const topItems = (
    <div className="nav-top-items">
      <a className="nav-top-item" href={telHref}>
        <PhoneIcon size={24} />
        <span>{phone}</span>
      </a>
      {smsPhone && (
        <a className="nav-top-item" href={smsHref}>
          <MessageDefaultIcon size={24} />
          <span>{smsPhone}</span>
        </a>
      )}
      <a className="nav-top-item" href={liveChatUrl}>
        <MessageAiIcon size={24} />
        <span>{liveChatLabel}</span>
      </a>
      <a className="nav-top-item" href={payBillUrl}>
        <CreditCardIcon size={24} />
        <span>{payBillLabel}</span>
      </a>
      <button className="nav-top-item nav-lang" type="button">
        <UsFlagIcon />
        <span>{language}</span>
        <ChevronDown size={24} className="nav-link-chevron" />
      </button>
      <a className="nav-top-item" href={accountUrl}>
        <UserCircleIcon size={24} />
        <span>{accountLabel}</span>
      </a>
    </div>
  );

  // Inline actions used only when the top bar is OFF (single-bar layout).
  const actions = (
    <div className="nav-actions">
      <a className="nav-phone" href={telHref}>
        <PhoneIcon size={24} />
        <span>{phone}</span>
      </a>
      <a className="nav-paybill" href={payBillUrl}>{payBillLabel}</a>
      <button className="nav-icon-btn" aria-label="AI chat">
        <MessageAiIcon size={24} />
      </button>
      <a className="nav-icon-btn" href={accountUrl} aria-label="Account">
        <UserCircleIcon size={26} />
      </a>
    </div>
  );

  return (
    <nav className={`nav-bar${showTopBar ? ' has-topbar' : ''}`}>
      {showTopBar && (
        <div className="nav-topbar">
          <div className="nav-topbar-inner">{topItems}</div>
        </div>
      )}

      <div className="nav-primary">
        <div className="nav-inner">
          <div className="nav-right">
            {navLinks}
            {!showTopBar && actions}
          </div>
          <button className="nav-burger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <HamburgerIcon size={28} />
          </button>
        </div>
      </div>

      {/* Raised logo tile — absolutely positioned so it spans both bars and
          protrudes below. Space is reserved via padding-left on the bar inners
          so it never overlaps the nav content. */}
      <a className="nav-logo" href="#" style={{ background: logoBg }} aria-label="Home">
        <img className="nav-logo-img" src={logoUrl ?? storelocalLogo} alt="storelocal storage" />
      </a>

      {/* Mobile drawer (no mobile design was provided — sensible default) */}
      {menuOpen && (
        <div className="nav-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMenuOpen(false); }}>
          <div className="nav-drawer" role="dialog" aria-modal="true">
            <button className="nav-drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <CloseIcon size={28} />
            </button>
            {navLinks}
            {showTopBar ? topItems : actions}
          </div>
        </div>
      )}
    </nav>
  );
}
