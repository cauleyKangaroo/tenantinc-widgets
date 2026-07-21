import React from 'react';

// ===========================================================================
// Icons for the Tier Selection widget (#14). Traced from the Figma design
// (Mariposa — Duda, node 8551-26950 / 8551-27233). Stroke icons follow
// `currentColor`; the promo star is a filled green mark.
// ===========================================================================

const stroke = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Green tick used in the comparison table + amenity lists (mdiCheck style). */
export function CheckIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M20 6.5L9.5 17 4 11.5" />
    </svg>
  );
}

/** Filled rounded 5-point star (Figma component 6382:28519), used for
 *  highlighted features / access hours. Inherits colour via `currentColor`. */
export function PromoStar({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 20.7191 19.9999" fill="currentColor" aria-hidden>
      <path d="M11.9014 0.41641C10.9485 -0.138803 9.7706 -0.138803 8.81765 0.41641C8.30575 0.714653 7.95492 1.21145 7.65961 1.7204C7.36007 2.23665 7.02999 2.9284 6.62539 3.77633L6.60609 3.81677C6.33264 4.38983 6.26864 4.50492 6.1971 4.58824C6.08904 4.71411 5.95302 4.81294 5.79992 4.87681C5.69857 4.9191 5.56934 4.9444 4.93982 5.02739L4.89539 5.03324C3.96393 5.15601 3.20405 5.25617 2.62051 5.38152C2.04521 5.5051 1.46431 5.68525 1.02248 6.07993C0.199963 6.81467 -0.164017 7.93489 0.0695437 9.01277C0.195006 9.59177 0.559076 10.079 0.951861 10.5171C1.35026 10.9615 1.90614 11.4891 2.58751 12.1359L2.62007 12.1668C3.08059 12.604 3.17026 12.7004 3.2274 12.7942C3.31372 12.9359 3.36567 13.0958 3.37911 13.2611C3.38801 13.3706 3.37214 13.5013 3.25653 14.1257L3.24837 14.1697C3.0773 15.0935 2.93773 15.8472 2.87663 16.4409C2.81638 17.0262 2.8082 17.6344 3.04703 18.1765C3.49164 19.1858 4.44455 19.8782 5.54185 19.9891C6.13129 20.0487 6.70713 19.853 7.2452 19.6149C7.79097 19.3733 8.4646 19.0076 9.29032 18.5595L9.32972 18.5381C9.88778 18.2352 10.0072 18.1797 10.1141 18.1544C10.2755 18.116 10.4436 18.116 10.605 18.1544C10.7119 18.1797 10.8313 18.2352 11.3893 18.5381L11.4287 18.5595C12.2544 19.0076 12.9281 19.3733 13.4739 19.6149C14.0119 19.853 14.5878 20.0487 15.1772 19.9891C16.2745 19.8782 17.2274 19.1858 17.672 18.1765C17.9109 17.6344 17.9027 17.0262 17.8424 16.4409C17.7813 15.8472 17.6418 15.0936 17.4707 14.1698L17.4625 14.1257C17.3469 13.5013 17.3311 13.3706 17.34 13.2611C17.3534 13.0958 17.4053 12.9359 17.4917 12.7942C17.5488 12.7004 17.6385 12.604 18.099 12.1668L18.1314 12.1361C18.8129 11.4892 19.3688 10.9615 19.7672 10.5171C20.16 10.079 20.5241 9.59177 20.6495 9.01277C20.8831 7.93489 20.5191 6.81467 19.6966 6.07993C19.2548 5.68525 18.6739 5.5051 18.0986 5.38152C17.515 5.25617 16.7551 5.15602 15.8237 5.03324L15.7792 5.02739C15.1497 4.9444 15.0205 4.9191 14.9191 4.87681C14.766 4.81294 14.63 4.71411 14.522 4.58824C14.4504 4.50492 14.3864 4.38983 14.113 3.81677L14.0937 3.77632C13.6891 2.9284 13.359 2.23664 13.0595 1.7204C12.7641 1.21145 12.4133 0.714653 11.9014 0.41641Z" />
    </svg>
  );
}

/** Price/discount tag (solid). */
export function TagIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8.56536 2.06851C10.0052 1.99251 10.91 1.94475 11.7786 2.11974C12.5471 2.27458 13.2842 2.55741 13.959 2.95642C14.7216 3.40739 15.3622 4.04817 16.3816 5.06789L19.0422 7.72841C20.2226 8.90824 20.9861 9.6713 21.4186 10.5202C22.2906 12.2315 22.2906 14.2568 21.4186 15.9681C20.9861 16.817 20.2226 17.5801 19.0422 18.7599L18.7599 19.0422C17.5801 20.2226 16.817 20.9861 15.9681 21.4186C14.2568 22.2906 12.2315 22.2906 10.5202 21.4186C9.6713 20.9861 8.90826 20.2226 7.72841 19.0422L5.06789 16.3816C4.04817 15.3622 3.40739 14.7216 2.95642 13.959C2.55741 13.2842 2.27458 12.5471 2.11974 11.7786C1.94475 10.91 1.99251 10.0052 2.06851 8.56536L2.12104 7.56742C2.15943 6.83795 2.19124 6.23336 2.256 5.73945C2.32352 5.22452 2.43504 4.75288 2.67358 4.30811C3.04569 3.61428 3.61428 3.04569 4.30811 2.67358C4.75288 2.43504 5.22452 2.32352 5.73945 2.256C6.23337 2.19124 6.83795 2.15943 7.56743 2.12104L8.56536 2.06851ZM8.4895 6.48779C7.38493 6.48779 6.4895 7.38322 6.4895 8.48779C6.4895 9.59236 7.38493 10.4878 8.4895 10.4878C9.59407 10.4878 10.4895 9.59236 10.4895 8.48779C10.4895 7.38322 9.59407 6.48779 8.4895 6.48779Z" />
    </svg>
  );
}

/** Filled circle with a play triangle — the "See what fits" affordance. */
export function PlayCircle({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M10 8.5l5 3.5-5 3.5V8.5z" fill="#fff" />
    </svg>
  );
}

/** Circle with a tick (Figma component 7891:67837) — the included-feature
 *  marker in Option 2 cards. Dark by default; inherits `currentColor`. */
export function CheckCircle({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 20.3 20.3" {...stroke}>
      <path d="M6.65002 10.6624L8.99122 13.0011C10.1172 11.0321 11.6756 9.34447 13.5487 8.06539L13.65 7.99622M19.3 10.15C19.3 15.2034 15.2034 19.3 10.15 19.3C5.09659 19.3 1 15.2034 1 10.15C1 5.09659 5.09659 1 10.15 1C15.2034 1 19.3 5.09659 19.3 10.15Z" />
    </svg>
  );
}

/** Info circle beside the admin-fee note in Option 2. */
export function InfoCircle({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.75" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Chevron used by the mobile "Total Cost to Move-In" dropdown. */
export function ChevronDown({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function MapPinIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M12.0004 13.7105C13.6137 13.7105 14.9215 12.4027 14.9215 10.7895C14.9215 9.17622 13.6137 7.86842 12.0004 7.86842C10.3872 7.86842 9.07936 9.17622 9.07936 10.7895C9.07936 12.4027 10.3872 13.7105 12.0004 13.7105Z" />
      <path d="M12.0004 21.5C13.9478 21.5 19.7899 17.3889 19.7899 11.2222C19.7899 5.05556 14.9215 3 12.0004 3C9.07936 3 4.21094 5.05556 4.21094 11.2222C4.21094 17.3889 10.053 21.5 12.0004 21.5Z" />
    </svg>
  );
}

export function PhoneIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M5.40731 12.974C4.16988 10.8771 3.35625 8.43264 3.03493 5.70916C2.89384 4.51323 3.63519 3.25377 4.89733 3.04738C5.29394 2.98252 5.78431 2.99232 6.18768 3.0287C7.87081 3.18051 8.56658 4.6661 8.93595 6.10803C9.43051 8.03869 8.82802 10.0852 7.36633 11.4397C6.76147 12.0002 6.06056 12.4721 5.40731 12.974ZM5.40731 12.974C6.72406 15.2053 8.52068 17.043 10.7146 18.4047M10.7146 18.4047C12.8787 19.7478 15.4294 20.6276 18.2874 20.965C19.4834 21.1062 20.7424 20.3643 20.9487 19.1022C21.0194 18.6693 21.011 18.1714 20.9595 17.7362C20.7499 15.9658 19.0455 15.2967 17.5244 14.9479C15.7912 14.5505 13.9733 15.0271 12.6579 16.2238C11.9438 16.8733 11.3466 17.6768 10.7146 18.4047Z" />
    </svg>
  );
}
