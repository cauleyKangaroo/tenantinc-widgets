// ===========================================================================
// #08 map-locations icons — inline SVG, traced from the Figma exports
// (Mariposa — Duda, filter modal node 10557-146402 and the Filter pill 10629-81025).
//
// These REPLACE the hand-drawn approximations that were previously inlined in
// MapLocations.tsx. Those were close-enough shapes invented to fill the slots;
// these are the real artwork from the design system, so the filter glyph is the
// actual `filter/filter-horizontal` (two sliders with knobs) rather than a
// three-line "hamburger" stand-in.
//
// Inline rather than referenced: the AMD bundle can't fetch remote assets and
// Figma's export URLs expire in ~7 days. Same reasoning as @shared/ui/icons.tsx.
//
// Strokes and fills are `currentColor` throughout — the Filter pill uses the
// same glyph in black (resting) and white (selected), so one icon covers both.
// ===========================================================================

import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
}

/** 24×24 frame holding the exported artwork at natural size, Figma-offset. */
function Frame({
  size = 24, className, tx, ty, children,
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
      <g transform={`translate(${tx} ${ty})`}>{children}</g>
    </svg>
  );
}

const STROKE = {
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/**
 * filter/filter-horizontal — "filter, sort, arrange, categorize".
 * Two horizontal sliders with draggable knobs. 20×18 artwork inset 12.5%/16.67%.
 */
export function FilterIcon(props: IconProps) {
  return (
    <Frame {...props} tx={2} ty={3}>
      <path
        {...STROKE}
        d="M1 4H8M8 4C8 5.65685 9.34315 7 11 7H12C13.6569 7 15 5.65685 15 4C15 2.34315 13.6569 1 12 1H11C9.34315 1 8 2.34315 8 4ZM14 14H19M18 4H19M1 14H4M4 14C4 15.6569 5.34315 17 7 17H8C9.65685 17 11 15.6569 11 14C11 12.3431 9.65685 11 8 11H7C5.34315 11 4 12.3431 4 14Z"
      />
    </Frame>
  );
}

/** Close (mdiClose) — the modal's dismiss. Filled, 18×18 in a 32px hit area. */
export function CloseIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      className={className} width={size} height={size} viewBox="0 0 18 18"
      fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"
    >
      <path d="M18 1.81286L16.1871 0L9 7.18714L1.81286 0L0 1.81286L7.18714 9L0 16.1871L1.81286 18L9 10.8129L16.1871 18L18 16.1871L10.8129 9L18 1.81286Z" />
    </svg>
  );
}

/**
 * ai/ai-01 — the sparkle in the "Filter Spaces by…" search pill's dark button.
 * Three sparkles at different sizes; 20×20 artwork inset 12.5%.
 */
export function AiSparkleIcon(props: IconProps) {
  return (
    <Frame {...props} tx={2} ty={2}>
      <g {...STROKE}>
        <path d="M6.58708 3.76368C7.04677 2.87064 7.27661 2.42412 7.58539 2.27944C7.85422 2.15348 8.16512 2.15348 8.43395 2.27944C8.74273 2.42412 8.97258 2.87064 9.43227 3.76368L10.624 6.07877C10.7036 6.23349 10.7434 6.31085 10.7949 6.37917C10.8407 6.43981 10.8931 6.49505 10.9514 6.54381C11.017 6.59874 11.0922 6.64245 11.2427 6.72989L13.629 8.11661C14.4109 8.57098 14.8019 8.79816 14.9333 9.09429C15.048 9.35261 15.048 9.64739 14.9333 9.90571C14.8019 10.2018 14.4109 10.429 13.629 10.8834L11.2427 12.2701C11.0922 12.3575 11.017 12.4013 10.9514 12.4562C10.8931 12.505 10.8407 12.5602 10.7949 12.6208C10.7434 12.6891 10.7036 12.7665 10.624 12.9212L9.43227 15.2363C8.97258 16.1294 8.74273 16.5759 8.43395 16.7206C8.16512 16.8465 7.85422 16.8465 7.58539 16.7206C7.27661 16.5759 7.04677 16.1294 6.58708 15.2363L5.39539 12.9212C5.31575 12.7665 5.27593 12.6891 5.22442 12.6208C5.17869 12.5602 5.1262 12.505 5.06797 12.4562C5.00237 12.4013 4.92714 12.3575 4.77669 12.2701L2.39031 10.8834C1.6084 10.429 1.21744 10.2018 1.086 9.90571C0.971334 9.64739 0.971334 9.35261 1.086 9.09429C1.21744 8.79816 1.6084 8.57098 2.39031 8.11661L4.77669 6.72989C4.92714 6.64245 5.00237 6.59874 5.06797 6.54381C5.1262 6.49505 5.17869 6.43981 5.22442 6.37917C5.27593 6.31085 5.31575 6.23349 5.39539 6.07877L6.58708 3.76368Z" />
        <path d="M15.4692 17.4062C15.2154 17.089 15.0886 16.9304 15.041 16.7475C14.9992 16.5866 14.9992 16.4134 15.041 16.2525C15.0886 16.0696 15.2154 15.911 15.4692 15.5938L16.2847 14.5744C16.5385 14.2572 16.6654 14.0986 16.8117 14.0392C16.9404 13.9869 17.079 13.9869 17.2077 14.0392C17.354 14.0986 17.4809 14.2572 17.7346 14.5744L18.5502 15.5938C18.8039 15.911 18.9308 16.0696 18.9783 16.2525C19.0201 16.4134 19.0201 16.5866 18.9783 16.7475C18.9308 16.9304 18.8039 17.089 18.5502 17.4062L17.7346 18.4256C17.4809 18.7428 17.354 18.9014 17.2077 18.9608C17.079 19.0131 16.9404 19.0131 16.8117 18.9608C16.6654 18.9014 16.5385 18.7428 16.2847 18.4256L15.4692 17.4062Z" />
        <path d="M16.2394 2.36247C16.1126 2.23559 16.0491 2.17215 16.0254 2.099C16.0044 2.03466 16.0044 1.96534 16.0254 1.901C16.0491 1.82785 16.1126 1.76441 16.2394 1.63753L16.6472 1.22976C16.7741 1.10289 16.8375 1.03945 16.9107 1.01568C16.975 0.994773 17.0443 0.994773 17.1087 1.01568C17.1818 1.03945 17.2453 1.10289 17.3721 1.22976L17.7799 1.63753C17.9068 1.76441 17.9702 1.82785 17.994 1.901C18.0149 1.96534 18.0149 2.03466 17.994 2.099C17.9702 2.17215 17.9068 2.23559 17.7799 2.36247L17.3721 2.77024C17.2453 2.89711 17.1818 2.96055 17.1087 2.98432C17.0443 3.00523 16.975 3.00523 16.9107 2.98432C16.8375 2.96055 16.7741 2.89711 16.6472 2.77024L16.2394 2.36247Z" />
      </g>
    </Frame>
  );
}

/**
 * The solid chevron the Form 2.0 selects use (Min/Max Price, Max Distance) and
 * the sort pill. FILLED, not stroked — a different glyph from the stroked
 * chevron elsewhere in the suite. 14×8 artwork inset 33.33%/20.83%.
 */
export function ChevronDownIcon(props: IconProps) {
  return (
    <Frame {...props} tx={5} ty={8}>
      <path
        fill="currentColor"
        d="M13.8103 1.58599C14.0392 1.26945 14.0629 0.84859 13.8708 0.508414C13.6788 0.168238 13.3062 -0.0289722 12.917 0.00346865C8.97915 0.33162 5.02086 0.331619 1.08305 0.00346813C0.69376 -0.0289726 0.321219 0.168238 0.129182 0.508414C-0.062856 0.84859 -0.0392306 1.26945 0.189675 1.58599C1.81746 3.837 3.72356 5.8566 5.85898 7.59304C6.52629 8.13567 7.47372 8.13567 8.14103 7.59304C10.2764 5.8566 12.1825 3.837 13.8103 1.58599Z"
      />
    </Frame>
  );
}

/**
 * Clear (mdiCloseCircle) — the × on a SELECTED feature pill, which removes it.
 * Filled circle with a knocked-out cross, so it reads on the dark pill.
 */
export function ClearCircleIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      className={className} width={size} height={size} viewBox="0 0 20 20"
      fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"
    >
      <path d="M10 0C15.53 0 20 4.47 20 10C20 15.53 15.53 20 10 20C4.47 20 0 15.53 0 10C0 4.47 4.47 0 10 0ZM13.59 5L10 8.59L6.41 5L5 6.41L8.59 10L5 13.59L6.41 15L10 11.41L13.59 15L15 13.59L11.41 10L15 6.41L13.59 5Z" />
    </svg>
  );
}

/**
 * The design-system checkbox (Amenities / Promotions lists).
 *
 * Note the checked fill is the system's TEAL `#00848E`, not the widget's black
 * or the brand green — that is what the component ships, so it is kept rather
 * than "corrected" to something that looks more on-brand.
 */
export function CheckboxIcon({ checked, size = 24, className }: IconProps & { checked: boolean }) {
  return (
    <svg
      className={className} width={size} height={size} viewBox="0 0 34 34"
      fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"
    >
      {checked ? (
        <path
          fillRule="evenodd" clipRule="evenodd" fill="#00848E"
          d="M10 8C8.89551 8 8 8.89539 8 10V24C8 25.1046 8.89551 26 10 26H24C25.1045 26 26 25.1046 26 24V10C26 8.89539 25.1045 8 24 8H10ZM15 21.9142L23.7073 13.207L22.293 11.7928L15 19.0857L11.7073 15.7928L10.293 17.207L15 21.9142Z"
        />
      ) : (
        <path
          fillRule="evenodd" clipRule="evenodd" fill="#DFE3E8"
          d="M10 10V24H24V10H10ZM8 10C8 8.89539 8.89551 8 10 8H24C25.1045 8 26 8.89539 26 10V24C26 25.1046 25.1045 26 24 26H10C8.89551 26 8 25.1046 8 24V10Z"
        />
      )}
    </svg>
  );
}
