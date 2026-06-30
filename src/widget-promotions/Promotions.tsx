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
  promos?: Promo[];
}

export function Promotions({ promos = PROMOS }: PromotionsProps) {
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
