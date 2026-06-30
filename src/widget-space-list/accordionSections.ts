// ===========================================================================
// Sidebar accordion sections — single source of truth
//
// Both the rendered accordion (SectionAccordion) and the editor's drag-to-
// reorder modal (ReorderModal) build off ACCORDION_SECTIONS so labels, keys
// and default order never drift apart. Icons + content stay in SectionAccordion
// (they're heavy React nodes); this module is just the lightweight metadata.
// ===========================================================================

import type { SpaceListProps } from './types';

export type AccordionKey = 'store' | 'nearby' | 'reviews' | 'faq' | 'blog' | 'sizeguide';

export interface AccordionSectionMeta {
  key: AccordionKey;
  label: string;
  /** Which SpaceListProps `isX` flag makes this section a candidate at all. */
  enabledBy: keyof SpaceListProps;
}

/** Canonical default order + labels for the sidebar accordion sections. */
export const ACCORDION_SECTIONS: AccordionSectionMeta[] = [
  { key: 'store',     label: 'Property Information', enabledBy: 'isStore' },
  { key: 'nearby',    label: 'Nearby Storage',       enabledBy: 'isNearby' },
  { key: 'reviews',   label: 'Reviews',              enabledBy: 'isReviews' },
  { key: 'faq',       label: 'FAQ',                  enabledBy: 'isFAQ' },
  { key: 'blog',      label: 'Storage Blogs',        enabledBy: 'isBlog' },
  { key: 'sizeguide', label: 'Size Guide',           enabledBy: 'isSizeGuide' },
];

/**
 * Per-instance accordion arrangement. Persisted (as JSON-in-text columns) in the
 * Duda `accordionConfig` collection, keyed by `${siteId}_${elementId}`.
 */
export interface AccordionConfig {
  /** Section keys in display order. */
  order: AccordionKey[];
  /** Section keys hidden on this particular widget instance. */
  hidden: AccordionKey[];
}

/** The sections the widget is allowed to show, given the `isX` content toggles. */
export function enabledSections(props: SpaceListProps): AccordionSectionMeta[] {
  return ACCORDION_SECTIONS.filter((s) => Boolean(props[s.enabledBy]));
}

/**
 * Resolve which section keys to render, in order, from the enabled set + saved
 * config. Defensive by design so a stale/partial config can never blank the
 * panel or surface a disabled section:
 *   - only enabled keys survive (config can't resurrect an isX=false section)
 *   - unknown/duplicate keys in `order` are ignored
 *   - enabled keys missing from `order` are appended in default order
 *   - hidden keys are removed last
 * An empty/undefined config falls back to all enabled sections in default order.
 */
export function resolveVisibleOrder(
  enabledKeys: AccordionKey[],
  config: AccordionConfig | null | undefined,
): AccordionKey[] {
  const enabled = new Set(enabledKeys);
  const hidden = new Set(config?.hidden ?? []);
  const ordered: AccordionKey[] = [];
  const seen = new Set<AccordionKey>();

  for (const key of config?.order ?? []) {
    if (enabled.has(key) && !seen.has(key)) {
      ordered.push(key);
      seen.add(key);
    }
  }
  for (const { key } of ACCORDION_SECTIONS) {
    if (enabled.has(key) && !seen.has(key)) {
      ordered.push(key);
      seen.add(key);
    }
  }
  return ordered.filter((k) => !hidden.has(k));
}
