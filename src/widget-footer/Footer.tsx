import React, { useEffect, useMemo, useState } from 'react';
import './Footer.css';
import tenantLogo from './tenant-logo.svg';
import { SOCIALS, PhoneIcon, AiSparkleIcon, ChevronBigRightIcon } from './icons';
import { fetchPropertyContact, DEFAULT_PROPERTY_ID, type PropertyContact } from '@shared/propertyContact';
import { readSitePages, pageColumnFor, type SitePage } from '@shared/sitePages';
import { openFindStorage } from '@shared/findStorageBus';
import { hasCollectionsApi } from '@shared/dudaCollections';
import { fetchAllLocations, normalizeBasePath, type FooterLocation } from './allLocations';

// ---------------------------------------------------------------------------
// Types + fallback data
// ---------------------------------------------------------------------------

interface FooterLink {
  label: string;
  href: string;
  /** Opens in a new tab — see SITEMAP_LINK for the only case that sets it. */
  external?: boolean;
}

interface LinkColumn {
  heading: string;
  links: FooterLink[];
}

/**
 * FALLBACK content for the two route-driven columns (Figma 11592:217875) — the
 * LABELS only; every href is derived from the column's own route by
 * `fallbackColumn()` below.
 *
 * These are what renders in the Duda editor and the dev harness, where there is
 * no dmAPI to read the site's page tree from, and on a site that has not built
 * those routes yet. On a published page they are replaced wholesale by the pages
 * under `companyRoute` / `storageTypesRoute`.
 *
 * Sitemap is NOT in the company list: it is appended by `SITEMAP_LINK` below so
 * that it lands last in the route-driven case too.
 */
const COMPANY_FALLBACK_LABELS = [
  'Why Choose Storage Outlet',
  'Supplies',
  'What is Storage Outlet',
  'What does Storage Outlet do',
  'Tenant Protection Plan',
  'SMS Terms',
  'Online Privacy Opt-Out',
  'Accessibility',
  'Privacy Policy and Terms of Use',
];

const STORAGE_TYPES_FALLBACK_LABELS = [
  'Climate Controlled Storage',
  'Car, RV Boat Storage',
  'Business Storage',
  'Drive up Storage',
  'Wine Storage',
];

/**
 * `<route>/<slugified label>` — what a Duda page under that route is actually
 * called, so the fallback list is a set of live links rather than nine `#`s that
 * silently do nothing on a deployed site.
 *
 * It is a GUESS, and only ever visible where the page tree could not be read
 * (the Duda editor, the harness, a route that has not been built). The labels
 * themselves are the frame's placeholders — equally a guess — so a derived path
 * is no less accurate than the text above it, and on a site whose page names
 * match the design it resolves correctly. Once the tree IS readable, every href
 * here is replaced by Duda's own `path`.
 */
const slugify = (v: string): string =>
  v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function routeHref(route: string, label: string): string {
  // The route prop is matched loosely, so it may well arrive as a TITLE
  // ("Company Information"). Slugify it segment by segment — `/Company
  // Information/supplies` is not a path any site serves.
  const base = normalizeBasePath(
    String(route ?? '').split('/').map(slugify).filter(Boolean).join('/'),
  );
  const slug = slugify(label);
  if (!base || !slug) return '#';
  return `${base}/${slug}`;
}

function fallbackColumn(heading: string, route: string, labels: string[]): LinkColumn {
  return { heading, links: labels.map((label) => ({ label, href: routeHref(route, label) })) };
}

/**
 * The last row of the Company Information column, always.
 *
 * `/sitemap.xml` can never come out of the page tree — it is a file Duda
 * generates, not a page an editor created — so it is appended rather than
 * expected from the route.
 *
 * `external: true` (→ `target="_blank"`) is what makes the actual sitemap open.
 * A Duda site can register a client-side routing callback, and an in-page
 * navigation to a path that is not a page is exactly the case that ends at the
 * site's 404 instead of at the XML; a new tab hands the URL to the browser and
 * bypasses the router entirely. It is also the friendlier behaviour for a raw
 * XML file — the visitor keeps the page they were on.
 */
const SITEMAP_LINK: FooterLink = { label: 'Sitemap', href: '/sitemap.xml', external: true };

const DEFAULT_PROPERTY_BASE_PATH = '/storage-units';

/**
 * Demo entries for the "All Storage Locations" panel — the frame's own sample
 * data, verbatim.
 *
 * Gated on `hasCollectionsApi()` being FALSE, i.e. the Duda editor and the dev
 * harness, exactly as the mega menu's demo location tree is. Never on an empty
 * result: on a published page with no `PropertiesInternal` collection the panel
 * and its toggle simply do not render, because twenty invented addresses on a
 * live site are far worse than a missing section.
 */
const DEMO_LOCATIONS: FooterLocation[] = [
  ['San Diego', 'CA', '4567 Mission Blvd', '92109'],
  ['Los Angeles', 'CA', '1234 Sunset Blvd', '90026'],
  ['San Francisco', 'CA', '789 Market St', '94103'],
  ['Sacramento', 'CA', '321 Capitol Mall', '95814'],
  ['Fresno', 'CA', '6544 N Blackstone Ave', '93710'],
  ['Irvine', 'CA', '7890 Barranca Pkwy', '92618'],
  ['Burbank', 'CA', '4321 Magnolia Blvd', '91505'],
  ['Oakland', 'CA', '5678 Broadway', '94611'],
  ['Santa Clara', 'CA', '8765 El Camino Real', '95051'],
  ['Bakersfield', 'CA', '3456 Stockdale Hwy', '93309'],
  ['Long Beach', 'CA', '3456 E 7th St', '90804'],
].map(([city, state, street, zip], i) => ({
  id: `demo-${i}`,
  label: `Self Storage In ${city}, ${state}`,
  street,
  cityStateZip: `${city}, ${state} ${zip}`,
  // A plausible slug so the editor sees real links rather than plain text, with
  // the base path prefixed by the caller below. Demo only — a published page
  // reads the collection and never builds one.
  href: `california/${city.toLowerCase().replace(/\s+/g, '-')}/self-storage-${city.toLowerCase().replace(/\s+/g, '-')}`,
}));

/**
 * Duda content-menu fields are TEXT inputs, so a toggle arrives as the STRING
 * `'false'` — which is truthy, and would switch a feature on for every operator
 * who explicitly turned it off. Same coercion #07's props do.
 */
function boolProp(v: unknown): boolean {
  if (typeof v === 'string') return !/^(|false|0|no|off)$/i.test(v.trim());
  return Boolean(v);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface FooterProps {
  companyName?: string;
  phone?: string;
  description?: string;
  sessionId?: string;
  year?: number;
  /** Property whose phone + social links come from the `Properties` collection.
   *  The static values below remain the fallback. */
  propertyId?: string;
  /**
   * Route in the SITE's own page structure whose child pages fill the **Company
   * Information** column, in the order the editor arranged them.
   *
   * Matched loosely (`@shared/sitePages`) against each page's alias, path and
   * title, so `company-information`, `/company-information/` and
   * `Company Information` all name the same branch. `''` keeps the fallback list.
   */
  companyRoute?: string;
  /** Heading for that column. Default: the route page's own title. */
  companyHeading?: string;
  /** Same, for the **Storage Types** column. */
  storageTypesRoute?: string;
  storageTypesHeading?: string;
  /**
   * Mirror the NAV exactly, dropping pages hidden from it. **Off by default —
   * hidden pages ARE listed**, because a footer column is where the pages kept
   * out of the top nav belong. See `@shared/sitePages`.
   */
  skipHiddenPages?: boolean | string;
  /** Prefix for the "All Storage Locations" links. Default `/storage-units`. */
  propertyBasePath?: string;
  /**
   * The Connect column's two destinations. Pages, not routes — they hold one
   * link each, so there is nothing to enumerate — but props rather than
   * constants so a site can retarget them without a rebuild of the bundle.
   */
  loginHref?: string;
  contactHref?: string;
}

export function Footer({
  companyName = 'Storage Outlet',
  phone = '(800) 645-9876',
  description = 'Storage Outlet, headquartered in Irvine, owns and operates 15 self storage properties across Southern California. Our locations offer a wide range of secure and conveniently located storage solutions, including personal storage, business storage, and vehicle storage options. We are committed to providing affordable, reliable, and professional storage experiences in every community we serve. With a focus on convenience, security, and customer service, Storage Outlet continues to grow as a trusted neighborhood storage provider.',
  sessionId = '24e6fb82-a285-4a73-b4dc-546500c76981',
  year = 2026,
  propertyId = DEFAULT_PROPERTY_ID,
  companyRoute = 'company-information',
  companyHeading,
  storageTypesRoute = 'storage-types',
  storageTypesHeading,
  skipHiddenPages,
  propertyBasePath = DEFAULT_PROPERTY_BASE_PATH,
  loginHref = '/login',
  contactHref = '/contact-us',
}: FooterProps) {
  // Phone + social links from the Duda `Properties` collection; the static values
  // above remain the fallback (this bundle holds no API key of its own).
  const [contact, setContact] = useState<PropertyContact | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPropertyContact('#13 footer', propertyId)
      .then((c) => { if (!cancelled) setContact(c); })
      .catch((err) => console.error('[Footer] property contact error:', err));
    return () => { cancelled = true; };
  }, [propertyId]);

  // ── The two route-driven columns ──────────────────────────────────────────
  // ONE read of the page tree feeds both. Two effects would each call
  // getNavItemsAsync for the same answer.
  const [pages, setPages] = useState<SitePage[] | null>(null);
  const skipHidden = boolProp(skipHiddenPages);

  useEffect(() => {
    let cancelled = false;
    readSitePages('#13 footer')
      .then((p) => { if (!cancelled) setPages(p); })
      .catch((err) => console.error('[Footer] site pages error:', err));
    return () => { cancelled = true; };
  }, []);

  /**
   * Route column, or the hardcoded fallback. `null` pages (not read yet) and an
   * unmatched route both land on the fallback — deliberately not a skeleton: the
   * footer is at the bottom of the page, and a real list that may be replaced
   * reads better than a shimmer nobody scrolls to.
   */
  const column = (
    route: string,
    heading: string | undefined,
    fallbackHeading: string,
    fallbackLabels: string[],
  ): LinkColumn => {
    const col = route && pages ? pageColumnFor(pages, route, { skipHidden }) : null;
    if (col) return { heading: heading || col.heading, links: col.links };
    return fallbackColumn(heading || fallbackHeading, route, fallbackLabels);
  };

  const companyColumn = useMemo(() => {
    const col = column(companyRoute, companyHeading, 'Company Information', COMPANY_FALLBACK_LABELS);
    // Sitemap last, in both the route-driven and the fallback case.
    return { ...col, links: [...col.links, SITEMAP_LINK] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, skipHidden, companyRoute, companyHeading]);

  const storageTypesColumn = useMemo(
    () => column(storageTypesRoute, storageTypesHeading, 'Storage Types', STORAGE_TYPES_FALLBACK_LABELS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pages, skipHidden, storageTypesRoute, storageTypesHeading],
  );

  /** Two account actions, not pages under any route — so never tree-driven. */
  const connectColumn = useMemo<LinkColumn>(() => ({
    heading: 'Connect',
    links: [
      { label: 'Login', href: loginHref },
      { label: 'Contact us', href: contactHref },
    ],
  }), [loginHref, contactHref]);

  // The tree WAS readable but a route is not in it — a typo in the field, or the
  // pages have not been created yet. Worth saying, because the fallback column
  // looks exactly like a working one.
  useEffect(() => {
    if (!pages?.length) return;
    for (const route of [companyRoute, storageTypesRoute]) {
      if (route && !pageColumnFor(pages, route, { skipHidden })) {
        // eslint-disable-next-line no-console
        console.warn(`[Footer] no page matching "${route}" in the site's page tree — keeping the built-in column`);
      }
    }
  }, [pages, companyRoute, storageTypesRoute, skipHidden]);

  // ── "All Storage Locations" ───────────────────────────────────────────────
  const propertyBase = useMemo(() => normalizeBasePath(propertyBasePath), [propertyBasePath]);
  const [locations, setLocations] = useState<FooterLocation[] | null>(null);
  const [locationsOpen, setLocationsOpen] = useState(false);

  useEffect(() => {
    // No dmAPI at all ⇒ the editor or the harness, so show the frame's demo
    // entries. Gated on the API being ABSENT and never on an empty result — see
    // DEMO_LOCATIONS.
    if (!hasCollectionsApi()) {
      // Prefixed here rather than in the constant so the editor preview honours
      // whatever `propertyBasePath` the operator configured.
      setLocations(DEMO_LOCATIONS.map((l) => ({ ...l, href: `${propertyBase}/${l.href}` })));
      return undefined;
    }
    let cancelled = false;
    fetchAllLocations(propertyBase)
      .then((l) => { if (!cancelled) setLocations(l); })
      .catch((err) => console.error('[Footer] all locations error:', err));
    return () => { cancelled = true; };
  }, [propertyBase]);

  // The toggle is not rendered when there is nothing behind it, rather than
  // opening an empty panel.
  const hasLocations = !!locations?.length;

  const onFindStorage = (): void => {
    // #02 acknowledges by calling preventDefault. Nothing to fall back to on a
    // page with no nav — the mega menu IS the destination — so say so instead of
    // leaving the visitor clicking a control that never responds.
    if (!openFindStorage()) {
      // eslint-disable-next-line no-console
      console.warn('[Footer] Find Storage: no navigation bar (#02) on this page answered the open request');
    }
  };

  const displayPhone = contact?.phone || phone;
  // "Follow <name>" takes the property name from the collection; the copyright
  // line below deliberately keeps the `companyName` prop (see note there).
  const displayFollowName = contact?.name || companyName;
  const telHref = `tel:${(contact?.phoneDigits || displayPhone).replace(/[^0-9+]/g, '')}`;

  // With live data, show only the platforms this property actually has, linked.
  // Without it, keep the full static row (unlinked) exactly as before.
  const socialLinks = contact?.socials.length
    ? SOCIALS
        .filter((s) => contact.socials.some((c) => c.platform === s.key))
        .map((s) => ({ ...s, href: contact.socials.find((c) => c.platform === s.key)!.url }))
    : SOCIALS.map((s) => ({ ...s, href: '#' }));

  return (
    <div className="ft-wrapper">
      <div className="ft-inner ft-top">
        <div className="ft-links">
          <LinkColumnView column={companyColumn} />
          <LinkColumnView column={storageTypesColumn} />

          {/* Locations — the one column whose rows are controls, not pages. */}
          <nav className="ft-col" aria-label="Locations">
            <p className="ft-col-heading">Locations</p>
            <ul className="ft-list">
              <li>
                <button className="ft-link ft-link-btn" type="button" onClick={onFindStorage}>
                  Find Storage
                </button>
              </li>
              {hasLocations && (
                <li>
                  <button
                    className="ft-link ft-link-btn ft-link-toggle"
                    type="button"
                    aria-expanded={locationsOpen}
                    aria-controls="ft-all-locations"
                    onClick={() => setLocationsOpen((v) => !v)}
                  >
                    <span>All Locations</span>
                    <span className={`ft-chevron${locationsOpen ? ' ft-chevron--open' : ''}`}>
                      <ChevronBigRightIcon size={24} />
                    </span>
                  </button>
                </li>
              )}
            </ul>
          </nav>

          <LinkColumnView column={connectColumn} />
        </div>

        <div className="ft-aside">
          <div className="ft-help">
            <p className="ft-help-heading">Need Help?</p>
            <a className="ft-help-row" href={telHref}>
              <PhoneIcon size={24} />
              <span>{displayPhone}</span>
            </a>
            <button className="ft-help-row ft-help-chat" type="button">
              <AiSparkleIcon size={24} />
              <span>Live Chat</span>
            </button>
          </div>
          <p className="ft-desc">{description}</p>
        </div>
      </div>

      <div className="ft-divider" />

      {/* Kept in the DOM while collapsed (hidden), so the toggle's
          aria-controls always points at something that exists. */}
      {hasLocations && (
        <section className="ft-locations" id="ft-all-locations" hidden={!locationsOpen}>
          <div className="ft-inner">
            <p className="ft-locations-heading">All Storage Locations</p>
            <div className="ft-locations-grid">
              {locations!.map((loc) => (
                <LocationEntry key={loc.id} location={loc} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="ft-inner ft-follow">
        <div className="ft-follow-left">
          <span className="ft-follow-label">Follow {displayFollowName}</span>
          <div className="ft-socials">
            {socialLinks.map(({ key, label, Icon, href }) => (
              <a key={key} className="ft-social" href={href} aria-label={label} title={label}>
                <Icon />
              </a>
            ))}
          </div>
        </div>
        <div className="ft-powered">
          <span className="ft-powered-label">powered by</span>
          <img className="ft-tenant" src={tenantLogo} alt="Tenant" />
        </div>
      </div>

      <div className="ft-bottom">
        <div className="ft-inner ft-bottom-row">
          {/* Left on the prop on purpose: the collection's `name` is the FACILITY
              ("Storelocal Dove Mountain"), and a copyright line should name the
              company. Swap to displayFollowName if that's wanted. */}
          <span className="ft-copy">© {year}, {companyName}. All Rights Reserved.</span>
          <span className="ft-session">Session: {sessionId}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function LinkColumnView({ column }: { column: LinkColumn }): React.ReactElement {
  return (
    <nav className="ft-col" aria-label={column.heading}>
      <p className="ft-col-heading">{column.heading}</p>
      <ul className="ft-list">
        {column.links.map((link) => (
          <li key={link.label}>
            <a
              className="ft-link"
              href={link.href}
              {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * One three-line entry. The WHOLE block is the link (the frame underlines all
 * three lines), and a facility with no slug renders the same block without an
 * `<a>` rather than a dead link — the address is still worth reading.
 */
function LocationEntry({ location }: { location: FooterLocation }): React.ReactElement {
  const body = (
    <>
      <span className="ft-loc-title">{location.label}</span>
      {location.street && <span className="ft-loc-line">{location.street}</span>}
      <span className="ft-loc-line">{location.cityStateZip}</span>
    </>
  );
  return location.href
    ? <a className="ft-loc" href={location.href}>{body}</a>
    : <div className="ft-loc ft-loc--plain">{body}</div>;
}
