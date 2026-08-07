// Shared type contract for widget #14. Both the production component and the
// (production-unreachable) fixtures import from here, so neither depends on
// the other — sample data can never leak into the production bundle.
import type { PropertyCardInfo, TierQuoteResult } from './api';

export type TierKey = 'good' | 'better' | 'best';

export interface Tier {
  key: TierKey;
  name: string;
  tagline: string;
  price: number;
  hours: string;
  promoRate?: number;
  summary: string;
  promo?: string;
  /** Card amenity lines — the tier's own bundle. */
  features?: string[];
  /** The offer's unit — carried to the rental flow as ?unitId= on Select. */
  unitId?: string;
  /** No offer for this tier slot — render a sold-out placeholder. */
  soldOut?: boolean;
}

export type RowType = 'price' | 'hours' | 'check';
export interface FeatureRow {
  label: string;
  type: RowType;
  bold?: boolean;
  good?: boolean;
  better?: boolean;
  best?: boolean;
}

export interface O2Feature { label: string; star?: boolean }
export interface O2Tier {
  key: TierKey;
  name: string;
  tagline: string;
  price: number;
  promoRate?: number;
  popular?: boolean;
  promo?: string;
  soldOut?: boolean;
  features: O2Feature[];
}

export interface O3Tier {
  key: TierKey;
  name: string;
  tagline: string;
  price: number;
  promoRate?: number;
  popular?: boolean;
  promo?: string;
  soldOut?: boolean;
}

export type O3Weight = 'bold' | 'medium' | 'normal';
export interface O3Row {
  label: string;
  type: 'hours' | 'check';
  weight: O3Weight;
  gray?: boolean;
  good?: boolean;
  better?: boolean;
  best?: boolean;
}

/** Quote lifecycle for a tier's money block: pending → ok | contended | soldout | error. */
export type TierQuoteState = TierQuoteResult | { status: 'pending' };

export interface TierData {
  /** Navigate to the rental flow for the given tier key; no-op without rentUrl. */
  selectTier?: (key: TierKey) => void;
  /** The currently highlighted tier and a setter — shared so card layouts
   *  (option2/3) can select-on-click like option1's pills. */
  selected?: TierKey;
  setSelected?: (key: TierKey) => void;
  tiers: Tier[];
  rows: FeatureRow[];
  o2: O2Tier[];
  o3: O3Tier[];
  rows3: O3Row[];
  o3Hours: Record<TierKey, string>;
  /** Real unit size (e.g. "10' x 10'"). */
  size?: string;
  /** "Only N Left" line when the scarcest tier is nearly sold out. */
  urgency?: string;
  sizeImage: string;
  sizeAlt: string;
  /** True when the tiers came from the API. */
  live?: boolean;
  property?: PropertyCardInfo;
  /** Visitor-facing notice, e.g. requested size unavailable → showing others. */
  notice?: string;
  quotes?: Partial<Record<TierKey, TierQuoteState>>;
  /** Lazily fetch a tier's move-in quote (once) — called on select/hover. */
  ensureQuote?: (key: TierKey) => void;
  /** CTA button label (from the Space List Button field); default 'Select'. */
  ctaLabel?: string;
}
