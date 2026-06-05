import React, { useState } from 'react';
import type { Unit, UnitSize } from '../types';
import { PriceBlock, PromoBadge, FeatureList } from './Pricing';

const SIZE_LABEL: Record<UnitSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

/**
 * A list-view row for one size group. The units in the group are shown as
 * selectable dimension pills; the selected unit drives the info + pricing.
 */
export function ListCard({ size, units }: { size: UnitSize; units: Unit[] }) {
  const [selectedId, setSelectedId] = useState(units[0].id);
  // The selected unit may disappear if filters change; fall back to first.
  const selected = units.find((u) => u.id === selectedId) ?? units[0];

  return (
    <div className="suf-list-card">
      <div className="suf-list-inner">
        <div className="suf-list-img-col">
          <img className="suf-list-img" src={selected.image} alt="Storage Unit" />
        </div>

        <div className="suf-list-info-col">
          <div className="suf-list-size-label">{SIZE_LABEL[size]}</div>
          <div className="suf-list-subtype">
            <span className="suf-check">✓</span> {selected.subtype}
          </div>
          <FeatureList features={selected.features} />
          <a href="#" className="suf-see-fits">
            See what fits →
          </a>
        </div>

        <div className="suf-list-dims-col">
          <div className="suf-dims-grid">
            {units.map((u) => {
              const isActive = u.id === selected.id;
              return (
                <button
                  key={u.id}
                  className={`suf-dim-pill${isActive ? ' active' : ''}`}
                  onClick={() => setSelectedId(u.id)}
                >
                  {isActive && <span className="suf-dim-dot" />}
                  {u.dimensions}
                </button>
              );
            })}
          </div>
          {selected.promo && <PromoBadge text={selected.promo} style={{ marginTop: 10 }} />}
        </div>

        <div className="suf-list-pricing-col">
          <div className="suf-list-prices">
            <PriceBlock unit={selected} />
          </div>
          <button className="suf-select-btn suf-select-full">Select</button>
        </div>
      </div>
    </div>
  );
}
