import React from 'react';

// Check-tick — green validation mark inside a filled field, and the tick shown
// in the "renting as a business" checkbox when checked.
export function CheckTick({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 6.5 9.5 17 4.5 12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Calendar — Pika "calendar/calendar-default" (Figma 8507-23641), beside the
// modal title. Path is the exact Figma vector; currentColor lets it inherit.
export function CalendarIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 22"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <path
        d="M6 1V3.12777M6 5V3.12777M14 1V3.12777M14 5V3.12777M6 3.12777C5.50219 3.19536 5.08538 3.29871 4.7039 3.45672C3.23373 4.06569 2.06569 5.23373 1.45672 6.7039C1.20333 7.31564 1.09052 8.01824 1.0403 9C1 9.78781 1 10.7554 1 12C1 14.7956 1 16.1935 1.45672 17.2961C2.06569 18.7663 3.23373 19.9343 4.7039 20.5433C5.80653 21 7.20435 21 10 21C12.7956 21 14.1935 21 15.2961 20.5433C16.7663 19.9343 17.9343 18.7663 18.5433 17.2961C19 16.1935 19 14.7956 19 12C19 10.7554 19 9.78781 18.9597 9M18.9597 9C18.9095 8.01824 18.7967 7.31564 18.5433 6.7039C17.9343 5.23373 16.7663 4.06569 15.2961 3.45672C14.9146 3.29871 14.4978 3.19536 14 3.12777M18.9597 9H1.0403M6 3.12777C6.94106 3 8.17157 3 10 3C11.8284 3 13.0589 3 14 3.12777"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Close (×) — modal dismiss button.
export function CloseIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
