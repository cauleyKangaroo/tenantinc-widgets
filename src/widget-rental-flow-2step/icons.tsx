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

// ── Step 2 icons — exact Figma (Pika) vectors, currentColor stroke/fill. ────

// bank (Figma 6766:3585) — "Pay by Bank".
export function BankIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 22 21" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d="M1 20H21M3 12L3 17M8 12L8 17M14 12L14 17M19 12V17M21 9H1V8L9.08 1.94C9.76852 1.42361 10.1128 1.16542 10.4909 1.06589C10.8246 0.978037 11.1754 0.978037 11.5091 1.06589C11.8872 1.16542 12.2315 1.42361 12.92 1.94L21 8V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// credit-card (Figma 7607:27771) — "Credit / Debit".
export function CreditCardIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 22 18" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d="M1 6H21M5 10H8M14.6 17H7.4C5.15979 17 4.03969 17 3.18404 16.564C2.43139 16.1805 1.81947 15.5686 1.43597 14.816C1 13.9603 1 12.8402 1 10.6V7.4C1 5.15979 1 4.03969 1.43597 3.18404C1.81947 2.43139 2.43139 1.81947 3.18404 1.43597C4.03969 1 5.15979 1 7.4 1H14.6C16.8402 1 17.9603 1 18.816 1.43597C19.5686 1.81947 20.1805 2.43139 20.564 3.18404C21 4.03969 21 5.15979 21 7.4V10.6C21 12.8402 21 13.9603 20.564 14.816C20.1805 15.5686 19.5686 16.1805 18.816 16.564C17.9603 17 16.8402 17 14.6 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// info (Figma 6102:231) — beside "Autopay Enrollment".
export function InfoIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 13.3333 13.3333" fill="none" aria-hidden="true">
      <path d="M6.66667 0C2.98667 0 0 2.98667 0 6.66667C0 10.3467 2.98667 13.3333 6.66667 13.3333C10.3467 13.3333 13.3333 10.3467 13.3333 6.66667C13.3333 2.98667 10.3467 0 6.66667 0ZM7.33333 10H6V6H7.33333V10ZM7.33333 4.66667H6V3.33333H7.33333V4.66667Z" fill="currentColor" />
    </svg>
  );
}

// file-02-arrow-right (Figma 6743:42264) — "View Document".
export function FileArrowIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 18 22" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d="M17 10V17C17 19.2091 15.2091 21 13 21H5C2.79086 21 1 19.2091 1 17V5C1 2.79086 2.79086 1 5 1H8M17 10V9C17 4.58172 13.4183 1 9 1H8M17 10C17 8.34315 15.6569 7 14 7L13.4 7C13.0284 7 12.8426 7 12.6871 6.97538C11.8313 6.83983 11.1602 6.16865 11.0246 5.31287C11 5.1574 11 4.9716 11 4.6V4C11 2.34315 9.65685 1 8 1M10.1256 11C10.7836 11.4935 11.3779 12.066 11.8951 12.7043C11.965 12.7906 12 12.8953 12 13M10.1256 15C10.7836 14.5065 11.3779 13.934 11.8951 13.2957C11.965 13.2094 12 13.1047 12 13M12 13L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// chevron-big-right (Figma 6449:142004). Rotate 90° via CSS for a down chevron.
export function ChevronIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={(size * 8) / 14} height={size} viewBox="0 0 8 14" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d="M1 13C3.18079 11.423 5.13641 9.57707 6.81717 7.51013C7.06095 7.21033 7.06095 6.78968 6.81717 6.48988C5.13641 4.42294 3.18079 2.57701 1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Payment brand marks ─────────────────────────────────────────────────────

// Google "G" (4-colour) + "Pay".
export function GooglePayMark() {
  return (
    <span className="rf2-paylogo">
      <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
        <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
        <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
        <path fill="#EA4335" d="M24 9.5c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 2.66 29.93.5 24 .5 15.4.5 7.96 5.43 4.34 12.62l7.35 5.7C13.42 13.12 18.27 9.5 24 9.5z" />
      </svg>
      <span>Pay</span>
    </span>
  );
}

// Apple logo + "Pay".
export function ApplePayMark() {
  return (
    <span className="rf2-paylogo">
      <svg width="20" height="24" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
        <path d="M16.365 1.43c0 1.14-.42 2.2-1.12 2.99-.75.85-1.98 1.5-3.02 1.42-.13-1.12.42-2.28 1.09-3.02.75-.83 2.05-1.44 3.05-1.39zM20.66 17.1c-.55 1.27-.82 1.84-1.53 2.97-.99 1.57-2.38 3.53-4.1 3.54-1.53.02-1.92-.99-4-.98-2.07.01-2.5.99-4.03.98-1.72-.02-3.04-1.78-4.03-3.35-2.77-4.4-3.06-9.56-1.35-12.31 1.21-1.95 3.13-3.1 4.93-3.1 1.84 0 2.99 1.01 4.51 1.01 1.47 0 2.37-1.01 4.5-1.01 1.6 0 3.3.87 4.51 2.38-3.96 2.17-3.32 7.83.11 9.35z" />
      </svg>
      <span>Pay</span>
    </span>
  );
}
