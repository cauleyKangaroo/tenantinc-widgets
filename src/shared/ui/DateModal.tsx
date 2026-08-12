// ===========================================================================
// <DateModal /> — month-grid date picker in a lightbox (two months, past days
// disabled, selected day filled). Promoted into the kit from the rental-flow
// widget so rent / reserve / move-in and any future widget share one calendar.
// Figma: Mariposa — Duda — 8507-23637.
// ===========================================================================

import React, { useEffect } from 'react';
import './DateModal.css';
import { CalendarIcon, CloseIcon } from './icons';
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
  year, month, selected, minDate, onSelect,
}: {
  year: number;
  month: number;
  selected: Date | null;
  minDate: Date;
  onSelect: (d: Date) => void;
}) {
  const startOffset = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="hb-cal">
      <div className="hb-cal-head">{MONTHS[month]}</div>
      <div className="hb-cal-grid">
        {WEEKDAYS.map((w, i) => (
          <span className="hb-cal-dow" key={`dow-${i}`}>{w}</span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span className="hb-cal-cell hb-cal-cell--empty" key={`e-${i}`} />;
          const date = new Date(year, month, d);
          const disabled = date < minDate;
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
}

export function DateModal({
  open, onClose, selected, onSelect, onConfirm,
  title = 'Confirm your Move-In Date',
  ctaLabel = 'Rent Today',
  busy = false,
  minDate,
}: DateModalProps) {
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
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="hb-datemodal-body">
          <div className="hb-datemodal-cals">
            <MonthCalendar year={y0} month={m0} selected={selected} minDate={floor} onSelect={onSelect} />
            <MonthCalendar year={nextYear} month={nextMonth} selected={selected} minDate={floor} onSelect={onSelect} />
          </div>
          <div className="hb-datemodal-cta">
            <Button tone="cta" block busy={busy} onClick={onConfirm}>{ctaLabel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
