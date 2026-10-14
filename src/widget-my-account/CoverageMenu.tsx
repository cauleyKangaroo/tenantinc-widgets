// ===========================================================================
// "Change Coverage" on Make a Payment — the drop-down list of protection plans
// (Figma 12272-165228).
//
// STATIC: the options are COVERAGE_OPTIONS in data.ts and picking one only
// moves the highlight — no price, line or total changes, and nothing is sent.
// Wiring it to the space's real plans (and re-pricing the charge lines) is the
// next step; `onChange` is where that hooks in.
//
// The highlighted row is the CURRENT plan: the frame's grey row is "$5,000 /
// $13/mo", and the sample space's coverage line is $13.00.
// ===========================================================================

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { COVERAGE_OPTIONS, type CoverageOption } from './data';

export interface CoverageMenuProps {
  /** The trigger's content — the shield icon + "Change Coverage" text. */
  children: ReactNode;
  /** Id of the selected option; null = none matched. */
  value: string | null;
  onChange: (option: CoverageOption) => void;
  options?: CoverageOption[];
}

export function CoverageMenu({ children, value, onChange, options = COVERAGE_OPTIONS }: CoverageMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Closes on a press outside or Escape. Listeners only while open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="ma-coverage" ref={rootRef}>
      <button
        type="button"
        className="ma-link-row ma-link-row--tight"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        {children}
      </button>
      {open && (
        <ul className="ma-coverage__menu" id={listId} role="listbox" aria-label="Coverage">
          {options.map((o) => (
            <li key={o.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={o.id === value}
                aria-disabled={o.disabled || undefined}
                disabled={o.disabled}
                className={`ma-coverage__opt${o.id === value ? ' ma-coverage__opt--on' : ''}${o.disabled ? ' ma-coverage__opt--off' : ''}`}
                onClick={() => { if (o.disabled) return; onChange(o); setOpen(false); }}
              >
                <span className="ma-coverage__label">{o.label}</span>
                {o.price && <span className="ma-coverage__price">{o.price}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
