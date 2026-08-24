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
/**
 * Close (mdiClose). Figma draws a 14px mark inside a 24px button
 * (8507-23575), so `size` here has to mean the size of the X you actually see.
 *
 * The viewBox is cropped to the glyph's own bounds rather than left at
 * 0 0 24 24: the cross spans only 6→18, i.e. HALF the 24 box, so a 24-box
 * viewBox made `size` render at half its value — size={14} drew a 7px mark.
 * Bounds are 6→18 grown by half the 2.2 stroke at each end (round caps), giving
 * 4.9 → 19.1 = 14.2.
 */
export function CloseIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="4.9 4.9 14.2 14.2"
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
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* 24x24 frame with the leaf at its Figma offset (22x21 at 1,1), NOT a 22x21 viewBox stretched to fill it: stretching scaled the mark 9% and pushed the stroke to 2.18px. Translated, it stays a true 2px — same convention as @shared/ui. */}
      <g transform="translate(1 1)">
        <path d="M1 20H21M3 12L3 17M8 12L8 17M14 12L14 17M19 12V17M21 9H1V8L9.08 1.94C9.76852 1.42361 10.1128 1.16542 10.4909 1.06589C10.8246 0.978037 11.1754 0.978037 11.5091 1.06589C11.8872 1.16542 12.2315 1.42361 12.92 1.94L21 8V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// credit-card (Figma 7607:27771) — "Credit / Debit".
export function CreditCardIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* Leaf 22x18 at (1,3) in the 24x24 frame — see BankIcon above. */}
      <g transform="translate(1 3)">
        <path d="M1 6H21M5 10H8M14.6 17H7.4C5.15979 17 4.03969 17 3.18404 16.564C2.43139 16.1805 1.81947 15.5686 1.43597 14.816C1 13.9603 1 12.8402 1 10.6V7.4C1 5.15979 1 4.03969 1.43597 3.18404C1.81947 2.43139 2.43139 1.81947 3.18404 1.43597C4.03969 1 5.15979 1 7.4 1H14.6C16.8402 1 17.9603 1 18.816 1.43597C19.5686 1.81947 20.1805 2.43139 20.564 3.18404C21 4.03969 21 5.15979 21 7.4V10.6C21 12.8402 21 13.9603 20.564 14.816C20.1805 15.5686 19.5686 16.1805 18.816 16.564C17.9603 17 16.8402 17 14.6 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
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

/**
 * Solid checkbox tick (Figma 8507-25446). The kit's default CheckIcon is the
 * Pika check — a CURVED, STROKED glyph — where this design's mark is a sharp
 * filled tick, so they are different shapes, not different weights.
 *
 * Lifted from the checked-state vector, which draws the box and carves the tick
 * out of it with fill-rule evenodd; this is that carved sub-path on its own.
 *
 * The viewBox is cropped to the tick's own bounds so `size` is its real WIDTH,
 * and the height follows the mark's 13.41:10.12 ratio rather than being forced
 * square — squaring it would stretch the tick.
 */
export function CheckTickSolid({ size = 13, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={(size * 10.1214) / 13.4143}
      viewBox="10.293 11.7928 13.4143 10.1214"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 21.9142L23.7073 13.207L22.293 11.7928L15 19.0857L11.7073 15.7928L10.293 17.207L15 21.9142Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * SOLID chevron — the "Style=Solid" variant of chevron-big-right
 * (Figma 8508-32282), used by the protection-plan dropdown. The outline
 * ChevronIcon above is the stroke variant and is a visibly lighter mark, so the
 * two are not interchangeable.
 *
 * Same 8x14 viewBox as its stroke sibling, so `size` means the same thing in
 * both and callers can swap without resizing. Points RIGHT as drawn; the
 * caller rotates.
 */
export function ChevronSolidIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={(size * 8) / 14} height={size} viewBox="0 0 8 14" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path
        d="M1.58599 0.189675C1.26945 -0.0392302 0.84859 -0.0628562 0.508414 0.129182C0.168238 0.321219 -0.0289727 0.693759 0.00346815 1.08305C0.331619 5.02086 0.331619 8.97915 0.00346815 12.917C-0.0289726 13.3062 0.168238 13.6788 0.508414 13.8708C0.84859 14.0629 1.26945 14.0392 1.58599 13.8103C3.837 12.1825 5.8566 10.2764 7.59304 8.14103C8.13567 7.47372 8.13567 6.52629 7.59304 5.85898C5.8566 3.72356 3.837 1.81746 1.58599 0.189675Z"
        fill="currentColor"
      />
    </svg>
  );
}

// ── Payment brand marks ─────────────────────────────────────────────────────

// Google "G" (4-colour) + "Pay".
/**
 * Google Pay lockup for the dark payment button (Figma 8508-33069).
 *
 * BOTH halves are the frame's own exported artwork: the four-colour G Mark and
 * Google's "Pay" wordmark. What this replaces drew an approximate G by hand and
 * set the word "Pay" in Montserrat 20/500 — the site's font, not Google's
 * lockup, which is the "pay wording is not correct" of the report and is also
 * outside Google's brand rules.
 *
 * One viewBox holding both, at the frame's offsets: the G at the origin, the
 * wordmark translated 33.1 / 1.59. Height is 29.996 — the wordmark's 28.4065
 * plus its 1.59 drop — which is what the Apple lockup beside it is matched to.
 *
 * No currentColor anywhere: the G's four colours and the white wordmark are
 * both fixed, so a button colour change must not tint them.
 */
export function GooglePayMark({ height = 30 }: { height?: number }) {
  return (
    <svg
      height={height}
      width={(76.9768 / 29.9965) * height}
      viewBox="0 0 76.9768 29.9965"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* G Mark 1 — 24.6881 x 25.0421 at the lockup origin. Brand colours are
          fixed by Google and must NOT follow currentColor. */}
      <g>
        <path fill="#4285F4" d="M24.6881 12.807C24.6881 11.8918 24.6056 11.0161 24.4526 10.174H12.6068V14.9985L19.429 15C19.1523 16.6052 18.2618 17.9737 16.8974 18.8859V22.0161H20.9583C23.3295 19.8362 24.6881 16.614 24.6881 12.807Z" />
        <path fill="#34A853" d="M16.8988 18.8857C15.7684 19.643 14.3127 20.086 12.6097 20.086C9.32003 20.086 6.52934 17.8842 5.52993 14.9164H1.34094V18.1445C3.4163 22.2351 7.68183 25.0421 12.6097 25.0421C16.0156 25.0421 18.877 23.9296 20.9597 22.0144L16.8988 18.8857Z" />
        <path fill="#FABB05" d="M5.13541 12.5219C5.13541 11.6885 5.27523 10.883 5.52987 10.1257V6.89759H1.34089C0.482776 8.58911 0 10.4985 0 12.5219C0 14.5453 0.484248 16.4546 1.34089 18.1461L5.52987 14.9181C5.27523 14.1608 5.13541 13.3552 5.13541 12.5219Z" />
        <path fill="#E94235" d="M12.6097 4.95614C14.4687 4.95614 16.1334 5.59211 17.4478 6.8348L21.0465 3.26316C18.8608 1.24123 16.0112 0 12.6097 0C7.6833 0 3.4163 2.80702 1.34094 6.89766L5.52993 10.1257C6.52934 7.1579 9.32004 4.95614 12.6097 4.95614Z" />
      </g>
      {/* "Pay" Typeface 3 — 43.8768 x 28.4065, offset 33.1 / 1.59 per the frame.
          Google's own wordmark, not the site font set in "Pay". */}
      <g transform="translate(33.1 1.59)">
        <path fill="white" d="M2.82602 12.9971V21.8421H0V0H7.49189C9.39062 0 11.0097 0.628658 12.3344 1.88597C13.6885 3.14328 14.3656 4.67837 14.3656 6.49123C14.3656 8.34796 13.6885 9.88304 12.3344 11.1257C11.0244 12.3684 9.40534 12.9825 7.49189 12.9825H2.82602V12.9971ZM2.82602 2.69006V10.307H7.55077C8.6694 10.307 9.61141 9.9269 10.3474 9.18129C11.098 8.43567 11.4807 7.52924 11.4807 6.50585C11.4807 5.49708 11.098 4.60527 10.3474 3.85965C9.61141 3.0848 8.68412 2.70468 7.55077 2.70468H2.82602V2.69006Z" />
        <path fill="white" d="M21.7544 6.40308C23.8445 6.40308 25.493 6.95864 26.6999 8.06975C27.9069 9.18086 28.5103 10.7013 28.5103 12.6312V21.8417H25.8168V19.7657H25.699C24.5362 21.4762 22.976 22.3241 21.0331 22.3241C19.3699 22.3241 17.9863 21.8417 16.8677 20.8622C15.7491 19.8826 15.1897 18.6692 15.1897 17.2072C15.1897 15.6575 15.7785 14.4294 16.956 13.523C18.1335 12.6019 19.7084 12.1487 21.6661 12.1487C23.344 12.1487 24.7276 12.4557 25.8021 13.0698V12.4265C25.8021 11.4469 25.4194 10.6282 24.6393 9.94109C23.8592 9.25396 22.9466 8.9177 21.9016 8.9177C20.3266 8.9177 19.0755 9.5756 18.163 10.906L15.6755 9.3563C17.0443 7.38261 19.0755 6.40308 21.7544 6.40308ZM18.1041 17.251C18.1041 17.982 18.4132 18.5961 19.0461 19.0785C19.6643 19.561 20.4002 19.8095 21.2392 19.8095C22.4314 19.8095 23.4912 19.3709 24.4185 18.4937C25.3458 17.6165 25.8168 16.5931 25.8168 15.4089C24.9336 14.7218 23.712 14.3709 22.1371 14.3709C20.989 14.3709 20.0323 14.6487 19.2669 15.1896C18.4868 15.7598 18.1041 16.4469 18.1041 17.251Z" />
        <path fill="white" d="M43.8768 6.88587L34.4568 28.4063H31.5424L35.0455 20.8771L28.8342 6.88587H31.9104L36.3849 17.6169H36.4438L40.8006 6.88587H43.8768Z" />
      </g>
    </svg>
  );
}

/**
 * Apple Pay lockup for the dark payment button (Figma 8508-33069).
 *
 * The frame draws this button's label as TEXT — SF Pro Semibold with the
 * private-use glyph \uF8FF. That only resolves on Apple platforms; on Windows
 * and Android it renders as a missing-glyph box, so it is not usable as-is.
 * This uses the real VECTOR artwork from the Apple Pay Mark component
 * (node 3137:58781) instead — the same source as the rail's mark, minus the
 * chip, which the dark button does not draw.
 *
 * Sized to 28.406px tall against the Google lockup's 29.996 on the neighbouring
 * button, so the pair sit at matching optical weight. (28.406 is that lockup's
 * WORDMARK height; the extra 1.59 is the drop Google's own frame gives it, and
 * carrying that here would push the Apple mark low in its button.)
 *
 * The gap between the glyph and "Pay" is widened from Apple's own lockup — 3.71
 * to 8.41px, which is Google's gap on the button beside it. Apple's vector
 * lockup sets them tight; the FRAME does not use that lockup, it sets the label
 * as text with a normal word space (~6-8px at 31.932px), so the wider gap is
 * closer to the design as drawn as well as to its neighbour. The viewBox and
 * width grow by the same 1.8974 so nothing else shifts.
 * currentColor, so the button's own colour drives it.
 * Apple's usage rules: https://developer.apple.com/apple-pay/marketing/
 */
export function ApplePayMark() {
  return (
    <span className="rf2-paylogo">
      <svg width="71.660" height="28.406" viewBox="0 0 28.9439 11.4732"
           xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Apple Pay"
           style={{ display: 'block', color: '#fff' }}>
        <g transform="translate(0.0 0.0)"><g> <path d="M5.11121 1.47941C5.42961 1.08116 5.64568 0.54643 5.58869 0C5.1226 0.023176 4.55383 0.307496 4.22453 0.706057C3.92886 1.04736 3.66717 1.60448 3.73539 2.128C4.25861 2.17339 4.78133 1.86648 5.11121 1.47941Z" fill="currentColor"/> <path d="M5.58275 2.23023C4.82292 2.18497 4.17688 2.66147 3.81402 2.66147C3.45097 2.66147 2.89531 2.25303 2.29433 2.26404C1.51211 2.27553 0.786303 2.7178 0.38936 3.42123C-0.427083 4.82841 0.173901 6.91577 0.967849 8.06184C1.35341 8.62884 1.81807 9.25315 2.43034 9.23072C3.00883 9.20802 3.23557 8.85614 3.93875 8.85614C4.64141 8.85614 4.84566 9.23072 5.45803 9.21938C6.09307 9.20802 6.49008 8.65209 6.87563 8.08454C7.31794 7.43819 7.49901 6.81409 7.51039 6.77983C7.499 6.76848 6.28586 6.30309 6.27461 4.90759C6.26316 3.73913 7.22707 3.18334 7.27243 3.14887C6.7281 2.34381 5.8776 2.25303 5.58275 2.23023Z" fill="currentColor"/> </g></g><g transform="translate(10.9076 0.6499)"><g> <path d="M3.191 2.14254e-06C4.84248 2.14254e-06 5.99246 1.13838 5.99246 2.79577C5.99246 4.45908 4.81881 5.60337 3.14959 5.60337H1.32109V8.5112H0V0H3.191V2.14254e-06ZM1.32109 4.49446H2.83695C3.98716 4.49446 4.64179 3.87521 4.64179 2.80168C4.64179 1.72827 3.98716 1.11483 2.84287 1.11483H1.32109V4.49446V4.49446Z" fill="currentColor"/> <path d="M6.33764 6.74767C6.33764 5.66231 7.16929 4.99585 8.64397 4.91325L10.3425 4.81302V4.3353C10.3425 3.64518 9.87655 3.23231 9.09814 3.23231C8.36069 3.23231 7.9006 3.58613 7.78865 4.14064H6.58543C6.65619 3.0199 7.61163 2.19416 9.14524 2.19416C10.6493 2.19416 11.6106 2.99043 11.6106 4.23496V8.5112H10.3896V7.49081H10.3603C10.0006 8.18093 9.216 8.61735 8.4021 8.61735C7.18704 8.61735 6.33764 7.86238 6.33764 6.74767ZM10.3425 6.18735V5.6978L8.81485 5.79212C8.05396 5.84525 7.62346 6.18144 7.62346 6.71228C7.62346 7.25485 8.07171 7.60878 8.75592 7.60878C9.64651 7.60878 10.3425 6.99534 10.3425 6.18735Z" fill="currentColor"/> <path d="M12.7633 10.7939V9.76164C12.8575 9.78519 13.0698 9.78519 13.1761 9.78519C13.7659 9.78519 14.0844 9.53751 14.279 8.90052C14.279 8.88868 14.3911 8.52303 14.3911 8.51712L12.1499 2.30622H13.5299L15.099 7.35519H15.1224L16.6916 2.30622H18.0363L15.7122 8.83555C15.1816 10.3397 14.5682 10.8233 13.2823 10.8233C13.1761 10.8233 12.8575 10.8115 12.7633 10.7939Z" fill="currentColor"/> </g></g>
      </svg>
    </span>
  );
}
