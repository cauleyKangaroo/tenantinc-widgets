import React from 'react';
import type { Unit, WidgetConfig } from '../types';
import { PriceBlock, PromoBadge, FeatureList, CtaButton, JunkFeeDisclaimer } from './Pricing';

export function UnitCard({ unit, config }: { unit: Unit; config: WidgetConfig }) {
  return (
    <div className="suf-unit-card">
      <div className="suf-card-display-panel">
        <div className="suf-card-top">
          <div className="suf-card-info">
            <div className="suf-unit-heading">
              <div className="suf-unit-title">{unit.dimensions}</div>
              <div className="suf-unit-subtype">{unit.subtype}</div>
            </div>
            <FeatureList features={unit.features} />
          </div>
          <div className="suf-card-image-col">
            <img className="suf-unit-img" src={unit.image} alt="Storage Unit" />
            <a href="#" className="suf-see-fits">
              See what fits
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#509e2f">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M10,8V16L16,12L10,8Z" />
              </svg>
            </a>
          </div>
        </div>
        {unit.promo && <PromoBadge text={unit.promo} />}
      </div>

      <div className="suf-card-action-panel">
        <div className="suf-card-pricing">
          <PriceBlock unit={unit} config={config} />
          <div className="suf-cta-col">
            <CtaButton unit={unit} config={config} />
          </div>
        </div>
        {config.showJunkFeeDisclaimer && <JunkFeeDisclaimer />}
      </div>
    </div>
  );
}
