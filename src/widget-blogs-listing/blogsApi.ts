// ===========================================================================
// Blog posts from the Duda `BlogPosts` collection.
//
// Columns (site d0aa72e3): postId, title, path, status, authorName,
// description, metaTitle, tags, noIndex, mainImage, thumbnail, publishDate,
// creationDate, content.
//
// The card only needs image / title / author / date / excerpt / link, so
// `content` is deliberately not read — no point shipping every post's full HTML
// body to render a three-card row.
// ===========================================================================

import { readCollection, str, plainText, imageUrl, parseDate, type CollectionRow } from '@shared/dudaCollections';

export interface BlogPostData {
  id: string;
  title: string;
  author: string;
  /** Pre-formatted for display, e.g. "Mar 15, 2026 @ 4:30pm". */
  date: string;
  /** Sort key — ms since epoch, 0 when the row has no usable date. */
  timestamp: number;
  excerpt: string;
  /** Image URL, or '' when the row has no image. */
  image: string;
  href: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mar 15, 2026 @ 4:30pm" — matches the card's existing byline format. */
function formatDate(d: Date): string {
  const h24 = d.getHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = h24 < 12 ? 'am' : 'pm';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} @ ${h}:${min}${ampm}`;
}

/**
 * Build the post URL from the row's `path` slug.
 * Absolute URLs and root-relative paths are used as-is; anything else is joined
 * onto `basePath` (the blog page's path, e.g. "/blog").
 */
function resolveHref(path: string, basePath: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return path;
  const base = basePath.replace(/\/+$/, '');
  return `${base}/${path.replace(/^\/+/, '')}`;
}

/** Map one collection row onto the card shape. Returns null if unusable. */
function mapRow(row: CollectionRow, basePath: string): BlogPostData | null {
  // Drafts must never reach the live site.
  if (str(row.status).toUpperCase() !== 'PUBLISHED') return null;

  const title = str(row.title);
  if (!title) return null;

  // publishDate is the intended field; creationDate is the safety net.
  const when = parseDate(row.publishDate) ?? parseDate(row.creationDate);

  return {
    id: str(row.postId) || str(row.__rowId) || title,
    title,
    // authorName and description are rich-text columns — they arrive as HTML
    // (e.g. `<p class="rteBlock">StoreLocal</p>`), so flatten to text.
    author: plainText(row.authorName),
    date: when ? formatDate(when) : '',
    timestamp: when ? when.getTime() : 0,
    excerpt: plainText(row.description),
    // thumbnail suits the card's ~283x184 box; mainImage is the fallback.
    image: imageUrl(row.thumbnail) || imageUrl(row.mainImage),
    href: resolveHref(str(row.path), basePath),
  };
}

/**
 * Read the collection and return published posts, newest first.
 * Empty array when the collection is missing, empty, or we're not in Duda —
 * the caller decides what to show in that case.
 */
export async function fetchBlogPosts(
  collectionName: string,
  basePath: string,
): Promise<BlogPostData[]> {
  const rows = await readCollection(collectionName);
  return rows
    .map((r) => mapRow(r, basePath))
    .filter((p): p is BlogPostData => p !== null)
    .sort((a, b) => b.timestamp - a.timestamp);
}
