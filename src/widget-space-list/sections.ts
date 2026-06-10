// ===========================================================================
// Content sections
//
// These are the informational panels the site editor can surface in the
// sidebar (under the filters) and/or the Additional Panel. Right now each is a
// dummy titled container (see components/SectionPanel.tsx). This file is the
// seam where real per-section content/data plugs in later (e.g. reviews and
// hours from Hummingbird via the proxy) — add fields to Section and render them
// in SectionPanel; SpaceList / the layout don't need to change.
// ===========================================================================

export type SectionKey =
  | 'reviews'
  | 'features'
  | 'nearby'
  | 'store'
  | 'notes'
  | 'faqs'
  | 'hours';

export interface Section {
  key: SectionKey;
  title: string;
}

export const SECTIONS: Section[] = [
  { key: 'reviews', title: 'Customer Reviews' },
  { key: 'features', title: 'Features' },
  { key: 'nearby', title: 'Nearby Properties' },
  { key: 'store', title: 'Store Content' },
  { key: 'notes', title: 'Notes' },
  { key: 'faqs', title: 'FAQs' },
  { key: 'hours', title: 'Hours' },
];

const BY_KEY = new Map<string, Section>(SECTIONS.map((s) => [s.key, s]));

/** Look up a section by key. Returns undefined for 'none' / unknown keys. */
export function getSection(key: string | undefined): Section | undefined {
  return key ? BY_KEY.get(key) : undefined;
}

/**
 * Return all sections in the order given by `order` (the Duda panelOrder prop).
 * Defensive: unknown keys are ignored, duplicates de-duped, any sections missing
 * from `order` are appended in default order, and an empty/undefined `order`
 * falls back to the default order. So the result is always all 7 sections.
 */
export function orderSections(order?: string[]): Section[] {
  const result: Section[] = [];
  const seen = new Set<string>();
  for (const key of order ?? []) {
    const s = BY_KEY.get(key);
    if (s && !seen.has(key)) {
      result.push(s);
      seen.add(key);
    }
  }
  for (const s of SECTIONS) {
    if (!seen.has(s.key)) result.push(s);
  }
  return result;
}
