import React, { useState } from 'react';
import './NavigationBar.css';
import storelocalLogo from './Storelocal_logo.png';
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
  EnvelopeIcon,
  MapPinIcon,
  LoginIcon,
  KeyIcon,
  SearchIcon,
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
  /** Primary-bar height. 'narrow' = 100px, 'wide' = 180px. Default 'narrow'. */
  height?: 'narrow' | 'wide';
  /** Logo treatment. 'banner' = raised tile overlapping the bar (default),
   *  'inline' = logo sits inline at the left of the bar. */
  logoStyle?: 'banner' | 'inline';
  /** Bottom separator style. Default 'shadow'. */
  separator?: 'shadow' | 'line' | 'none';
  /** Duda content-menu toggle: show the secondary utility bar on top. Default true. */
  showTopBar?: boolean;
  /** Per-item visibility toggles for the utility items (top bar / inline actions). */
  showPhone?: boolean;
  showChat?: boolean;
  showAccount?: boolean;
  showPayBill?: boolean;
  showLanguage?: boolean;
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
  /** External URL for the Bill Pay item (from the "Enable external URLs" group). */
  payBillUrl?: string;
  accountLabel?: string;
  /** External URL for the My Account item (from the "Enable external URLs" group). */
  accountUrl?: string;
  links?: NavLink[];
}

export function NavigationBar({
  logoUrl,
  logoBg = 'transparent',
  height = 'narrow',
  logoStyle = 'banner',
  separator = 'shadow',
  showTopBar = true,
  showPhone = true,
  showChat = true,
  showAccount = true,
  showPayBill = true,
  showLanguage = true,
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
  // Mobile menu: which top-level link's accordion is expanded.
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
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

  // Secondary-bar utility row (also reused in the mobile drawer when the top bar is on).
  // Each item is gated by its own visibility toggle from the content menu.
  const topItems = (
    <div className="nav-top-items">
      {showPhone && (
        <a className="nav-top-item" href={telHref}>
          <PhoneIcon size={24} />
          <span>{phone}</span>
        </a>
      )}
      {showPhone && smsPhone && (
        <a className="nav-top-item" href={smsHref}>
          <MessageDefaultIcon size={24} />
          <span>{smsPhone}</span>
        </a>
      )}
      {showChat && (
        <a className="nav-top-item" href={liveChatUrl}>
          <MessageAiIcon size={24} />
          <span>{liveChatLabel}</span>
        </a>
      )}
      {showPayBill && (
        <a className="nav-top-item" href={payBillUrl}>
          <CreditCardIcon size={24} />
          <span>{payBillLabel}</span>
        </a>
      )}
      {showLanguage && (
        <button className="nav-top-item nav-lang" type="button">
          <UsFlagIcon />
          <span>{language}</span>
          <ChevronDown size={24} className="nav-link-chevron" />
        </button>
      )}
      {showAccount && (
        <a className="nav-top-item" href={accountUrl}>
          <UserCircleIcon size={24} />
          <span>{accountLabel}</span>
        </a>
      )}
    </div>
  );

  // Inline actions used only when the top bar is OFF (single-bar layout).
  const actions = (
    <div className="nav-actions">
      {showPhone && (
        <a className="nav-phone" href={telHref}>
          <PhoneIcon size={24} />
          <span>{phone}</span>
        </a>
      )}
      {showPayBill && <a className="nav-paybill" href={payBillUrl}>{payBillLabel}</a>}
      {showChat && (
        <button className="nav-icon-btn" aria-label="AI chat">
          <MessageAiIcon size={24} />
        </button>
      )}
      {showLanguage && (
        <button className="nav-icon-btn nav-lang" type="button" aria-label="Language">
          <UsFlagIcon />
          <ChevronDown size={20} className="nav-link-chevron" />
        </button>
      )}
      {showAccount && (
        <a className="nav-icon-btn" href={accountUrl} aria-label="Account">
          <UserCircleIcon size={26} />
        </a>
      )}
    </div>
  );

  // Normalise the enum-style props so an empty/unknown value from Duda can never
  // produce e.g. a `logo-` class that renders no logo at all.
  const isWide = height === 'wide';
  const logoMode = logoStyle === 'inline' ? 'inline' : 'banner';
  const sepMode = separator === 'line' || separator === 'none' ? separator : 'shadow';

  const barClass = [
    'nav-bar',
    showTopBar ? 'has-topbar' : '',
    isWide ? 'is-wide' : '',
    `logo-${logoMode}`,
    `sep-${sepMode}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav className={barClass}>
      {showTopBar && (
        <div className="nav-topbar">
          <div className="nav-topbar-inner">{topItems}</div>
        </div>
      )}

      <div className="nav-primary">
        <div className="nav-inner">
          {logoMode === 'inline' && (
            <a className="nav-logo-inline" href="#" aria-label="Home">
              <img className="nav-logo-img" src={logoUrl ?? storelocalLogo} alt="storelocal storage" />
            </a>
          )}
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
          so it never overlaps the nav content. Only in 'banner' mode. */}
      {logoMode === 'banner' && (
        <a className="nav-logo" href="#" style={{ background: logoBg }} aria-label="Home">
          <img className="nav-logo-img" src={logoUrl ?? storelocalLogo} alt="storelocal storage" />
        </a>
      )}

      {/* Mobile full-screen menu (hamburger). */}
      {menuOpen && (
        <div className="nav-mobile-menu" role="dialog" aria-modal="true">
          <div className="nav-mm-header">
            <a className="nav-mm-logo" href="#" aria-label="Home">
              <img className="nav-mm-logo-img" src={logoUrl ?? storelocalLogo} alt="storelocal storage" />
            </a>
            <button className="nav-mm-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <CloseIcon size={24} />
            </button>
          </div>

          <div className="nav-mm-body">
            {/* Quick actions */}
            <div className="nav-mm-quick">
              <a className="nav-mm-quick-item" href="#">
                <span className="nav-mm-circle"><EnvelopeIcon size={22} /></span>
                <span className="nav-mm-quick-label">Email</span>
              </a>
              <a className="nav-mm-quick-item" href={telHref}>
                <span className="nav-mm-circle"><PhoneIcon size={22} /></span>
                <span className="nav-mm-quick-label">Phone</span>
              </a>
              <a className="nav-mm-quick-item" href="#">
                <span className="nav-mm-circle"><MapPinIcon size={22} /></span>
                <span className="nav-mm-quick-label">Map</span>
              </a>
              <a className="nav-mm-quick-item" href={payBillUrl}>
                <span className="nav-mm-circle"><CreditCardIcon size={22} /></span>
                <span className="nav-mm-quick-label">Billpay</span>
              </a>
            </div>

            {/* Location search (visual only for now) */}
            <form className="nav-mm-search" onSubmit={(e) => e.preventDefault()}>
              <input className="nav-mm-search-input" type="text" placeholder="City, ZIP or Address" aria-label="Search location" />
              <span className="nav-mm-search-divider" />
              <button className="nav-mm-search-type" type="button">
                <span>Storage</span>
                <ChevronDown size={16} />
              </button>
              <button className="nav-mm-search-btn" type="submit" aria-label="Search">
                <SearchIcon size={20} />
              </button>
            </form>

            {/* Account / utility links */}
            <ul className="nav-mm-account">
              <li><a href="#"><LoginIcon size={24} /><span>Login</span></a></li>
              <li><a href={accountUrl}><UserCircleIcon size={24} /><span>{accountLabel}</span></a></li>
              <li><a href={liveChatUrl}><MessageAiIcon size={24} /><span>{liveChatLabel}</span></a></li>
              <li><a href="#"><KeyIcon size={24} /><span>Get Gatecode</span></a></li>
              <li><a href="#"><CreditCardIcon size={24} /><span>Find my Reservation</span></a></li>
            </ul>

            <div className="nav-mm-divider" />

            {/* Nav accordion */}
            <ul className="nav-mm-nav">
              {links.map((link) => {
                const expandable = !!link.menu?.length;
                const expanded = mobileExpanded === link.label;
                return (
                  <li key={link.label} className="nav-mm-nav-item">
                    {expandable ? (
                      <button
                        type="button"
                        className={`nav-mm-nav-row${expanded ? ' is-open' : ''}`}
                        aria-expanded={expanded}
                        onClick={() => setMobileExpanded(expanded ? null : link.label)}
                      >
                        <span>{link.label}</span>
                        <ChevronDown size={16} className={`nav-mm-chevron${expanded ? ' is-open' : ''}`} />
                      </button>
                    ) : (
                      <a className="nav-mm-nav-row" href={link.href}>
                        <span>{link.label}</span>
                      </a>
                    )}

                    {expandable && expanded && (
                      <div className="nav-mm-sub">
                        {link.menu!.map((item) => (
                          <a key={item.label} className="nav-mm-sub-item" href={item.href}>
                            {item.icon && <span className="nav-mm-sub-icon">{item.icon}</span>}
                            <span>{item.label}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
}
