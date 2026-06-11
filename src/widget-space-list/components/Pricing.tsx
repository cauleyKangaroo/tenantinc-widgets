import React from 'react';
import type { Unit, WidgetConfig } from '../types';

const fmt = (n: number) =>
  `$${n.toFixed(2).replace(/\.00$/, '.00')}`;

export function PriceBlock({ unit, config }: { unit: Unit; config: WidgetConfig }) {
  return (
    <>
      {config.showInstorePrice && (
        <div className="suf-price-left">
          <div className="suf-instore-label">{config.instorePriceLabel}</div>
          <div className="suf-strike">{fmt(unit.inStorePrice)}</div>
        </div>
      )}
      <div className="suf-price-main">
        <div className="suf-starting-label">STARTING AT</div>
        <div className="suf-main-price">{fmt(unit.startingPrice)}</div>
        {unit.adminFee != null && (
          <div className="suf-admin-fee">+ Plus ${unit.adminFee} Admin Fee</div>
        )}
        {config.showUrgencyMessage && unit.urgency && (
          <div className="suf-urgency">{unit.urgency}</div>
        )}
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

export function JunkFeeDisclaimer() {
  return (
    <div className="suf-junk-disclaimer">
      * Prices shown exclude applicable taxes and admin fees. Final price confirmed at checkout.
    </div>
  );
}

/** Primary CTA button — renders Select / Call / Waitlist based on unit availability and config flags. */
export function CtaButton({ unit, config, full }: { unit: Unit; config: WidgetConfig; full?: boolean }) {
  const fullClass = full ? ' suf-select-full' : '';

  if (unit.availability === 'call' && config.callOnLimitedAvailability) {
    return (
      <button className={`suf-call-btn${fullClass}`}>Call</button>
    );
  }

  if (unit.availability === 'waitlist' && config.enableWaitlist) {
    return (
      <div className="suf-cta-group">
        <button className={`suf-waitlist-btn${fullClass}`}>Waitlist</button>
        <div className="suf-limited-label">Limited Availability</div>
      </div>
    );
  }

  return (
    <button className={`suf-select-btn${fullClass}`}>{config.ctaButtonCopy}</button>
  );
}
