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
        <div className="sl-starting-label">
          {config.showPromoRate ? config.promoRateLabel : config.startingAtLabel}
        </div>
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

// Filled tag — exact Figma vector (node 429:46379). Shared by the grid promo
// banner and the list-card promo banner.
export function PromoTagIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13.3817 13.3817" fill="#509e2f" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d="M4.37691 0.0456721C5.33683 -0.00499382 5.94003 -0.0368318 6.51907 0.0798287C7.03141 0.183051 7.52277 0.371604 7.97264 0.637617C8.48108 0.93826 8.90814 1.36545 9.58774 2.04526L11.3614 3.81894C12.1484 4.60549 12.6574 5.1142 12.9458 5.68015C13.5271 6.82102 13.5271 8.17122 12.9458 9.31208C12.6574 9.87803 12.1484 10.3867 11.3615 11.1733L11.1733 11.3615C10.3867 12.1484 9.87803 12.6574 9.31208 12.9458C8.17122 13.5271 6.82102 13.5271 5.68015 12.9458C5.1142 12.6574 4.60551 12.1484 3.81894 11.3614L2.04526 9.58775C1.36545 8.90814 0.93826 8.48108 0.637616 7.97264C0.371604 7.52277 0.183051 7.03141 0.0798287 6.51907C-0.0368318 5.94003 -0.00499381 5.33682 0.0456723 4.3769L0.0806964 3.71162C0.106284 3.2253 0.127491 2.82224 0.170667 2.49296C0.21568 2.14968 0.290027 1.83525 0.449052 1.53874C0.697125 1.07618 1.07618 0.697124 1.53874 0.449052C1.83525 0.290027 2.14968 0.21568 2.49297 0.170667C2.82225 0.127491 3.2253 0.106284 3.71162 0.0806962L4.37691 0.0456721ZM4.32633 2.99186C3.58996 2.99186 2.993 3.58882 2.993 4.3252C2.993 5.06158 3.58996 5.65853 4.32633 5.65853C5.06271 5.65853 5.65967 5.06158 5.65967 4.3252C5.65967 3.58882 5.06271 2.99186 4.32633 2.99186Z" />
    </svg>
  );
}

export function PromoBadge({ text, style }: { text: string; style?: React.CSSProperties }) {
  return (
    <div className="sl-promo-badge" style={style}>
      <span className="sl-promo-icon"><PromoTagIcon size={16} /></span>
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
        <button className={`sl-waitlist-btn${fullClass}`}>Join waitlist</button>
        <div className="sl-limited-label">Limited Availability</div>
      </div>
    );
  }

  return (
    <button className={`sl-select-btn${fullClass}`}>{config.ctaButtonCopy}</button>
  );
}
