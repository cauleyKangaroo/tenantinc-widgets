import React, { useEffect, useMemo, useState } from 'react';
import './BlogPost.css';
import { ShareIcon, ChevronRight } from './icons';
import { cover } from '@shared/demoImages';
import { hasCollectionsApi, logSource } from '@shared/dudaCollections';
import {
  fetchBlogPosts,
  findPostBySlug,
  currentBlogSlug,
  type BlogPostData,
} from '@shared/blogPosts';
import { RichText } from '@shared/richText';
import { SOCIAL_ICONS } from '@shared/socialIcons';
import { absolutePostUrl, shareTargets, type SocialProfiles } from '@shared/shareLinks';
import { useSocialProfiles } from '@shared/useSocialProfiles';
import { DEMO_POSTS } from './demoPosts';

// ===========================================================================
// Widget #16 — Blog Post (single article page)
//
// The read view behind #12 / #15's cards. Those link at `${blogBasePath}/${slug}`
// (e.g. /blogs/spring-cleaning-made-simple); this widget sits on the Duda
// dynamic page serving that URL, reads the slug back off `window.location`, and
// renders the matching row of the BlogPosts collection.
//
// WHY THE SLUG COMES FROM THE URL, not from Duda: Duda's dynamic-page binding
// isn't exposed to external-app widgets — there's no "current item" handle to
// ask. But the URL is the binding, so re-deriving the slug from it and matching
// against the collection gets the same answer with no coupling to Duda internals,
// and works identically in the editor (?post=…) and the dev harness. The cost is
// one full collection read to find one row; that read is already how every other
// blog widget on the site works, and the same call supplies Featured Articles,
// so it isn't an extra round trip.
//
// KNOWN CEILING — inherited from `readCollection`: a single `.get()` and Duda's
// pageSize is 100, so only the first 100 published posts are addressable. Post
// 101 renders as not-found. Fixing that needs the collection read to walk `page`.
//
// Figma: desktop 9340:22850 (breadcrumb 9340:22852, title 10630:45432,
//        hero + share 9340:23083, body 9340:23117, featured 9340:23140).
//        No mobile frame was published for this page — the responsive rules
//        below follow the conventions #15 established (900px breakpoint,
//        single-column cards, 20px card padding).
// ===========================================================================

/** Hold the skeleton back this long so a fast collection read doesn't flash it. */
const SKELETON_DELAY_MS = 200;

/** Stand-in when a row has no thumbnail/mainImage. */
const NO_IMAGE = 'linear-gradient(135deg, #dfe3e8 0%, #c4cdd5 100%)';

const DEFAULT_FEATURED_COUNT = 3;

// ---------------------------------------------------------------------------
// Share row
// ---------------------------------------------------------------------------

/** Icon per share key, so the shared target list stays markup-free. */
const ICON_BY_KEY = Object.fromEntries(SOCIAL_ICONS.map((s) => [s.key, s.Icon]));

/** The six brand links, sized for the context. Figma 9340:23554. */
function SocialLinks({ url, title, profiles, size }: {
  url: string;
  title: string;
  profiles: SocialProfiles;
  size: number;
}) {
  return (
    <>
      {shareTargets(url, title, profiles).map(({ key, label, href }) => {
        const Icon = ICON_BY_KEY[key];
        return (
          <a
            key={key}
            className="bpp-social"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
          >
            <Icon size={size} />
          </a>
        );
      })}
    </>
  );
}

/** The article's own share row — always open, under the hero. Figma 9340:23104. */
function ShareRow({ url, title, profiles }: { url: string; title: string; profiles: SocialProfiles }) {
  return (
    <div className="bpp-share-row">
      <span className="bpp-share-label">
        <ShareIcon size={32} />
        Share
      </span>
      <div className="bpp-share-links">
        <SocialLinks url={url} title={title} profiles={profiles} size={32} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Featured article card
//
// Deliberately a copy of #15's card rather than a shared import: no widget in
// this repo reaches into another's directory, and the two are free to diverge.
// ---------------------------------------------------------------------------

interface FeaturedCardProps {
  post: BlogPostData;
  profiles: SocialProfiles;
  shareOpen: boolean;
  onToggleShare: () => void;
}

function FeaturedCard({ post, profiles, shareOpen, onToggleShare }: FeaturedCardProps) {
  const byline = [post.author && `By ${post.author}`, post.date].filter(Boolean).join(',  ');
  const linked = !!post.href && post.href !== '#';

  return (
    <article className="bpp-card">
      <div className="bpp-card-img" style={{ background: post.image ? cover(post.image) : NO_IMAGE }} />
      <div className="bpp-card-body">
        {/* The title is the card's one real link; .bpp-card-link stretches its
            hit area over the whole card (see CSS). It can't wrap the card in an
            <a> because the Share button and its popover live inside. */}
        <p className="bpp-card-title">
          {linked ? <a className="bpp-card-link" href={post.href}>{post.title}</a> : post.title}
        </p>
        {byline && <p className="bpp-card-byline">{byline}</p>}
        {post.excerpt && <p className="bpp-card-excerpt">{post.excerpt}</p>}
        <div className="bpp-card-footer">
          <a className="bpp-readmore" href={linked ? post.href : '#'} tabIndex={-1}>Read more</a>
          <button className="bpp-share" type="button" onClick={onToggleShare} aria-expanded={shareOpen}>
            <ShareIcon size={24} />
            Share
          </button>
        </div>
      </div>

      {/* Figma 9355:20125 — the popover hangs over the card's lower edge. */}
      {shareOpen && (
        <div className="bpp-share-pop" role="menu">
          {/* The card shares ITS OWN post, not the article being read. */}
          <SocialLinks url={absolutePostUrl(post.href)} title={post.title} profiles={profiles} size={26} />
        </div>
      )}
    </article>
  );
}

/** Placeholder shown while the collection read is in flight. */
function PostSkeleton() {
  return (
    <div className="bpp-wrapper" aria-hidden="true">
      <div className="bpp-head">
        <span className="bpp-skel bpp-skel--title" />
        <span className="bpp-skel bpp-skel--title short" />
        <span className="bpp-skel bpp-skel--byline" />
      </div>
      <span className="bpp-skel bpp-skel--hero" />
      <div className="bpp-body">
        {[100, 96, 98, 60].map((w, i) => (
          <span className="bpp-skel bpp-skel--text" key={i} style={{ width: `${w}%` }} />
        ))}
      </div>
      <span className="bpp-sr-only" role="status">Loading article…</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface BlogPostProps {
  /** Duda collection name (case-sensitive). */
  collection?: string;
  /** Path of the blog listing page the post slugs hang off, e.g. "/blogs". */
  blogBasePath?: string;
  /**
   * Pin the widget to one post instead of reading the URL. Normally blank —
   * the slug comes from the dynamic page's own address.
   */
  slug?: string;
  showBreadcrumb?: boolean;
  homeLabel?: string;
  homeHref?: string;
  /** Middle breadcrumb crumb; links to `blogBasePath`. */
  listingLabel?: string;
  featuredHeading?: string;
  /** Cards in the Featured Articles row; 0 hides the section. */
  featuredCount?: number;
  /**
   * Brand profile URLs for the three glyphs that can't carry a share URL. These
   * default to the `Properties` collection's SocialMedia column (the same source
   * the footer uses); set one here only to override or supply a missing link.
   */
  instagramUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
}

/** Duda sends '' for untouched text fields and can send '' for numbers too. */
function intOrDefault(v: number | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function BlogPost({
  collection = 'BlogPosts',
  blogBasePath = '/blogs',
  slug,
  showBreadcrumb = true,
  homeLabel = 'Home',
  homeHref = '/',
  listingLabel = 'Storage Blogs',
  featuredHeading = 'Featured Articles',
  featuredCount,
  instagramUrl,
  youtubeUrl,
  tiktokUrl,
}: BlogPostProps) {
  const featured = intOrDefault(featuredCount, DEFAULT_FEATURED_COUNT);

  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pastDelay, setPastDelay] = useState(false);
  const [openShareId, setOpenShareId] = useState<string | null>(null);

  const profiles = useSocialProfiles('#16', {
    instagram: instagramUrl,
    youtube: youtubeUrl,
    tiktok: tiktokUrl,
  });

  // ── Data ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    // No dmAPI means we're not in Duda (dev harness / site editor) — show the
    // demo set rather than a not-found page, and skip the fetch entirely.
    if (!hasCollectionsApi()) {
      logSource('#16', 'blog post', false, 'no dmAPI — not in Duda');
      setPosts(DEMO_POSTS);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) setPastDelay(true); }, SKELETON_DELAY_MS);

    // One read serves both the article and the Featured Articles row.
    fetchBlogPosts(collection, blogBasePath, { withContent: true })
      .then((live) => {
        if (cancelled) return;
        logSource('#16', 'blog post', true, `${collection}, ${live.length} rows`);
        setPosts(live);
      })
      .catch((err) => console.error('[BlogPost] fetchBlogPosts error:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; clearTimeout(timer); };
  }, [collection, blogBasePath]);

  // ── Derived ───────────────────────────────────────────────────────────────

  // An editor-supplied slug wins; otherwise the page's own URL decides. Read
  // once per render rather than held in state — nothing here re-navigates, and
  // a stale copy would silently show the wrong article.
  const wanted = slug?.trim() ? slug.trim() : currentBlogSlug();
  const post = useMemo(() => findPostBySlug(posts, wanted), [posts, wanted]);

  const related = useMemo(
    () => (post ? posts.filter((p) => p.id !== post.id) : posts).slice(0, featured),
    [posts, post, featured],
  );

  // ── Popover dismissal ─────────────────────────────────────────────────────

  // At most one card popover open at a time, closed by Escape or a click
  // outside any card. Same behaviour as #15's grid.
  useEffect(() => {
    if (!openShareId) return;

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenShareId(null); };
    const onDown = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element) || !target.closest('.bpp-card')) setOpenShareId(null);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [openShareId]);

  // ── Render ────────────────────────────────────────────────────────────────

  // Still reading: skeleton once past the delay, nothing before it.
  if (loading) return pastDelay ? <PostSkeleton /> : null;

  // The slug matched nothing. This is a real state on a live site (an unpublished
  // post, a stale link, a typo), so say so and offer the way back rather than
  // rendering an empty page.
  if (!post) {
    return (
      <div className="bpp-wrapper">
        <div className="bpp-missing">
          <p className="bpp-missing-title">We couldn’t find that article.</p>
          <p className="bpp-missing-text">
            It may have been moved or unpublished.
          </p>
          <a className="bpp-missing-link" href={blogBasePath}>Back to {listingLabel}</a>
        </div>
      </div>
    );
  }

  // Figma pairs author and date with a pipe; either can be blank on a row, so
  // build from whichever parts exist rather than printing a bare separator.
  const byline = [post.author, post.date].filter(Boolean).join(' | ');
  const hero = post.heroImage || post.image;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : post.href;

  return (
    <div className="bpp-wrapper">

      {/* ── Breadcrumb ───────────────────────────────────────────────────────
          Owned by this widget, not the Duda page element: the trailing crumb is
          the post title, which only the resolved row knows.                  */}
      {showBreadcrumb && (
        <nav className="bpp-crumbs" aria-label="Breadcrumb">
          <a className="bpp-crumb-link" href={homeHref}>{homeLabel}</a>
          <ChevronRight size={24} />
          <a className="bpp-crumb-link" href={blogBasePath}>{listingLabel}</a>
          <ChevronRight size={24} />
          <span className="bpp-crumb-current" aria-current="page">{post.title}</span>
        </nav>
      )}

      {/* ── Title ────────────────────────────────────────────────────────── */}
      <header className="bpp-head">
        <h1 className="bpp-title">{post.title}</h1>
        {byline && <p className="bpp-byline">{byline}</p>}
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────
          `heroImage` (mainImage first), not `image` — the latter prefers the
          thumbnail, which is sized for a card and would upscale badly here.
          Decorative: the title directly above says the same thing.          */}
      {hero && <img className="bpp-hero" src={hero} alt="" />}

      <ShareRow url={pageUrl} title={post.title} profiles={profiles} />

      {/* ── Body ─────────────────────────────────────────────────────────────
          `content` is the collection's rich-text column: real HTML, sanitised by
          RichText before it's injected. A row with an empty body falls back to
          the excerpt so the page is never just a headline and a photo.       */}
      <div className="bpp-body">
        <RichText value={post.content?.trim() || post.excerpt} htmlClassName="" />
      </div>

      {/* ── Featured articles ────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="bpp-featured">
          <h2 className="bpp-featured-title">{featuredHeading}</h2>
          <div className="bpp-featured-grid">
            {related.map((p) => (
              <FeaturedCard
                key={p.id}
                post={p}
                profiles={profiles}
                shareOpen={openShareId === p.id}
                onToggleShare={() => setOpenShareId((cur) => (cur === p.id ? null : p.id))}
              />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
