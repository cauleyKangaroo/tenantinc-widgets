// ===========================================================================
// Shared UI kit — import everything from here, not from the individual files.
//
//   import { FormField, Button } from '@shared/ui';
//
// Importing the barrel also pulls in the components' CSS (they import their own),
// so there is nothing to remember to add. `tokens.css` is imported by both
// stylesheets, and CSS `@import` de-duplicates, so the variables land once.
//
// Built from the Mariposa — Duda Figma file:
//   forms   node 8753-47700
//   buttons node 9215-57188
// ===========================================================================

export { FormField, formatDateMask } from './FormField';
export type { FormFieldProps, FieldState, FieldType } from './FormField';

export { Button } from './Button';
export type { ButtonProps, ButtonTone, ButtonFill, ButtonShape } from './Button';

export {
  SearchIcon, CalendarIcon, CheckIcon, AlertIcon, InfoIcon, EyeOnIcon, EyeOffIcon,
} from './icons';
export type { IconProps } from './icons';
