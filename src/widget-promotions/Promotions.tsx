import React from 'react';
import './Promotions.css';
import { TagIcon, InfoIcon, ChevronRight } from './icons';

// ---------------------------------------------------------------------------
// Types + demo data
// ---------------------------------------------------------------------------

type PromoVariant = 'dark' | 'green' | 'outline';

interface Promo {
  id: string;
  title: string;
  variant: PromoVariant;
  /** Optional fine-print shown on the info icon's tooltip. */
  info?: string;
  ctaLabel: string;
  ctaUrl: string;
}

const PROMOS: Promo[] = [
  { id: 'p1', title: 'First Full Month Free!', variant: 'dark', info: 'Applies to your first full calendar month on select units. Terms apply.', ctaLabel: 'See Qualifying Units', ctaUrl: '#' },
  { id: 'p2', title: '50% Off for 3 Months', variant: 'green', info: 'Half price for the first three months on qualifying units. Terms apply.', ctaLabel: 'See Qualifying Units', ctaUrl: '#' },
  { id: 'p3', title: 'Get a FREE Bunny Rabbit', variant: 'outline', info: 'Just kidding — but the savings are real. Terms apply.', ctaLabel: 'See Qualifying Units', ctaUrl: '#' },
];

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function PromoCard({ promo }: { promo: Promo }) {
  return (
    <div className={`promo-card promo-card--${promo.variant}`}>
      <div className="promo-head">
        <div className="promo-title-wrap">
          <TagIcon size={36} />
          <p className="promo-title">{promo.title}</p>
        </div>
        {promo.info ? (
          <button className="promo-info" aria-label="More information" title={promo.info}>
            <InfoIcon size={24} />
          </button>
        ) : (
          <span className="promo-info"><InfoIcon size={24} /></span>
        )}
      </div>
      <a className="promo-cta" href={promo.ctaUrl}>
        <ChevronRight size={24} />
        <span>{promo.ctaLabel}</span>
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface PromotionsProps {
  /** View mode (Duda dropdown). Default 'cards'. */
  mode?: 'banner' | 'bar' | 'cards';

  // ── Mode 1: banner (uploaded image + link) ──
  bannerImage?: string;
  bannerUrl?: string;
  bannerAlt?: string;

  // ── Mode 2: active promotion bar (coloured bar + text + link) ──
  barText?: string;
  barUrl?: string;
  barCtaLabel?: string;
  /** Optional fine-print shown on the info icon's tooltip. */
  barInfo?: string;

  // ── Mode 3: cards (pulled via API) ──
  promos?: Promo[];
}

export function Promotions({
  mode = 'cards',
  bannerImage,
  bannerUrl = '#',
  bannerAlt = '',
  barText = 'First 3 Months 30% Off',
  barUrl = '#',
  barCtaLabel = 'See Qualifying Units',
  barInfo,
  promos = PROMOS,
}: PromotionsProps) {
  // Guard against an empty/unknown value from Duda.
  const view = mode === 'banner' || mode === 'bar' ? mode : 'cards';

  // ── Mode 1: banner ────────────────────────────────────────────────────
  if (view === 'banner') {
    return (
      <div className="promo-wrapper">
        <a className="promo-banner" href={bannerUrl}>
          {bannerImage ? (
            <img className="promo-banner-img" src={bannerImage} alt={bannerAlt} />
          ) : (
            // Editor/demo fallback — a gradient banner mirroring the Figma slot.
            <span className="promo-banner-fallback">
              <span className="promo-banner-title">First 3 Months 30% Off</span>
              <span className="promo-banner-sub">Limited time offer on selected spaces*</span>
            </span>
          )}
        </a>
      </div>
    );
  }

  // ── Mode 2: active promotion bar ──────────────────────────────────────
  if (view === 'bar') {
    return (
      <div className="promo-wrapper">
        <div className="promo-bar">
          <div className="promo-bar-inner">
            <div className="promo-bar-titlerow">
              <TagIcon size={48} />
              <span className="promo-bar-title">{barText}</span>
              {barInfo ? (
                <button className="promo-bar-info" aria-label="More information" title={barInfo}>
                  <InfoIcon size={36} />
                </button>
              ) : (
                <span className="promo-bar-info"><InfoIcon size={36} /></span>
              )}
            </div>
            <a className="promo-bar-cta" href={barUrl}>
              <ChevronRight size={24} />
              <span>{barCtaLabel}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Mode 3: cards (default) ───────────────────────────────────────────
  return (
    <div className="promo-wrapper">
      <div className="promo-row">
        {promos.map((promo) => (
          <PromoCard key={promo.id} promo={promo} />
        ))}
      </div>
    </div>
  );
}
