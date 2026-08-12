// ===========================================================================
// The brand's social profile URLs, for the share controls on the blog widgets.
//
// Instagram, YouTube and TikTok have no web share endpoint (see
// @shared/shareLinks), so their icons link to the brand's own pages. Those URLs
// already live in the `Properties` collection's SocialMedia column — the same
// source #13 footer and #02 navigation bar read — so this is a thin hook over
// `fetchPropertyContact` rather than a new config surface per widget.
//
// Fails SOFT: outside Duda, or with the collection missing, it returns {} and
// the icons fall back to the platform home pages. Never throws into render.
// ===========================================================================

import { useEffect, useState } from 'react';
import { fetchPropertyContact } from './propertyContact';
import type { SocialProfiles } from './shareLinks';

/**
 * Platform key → profile URL, merged with any explicit overrides.
 *
 * `overrides` wins over the collection so an editor can correct or supply a
 * single link without touching the Properties row. Blank override values are
 * dropped rather than overwriting a good collection URL with '' — Duda sends ''
 * for every untouched text field, so treating those as intentional would blank
 * out the links on any site that never opened the panel.
 */
export function useSocialProfiles(
  widgetTag: string,
  overrides: SocialProfiles = {},
  propertyId?: string,
): SocialProfiles {
  const [fromCollection, setFromCollection] = useState<SocialProfiles>({});

  // Only the collection read is an effect; the merge below is plain derived
  // state, so `overrides` never needs to be a dependency (the caller builds it
  // as an inline literal, which would re-fire on every render).
  useEffect(() => {
    let cancelled = false;
    fetchPropertyContact(widgetTag, propertyId)
      .then((contact) => {
        if (cancelled || !contact) return;
        const map: SocialProfiles = {};
        for (const { platform, url } of contact.socials) map[platform] = url;
        setFromCollection(map);
      })
      .catch((err) => console.error(`[${widgetTag}] fetchPropertyContact error:`, err));
    return () => { cancelled = true; };
  }, [widgetTag, propertyId]);

  const merged: SocialProfiles = { ...fromCollection };
  for (const [key, value] of Object.entries(overrides)) {
    if (value?.trim()) merged[key] = value.trim();
  }
  return merged;
}
