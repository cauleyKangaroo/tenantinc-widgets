import React, { useState } from 'react';
import './Reviews.css';
import {
  Stars,
  PlatformLogo,
  UserAvatar,
  ChevronRight,
  WriteReviewIcon,
  type Platform,
} from './icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  timeAgo: string;
}

interface ReviewSource {
  key: Platform;
  name: string;
  score: number;
  count: number;
  moreUrl: string;
  reviews: Review[];
}

// ---------------------------------------------------------------------------
// Demo data — replace with live API data when available
// ---------------------------------------------------------------------------

const SOURCES: ReviewSource[] = [
  {
    key: 'google',
    name: 'Google',
    score: 4.3,
    count: 264,
    moreUrl: '#',
    reviews: [
      { id: 'g1', author: 'Randall Snickelfritz', rating: 5, text: '"Great customer service with secure and clean facilities. We have been customers for over 2 years and rent out a climate control unit. We have never had any problems. Would recommend for short term or long term storage needs."', timeAgo: '4 months ago' },
      { id: 'g2', author: 'Lucas Brady', rating: 5, text: '"Awesome customer service and super clean, secure facilities! We\'ve been renting a climate-controlled unit for over 2 years and have had zero issues. Totally recommend it for both short and long-term storage!"', timeAgo: '4 months ago' },
      { id: 'g3', author: 'Sarah Chen', rating: 4, text: '"The facility is immaculate and the staff are incredibly helpful. Moving in was a breeze and the online portal makes billing simple. Highly recommended."', timeAgo: '2 months ago' },
      { id: 'g4', author: 'Mike Patterson', rating: 5, text: '"Exceptional service from the moment I walked in. The unit is exactly as described and the security cameras everywhere give real peace of mind."', timeAgo: '1 month ago' },
    ],
  },
  {
    key: 'yelp',
    name: 'Yelp',
    score: 4.9,
    count: 76,
    moreUrl: '#',
    reviews: [
      { id: 'y1', author: 'John Doe', rating: 5, text: '"Excellent customer service and clean, secure facilities. We\'ve rented a climate-controlled unit for over 2 years without any issues. Highly recommend for both short and long-term storage!"', timeAgo: '4 months ago' },
      { id: 'y2', author: 'Jesse Miller', rating: 5, text: '"This place is super convenient! It\'s secure, clean, and really well managed. India and Delicia are awesome, and I totally recommend storing your stuff here!"', timeAgo: '4 months ago' },
      { id: 'y3', author: 'Amanda Torres', rating: 5, text: '"I was nervous about putting my belongings in storage but this place gave me total confidence. Climate controlled units are spotless and the access hours are very flexible."', timeAgo: '3 months ago' },
      { id: 'y4', author: 'Daniel Wu', rating: 4, text: '"Really solid storage facility. Easy access, great staff, very clean. Pricing is fair and competitive. Would definitely rent here again."', timeAgo: '5 months ago' },
    ],
  },
];

const REVIEWS_PER_PAGE = 2;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SourceHeader({ source }: { source: ReviewSource }) {
  return (
    <div className="rw-source-header">
      <div className="rw-source-meta">
        <PlatformLogo platform={source.key} />
        <div className="rw-source-score-block">
          <span className="rw-source-score">{source.score}</span>
          <span className="rw-source-out-of">/ 5</span>
        </div>
        <div className="rw-source-rating-col">
          <Stars platform={source.key} rating={5} width={source.key === 'yelp' ? 110 : 105} />
          <span className="rw-source-count">{source.count} ratings</span>
        </div>
      </div>
      <a href={source.moreUrl} className="rw-more-link">
        More Reviews
      </a>
    </div>
  );
}

function ReviewCard({ review, source }: { review: Review; source: ReviewSource }) {
  return (
    <div className="rw-card">
      <div className="rw-card-author">
        <UserAvatar />
        <div className="rw-card-author-info">
          <span className="rw-card-author-name">{review.author}</span>
          <Stars platform={source.key} rating={review.rating} width={source.key === 'yelp' ? 89 : 85} />
        </div>
      </div>
      <p className="rw-card-text">{review.text}</p>
      <span className="rw-card-time">{review.timeAgo}</span>
    </div>
  );
}

function Pagination({ page, total, onPrev, onNext, onDot }: {
  page: number; total: number;
  onPrev: () => void; onNext: () => void; onDot: (i: number) => void;
}) {
  return (
    <div className="rw-pagination">
      <button className="rw-page-btn rw-page-btn-prev" onClick={onPrev} disabled={page === 0} aria-label="Previous">
        <ChevronRight size={40} />
      </button>
      {Array.from({ length: total }).map((_, i) => (
        <button key={i} className={`rw-page-dot${i === page ? ' active' : ''}`} onClick={() => onDot(i)} aria-label={`Page ${i + 1}`} />
      ))}
      <button className="rw-page-btn" onClick={onNext} disabled={page === total - 1} aria-label="Next">
        <ChevronRight size={40} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface ReviewsProps {
  heading?: string;
  subheading?: string;
}

export function Reviews({
  heading = 'Customer Reviews',
  subheading = 'Read what our customers have to say about their storage experience with us.',
}: ReviewsProps) {
  const totalDesktopPages = Math.max(...SOURCES.map((s) => Math.ceil(s.reviews.length / REVIEWS_PER_PAGE)));
  const [desktopPage, setDesktopPage] = useState(0);
  const [mobileSourceIdx, setMobileSourceIdx] = useState(0);
  const [mobilePage, setMobilePage] = useState(0);

  const mobileSource = SOURCES[mobileSourceIdx];
  const totalMobilePages = mobileSource.reviews.length;

  function switchMobileSource(idx: number) {
    setMobileSourceIdx(idx);
    setMobilePage(0);
  }

  return (
    <div className="rw-wrapper">

      {/* ── Desktop layout ──────────────────────────────────────────────── */}
      <div className="rw-desktop">
        <div className="rw-heading-block">
          <div className="rw-title">{heading}</div>
          <p className="rw-subtitle">{subheading}</p>
        </div>

        <div className="rw-columns">
          {SOURCES.map((source) => {
            const start = desktopPage * REVIEWS_PER_PAGE;
            const pageReviews = source.reviews.slice(start, start + REVIEWS_PER_PAGE);
            return (
              <div key={source.key} className="rw-column">
                <SourceHeader source={source} />
                <div className="rw-column-cards">
                  {pageReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} source={source} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <Pagination
          page={desktopPage}
          total={totalDesktopPages}
          onPrev={() => setDesktopPage((p) => Math.max(0, p - 1))}
          onNext={() => setDesktopPage((p) => Math.min(totalDesktopPages - 1, p + 1))}
          onDot={setDesktopPage}
        />
      </div>

      {/* ── Mobile layout ───────────────────────────────────────────────── */}
      <div className="rw-mobile">
        <div className="rw-mobile-titlebar">
          <WriteReviewIcon />
          <span className="rw-mobile-heading">Reviews</span>
        </div>

        <div className="rw-mobile-tabs">
          {SOURCES.map((source, idx) => (
            <button
              key={source.key}
              className={`rw-mobile-tab${mobileSourceIdx === idx ? ' active' : ''}`}
              onClick={() => switchMobileSource(idx)}
            >
              {source.name}
            </button>
          ))}
        </div>

        <div className="rw-mobile-body">
          <SourceHeader source={mobileSource} />
          <ReviewCard review={mobileSource.reviews[mobilePage]} source={mobileSource} />
        </div>

        <Pagination
          page={mobilePage}
          total={totalMobilePages}
          onPrev={() => setMobilePage((p) => Math.max(0, p - 1))}
          onNext={() => setMobilePage((p) => Math.min(totalMobilePages - 1, p + 1))}
          onDot={setMobilePage}
        />
      </div>

    </div>
  );
}
