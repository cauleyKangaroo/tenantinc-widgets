import React, { useEffect, useState } from 'react';
import './Promotions.css';
import { fetchSpaceGroups, extractPromos, type ApiPromo } from './api';
import { emitShowPromo, scrollToSpaceList } from '@shared/promoBus';
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
      <a
        className="promo-cta"
        href={promo.ctaUrl}
        onClick={(e) => {
          // Filter the Space List to this promo's qualifying units and scroll to it.
          e.preventDefault();
          emitShowPromo({ promoId: promo.id, promoTitle: promo.title });
          scrollToSpaceList();
        }}
      >
        <ChevronRight size={24} />
        <span>{promo.ctaLabel}</span>
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active promotion bar — a single bar, or a 5s auto-advancing carousel with
// clickable arrows when there are multiple promotions.
// ---------------------------------------------------------------------------

interface BarItem { id: string; title: string; info?: string; url: string; ctaLabel: string; }

const AUTO_ADVANCE_MS = 5000;

function PromoBar({ items }: { items: BarItem[] }) {
  const [current, setCurrent] = useState(0);
  const many = items.length > 1;
  const go = (i: number) => setCurrent((i + items.length) % items.length);

  // Auto-advance every 5s; the `current` dep resets the timer after any manual
  // navigation so the next auto-advance is a fresh 5s away.
  useEffect(() => {
    if (!many) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % items.length), AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [many, items.length, current]);

  const item = items[current] ?? items[0];

  return (
    <div className={`promo-bar-carousel${many ? ' promo-bar-carousel--multi' : ''}`}>
      {many && (
        <button
          className="promo-bar-arrow promo-bar-arrow--prev"
          aria-label="Previous promotion"
          onClick={() => go(current - 1)}
        >
          <ChevronRight size={24} />
        </button>
      )}

      <div className="promo-bar" key={`${item.id}-${current}`}>
        <div className="promo-bar-inner">
          <div className="promo-bar-titlerow">
            <TagIcon size={48} />
            <span className="promo-bar-title">{item.title}</span>
            {item.info ? (
              <button className="promo-bar-info" aria-label="More information" title={item.info}>
                <InfoIcon size={36} />
              </button>
            ) : (
              <span className="promo-bar-info"><InfoIcon size={36} /></span>
            )}
          </div>
          <a className="promo-bar-cta" href={item.url}>
            <ChevronRight size={24} />
            <span>{item.ctaLabel}</span>
          </a>
        </div>
      </div>

      {many && (
        <button
          className="promo-bar-arrow promo-bar-arrow--next"
          aria-label="Next promotion"
          onClick={() => go(current + 1)}
        >
          <ChevronRight size={24} />
        </button>
      )}
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
  // Multiple promotions → auto-advancing carousel with arrows; otherwise a
  // single bar (explicit barText wins, else the first API promo / demo copy).
  if (view === 'bar') {
    const barItems: BarItem[] = displayPromos.length > 1
      ? displayPromos.map((p) => ({ id: p.id, title: p.title, info: p.info, url: p.ctaUrl || barUrl, ctaLabel: p.ctaLabel || barCtaLabel }))
      : [{ id: 'bar', title: displayBarText, info: displayBarInfo, url: barUrl, ctaLabel: barCtaLabel }];

    return (
      <div className="promo-wrapper">
        <PromoBar items={barItems} />
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
