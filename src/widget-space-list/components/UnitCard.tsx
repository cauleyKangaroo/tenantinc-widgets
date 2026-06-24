import React from 'react';
import type { Unit, WidgetConfig } from '../types';
import { PriceBlock, PromoBadge, FeatureList, CtaButton, JunkFeeDisclaimer } from './Pricing';
import defaultImg from '../assets/tenantinc-default.png';

export function UnitCard({ unit, config }: { unit: Unit; config: WidgetConfig }) {
  return (
    <div className="sl-unit-card">
      <div className="sl-card-display-panel">
        <div className="sl-card-top">
          <div className="sl-card-info">
            <div className="sl-unit-heading">
              <div className="sl-unit-title">{unit.dimensions}</div>
              <div className="sl-unit-subtype">{unit.subtype}</div>
            </div>
            <FeatureList features={unit.features} />
          </div>
          <div className="sl-card-image-col">
            <img className="sl-unit-img" src={unit.image} alt="Storage Unit" onError={(e) => { (e.target as HTMLImageElement).src = defaultImg; }} />
            <a href="#" className="sl-see-fits">
              See what fits
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#509e2f">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M10,8V16L16,12L10,8Z" />
              </svg>
            </a>
          </div>
        </div>
        {unit.promo && <PromoBadge text={unit.promo} />}
      </div>

      <div className="sl-card-action-panel">
        <div className="sl-card-pricing">
          <PriceBlock unit={unit} config={config} />
          <div className="sl-cta-col">
            <CtaButton unit={unit} config={config} />
          </div>
        </div>
        {config.showJunkFeeDisclaimer && <JunkFeeDisclaimer />}
      </div>
    </div>
  );
}
