import React from 'react';
import type { Unit, WidgetConfig } from '../types';

const fmt = (n: number) =>
  `$${n.toFixed(2).replace(/\.00$/, '.00')}`;

export function PriceBlock({ unit, config, hideUrgency }: { unit: Unit; config: WidgetConfig; hideUrgency?: boolean }) {
  return (
    <div className="sl-prices-row">
      {config.showInstorePrice && (
        <>
          <div className="sl-price-left">
            <div className="sl-instore-label">{config.instorePriceLabel}</div>
            <div className="sl-strike">{fmt(unit.inStorePrice)}</div>
          </div>
          <div className="sl-price-divider" />
        </>
      )}
      <div className="sl-price-main">
        <div className="sl-starting-label">STARTING AT</div>
        <div className="sl-main-price">{fmt(unit.startingPrice)}</div>
        {unit.adminFee != null && (
          <div className="sl-admin-fee">+ Plus ${unit.adminFee} Admin Fee</div>
        )}
        {!hideUrgency && config.showUrgencyMessage && unit.urgency && (
          <div className="sl-urgency">{unit.urgency}</div>
        )}
      </div>
    </div>
  );
}

export function PromoBadge({ text, style }: { text: string; style?: React.CSSProperties }) {
  return (
    <div className="sl-promo-badge" style={style}>
      <span className="sl-promo-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#509e2f">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      </span>
      {text}
    </div>
  );
}

export function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M5.86337 10.5833L3.55004 8.27001C3.42548 8.14517 3.25638 8.07502 3.08004 8.07502C2.90369 8.07502 2.73459 8.14517 2.61004 8.27001C2.35004 8.53001 2.35004 8.95001 2.61004 9.21001L5.39671 11.9967C5.65671 12.2567 6.07671 12.2567 6.33671 11.9967L13.39 4.94334C13.65 4.68334 13.65 4.26334 13.39 4.00334C13.2655 3.8785 13.0964 3.80835 12.92 3.80835C12.7437 3.80835 12.5746 3.8785 12.45 4.00334L5.86337 10.5833Z" fill="#637381"/>
    </svg>
  );
}

export function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="sl-features">
      {features.map((f) => (
        <li key={f}>
          <CheckIcon /> {f}
        </li>
      ))}
    </ul>
  );
}

export function JunkFeeDisclaimer() {
  return (
    <div className="sl-junk-disclaimer">
      * Prices shown exclude applicable taxes and admin fees. Final price confirmed at checkout.
    </div>
  );
}

/** Primary CTA button — renders Select / Call / Waitlist based on unit availability and config flags. */
export function CtaButton({ unit, config, full }: { unit: Unit; config: WidgetConfig; full?: boolean }) {
  const fullClass = full ? ' sl-select-full' : '';

  if (unit.availability === 'call' && config.callOnLimitedAvailability) {
    return (
      <button className={`sl-call-btn${fullClass}`}>Call</button>
    );
  }

  if (unit.availability === 'waitlist' && config.enableWaitlist) {
    return (
      <div className="sl-cta-group">
        <button className={`sl-waitlist-btn${fullClass}`}>Waitlist</button>
        <div className="sl-limited-label">Limited Availability</div>
      </div>
    );
  }

  return (
    <button className={`sl-select-btn${fullClass}`}>{config.ctaButtonCopy}</button>
  );
}
