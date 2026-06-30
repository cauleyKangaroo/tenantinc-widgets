import React, { useEffect, useState } from 'react';
import './PropertyInfo.css';
import {
  MapPinIcon, PhoneIcon, EnvelopeIcon, ClockIcon, CalendarCheckIcon,
  PhotoExpandIcon, ChevronRight, Stars, SOCIALS,
} from './icons';

// ---------------------------------------------------------------------------
// Types + demo data
// ---------------------------------------------------------------------------

interface PhoneEntry { number: string; note?: string; }

export interface PropertyInfoProps {
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
  reservationUrl?: string;
  breadcrumb?: string[];
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
    reservationUrl = '#',
    breadcrumb = DEFAULTS.breadcrumb,
  } = props;

  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = () => setIndex((i) => (i - 1 + GALLERY.length) % GALLERY.length);
  const next = () => setIndex((i) => (i + 1) % GALLERY.length);

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

  return (
    <div className="pi-wrapper">
      <div className="pi-row">

        {/* ── Info column ───────────────────────────────────────────────── */}
        <div className="pi-info">
          <h2 className="pi-name">{name}</h2>

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

        {/* ── Media column (breadcrumb + gallery + map) ─────────────────── */}
        <div className="pi-media">
          <nav className="pi-breadcrumb" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb}>
                {i < breadcrumb.length - 1 ? <a className="pi-underline" href="#">{crumb}</a> : <span>{crumb}</span>}
                {i < breadcrumb.length - 1 && <span className="pi-crumb-sep"> / </span>}
              </span>
            ))}
          </nav>

          <div className="pi-cards">
            {/* Gallery */}
            <div className="pi-card-col">
              <button className="pi-gallery" onClick={() => setLightbox(true)} aria-label="Open photo gallery">
                <span className="pi-gallery-img" style={{ background: GALLERY[index] }} />
                <span className="pi-gallery-overlay" />
                <span className="pi-gallery-expand"><PhotoExpandIcon size={48} /></span>
                <span className="pi-gallery-nav" onClick={(e) => e.stopPropagation()}>
                  <span className="pi-gallery-arrow pi-gallery-arrow--prev" role="button" tabIndex={0} aria-label="Previous photo" onClick={prev}>
                    <ChevronRight size={32} />
                  </span>
                  <span className="pi-gallery-dots">
                    {GALLERY.map((_, i) => (
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

      {/* ── Lightbox ────────────────────────────────────────────────────── */}
      {lightbox && (
        <div className="pi-lightbox" onClick={() => setLightbox(false)}>
          <span className="pi-lb-arrow pi-lb-arrow--prev" role="button" tabIndex={0} aria-label="Previous photo"
            onClick={(e) => { e.stopPropagation(); prev(); }}>
            <ChevronRight size={44} />
          </span>
          <span className="pi-lb-img" style={{ background: GALLERY[index] }} onClick={(e) => e.stopPropagation()} />
          <span className="pi-lb-arrow" role="button" tabIndex={0} aria-label="Next photo"
            onClick={(e) => { e.stopPropagation(); next(); }}>
            <ChevronRight size={44} />
          </span>
          <span className="pi-lb-counter" onClick={(e) => e.stopPropagation()}>{index + 1} / {GALLERY.length}</span>
        </div>
      )}
    </div>
  );
}
