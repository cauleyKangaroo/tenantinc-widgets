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
