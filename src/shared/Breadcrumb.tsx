// ===========================================================================
// Breadcrumb — the trail above a page's content (Figma 10622:77309 on the city
// page, 9499:22620 on the property page; the two frames are identical).
//
// SHARED because the design is the same wherever it appears, and it is due on
// several more pages. Three private copies would drift the moment one of them
// was nudged.
//
// Styles are ONE injected <style> block rather than per-widget CSS, for the
// reason @shared/Shimmer gives: each widget is its own bundle, so a shared
// component carrying class names would need the same rules copied into every
// widget's stylesheet. Shimmer can use inline styles because nothing it draws
// reacts to the pointer; a breadcrumb has a link hover, which inline styles
// cannot express — hence a stylesheet rather than a style attribute.
//
// The chevron is inline SVG, not a linked asset: the AMD bundles cannot fetch
// remote files and Figma's export URLs expire in ~7 days.
// ===========================================================================

import { useEffect } from 'react';
import { openFindStorage, FIND_STORAGE_OPEN_EVENT } from './findStorageBus';

const STYLE_ID = 'ti-crumbs-style';

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  // 4px is the node's gap BOTH between crumbs and between a chevron and its
  // label, so one flex gap covers both. Wraps rather than overflows: a long
  // state/city/street trail on a narrow window should take a second line, not
  // push the page wider.
  style.textContent = `
.ti-crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 4px;
  font-size: 16px; line-height: 20px; color: #101318; }
.ti-crumb { display: flex; align-items: center; gap: 4px; }
.ti-crumb-link { color: inherit; text-decoration: underline; }
.ti-crumb-link:hover { text-decoration: none; }
/* The action crumb is a real <button> — it opens a panel, so it must not be a
   link — and #02 renders its own "Find Storage" trigger the same way. A button
   therefore needs a FULL host reset to look identical to the <a> crumbs beside
   it: Duda themes style bare buttons, and so does the dev harness, which sets
   padding, a 1px border, a 6px radius, a white background and a 13px font on
   every bare button. Anything left unanswered leaks through as a bordered,
   padded pill in the middle of the trail — the lesson #99's .rfm-bar documents,
   where an unreset border-radius kept coming back.
   font: inherit covers family/size/weight/style/variant in one; the rest are
   properties that shorthand does NOT reach. text-transform is the nastiest of
   them: a theme with uppercase buttons would render "FIND STORAGE" mid-trail.
   No outline reset — the focus ring is the one piece of button chrome worth
   keeping. */
.ti-crumb-btn { appearance: none; -webkit-appearance: none; box-sizing: border-box;
  margin: 0; padding: 0; border: 0; border-radius: 0; background: none;
  box-shadow: none; font: inherit; color: inherit; line-height: inherit;
  letter-spacing: inherit; text-align: left; text-transform: none; text-indent: 0;
  width: auto; min-width: 0; height: auto; min-height: 0; cursor: pointer;
  -webkit-tap-highlight-color: transparent; }
.ti-crumb-sep { flex-shrink: 0; color: #101318; }
/* 2px, not the page-top trail's 4px. A truncated crumb already leaves a blank of
   up to one character between its ellipsis and the next slash — the leftover when
   text-overflow clips at a whole character but flex sized the box to a fraction.
   Nothing in CSS can close that, so the gaps either side of the slash are halved
   instead, which is the only part of the space that IS ours to give back. */
.ti-crumbs--hero { gap: 2px; font-size: 14px; line-height: 1.25; color: #fff; flex-wrap: nowrap; min-width: 0; }
.ti-crumb-nowrap { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* nowrap + the ellipsis above: on a phone the trail sits inside the hero image
   with the expand button beside it, so a long final crumb has to give way
   rather than wrap onto a second line over the photo. */
.ti-crumbs--hero .ti-crumb { gap: 2px; min-width: 0; overflow: hidden; }
/* EVERY hero label gets the nowrap + ellipsis treatment, not just the last one.
   collapseMiddle keeps the last TWO crumbs named, so the city sits second from
   the end with its real name — and a two-word city ("Chula Vista") broke between
   its words, making that crumb two lines tall. The row is align-items:center, so
   the trail then looked like it had stacked, with the short crumbs floating
   against a tall one and dead space to the right.
   The overflow above is on every crumb for the same reason: min-width:0 lets a
   crumb shrink below its content, but without overflow the text simply spilled
   out of its box and ran into the next crumb past the slash. */
.ti-crumbs--hero .ti-crumb > :not(.ti-crumb-slash) {
  display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap;
}
/* An ellipsis crumb is already as short as a crumb goes, so it must not take a
   share of the shrinking — compressing "..." only clips it to ".." or ".", which
   reads as a rendering fault rather than as a collapsed step. The named crumbs
   absorb it instead, longest first, which is what flex shrinking does by size. */
.ti-crumbs--hero .ti-crumb--ellipsis { flex: 0 0 auto; }
/* No underline here, unlike the page-top trail: over a photo it reads as
   clutter, and the frame draws none.
   Pinned across hover/focus/active as well. The base rule flips decoration on
   hover, and a host stylesheet's own a:hover — Duda themes all ship one — lands
   on these too, which is what made a single crumb light up differently from the
   rest. Nothing about a hero crumb changes on hover now. */
.ti-crumbs--hero .ti-crumb-link,
.ti-crumbs--hero .ti-crumb-link:hover,
.ti-crumbs--hero .ti-crumb-link:focus,
.ti-crumbs--hero .ti-crumb-link:active {
  color: inherit;
  text-decoration: none;
  background: none;
}
.ti-crumbs--hero .ti-crumb-slash { flex-shrink: 0; }
@media (max-width: 768px) { .ti-crumbs--hero { font-size: 14px; line-height: 1.25; } }`;
  document.head.appendChild(style);
}

/**
 * chevron-big/chevron-big-right (Figma 6449:142004).
 *
 * The design system's chevron, pointed right. Its box is x 1..13, y 1..7 —
 * 12 wide by 6 tall, centred on (7, 4) — so rotating that about the frame's
 * centre gives 6 by 12 spanning x 9..15, y 6..18, exactly the insets the node
 * states for this glyph (left/right 37.5%, top/bottom 25% of 24).
 */
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(12 12) rotate(-90) translate(-7 -4)">
        <path
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1.00007 1.00007C2.57708 3.18086 4.42301 5.13648 6.48995 6.81724C6.78974 7.06102 7.2104 7.06102 7.51019 6.81724C9.57714 5.13648 11.4231 3.18086 13.0001 1.00007"
        />
      </g>
    </svg>
  );
}


export interface Crumb {
  label: string;
  /** Omitted for the page you are on — the last crumb is never a link. */
  href?: string;
  /**
   * Renders this crumb as a BUTTON that runs this instead of navigating.
   *
   * For a crumb whose destination is a panel on the page rather than a page of
   * its own — "Find Storage" opens #02's mega menu, which is what the nav item
   * of the same name does. A crumb like that must not be an <a>: a link that
   * goes nowhere is announced as a link by a screen reader and offers a URL to
   * open in a new tab that does not exist.
   *
   * Return false when the action could not be performed (e.g. no nav on the
   * page); the crumb then falls back to `href` if it has one.
   */
  onSelect?: () => boolean | void;
}

export interface BreadcrumbProps {
  items: Crumb[];
  /**
   * `default` — the page-top trail: 16px dark text, chevron separators, every
   * crumb spelled out (Figma 10622:77309 / 9499:22620).
   *
   * `hero` — the compact trail that sits INSIDE a dark hero image on mobile
   * (Figma 9693:40309): 14px white, "/" separators, and the first crumb drawn
   * as a home icon instead of its label. Callers shorten the middle crumbs
   * themselves — see `collapseMiddle`.
   */
  variant?: 'default' | 'hero';
  /** Extra class on the <nav>, for a widget that needs its own spacing. */
  className?: string;
}

/**
 * Render a trail. The LAST item is always treated as the current page — its
 * `href` is ignored and it gets `aria-current`, so a caller cannot accidentally
 * link the page to itself.
 *
 * Renders nothing below two items: "Home" alone is not a trail.
 */
export function Breadcrumb({ items, variant = 'default', className }: BreadcrumbProps) {
  useEffect(ensureStyles, []);
  if (items.length < 2) return null;
  const hero = variant === 'hero';
  return (
    <nav
      className={['ti-crumbs', hero && 'ti-crumbs--hero', className].filter(Boolean).join(' ')}
      aria-label="Breadcrumb"
    >
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        // Every pair gets a slash, the home crumb included. The icon that used
        // to stand in for Home is gone: on a phone it read as a button rather
        // than the first step of a trail, and the frame the hero copies shows
        // an unbroken run of ellipses. Home collapses to one of them — still
        // linked, and still NAMED for a screen reader via aria-label below.
        const showSep = i > 0;
        const label = hero && i === 0 && items.length > 2 ? '...' : c.label;
        // Collapsed steps — either shortened by `collapseMiddle` or by the rule
        // above — are pinned against flex shrinking, so the named crumbs give way
        // first. Read off the RESOLVED label so both routes to an ellipsis are
        // caught, not just the one this component applies.
        const isEllipsis = hero && label === '...';
        return (
          <span
            className={`ti-crumb${isEllipsis ? ' ti-crumb--ellipsis' : ''}`}
            key={`${c.label}-${i}`}
          >
            {showSep && (hero
              ? <span className="ti-crumb-slash" aria-hidden="true">/</span>
              : <ChevronRight className="ti-crumb-sep" />)}
            {isLast || (!c.href && !c.onSelect)
              ? (
                <span
                  className={isLast && hero ? 'ti-crumb-nowrap' : undefined}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {label}
                </span>
              )
              : c.onSelect
                ? (
                  <button
                    type="button"
                    className="ti-crumb-link ti-crumb-btn"
                    /* The icon replaces the word, so the control needs the name back. */
                    aria-label={hero && i === 0 ? c.label : undefined}
                    onClick={() => {
                      // Only an explicit false is a failure — a handler that
                      // returns nothing is the ordinary "did it" case.
                      if (c.onSelect!() === false && c.href) window.location.href = c.href;
                    }}
                  >
                    {label}
                  </button>
                )
                : (
                  <a
                    className="ti-crumb-link"
                    href={c.href}
                    /* The icon replaces the word, so the link needs the name back. */
                    aria-label={hero && i === 0 ? c.label : undefined}
                  >
                    {label}
                  </a>
                )}
          </span>
        );
      })}
    </nav>
  );
}

/** Ellipsis crumbs shown before the two named ones. */
const MAX_ELLIPSES = 3;

/**
 * Shorten a trail for the hero variant: name the last TWO crumbs — the page you
 * are on and the one above it — and replace everything before them with an
 * ellipsis, one per crumb.
 *
 * `home / … / … / … / Fullerton / 3050 Bowling Dr`, as the frame shows it.
 * Naming the parent is the point: an ellipsis says a level exists but not which
 * one, so a trail that ellipsised everything but the current page told you
 * nothing about where you were.
 *
 * At most MAX_ELLIPSES of them. Beyond that they stop carrying information —
 * they are indistinguishable from one another — and on a phone they crowd out
 * the two crumbs that do. When there are more, the FIRST is kept (Home, the one
 * people actually reach for) along with the two nearest the current page, and
 * the levels in between are dropped rather than rendered as more of the same.
 *
 * Every ellipsis keeps its href, so each is still a way back up.
 */
export function collapseMiddle(items: Crumb[]): Crumb[] {
  if (items.length <= 2) return items;
  // The last two keep their names; everything before is a candidate ellipsis.
  const named = items.slice(-2);
  let head = items.slice(0, -2);
  if (head.length > MAX_ELLIPSES) head = [head[0], ...head.slice(-(MAX_ELLIPSES - 1))];
  return [...head.map((c) => ({ ...c, label: '...' })), ...named];
}

/**
 * Where the state and city pages live.
 *
 * The same value #02's nav and #08's city page use. Kept here so the widgets
 * that build a location trail agree on it instead of each carrying its own
 * literal — three copies of "/locations" is three chances to disagree.
 */
export const LOCATION_BASE_PATH = '/locations';

/** Lower-cased, hyphenated — the shape every location path segment uses. */
export function placeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Normalise a base path to a leading slash and no trailing one, so a missing or
 * doubled slash in a prop cannot produce `//locations` or a relative link.
 */
export function normaliseBase(path: string | undefined): string {
  const trimmed = (path ?? '').trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '/';
}

/**
 * The Home / Find Storage head every trail starts with.
 *
 * "Find Storage" OPENS #02'S MEGA MENU rather than navigating. It used to link
 * to the state/city base (`/locations`), which was wrong in the plainest way:
 * that path is a PREFIX for state and city pages, not a page — `/locations/
 * california/bellflower` resolves, bare `/locations` does not, and the crumb
 * went to an error page on the live site.
 *
 * Nor is there an index page to point it at instead. Nothing in the site links
 * to one: #02's own "Find Storage" nav item is `href: '#'` with a dropdown, and
 * even "All Locations" inside that menu is a dead `'#'`. The mega menu IS this
 * site's find-storage affordance, so the crumb now does exactly what the nav
 * item of the same name does — which is also why #02 already exposes the hook
 * this uses.
 *
 * `fallbackHref` is for a site that DOES build a locations index later: pass it
 * and the crumb navigates there when no nav answers. Left unset, a page without
 * #02 gets a crumb that warns to the console instead of going to a 404 — doing
 * nothing visible is poor, but it beats an error page, and it is diagnosable.
 */
export function locationCrumbHead(fallbackHref?: string): Crumb[] {
  return [
    { label: 'Home', href: '/' },
    {
      label: 'Find Storage',
      href: fallbackHref,
      onSelect: () => {
        if (openFindStorage()) return true;
        console.warn('[Breadcrumb] "Find Storage" — no navigation bar (#02) answered '
          + `${FIND_STORAGE_OPEN_EVENT}; the mega menu is not on this page.`);
        return false;
      },
    },
  ];
}
