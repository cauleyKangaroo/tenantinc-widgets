// ===========================================================================
// <MoneyBreakdown /> — the move-in cost line items, shared by the value-tiers
// card breakdown and the rental-flow order rail (both consume the same quote
// shape). Rules: a `Rent` line shows "Rent (Prorated)" + its date range and a
// bold amount; a negative cost renders as −$; then Total Tax; then (optional)
// "Total Cost to Move-In:". Each caller keeps its own surrounding chrome.
// ===========================================================================

import React from 'react';
import './MoneyBreakdown.css';

export interface MoneyLine {
  name: string;
  cost: number;
  startDate?: string;
  endDate?: string;
}

export interface MoneyBreakdownData {
  totalDue: number;
  totalTax: number;
  unitNumber?: string;
  lines: MoneyLine[];
}

export interface MoneyBreakdownProps extends MoneyBreakdownData {
  /** Render the "Total Cost to Move-In:" row. Defaults to true. */
  showTotal?: boolean;
  className?: string;
}

const lineAmt = (n: number) => (n < 0 ? `−$ ${Math.abs(n).toFixed(2)}` : `$ ${n.toFixed(2)}`);

export function MoneyBreakdown({
  totalDue, totalTax, unitNumber, lines, showTotal = true, className,
}: MoneyBreakdownProps) {
  return (
    <div className={['hb-money', className ?? ''].filter(Boolean).join(' ')}>
      {unitNumber && (
        <div className="hb-money-row">
          <span>Unit</span>
          <span className="hb-money-strong">#{unitNumber}</span>
        </div>
      )}
      {lines.map((l) => (
        <div className="hb-money-row" key={`${l.name}-${l.cost}`}>
          {l.name === 'Rent' && l.startDate ? (
            <span className="hb-money-label">
              Rent (Prorated)
              <span className="hb-money-dates">({l.startDate} – {l.endDate ?? ''})</span>
            </span>
          ) : (
            <span>{l.name}</span>
          )}
          <span className={l.name === 'Rent' ? 'hb-money-strong' : undefined}>{lineAmt(l.cost)}</span>
        </div>
      ))}
      <div className="hb-money-row">
        <span>Total Tax</span>
        <span>{lineAmt(totalTax)}</span>
      </div>
      {showTotal && (
        <div className="hb-money-row hb-money-total">
          <span>Total Cost to Move-In:</span>
          <span>${totalDue.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
