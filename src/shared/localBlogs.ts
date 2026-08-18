// ===========================================================================
// Local blogs — the posts that belong to ONE property.
//
// `BlogPosts` has no property column, so a post is tied to a facility by TAG:
// one of its `tags` names that property's slug. The tag IS the join.
//
// That same string does double duty as the blog listing page's `?category=`
// value (#15 blogs-page), which is why the See-all link carries the matched TAG
// rather than the property slug it was matched against — #15 compares the param
// to the tags on each post, so handing it the tag the collection actually uses
// is the only value guaranteed to hit.
//
// Used by #05's "Local Blogs" accordion section.
// ===========================================================================

import { slugify, type BlogPostData } from './blogPosts';

/**
 * The tag spellings that count as naming this property.
 *
 * A property slug is `state/city/property-name-<id>` (see @shared/propertyNav),
 * but whoever tags a post is more likely to type just the tail, with or without
 * the numeric id. All three are accepted so a reasonable tag can't miss:
 *
 *   california/bellflower/storage-outlet-bellflower-340079517
 *   storage-outlet-bellflower-340079517
 *   storage-outlet-bellflower
 *
 * Everything is compared slugified, so slashes, spaces, underscores and case
 * don't matter — `Storage Outlet Bellflower` matches too.
 *
 * The id-less form is the one loose end: two facilities sharing a name would
 * share that tag. The `-<id>` forms disambiguate, and dropping the id-less form
 * would reject the most natural thing to type — a false SHARE between two
 * same-named facilities beats a section that silently stays empty.
 */
export function propertyTagKeys(propertySlug: string): string[] {
  const raw = String(propertySlug ?? '').trim();
  const full = slugify(raw);
  if (!full) return [];

  const keys = [full];
  const tail = slugify(raw.split('/').filter(Boolean).pop() ?? '');
  if (tail && !keys.includes(tail)) keys.push(tail);
  // Trailing `-<digits>` is the property id, not part of the name.
  const named = tail.replace(/-\d+$/, '');
  if (named && !keys.includes(named)) keys.push(named);

  return keys;
}

export interface LocalPosts {
  /** The property's posts, in whatever order they arrived (newest first). */
  posts: BlogPostData[];
  /**
   * The tag that actually matched, verbatim — the `?category=` value for the
   * See-all link. '' when nothing matched, which is the caller's signal to link
   * at the unfiltered listing instead.
   */
  tag: string;
}

/** The posts tagged for one property. Empty (and tag '') when the slug is blank. */
export function selectLocalPosts(posts: BlogPostData[], propertySlug: string): LocalPosts {
  const keys = propertyTagKeys(propertySlug);
  if (!keys.length) return { posts: [], tag: '' };

  let tag = '';
  const local = posts.filter((post) => {
    const hit = (post.tags ?? []).find((t) => keys.includes(slugify(t)));
    if (!hit) return false;
    // First hit wins as the link's value: it's the spelling the collection
    // itself uses, so #15 matches it without relying on the loose forms above.
    if (!tag) tag = hit;
    return true;
  });

  return { posts: local, tag };
}

/**
 * `/blogs?category=<tag>` — the listing page, pre-filtered.
 *
 * No tag → the bare listing path. A `?category=` for a tag no post carries
 * would land the reader on a page showing everything with a filter they can't
 * see (#15 ignores an unmatched category), which reads as broken.
 */
export function localBlogsHref(blogsPath: string, tag: string): string {
  const raw = String(blogsPath ?? '').trim() || '/blogs';
  // An absolute URL is used as-is; anything else is normalised to one leading
  // slash and no trailing one, so a missing or doubled slash can't produce a
  // relative link off the current property page.
  const base = /^https?:\/\//i.test(raw) ? raw.replace(/\/+$/, '') : `/${raw.replace(/^\/+|\/+$/g, '')}`;
  if (!tag) return base;
  return `${base}?${new URLSearchParams({ category: tag }).toString()}`;
}
