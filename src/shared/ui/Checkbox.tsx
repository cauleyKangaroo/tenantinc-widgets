// ===========================================================================
// <Checkbox /> — the one checkbox every widget should use.
// Token-styled square box + solid tick (CheckTickSolid), label to the right, keyboard
// focus ring. Controlled: pass `checked` + `onChange`.
// ===========================================================================

import React, { useId } from 'react';
import './Checkbox.css';
import { CheckTickSolid } from './icons';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  /**
   * Replaces the tick mark. The default is the solid geometric tick the
   * designs specify; pass this only where a different glyph is wanted, and the
   * mark cannot be swapped from CSS. Omit for the default.
   */
  tick?: React.ReactNode;
}

export function Checkbox({
  checked, onChange, children, disabled = false, required = false, className, id, tick,
}: CheckboxProps) {
  const reactId = useId();
  const inputId = id ?? `hb-check-${reactId}`;
  const wrapperClass = [
    'hb-check',
    checked ? 'hb-check--on' : '',
    disabled ? 'hb-check--disabled' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <label className={wrapperClass} htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        className="hb-check__input"
        checked={checked}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="hb-check__box" aria-hidden="true">
        {checked && (tick ?? <CheckTickSolid size={13} className="hb-check__tick" />)}
      </span>
      <span className="hb-check__label">
        {children}
        {required && <span className="hb-check__required" aria-hidden="true">*</span>}
      </span>
    </label>
  );
}
