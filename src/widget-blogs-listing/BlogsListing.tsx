import React, { useEffect, useState } from 'react';
import './BlogsListing.css';
import { ShareIcon, ChevronRight, SOCIALS } from './icons';
import { BLOG_IMAGES, cover } from '@shared/demoImages';
import { hasCollectionsApi } from '@shared/dudaCollections';
import { fetchBlogPosts, type BlogPostData } from '@shared/blogPosts';
import { useSwipe } from '@shared/useSwipe';
import { absolutePostUrl, shareTargets, type SocialProfiles } from '@shared/shareLinks';
import { useSocialProfiles } from '@shared/useSocialProfiles';

// ---------------------------------------------------------------------------
// Posts come from the Duda `BlogPosts` collection (see @shared/blogPosts). The set
// below is the dev-harness fallback only — outside Duda there's no dmAPI to
// read, so without it the harness would render an empty section.
// ---------------------------------------------------------------------------

const DEMO_POSTS: BlogPostData[] = [
  { id: 'b1', title: 'Spring Cleaning Made Simple: Storage Outlet Has Your Back', author: 'Storage Outlet', date: 'Mar 15, 2026 @ 4:30pm', timestamp: 4, excerpt: "Don't start the year off with overflowing closets, stuffed garages, and just too much clutter. Here's how a storage unit can help you reset.", image: BLOG_IMAGES[0], href: '/blogs/spring-cleaning-made-simple', slug: 'spring-cleaning-made-simple' },
  { id: 'b2', title: '5 Tips for Packing a Storage Unit Efficiently', author: 'Storage Outlet', date: 'Mar 10, 2026 @ 1:15pm', timestamp: 3, excerpt: 'Make the most of every square foot. These simple packing strategies help you fit more and keep your belongings easy to reach.', image: BLOG_IMAGES[1], href: '/blogs/packing-a-storage-unit', slug: 'packing-a-storage-unit' },
  { id: 'b3', title: 'How to Choose the Right Storage Unit Size', author: 'Storage Outlet', date: 'Mar 4, 2026 @ 9:00am', timestamp: 2, excerpt: 'From lockers to large drive-up units, picking the right size saves money and hassle. Our guide breaks down what fits where.', image: BLOG_IMAGES[2], href: '/blogs/choosing-a-unit-size', slug: 'choosing-a-unit-size' },
  { id: 'b4', title: 'Climate-Controlled Storage: Is It Worth It?', author: 'Storage Outlet', date: 'Feb 26, 2026 @ 11:45am', timestamp: 1, excerpt: "Temperature swings can damage furniture, electronics, and documents. Here's when climate control is worth the upgrade.", image: BLOG_IMAGES[3], href: '/blogs/climate-controlled-storage', slug: 'climate-controlled-storage' },
];

const CARDS_PER_PAGE = 3;

/** Hold the skeleton back this long so a fast collection read doesn't flash it. */
const SKELETON_DELAY_MS = 200;

/** Stand-in when a row has no thumbnail/mainImage. */
const NO_IMAGE = 'linear-gradient(135deg, #dfe3e8 0%, #c4cdd5 100%)';

// ---------------------------------------------------------------------------
// Blog card
// ---------------------------------------------------------------------------

/** Icon per share key, so the shared target list stays markup-free. */
const ICON_BY_KEY = Object.fromEntries(SOCIALS.map((s) => [s.key, s.Icon]));

/**
 * The card's share popover — all six brand glyphs (Figma 9340:23554).
 *
 * These used to be rendered at `href="#"`, so every one was a dead click. See
 * @shared/shareLinks for what each of the six now resolves to.
 */
function SharePopover({ post, profiles }: { post: BlogPostData; profiles: SocialProfiles }) {
  const url = absolutePostUrl(post.href);

  return (
    <div className="blog-share-pop" role="menu">
      {shareTargets(url, post.title, profiles).map(({ key, label, href }) => {
        const Icon = ICON_BY_KEY[key];
        return (
          <a
            key={key}
            className="blog-social"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            role="menuitem"
          >
            <Icon />
          </a>
        );
      })}
    </div>
  );
}

function BlogCard({ post, profiles }: { post: BlogPostData; profiles: SocialProfiles }) {
  const [shareOpen, setShareOpen] = useState(false);

  // authorName / publishDate can both be blank on a row — build the byline from
  // whichever parts exist so it never reads "By ,".
  const byline = [post.author && `By ${post.author}`, post.date]
    .filter(Boolean)
    .join(',  ');

  const linked = !!post.href && post.href !== '#';

  return (
    <article className="blog-card">
      <div className="blog-card-img" style={{ background: post.image ? cover(post.image) : NO_IMAGE }} />
      <div className="blog-card-body">
        {/* The title is the card's one real link; .blog-card-link stretches its
            hit area over the whole card (see CSS). It can't wrap the card in an
            <a> because the Share button and its popover live inside. */}
        <p className="blog-card-title">
          {linked ? (
            <a className="blog-card-link" href={post.href}>{post.title}</a>
          ) : (
            post.title
          )}
        </p>
        {byline && <p className="blog-card-byline">{byline}</p>}
        {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
        <div className="blog-card-footer">
          <a className="blog-readmore" href={linked ? post.href : '#'} tabIndex={-1}>Read more</a>
          <button className="blog-share" onClick={() => setShareOpen((o) => !o)} aria-expanded={shareOpen}>
            <ShareIcon size={24} />
            Share
          </button>
        </div>
      </div>

      {shareOpen && <SharePopover post={post} profiles={profiles} />}
    </article>
  );
}

/** Placeholder row shown while the collection read is in flight. */
function CardSkeleton() {
  return (
    <>
      <div className="blog-grid" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <article className="blog-card blog-card--skeleton" key={i}>
            <div className="blog-card-img" />
            <div className="blog-card-body">
              <span className="blog-skel blog-skel--title" />
              <span className="blog-skel blog-skel--byline" />
              <span className="blog-skel blog-skel--text" />
              <span className="blog-skel blog-skel--text short" />
            </div>
          </article>
        ))}
      </div>
      <span className="blog-sr-only" role="status">Loading blog posts…</span>
    </>
  );
}

function Dots({ count, active, onPick }: { count: number; active: number; onPick: (i: number) => void }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <button key={i} className={`blog-dot${i === active ? ' active' : ''}`} onClick={() => onPick(i)} aria-label={`Page ${i + 1}`} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface BlogsListingProps {
  heading?: string;
  subheading?: string;
  /** Duda collection name (case-sensitive). */
  collection?: string;
  /**
   * Path of the blog page the post slugs hang off. Cards link at
   * `${blogBasePath}/${slug}`, which is the URL #16 blog-post reads back — keep
   * the two in step or the cards will link past the article page.
   */
  blogBasePath?: string;
}

export function BlogsListing({
  heading = 'Self Storage Blog',
  subheading = 'Tips, guides, and news to help you store smarter — from packing hacks to choosing the right unit.',
  collection = 'BlogPosts',
  blogBasePath = '/blogs',
}: BlogsListingProps) {
  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pastDelay, setPastDelay] = useState(false);
  const [page, setPage] = useState(0);
  const [mobileIdx, setMobileIdx] = useState(0);

  // Brand profile links for the three glyphs that can't carry a share URL.
  const profiles = useSocialProfiles('#12');

  useEffect(() => {
    // No dmAPI means we're not in Duda (dev harness) — show the demo set rather
    // than an empty section, and skip the fetch entirely.
    if (!hasCollectionsApi()) {
      setPosts(DEMO_POSTS);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) setPastDelay(true); }, SKELETON_DELAY_MS);

    fetchBlogPosts(collection, blogBasePath)
      .then((live) => { if (!cancelled) setPosts(live); })
      .catch((err) => console.error('[BlogsListing] fetchBlogPosts error:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; clearTimeout(timer); };
  }, [collection, blogBasePath]);

  // Clamp rather than store-and-correct, so a shrinking post list can't leave us
  // on a page that no longer exists.
  const totalPages = Math.max(1, Math.ceil(posts.length / CARDS_PER_PAGE));
  const current = Math.min(page, totalPages - 1);
  const pagePosts = posts.slice(current * CARDS_PER_PAGE, current * CARDS_PER_PAGE + CARDS_PER_PAGE);
  const mobileCurrent = Math.min(mobileIdx, Math.max(0, posts.length - 1));
  const mobileSwipe = useSwipe({
    onSwipeLeft: () => setMobileIdx((i) => Math.min(posts.length - 1, i + 1)),
    onSwipeRight: () => setMobileIdx((i) => Math.max(0, i - 1)),
  });

  const headingBlock = (
    <div className="blog-heading-block">
      <div className="blog-title">{heading}</div>
      <p className="blog-subtitle">{subheading}</p>
    </div>
  );

  // Still reading: skeleton once past the delay, nothing before it.
  if (loading) {
    if (!pastDelay) return null;
    return (
      <div className="blog-wrapper">
        <div className="blog-desktop">
          {headingBlock}
          <CardSkeleton />
        </div>
      </div>
    );
  }

  // Published collection empty → render nothing rather than a bare heading.
  if (!posts.length) return null;

  return (
    <div className="blog-wrapper">

      {/* ── Desktop ─────────────────────────────────────────────────────── */}
      <div className="blog-desktop">
        {headingBlock}

        <div className="blog-grid">
          {pagePosts.map((post) => (
            <BlogCard key={post.id} post={post} profiles={profiles} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="blog-pagination">
            <button className="blog-page-btn blog-page-btn-prev" onClick={() => setPage(Math.max(0, current - 1))} disabled={current === 0} aria-label="Previous">
              <ChevronRight size={40} />
            </button>
            <Dots count={totalPages} active={current} onPick={setPage} />
            <button className="blog-page-btn" onClick={() => setPage(Math.min(totalPages - 1, current + 1))} disabled={current === totalPages - 1} aria-label="Next">
              <ChevronRight size={40} />
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile ──────────────────────────────────────────────────────── */}
      <div className="blog-mobile">
        <div className="blog-mobile-title">
          <span>Storage Blogs</span>
        </div>
        {/* Dots indicate position, swiping moves — no arrows in this view. */}
        <div {...mobileSwipe.handlers}>
          <BlogCard key={`m-${mobileCurrent}`} post={posts[mobileCurrent]} profiles={profiles} />
        </div>
        {posts.length > 1 && (
          <div className="blog-pagination blog-pagination-dots">
            <Dots count={posts.length} active={mobileCurrent} onPick={setMobileIdx} />
          </div>
        )}
      </div>

    </div>
  );
}
