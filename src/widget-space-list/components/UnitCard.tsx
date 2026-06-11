import React from 'react';
import type { Unit, WidgetConfig } from '../types';
import { PriceBlock, PromoBadge, FeatureList, CtaButton, JunkFeeDisclaimer } from './Pricing';

export function UnitCard({ unit, config }: { unit: Unit; config: WidgetConfig }) {
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
        <PriceBlock unit={unit} config={config} />
        <div className="suf-cta-col">
          <CtaButton unit={unit} config={config} />
        </div>
      </div>
      {config.showJunkFeeDisclaimer && <JunkFeeDisclaimer />}
    </div>
  );
}
