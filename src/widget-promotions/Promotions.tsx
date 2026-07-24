import React, { useEffect, useState } from 'react';
import './Promotions.css';
import { fetchSpaceGroups, extractPromos, type ApiPromo } from './api';
import { TagIcon, InfoIcon, ChevronRight } from './icons';
import promoBanner from './assets/promo-banner.png';
import promoBannerMobile from './assets/promo-banner-mobile.png';

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

// PromoCard colour cycle for API-sourced promos.
const VARIANTS: PromoVariant[] = ['dark', 'green', 'outline'];

export function Promotions({
  mode = 'cards',
  bannerImage,
  bannerUrl = '#',
  bannerAlt = '',
  barText,
  barUrl = '#',
  barCtaLabel = 'See Qualifying Units',
  barInfo,
  promos = PROMOS,
}: PromotionsProps) {
  // Live promotions pulled from each tier's `allocated_promo` in the
  // space-groups API; empty until loaded (or on failure), in which case the
  // props/demo data keep rendering unchanged.
  const [apiPromos, setApiPromos] = useState<ApiPromo[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchSpaceGroups()
      .then((raw) => {
        if (!cancelled) setApiPromos(extractPromos(raw));
      })
      .catch((err) => console.error('[Promotions] fetchSpaceGroups error:', err));
    return () => { cancelled = true; };
  }, []);

  // Guard against an empty/unknown value from Duda. With API promos loaded,
  // one promo renders best as the bar and several as cards — so 'cards' (the
  // default) auto-collapses to the bar when only a single promo came back.
  let view: 'banner' | 'bar' | 'cards' = mode === 'banner' || mode === 'bar' ? mode : 'cards';
  if (view === 'cards' && apiPromos.length === 1) view = 'bar';

  // API promos mapped onto the card shape, cycling the three card colours.
  const displayPromos: Promo[] = apiPromos.length
    ? apiPromos.map((p, i) => ({
        id: p.id,
        title: p.title,
        variant: VARIANTS[i % VARIANTS.length],
        info: p.info,
        ctaLabel: 'See Qualifying Units',
        ctaUrl: '#',
      }))
    : promos;

  // Bar text: explicit prop wins, then the first API promo, then the demo copy.
  const displayBarText = barText || apiPromos[0]?.title || 'First 3 Months 30% Off';
  const displayBarInfo = barInfo || apiPromos[0]?.info;

  // ── Mode 1: banner ────────────────────────────────────────────────────
  if (view === 'banner') {
    return (
      <div className="promo-wrapper">
        <a className="promo-banner" href={bannerUrl}>
          {bannerImage ? (
            <img className="promo-banner-img" src={bannerImage} alt={bannerAlt} />
          ) : (
            // Default banner (used until a Duda banner image is uploaded). Mobile
            // art swaps in below 640px.
            <picture>
              <source media="(max-width: 640px)" srcSet={promoBannerMobile} />
              <img className="promo-banner-img" src={promoBanner} alt={bannerAlt || 'Current promotion'} />
            </picture>
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
              <span className="promo-bar-title">{displayBarText}</span>
              {displayBarInfo ? (
                <button className="promo-bar-info" aria-label="More information" title={displayBarInfo}>
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
        {displayPromos.map((promo) => (
          <PromoCard key={promo.id} promo={promo} />
        ))}
      </div>
    </div>
  );
}
