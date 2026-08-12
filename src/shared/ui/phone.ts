// ===========================================================================
// Phone helpers — thin wrapper over libphonenumber-js/min.
//
// We import the `/min` metadata set on purpose: it carries the numbering plans
// we need for as-you-type grouping and E.164 normalisation, without the extra
// number-TYPE detection weight of `/max` or `/mobile`. Root import is avoided
// so webpack pulls only this subset.
//
// SPLIT OF CONCERNS (important):
//   - formatPhoneInput() is DISPLAY ONLY — what the customer sees as they type.
//   - normalizePhone()   is the API BOUNDARY — canonical E.164 for storage/send.
// The controlled field keeps the pretty display string; we normalise to E.164
// only at submission, never mid-keystroke. This is what keeps typing (deleting a
// digit, pasting, entering an international "+…" number) from fighting the caret.
// ===========================================================================

import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js/min';

/** Default region used to interpret a number typed without a "+" country code. */
export type PhoneCountry = 'US' | 'CA';

/**
 * As-you-type display formatting, e.g. "(415) 555-2671". Returns the caller's
 * string reshaped for readability; an explicit "+…" number is grouped by its
 * own country, otherwise `defaultCountry` is assumed. Never throws.
 */
export function formatPhoneInput(value: string, defaultCountry: PhoneCountry = 'US'): string {
  return new AsYouType(defaultCountry).input(value);
}

/**
 * Canonical E.164 for the API boundary, e.g. "+14155552671", or `undefined`
 * when the input is not even a *possible* number. Callers should treat
 * `undefined` as a validation failure and block submission. Never throws.
 */
export function normalizePhone(value: string, defaultCountry: PhoneCountry = 'US'): string | undefined {
  const phone = parsePhoneNumberFromString(value, defaultCountry);
  return phone?.isPossible() ? phone.number : undefined;
}

/** True when `value` parses to a possible number — the validity gate for the UI. */
export function isPossiblePhone(value: string, defaultCountry: PhoneCountry = 'US'): boolean {
  return normalizePhone(value, defaultCountry) !== undefined;
}
