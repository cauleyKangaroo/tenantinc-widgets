import React from 'react';
import './TierSelection.css';

// ---------------------------------------------------------------------------
// Widget #14 — Tier Selection
// Scaffold only. The real layout + tier data will be wired to the Figma design.
// ---------------------------------------------------------------------------

export interface TierSelectionProps {
  heading?: string;
  subheading?: string;
}

export function TierSelection({
  heading = 'Choose Your Tier',
  subheading = 'Select the storage plan that fits your needs.',
}: TierSelectionProps) {
  return (
    <div className="ts-wrapper">
      <div className="ts-heading-block">
        <p className="ts-title">{heading}</p>
        <p className="ts-subtitle">{subheading}</p>
      </div>

      <div className="ts-tiers">
        {/* Tier cards will be built from the Figma design. */}
        <p className="ts-placeholder">Tier Selection (#14) — scaffold. Awaiting Figma design.</p>
      </div>
    </div>
  );
}
