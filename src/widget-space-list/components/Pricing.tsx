import React from 'react';
import type { Unit } from '../types';

const fmt = (n: number) =>
  `$${n.toFixed(2).replace(/\.00$/, '.00')}`;

/** The in-store strike price + "starting at" main price, with optional
 *  admin-fee and urgency lines. Shared by the grid card and list row. */
export function PriceBlock({ unit }: { unit: Unit }) {
  return (
    <>
      <div className="suf-price-left">
        <div className="suf-instore-label">IN-STORE</div>
        <div className="suf-strike">{fmt(unit.inStorePrice)}</div>
      </div>
      <div className="suf-price-main">
        <div className="suf-starting-label">STARTING AT</div>
        <div className="suf-main-price">{fmt(unit.startingPrice)}</div>
        {unit.adminFee != null && (
          <div className="suf-admin-fee">+ Plus ${unit.adminFee} Admin Fee</div>
        )}
        {unit.urgency && <div className="suf-urgency">{unit.urgency}</div>}
      </div>
    </>
  );
}

export function PromoBadge({ text, style }: { text: string; style?: React.CSSProperties }) {
  return (
    <div className="suf-promo-badge" style={style}>
      <span className="suf-promo-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#4caf50">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      </span>
      {text}
    </div>
  );
}

export function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="suf-features">
      {features.map((f) => (
        <li key={f}>
          <span className="suf-check">✓</span> {f}
        </li>
      ))}
    </ul>
  );
}
