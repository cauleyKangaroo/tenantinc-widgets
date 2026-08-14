// ===========================================================================
// "Find Storage" MEGA MENU (#02 nav bar)
// Figma: node 10557-106986 (panel + nearby facilities) and node 10692-83507
// ("Mega Menu Overflow" — the see-all-cities page and the designer's overflow
// notes, which this file follows for anything the two frames disagree on).
//
// Replaces the old three-level hover cascade (states → cities → facilities,
// each a small white panel). That cascade is still in NavigationBar.tsx and still
// drives Storage Types / Resources — see the revert note there.
//
// A POPUP, NOT A DROPDOWN. The panel is `position: fixed`, filling the viewport
// from the bottom edge of the bar down, with page scrolling locked while it is
// open. The Figma frames show the whole area under the nav going dark, and a
// document-flow panel would slide away under a scroll — the offset it is pinned
// to comes from measuring the bar, so it has to stay put.
//
// PAGE 1 — four columns inside the 1322px card (search 440 | states 294 |
// cities 294 + 294):
//
//   SEARCH LOCATION      | SELECT STATE (50) | CALIFORNIA      SEE ALL CITIES
//   ─────────────────────|  one column,      |  two columns, alphabetical DOWN
//   Nearby facilities    |  scrolls          |  column 1 then into column 2
//
// PAGE 2 — "See all cities": the card is replaced by that state's whole city
// list in FOUR columns under a "‹ CALIFORNIA ( 110 )" header that stays put while
// the list scrolls beneath it. Clicking that header goes back to page 1.
//
// SEE ALL CITIES appears only when the two-column list actually overflows —
// measured, not guessed from a row count, exactly as the designer's "Data
// Overflow" note describes ("once a column exceeds X rows and begins to scroll,
// the link appears"). The panel height follows the viewport, so a row count would
// be wrong on half the screens it runs on.
//
// WHERE A CITY GOES. One facility in the city → straight to that facility's
// page; two or more → the city page `/locations/<state>/<city>`. The rule lives
// in @shared/propertyNav (`NavCity.href`) so the mobile drawer resolves it the
// same way. Those city pages do not exist yet — the links are right, they just
// 404 until the pages are built.
//
// THE SEARCH FIELD filters the state and city columns as it is typed — against
// the city name, each facility's name, and its full address line (street, city,
// state, ZIP), so "93535", "4th Street" and "Lancaster" all land on the same
// place. Nothing is submitted anywhere: there is no search results page on the
// site yet, so the orange button is a no-op and the filtering is what the field
// does. Type/Size are presentation only for the same reason.
//
// WHAT IS NOT WIRED. The Figma's per-facility star rating is left out:
// `GoogleReviews` holds ONE site-wide business score, not a score per property,
// so showing it on each row would be a made-up number.
// ===========================================================================

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './FindStorageMegaMenu.css';
import { ChevronLeft, CloseIcon, MapPinIcon, PhoneIcon, SearchIcon } from './icons';
import { FormField, Button } from '@shared/ui';
import { getUserLocation, haversineMiles } from '@shared/nearbyProperties';
import { buildLocationTree, type NavState, type NavProperty } from '@shared/propertyNav';

/** Facilities listed under "Nearby Storage Facilities" (the Figma shows three). */
const NEARBY_COUNT = 3;

export interface FindStorageMegaMenuProps {
  open: boolean;
  onClose: () => void;
  /** state › city › facility, from the `Properties` collection. */
  tree: NavState[];
  /**
   * Selector for the element that toggles this menu. A mousedown inside it must
   * NOT count as "outside" — otherwise the document listener closes the panel a
   * moment before the trigger's own click reopens it, and the menu never opens.
   */
  triggerSelector?: string;
}

interface NearbyItem {
  property: NavProperty;
  /** null when the browser gave us no position — the row then shows no distance. */
  miles: number | null;
}

// The two selects are placeholders until the search page exists; the values
// mirror what the site sells so the control isn't obviously fake.
const TYPE_OPTIONS = ['Storage', 'Vehicle & RV', 'Business'];
const SIZE_OPTIONS = ['All Sizes', 'Small (5x5 - 5x10)', 'Medium (10x10 - 10x15)', 'Large (10x20+)'];

/**
 * "1.7 mi", as the Figma writes it. NOT @shared/nearbyProperties' formatDistance:
 * that one truncates to whole miles ("1 Miles") for the space-list cards, which
 * would collapse every facility in town to "0 Miles" in a list this short.
 */
function milesLabel(miles: number): string {
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles).toLocaleString('en-US')} mi`;
}

/**
 * Does this city match the typed keyword?
 *
 * Four things are matched, so "Lancaster", "4th Street", "93535" and a facility's
 * own name all find the same place:
 *
 *   city label      — from the SLUG, i.e. what the visitor is reading on screen
 *   Address.city    — the raw value too, because the two disagree in the live
 *                     data ("LancasTER"; Gardena's slug says Irvine)
 *   facility name   — "Storelocal Delano"
 *   address line    — street + city + state + ZIP
 *
 * ZIP is also compared on its own as a PREFIX of the digits: partial ZIPs narrow
 * down as they are typed, and a stored ZIP+4 ("93215-1234") still answers to the
 * five digits people actually type. Everything else is a case-insensitive
 * substring — a visitor half way through a street name should already see it.
 */
function cityMatches(city: NavState['cities'][number], q: string): boolean {
  if (city.label.toLowerCase().includes(q)) return true;
  const digits = q.replace(/\D/g, '');
  return city.properties.some(
    (p) =>
      p.label.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      (!!digits && p.zip.replace(/\D/g, '').startsWith(digits)),
  );
}

export function FindStorageMegaMenu({
  open,
  onClose,
  tree,
  triggerSelector = '[data-nav-mega-trigger]',
}: FindStorageMegaMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cityListRef = useRef<HTMLDivElement | null>(null);

  // Which state's cities are showing, and whether the panel has been swapped for
  // that state's full city grid ("See all cities").
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [showAllCities, setShowAllCities] = useState(false);
  const [cityOverflow, setCityOverflow] = useState(false);

  // Search form. The keyword filters the state and city columns as it is typed;
  // Type/Size are not wired to anything (see the header note).
  const [query, setQuery] = useState('');
  const [type, setType] = useState(TYPE_OPTIONS[0]);
  const [size, setSize] = useState(SIZE_OPTIONS[0]);

  // ── Keyword filter ───────────────────────────────────────────────────────
  const q = query.trim().toLowerCase();

  const filteredTree = useMemo(() => {
    if (!q) return tree;
    return tree
      .map((state) => {
        // A state matched by name keeps ALL of its cities — someone typing
        // "california" wants the state, not the two cities with "cal" in them.
        const stateHit = state.label.toLowerCase().includes(q);
        const cities = stateHit
          ? state.cities
          : state.cities.filter((city) => cityMatches(city, q));
        return { ...state, cities };
      })
      .filter((state) => state.cities.length > 0);
  }, [tree, q]);

  const activeState = useMemo(
    () => filteredTree.find((s) => s.key === activeKey) ?? null,
    [filteredTree, activeKey],
  );

  // Keep the selection honest against the filter. While searching, land on the
  // first state that has a hit so the matching cities are visible without a
  // second click; with no query, stay on "nothing picked yet" as the Figma does.
  useEffect(() => {
    if (activeKey && filteredTree.some((s) => s.key === activeKey)) return;
    setActiveKey(q && filteredTree.length ? filteredTree[0].key : null);
  }, [q, filteredTree, activeKey]);

  // ── Nearby facilities ────────────────────────────────────────────────────
  const allProperties = useMemo(
    () => tree.flatMap((s) => s.cities.flatMap((c) => c.properties)),
    [tree],
  );

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Ask for a position only once, and only after the visitor has opened the menu.
  // Asking on page load would put a permission prompt in front of every visitor
  // for a panel most of them never open.
  const askedRef = useRef(false);

  useEffect(() => {
    if (!open || askedRef.current) return;
    askedRef.current = true;
    getUserLocation()
      .then(setCoords)
      .catch(() => { /* denied / unavailable — the list falls back below */ });
  }, [open]);

  const nearby: NearbyItem[] = useMemo(() => {
    const withCoords = coords
      ? allProperties
          .filter((p) => p.lat != null && p.lng != null)
          .map((p) => ({ property: p, miles: haversineMiles(coords, { lat: p.lat!, lng: p.lng! }) }))
          .sort((a, b) => a.miles - b.miles)
      : [];
    // No position, or no property carries coordinates: list the first few
    // WITHOUT distances rather than rendering an empty column.
    const items = withCoords.length ? withCoords : allProperties.map((p) => ({ property: p, miles: null }));
    return items.slice(0, NEARBY_COUNT);
  }, [coords, allProperties]);

  // ── Open / close plumbing ────────────────────────────────────────────────
  // Reset to the "nothing picked yet" frame each time the menu is dismissed, so
  // reopening it doesn't drop the visitor back into a state they left behind.
  useEffect(() => {
    if (!open) {
      setActiveKey(null);
      setShowAllCities(false);
    }
  }, [open]);

  // Where the popup starts: the bottom edge of the nav bar, measured rather than
  // assumed. The bar's height changes with the `height` / `showTopBar` props and
  // with the breakpoint, and on a Duda page it can sit below other sections.
  const [topOffset, setTopOffset] = useState(0);

  const measureTop = useCallback(() => {
    const bar = rootRef.current?.closest('.nav-bar');
    if (bar) setTopOffset(Math.max(0, bar.getBoundingClientRect().bottom));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measureTop();
    window.addEventListener('resize', measureTop);
    return () => window.removeEventListener('resize', measureTop);
  }, [open, measureTop]);

  // Page scroll is locked while the popup is up. It covers everything under the
  // bar, so there is nothing to scroll to — and scrolling would move the bar out
  // from under the offset the panel is pinned to.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (triggerSelector && target.closest(triggerSelector)) return;
      onClose();
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, onClose, triggerSelector]);

  // ── "See all cities" ─────────────────────────────────────────────────────
  // Measured rather than derived from a row count: the column's height depends on
  // the viewport, so 20 cities may overflow on a laptop and fit on a large screen.
  useLayoutEffect(() => {
    const el = cityListRef.current;
    if (!el || !open || showAllCities) {
      setCityOverflow(false);
      return;
    }
    const check = () => setCityOverflow(el.scrollHeight - el.clientHeight > 1);
    check();

    window.addEventListener('resize', check);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(check);
      // BOTH boxes: the container's height barely moves (it sits at its
      // max-height), so on its own it would never report the thing that actually
      // changes — the balanced height of the columns inside it, which shifts when
      // the state changes and again when the web font finally swaps in.
      ro.observe(el);
      if (el.firstElementChild) ro.observe(el.firstElementChild);
    }
    return () => {
      window.removeEventListener('resize', check);
      ro?.disconnect();
    };
  }, [open, showAllCities, activeKey, tree]);

  const heading = (label: string, count: number) => (
    <h3 className="nav-mega-heading">
      <span>{label}</span>
      <span className="nav-mega-heading-count">( {count} )</span>
    </h3>
  );

  const cityLink = (city: NavState['cities'][number]) => (
    <a key={city.key} className="nav-mega-city" href={city.href}>
      <span className="nav-mega-city-name">{city.label}</span>
      {/* A "1" bubble tells the visitor nothing — only counts worth comparing. */}
      {city.properties.length > 1 && (
        <span className="nav-mega-bubble">{city.properties.length}</span>
      )}
    </a>
  );

  return (
    <div
      className={`nav-mega${open ? ' is-open' : ''}`}
      ref={rootRef}
      role="dialog"
      aria-label="Find storage"
      aria-hidden={!open}
      style={{ top: topOffset }}
      // A click on the dark area around the card dismisses it, like any popup.
      // Only the backdrop itself — anything inside the card bubbles up here too.
      onMouseDown={(e) => { if (e.target === rootRef.current) onClose(); }}
    >
      {/* Outside .nav-mega-inner on purpose: the Figma parks the ✕ against the
          viewport corner, past the right edge of the card. */}
      <button className="nav-mega-close" type="button" onClick={onClose} aria-label="Close menu">
        <CloseIcon size={24} />
      </button>

      <div className="nav-mega-inner">
        {showAllCities && activeState ? (
          // ── Page 2: every city in the state, four columns under a header that
          // stays put while the list scrolls beneath it. ────────────────────────
          <div className="nav-mega-all">
            {/* The header IS the back control — the Figma has no separate "back"
                label, just the chevron and the state name. */}
            <button
              className="nav-mega-back"
              type="button"
              onClick={() => setShowAllCities(false)}
            >
              <ChevronLeft size={24} />
              <span className="nav-mega-back-state">{activeState.label}</span>
              <span className="nav-mega-back-count">( {activeState.cities.length} )</span>
            </button>
            <div className="nav-mega-scroll nav-mega-all-scroll">
              <div className="nav-mega-all-cols">
                {activeState.cities.map(cityLink)}
              </div>
            </div>
          </div>
        ) : (
          <div className="nav-mega-panels">
            {/* ── Search + nearby ─────────────────────────────────────────── */}
            <section className="nav-mega-col nav-mega-col--search">
              <div className="nav-mega-block">
                <h3 className="nav-mega-heading">Search Location</h3>
                {/* Nothing to submit: the columns filter as the visitor types,
                    and there is no results page to post to. */}
                <form className="nav-mega-form" onSubmit={(e) => e.preventDefault()}>
                  <div className="nav-mega-selects">
                    <label className="nav-mega-select">
                      <span className="nav-mega-select-label">Type</span>
                      <select value={type} onChange={(e) => setType(e.target.value)}>
                        {TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </label>
                    <label className="nav-mega-select">
                      <span className="nav-mega-select-label">Size</span>
                      <select value={size} onChange={(e) => setSize(e.target.value)}>
                        {SIZE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="nav-mega-search-row">
                    <FormField
                      label="City, ZIP, Address"
                      value={query}
                      onChange={setQuery}
                      className="nav-mega-field"
                    />
                    {/* Icon-only by design; the label stays for screen readers. */}
                    <Button
                      type="submit"
                      tone="cta"
                      className="nav-mega-search-btn"
                      icon={<SearchIcon size={28} />}
                    >
                      Search
                    </Button>
                  </div>
                </form>
              </div>

              <div className="nav-mega-rule" />

              <div className="nav-mega-block">
                <h3 className="nav-mega-heading nav-mega-heading--sm">Nearby Storage Facilities</h3>
                {nearby.length ? (
                  <div className="nav-mega-locations">
                    {/* The WHOLE row is one link to the facility's landing page.
                        The address and phone lines used to be their own links (maps
                        and tel:), which meant two of the three things a visitor is
                        likely to click in a nav menu took them off the site instead
                        of to the facility. Maps and click-to-call belong on the
                        property page, which is where this now goes. */}
                    {nearby.map(({ property, miles }) => (
                      <a
                        className="nav-mega-loc"
                        key={property.id || property.slug}
                        href={property.href}
                      >
                        <MapPinIcon size={24} />
                        <span className="nav-mega-loc-data">
                          <span className="nav-mega-loc-name">
                            {property.label}
                            {miles != null && ` - ${milesLabel(miles)}`}
                          </span>
                          {property.address && (
                            <span className="nav-mega-loc-line">
                              <MapPinIcon size={16} />
                              <span>{property.address}</span>
                            </span>
                          )}
                          {property.phone && (
                            <span className="nav-mega-loc-line">
                              <PhoneIcon size={16} />
                              <span>{property.phone}</span>
                            </span>
                          )}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="nav-mega-empty">No locations to show yet.</p>
                )}
              </div>
            </section>

            {/* ── States: one column, scrolls ─────────────────────────────── */}
            <section className="nav-mega-col nav-mega-col--states">
              {heading('Select State', filteredTree.length)}
              {!filteredTree.length && (
                <p className="nav-mega-empty">No locations match “{query.trim()}”.</p>
              )}
              <div className="nav-mega-scroll nav-mega-states">
                {filteredTree.map((state) => (
                  // A LINK to the state page that opens the city list in place
                  // on the first click. Two jobs, one row: the row has to reveal
                  // its cities (that is what the panel beside it is for), but a
                  // state is also a real page and must be reachable, keyboard-
                  // focusable and middle-clickable. So the first click selects
                  // and stays put; clicking the already-open state follows the
                  // link. Modified clicks (⌘/ctrl/middle) always navigate.
                  //
                  // Still CLICK ONLY, never hover — opening on hover made the
                  // panel twitchy, since the pointer has to cross other state
                  // rows on its way to the cities.
                  <a
                    key={state.key}
                    href={state.href}
                    className={`nav-mega-state${state.key === activeKey ? ' is-active' : ''}`}
                    aria-expanded={state.key === activeKey}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                      if (state.key === activeKey) return;
                      e.preventDefault();
                      setActiveKey(state.key);
                    }}
                  >
                    <span className="nav-mega-state-name">{state.label}</span>
                    {state.propertyCount > 1 && (
                      <span className="nav-mega-bubble">{state.propertyCount}</span>
                    )}
                  </a>
                ))}
              </div>
            </section>

            {/* ── Cities: two columns, scrolls ────────────────────────────── */}
            {activeState && (
              <section className="nav-mega-col nav-mega-col--cities">
                <div className="nav-mega-cities-head">
                  {heading(activeState.label, activeState.cities.length)}
                  {/* Only once the list actually scrolls — see the header note. */}
                  {cityOverflow && (
                    <button
                      className="nav-mega-seeall"
                      type="button"
                      onClick={() => setShowAllCities(true)}
                    >
                      See all cities
                    </button>
                  )}
                </div>
                {/* Two columns filled alphabetically DOWN the first and on into the
                    second (Anaheim…Oceanside | Ontario…Torrance in the Figma), which
                    is what CSS columns do — a grid would run A, B across the row. */}
                <div className="nav-mega-scroll nav-mega-cities" ref={cityListRef}>
                  <div className="nav-mega-city-cols">
                    {activeState.cities.map(cityLink)}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo tree — the Duda EDITOR and the dev harness have no `dmAPI`, so the
// collection read returns nothing there and the panel would render empty while
// an editor is working on the page. These rows go through the real
// `buildLocationTree`, so the demo behaves exactly like live data: same sorting,
// same single-vs-multi-facility city links, same counts.
// ---------------------------------------------------------------------------

/**
 * state → city → how many facilities to fabricate for it.
 *
 * Sized to exercise BOTH frames the designer drew: California carries far more
 * cities than the two columns can show, so it scrolls and the SEE ALL CITIES link
 * appears; the smaller states fit and correctly show no link. There are also more
 * states than the states column can show, so that one scrolls too.
 */
const DEMO_CITIES: Record<string, Record<string, number>> = {
  arizona: { phoenix: 3, tucson: 1, mesa: 2, scottsdale: 1, chandler: 1, glendale: 2 },
  california: {
    alhambra: 1, anaheim: 2, bakersfield: 1, bellflower: 1, brea: 1, burbank: 2,
    carlsbad: 1, chino: 2, 'chula-vista': 1, corona: 1, 'costa-mesa': 1, downey: 1,
    'elk-grove': 1, escondido: 1, fontana: 2, fremont: 1, fresno: 2, fullerton: 3,
    gardena: 1, 'garden-grove': 1, glendale: 1, hayward: 1, 'huntington-beach': 1,
    inglewood: 1, irvine: 4, lancaster: 2, 'long-beach': 2, 'los-angeles': 5,
    modesto: 1, 'moreno-valley': 1, norwalk: 1, oakland: 2, oceanside: 1, ontario: 1,
    orange: 2, oxnard: 1, palmdale: 1, pasadena: 1, pomona: 1, 'rancho-cucamonga': 1,
    redlands: 1, riverside: 2, sacramento: 2, 'san-bernardino': 1, 'san-diego': 3,
    'san-francisco': 2, 'san-jose': 2, 'santa-ana': 1, 'santa-barbara': 1,
    'santa-clarita': 1, stockton: 1, torrance: 1, 'van-nuys': 1, whittier: 1,
  },
  colorado: { aurora: 1, denver: 2, 'colorado-springs': 1 },
  florida: { jacksonville: 2, miami: 3, orlando: 1, tampa: 2 },
  georgia: { athens: 1, atlanta: 3, savannah: 1 },
  idaho: { boise: 1, meridian: 1 },
  illinois: { chicago: 4, naperville: 1, peoria: 1 },
  nevada: { henderson: 1, 'las-vegas': 2, reno: 1 },
  'new-mexico': { albuquerque: 2, 'santa-fe': 1 },
  'north-carolina': { charlotte: 2, durham: 1, raleigh: 1 },
  oregon: { bend: 1, eugene: 1, portland: 2, salem: 1 },
  tennessee: { memphis: 1, nashville: 2 },
  texas: { austin: 2, dallas: 3, 'el-paso': 1, 'fort-worth': 2, houston: 4, 'san-antonio': 1 },
  utah: { 'salt-lake-city': 2, provo: 1 },
  washington: { bellevue: 1, seattle: 3, spokane: 1, tacoma: 1, vancouver: 1 },
};

/** Real USPS codes — `state.slice(0, 2)` gave Arizona "AR" and Texas "TE". */
const DEMO_STATE_CODES: Record<string, string> = {
  arizona: 'AZ', california: 'CA', colorado: 'CO', florida: 'FL', georgia: 'GA',
  idaho: 'ID', illinois: 'IL', nevada: 'NV', 'new-mexico': 'NM',
  'north-carolina': 'NC', oregon: 'OR', tennessee: 'TN', texas: 'TX', utah: 'UT',
  washington: 'WA',
};

/**
 * A stable five-digit ZIP derived from the city name, so each demo city has its
 * own and searching one narrows to that city — the way a real ZIP behaves. The
 * previous version keyed the ZIP off the facility INDEX, which gave every city's
 * first facility the same "91013" and made ZIP search look broken in the harness.
 */
function demoZip(state: string, city: string): string {
  let hash = 0;
  for (const ch of `${state}/${city}`) hash = (hash * 31 + ch.charCodeAt(0)) % 90000;
  return String(10000 + hash);
}

const DEMO_ROWS = Object.entries(DEMO_CITIES).flatMap(([state, cities]) =>
  Object.entries(cities).flatMap(([city, count]) =>
    Array.from({ length: count }, (_, i) => {
      const cityLabel = city.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
      const n = i + 1;
      return {
        id: `demo-${state}-${city}-${n}`,
        name: `Storage Outlet - ${cityLabel}${count > 1 ? ` #${n}` : ''}`,
        slug: `${state}/${city}/storage-outlet-${city}-${n}`,
        Address: {
          // Street names differ per city too, so a street search is meaningful.
          address: `${100 + n * 7} ${cityLabel} Avenue`,
          city: cityLabel,
          state: DEMO_STATE_CODES[state] ?? state.slice(0, 2).toUpperCase(),
          zip: demoZip(state, city),
        },
        Phones: [{ phone: '8008749487', status: 1 }],
      };
    }),
  ),
);

/**
 * Stand-in tree for the Duda editor and the dev harness. Takes the same base
 * paths as the live tree so the demo links match the ones a visitor would get.
 */
export function demoLocationTree(basePath: string, cityBasePath?: string): NavState[] {
  return buildLocationTree(DEMO_ROWS, { basePath, cityBasePath });
}
