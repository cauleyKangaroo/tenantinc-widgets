import React, { useEffect } from 'react';
import { CalendarIcon, CloseIcon } from './icons';

// ---------------------------------------------------------------------------
// "Confirm your Move-In Date" lightbox — opens over the rental-flow form.
// Figma: Mariposa — Duda — 8507-23637.
// Two month calendars (current + next). Past dates are disabled/greyed; the
// selected date shows a filled dark circle (defaults to today).
// ---------------------------------------------------------------------------

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
    <div className="rf-cal">
      <div className="rf-cal-head">{MONTHS[month]}</div>
      <div className="rf-cal-grid">
        {WEEKDAYS.map((w, i) => (
          <span className="rf-cal-dow" key={`dow-${i}`}>{w}</span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span className="rf-cal-cell rf-cal-cell--empty" key={`e-${i}`} />;
          const date = new Date(year, month, d);
          const disabled = date < minDate;
          const isSel = sameDay(date, selected);
          return (
            <button
              type="button"
              key={`d-${d}`}
              disabled={disabled}
              className={`rf-cal-cell${disabled ? ' rf-cal-cell--disabled' : ''}${isSel ? ' rf-cal-cell--selected' : ''}`}
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

export function MoveInDateModal({
  open, onClose, selected, onSelect, onConfirm,
  title = 'Confirm your Move-In Date',
  ctaLabel = 'Rent Today',
}: {
  open: boolean;
  onClose: () => void;
  selected: Date | null;
  onSelect: (d: Date) => void;
  onConfirm: () => void;
  title?: string;
  ctaLabel?: string;
}) {
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

  const today = startOfDay(new Date());
  const y0 = today.getFullYear();
  const m0 = today.getMonth();
  const nextYear = m0 === 11 ? y0 + 1 : y0;
  const nextMonth = m0 === 11 ? 0 : m0 + 1;

  return (
    <div className="rf-overlay" onMouseDown={onClose}>
      <div
        className="rf-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="rf-modal-head">
          <div className="rf-modal-title">
            <CalendarIcon size={24} />
            <span>{title}</span>
          </div>
          <button type="button" className="rf-modal-close" aria-label="Close" onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="rf-modal-body">
          <div className="rf-cals">
            <MonthCalendar year={y0} month={m0} selected={selected} minDate={today} onSelect={onSelect} />
            <MonthCalendar year={nextYear} month={nextMonth} selected={selected} minDate={today} onSelect={onSelect} />
          </div>
          <button type="button" className="rf-btn rf-btn--rent rf-modal-cta" onClick={onConfirm}>
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
