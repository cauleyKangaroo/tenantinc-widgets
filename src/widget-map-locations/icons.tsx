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

// --- Card + header glyphs (Figma 10685-68727 star, 10685-68740 tag,
//     10622-77661 list/list-sort-alphabetically) ------------------------------

/**
 * star — "favorite, rating, quality". FILLED #FFD000, and a real rounded-lobe
 * star, not the generic 5-point polygon that was here before.
 *
 * 13.8127x13.3333 artwork in a 16 box at the node's insets (6.84%/8.33%), so it
 * keeps its own proportions rather than being stretched square.
 *
 * `half` clips the same artwork at 50% over a grey twin. There is a dedicated
 * `star-half-filled` component in Figma, but deriving the half from the full
 * star guarantees the two lobes line up exactly; a separate export could drift.
 */
export function StarIcon({
  size = 16, className, half = false, color = '#FFD000',
}: IconProps & {
  half?: boolean;
  /**
   * Rating stars are gold. The design reuses the SAME glyph tinted white on the
   * "Featured Property" banner and dark on the active map bubble, so the colour
   * is a prop rather than three near-identical icons.
   */
  color?: string;
}) {
  const path = (
    <path
      transform="translate(1.094 1.333)"
      d="M7.93428 0.277607C7.29898 -0.0925355 6.51373 -0.0925355 5.87843 0.277607C5.53717 0.476435 5.30328 0.807635 5.10641 1.14694C4.90671 1.4911 4.68666 1.95226 4.41693 2.51755L4.40406 2.54451C4.22176 2.92656 4.17909 3.00328 4.1314 3.05883C4.05936 3.14274 3.96868 3.20862 3.86662 3.25121C3.79905 3.2794 3.71289 3.29627 3.29322 3.35159L3.26359 3.35549C2.64262 3.43734 2.13603 3.50411 1.747 3.58768C1.36347 3.67007 0.976207 3.79017 0.681654 4.05329C0.133309 4.54311 -0.109345 5.28992 0.0463625 6.00851C0.130004 6.39451 0.372718 6.7193 0.634574 7.01139C0.900176 7.30765 1.27076 7.65943 1.72501 8.09063L1.74671 8.11123C2.05372 8.40267 2.11351 8.46696 2.1516 8.52948C2.20914 8.62392 2.24378 8.73052 2.25274 8.84076C2.25867 8.91373 2.24809 9.00088 2.17102 9.41711L2.16558 9.44649C2.05153 10.0624 1.95849 10.5648 1.91775 10.9606C1.87759 11.3508 1.87214 11.7562 2.03136 12.1177C2.32776 12.7906 2.96304 13.2521 3.69457 13.3261C4.08753 13.3658 4.47142 13.2353 4.83013 13.0766C5.19398 12.9155 5.64306 12.6718 6.19355 12.373L6.21981 12.3587C6.59185 12.1568 6.67147 12.1198 6.74271 12.1029C6.85031 12.0774 6.9624 12.0774 7.07 12.1029C7.14124 12.1198 7.22085 12.1568 7.59289 12.3587L7.61915 12.373C8.16961 12.6717 8.61874 12.9155 8.98258 13.0766C9.34129 13.2353 9.72518 13.3658 10.1181 13.3261C10.8497 13.2521 11.4849 12.7906 11.7814 12.1177C11.9406 11.7562 11.9351 11.3508 11.895 10.9606C11.8542 10.5648 11.7612 10.0624 11.6471 9.44653L11.6417 9.41711C11.5646 9.00088 11.554 8.91373 11.56 8.84076C11.5689 8.73052 11.6036 8.62392 11.6611 8.52948C11.6992 8.46696 11.759 8.40267 12.066 8.11123L12.0876 8.09071C12.5419 7.65948 12.9125 7.30767 13.1781 7.01139C13.44 6.7193 13.6827 6.39451 13.7663 6.00851C13.9221 5.28992 13.6794 4.54311 13.1311 4.05329C12.8365 3.79017 12.4492 3.67007 12.0657 3.58768C11.6767 3.50411 11.1701 3.43734 10.5491 3.3555L10.5195 3.35159C10.0998 3.29627 10.0137 3.2794 9.94609 3.25121C9.84403 3.20862 9.75335 3.14274 9.68131 3.05883C9.63361 3.00328 9.59095 2.92656 9.40865 2.54451L9.39578 2.51755C9.12605 1.95227 8.906 1.49109 8.7063 1.14694C8.50943 0.807635 8.27554 0.476435 7.93428 0.277607Z"
    />
  );
  return (
    <svg
      className={className} width={size} height={size} viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"
    >
      {half ? (
        <>
          <g fill="#DFE3E8">{path}</g>
          {/* Left half of the SAME path, so the two align perfectly. */}
          <g fill={color} clipPath="inset(0 50% 0 0)">{path}</g>
        </>
      ) : (
        <g fill={color}>{path}</g>
      )}
    </svg>
  );
}

/**
 * tag — "label, price tag, categorize". FILLED #509E2F with a knocked-out hole,
 * 13.3817 square in a 16 box at 8.33% inset. Used by the promotion banner and
 * the in-store price marker.
 */
export function TagIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      className={className} width={size} height={size} viewBox="0 0 16 16"
      fill="#509E2F" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"
    >
      <path
        transform="translate(1.333 1.333)"
        d="M4.37691 0.0456721C5.33683 -0.00499382 5.94003 -0.0368318 6.51907 0.0798287C7.03141 0.183051 7.52277 0.371604 7.97264 0.637617C8.48108 0.93826 8.90814 1.36545 9.58774 2.04526L11.3614 3.81894C12.1484 4.60549 12.6574 5.1142 12.9458 5.68015C13.5271 6.82102 13.5271 8.17122 12.9458 9.31208C12.6574 9.87803 12.1484 10.3867 11.3615 11.1733L11.1733 11.3615C10.3867 12.1484 9.87803 12.6574 9.31208 12.9458C8.17122 13.5271 6.82102 13.5271 5.68015 12.9458C5.1142 12.6574 4.60551 12.1484 3.81894 11.3614L2.04526 9.58775C1.36545 8.90814 0.93826 8.48108 0.637616 7.97264C0.371604 7.52277 0.183051 7.03141 0.0798287 6.51907C-0.0368318 5.94003 -0.00499381 5.33682 0.0456723 4.3769L0.0806964 3.71162C0.106284 3.2253 0.127491 2.82224 0.170667 2.49296C0.21568 2.14968 0.290027 1.83525 0.449052 1.53874C0.697125 1.07618 1.07618 0.697124 1.53874 0.449052C1.83525 0.290027 2.14968 0.21568 2.49297 0.170667C2.82225 0.127491 3.2253 0.106284 3.71162 0.0806962L4.37691 0.0456721ZM4.32633 2.99186C3.58996 2.99186 2.993 3.58882 2.993 4.3252C2.993 5.06158 3.58996 5.65853 4.32633 5.65853C5.06271 5.65853 5.65967 5.06158 5.65967 4.3252C5.65967 3.58882 5.06271 2.99186 4.32633 2.99186Z"
      />
    </svg>
  );
}

/**
 * list/list-sort-alphabetically — "order, arrange, A to Z". The sort pill's
 * glyph: three list rules beside an A-Z stack with a descender arrow. Stroked,
 * 20x17.925 artwork at translate(2, 3.075) from the node's insets.
 */
export function SortIcon(props: IconProps) {
  return (
    <Frame {...props} tx={2} ty={3.075}>
      <path
        {...STROKE}
        d="M10.0002 8.92511H19.0002M10.0002 14.9251H19.0002M10.0002 2.92511L19.0002 2.92511M1.00019 6.92511V4.22882C1.00019 2.83746 1.84729 1.58627 3.13913 1.06953C3.37091 0.976822 3.62947 0.976822 3.86125 1.06953C5.1531 1.58627 6.00019 2.83746 6.00019 4.22882V6.92511M1.00019 4.92511H6.00019M1.00019 11.9251L1.10668 11.9038C2.68671 11.5878 4.31368 11.5878 5.89371 11.9038C5.93923 11.9129 5.95623 11.9691 5.92341 12.0019L1.13162 16.7937C1.09225 16.8331 1.12785 16.8996 1.18245 16.8887C2.71246 16.5827 4.28792 16.5827 5.81793 16.8887L6.00019 16.9251"
      />
    </Frame>
  );
}
