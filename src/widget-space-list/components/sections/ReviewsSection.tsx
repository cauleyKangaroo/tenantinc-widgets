import React from 'react';

// ── Platform logos ────────────────────────────────────────────────────────────

function GoogleLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.9 3 4 11.9 4 23s8.9 20 20 20c11 0 19.7-7.7 19.7-20 0-1.3-.1-2.7-.2-3z"/>
      <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.7 0-14.4 4.4-17.7 11.7z"/>
      <path fill="#FBBC05" d="M24 43c5.8 0 10.7-1.9 14.3-5.2l-6.6-5.4C29.9 34.2 27.1 35 24 35c-5.8 0-10.7-3.9-12.5-9.2l-7 5.4C7.9 38.6 15.4 43 24 43z"/>
      <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.6-2.6 4.8-4.9 6.3l6.6 5.4C41.7 36.7 44.5 30.3 44.5 23c0-1-.1-2-.0-3z"/>
    </svg>
  );
}

function YelpLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#D32323"/>
      <text x="24" y="32" textAnchor="middle" fill="white" fontSize="26" fontFamily="Arial, sans-serif" fontWeight="bold">y</text>
    </svg>
  );
}

function ReviewsLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#509e2f"/>
      <path fill="white" d="M24 10l3.1 9.5H37l-8 5.8 3.1 9.5L24 29l-8.1 5.8 3.1-9.5-8-5.8h9.9z"/>
    </svg>
  );
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="suf-rv-stars" style={{ color }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(rating) ? 'suf-rv-star filled' : 'suf-rv-star'}>★</span>
      ))}
    </div>
  );
}

// ── Placeholder data ──────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'google', Logo: GoogleLogo, score: 4.3, count: 264, color: '#FBBC05', url: '#' },
  { id: 'yelp',   Logo: YelpLogo,   score: 4.9, count: 76,  color: '#D32323', url: '#' },
  { id: 'other',  Logo: ReviewsLogo, score: 4.2, count: 15, color: '#509e2f', url: '#' },
];

const REVIEWS = [
  { id: 1, author: 'Randall Snickelfritz', rating: 5, color: '#FBBC05', text: '"Great customer service with secure and clean facilities. We have been customers for over 2 years and rent out a climate control unit. We have never had any problems. Would recommend for short term or long term storage needs.."', timeAgo: '4 months ago' },
  { id: 2, author: 'John Doe',             rating: 5, color: '#D32323', text: '"Excellent customer service and clean, secure facilities. We\'ve rented a climate-controlled unit for over 2 years without any issues. Highly recommend for both short and long-term storage!"', timeAgo: '4 months ago' },
  { id: 3, author: 'Jenny Mongelli',       rating: 5, color: '#509e2f', text: '"We have consistently experienced exceptional customer service at this facility, which is always secure and impeccably clean. As loyal customers for more than two years, we have rented a climate-controlled unit and have encountered no issues. Whether..."', timeAgo: '4 months ago' },
  { id: 4, author: 'Lucas Brady',          rating: 5, color: '#FBBC05', text: '"Awesome customer service and super clean, secure facilities! We\'ve been renting a climate-controlled unit for over 2 years and have had zero issues. Totally recommend it for both short and long-term storage!"', timeAgo: '4 months ago' },
  { id: 5, author: 'Jesse Miller',         rating: 5, color: '#D32323', text: '"This place is super convenient in Tucson, AZ! It\'s secure, clean, and really well managed. India and Delicia are awesome, and I totally recommend storing your stuff here!"', timeAgo: '4 months ago' },
  { id: 6, author: 'Marky Mark',           rating: 5, color: '#509e2f', text: 'The online process is incredibly simple and straightforward, making it easy for anyone to navigate. I truly appreciate the offer of a 12-month rate lock, as it provides peace of mind and stability during the financial planning process.', timeAgo: '2 months ago' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ReviewsSection() {
  return (
    <section className="suf-section suf-section--reviews">

      <div className="suf-rv-header">
        <div className="suf-ap-title">Customer Reviews</div>
        <p className="suf-rv-subtitle">Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac aliquet odio mattis.</p>
      </div>

      <div className="suf-rv-platforms">
        {PLATFORMS.map(({ id, Logo, score, count, color, url }) => (
          <div key={id} className="suf-rv-platform">
            <div className="suf-rv-platform-top">
              <Logo />
              <div className="suf-rv-platform-score">
                <div className="suf-rv-platform-number">
                  <span className="suf-rv-score-val">{score}</span>
                  <span className="suf-rv-score-denom">&nbsp;/ 5</span>
                </div>
                <div className="suf-rv-platform-right">
                  <Stars rating={score} color={color} />
                  <span className="suf-rv-count">{count} ratings</span>
                </div>
              </div>
            </div>
            <a href={url} className="suf-rv-more">› More Reviews</a>
          </div>
        ))}
      </div>

      <div className="suf-rv-grid">
        {REVIEWS.map((r) => (
          <div key={r.id} className="suf-rv-card">
            <div className="suf-rv-card-header">
              <div className="suf-rv-avatar">
                <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="20" fill="#e5e7eb"/>
                  <circle cx="20" cy="16" r="7" fill="#9ca3af"/>
                  <ellipse cx="20" cy="36" rx="12" ry="8" fill="#9ca3af"/>
                </svg>
              </div>
              <div className="suf-rv-card-meta">
                <span className="suf-rv-author">{r.author}</span>
                <Stars rating={r.rating} color={r.color} />
              </div>
            </div>
            <p className="suf-rv-text">{r.text}</p>
            <span className="suf-rv-time">{r.timeAgo}</span>
          </div>
        ))}
      </div>

    </section>
  );
}
