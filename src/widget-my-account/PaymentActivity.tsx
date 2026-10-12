// ===========================================================================
// Payment Activity — the collapsed bar (both screen frames) and its expanded
// table (8884-131918).
//
// Account-wide, not per-unit: the frame's rows name different spaces, and its
// first row is a single payment covering two of them, so a row carries arrays
// of spaces and invoices rather than one of each.
//
// ON THE COLUMN POSITIONS: the frame absolutely-positions every cell, and its
// header labels sit up to 11px off the row values beneath them (e.g. "Payment
// Method" at 151 over a value at 162). Copying those offsets would misalign
// the table for any data but the sample's, so header and rows share ONE grid,
// sized from the frame's row positions — which are the authoritative ones.
// ===========================================================================

import { ChevronBigRightIcon, ChevronSolidIcon } from './icons';
import type { ActivityRow } from './data';

export function PaymentActivity({
  rows,
  open,
  onToggle,
}: {
  rows: ActivityRow[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="ma-activity">
      <button
        type="button"
        className="ma-activity__bar"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="ma-activity__title">Payment Activity</span>
        <span className={`ma-activity__chev${open ? ' ma-activity__chev--open' : ''}`}>
          <ChevronBigRightIcon />
        </span>
        {/* Mobile's filled ▼ (CSS shows this OR the chevron above). */}
        <span className={`ma-activity__tri${open ? ' ma-activity__tri--open' : ''}`}>
          <ChevronSolidIcon size={14} />
        </span>
      </button>

      {open && (
        <div className="ma-activity__body">
          {rows.length === 0 ? (
            /* No activity endpoint yet. Inventing rows in front of a signed-in
               customer would show them payments that never happened. */
            <p className="ma-activity__empty">No payment activity to show yet.</p>
          ) : (
            /* A real table, not a grid of divs: this IS tabular data, and the
               header association is what a screen reader needs to read a row
               out. `.ma-act` cells carry the frame's column widths. */
            <div className="ma-act__scroll">
              <table className="ma-act">
                <thead>
                  <tr className="ma-act__head">
                    <th scope="col">Payment Date</th>
                    <th scope="col">Payment Method</th>
                    <th scope="col">Space #</th>
                    <th scope="col">Invoice #</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    // The sample repeats the same date and invoice across rows,
                    // so neither is unique enough for a key on its own.
                    <tr key={`${r.date}-${r.method}-${r.amount}-${i}`}>
                      <td>{r.date}</td>
                      <td>{r.method}</td>
                      <td>
                        {r.spaces.map((s) => <span key={s} className="ma-act__line">{s}</span>)}
                      </td>
                      <td>
                        {r.invoices.map((inv) => (
                          // Text, not a control. There is no invoice document
                          // to open — the proxy exposes none (probed 2026-10-12:
                          // no /invoices route) — and a button that does nothing
                          // promises one. Becomes an <a> the day a PDF exists.
                          <span key={inv} className="ma-act__invoice">{inv}</span>
                        ))}
                      </td>
                      <td className="ma-act__amount">{r.amount}</td>
                      <td>{r.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile (≤720px) — Figma "Payment Activity" phone frame. The six
              columns don't fit a phone, so each payment becomes a row of
              Date / Amount / Balance over a grey details strip (spaces,
              invoices, method). CSS shows this OR the table above, never both. */}
          {rows.length > 0 && (
            <div className="ma-actm">
              <div className="ma-actm__head" aria-hidden="true">
                <span>Date/Details</span>
                <span>Amount</span>
                <span>Balance</span>
              </div>
              <ul className="ma-actm__list">
                {rows.map((r, i) => (
                  <li key={`${r.date}-${r.method}-${r.amount}-${i}`} className="ma-actm__item">
                    <div className="ma-actm__main">
                      <span className="ma-actm__date">{r.date}</span>
                      <span className="ma-actm__amount">{r.amount}</span>
                      <span className="ma-actm__balance">{r.balance}</span>
                    </div>
                    <div className="ma-actm__details">
                      <span>
                        Space {r.spaces.join(', ')}, Inv{' '}
                        {r.invoices.map((inv, j) => (
                          <span key={inv}>
                            {j > 0 && ', '}
                            <button type="button" className="ma-actm__invoice">{inv}</button>
                          </span>
                        ))}
                      </span>
                      <span className="ma-actm__method">{r.method}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
