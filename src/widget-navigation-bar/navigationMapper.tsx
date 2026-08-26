// #02-specific mapping from the generic Duda navigation tree (@shared/dudaNav)
// to this header's link shape. The menu simply mirrors the Pages panel: every
// page marked "show in navigation", in Duda's own order, with its visible
// sub-pages nested. No aliases, no curated sections.
//
// Find Storage is NOT special-cased here — the component renders whichever
// top-level item is titled "Find Storage" as the custom mega menu; every other
// item is a plain page link/dropdown.

import type { DudaNavItem } from '@shared/dudaNav';

// Structural shapes — assignable to NavigationBar's NavLink / NavMenuItem / NavSubItem.
export interface NavSubItemShape {
  label: string;
  href: string;
  children?: NavSubItemShape[];
}
export interface NavMenuItemShape {
  label: string;
  href: string;
  children?: NavSubItemShape[];
}
export interface NavLinkShape {
  /** Duda page alias — stable across title/URL changes; used to spot Find Storage. */
  alias?: string;
  label: string;
  href: string;
  hasDropdown?: boolean;
  menu?: NavMenuItemShape[];
}

const shown = (items: DudaNavItem[]): DudaNavItem[] => items.filter((i) => i.visible);

// Duda's order is the operator's intended order — map in place, never sort.
function toSub(items: DudaNavItem[]): NavSubItemShape[] {
  return shown(items).map((i) => {
    const kids = shown(i.children);
    return { label: i.title, href: i.path, ...(kids.length ? { children: toSub(kids) } : null) };
  });
}

function toMenu(items: DudaNavItem[]): NavMenuItemShape[] {
  return shown(items).map((i) => {
    const kids = shown(i.children);
    return { label: i.title, href: i.path, ...(kids.length ? { children: toSub(kids) } : null) };
  });
}

/**
 * Every page marked "show in navigation", in Duda's order, nested by `subNav`.
 * A top-level item with visible children becomes a dropdown; otherwise a link.
 */
export function navTreeToLinks(tree: DudaNavItem[]): NavLinkShape[] {
  return shown(tree).map((i) => {
    const kids = shown(i.children);
    return {
      alias: i.alias,
      label: i.title,
      href: i.path,
      ...(kids.length ? { hasDropdown: true, menu: toMenu(kids) } : null),
    };
  });
}
