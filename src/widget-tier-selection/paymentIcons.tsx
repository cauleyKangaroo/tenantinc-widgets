import React from 'react';

// ===========================================================================
// Payment-method brand marks for the order-summary card (#14).
// Recreated as self-contained inline SVGs so the bundle stays a single AMD
// file (Duda requirement) — no remote brand assets. Visa / Mastercard /
// Discover sit in a bordered white chip; Amex fills its chip blue; Apple Pay
// and Google Pay render as bare marks.
// ===========================================================================

export function VisaMark() {
  return (
    <svg width="31" height="10" viewBox="0 0 31 10" aria-label="Visa">
      <text
        x="15.5"
        y="9"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="11"
        fontWeight="700"
        fontStyle="italic"
        letterSpacing="0.5"
        fill="#1A1F71"
      >
        VISA
      </text>
    </svg>
  );
}

export function MastercardMark() {
  return (
    <svg width="27" height="17" viewBox="0 0 27 17" aria-label="Mastercard">
      <circle cx="9.5" cy="8.5" r="8" fill="#EB001B" />
      <circle cx="17.5" cy="8.5" r="8" fill="#F79E1B" />
      <path
        d="M13.5 2.4a8 8 0 0 0 0 12.2 8 8 0 0 0 0-12.2z"
        fill="#FF5F00"
      />
    </svg>
  );
}

export function AmexMark() {
  return (
    <svg width="34" height="10" viewBox="0 0 34 12" aria-label="American Express">
      <text
        x="17"
        y="5"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="4"
        fontWeight="700"
        letterSpacing="0.3"
        fill="#fff"
      >
        AMERICAN
      </text>
      <text
        x="17"
        y="10.5"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="4"
        fontWeight="700"
        letterSpacing="0.3"
        fill="#fff"
      >
        EXPRESS
      </text>
    </svg>
  );
}

export function DiscoverMark() {
  return (
    <svg width="34" height="8" viewBox="0 0 34 8" aria-label="Discover">
      <text
        x="0"
        y="7"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="7"
        fontWeight="700"
        letterSpacing="-0.2"
        fill="#1A1A1A"
      >
        DISC
      </text>
      <circle cx="19.4" cy="4.4" r="3.2" fill="#F47216" />
      <text
        x="22.6"
        y="7"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="7"
        fontWeight="700"
        letterSpacing="-0.2"
        fill="#1A1A1A"
      >
        VER
      </text>
    </svg>
  );
}

export function ApplePayMark() {
  return (
    <svg width="37" height="16" viewBox="0 0 37 16" aria-label="Apple Pay">
      <path
        d="M7.03 4.13c.43-.53.72-1.25.64-1.98-.62.03-1.38.42-1.82.95-.4.46-.75 1.2-.66 1.9.7.06 1.4-.35 1.84-.87zm.63 1.01c-1.02-.06-1.88.58-2.37.58-.49 0-1.23-.55-2.03-.53-1.04.02-2.01.61-2.55 1.55-1.09 1.89-.28 4.69.78 6.23.52.76 1.14 1.6 1.95 1.57.78-.03 1.07-.5 2.01-.5.94 0 1.2.5 2.03.49.84-.02 1.37-.77 1.88-1.53.6-.88.84-1.73.86-1.77-.02-.01-1.65-.64-1.67-2.5-.02-1.56 1.27-2.31 1.33-2.35-.73-1.07-1.86-1.19-2.25-1.21z"
        fill="#000"
      />
      <text
        x="13"
        y="12.5"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="11"
        fontWeight="600"
        fill="#000"
      >
        Pay
      </text>
    </svg>
  );
}

export function GooglePayMark() {
  return (
    <svg width="45" height="19" viewBox="0 0 45 19" aria-label="Google Pay">
      {/* G mark */}
      <path d="M11.9 9.7c0-.42-.04-.83-.11-1.22H6.7v2.3h2.93a2.5 2.5 0 0 1-1.08 1.64v1.36h1.75c1.02-.94 1.6-2.33 1.6-4.08z" fill="#4285F4" />
      <path d="M6.7 15c1.46 0 2.69-.48 3.59-1.31l-1.75-1.36c-.49.33-1.11.52-1.84.52-1.41 0-2.61-.95-3.04-2.24H1.85v1.4A5.42 5.42 0 0 0 6.7 15z" fill="#34A853" />
      <path d="M3.66 10.61a3.25 3.25 0 0 1 0-2.08v-1.4H1.85a5.42 5.42 0 0 0 0 4.88l1.81-1.4z" fill="#FBBC04" />
      <path d="M6.7 6.29c.79 0 1.51.27 2.07.81l1.55-1.55A5.19 5.19 0 0 0 6.7 4.14 5.42 5.42 0 0 0 1.85 7.13l1.81 1.4C4.09 7.24 5.29 6.29 6.7 6.29z" fill="#EA4335" />
      <text
        x="15"
        y="13.5"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="12"
        fontWeight="500"
        fill="#5F6368"
      >
        Pay
      </text>
    </svg>
  );
}
