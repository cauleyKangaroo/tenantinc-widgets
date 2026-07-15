import React, { useState } from 'react';

type Platform = 'google' | 'yelp';

interface ReviewData {
  id: number;
  author: string;
  rating: number;
  text: string;
  timeAgo: string;
  platform: Platform;
}

const ALL_REVIEWS: ReviewData[] = [
  {
    id: 1, platform: 'google', author: 'Michael Reyes', rating: 5,
    text: '"Great customer service with secure and clean facilities. We have been customers for over 2 years and rent out a climate control unit. We have never had any problems. Would recommend for short term or long term storage needs.."',
    timeAgo: '4 months ago',
  },
  {
    id: 2, platform: 'google', author: 'Lucas Brady', rating: 5,
    text: '"Awesome customer service and super clean, secure facilities! We\'ve been renting a climate-controlled unit for over 2 years and have had zero issues. Totally recommend for both short and long-term storage!"',
    timeAgo: '3 months ago',
  },
  {
    id: 3, platform: 'google', author: 'Jesse Miller', rating: 5,
    text: '"This place is super convenient! It\'s secure, clean, and really well managed. Staff are awesome. Totally recommend storing your stuff here!"',
    timeAgo: '2 months ago',
  },
  {
    id: 4, platform: 'yelp', author: 'Jenny Mongelli', rating: 5,
    text: '"Exceptional customer service at this facility — always secure and impeccably clean. As customers for more than two years, we\'ve had zero issues with our climate-controlled unit. Highly recommend!"',
    timeAgo: '5 months ago',
  },
  {
    id: 5, platform: 'yelp', author: 'David Thompson', rating: 4,
    text: '"Great facility with easy access, well-lit and clean. Staff are friendly and helpful. Would definitely recommend to anyone looking for storage in the area."',
    timeAgo: '1 month ago',
  },
];

const PLATFORM_META: Record<Platform, { label: string; score: number; count: number; starColor: string }> = {
  google:  { label: 'Google',  score: 4.3, count: 264, starColor: '#FFD000' },
  yelp:    { label: 'Yelp',    score: 4.1, count: 87,  starColor: '#D32323' },
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function GoogleLogo() {
  return (
    <svg width="46" height="47" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function YelpLogo() {
  return (
    <svg width="46" height="47" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#D32323"/>
      <text x="24" y="33" textAnchor="middle" fill="white" fontSize="28" fontFamily="Arial, sans-serif" fontWeight="bold">y</text>
    </svg>
  );
}

function PlatformLogo({ platform }: { platform: Platform }) {
  if (platform === 'google') return <GoogleLogo />;
  return <YelpLogo />;
}

function UserCircleIcon() {
  // Pika user-circle, traced from the Figma review-card design.
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" stroke="#101318" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M33.2406 33.5068C33.0627 30.437 30.3927 28 27.125 28H14.875C11.6073 28 8.93731 30.437 8.75944 33.5068M8.75944 33.5068C11.9152 36.5957 16.2352 38.5 21 38.5C25.7648 38.5 30.0848 36.5957 33.2406 33.5068C36.486 30.33 38.5 25.9002 38.5 21C38.5 11.335 30.665 3.5 21 3.5C11.335 3.5 3.5 11.335 3.5 21C3.5 25.9002 5.51402 30.33 8.75944 33.5068ZM26.25 17.5C26.25 20.3995 23.8995 22.75 21 22.75C18.1005 22.75 15.75 20.3995 15.75 17.5C15.75 14.6005 18.1005 12.25 21 12.25C23.8995 12.25 26.25 14.6005 26.25 17.5Z" />
    </svg>
  );
}

// Shared round rating star (matches the Reviews widget). Yelp keeps its red colour.
const ROUND_STAR =
  'M16.5423 5.649L12.0203 4.63275L9.67431 0.562657C9.24231 -0.187552 8.17831 -0.187552 7.74631 0.562657L5.40031 4.63275L0.878308 5.649C0.0453085 5.83655 -0.283691 6.86707 0.282309 7.51841L3.35531 11.0503L2.90631 15.7483C2.82331 16.6137 3.68431 17.2518 4.46631 16.9032L8.71131 15.0164L12.9563 16.9032C13.7383 17.2508 14.5993 16.6137 14.5163 15.7483L14.0673 11.0503L17.1403 7.51841C17.7063 6.86809 17.3773 5.83655 16.5443 5.649H16.5423Z';

function Stars({ rating, size = 14, color = '#FFD000' }: { rating: number; size?: number; color?: string }) {
  const filled = Math.round(rating);
  return (
    <div className="sl-rv2-stars">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 17.15 17" fill={i < filled ? color : '#DFE3E8'} xmlns="http://www.w3.org/2000/svg">
          <path d={ROUND_STAR} />
        </svg>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReviewsSection() {
  const [platform, setPlatform] = useState<Platform>('google');
  const [page, setPage] = useState(0);

  const meta = PLATFORM_META[platform];
  const reviews = ALL_REVIEWS.filter((r) => r.platform === platform);
  const currentReview = reviews[page] ?? reviews[0];
  const total = reviews.length;

  function handlePlatform(p: Platform) {
    setPlatform(p);
    setPage(0);
  }

  return (
    <div className="sl-rv2">

      {/* Platform tabs */}
      <div className="sl-rv2-tabs">
        {(['google', 'yelp'] as Platform[]).map((p) => (
          <button
            key={p}
            className={`sl-rv2-tab${platform === p ? ' active' : ''}`}
            onClick={() => handlePlatform(p)}
          >
            {PLATFORM_META[p].label}
          </button>
        ))}
      </div>

      {/* Rating summary */}
      <div className="sl-rv2-summary">
        <div className="sl-rv2-summary-left">
          <PlatformLogo platform={platform} />
          <span className="sl-rv2-score">{meta.score}</span>
          <span className="sl-rv2-out-of">/ 5</span>
        </div>
        <div className="sl-rv2-summary-right">
          <Stars rating={meta.score} size={17} color={meta.starColor} />
          <span className="sl-rv2-count">{meta.count} ratings</span>
        </div>
      </div>

      {/* Review card */}
      {currentReview && (
        <div className="sl-rv2-card">
          <div className="sl-rv2-card-header">
            <UserCircleIcon />
            <div className="sl-rv2-author-info">
              <p className="sl-rv2-author">{currentReview.author}</p>
              <Stars rating={currentReview.rating} size={14} color={meta.starColor} />
            </div>
          </div>
          <p className="sl-rv2-text">{currentReview.text}</p>
          <p className="sl-rv2-time">{currentReview.timeAgo}</p>
        </div>
      )}

      {/* Pagination */}
      {total > 1 && (
        <div className="sl-rv2-pagination">
          <button
            className="sl-rv2-arrow"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 8 11 14 17 20"/>
            </svg>
          </button>
          {reviews.map((_, i) => (
            <button
              key={i}
              className={`sl-rv2-dot${i === page ? ' active' : ''}`}
              onClick={() => setPage(i)}
            />
          ))}
          <button
            className="sl-rv2-arrow"
            onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
            disabled={page === total - 1}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 8 17 14 11 20"/>
            </svg>
          </button>
        </div>
      )}

    </div>
  );
}
