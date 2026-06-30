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
