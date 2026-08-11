// ===========================================================================
// Form field icons — inline SVG, traced byte-for-byte from the Figma exports
// (Mariposa — Duda, node 8753-47700).
//
// INLINE, NOT URLs. The widgets ship as AMD bundles loaded into Duda from a CDN
// and cannot pull remote assets at runtime; Figma's own export URLs also expire
// after ~7 days. Same reasoning as `widget-tier-selection/paymentIcons.tsx`.
//
// GEOMETRY. Every icon is a 24×24 box (`--hb-field-icon-size`) containing the
// exported artwork at its natural size, translated to the offset the design
// specifies. The translate values are derived from each node's Figma insets, NOT
// eyeballed — e.g. the check tick sits in a 14.5×10.72 leaf inset 22.92%/29.17%,
// which after the stroke bleed puts its 16.5×12.72 artwork at (4.5, 6). Nothing
// is scaled, so stroke weights stay a true 2px across the whole set.
//
// COLOUR. Every stroke is `currentColor`, so state colour is set once in CSS on
// the wrapper (grey at rest, green on success, red on error) instead of being
// baked into each icon.
// ===========================================================================

import React from 'react';

export interface IconProps {
  /** Square px size. Defaults to the 24px the form fields use. */
  size?: number;
  className?: string;
}

/** Shared 24-grid frame. `tx`/`ty` place the artwork exactly as Figma does. */
function Frame({
  size = 24,
  className,
  tx,
  ty,
  children,
}: IconProps & { tx: number; ty: number; children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g
        transform={`translate(${tx} ${ty})`}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}

/** search/search-default — "find, explore, magnifying glass, look up". */
export function SearchIcon(props: IconProps) {
  return (
    <Frame {...props} tx={2} ty={2}>
      <path d="M19 19L12.9497 12.9497M12.9497 12.9497C14.2165 11.683 15 9.933 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15C9.933 15 11.683 14.2165 12.9497 12.9497Z" />
    </Frame>
  );
}

/** calendar/calendar-default — "date, schedule, month, event, plan". */
export function CalendarIcon(props: IconProps) {
  return (
    <Frame {...props} tx={2} ty={1}>
      <path d="M6 1V3.12777M6 5V3.12777M14 1V3.12777M14 5V3.12777M6 3.12777C5.50219 3.19536 5.08538 3.29871 4.7039 3.45672C3.23373 4.06569 2.06569 5.23373 1.45672 6.7039C1.20333 7.31564 1.09052 8.01824 1.0403 9C1 9.78781 1 10.7554 1 12C1 14.7956 1 16.1935 1.45672 17.2961C2.06569 18.7663 3.23373 19.9343 4.7039 20.5433C5.80653 21 7.20435 21 10 21C12.7956 21 14.1935 21 15.2961 20.5433C16.7663 19.9343 17.9343 18.7663 18.5433 17.2961C19 16.1935 19 14.7956 19 12C19 10.7554 19 9.78781 18.9597 9M18.9597 9C18.9095 8.01824 18.7967 7.31564 18.5433 6.7039C17.9343 5.23373 16.7663 4.06569 15.2961 3.45672C14.9146 3.29871 14.4978 3.19536 14 3.12777M18.9597 9H1.0403M6 3.12777C6.94106 3 8.17157 3 10 3C11.8284 3 13.0589 3 14 3.12777" />
    </Frame>
  );
}

/** check tick/check-tick-single — "confirm, done, approve, success, validation". */
export function CheckIcon(props: IconProps) {
  return (
    <Frame {...props} tx={4.5} ty={6}>
      <path d="M1.00002 6.5001L5.51686 11.7248L5.91769 11.0239C8.06683 7.26593 11.0411 4.0449 14.6162 1.60364L15.5 1.0001" />
    </Frame>
  );
}

/** alert/alert-triangle — "warning, hazard, caution, critical, attention". */
export function AlertIcon(props: IconProps) {
  return (
    <Frame {...props} tx={0.875} ty={2}>
      <path d="M11.1249 11.0001V7.0001M11.1249 14.3751V14.3762M9.73501 1.28373C10.6239 0.905424 11.626 0.905424 12.5149 1.28373C15.1663 2.41217 21.4295 12.4218 21.246 15.0972C21.174 16.1459 20.6544 17.1112 19.8222 17.7421C17.6094 19.4193 4.64042 19.4193 2.42773 17.7421C1.59552 17.1112 1.07585 16.1459 1.0039 15.0972C0.82034 12.4218 7.08357 2.41217 9.73501 1.28373Z" />
    </Frame>
  );
}

/** information/information-circle — "info, details, help, guide, support". */
export function InfoIcon(props: IconProps) {
  return (
    <Frame {...props} tx={2} ty={2}>
      <path d="M10 9.99991V13.9999M10 6.6249V6.62378M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" />
    </Frame>
  );
}

/** eye/eye-on — "visibility, view, open, watch, seen". Value is revealed. */
export function EyeOnIcon(props: IconProps) {
  return (
    <Frame {...props} tx={2} ty={4}>
      <path d="M19 8C19 10 15.5 15 10 15C4.5 15 1 10 1 8C1 6 4.5 1 10 1C15.5 1 19 6 19 8Z" />
      <path d="M13 8C13 9.65685 11.6569 11 10 11C8.34315 11 7 9.65685 7 8C7 6.34315 8.34315 5 10 5C11.6569 5 13 6.34315 13 8Z" />
    </Frame>
  );
}

/** eye/eye-off — "visibility hidden, private, conceal, unseen". Value is masked. */
export function EyeOffIcon(props: IconProps) {
  return (
    <Frame {...props} tx={1} ty={1}>
      <path d="M19.0778 8.57842C19.6787 9.51267 20 10.394 20 11C20 13 16.5 18 11 18C10.569 18 10.1502 17.9693 9.74452 17.9117M16.2929 5.70713C14.8674 4.71248 13.0762 4 11 4C5.5 4 2 9 2 11C2 12.245 3.35633 14.6526 5.70713 16.2929M13.1213 8.87868L16.2929 5.70713L21 1M8.87868 13.1213L5.70713 16.2929L1 21M8.87868 13.1213C8.33579 12.5784 8 11.8284 8 11C8 9.34315 9.34315 8 11 8C11.8284 8 12.5784 8.33579 13.1213 8.87868M8.87868 13.1213L13.1213 8.87868" />
    </Frame>
  );
}
