import React from 'react';
import type { Unit } from '../types';
import { PriceBlock, PromoBadge, FeatureList } from './Pricing';

/** A single unit card in the grid view. */
export function UnitCard({ unit }: { unit: Unit }) {
  return (
    <div className="suf-unit-card">
      <div className="suf-card-top">
        <div className="suf-card-info">
          <div className="suf-unit-title">{unit.dimensions}</div>
          <div className="suf-unit-subtype">{unit.subtype}</div>
          <FeatureList features={unit.features} />
        </div>
        <div className="suf-card-image-col">
          <img className="suf-unit-img" src={unit.image} alt="Storage Unit" />
          <a href="#" className="suf-see-fits">
            See what fits →
          </a>
        </div>
      </div>

      {unit.promo && <PromoBadge text={unit.promo} />}

      <div className="suf-card-pricing">
        <PriceBlock unit={unit} />
        <div className="suf-cta-col">
          <button className="suf-select-btn">Select</button>
        </div>
      </div>
    </div>
  );
}
