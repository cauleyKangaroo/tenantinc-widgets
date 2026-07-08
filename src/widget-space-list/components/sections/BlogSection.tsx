import React, { useState } from 'react';
import { BLOG_IMAGES, cover } from '@shared/demoImages';

interface BlogPost {
  id: number;
  title: string;
  author: string;
  date: string;
  excerpt: string;
  imageBg: string;
}

const POSTS: BlogPost[] = [
  {
    id: 1,
    title: 'Spring Cleaning Made Simple: Storage Outlet Has Your Back',
    author: 'Storage Outlet',
    date: 'Mar 15, 2026 @ 4:30pm',
    excerpt: "Don't start the year off with overflowing closets, stuffed garages, and just too much stuff taking over your home.",
    imageBg: cover(BLOG_IMAGES[0]),
  },
  {
    id: 2,
    title: 'How to Pack a Storage Unit Like a Pro',
    author: 'Storage Outlet',
    date: 'Feb 28, 2026 @ 10:00am',
    excerpt: 'Maximise every square foot of your storage unit with these expert packing tips and tricks for a stress-free experience.',
    imageBg: cover(BLOG_IMAGES[1]),
  },
  {
    id: 3,
    title: 'Climate Controlled vs. Standard Units: What You Need to Know',
    author: 'Storage Outlet',
    date: 'Feb 14, 2026 @ 2:00pm',
    excerpt: 'Not sure which unit type is right for your belongings? We break down the key differences to help you decide.',
    imageBg: cover(BLOG_IMAGES[2]),
  },
];

// ── Icons ─────────────────────────────────────────────────────────────────────

function ShareIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BlogSection() {
  const [page, setPage] = useState(0);
  const total = POSTS.length;
  const post = POSTS[page];

  return (
    <div className="sl-blog2">

      {/* Gray background zone with card */}
      <div className="sl-blog2-bg">
        <div className="sl-blog2-card">

          {/* Hero image */}
          <div className="sl-blog2-image" style={{ background: post.imageBg }} />

          {/* Card body */}
          <div className="sl-blog2-body">
            <p className="sl-blog2-title">{post.title}</p>
            <p className="sl-blog2-byline">By {post.author},&nbsp;&nbsp;{post.date}</p>
            <p className="sl-blog2-excerpt">{post.excerpt}</p>
            <div className="sl-blog2-footer">
              <a href="#" className="sl-blog2-read-more">Read more</a>
              <div className="sl-blog2-share">
                <ShareIcon />
                <a href="#" className="sl-blog2-share-link">Share</a>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Pagination */}
      <div className="sl-blog2-pagination">
        <button
          className="sl-blog2-arrow"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="24 12 16 20 24 28"/>
          </svg>
        </button>
        {POSTS.map((_, i) => (
          <button
            key={i}
            className={`sl-blog2-dot${i === page ? ' active' : ''}`}
            onClick={() => setPage(i)}
          />
        ))}
        <button
          className="sl-blog2-arrow"
          onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
          disabled={page === total - 1}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 12 24 20 16 28"/>
          </svg>
        </button>
      </div>

    </div>
  );
}
