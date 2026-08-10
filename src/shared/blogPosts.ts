// ===========================================================================
// Blog posts from the Duda `BlogPosts` collection.
//
// Shared by #12 blogs-listing and the #05 space-list "Storage Blogs" accordion
// section, so both read the same collection through the same mapping.
//
// Columns (site d0aa72e3): postId, title, path, status, authorName,
// description, metaTitle, tags, noIndex, mainImage, thumbnail, publishDate,
// creationDate, content.
//
// A card only needs image / title / author / date / excerpt / link, so `content`
// is opt-in (`{ withContent: true }`) — no point holding every post's full HTML
// body in state to render a three-card row. #16 blog-post is the only caller
// that asks for it.
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
  /** Card-sized image URL (thumbnail first), or '' when the row has no image. */
  image: string;
  /**
   * Full-bleed image URL for a hero (mainImage first), or '' when the row has
   * no image. The same two columns as `image` in the opposite order: a card's
   * ~283x184 box wants the thumbnail, a 1347px-wide hero does not.
   */
  heroImage?: string;
  href: string;
  /**
   * Category labels from the row's `tags` column; [] when the column is blank.
   *
   * OPTIONAL on purpose. `fetchBlogPosts` always fills it in, but #12 and the
   * #05 blog section declare their demo fallbacks as `BlogPostData[]` literals
   * without it — keeping this optional means adding it costs those widgets
   * nothing. Read it as `post.tags ?? []`.
   */
  tags?: string[];
  /**
   * The row's raw `path` slug, e.g. "spring-cleaning-made-simple". This is what
   * #16 blog-post matches the browser URL against; `href` is the same value
   * already joined onto the blog base path. Optional for the same reason `tags`
   * is — demo fallbacks are written as plain literals.
   */
  slug?: string;
  /**
   * The post's full HTML body. Only populated when the read asked for it
   * (`fetchBlogPosts(..., { withContent: true })`); '' otherwise.
   */
  content?: string;
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

/**
 * Split the `tags` column into category labels.
 *
 * The column has been seen as a plain string ("Business, Storage Advice") and,
 * on external collections, as a real array — so handle both. Rich text is
 * flattened first, since a rich-text `tags` column arrives as HTML. Order is
 * kept (it's the order the chips appear in) and duplicates dropped.
 */
function parseTags(v: unknown): string[] {
  const parts = Array.isArray(v)
    ? v.map((t) => plainText(t))
    : plainText(v).split(/[,;|]/);
  const out: string[] = [];
  for (const part of parts) {
    const tag = part.trim();
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

// ── Slugs ────────────────────────────────────────────────────────────────────
// A post's public URL is `${blogBasePath}/${slug}` (e.g. /blogs/spring-cleaning),
// so the detail widget's whole job starts with turning the browser's location
// back into one of these rows. Everything below is that round trip.

/** Lowercase, punctuation-free, hyphen-joined — "A Landlord's Guide" → "a-landlords-guide". */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    // Apostrophes close up ("landlord's" → "landlords") rather than becoming a
    // separator, which is how every CMS slug generator behaves.
    .replace(/['‘’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Last meaningful segment of a path or absolute URL, lowercased, with any query
 * string, hash, trailing slash and `.html`-style extension removed.
 * "/blogs/spring-cleaning/?utm=x" → "spring-cleaning".
 */
export function lastSegment(pathOrUrl: string): string {
  const bare = pathOrUrl.split(/[?#]/)[0].replace(/\/+$/, '');
  const seg = bare.slice(bare.lastIndexOf('/') + 1);
  return seg.replace(/\.[a-z0-9]{2,5}$/i, '').toLowerCase();
}

/**
 * The slug the browser is currently on.
 *
 * `?post=` (or `?slug=`) wins so the page can be previewed in the Duda editor
 * and in the dev harness, where the URL is never the real dynamic-page path.
 * Otherwise it's the last segment of the pathname, which on a published
 * /blogs/{slug} dynamic page IS the slug.
 */
export function currentBlogSlug(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get('post') ?? params.get('slug') ?? '';
  if (explicit.trim()) return lastSegment(explicit.trim());
  return lastSegment(window.location.pathname);
}

/**
 * Find the post a slug refers to.
 *
 * Matched against the row's `path`, then its resolved `href`, then a slugified
 * title — in that order of trustworthiness. The title fallback is what keeps
 * rows with a blank `path` column reachable at all; without it they'd link
 * nowhere and this widget could never resolve them.
 */
export function findPostBySlug(posts: BlogPostData[], slug: string): BlogPostData | null {
  const want = lastSegment(slug);
  if (!want) return null;
  for (const post of posts) {
    const candidates = [lastSegment(post.slug ?? ''), lastSegment(post.href), slugify(post.title)];
    if (candidates.some((c) => c && c === want)) return post;
  }
  return null;
}

/** Map one collection row onto the card shape. Returns null if unusable. */
function mapRow(row: CollectionRow, basePath: string, withContent: boolean): BlogPostData | null {
  // Drafts must never reach the live site.
  if (str(row.status).toUpperCase() !== 'PUBLISHED') return null;

  const title = str(row.title);
  if (!title) return null;

  // publishDate is the intended field; creationDate is the safety net.
  const when = parseDate(row.publishDate) ?? parseDate(row.creationDate);
  const path = str(row.path);

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
    // …and the reverse for #16's hero, which is the full column wide.
    heroImage: imageUrl(row.mainImage) || imageUrl(row.thumbnail),
    href: resolveHref(path, basePath),
    // Only #15 blogs-page filters on these; #12 ignores the field.
    tags: parseTags(row.tags),
    // Bare slug (not the joined href) — the value #16 matches the URL against.
    slug: lastSegment(path),
    // `content` is rich text: real HTML that must survive to the renderer, so
    // unlike authorName/description it is NOT flattened here. #16 sanitises it
    // at render time (see @shared/richText).
    content: withContent ? str(row.content) : '',
  };
}

export interface FetchBlogPostsOptions {
  /** Include each row's full HTML body. Off by default — see the file header. */
  withContent?: boolean;
}

/**
 * Read the collection and return published posts, newest first.
 * Empty array when the collection is missing, empty, or we're not in Duda —
 * the caller decides what to show in that case.
 */
export async function fetchBlogPosts(
  collectionName: string,
  basePath: string,
  { withContent = false }: FetchBlogPostsOptions = {},
): Promise<BlogPostData[]> {
  const rows = await readCollection(collectionName);
  return rows
    .map((r) => mapRow(r, basePath, withContent))
    .filter((p): p is BlogPostData => p !== null)
    .sort((a, b) => b.timestamp - a.timestamp);
}
