// ===========================================================================
// <FormField /> — the one input every widget should use.
// Figma: Mariposa — Duda, node 8753-47700 ("Mariposa Form 2.0").
//
// One component covers all four columns of the design, because they are the same
// box with a different trailing icon and input behaviour:
//
//   Text Entry     type="text" | "email" | "tel"
//   Search         type="search"           → magnifying glass
//   Calendar       type="date"             → native picker
//                  mask="date"             → typed MM/DD/YYYY, no picker
//   Masked Fields  type="password"         → dots + eye toggle
//
// STATE. Resting and active are handled entirely in CSS (`:focus-within`), so
// they always agree with the real caret. Only `success` and `error` are props,
// because only the caller knows whether a value validated. Passing `error`
// implies the error state — you cannot get a red border with no message, or a
// message with no red border.
//
// ACCESSIBILITY. The label is a real <label> tied to the input by id, the error
// is wired through aria-describedby + aria-invalid, and the reveal toggle is a
// real <button>. The floating label means there is always an accessible name,
// which a placeholder-only field would not have.
// ===========================================================================

import React, { useId, useMemo, useState } from 'react';
import './FormField.css';
import {
  SearchIcon, CalendarIcon, CheckIcon, AlertIcon, InfoIcon, EyeOnIcon, EyeOffIcon,
} from './icons';

export type FieldState = 'default' | 'success' | 'error';
export type FieldType = 'text' | 'email' | 'tel' | 'search' | 'password' | 'date' | 'number';

export interface FormFieldProps {
  /** Visible label. Also the accessible name — always provide one. */
  label: string;
  value: string;
  onChange: (value: string) => void;

  /** Defaults to 'text'. Picks the default trailing icon and input behaviour. */
  type?: FieldType;
  /** Appends the red `*` and sets `required` on the input. */
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  autoComplete?: string;
  placeholder?: string;
  /** Validation message. Any non-empty string puts the field in the error state. */
  error?: string;
  /** Neutral hint under the field. Ignored while `error` is set. */
  help?: string;
  /** Force the success (green) state once a value has validated. */
  state?: FieldState;
  /**
   * Typed date mask. Digits are formatted to MM/DD/YYYY as they arrive and the
   * unfilled remainder is shown greyed. Use this for dates a picker would make
   * WORSE — date of birth, licence expiry — where scrolling back decades is
   * slower than typing. The Figma frames call this out explicitly.
   */
  mask?: 'date';
  /** Trailing info icon, for fields that need a "where do I find this?" hint. */
  infoTitle?: string;
  /** Extra class on the wrapper. */
  className?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

const DATE_MASK = 'MM/DD/YYYY';

/** Digits → "MM/DD/YYYY", inserting the slashes as the user types. */
export function formatDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join('/');
}

export function FormField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  disabled = false,
  name,
  id,
  autoComplete,
  placeholder,
  error,
  help,
  state = 'default',
  mask,
  infoTitle,
  className,
  onBlur,
  onFocus,
}: FormFieldProps) {
  const reactId = useId();
  const inputId = id ?? `hb-field-${reactId}`;
  const messageId = `${inputId}-message`;

  // Masked fields start hidden and are revealed by the eye toggle.
  const [revealed, setRevealed] = useState(false);

  // An error always wins: a green border above a red message would be nonsense.
  const effectiveState: FieldState = error ? 'error' : state;

  // The greyed remainder of the mask, e.g. "YYYY" once "01/10/" is typed.
  const maskRemainder = useMemo(
    () => (mask === 'date' && value.length < DATE_MASK.length ? DATE_MASK.slice(value.length) : ''),
    [mask, value],
  );

  const handleChange = (next: string) => {
    onChange(mask === 'date' ? formatDateMask(next) : next);
  };

  const wrapperClass = [
    'hb-field',
    `hb-field--${effectiveState}`,
    'hb-field--labelled',
    disabled ? 'hb-field--disabled' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass}>
      <div className="hb-field__box">
        <div className="hb-field__data">
          {/*
            The input comes BEFORE the label in the DOM so the CSS sibling
            selector can float the label off `:focus` / `:not(:placeholder-shown)`.
            `placeholder=" "` (a space, not empty) is what makes
            `:placeholder-shown` reliable when the caller passes no placeholder.
          */}
          <input
            id={inputId}
            name={name}
            className="hb-field__input"
            type={type === 'password' && revealed ? 'text' : type}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder ?? ' '}
            required={required}
            disabled={disabled}
            autoComplete={autoComplete}
            inputMode={mask === 'date' ? 'numeric' : undefined}
            aria-invalid={effectiveState === 'error' || undefined}
            aria-describedby={error || help ? messageId : undefined}
          />
          <label className="hb-field__label" htmlFor={inputId}>
            {label}
            {required && <span className="hb-field__required" aria-hidden="true">*</span>}
          </label>

          {maskRemainder && (
            <span className="hb-field__mask-hint" aria-hidden="true">
              <span>{value}</span>
              <span>{maskRemainder}</span>
            </span>
          )}
        </div>

        <div className="hb-field__icons">
          {type === 'password' && (
            <button
              type="button"
              className="hb-field__icon-button hb-field__icon--affordance"
              onClick={() => setRevealed((r) => !r)}
              aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
              aria-pressed={revealed}
              disabled={disabled}
            >
              {revealed ? <EyeOffIcon className="hb-field__icon" /> : <EyeOnIcon className="hb-field__icon" />}
            </button>
          )}

          {type === 'search' && <SearchIcon className="hb-field__icon hb-field__icon--affordance" />}
          {type === 'date' && <CalendarIcon className="hb-field__icon hb-field__icon--affordance" />}
          {mask === 'date' && type !== 'date' && (
            <CalendarIcon className="hb-field__icon hb-field__icon--affordance" />
          )}

          {/* State icon last, nearest the edge — matches every Figma frame. */}
          {effectiveState === 'success' && <CheckIcon className="hb-field__icon" />}
          {effectiveState === 'error' && <AlertIcon className="hb-field__icon" />}
          {effectiveState === 'default' && infoTitle && (
            <InfoIcon className="hb-field__icon hb-field__icon--affordance" />
          )}
        </div>
      </div>

      {/* `role="alert"` announces a validation failure to a screen reader the
          moment it appears; neutral help text must not hijack focus that way. */}
      {error ? (
        <p className="hb-field__error" id={messageId} role="alert">{error}</p>
      ) : help ? (
        <p className="hb-field__help" id={messageId}>{help}</p>
      ) : null}
    </div>
  );
}
