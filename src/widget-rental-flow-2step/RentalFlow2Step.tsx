import React from 'react';
import './RentalFlow2Step.css';

// ---------------------------------------------------------------------------
// Widget #99 (TBD) — Rental Flow (2 Step).
// Scaffold placeholder. Real layout to be built from Figma.
// ---------------------------------------------------------------------------

export interface RentalFlow2StepProps {
  heading?: string;
}

export function RentalFlow2Step({
  heading = 'Rental Flow (2 Step)',
}: RentalFlow2StepProps) {
  return (
    <div className="rf-wrapper">
      <h2 className="rf-title">{heading}</h2>
      <p className="rf-placeholder">Widget scaffold — layout coming soon.</p>
    </div>
  );
}
