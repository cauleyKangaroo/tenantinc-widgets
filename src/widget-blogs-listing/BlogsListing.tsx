import React, { useState } from 'react';
import './BlogsListing.css';
import { ShareIcon, FileTextIcon, ChevronRight, SOCIALS } from './icons';
import { BLOG_IMAGES, cover } from '@shared/demoImages';

// ---------------------------------------------------------------------------
// Types + demo data
// ---------------------------------------------------------------------------

interface BlogPost {
  id: string;
  title: string;
  author: string;
  date: string;
  excerpt: string;
  /** CSS gradient placeholder until live cover images are wired in. */
  image: string;
  href: string;
}

const POSTS: BlogPost[] = [
  { id: 'b1', title: 'Spring Cleaning Made Simple: Storage Outlet Has Your Back', author: 'Storage Outlet', date: 'Mar 15, 2026 @ 4:30pm', excerpt: "Don't start the year off with overflowing closets, stuffed garages, and just too much clutter. Here's how a storage unit can help you reset.", image: cover(BLOG_IMAGES[0]), href: '#' },
  { id: 'b2', title: '5 Tips for Packing a Storage Unit Efficiently', author: 'Storage Outlet', date: 'Mar 10, 2026 @ 1:15pm', excerpt: 'Make the most of every square foot. These simple packing strategies help you fit more and keep your belongings easy to reach.', image: cover(BLOG_IMAGES[1]), href: '#' },
  { id: 'b3', title: 'How to Choose the Right Storage Unit Size', author: 'Storage Outlet', date: 'Mar 4, 2026 @ 9:00am', excerpt: 'From lockers to large drive-up units, picking the right size saves money and hassle. Our guide breaks down what fits where.', image: cover(BLOG_IMAGES[2]), href: '#' },
  { id: 'b4', title: 'Climate-Controlled Storage: Is It Worth It?', author: 'Storage Outlet', date: 'Feb 26, 2026 @ 11:45am', excerpt: 'Temperature swings can damage furniture, electronics, and documents. Here\'s when climate control is worth the upgrade.', image: cover(BLOG_IMAGES[3]), href: '#' },
  { id: 'b5', title: 'Moving Soon? A Stress-Free Storage Checklist', author: 'Storage Outlet', date: 'Feb 18, 2026 @ 3:20pm', excerpt: 'Keep your move organized from start to finish with our printable checklist covering everything from boxes to insurance.', image: cover(BLOG_IMAGES[4]), href: '#' },
  { id: 'b6', title: 'Business Storage Solutions for Growing Companies', author: 'Storage Outlet', date: 'Feb 9, 2026 @ 10:05am', excerpt: 'Inventory, equipment, and records add up fast. See how flexible storage keeps your workspace clear and your costs down.', image: cover(BLOG_IMAGES[5]), href: '#' },
];

const CARDS_PER_PAGE = 3;

// ---------------------------------------------------------------------------
// Blog card
// ---------------------------------------------------------------------------

function BlogCard({ post }: { post: BlogPost }) {
  const [shareOpen, setShareOpen] = useState(false);
  return (
    <article className="blog-card">
      <div className="blog-card-img" style={{ background: post.image }} />
      <div className="blog-card-body">
        <p className="blog-card-title">{post.title}</p>
        <p className="blog-card-byline">By {post.author},&nbsp; {post.date}</p>
        <p className="blog-card-excerpt">{post.excerpt}</p>
        <div className="blog-card-footer">
          <a className="blog-readmore" href={post.href}>Read more</a>
          <button className="blog-share" onClick={() => setShareOpen((o) => !o)} aria-expanded={shareOpen}>
            <ShareIcon size={24} />
            Share
          </button>
        </div>
      </div>

      {shareOpen && (
        <div className="blog-share-pop" role="menu">
          {SOCIALS.map(({ key, label, Icon }) => (
            <a key={key} className="blog-social" href="#" aria-label={label} title={label}>
              <Icon />
            </a>
          ))}
        </div>
      )}
    </article>
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
}

export function BlogsListing({
  heading = 'Self Storage Blog',
  subheading = 'Tips, guides, and news to help you store smarter — from packing hacks to choosing the right unit.',
}: BlogsListingProps) {
  const totalPages = Math.ceil(POSTS.length / CARDS_PER_PAGE);
  const [page, setPage] = useState(0);
  const [mobileIdx, setMobileIdx] = useState(0);

  const pagePosts = POSTS.slice(page * CARDS_PER_PAGE, page * CARDS_PER_PAGE + CARDS_PER_PAGE);

  return (
    <div className="blog-wrapper">

      {/* ── Desktop ─────────────────────────────────────────────────────── */}
      <div className="blog-desktop">
        <div className="blog-heading-block">
          <div className="blog-title">{heading}</div>
          <p className="blog-subtitle">{subheading}</p>
        </div>

        <div className="blog-grid">
          {pagePosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="blog-pagination">
            <button className="blog-page-btn blog-page-btn-prev" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous">
              <ChevronRight size={40} />
            </button>
            <Dots count={totalPages} active={page} onPick={setPage} />
            <button className="blog-page-btn" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} aria-label="Next">
              <ChevronRight size={40} />
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile ──────────────────────────────────────────────────────── */}
      <div className="blog-mobile">
        <div className="blog-mobile-title">
          <FileTextIcon size={24} />
          <span>Storage Blogs</span>
        </div>
        <BlogCard key={`m-${mobileIdx}`} post={POSTS[mobileIdx]} />
        {POSTS.length > 1 && (
          <div className="blog-pagination blog-pagination-dots">
            <Dots count={POSTS.length} active={mobileIdx} onPick={setMobileIdx} />
          </div>
        )}
      </div>

    </div>
  );
}
