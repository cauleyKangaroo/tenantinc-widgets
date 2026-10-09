import React from 'react';
import { FormField } from './FormField';
import './SelectField.css';

// ===========================================================================
// SelectField — THE dropdown. A real native <select> laid transparent over a
// FormField "face", so the field looks exactly like every other kit input
// (floating label, 56px box, focus ring) while the platform picker — the
// mobile wheel included — still does the work.
//
// Moved here from @shared/paymentForms (the rental flow's Billing Country /
// State) so that is literally the control other widgets use — #08's Sort by and
// Price / Distance dropdowns had their own look. Two additions over the
// original: options may carry a separate value and label, and the empty
// "Select …" option is optional, for fields that always hold a value.
// ===========================================================================

export type SelectOption = string | { value: string; label: string };

const optValue = (o: SelectOption) => (typeof o === 'string' ? o : o.value);
const optLabel = (o: SelectOption) => (typeof o === 'string' ? o : o.label);

/** chevron-big — rotated 90° by CSS for the select affordance. */
function ChevronBig({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(8 5)">
        <path d="M1.58599 0.189675C1.26945 -0.0392302 0.84859 -0.0628562 0.508414 0.129182C0.168238 0.321219 -0.0289727 0.693759 0.00346815 1.08305C0.331619 5.02086 0.331619 8.97915 0.00346815 12.917C-0.0289726 13.3062 0.168238 13.6788 0.508414 13.8708C0.84859 14.0629 1.26945 14.0392 1.58599 13.8103C3.837 12.1825 5.8566 10.2764 7.59304 8.14103C8.13567 7.47372 8.13567 6.52629 7.59304 5.85898C5.8566 3.72356 3.837 1.81746 1.58599 0.189675Z" />
      </g>
    </svg>
  );
}

export interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  required?: boolean;
  /** 'success' draws the valid (green) border. */
  state?: 'default' | 'success';
  /**
   * The leading empty option. Default `Select ${label}`, which is what the
   * payment forms want; `false` for a field that always has a value (a sort
   * order, a price bound), where "nothing" is not a choice.
   */
  placeholder?: string | false;
  className?: string;
}

export function SelectField({
  label, value, onChange, options, required, state, placeholder, className,
}: SelectFieldProps) {
  const empty = placeholder === false ? null : (placeholder ?? `Select ${label}`);
  // The face shows the option's LABEL; the select itself works in values.
  const shown = options.find((o) => optValue(o) === value);
  return (
    <div className={`rf-select${className ? ` ${className}` : ''}`}>
      <label className="rf-select-native">
        <span className="rf-sr-only">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
          {empty !== null && <option value="">{empty}</option>}
          {options.map((o) => <option key={optValue(o)} value={optValue(o)}>{optLabel(o)}</option>)}
        </select>
      </label>
      {/* Presentational twin: shows the floating label + value in the exact form
          styling, while the real <select> above sits transparently over it so the
          native picker (and mobile wheel) still does the work. */}
      <div className="rf-select-face" aria-hidden="true">
        {/* state is NOT forwarded: the kit draws a check tick for 'success',
            which would land on top of the chevron below — that pair is what
            read as "two chevrons" on Billing Country. The valid look here is
            the green border alone, exactly as the frame has it (its Icons slot
            is empty). */}
        <FormField
          label={label}
          required={required}
          value={shown ? optLabel(shown) : ''}
          onChange={() => {}}
          className={state === 'success' ? 'rf-valid' : undefined}
        />
        <ChevronBig size={24} className="rf-select-chev" />
      </div>
    </div>
  );
}
