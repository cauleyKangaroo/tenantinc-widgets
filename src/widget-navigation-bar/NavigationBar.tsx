import React, { useState } from 'react';
import './NavigationBar.css';
import storelocalLogo from './storelocal-logo.svg';
import {
  ChevronDown,
  ChevronRight,
  PhoneIcon,
  MessageAiIcon,
  MessageDefaultIcon,
  CreditCardIcon,
  UsFlagIcon,
  UserCircleIcon,
  HamburgerIcon,
  CloseIcon,
  SelfStorageIcon,
  BusinessStorageIcon,
  DriveUpIcon,
  VehicleRvIcon,
  MailboxIcon,
  ClimateControlledIcon,
} from './icons';

// ---------------------------------------------------------------------------
// Types + defaults
// ---------------------------------------------------------------------------

/** A leaf item in the second-level (city) list. */
interface NavSubItem {
  label: string;
  href: string;
}

/** A first-level dropdown row; may open a second-level list on hover. */
interface NavMenuItem {
  label: string;
  href: string;
  /** Optional leading icon (used by the Storage Types menu). */
  icon?: React.ReactNode;
  children?: NavSubItem[];
}

interface NavLink {
  label: string;
  href: string;
  hasDropdown?: boolean;
  /** Two-level hover mega-menu (first-level rows, each optionally nesting a city list). */
  menu?: NavMenuItem[];
}

// Hardcoded for now — the real data will come from a collection / props later.
const FIND_STORAGE_MENU: NavMenuItem[] = [
  { label: 'All Locations', href: '#' },
  {
    label: 'Arizona',
    href: '#',
    children: [
      { label: 'Phoenix', href: '#' },
      { label: 'Tucson', href: '#' },
      { label: 'Mesa', href: '#' },
      { label: 'Scottsdale', href: '#' },
    ],
  },
  {
    label: 'California',
    href: '#',
    children: [
      { label: 'Los Angeles', href: '#' },
      { label: 'San Diego', href: '#' },
      { label: 'Newport Beach', href: '#' },
      { label: 'Oceanside', href: '#' },
      { label: 'Santa Barbara', href: '#' },
      { label: 'San Luis Obispo', href: '#' },
      { label: 'Riverside', href: '#' },
      { label: 'Redlands', href: '#' },
    ],
  },
  {
    label: 'Oregon',
    href: '#',
    children: [
      { label: 'Portland', href: '#' },
      { label: 'Eugene', href: '#' },
      { label: 'Salem', href: '#' },
      { label: 'Bend', href: '#' },
    ],
  },
  {
    label: 'Washington',
    href: '#',
    children: [
      { label: 'Seattle', href: '#' },
      { label: 'Spokane', href: '#' },
      { label: 'Tacoma', href: '#' },
      { label: 'Bellevue', href: '#' },
    ],
  },
];

const STORAGE_TYPES_MENU: NavMenuItem[] = [
  { label: 'Self Storage', href: '#', icon: <SelfStorageIcon /> },
  { label: 'Business Storage', href: '#', icon: <BusinessStorageIcon /> },
  { label: 'Drive-Up Access', href: '#', icon: <DriveUpIcon /> },
  { label: 'Vehicle & RV Storage', href: '#', icon: <VehicleRvIcon /> },
  { label: 'Mailboxes', href: '#', icon: <MailboxIcon /> },
  { label: 'Climate Controlled Storage', href: '#', icon: <ClimateControlledIcon /> },
];

const RESOURCES_MENU: NavMenuItem[] = [
  { label: 'Storage Blog', href: '#' },
  { label: 'Storage Tips', href: '#' },
  { label: 'About Us', href: '#' },
  { label: 'Careers', href: '#' },
  { label: '3rd Party Management', href: '#' },
  { label: 'Customer Service', href: '#' },
];

const DEFAULT_LINKS: NavLink[] = [
  { label: 'Find Storage', href: '#', hasDropdown: true, menu: FIND_STORAGE_MENU },
  { label: 'Storage Types', href: '#', hasDropdown: true, menu: STORAGE_TYPES_MENU },
  { label: 'Resources', href: '#', hasDropdown: true, menu: RESOURCES_MENU },
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
  // Desktop hover mega-menu: which top-level link is open, and which of its
  // rows is currently hovered (plus that row's vertical offset so the city
  // panel lines up with it).
  const [openLink, setOpenLink] = useState<string | null>(null);
  const [subIndex, setSubIndex] = useState<number | null>(null);
  const [subTop, setSubTop] = useState(0);
  const telHref = phoneHref ?? `tel:${phone.replace(/[^0-9+]/g, '')}`;
  const smsHref = smsPhoneHref ?? `tel:${smsPhone.replace(/[^0-9+]/g, '')}`;

  const closeMenus = () => {
    setOpenLink(null);
    setSubIndex(null);
  };

  // Desktop nav links, including the two-level hover mega-menu.
  const navLinks = (
    <ul className="nav-links">
      {links.map((link) => {
        const hasMenu = !!link.menu?.length;
        const isOpen = hasMenu && openLink === link.label;
        const activeItem = isOpen && subIndex != null ? link.menu![subIndex] : undefined;
        return (
          <li
            key={link.label}
            className="nav-item"
            onMouseEnter={() => hasMenu && setOpenLink(link.label)}
            onMouseLeave={closeMenus}
          >
            <a className="nav-link" href={link.href}>
              <span>{link.label}</span>
              {link.hasDropdown && <ChevronDown size={20} className="nav-link-chevron" />}
            </a>

            {isOpen && (
              <div className="nav-dropdown">
                <ul className="nav-dd-panel">
                  {link.menu!.map((item, i) => (
                    <li
                      key={item.label}
                      className={`nav-dd-item${subIndex === i ? ' is-active' : ''}`}
                      onMouseEnter={(e) => {
                        setSubIndex(i);
                        setSubTop((e.currentTarget as HTMLElement).offsetTop);
                      }}
                    >
                      <a className="nav-dd-link" href={item.href}>
                        {item.icon && <span className="nav-dd-icon">{item.icon}</span>}
                        <span>{item.label}</span>
                      </a>
                      {item.children?.length ? (
                        <ChevronRight size={16} className="nav-dd-arrow" />
                      ) : null}
                    </li>
                  ))}
                </ul>

                {activeItem?.children?.length ? (
                  <ul className="nav-subpanel" style={{ top: subTop }}>
                    {activeItem.children.map((sub) => (
                      <li key={sub.label} className="nav-sub-item">
                        <a href={sub.href}>{sub.label}</a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  // Plain link list for the mobile drawer (no hover mega-menu).
  const drawerLinks = (
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
            {drawerLinks}
            {showTopBar ? topItems : actions}
          </div>
        </div>
      )}
    </nav>
  );
}
