import React, { useState } from 'react';
import type { Unit, UnitSize, WidgetConfig } from '../types';
import { PriceBlock, PromoBadge, FeatureList, CtaButton, JunkFeeDisclaimer, CheckIcon } from './Pricing';
import defaultImg from '../assets/tenantinc-default.png';

const SIZE_LABEL: Record<UnitSize, string> = {
  other: 'Other',
  extra_small: 'Extra Small',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  extra_large: 'Extra Large',
};

export function ListCard({ size, units, config }: { size: UnitSize; units: Unit[]; config: WidgetConfig }) {
  const [selectedId, setSelectedId] = useState(units[0].id);
  // The selected unit may disappear if filters change; fall back to first.
  const selected = units.find((u) => u.id === selectedId) ?? units[0];

  return (
    <div className="sl-list-card">
      <div className="sl-list-inner">
        <div className="sl-list-img-col">
          <img className="sl-list-img" src={selected.image} alt="Storage Unit" onError={(e) => { (e.target as HTMLImageElement).src = defaultImg; }} />
        </div>

        <div className="sl-list-info-col">
          <div className="sl-list-size-label">{SIZE_LABEL[size]}</div>
          <div className="sl-list-subtype">
            <CheckIcon /> {selected.subtype}
          </div>
          <FeatureList features={selected.features} />
          <a href="#" className="sl-see-fits">
            See what fits →
          </a>
        </div>

        <div className="sl-list-dims-col">
          <div className="sl-dims-grid">
            {units.map((u) => {
              const isActive = u.id === selected.id;
              return (
                <button
                  key={u.id}
                  className={`sl-dim-pill${isActive ? ' active' : ''}`}
                  onClick={() => setSelectedId(u.id)}
                >
                  {isActive && <span className="sl-dim-dot" />}
                  {u.dimensions}
                </button>
              );
            })}
          </div>
          {selected.promo && <PromoBadge text={selected.promo} style={{ marginTop: 10 }} />}
        </div>

        <div className="sl-list-pricing-col">
          <div className="sl-list-prices">
            <PriceBlock unit={selected} config={config} />
          </div>
          <CtaButton unit={selected} config={config} full />
          {config.showJunkFeeDisclaimer && <JunkFeeDisclaimer />}
        </div>
      </div>
    </div>
  );
}
