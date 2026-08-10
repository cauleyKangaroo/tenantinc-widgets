import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './BlogsPage.css';
import { ShareIcon, FilterHorizontalIcon, SearchIcon, PillRemoveIcon, CloseIcon } from './icons';
import { BLOG_IMAGES, cover } from '@shared/demoImages';
import { hasCollectionsApi, logSource } from '@shared/dudaCollections';
import { fetchBlogPosts, type BlogPostData } from '@shared/blogPosts';
import { SOCIAL_ICONS } from '@shared/socialIcons';
import { absolutePostUrl, shareTargets, type SocialProfiles } from '@shared/shareLinks';
import { useSocialProfiles } from '@shared/useSocialProfiles';

// ===========================================================================
// Widget #15 — Blogs Page (full-page blog listing)
//
// The page-level counterpart to #12 blogs-listing. #12 is a SECTION widget:
// three cards, prev/dots/next pagination, no filtering. This one is the whole
// blog index — a tag filter row on the left, a search field on the right, and a
// three-column grid that lazy-loads more cards as the reader scrolls.
//
// #12 is untouched by design: it still ships on the Property Landing Page and
// must keep behaving exactly as it does. The card markup here is a deliberate
// copy of #12's rather than a shared import, so the two can diverge (they
// already do — see the line-clamp note on .bpg-card-title) without either one
// having to grow a variant prop.
//
// Scope: filter bar + grid only. The Figma page also draws a breadcrumb and an
// 80px "Self Storage Blogs" hero above this; those come from the Duda page,
// which already has its own breadcrumb element and section heading.
//
// KNOWN CEILING — the lazy load is client-side. `readCollection` does a single
// `.get()` and Duda's pageSize is 100 (see @shared/dudaCollections), so this
// slices at most the first 100 published posts. Going beyond that needs the
// collection read itself to walk `page`, which is not done here.
//
// Figma: desktop page 9340:23282 (bar 9340:23520, card 9340:23540),
//        mobile page 10640:65677 (bar 10640:65983).
// ===========================================================================

// ---------------------------------------------------------------------------
// Dev-harness fallback. Outside Duda there's no dmAPI to read, so without this
// the harness would render an empty page. Nine posts so the full 3x3 grid, the
// chip row and the "More" panel are all exercised.
// ---------------------------------------------------------------------------

const DEMO_POSTS: BlogPostData[] = [
  { id: 'b1', title: 'Spring Cleaning Made Simple: Storage Outlet Has Your Back', author: 'Storage Outlet', date: 'Mar 15, 2026 @ 4:30pm', timestamp: 9, excerpt: "Don't start the year off with overflowing closets, stuffed garages, and just too much clutter. Here's how a storage unit can help you reset.", image: BLOG_IMAGES[0], href: '/blogs/spring-cleaning-made-simple', slug: 'spring-cleaning-made-simple', tags: ['Storage Advice'] },
  { id: 'b2', title: '5 Tips for Packing a Storage Unit Efficiently', author: 'Storage Outlet', date: 'Mar 10, 2026 @ 1:15pm', timestamp: 8, excerpt: 'Make the most of every square foot. These simple packing strategies help you fit more and keep your belongings easy to reach.', image: BLOG_IMAGES[1], href: '/blogs/packing-a-storage-unit', slug: 'packing-a-storage-unit', tags: ['Packing', 'Storage Advice'] },
  { id: 'b3', title: 'How to Choose the Right Storage Unit Size', author: 'Storage Outlet', date: 'Mar 4, 2026 @ 9:00am', timestamp: 7, excerpt: 'From lockers to large drive-up units, picking the right size saves money and hassle. Our guide breaks down what fits where.', image: BLOG_IMAGES[2], href: '/blogs/choosing-a-unit-size', slug: 'choosing-a-unit-size', tags: ['Storage Advice'] },
  { id: 'b4', title: 'Climate-Controlled Storage: Is It Worth It?', author: 'Storage Outlet', date: 'Feb 26, 2026 @ 11:45am', timestamp: 6, excerpt: "Temperature swings can damage furniture, electronics, and documents. Here's when climate control is worth the upgrade.", image: BLOG_IMAGES[3], href: '/blogs/climate-controlled-storage', slug: 'climate-controlled-storage', tags: ['Technology'] },
  { id: 'b5', title: 'Got boxes? Everything you need to know about cardboard.', author: 'Storage Outlet', date: 'Feb 18, 2026 @ 8:20am', timestamp: 5, excerpt: 'Single wall, double wall, wardrobe, dish barrel — a plain-English tour of the boxes worth buying and the ones worth skipping.', image: BLOG_IMAGES[4], href: '/blogs/got-boxes', slug: 'got-boxes', tags: ['Packing'] },
  { id: 'b6', title: 'Storing Business Inventory Without Renting a Warehouse', author: 'Storage Outlet', date: 'Feb 9, 2026 @ 3:05pm', timestamp: 4, excerpt: 'Seasonal stock, sample cases, trade-show kit — how small businesses use self storage as flexible overflow space.', image: BLOG_IMAGES[5], href: '/blogs/storing-business-inventory', slug: 'storing-business-inventory', tags: ['Business'] },
  { id: 'b7', title: 'Smart Locks and 24/7 Access: Storage Tech in 2026', author: 'Storage Outlet', date: 'Jan 30, 2026 @ 10:00am', timestamp: 3, excerpt: 'App-controlled gates, unit-level sensors, and video that actually helps. What the new hardware changes for renters.', image: BLOG_IMAGES[0], href: '/blogs/smart-locks-and-24-7-access', slug: 'smart-locks-and-24-7-access', tags: ['Technology'] },
  { id: 'b8', title: 'Moving Across Town? Use Storage as a Staging Area', author: 'Storage Outlet', date: 'Jan 21, 2026 @ 2:40pm', timestamp: 2, excerpt: 'Closing dates rarely line up. A short-term unit turns a stressful two-day scramble into a move you can pace.', image: BLOG_IMAGES[1], href: '/blogs/moving-across-town', slug: 'moving-across-town', tags: ['Moving', 'Storage Advice'] },
  { id: 'b9', title: 'A Landlord’s Guide to Turnover Storage', author: 'Storage Outlet', date: 'Jan 12, 2026 @ 9:30am', timestamp: 1, excerpt: 'Appliances, spare fixtures, and tenant leave-behinds add up fast. Keeping them off-site keeps units rentable.', image: BLOG_IMAGES[2], href: '/blogs/landlords-guide-to-turnover-storage', slug: 'landlords-guide-to-turnover-storage', tags: ['Business', 'Moving'] },
];

/** Hold the skeleton back this long so a fast collection read doesn't flash it. */
const SKELETON_DELAY_MS = 200;

/** Start the next batch before the reader hits the bottom. */
const PREFETCH_MARGIN = '400px';

/** Stand-in when a row has no thumbnail/mainImage. */
const NO_IMAGE = 'linear-gradient(135deg, #dfe3e8 0%, #c4cdd5 100%)';

const DEFAULT_BATCH_SIZE = 9;
const DEFAULT_VISIBLE_TAGS = 3;

// ---------------------------------------------------------------------------
// Blog card
// ---------------------------------------------------------------------------

/** Icon per share key, so the shared target list stays markup-free. */
const ICON_BY_KEY = Object.fromEntries(SOCIAL_ICONS.map((s) => [s.key, s.Icon]));

/**
 * The card's share popover — all six brand glyphs (Figma 9340:23554).
 *
 * These used to be rendered at `href="#"`, so every one was a dead click. See
 * @shared/shareLinks for what each of the six now resolves to.
 */
function SharePopover({ post, profiles }: { post: BlogPostData; profiles: SocialProfiles }) {
  const url = absolutePostUrl(post.href);

  return (
    <div className="bpg-share-pop" role="menu">
      {shareTargets(url, post.title, profiles).map(({ key, label, href }) => {
        const Icon = ICON_BY_KEY[key];
        return (
          <a
            key={key}
            className="bpg-social"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            role="menuitem"
          >
            <Icon size={26} />
          </a>
        );
      })}
    </div>
  );
}

interface BlogCardProps {
  post: BlogPostData;
  profiles: SocialProfiles;
  shareOpen: boolean;
  onToggleShare: () => void;
}

function BlogCard({ post, profiles, shareOpen, onToggleShare }: BlogCardProps) {
  // authorName / publishDate can both be blank on a row — build the byline from
  // whichever parts exist so it never reads "By ,".
  const byline = [post.author && `By ${post.author}`, post.date].filter(Boolean).join(',  ');

  const linked = !!post.href && post.href !== '#';

  return (
    <article className="bpg-card">
      <div className="bpg-card-img" style={{ background: post.image ? cover(post.image) : NO_IMAGE }} />
      <div className="bpg-card-body">
        {/* The title is the card's one real link; .bpg-card-link stretches its
            hit area over the whole card (see CSS). It can't wrap the card in an
            <a> because the Share button and its popover live inside. */}
        <p className="bpg-card-title">
          {linked ? (
            <a className="bpg-card-link" href={post.href}>{post.title}</a>
          ) : (
            post.title
          )}
        </p>
        {byline && <p className="bpg-card-byline">{byline}</p>}
        {post.excerpt && <p className="bpg-card-excerpt">{post.excerpt}</p>}
        <div className="bpg-card-footer">
          <a className="bpg-readmore" href={linked ? post.href : '#'} tabIndex={-1}>Read more</a>
          <button className="bpg-share" type="button" onClick={onToggleShare} aria-expanded={shareOpen}>
            <ShareIcon size={24} />
            Share
          </button>
        </div>
      </div>

      {shareOpen && <SharePopover post={post} profiles={profiles} />}
    </article>
  );
}

/** Placeholder cards shown while the collection read is in flight. */
function CardSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <article className="bpg-card bpg-card--skeleton" key={i}>
          <div className="bpg-card-img" />
          <div className="bpg-card-body">
            <span className="bpg-skel bpg-skel--title" />
            <span className="bpg-skel bpg-skel--byline" />
            <span className="bpg-skel bpg-skel--text" />
            <span className="bpg-skel bpg-skel--text short" />
          </div>
        </article>
      ))}
    </>
  );
}

/** Pill-shaped placeholders so the real chip labels don't flash in. */
function BarSkeleton() {
  return (
    <div className="bpg-bar" aria-hidden="true">
      <div className="bpg-bar-left">
        <span className="bpg-skel bpg-skel--pill" style={{ width: 44 }} />
        <div className="bpg-chips">
          {[111, 160, 133].map((w, i) => (
            <span className="bpg-skel bpg-skel--pill" key={i} style={{ width: w }} />
          ))}
        </div>
      </div>
      <span className="bpg-skel bpg-skel--field" />
    </div>
  );
}

/** Chip used in the bar and in the tag panel. */
function TagChip({ tag, active, onToggle }: { tag: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`bpg-chip${active ? ' active' : ''}`}
      onClick={onToggle}
      aria-pressed={active}
    >
      {active && <span className="bpg-chip-x"><PillRemoveIcon /></span>}
      <span>{tag}</span>
    </button>
  );
}

interface FilterPopupProps {
  tags: string[];
  activeTags: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
  onClose: () => void;
}

/**
 * All-categories picker (Figma 10630:52147 — "Side panel").
 *
 * A lightbox rather than the drop-down strip this used to be: on mobile the
 * inline chip row is hidden entirely, so this is the ONLY way to the tags and it
 * needs the whole screen to show a long category list. Desktop matches the
 * property landing page's filter lightbox (SpaceList's .sl-filter-modal —
 * 436px, centred, 20px radius) so the two read as one system; mobile goes
 * edge-to-edge full screen.
 */
function FilterPopup({ tags, activeTags, onToggle, onClear, onClose }: FilterPopupProps) {
  // Escape closes; lock host-page scroll for as long as the lightbox is up —
  // full screen on mobile means the page behind it must not scroll away.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const activeCount = activeTags.length;

  return (
    <div className="bpg-modal-overlay" onClick={onClose}>
      <div
        className="bpg-filter-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Filter by category"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bpg-modal-header">
          <div className="bpg-modal-title-row">
            <span className="bpg-modal-icon"><FilterHorizontalIcon size={20} /></span>
            <span className="bpg-modal-title">Filters</span>
            {activeCount > 0 && <span className="bpg-modal-badge">{activeCount}</span>}
          </div>
          <div className="bpg-modal-header-right">
            {activeCount > 0 && (
              <button type="button" className="bpg-modal-reset" onClick={onClear}>Clear all</button>
            )}
            <button type="button" className="bpg-modal-close" onClick={onClose} aria-label="Close filters">
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="bpg-modal-separator" />

        <div className="bpg-modal-body">
          <div className="bpg-modal-group">
            <div className="bpg-modal-group-title">Categories</div>
            <div className="bpg-modal-chips">
              {tags.map((tag) => (
                <TagChip key={tag} tag={tag} active={activeTags.includes(tag)} onToggle={() => onToggle(tag)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface BlogsPageProps {
  /** Duda collection name (case-sensitive). */
  collection?: string;
  /**
   * Path of the blog page the post slugs hang off. Cards link at
   * `${blogBasePath}/${slug}`, which is the URL #16 blog-post reads back — keep
   * the two in step or the cards will link past the article page.
   */
  blogBasePath?: string;
  searchPlaceholder?: string;
  /** Chips shown inline before the "More" chip; the rest live in the panel. */
  visibleTagCount?: number;
  /** Cards added per lazy-load batch (also the initial count). */
  batchSize?: number;
}

/** Duda sends '' for untouched text fields and can send '' for numbers too. */
function positiveInt(v: number | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

export function BlogsPage({
  collection = 'BlogPosts',
  blogBasePath = '/blogs',
  searchPlaceholder = 'Search Blog',
  visibleTagCount,
  batchSize,
}: BlogsPageProps) {
  const inlineTagCount = positiveInt(visibleTagCount, DEFAULT_VISIBLE_TAGS);
  const perBatch = positiveInt(batchSize, DEFAULT_BATCH_SIZE);
  const placeholder = searchPlaceholder.trim() || 'Search Blog';

  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pastDelay, setPastDelay] = useState(false);

  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [shown, setShown] = useState(perBatch);
  const [openShareId, setOpenShareId] = useState<string | null>(null);

  // Brand profile links for the three glyphs that can't carry a share URL.
  const profiles = useSocialProfiles('#15');

  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    // No dmAPI means we're not in Duda (dev harness / site editor) — show the
    // demo set rather than an empty page, and skip the fetch entirely.
    if (!hasCollectionsApi()) {
      logSource('#15', 'blog posts', false, 'no dmAPI — not in Duda');
      setPosts(DEMO_POSTS);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) setPastDelay(true); }, SKELETON_DELAY_MS);

    fetchBlogPosts(collection, blogBasePath)
      .then((live) => {
        if (cancelled) return;
        logSource('#15', 'blog posts', true, `${collection}, ${live.length} rows`);
        setPosts(live);
      })
      .catch((err) => console.error('[BlogsPage] fetchBlogPosts error:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; clearTimeout(timer); };
  }, [collection, blogBasePath]);

  // ── Derived ───────────────────────────────────────────────────────────────

  // First-seen order across a newest-first list, so the leading chips are the
  // categories the site is publishing in right now.
  const allTags = useMemo(() => {
    const out: string[] = [];
    for (const post of posts) {
      for (const tag of post.tags ?? []) {
        if (!out.includes(tag)) out.push(tag);
      }
    }
    return out;
  }, [posts]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return posts.filter((post) => {
      const tags = post.tags ?? [];
      // OR within tags: a post shows if it carries ANY of the active ones.
      if (activeTags.length && !activeTags.some((t) => tags.includes(t))) return false;
      if (!term) return true;
      return [post.title, post.author, post.excerpt, ...tags].join(' ').toLowerCase().includes(term);
    });
  }, [posts, activeTags, query]);

  // Clamp rather than store-and-correct, so a narrowing filter can't leave us
  // claiming to show more cards than exist.
  const visibleCount = Math.min(shown, filtered.length);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Chips visible inline; the rest are only reachable through the panel. On
  // mobile the inline row is hidden entirely (CSS) and the panel is the only way in.
  const inlineTags = allTags.slice(0, inlineTagCount);
  const hasHiddenTags = allTags.length > inlineTags.length;

  // ── Filter / search interaction ────────────────────────────────────────────

  // Any change to the result set restarts the lazy load from the first batch —
  // otherwise switching filters would keep a deep scroll position's worth of
  // cards mounted for a much shorter list.
  const resetBatches = useCallback(() => setShown(perBatch), [perBatch]);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
    resetBatches();
  }, [resetBatches]);

  const clearFilters = useCallback(() => {
    setActiveTags([]);
    setQuery('');
    resetBatches();
  }, [resetBatches]);

  // Editor changes to batchSize should take effect without a remount.
  useEffect(() => { setShown(perBatch); }, [perBatch]);

  // ── Lazy load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (shown >= filtered.length) return;

    // jsdom (the smoke test) and older browsers have no IntersectionObserver.
    // Rendering everything is the right degradation — a sentinel that can never
    // fire would strand the reader on the first batch with no way forward.
    if (typeof IntersectionObserver === 'undefined') {
      setShown(filtered.length);
      return;
    }

    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown((s) => s + perBatch);
        }
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
    // `shown` HAS to be a dependency. An IntersectionObserver only fires on a
    // change of intersection, so once the sentinel is in view and stays in view
    // (a short list, a tall viewport, or a fast scroll to the bottom) it never
    // fires a second time. Tearing the observer down and re-observing after each
    // batch re-evaluates from scratch, which is what keeps the batches coming.
    // The guard above terminates it — `shown` overshoots `filtered.length` on
    // the last batch, so the effect returns before creating another observer.
  }, [shown, filtered.length, perBatch]);

  // ── Dismissals ────────────────────────────────────────────────────────────

  // At most one share popover open at a time, closed by Escape or a click
  // outside. With nine cards on screen, leaving popovers open as the reader
  // moves down the grid gets messy fast. (The filter lightbox owns its own
  // Escape / click-outside handling — see FilterPopup.)
  useEffect(() => {
    if (!openShareId) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenShareId(null);
    };
    const onDown = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element) || !target.closest('.bpg-card')) setOpenShareId(null);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [openShareId]);

  // ── Render ────────────────────────────────────────────────────────────────

  // Still reading: skeleton once past the delay, nothing before it — never paint
  // the demo constants first.
  if (loading) {
    if (!pastDelay) return null;
    return (
      <div className="bpg-wrapper">
        <BarSkeleton />
        <div className="bpg-grid">
          <CardSkeletons count={3} />
        </div>
        <span className="bpg-sr-only" role="status">Loading blog posts…</span>
      </div>
    );
  }

  // Published collection empty → render nothing rather than a bare filter bar.
  if (!posts.length) return null;

  const activeCount = activeTags.length;

  return (
    <div className="bpg-wrapper">

      {/* ── Filter / search bar ─────────────────────────────────────────────── */}
      <div className="bpg-bar">
        <div className="bpg-bar-left">
          {allTags.length > 0 && (
            <button
              type="button"
              className={`bpg-filter-btn${panelOpen ? ' active' : ''}`}
              onClick={() => setPanelOpen((o) => !o)}
              aria-label="Filter by category"
              aria-expanded={panelOpen}
              title="Filter by category"
            >
              <FilterHorizontalIcon />
              {activeCount > 0 && <span className="bpg-filter-badge">{activeCount}</span>}
            </button>
          )}

          <div className="bpg-chips">
            {inlineTags.map((tag) => (
              <TagChip key={tag} tag={tag} active={activeTags.includes(tag)} onToggle={() => toggleTag(tag)} />
            ))}
            {hasHiddenTags && (
              <button type="button" className="bpg-chip bpg-chip-more" onClick={() => setPanelOpen((o) => !o)}>
                More
              </button>
            )}
          </div>
        </div>

        <div className="bpg-search">
          <input
            ref={searchInputRef}
            className="bpg-search-input"
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); resetBatches(); }}
            aria-label={placeholder}
          />
          {/* Filtering is live on change, so this only puts the caret back in
              the field — it has nothing to submit. */}
          <button
            type="button"
            className="bpg-search-btn"
            aria-label="Search"
            onClick={() => searchInputRef.current?.focus()}
          >
            <SearchIcon />
          </button>
        </div>
      </div>

      {/* ── All-categories popup ────────────────────────────────────────────── */}
      {panelOpen && allTags.length > 0 && (
        <FilterPopup
          tags={allTags}
          activeTags={activeTags}
          onToggle={toggleTag}
          onClear={() => { setActiveTags([]); resetBatches(); }}
          onClose={() => setPanelOpen(false)}
        />
      )}

      {/* ── Grid ─────────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bpg-empty">
          <p className="bpg-empty-text">
            {query.trim() ? <>No posts match “{query.trim()}”.</> : 'No posts in the selected categories.'}
          </p>
          <button type="button" className="bpg-empty-reset" onClick={clearFilters}>Clear filters</button>
        </div>
      ) : (
        <>
          <div className="bpg-grid">
            {visible.map((post) => (
              <BlogCard
                key={post.id}
                post={post}
                profiles={profiles}
                shareOpen={openShareId === post.id}
                onToggleShare={() => setOpenShareId((cur) => (cur === post.id ? null : post.id))}
              />
            ))}
            {hasMore && <CardSkeletons count={Math.min(3, filtered.length - visibleCount)} />}
          </div>

          {/* Crossing into view (400px early) appends the next batch. */}
          {hasMore && <div className="bpg-sentinel" ref={sentinelRef} aria-hidden="true" />}

          <span className="bpg-sr-only" role="status">
            {`Showing ${visibleCount} of ${filtered.length} blog posts`}
          </span>
        </>
      )}

    </div>
  );
}
