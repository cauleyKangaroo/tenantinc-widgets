import React from 'react';

// ===========================================================================
// Icons for the Navigation Bar — phone, message-ai, user-circle from the Figma
// vectors; chevron matches the other widgets. All stroke `currentColor`.
// ===========================================================================

export function ChevronDown({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRight({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PhoneIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5.40731 12.974C4.16988 10.8771 3.35625 8.43264 3.03493 5.70916C2.89384 4.51323 3.63519 3.25377 4.89733 3.04738C5.29394 2.98252 5.78431 2.99232 6.18768 3.0287C7.87081 3.18051 8.56658 4.6661 8.93595 6.10803C9.43051 8.03869 8.82802 10.0852 7.36633 11.4397C6.76147 12.0002 6.06056 12.4721 5.40731 12.974ZM5.40731 12.974C6.72406 15.2053 8.52068 17.043 10.7146 18.4047M10.7146 18.4047C12.8787 19.7478 15.4294 20.6276 18.2874 20.965C19.4834 21.1062 20.7424 20.3643 20.9487 19.1022C21.0194 18.6693 21.011 18.1714 20.9595 17.7362C20.7499 15.9658 19.0455 15.2967 17.5244 14.9479C15.7912 14.5505 13.9733 15.0271 12.6579 16.2238C11.9438 16.8733 11.3466 17.6768 10.7146 18.4047Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MessageAiIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V12.2C3 13.8802 3 14.7202 3.32698 15.362C3.6146 15.9265 4.07354 16.3854 4.63803 16.673C5.27976 17 6.11984 17 7.8 17H8V21L13 17H16.2C17.8802 17 18.7202 17 19.362 16.673C19.9265 16.3854 20.3854 15.9265 20.673 15.362C21 14.7202 21 13.8802 21 12.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 13.6748H8.501M12.5 6.6748C11.8625 8.29127 11.1609 9.01977 9.5 9.6748C11.1609 10.3298 11.8625 11.0583 12.5 12.6748C13.1375 11.0583 13.8391 10.3298 15.5 9.6748C13.8391 9.01976 13.1375 8.29127 12.5 6.6748Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UserCircleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path
        d="M34.8234 35.1023C34.6371 31.8864 31.8399 29.3333 28.4167 29.3333H15.5833C12.1601 29.3333 9.3629 31.8864 9.17655 35.1023M9.17655 35.1023C12.4826 38.3384 17.0083 40.3333 22 40.3333C26.9917 40.3333 31.5174 38.3384 34.8234 35.1023C38.2234 31.7743 40.3333 27.1335 40.3333 22C40.3333 11.8748 32.1252 3.66667 22 3.66667C11.8748 3.66667 3.66667 11.8748 3.66667 22C3.66667 27.1335 5.77659 31.7743 9.17655 35.1023ZM27.5 18.3333C27.5 21.3709 25.0376 23.8333 22 23.8333C18.9624 23.8333 16.5 21.3709 16.5 18.3333C16.5 15.2958 18.9624 12.8333 22 12.8333C25.0376 12.8333 27.5 15.2958 27.5 18.3333Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MessageDefaultIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V12.2C3 13.8802 3 14.7202 3.32698 15.362C3.6146 15.9265 4.07354 16.3854 4.63803 16.673C5.27976 17 6.11984 17 7.8 17H8V21L13 17H16.2C17.8802 17 18.7202 17 19.362 16.673C19.9265 16.3854 20.3854 15.9265 20.673 15.362C21 14.7202 21 13.8802 21 12.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 8.5H16.5M7.5 12H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CreditCardIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M2 9.5h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Simplified US flag (stripes + canton) for the language selector. */
export function UsFlagIcon({ width = 20, height = 14 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 20 14" fill="none" aria-hidden="true">
      <rect width="20" height="14" rx="1.5" fill="#F5F8FB" />
      <rect y="0" width="20" height="2" fill="#DC251C" />
      <rect y="4" width="20" height="2" fill="#DC251C" />
      <rect y="8" width="20" height="2" fill="#DC251C" />
      <rect y="12" width="20" height="2" fill="#DC251C" />
      <rect width="9" height="8" fill="#2E4E9D" />
    </svg>
  );
}

// ===========================================================================
// Storage Types dropdown icons — traced from the Figma SVG vectors (16x16,
// fills swapped to currentColor so they inherit the row's text colour).
// ===========================================================================

export function SelfStorageIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.66667 2C2.29848 2 2 2.29848 2 2.66667V13.3333C2 13.7015 2.29848 14 2.66667 14H4V7.33333H12V14H13.3333C13.7015 14 14 13.7015 14 13.3333V2.66667C14 2.29848 13.7015 2 13.3333 2H2.66667ZM6 3.33333H10V4.66667H6V3.33333Z" fill="currentColor" />
      <path d="M5.33333 8.66667H10.6667V10H5.33333V8.66667Z" fill="currentColor" />
      <path d="M10.6667 11.3333H5.33333V12.6667H10.6667V11.3333Z" fill="currentColor" />
    </svg>
  );
}

export function BusinessStorageIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M5.71429 2.66667C5.0831 2.66667 4.57143 3.12883 4.57143 3.69893V4.3379L3.12844 4.89648C2.8483 5.00492 2.66667 5.25373 2.66667 5.52902V6.45159H13.3333V5.52902C13.3333 5.25373 13.1517 5.00492 12.8716 4.89648L11.4286 4.3379V3.69893C11.4286 3.12883 10.9169 2.66667 10.2857 2.66667H5.71429ZM10.2857 3.75959H5.71429V5.13594H10.2857V3.75959Z" fill="currentColor" />
      <path d="M2.66667 13.3333H3.42857C3.84936 13.3333 4.19048 13.0252 4.19048 12.6452V8.51609H11.8095V12.6452C11.8095 13.0252 12.1506 13.3333 12.5714 13.3333H13.3333V7.13974H2.66667V13.3333Z" fill="currentColor" />
      <path d="M4.95238 9.20427H11.0476V10.5806H4.95238V9.20427Z" fill="currentColor" />
      <path d="M11.0476 11.2688H4.95238V12.6452H11.0476V11.2688Z" fill="currentColor" />
    </svg>
  );
}

export function DriveUpIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 7.33333L4.66667 4.66667H11.3333L12 7.33333H4ZM12.6133 4C12.4733 3.6 12.0933 3.33333 11.6667 3.33333H4.33333C3.90667 3.33333 3.52667 3.6 3.38667 4L2 8V13.3333C2 13.5101 2.07024 13.6797 2.19526 13.8047C2.32029 13.9298 2.48986 14 2.66667 14H3.33333C3.51014 14 3.67971 13.9298 3.80474 13.8047C3.92976 13.6797 4 13.5101 4 13.3333V12H12V13.3333C12 13.5101 12.0702 13.6797 12.1953 13.8047C12.3203 13.9298 12.4899 14 12.6667 14H13.3333C13.5101 14 13.6797 13.9298 13.8047 13.8047C13.9298 13.6797 14 13.5101 14 13.3333V8L12.6133 4ZM4.66667 10.6667H3.33333V9.33333H4.66667V10.6667ZM12.6667 10.6667H11.3333V9.33333H12.6667V10.6667ZM9.33333 10.6667H6.66667V9.33333H9.33333V10.6667Z" fill="currentColor" />
    </svg>
  );
}

export function VehicleRvIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13.3333 5.33333H14.6667V4L13.3333 2.66667H2C1.64638 2.66667 1.30724 2.80714 1.05719 3.05719C0.807142 3.30724 0.666667 3.64638 0.666667 4V10C0.666667 10.3536 0.807142 10.6928 1.05719 10.9428C1.30724 11.1929 1.64638 11.3333 2 11.3333H2.66667C2.66667 11.8638 2.87738 12.3725 3.25245 12.7475C3.62753 13.1226 4.13623 13.3333 4.66667 13.3333C5.1971 13.3333 5.70581 13.1226 6.08088 12.7475C6.45595 12.3725 6.66667 11.8638 6.66667 11.3333H10C10 11.8638 10.2107 12.3725 10.5858 12.7475C10.9609 13.1226 11.4696 13.3333 12 13.3333C12.5304 13.3333 13.0391 13.1226 13.4142 12.7475C13.7893 12.3725 14 11.8638 14 11.3333H15.3333V8L13.3333 5.33333ZM4.66667 12.3333C4.40145 12.3333 4.1471 12.228 3.95956 12.0404C3.77202 11.8529 3.66667 11.5985 3.66667 11.3333C3.66667 11.0681 3.77202 10.8138 3.95956 10.6262C4.1471 10.4387 4.40145 10.3333 4.66667 10.3333C4.93188 10.3333 5.18624 10.4387 5.37377 10.6262C5.56131 10.8138 5.66667 11.0681 5.66667 11.3333C5.66667 11.5985 5.56131 11.8529 5.37377 12.0404C5.18624 12.228 4.93188 12.3333 4.66667 12.3333ZM6 8H2V6H6V8ZM9.33333 10H7.33333V6H9.33333V10ZM12 12.3333C11.8022 12.3333 11.6089 12.2747 11.4444 12.1648C11.28 12.0549 11.1518 11.8987 11.0761 11.716C11.0004 11.5333 10.9806 11.3322 11.0192 11.1382C11.0578 10.9443 11.153 10.7661 11.2929 10.6262C11.4327 10.4864 11.6109 10.3911 11.8049 10.3525C11.9989 10.314 12.2 10.3338 12.3827 10.4095C12.5654 10.4851 12.7216 10.6133 12.8315 10.7778C12.9413 10.9422 13 11.1356 13 11.3333C12.9932 11.5964 12.8857 11.8469 12.6996 12.033C12.5135 12.2191 12.2631 12.3266 12 12.3333ZM11.3333 8V6.33333H13L14.3333 8H11.3333Z" fill="currentColor" />
    </svg>
  );
}

export function MailboxIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M3.2 3.20003H12.8C13.46 3.20003 14 3.74003 14 4.40003V11.6C14 12.26 13.46 12.8 12.8 12.8H3.2C2.54 12.8 2 12.26 2 11.6L2.006 4.40003C2.006 3.74003 2.54 3.20003 3.2 3.20003ZM8 8.60003L12.8 5.60003V4.40003L8 7.40003L3.2 4.40003V5.60003L8 8.60003Z" fill="currentColor" />
    </svg>
  );
}

export function ClimateControlledIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5.64167 13.6917C4.99167 13.0417 4.66667 12.2556 4.66667 11.3333C4.66667 10.8 4.78333 10.3028 5.01667 9.84167C5.25 9.38055 5.57778 8.98889 6 8.66667V3.33333C6 2.77778 6.19444 2.30556 6.58333 1.91667C6.97222 1.52778 7.44444 1.33333 8 1.33333C8.55556 1.33333 9.02778 1.52778 9.41667 1.91667C9.80556 2.30556 10 2.77778 10 3.33333V8.66667C10.4222 8.98889 10.75 9.38055 10.9833 9.84167C11.2167 10.3028 11.3333 10.8 11.3333 11.3333C11.3333 12.2556 11.0083 13.0417 10.3583 13.6917C9.70833 14.3417 8.92222 14.6667 8 14.6667C7.07778 14.6667 6.29167 14.3417 5.64167 13.6917ZM7.33333 7.33333H8.66667V6.66667H8V6H8.66667V4.66667H8V4H8.66667V3.33333C8.66667 3.14444 8.60278 2.98611 8.475 2.85833C8.34722 2.73056 8.18889 2.66667 8 2.66667C7.81111 2.66667 7.65278 2.73056 7.525 2.85833C7.39722 2.98611 7.33333 3.14444 7.33333 3.33333V7.33333Z" fill="currentColor" />
    </svg>
  );
}

// ===========================================================================
// Mobile menu icons — traced from the Figma vectors (24x24, stroke currentColor).
// ===========================================================================

export function EnvelopeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 7l8.5 6 8.5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MapPinIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12.0004 13.7105C13.6137 13.7105 14.9215 12.4027 14.9215 10.7895C14.9215 9.17622 13.6137 7.86842 12.0004 7.86842C10.3872 7.86842 9.07936 9.17622 9.07936 10.7895C9.07936 12.4027 10.3872 13.7105 12.0004 13.7105Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.0004 21.5C13.9478 21.5 19.7899 17.3889 19.7899 11.2222C19.7899 5.05556 14.9215 3 12.0004 3C9.07936 3 4.21094 5.05556 4.21094 11.2222C4.21094 17.3889 10.053 21.5 12.0004 21.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LoginIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18.1885 9C19.1755 9.74024 20.0668 10.599 20.8426 11.5564C20.9475 11.6859 21 11.843 21 12M18.1885 15C19.1755 14.2598 20.0668 13.401 20.8426 12.4436C20.9475 12.3141 21 12.157 21 12M21 12H8M13 4.52779C11.9385 3.57771 10.5367 3 9 3C5.68629 3 3 5.68629 3 9V15C3 18.3137 5.68629 21 9 21C10.5367 21 11.9385 20.4223 13 19.4722" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KeyIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.0001 10L22.0001 12L20.0001 14H17.0001L15.8541 12.854C15.8077 12.8074 15.7525 12.7705 15.6917 12.7453C15.631 12.7201 15.5659 12.7071 15.5001 12.7071C15.4343 12.7071 15.3692 12.7201 15.3085 12.7453C15.2477 12.7705 15.1926 12.8074 15.1461 12.854L14.0001 14H10.5321C10.081 14.9092 9.33588 15.6391 8.41763 16.0714C7.49939 16.5037 6.46198 16.6129 5.47386 16.3812C4.48575 16.1496 3.60495 15.5907 2.9745 14.7954C2.34406 14 2.00098 13.0149 2.00098 12C2.00098 10.9851 2.34406 9.99999 2.9745 9.20465C3.60495 8.40931 4.48575 7.85044 5.47386 7.61879C6.46198 7.38714 7.49939 7.49632 8.41763 7.92859C9.33588 8.36086 10.081 9.09084 10.5321 10H20.0001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.50011 13V11C5.34486 11.1164 5.21886 11.2674 5.13207 11.441C5.04529 11.6146 5.00011 11.8059 5.00011 12C5.00011 12.1941 5.04529 12.3855 5.13207 12.559C5.21886 12.7326 5.34486 12.8836 5.50011 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M17.5 17.5L12.4581 12.4581M12.4581 12.4581C13.5137 11.4025 14.1667 9.94416 14.1667 8.33333C14.1667 5.11167 11.555 2.5 8.33333 2.5C5.11167 2.5 2.5 5.11167 2.5 8.33333C2.5 11.555 5.11167 14.1667 8.33333 14.1667C9.94416 14.1667 11.4025 13.5137 12.4581 12.4581Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HamburgerIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
