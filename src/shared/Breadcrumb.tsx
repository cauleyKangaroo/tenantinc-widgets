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
  font-size: 18px; line-height: 22.5px; color: #101318; }
.ti-crumb { display: flex; align-items: center; gap: 4px; }
.ti-crumb-link { color: inherit; text-decoration: underline; }
.ti-crumb-link:hover { text-decoration: none; }
.ti-crumb-sep { flex-shrink: 0; color: #101318; }
@media (max-width: 768px) { .ti-crumbs { font-size: 16px; line-height: 20px; } }
.ti-crumbs--hero { gap: 8px; font-size: 14px; line-height: 1.25; color: #fff; }
.ti-crumbs--hero .ti-crumb { gap: 8px; }
.ti-crumbs--hero .ti-crumb-link { color: inherit; }
.ti-crumbs--hero .ti-crumb-slash { flex-shrink: 0; }
.ti-crumbs--hero .ti-crumb-home { flex-shrink: 0; display: block; }
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

/**
 * home/home-default (Figma 9693:40590) — stands in for the word "Home" in the
 * hero variant. A FILLED glyph, not a stroked one, so it takes `currentColor`
 * as a fill. 20x20 artwork at the node's 8.33% inset, i.e. translate(2, 2) in
 * the 24x24 frame.
 */
function HomeGlyph({ className }: { className?: string }) {
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
      <g transform="translate(2 2)">
        <path
          fill="currentColor"
          d="M11.4907 0.227375C10.5201 -0.0757916 9.48007 -0.0757916 8.50943 0.227375C7.90008 0.417695 7.37371 0.753448 6.82909 1.19141C6.30102 1.61608 5.69688 2.18667 4.94919 2.89283L2.23281 5.45827C1.57635 6.07789 1.122 6.50674 0.789962 7.02502C0.496591 7.48294 0.279894 7.98567 0.14841 8.51338C-0.000403047 9.11063 -0.000215526 9.73541 5.5437e-05 10.6381L3.86285e-05 14.4782C-0.000353093 15.4205 -0.000630617 16.0878 0.153413 16.6627C0.569515 18.2156 1.78248 19.4286 3.33539 19.8447C3.91028 19.9987 4.57762 19.9985 5.51991 19.9981C5.85238 19.9982 6.19372 20.0167 6.51772 19.9299C7.2079 19.745 7.747 19.2059 7.93193 18.5157C8.00181 18.2549 8.00093 17.9671 8.00022 17.7322L8.00008 14.998C8.00008 14.4953 8.00318 14.3604 8.01855 14.2634C8.1202 13.6215 8.62359 13.1182 9.26543 13.0165C9.36243 13.0011 9.49736 12.998 10.0001 12.998C10.5028 12.998 10.6377 13.0011 10.7347 13.0165C11.3766 13.1182 11.88 13.6215 11.9816 14.2634C11.997 14.3604 12.0001 14.4953 12.0001 14.998L11.9999 17.7323C11.9992 17.9671 11.9983 18.2549 12.0682 18.5157C12.2532 19.2059 12.7923 19.745 13.4824 19.9299C13.8064 20.0167 14.1478 19.9982 14.4802 19.9981C15.4225 19.9985 16.0899 19.9987 16.6648 19.8447C18.2177 19.4286 19.4306 18.2156 19.8467 16.6627C20.0008 16.0878 20.0005 15.4205 20.0001 14.4782L20.0001 10.6381C20.0004 9.73542 20.0006 9.11063 19.8517 8.51338C19.7203 7.98567 19.5036 7.48294 19.2102 7.02502C18.8782 6.50674 18.4238 6.0779 17.7674 5.45828L15.051 2.89286C14.3033 2.18668 13.6991 1.61608 13.1711 1.19141C12.6264 0.753448 12.1001 0.417695 11.4907 0.227375Z"
        />
      </g>
    </svg>
  );
}

export interface Crumb {
  label: string;
  /** Omitted for the page you are on — the last crumb is never a link. */
  href?: string;
}

export interface BreadcrumbProps {
  items: Crumb[];
  /**
   * `default` — the page-top trail: 18px dark text, chevron separators, every
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
        // The hero frame hangs its separators off the crumbs, and the home icon
        // sits OUTSIDE that group — so there is no "/" between the icon and the
        // crumb after it, only between the crumbs themselves. Reproduced rather
        // than tidied: it is what the frame draws.
        const showSep = i > 0 && !(hero && i === 1);
        const label = hero && i === 0
          ? <HomeGlyph className="ti-crumb-home" />
          : c.label;
        return (
          <span className="ti-crumb" key={`${c.label}-${i}`}>
            {showSep && (hero
              ? <span className="ti-crumb-slash" aria-hidden="true">/</span>
              : <ChevronRight className="ti-crumb-sep" />)}
            {isLast || !c.href
              ? <span aria-current={isLast ? 'page' : undefined}>{label}</span>
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

/**
 * Shorten a trail for the hero variant: keep the first crumb (drawn as the home
 * icon) and the last (the page you are on), and replace every label between
 * them with an ellipsis — one per crumb, NOT one for the whole run.
 *
 * That is what the frame shows: `home / … / … / … / 1301 E. Mission Ave`. The
 * hidden crumbs keep their hrefs, so each ellipsis is still a way back up.
 */
export function collapseMiddle(items: Crumb[]): Crumb[] {
  if (items.length <= 2) return items;
  return items.map((c, i) =>
    (i === 0 || i === items.length - 1 ? c : { ...c, label: '...' }));
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
 * `base` names where the state and city pages live (`/locations`). "Find
 * Storage" points at that index; when there is no base it is left unlinked
 * rather than pointed at the site root, which Home already covers.
 */
export function locationCrumbHead(base: string): Crumb[] {
  return [
    { label: 'Home', href: '/' },
    { label: 'Find Storage', href: base === '/' ? undefined : base },
  ];
}
