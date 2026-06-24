import React, { useState, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BlogPost {
  id: number;
  title: string;
  author: string;
  date: string;
  excerpt: string;
  imageBg: string;
}

// ── Placeholder data ──────────────────────────────────────────────────────────

const POSTS: BlogPost[] = [
  { id: 1,  title: 'Spring Cleaning Made Simple: Storage Outlet Has Your Back',    author: 'Storage Outlet', date: 'Mar 15, 2026 @ 4:30pm', excerpt: "Don't start the year off with overflowing closets, stuffed garages, and just too much...", imageBg: 'linear-gradient(135deg, #b0bec5 0%, #78909c 100%)' },
  { id: 2,  title: 'Spring Cleaning Made Simple: Storage Outlet Has Your Back',    author: 'Storage Outlet', date: 'Mar 15, 2026 @ 4:30pm', excerpt: "Don't start the year off with overflowing closets, stuffed garages, and just too much...", imageBg: 'linear-gradient(135deg, #2c2c2c 0%, #5c3d0a 100%)' },
  { id: 3,  title: 'Spring Cleaning Made Simple: Storage Outlet Has Your Back',    author: 'Storage Outlet', date: 'Mar 15, 2026 @ 4:30pm', excerpt: "Don't start the year off with overflowing closets, stuffed garages, and just too much...", imageBg: 'linear-gradient(135deg, #cfd8dc 0%, #90a4ae 100%)' },
  { id: 4,  title: 'How to Pack a Storage Unit Like a Pro',                        author: 'Storage Outlet', date: 'Feb 28, 2026 @ 10:00am', excerpt: 'Maximise every square foot of your storage unit with these expert packing tips and tricks...', imageBg: 'linear-gradient(135deg, #ffe0b2 0%, #ff8f00 100%)' },
  { id: 5,  title: 'Climate Controlled vs. Standard Units: What You Need to Know', author: 'Storage Outlet', date: 'Feb 14, 2026 @ 2:00pm',  excerpt: 'Not sure which unit type is right for your belongings? We break down the key differences...', imageBg: 'linear-gradient(135deg, #c8e6c9 0%, #388e3c 100%)' },
  { id: 6,  title: 'Moving Tips: How Self Storage Makes Relocation Easier',        author: 'Storage Outlet', date: 'Jan 30, 2026 @ 9:00am',  excerpt: 'Whether you are moving across town or across the country, a storage unit can be a game changer...', imageBg: 'linear-gradient(135deg, #e1bee7 0%, #7b1fa2 100%)' },
  { id: 7,  title: 'Top 5 Things You Should Never Put in a Storage Unit',          author: 'Storage Outlet', date: 'Jan 10, 2026 @ 11:00am', excerpt: 'Before you start loading boxes, make sure you know what items are not allowed in your unit...', imageBg: 'linear-gradient(135deg, #ffcdd2 0%, #c62828 100%)' },
  { id: 8,  title: 'Declutter Your Home in a Weekend: A Step-by-Step Guide',       author: 'Storage Outlet', date: 'Dec 20, 2025 @ 3:00pm',  excerpt: 'With the right plan, you can clear out years of clutter in just two days. Here is how...', imageBg: 'linear-gradient(135deg, #fff9c4 0%, #f9a825 100%)' },
  { id: 9,  title: 'Business Storage Solutions for Growing Companies',             author: 'Storage Outlet', date: 'Dec 05, 2025 @ 8:00am',  excerpt: 'Running out of office space? Self storage can offer affordable overflow solutions for businesses...', imageBg: 'linear-gradient(135deg, #b3e5fc 0%, #0277bd 100%)' },
];

const SOCIAL_LINKS = [
  { label: 'Facebook',  icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg> },
  { label: 'Instagram', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg> },
  { label: 'YouTube',   icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg> },
  { label: 'X',         icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  { label: 'LinkedIn',  icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg> },
  { label: 'TikTok',    icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.05a8.16 8.16 0 004.77 1.52V7.12a4.85 4.85 0 01-1-.43z"/></svg> },
];

// ── Responsive cards per page ─────────────────────────────────────────────────

function useCardsPerPage() {
  const getCount = () => {
    if (window.innerWidth <= 767) return 1;
    if (window.innerWidth <= 1024) return 2;
    return 3;
  };
  const [count, setCount] = useState(getCount);
  useEffect(() => {
    const handler = () => setCount(getCount());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return count;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BlogCard({ post }: { post: BlogPost }) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="suf-bl-card">
      <div className="suf-bl-image" style={{ background: post.imageBg }} />
      <div className="suf-bl-body">
        <div className="suf-bl-title">{post.title}</div>
        <div className="suf-bl-meta">By {post.author},&nbsp; {post.date}</div>

        {shareOpen ? (
          <div className="suf-bl-social">
            {SOCIAL_LINKS.map((s) => (
              <a key={s.label} href="#" className="suf-bl-social-icon" aria-label={s.label} title={s.label}>
                {s.icon}
              </a>
            ))}
          </div>
        ) : (
          <p className="suf-bl-excerpt">{post.excerpt}</p>
        )}

        <div className="suf-bl-footer">
          <a href="#" className="suf-bl-read-more">Read more</a>
          <button className="suf-bl-share-btn" onClick={() => setShareOpen((o) => !o)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BlogSection() {
  const [page, setPage] = useState(0);
  const cardsPerPage = useCardsPerPage();
  const totalPages = Math.ceil(POSTS.length / cardsPerPage);
  const visible = POSTS.slice(page * cardsPerPage, page * cardsPerPage + cardsPerPage);

  useEffect(() => { setPage(0); }, [cardsPerPage]);

  return (
    <section className="suf-section suf-section--blog">

      <div className="suf-rv-header">
        <div className="suf-ap-title">Self Storage Blog</div>
        <p className="suf-rv-subtitle">Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac aliquet odio mattis.</p>
      </div>

      <div className="suf-bl-grid">
        {visible.map((p) => <BlogCard key={p.id} post={p} />)}
      </div>

      <div className="suf-nb-pagination">
        <button className="suf-nb-arrow" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button key={i} className={`suf-nb-dot${i === page ? ' active' : ''}`} onClick={() => setPage(i)} />
        ))}
        <button className="suf-nb-arrow" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
      </div>

    </section>
  );
}
