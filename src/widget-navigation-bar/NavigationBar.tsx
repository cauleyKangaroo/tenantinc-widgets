import React, { useEffect, useMemo, useState } from 'react';
import './NavigationBar.css';
import storelocalLogo from './Storelocal_logo.png';
import {
  ChevronDown,
  ChevronRight,
  PhoneIcon,
  MessageAiIcon,
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
import { fetchPropertyContact, DEFAULT_PROPERTY_ID } from '@shared/propertyContact';
import { fetchLocationTree, DEFAULT_CITY_BASE_PATH, type NavState } from '@shared/propertyNav';
import { imageUrl } from '@shared/dudaCollections';
import { FindStorageMegaMenu, demoLocationTree } from './FindStorageMegaMenu';

// ---------------------------------------------------------------------------
// Types + defaults
// ---------------------------------------------------------------------------

/** A second-level (city) item; may nest a third-level list (facilities). */
interface NavSubItem {
  label: string;
  href: string;
  /** Optional third-level dropdown, e.g. a city's individual facilities. */
  children?: NavSubItem[];
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

/** Structural shape shared by every level of the mobile accordion tree
 *  (NavMenuItem and NavSubItem both satisfy it). */
type MobileMenuNode = { label: string; href: string; icon?: React.ReactNode; children?: MobileMenuNode[] };

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

// HARDCODED destinations for Find Storage › California › Irvine › 5281
// California. These are deliberately NOT props: Duda's link picker feeds the JS
// tab an editor URL (mariposa.responsivewebsitebuilder.io/home/site/<id>/…),
// which used to override the defaults and send visitors into the editor.
// forceHardcodedLinks() below re-applies these no matter where the nav data came
// from, so nothing Duda passes can win.
const IRVINE_URL = 'https://mariposa26-testing.multiscreensite.com/';
/** Canonical site home — where the logo (both bars and the drawer) must point. */
const HOME_URL = 'https://mariposa26-testing.multiscreensite.com/';

/**
 * Duda's link picker hands the JS tab an EDITOR url
 * (mariposa.responsivewebsitebuilder.io/home/site/<id>/home), which sent anyone
 * clicking the logo into the editor. Same trap `forceHardcodedLinks` exists for,
 * so the logo gets the same treatment: an editor url (or an unset '#') falls back
 * to the live home page, while a genuine custom link still wins.
 */
const EDITOR_URL_RE = /responsivewebsitebuilder\.io|\/home\/site\//i;

function resolveLogoLink(link?: string): string {
  if (!link || link === '#' || EDITOR_URL_RE.test(link)) return HOME_URL;
  return link;
}
const FACILITY_URL = 'https://mariposa26-testing.multiscreensite.com/property-landing-page';
/** The Duda dynamic property pages live under this path — see locationBasePath. */
const DEFAULT_LOCATION_BASE_PATH = '/storage-units';
/** Where the pinned "All Locations" row points. */
const ALL_LOCATIONS_URL = '#';
const IRVINE_LABEL = 'Irvine';
const FACILITY_LABEL = '5281 California';

/**
 * Force the two hardcoded hrefs onto any matching menu entry, at any depth.
 * Applied to the final link list so it also covers a full `links` override
 * coming from the Duda JS tab.
 */
function forceHardcodedLinks<T extends { label: string; href?: string; children?: T[]; menu?: T[] }>(items: T[]): T[] {
  return items.map((item) => {
    const href =
      item.label === FACILITY_LABEL ? FACILITY_URL
        : item.label === IRVINE_LABEL ? IRVINE_URL
          : item.href;
    return {
      ...item,
      href,
      ...(item.children ? { children: forceHardcodedLinks(item.children) } : null),
      ...(item.menu ? { menu: forceHardcodedLinks(item.menu) } : null),
    };
  });
}

/** The one link that opens the mega menu instead of the hover dropdown. */
const FIND_STORAGE_LABEL = 'Find Storage';

/**
 * Turn the collection-derived location tree into Find Storage's MOBILE accordion.
 *
 * Desktop no longer uses this — that link opens <FindStorageMegaMenu /> — but the
 * drawer still nests state › city › facility. State rows are not links (there are
 * no state pages, and a real href would 404); a city follows the same rule as the
 * mega menu via `city.href`. "All Locations" stays pinned to the top.
 *
 * A city holding SEVERAL facilities keeps its third level here rather than
 * linking to `/locations/<state>/<city>`: those city pages don't exist yet, and
 * the drawer would otherwise be the only route to a facility and lead nowhere.
 * Drop the `children` line once the city pages ship to make the two match.
 */
function locationTreeToMenu(tree: NavState[]): NavMenuItem[] {
  return [
    { label: 'All Locations', href: ALL_LOCATIONS_URL },
    ...tree.map((state) => ({
      label: state.label,
      href: '#',
      children: state.cities.map((city) => ({
        label: city.label,
        href: city.href,
        children: city.properties.length > 1
          ? city.properties.map((prop) => ({ label: prop.label, href: prop.href }))
          : undefined,
      })),
    })),
  ];
}

/** Build the default nav, injecting Irvine + its "5281 California" facility
 *  under Find Storage › California. */
function buildDefaultLinks(): NavLink[] {
  const findStorageMenu: NavMenuItem[] = FIND_STORAGE_MENU.map((state) =>
    state.label === 'California'
      ? {
          ...state,
          children: [
            ...(state.children ?? []),
            {
              label: IRVINE_LABEL,
              href: IRVINE_URL,
              children: [{ label: FACILITY_LABEL, href: FACILITY_URL }],
            },
          ],
        }
      : state,
  );
  return [
    { label: 'Find Storage', href: '#', hasDropdown: true, menu: findStorageMenu },
    { label: 'Storage Types', href: '#', hasDropdown: true, menu: STORAGE_TYPES_MENU },
    { label: 'Resources', href: '#', hasDropdown: true, menu: RESOURCES_MENU },
    { label: 'Size Guide', href: '#' },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface NavigationBarProps {
  /**
   * Content-menu IMAGE input (`logoImage`) — the way an editor sets the logo.
   * Typed `unknown` because Duda doesn't hand images over in one shape: it may be
   * a plain URL string or an object keyed `image` / `url` / `src`, so it goes
   * through `imageUrl()` rather than being trusted. Wins over `logoUrl`.
   */
  logoImage?: unknown;
  /** Override the bundled storelocal logo with a custom image URL (plain string). */
  logoUrl?: string;
  /**
   * Click destination for the logo (Duda link picker). An editor url or '#' is
   * ignored in favour of the live home page — see resolveLogoLink.
   */
  logoLink?: string;
  /* Irvine / 5281 California are hardcoded (see IRVINE_URL / FACILITY_URL).
     The former lagunaBeachUrl + bowlingDrUrl props were removed: Duda's link
     picker supplied editor URLs through them, which sent visitors into the
     website builder. Anything the JS tab still passes is simply ignored. */
  /** Property whose phone number is pulled from the `Properties` collection.
   *  The `phone` prop/default remains the fallback. */
  propertyId?: string;
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
  /* The smsPhone / smsPhoneHref props were removed with the "message" utility
     item. Anything the Duda JS tab still passes for them is simply ignored. */
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
  /**
   * Path the property pages live under, prefixed to each Find Storage link built
   * from a property's `slug`. Defaults to the live layout, `/storage-units`, so
   * a link reads "/storage-units/california/bellflower/…". Pass '' for links off
   * the site root. Leading/trailing slashes are normalised.
   */
  locationBasePath?: string;
  /**
   * Path the CITY pages live under. Default `/locations`, giving
   * "/locations/california/irvine" for a city holding more than one facility. A
   * city with exactly one facility always links straight to that facility.
   */
  cityBasePath?: string;
  /**
   * Which UI the Find Storage link opens.
   * - 'mega'     — full-viewport popup (search + states + cities + nearby). Default.
   * - 'dropdown' — the old three-level hover cascade (state › city › facility),
   *                the same one Storage Types and Resources use.
   * Duda editors toggle between the two from the content menu.
   */
  findStorageStyle?: 'mega' | 'dropdown';
}

export function NavigationBar({
  logoImage,
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
  liveChatLabel = 'Live Chat',
  liveChatUrl = '#',
  language = 'EN',
  payBillLabel = 'Pay Bill',
  payBillUrl = '#',
  accountLabel = 'My Account',
  accountUrl = '#',
  logoLink,
  links,
  propertyId = DEFAULT_PROPERTY_ID,
  locationBasePath = DEFAULT_LOCATION_BASE_PATH,
  cityBasePath = DEFAULT_CITY_BASE_PATH,
  findStorageStyle = 'mega',
}: NavigationBarProps) {
  // Normalise so an unknown value from Duda falls back to the popup rather than
  // a link that does nothing.
  const useMega = findStorageStyle !== 'dropdown';
  // Logo destination, with Duda's editor url filtered out (see resolveLogoLink).
  const homeLink = resolveLogoLink(logoLink);

  // Logo source: the content-menu image input first, then the plain-url prop, then
  // the bundled mark. `||` not `??` on purpose — Duda leaves an untouched field as
  // '', which `??` would happily pass to <img src=""> and render as broken.
  const logoSrc = imageUrl(logoImage) || (logoUrl ?? '').trim() || storelocalLogo;

  const [menuOpen, setMenuOpen] = useState(false);
  // Desktop "Find Storage" mega menu. Click-to-open: it holds three columns and a
  // scroll region, which a hover panel loses the moment the pointer clips a gap.
  const [megaOpen, setMegaOpen] = useState(false);
  // Desktop hover mega-menu: which top-level link is open, and which of its
  // rows is currently hovered (plus that row's vertical offset so the city
  // panel lines up with it).
  const [openLink, setOpenLink] = useState<string | null>(null);
  const [subIndex, setSubIndex] = useState<number | null>(null);
  const [subTop, setSubTop] = useState(0);
  // Mobile menu: which accordion rows are open, keyed by full path so nested
  // (state › city › facility) accordions each open independently.
  const [mobileOpen, setMobileOpen] = useState<Record<string, boolean>>({});
  const toggleMobile = (key: string) =>
    setMobileOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  // Phone from the Duda `Properties` collection when available; the prop/default
  // stays as the fallback (this bundle holds no API key — collection only).
  const [livePhone, setLivePhone] = useState<{ phone: string; digits: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPropertyContact('#02 nav', propertyId)
      .then((c) => {
        if (!cancelled && c?.phone) setLivePhone({ phone: c.phone, digits: c.phoneDigits });
      })
      .catch((err) => console.error('[NavigationBar] property contact error:', err));
    return () => { cancelled = true; };
  }, [propertyId]);

  // Find Storage, built from the `Properties` collection: state › city › facility,
  // grouped off each property's `slug`. Empty until it loads, and empty for good in
  // the Duda editor and the dev harness (no dmAPI) — both keep the hardcoded menu.
  const [locationTree, setLocationTree] = useState<NavState[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchLocationTree('#02 nav', { basePath: locationBasePath, cityBasePath })
      .then((tree) => { if (!cancelled) setLocationTree(tree); })
      .catch((err) => console.error('[NavigationBar] location tree error:', err));
    return () => { cancelled = true; };
  }, [locationBasePath, cityBasePath]);

  // What the mega menu renders. The Duda EDITOR and the dev harness have no
  // dmAPI, so the tree above stays empty there — the demo tree keeps the panel
  // populated while someone is working on the page instead of showing an editor
  // three empty columns.
  const megaTree = useMemo(
    () => (locationTree.length ? locationTree : demoLocationTree(locationBasePath, cityBasePath)),
    [locationTree, locationBasePath, cityBasePath],
  );

  // Public window-event hook so ANY element on the Duda page — a Text link, an
  // HTML/Embed widget, another button — can open, close, or toggle the Find
  // Storage mega menu without reaching into React state or the trigger DOM.
  //
  //   window.dispatchEvent(new Event('tenantinc:find-storage:open'))
  //   window.dispatchEvent(new Event('tenantinc:find-storage:close'))
  //   window.dispatchEvent(new Event('tenantinc:find-storage:toggle'))
  //
  // Wired in BOTH mega and dropdown modes: even when the in-bar Find Storage
  // link is the hover cascade, an external text/HTML element can still pop the
  // mega panel. The mega menu component is always mounted below for the same
  // reason.
  useEffect(() => {
    const open = () => setMegaOpen(true);
    const close = () => setMegaOpen(false);
    const toggle = () => setMegaOpen((o) => !o);
    window.addEventListener('tenantinc:find-storage:open', open);
    window.addEventListener('tenantinc:find-storage:close', close);
    window.addEventListener('tenantinc:find-storage:toggle', toggle);
    return () => {
      window.removeEventListener('tenantinc:find-storage:open', open);
      window.removeEventListener('tenantinc:find-storage:close', close);
      window.removeEventListener('tenantinc:find-storage:toggle', toggle);
    };
  }, []);

  const displayPhone = livePhone?.phone || phone;
  const telHref = phoneHref ?? `tel:${(livePhone?.digits || displayPhone).replace(/[^0-9+]/g, '')}`;
  // The SMS / "message" utility item was removed at the client's request — the
  // phone entry above is the only contact number in the bar now. (Live Chat is a
  // separate item, still controlled by `showChat`.)
  // Full override via `links`, else the default nav. The two hardcoded
  // destinations are re-applied so a Duda-supplied editor URL can't replace them.
  //
  // Deliberately NOT applied to the collection-built menu below: those hrefs come
  // from property slugs, not from Duda, so there is no editor URL to defend
  // against — and forceHardcodedLinks matches on LABEL, so a real city called
  // "Irvine" would have its link rewritten to the hardcoded testing URL. The live
  // data contains exactly that city.
  const baseLinks = forceHardcodedLinks(links ?? buildDefaultLinks());

  // Swap Find Storage's menu for the live one once the collection answers. An
  // explicit `links` override still wins — that's the caller taking full control.
  const linkList: NavLink[] =
    locationTree.length && !links
      ? baseLinks.map((l) =>
          l.label === 'Find Storage' ? { ...l, menu: locationTreeToMenu(locationTree) } : l,
        )
      : baseLinks;

  // Recursively render mobile sub-levels: a leaf is a link; a node with children
  // becomes a nested accordion toggle. Each deeper level indents 16px.
  const renderMobileChildren = (nodes: MobileMenuNode[], parentKey: string, depth: number): React.ReactNode =>
    nodes.map((node) => {
      const key = `${parentKey}/${node.label}`;
      const kids = node.children;
      const open = !!mobileOpen[key];
      const indent = depth > 0 ? { paddingLeft: 15 + depth * 16 } : undefined;
      if (!kids?.length) {
        return (
          <a key={key} className="nav-mm-sub-item" href={node.href} style={indent}>
            {node.icon && <span className="nav-mm-sub-icon">{node.icon}</span>}
            <span>{node.label}</span>
          </a>
        );
      }
      return (
        <React.Fragment key={key}>
          <button
            type="button"
            className={`nav-mm-sub-item nav-mm-sub-toggle${open ? ' is-open' : ''}`}
            style={indent}
            aria-expanded={open}
            onClick={() => toggleMobile(key)}
          >
            {node.icon && <span className="nav-mm-sub-icon">{node.icon}</span>}
            <span>{node.label}</span>
            <ChevronDown size={16} className={`nav-mm-chevron${open ? ' is-open' : ''}`} />
          </button>
          {open && renderMobileChildren(kids, key, depth + 1)}
        </React.Fragment>
      );
    });

  const closeMenus = () => {
    setOpenLink(null);
    setSubIndex(null);
  };

  // Desktop nav links. "Find Storage" opens the mega menu; the others keep the
  // two-level hover dropdown.
  //
  // REVERTING TO THE OLD FIND STORAGE MENU: the hover cascade below is untouched
  // and still drives Storage Types / Resources. Delete the `isFindStorage`
  // branches here (trigger + `hasMenu`), drop <FindStorageMegaMenu /> from the
  // markup at the bottom, and Find Storage falls straight back into the same
  // state › city › facility cascade it used before.
  const navLinks = (
    <ul className="nav-links">
      {linkList.map((link) => {
        // Only claim Find Storage for the mega popup when the editor has actually
        // opted into it — otherwise Find Storage falls into the same hover cascade
        // Storage Types / Resources use, driven by `link.menu`.
        const isFindStorage = useMega && link.label === FIND_STORAGE_LABEL;
        const hasMenu = !!link.menu?.length && !isFindStorage;
        const isOpen = hasMenu && openLink === link.label;
        const activeItem = isOpen && subIndex != null ? link.menu![subIndex] : undefined;
        return (
          <li
            key={link.label}
            className="nav-item"
            onMouseEnter={() => {
              if (!hasMenu) return;
              // A hover dropdown and the mega menu must not overlap on screen.
              setMegaOpen(false);
              setOpenLink(link.label);
            }}
            onMouseLeave={closeMenus}
          >
            {isFindStorage ? (
              <button
                type="button"
                className="nav-link nav-link-trigger"
                data-nav-mega-trigger
                aria-expanded={megaOpen}
                onClick={() => {
                  // Opening the panel closes any hover dropdown, so the two can
                  // never be on screen at once.
                  closeMenus();
                  setMegaOpen((o) => !o);
                }}
              >
                <span>{link.label}</span>
                {link.hasDropdown && (
                  <ChevronDown size={20} className={`nav-link-chevron${megaOpen ? ' is-open' : ''}`} />
                )}
              </button>
            ) : (
              <a className="nav-link" href={link.href}>
                <span>{link.label}</span>
                {link.hasDropdown && <ChevronDown size={20} className="nav-link-chevron" />}
              </a>
            )}

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
                        <a href={sub.href}>
                          <span>{sub.label}</span>
                          {sub.children?.length ? <ChevronRight size={16} className="nav-sub-arrow" /> : null}
                        </a>
                        {/* Third level (e.g. a city's facilities) — CSS hover flyout. */}
                        {sub.children?.length ? (
                          <ul className="nav-subsubpanel">
                            {sub.children.map((leaf) => (
                              <li key={leaf.label} className="nav-sub-item">
                                <a href={leaf.href}><span>{leaf.label}</span></a>
                              </li>
                            ))}
                          </ul>
                        ) : null}
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
          <span>{displayPhone}</span>
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
          <span>{displayPhone}</span>
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
            <a className="nav-logo-inline" href={homeLink} aria-label="Home">
              <img className="nav-logo-img" src={logoSrc} alt="storelocal storage" />
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

      {/* Find Storage mega menu — always mounted so an external element (a
          Duda Text link, an HTML/Embed widget) can pop it via the
          `tenantinc:find-storage:*` window events even when the in-bar Find
          Storage link is the hover cascade ('dropdown' mode). */}
      <FindStorageMegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} tree={megaTree} />

      {/* Raised logo tile — absolutely positioned so it spans both bars and
          protrudes below. Space is reserved via padding-left on the bar inners
          so it never overlaps the nav content. Only in 'banner' mode. */}
      {logoMode === 'banner' && (
        <a className="nav-logo" href={homeLink} style={{ background: logoBg }} aria-label="Home">
          <img className="nav-logo-img" src={logoSrc} alt="storelocal storage" />
        </a>
      )}

      {/* Mobile slide-out menu (hamburger). Always mounted so it animates both
          in and out; `is-open` drives the slide + overlay fade. */}
      <div className={`nav-mobile-menu${menuOpen ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-hidden={!menuOpen}>
        <div className="nav-mm-overlay" onClick={() => setMenuOpen(false)} />
        <div className="nav-mm-panel">
          <div className="nav-mm-header">
            <a className="nav-mm-logo" href={homeLink} aria-label="Home">
              <img className="nav-mm-logo-img" src={logoSrc} alt="storelocal storage" />
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

            {/* Account / utility links — inset on the wrapping div, see below */}
            <div className="nav-mm-account-inset">
              <ul className="nav-mm-account">
                <li><a href="#"><LoginIcon size={24} /><span>Login</span></a></li>
                <li><a href={accountUrl}><UserCircleIcon size={24} /><span>{accountLabel}</span></a></li>
                <li><a href={liveChatUrl}><MessageAiIcon size={24} /><span>{liveChatLabel}</span></a></li>
                <li><a href="#"><KeyIcon size={24} /><span>Get Gatecode</span></a></li>
                <li><a href="#"><CreditCardIcon size={24} /><span>Find my Reservation</span></a></li>
              </ul>
            </div>

            <div className="nav-mm-divider" />

            {/* Nav accordion — recurses into nested state › city › facility levels.
                The inset lives on the wrapping div, not the <ul>: Duda's global
                stylesheet resets list padding from an id-scoped selector, which
                outranks any single class of ours, so a padded <ul> collapsed flush
                to the drawer's left edge on a live site. */}
            <div className="nav-mm-nav-inset">
            <ul className="nav-mm-nav">
              {linkList.map((link) => {
                const expandable = !!link.menu?.length;
                const open = !!mobileOpen[link.label];
                return (
                  <li key={link.label} className="nav-mm-nav-item">
                    {expandable ? (
                      <button
                        type="button"
                        className={`nav-mm-nav-row${open ? ' is-open' : ''}`}
                        aria-expanded={open}
                        onClick={() => toggleMobile(link.label)}
                      >
                        <span>{link.label}</span>
                        <ChevronDown size={16} className={`nav-mm-chevron${open ? ' is-open' : ''}`} />
                      </button>
                    ) : (
                      <a className="nav-mm-nav-row" href={link.href}>
                        <span>{link.label}</span>
                      </a>
                    )}

                    {expandable && open && (
                      <div className="nav-mm-sub">
                        {renderMobileChildren(link.menu!, link.label, 0)}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
