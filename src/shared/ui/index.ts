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

export { FormField, formatDateMask, formatPhoneMask } from './FormField';
export type { FormFieldProps, FieldState, FieldType } from './FormField';

export { formatPhoneInput, normalizePhone, isPossiblePhone } from './phone';
export type { PhoneCountry } from './phone';

export { Button } from './Button';
export type { ButtonProps, ButtonTone, ButtonFill, ButtonShape } from './Button';

export { Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';

export { DateModal } from './DateModal';
export type { DateModalProps } from './DateModal';

export { MoneyBreakdown } from './MoneyBreakdown';
export type { MoneyBreakdownProps, MoneyBreakdownData, MoneyLine } from './MoneyBreakdown';

export { SummaryRail } from './SummaryRail';
export type { SummaryRailProps } from './SummaryRail';

export { formatPrice } from './format';

export {
  VisaMark, MastercardMark, AmexMark, DiscoverMark, ApplePayMark, GooglePayMark,
} from './paymentIcons';

export {
  SearchIcon, CalendarIcon, CheckIcon, AlertIcon, InfoIcon, EyeOnIcon, EyeOffIcon, CloseIcon,
  CloseSolidIcon,
  TagIcon, MapPinIcon, PhoneIcon,
} from './icons';
export type { IconProps } from './icons';
