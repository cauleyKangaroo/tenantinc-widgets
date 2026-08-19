// ===========================================================================
// <DateModal /> — month-grid date picker in a lightbox (two months, past days
// disabled, selected day filled). Promoted into the kit from the rental-flow
// widget so rent / reserve / move-in and any future widget share one calendar.
// Figma: Mariposa — Duda — 8507-23637.
// ===========================================================================

import React, { useEffect, useMemo, useState } from 'react';
import './DateModal.css';
import { CalendarIcon, CloseSolidIcon } from './icons';
import { Button } from './Button';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const sameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function MonthCalendar({
  year, month, selected, minDate, maxDate, showYear = false, onSelect,
}: {
  year: number;
  month: number;
  selected: Date | null;
  minDate: Date;
  /** Latest selectable day; later days are disabled. Used by the browse mode,
   *  where a date of birth cannot be in the future. */
  maxDate?: Date;
  /** Print the year beside the month — only meaningful when the view can move
   *  between years. */
  showYear?: boolean;
  onSelect: (d: Date) => void;
}) {
  const startOffset = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="hb-cal">
      <div className="hb-cal-head">{showYear ? `${MONTHS[month]} ${year}` : MONTHS[month]}</div>
      <div className="hb-cal-grid">
        {WEEKDAYS.map((w, i) => (
          <span className="hb-cal-dow" key={`dow-${i}`}>{w}</span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span className="hb-cal-cell hb-cal-cell--empty" key={`e-${i}`} />;
          const date = new Date(year, month, d);
          const disabled = date < minDate || (maxDate ? date > maxDate : false);
          const isSel = sameDay(date, selected);
          return (
            <button
              type="button"
              key={`d-${d}`}
              disabled={disabled}
              className={`hb-cal-cell${disabled ? ' hb-cal-cell--disabled' : ''}${isSel ? ' hb-cal-cell--selected' : ''}`}
              onClick={() => onSelect(date)}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface DateModalProps {
  open: boolean;
  onClose: () => void;
  selected: Date | null;
  onSelect: (d: Date) => void;
  onConfirm: () => void;
  /** Header text + dialog aria-label. */
  title?: string;
  /** Confirm button label (shows a busy label while `busy`). */
  ctaLabel?: string;
  /** Blocks the confirm button + shows a spinner while an async submit runs. */
  busy?: boolean;
  /** Earliest selectable day. Defaults to today; days before are disabled. */
  minDate?: Date;
  /** Latest selectable day; later days are disabled. */
  maxDate?: Date;
  /**
   * Browse mode: ONE month with month and year pickers, instead of the two
   * fixed months the move-in flow shows. For dates that are not near today —
   * a date of birth is decades back, and stepping there a month at a time
   * would be unusable.
   */
  browse?: boolean;
  /**
   * Clears the current selection. Renders a Reset control beside the browse
   * pickers when supplied — opt-in, because the move-in modal has no valid
   * "no date" state to reset TO, whereas an optional field does.
   */
  onReset?: () => void;
  /**
   * Confirm button fill. Defaults to 'solid'. The reserve flow uses 'outline'
   * so the softer commitment reads as the softer control (Figma 8507-23907).
   */
  ctaFill?: 'solid' | 'outline';
  /**
   * Optional line under the confirm button — e.g. the reserve modal's
   * "Save Time and Money! Rent Now" nudge across to renting. A node, not a
   * string, because it carries an interactive control.
   */
  footer?: React.ReactNode;
}

export function DateModal({
  open, onClose, selected, onSelect, onConfirm,
  title = 'Confirm your Move-In Date',
  ctaLabel = 'Rent Today',
  busy = false,
  minDate,
  maxDate,
  browse = false,
  onReset,
  ctaFill = 'solid',
  footer,
}: DateModalProps) {
  /* Newest first — a date of birth is far likelier to be recent than 1900. */
  const browseYears = useMemo(() => {
    const last = (maxDate ?? new Date()).getFullYear();
    const first = (minDate ?? new Date(last - 120, 0, 1)).getFullYear();
    return Array.from({ length: last - first + 1 }, (_, i) => last - i);
  }, [minDate, maxDate]);

  /* Which month the browse view shows. Seeded from the selection so reopening
     lands where the shopper left off rather than on today. */
  const seed = selected ?? maxDate ?? new Date();
  const [viewY, setViewY] = useState(seed.getFullYear());
  const [viewM, setViewM] = useState(seed.getMonth());
  useEffect(() => {
    if (!open || !selected) return;
    setViewY(selected.getFullYear());
    setViewM(selected.getMonth());
  }, [open, selected]);

  // Esc to close + lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const floor = startOfDay(minDate ?? new Date());
  const y0 = floor.getFullYear();
  const m0 = floor.getMonth();
  const nextYear = m0 === 11 ? y0 + 1 : y0;
  const nextMonth = m0 === 11 ? 0 : m0 + 1;

  return (
    <div className="hb-datemodal-overlay" onMouseDown={onClose}>
      <div
        className="hb-datemodal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="hb-datemodal-head">
          <div className="hb-datemodal-title">
            <CalendarIcon size={24} />
            <span>{title}</span>
          </div>
          <button type="button" className="hb-datemodal-close" aria-label="Close" onClick={onClose}>
            <CloseSolidIcon size={18} />
          </button>
        </div>

        <div className="hb-datemodal-body">
          {browse ? (
            <div className="hb-datemodal-browse">
              {/* Month and year as selects, not stepper arrows: a date of birth
                  is decades away, and clicking back hundreds of months is an
                  obstacle rather than a control. */}
              <div className="hb-datemodal-jump">
                <select
                  className="hb-datemodal-jump-sel"
                  aria-label="Month"
                  value={viewM}
                  onChange={(e) => setViewM(Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select
                  className="hb-datemodal-jump-sel"
                  aria-label="Year"
                  value={viewY}
                  onChange={(e) => setViewY(Number(e.target.value))}
                >
                  {browseYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                {onReset && (
                  <button type="button" className="hb-datemodal-reset" onClick={onReset}>
                    Reset
                  </button>
                )}
              </div>
              <MonthCalendar
                year={viewY}
                month={viewM}
                selected={selected}
                minDate={minDate ?? new Date(1900, 0, 1)}
                maxDate={maxDate}
                showYear
                onSelect={onSelect}
              />
            </div>
          ) : (
            <div className="hb-datemodal-cals">
              <MonthCalendar year={y0} month={m0} selected={selected} minDate={floor} onSelect={onSelect} />
              <MonthCalendar year={nextYear} month={nextMonth} selected={selected} minDate={floor} onSelect={onSelect} />
            </div>
          )}
          <div className="hb-datemodal-cta">
            <Button tone="cta" fill={ctaFill} block busy={busy} onClick={onConfirm}>{ctaLabel}</Button>
            {footer && <div className="hb-datemodal-foot">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
