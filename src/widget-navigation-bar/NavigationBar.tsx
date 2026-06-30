import React, { useState } from 'react';
import './NavigationBar.css';
import storelocalLogo from './storelocal-logo.svg';
import { ChevronDown, PhoneIcon, MessageAiIcon, UserCircleIcon, HamburgerIcon, CloseIcon } from './icons';

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
  phone?: string;
  phoneHref?: string;
  payBillLabel?: string;
  payBillUrl?: string;
  links?: NavLink[];
  accountUrl?: string;
}

export function NavigationBar({
  logoUrl,
  logoBg = '#509E2F',
  phone = '(800) 874-9487',
  phoneHref,
  payBillLabel = 'Pay Bill',
  payBillUrl = '#',
  links = DEFAULT_LINKS,
  accountUrl = '#',
}: NavigationBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const telHref = phoneHref ?? `tel:${phone.replace(/[^0-9+]/g, '')}`;

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
    <nav className="nav-bar">
      <div className="nav-inner">
        <a className="nav-logo" href="#" style={{ background: logoBg }} aria-label="Home">
          <img className="nav-logo-img" src={logoUrl ?? storelocalLogo} alt="storelocal storage" />
        </a>

        <div className="nav-right">
          {navLinks}
          {actions}
        </div>

        <button className="nav-burger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <HamburgerIcon size={28} />
        </button>
      </div>

      {/* Mobile drawer (no mobile design was provided — sensible default) */}
      {menuOpen && (
        <div className="nav-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMenuOpen(false); }}>
          <div className="nav-drawer" role="dialog" aria-modal="true">
            <button className="nav-drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <CloseIcon size={28} />
            </button>
            {navLinks}
            {actions}
          </div>
        </div>
      )}
    </nav>
  );
}
