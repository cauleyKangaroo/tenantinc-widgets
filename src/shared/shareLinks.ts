// ===========================================================================
// Share targets for a blog post.
//
// Shared by #12 blogs-listing, #15 blogs-page and #16 blog-post so all three
// Share controls behave identically. Logic only — no markup and no icons: each
// widget owns its own CSS prefix and its own glyph set, and matches the `key`
// here against that set (the keys are the ones used by @shared/socialIcons and
// #12's local SOCIALS).
//
// ALL SIX of Figma's brand glyphs are returned, in Figma's order, and every one
// resolves to a real destination — but they do two different things, because
// the platforms do:
//
//   facebook / x / linkedin  → a share composer preloaded with the post URL.
//                              These are the only three with a web share
//                              endpoint a browser can hand a URL to.
//   instagram / youtube / tiktok
//                            → the brand's profile. No share endpoint exists
//                              for these, so there is no link that could carry
//                              the post; the useful destination is the page
//                              itself. Profile URLs come from the `Properties`
//                              collection (see useSocialProfiles) or from an
//                              explicit prop; absent both, the icon falls back
//                              to the platform's home page so it is never a
//                              dead click.
// ===========================================================================

/** Platform key → the brand's profile URL. Keys match @shared/socialIcons. */
export type SocialProfiles = Record<string, string | undefined>;

export interface ShareTarget {
  /** Matches the icon-set key, e.g. 'facebook'. */
  key: string;
  label: string;
  href: string;
  /** True for the three that open a share composer; false for profile links. */
  shares: boolean;
}

/** Last-resort destination for a platform with no configured profile. */
const PLATFORM_HOME: Record<string, string> = {
  instagram: 'https://www.instagram.com/',
  youtube: 'https://www.youtube.com/',
  tiktok: 'https://www.tiktok.com/',
};

/**
 * Resolve a post href against the current page so share endpoints get an
 * absolute URL — they're server-side redirectors and a "/blogs/foo" means
 * nothing to them.
 *
 * Falls back to the current page for a post with no link of its own (a row with
 * a blank `path` column), which is still a coherent thing to share. Returns the
 * input untouched with no DOM, so this is safe to call during a jsdom-less test.
 */
export function absolutePostUrl(href: string | undefined): string {
  if (typeof window === 'undefined') return href ?? '';
  const raw = (href ?? '').trim();
  if (!raw || raw === '#') return window.location.href;
  try {
    return new URL(raw, window.location.href).href;
  } catch {
    return window.location.href;
  }
}

/**
 * All six share targets for one post, in Figma's icon order
 * (facebook, instagram, youtube, x, linkedin, tiktok).
 */
export function shareTargets(url: string, title: string, profiles: SocialProfiles = {}): ShareTarget[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  /** A profile link: the brand's page when known, the platform's home if not. */
  const profile = (key: string, label: string): ShareTarget => ({
    key,
    label,
    href: profiles[key]?.trim() || PLATFORM_HOME[key],
    shares: false,
  });

  return [
    { key: 'facebook',  label: 'Share on Facebook', shares: true, href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    profile('instagram', 'Instagram'),
    profile('youtube', 'YouTube'),
    { key: 'x',         label: 'Share on X',        shares: true, href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { key: 'linkedin',  label: 'Share on LinkedIn', shares: true, href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    profile('tiktok', 'TikTok'),
  ];
}
