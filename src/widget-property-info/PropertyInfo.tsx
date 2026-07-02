import React, { useEffect, useState } from 'react';
import './PropertyInfo.css';
import {
  MapPinIcon, PhoneIcon, EnvelopeIcon, ClockIcon, CalendarCheckIcon,
  PhotoExpandIcon, ChevronRight, Stars, SOCIALS, CreditCardIcon, LocationsIcon,
} from './icons';

// ---------------------------------------------------------------------------
// Types + demo data
// ---------------------------------------------------------------------------

interface PhoneEntry { number: string; note?: string; }

export interface PropertyInfoProps {
  /** Desktop display mode. 'full' = detailed layout (default), 'hero' = image-led banner. */
  displayMode?: 'full' | 'hero';
  /** Primary/featured image — the hero-view background and first gallery slide. */
  heroImage?: string;
  /** Additional gallery images (the "Other Images" list). */
  images?: string[];
  /** Dark overlay strength over the hero image, 0–100 (%). Default 50. */
  overlayOpacity?: number;
  name?: string;
  rating?: number;
  reviewCount?: number;
  reviewsUrl?: string;
  address?: string;
  addressUrl?: string;
  phones?: PhoneEntry[];
  messageUrl?: string;
  gateStatus?: string;
  gateNote?: string;
  officeStatus?: string;
  officeNote?: string;
  /** Third hours line, shown in the mobile layout. */
  supportStatus?: string;
  supportNote?: string;
  reservationUrl?: string;
  breadcrumb?: string[];
}

/**
 * Fills its box with either a real image (URL) or a CSS gradient placeholder.
 * Gradient strings contain "gradient(" — anything else is treated as an image src.
 */
function ImageFill({ src, className, alt = '' }: { src: string; className?: string; alt?: string }) {
  if (src && src.includes('gradient(')) {
    return <span className={className} style={{ background: src }} aria-hidden="true" />;
  }
  return <img className={className} src={src} alt={alt} />;
}

// Gradient placeholders stand in for real facility photos.
const GALLERY = [
  'linear-gradient(135deg, #8a9bb0 0%, #5b6b80 100%)',
  'linear-gradient(135deg, #b0967c 0%, #6e5440 100%)',
  'linear-gradient(135deg, #7c98a8 0%, #4a6675 100%)',
  'linear-gradient(135deg, #9aa888 0%, #5f6e4d 100%)',
];

const DEFAULTS: Required<Pick<PropertyInfoProps, 'name' | 'rating' | 'reviewCount' | 'address' | 'phones' | 'gateStatus' | 'gateNote' | 'officeStatus' | 'officeNote' | 'breadcrumb'>> = {
  name: 'Storelocal Storage Dove Mountain',
  rating: 4.5,
  reviewCount: 32,
  address: '1301 E. Mission Ave, Fullerton, CA 02027',
  phones: [
    { number: '(877) 657-7465', note: 'New Customer' },
    { number: '(877) 847-9487', note: 'Existing Customer' },
  ],
  gateStatus: 'Gate Open',
  gateNote: 'Closes 11:30pm',
  officeStatus: 'Office Closed',
  officeNote: 'Opens 8:30am',
  breadcrumb: ['Home', 'Find storage', 'California', 'Laguna Beach', '3050 Bowling Dr'],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PropertyInfo(props: PropertyInfoProps) {
  const {
    displayMode = 'full',
    heroImage,
    images,
    overlayOpacity = 50,
    name = DEFAULTS.name,
    rating = DEFAULTS.rating,
    reviewCount = DEFAULTS.reviewCount,
    reviewsUrl = '#',
    address = DEFAULTS.address,
    addressUrl = '#',
    phones = DEFAULTS.phones,
    messageUrl = '#',
    gateStatus = DEFAULTS.gateStatus,
    gateNote = DEFAULTS.gateNote,
    officeStatus = DEFAULTS.officeStatus,
    officeNote = DEFAULTS.officeNote,
    supportStatus = 'Customer Support',
    supportNote = 'Closes 8:30am',
    reservationUrl = '#',
    breadcrumb = DEFAULTS.breadcrumb,
  } = props;

  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  // Build the slide list from real images (hero first, then the others),
  // falling back to gradient placeholders so the editor/demo still shows something.
  const provided = [heroImage, ...(images ?? [])].filter(Boolean) as string[];
  const slides = provided.length ? provided : GALLERY;
  const heroSlide = slides[0];
  const current = slides[index] ?? slides[0];
  const overlay = Math.max(0, Math.min(1, overlayOpacity / 100));

  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const breadcrumbNav = (
    <nav className="pi-breadcrumb" aria-label="Breadcrumb">
      {breadcrumb.map((crumb, i) => (
        <span key={crumb}>
          {i < breadcrumb.length - 1 ? <a className="pi-underline" href="#">{crumb}</a> : <span>{crumb}</span>}
          {i < breadcrumb.length - 1 && <span className="pi-crumb-sep"> / </span>}
        </span>
      ))}
    </nav>
  );

  const lightboxEl = lightbox && (
    <div className="pi-lightbox" onClick={() => setLightbox(false)}>
      <span className="pi-lb-arrow pi-lb-arrow--prev" role="button" tabIndex={0} aria-label="Previous photo"
        onClick={(e) => { e.stopPropagation(); prev(); }}>
        <ChevronRight size={44} />
      </span>
      <span className="pi-lb-img-wrap" onClick={(e) => e.stopPropagation()}>
        <ImageFill className="pi-lb-img" src={current} />
      </span>
      <span className="pi-lb-arrow" role="button" tabIndex={0} aria-label="Next photo"
        onClick={(e) => { e.stopPropagation(); next(); }}>
        <ChevronRight size={44} />
      </span>
      <span className="pi-lb-counter" onClick={(e) => e.stopPropagation()}>{index + 1} / {slides.length}</span>
    </div>
  );

  // ── Desktop: hero (image-led) view ─────────────────────────────────────
  const heroDesktop = (
    <div className="pi-hero-wrap">
      {breadcrumbNav}
      <div className="pi-hero-row">
        <div className="pi-hero-card">
          <ImageFill className="pi-hero-img" src={heroSlide} />
          <span className="pi-hero-overlay" style={{ background: `rgba(16, 19, 24, ${overlay})` }} />
          <button className="pi-hero-expand" onClick={() => setLightbox(true)} aria-label="Open photo gallery">
            <PhotoExpandIcon size={48} />
          </button>
          <div className="pi-hero-content">
            <p className="pi-hero-name">{name}</p>
            <div className="pi-hero-meta">
              <div className="pi-hero-rating">
                <span className="pi-hero-score">{rating}</span>
                <Stars rating={rating} width={77} />
                <a className="pi-reviews pi-hero-reviews" href={reviewsUrl}>{reviewCount} Reviews</a>
              </div>
              <a className="pi-hero-address" href={addressUrl}>
                <MapPinIcon size={24} />
                <span className="pi-underline">{address}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="pi-hero-map">
          <div className="pi-map" role="img" aria-label="Map showing the property location">
            <span className="pi-map-pin" />
          </div>
        </div>
      </div>
    </div>
  );

  // ── Desktop: full view (default) ───────────────────────────────────────
  const fullDesktop = (
    <div className="pi-row">
      {/* Info column */}
      <div className="pi-info">
        <p className="pi-name">{name}</p>

        <div className="pi-rating">
          <span className="pi-rating-score">{rating}</span>
          <Stars rating={rating} width={77} />
          <a className="pi-reviews" href={reviewsUrl}>{reviewCount} Reviews</a>
        </div>

        <div className="pi-contact">
          <a className="pi-contact-row pi-link" href={addressUrl}>
            <MapPinIcon size={24} />
            <span className="pi-underline">{address}</span>
          </a>

          {phones.map((p) => (
            <a key={p.number} className="pi-contact-row" href={`tel:${p.number.replace(/[^0-9+]/g, '')}`}>
              <PhoneIcon size={24} />
              <span><span className="pi-underline">{p.number}</span>{p.note ? ` (${p.note})` : ''}</span>
            </a>
          ))}

          <a className="pi-contact-row" href={messageUrl}>
            <EnvelopeIcon size={24} />
            <span className="pi-underline">Send us a Message</span>
          </a>

          <div className="pi-hours">
            <div className="pi-contact-row">
              <ClockIcon size={24} />
              <span><span className="pi-status pi-status--open">{gateStatus}</span> ({gateNote})</span>
            </div>
            <div className="pi-contact-row pi-contact-row--indent">
              <span><span className="pi-status pi-status--closed">{officeStatus}</span> ({officeNote})</span>
            </div>
            <div className="pi-contact-row pi-contact-row--indent">
              <a className="pi-underline pi-see-hours" href="#">See all Hours</a>
            </div>
          </div>
        </div>
      </div>

      {/* Media column (breadcrumb + gallery + map) */}
      <div className="pi-media">
        {breadcrumbNav}

        <div className="pi-cards">
          {/* Gallery */}
          <div className="pi-card-col">
            <button className="pi-gallery" onClick={() => setLightbox(true)} aria-label="Open photo gallery">
              <ImageFill className="pi-gallery-img" src={current} />
              <span className="pi-gallery-overlay" />
              <span className="pi-gallery-expand"><PhotoExpandIcon size={48} /></span>
              <span className="pi-gallery-nav" onClick={(e) => e.stopPropagation()}>
                <span className="pi-gallery-arrow pi-gallery-arrow--prev" role="button" tabIndex={0} aria-label="Previous photo" onClick={prev}>
                  <ChevronRight size={32} />
                </span>
                <span className="pi-gallery-dots">
                  {slides.map((_, i) => (
                    <span key={i} className={`pi-gallery-dot${i === index ? ' active' : ''}`} onClick={() => setIndex(i)} />
                  ))}
                </span>
                <span className="pi-gallery-arrow" role="button" tabIndex={0} aria-label="Next photo" onClick={next}>
                  <ChevronRight size={32} />
                </span>
              </span>
            </button>
            <a className="pi-reservation" href={reservationUrl}>
              <CalendarCheckIcon size={24} />
              <span className="pi-underline">Find my Reservation</span>
            </a>
          </div>

          {/* Map (fake) */}
          <div className="pi-card-col">
            <div className="pi-map" role="img" aria-label="Map showing the property location">
              <span className="pi-map-pin" />
            </div>
            <div className="pi-socials">
              {SOCIALS.map(({ key, label, Icon }) => (
                <a key={key} className="pi-social" href="#" aria-label={label} title={label}>
                  <Icon size={29} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Mobile: single layout (regardless of desktop displayMode) ──────────
  const phoneHref = phones[0] ? `tel:${phones[0].number.replace(/[^0-9+]/g, '')}` : '#';
  const mobile = (
    <div className="pi-mobile">
      <div className="pi-m-hero">
        <ImageFill className="pi-m-hero-img" src={heroSlide} />
        <span className="pi-m-hero-overlay" style={{ background: `rgba(16, 19, 24, ${overlay})` }} />
        <div className="pi-m-hero-top">
          <nav className="pi-breadcrumb pi-m-breadcrumb" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb}>
                {i < breadcrumb.length - 1 ? <a href="#">{crumb}</a> : <span>{crumb}</span>}
                {i < breadcrumb.length - 1 && <span className="pi-crumb-sep"> / </span>}
              </span>
            ))}
          </nav>
          <button className="pi-m-expand" onClick={() => setLightbox(true)} aria-label="Open photo gallery">
            <PhotoExpandIcon size={40} />
          </button>
        </div>
        <div className="pi-m-hero-content">
          <p className="pi-m-name">{name}</p>
          <div className="pi-m-rating">
            <span className="pi-m-score">{rating}</span>
            <Stars rating={rating} width={77} />
            <a className="pi-reviews pi-m-reviews" href={reviewsUrl}>{reviewCount} Reviews</a>
          </div>
          <a className="pi-m-address" href={addressUrl}>
            <MapPinIcon size={16} />
            <span className="pi-underline">{address}</span>
          </a>
        </div>
      </div>

      <div className="pi-m-circles">
        <a className="pi-m-circle-item" href={phoneHref}>
          <span className="pi-m-circle"><PhoneIcon size={24} /></span>
          <span className="pi-m-circle-label">Phone</span>
        </a>
        <a className="pi-m-circle-item" href={messageUrl}>
          <span className="pi-m-circle"><EnvelopeIcon size={24} /></span>
          <span className="pi-m-circle-label">Email</span>
        </a>
        <a className="pi-m-circle-item" href="#">
          <span className="pi-m-circle"><CreditCardIcon size={24} /></span>
          <span className="pi-m-circle-label">Billpay</span>
        </a>
        <a className="pi-m-circle-item" href={addressUrl}>
          <span className="pi-m-circle"><MapPinIcon size={24} /></span>
          <span className="pi-m-circle-label">Map</span>
        </a>
        <a className="pi-m-circle-item" href="#">
          <span className="pi-m-circle"><LocationsIcon size={24} /></span>
          <span className="pi-m-circle-label">Locations</span>
        </a>
      </div>

      <div className="pi-m-hours">
        <p><span className="pi-status pi-status--open">{gateStatus}</span> ({gateNote})</p>
        <p><span className="pi-status pi-status--closed">{officeStatus}</span> ({officeNote})</p>
        <p><span className="pi-status pi-status--open">{supportStatus}</span> ({supportNote})</p>
        <a className="pi-m-seehours pi-underline" href="#">See all Hours</a>
      </div>
    </div>
  );

  return (
    <div className="pi-wrapper">
      <div className="pi-desktop">
        {displayMode === 'hero' ? heroDesktop : fullDesktop}
      </div>
      {mobile}
      {lightboxEl}
    </div>
  );
}
