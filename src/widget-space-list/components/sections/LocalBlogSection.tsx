import React, { useEffect, useState } from 'react';
import { BLOG_IMAGES } from '@shared/demoImages';
import { hasCollectionsApi, logSource, str } from '@shared/dudaCollections';
import { fetchBlogPosts, type BlogPostData } from '@shared/blogPosts';
import { readPropertyRow } from '@shared/propertyBinding';
import { localBlogsHref, selectLocalPosts, type LocalPosts } from '@shared/localBlogs';
import { usePropertyId } from '../../propertyContext';
import { BlogCarousel, BlogSkeletonCard } from './BlogSection';

// ===========================================================================
// "Local Blogs" — the posts tagged for THIS property.
//
// Same collection, same card and same carousel as the Storage Blogs section
// above it; the difference is the filter and the "See all blogs" button.
//
// The join is a TAG: a post belongs here when one of its `tags` names the
// property's `slug` (see @shared/localBlogs for the accepted spellings).
// `BlogPosts` has no property column, so there is nothing else to match on.
//
// "See all blogs" hands that same tag to #15 blogs-page as `?category=`, which
// pre-selects the chip and filters the grid — the section is the property-page
// window onto exactly what that link opens.
// ===========================================================================

/** The property the demo posts below are tagged for. */
const DEMO_PROPERTY_SLUG = 'california/irvine/storage-outlet-irvine-340079517';

// ---------------------------------------------------------------------------
// Dev-harness / editor fallback. There's no dmAPI outside a published Duda page,
// so neither the posts nor the property row can be read. These run through the
// REAL filter against DEMO_PROPERTY_SLUG — the third post is deliberately tagged
// for another facility, so the harness shows the filter working rather than a
// list that merely looks right.
// ---------------------------------------------------------------------------

const DEMO_POSTS: BlogPostData[] = [
  { id: 'lb1', title: 'What Irvine Renters Store Most (and How Much Space It Takes)', author: 'Storage Outlet', date: 'Mar 12, 2026 @ 9:00am', timestamp: 3, excerpt: 'Bikes, patio furniture and the spare mattress. A look at what actually fills our Irvine units — and the size we would rent for each.', image: BLOG_IMAGES[0], href: '#', tags: ['Storage Advice', 'storage-outlet-irvine'] },
  { id: 'lb2', title: 'Moving to Irvine? Here’s What to Book First', author: 'Storage Outlet', date: 'Feb 22, 2026 @ 11:30am', timestamp: 2, excerpt: 'Closing dates rarely line up with move-out dates. A short-term unit off Barranca turns a two-day scramble into a move you can pace.', image: BLOG_IMAGES[1], href: '#', tags: ['Moving', 'storage-outlet-irvine'] },
  { id: 'lb3', title: 'Climate Controlled vs. Standard Units', author: 'Storage Outlet', date: 'Feb 14, 2026 @ 2:00pm', timestamp: 1, excerpt: 'Not sure which unit type is right for your belongings? We break down the key differences to help you decide.', image: BLOG_IMAGES[2], href: '#', tags: ['Storage Advice', 'storage-outlet-bellflower'] },
];

// ── Main component ────────────────────────────────────────────────────────────

export interface LocalBlogSectionProps {
  /** Duda collection name (case-sensitive). Default 'BlogPosts'. */
  collection?: string;
  /**
   * Path of the blog page. Posts link at `${blogBasePath}/${slug}` and
   * "See all blogs" lands on `${blogBasePath}?category=<tag>`.
   */
  blogBasePath?: string;
}

export function LocalBlogSection({ collection = 'BlogPosts', blogBasePath = '/blogs' }: LocalBlogSectionProps) {
  // Which facility this Space List is showing — from Duda via SpaceList, '' when
  // unbound. Deliberately NOT cfg.propertyId: that build-time value belongs to a
  // different company on this site, so it would filter against a property that
  // isn't in the collection and quietly show nothing.
  const propertyId = usePropertyId();

  // null = still reading. The posts and the matched tag land together because
  // the tag is a by-product of the filter.
  const [local, setLocal] = useState<LocalPosts | null>(null);

  // This section only mounts when its accordion is opened, so both reads are lazy.
  useEffect(() => {
    if (!hasCollectionsApi()) {
      logSource('#05 local blogs', 'blog posts', false, 'no dmAPI — not in Duda');
      setLocal(selectLocalPosts(DEMO_POSTS, DEMO_PROPERTY_SLUG));
      return;
    }

    let cancelled = false;

    (async () => {
      // Both reads are independent — the property row supplies the slug, the
      // collection supplies the posts — so they go together.
      const [row, posts] = await Promise.all([
        readPropertyRow('#05 local blogs', propertyId),
        fetchBlogPosts(collection, blogBasePath),
      ]);
      if (cancelled) return;

      const slug = str(row?.slug);
      if (!slug) {
        // No slug means nothing to match on, and matching on anything else would
        // invent a relationship. Says so in the console rather than looking like
        // a property with no posts.
        logSource(
          '#05 local blogs', 'property slug', false,
          propertyId ? `no slug on property ${propertyId}` : 'no property bound to this widget',
        );
      }

      const result = selectLocalPosts(posts, slug);
      logSource('#05 local blogs', 'blog posts', true, `${result.posts.length} of ${posts.length} tagged ${result.tag || slug || '(nothing)'}`);
      setLocal(result);
    })().catch((err) => {
      console.error('[LocalBlogSection] read error:', err);
      if (!cancelled) setLocal({ posts: [], tag: '' });
    });

    return () => { cancelled = true; };
  }, [propertyId, collection, blogBasePath]);

  if (!local) return <BlogSkeletonCard />;

  // With no tag there is no filtered listing to send anyone to, so the button
  // points at the whole blog — see localBlogsHref.
  const seeAll = (
    <a className="sl-blog2-see-all" href={localBlogsHref(blogBasePath, local.tag)}>
      See all blogs
    </a>
  );

  // Nothing tagged for this property → say so, and still offer the way out to
  // the full blog. An empty accordion body reads as a broken section.
  if (!local.posts.length) {
    return (
      <div className="sl-blog2">
        <p className="sl-blog2-empty">No blog posts for this location yet.</p>
        <div className="sl-blog2-see-all-row">{seeAll}</div>
      </div>
    );
  }

  return <BlogCarousel posts={local.posts} footer={<div className="sl-blog2-see-all-row">{seeAll}</div>} />;
}
