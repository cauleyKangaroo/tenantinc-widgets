// ===========================================================================
// Protection-plan coverage icons — inline SVG, traced from the Figma exports
// (Mariposa — Duda, node 8509-36480).
//
// Inline rather than referenced: these bundles are loaded into Duda from a CDN
// and can't fetch remote assets, and Figma's own export URLs expire in ~7 days.
// Same reasoning as `@shared/ui/icons.tsx` and `paymentIcons.tsx`.
//
// These are FILLED glyphs (unlike the stroked set in @shared/ui), so they take
// `currentColor` as `fill`. Each keeps its exported viewBox and natural aspect
// ratio — the design renders them inside a 16px box, and the box is set by CSS
// rather than by squashing artwork of different proportions into one square.
// ===========================================================================

import React from 'react';

interface GlyphProps {
  size?: number;
  className?: string;
}

/**
 * check/check-tick-circle (Figma 8507-24390) — the What's Next bullet.
 *
 * One exported vector inside a 28px box: the glyph itself is 21.35px, inset
 * 11.88% and drawn at 2.333 stroke in the brand green. The 28px outer box is
 * kept because it is what the row's 12px gap is measured from.
 */
export function TickCircleIcon({ size = 28, className }: GlyphProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.33333}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(2.1607 2.1607)">
        <path d="M7.75836 12.4394L10.4898 15.1679C11.8035 12.8708 13.6215 10.9019 15.8069 9.40962L15.925 9.32892M22.5167 11.8417C22.5167 17.7373 17.7373 22.5167 11.8417 22.5167C5.94603 22.5167 1.16667 17.7373 1.16667 11.8417C1.16667 5.94603 5.94603 1.16667 11.8417 1.16667C17.7373 1.16667 22.5167 5.94603 22.5167 11.8417Z" />
      </g>
    </svg>
  );
}

/**
 * review/write-review (Figma 6492-145196) — message bubble plus a pencil.
 *
 * The two vectors carry DIFFERENT stroke weights in the export — 2 on the
 * bubble, 1 on the pencil — so the weight is per-<g>, not on the <svg>. Giving
 * both the bubble's 2 turns the pencil into a blob at 24px.
 */
export function WriteReviewIcon({ size = 24, className }: GlyphProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(2 2)" strokeWidth={2}>
        <path d="M14.2 1H5.8C4.11984 1 3.27976 1 2.63803 1.32698C2.07354 1.6146 1.6146 2.07354 1.32698 2.63803C1 3.27976 1 4.11984 1 5.8V10.2C1 11.8802 1 12.7202 1.32698 13.362C1.6146 13.9265 2.07354 14.3854 2.63803 14.673C3.27976 15 4.11984 15 5.8 15H6V19L11 15H14.2C15.8802 15 16.7202 15 17.362 14.673C17.9265 14.3854 18.3854 13.9265 18.673 13.362C19 12.7202 19 11.8802 19 10.2V5.8C19 4.11984 19 3.27976 18.673 2.63803C18.3854 2.07354 17.9265 1.6146 17.362 1.32698C16.7202 1 15.8802 1 14.2 1Z" />
      </g>
      <g transform="translate(8.5 6.5)" strokeWidth={1}>
        <path d="M0.525803 5.71185C0.533411 5.47947 0.537215 5.36327 0.565948 5.2542C0.591429 5.15747 0.631286 5.06516 0.684177 4.98037C0.74382 4.88475 0.825675 4.80255 0.989386 4.63814L4.93592 0.674773C5.13305 0.476798 5.44075 0.443116 5.67572 0.59379C5.95949 0.775753 6.20152 1.0162 6.38577 1.29919L6.39866 1.31898C6.55965 1.56624 6.52597 1.89299 6.31796 2.10188L2.4081 6.02842C2.23822 6.19902 2.15329 6.28432 2.05423 6.34555C1.9664 6.39984 1.87067 6.44003 1.7705 6.46466C1.65752 6.49245 1.53741 6.49323 1.29717 6.4948L0.5 6.50001L0.525803 5.71185Z" />
      </g>
    </svg>
  );
}

/**
 * message/message-default (Figma 8065-14150) — the mark in the "We've sent your
 * access code" bar. Three exported vectors: the bubble, then the two text
 * rules inside it, each placed by its Figma inset via a <g transform>.
 */
export function MessageIcon({ size = 24, className }: GlyphProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(2 2)">
        <path d="M14.2 1H5.8C4.11984 1 3.27976 1 2.63803 1.32698C2.07354 1.6146 1.6146 2.07354 1.32698 2.63803C1 3.27976 1 4.11984 1 5.8V10.2C1 11.8802 1 12.7202 1.32698 13.362C1.6146 13.9265 2.07354 14.3854 2.63803 14.673C3.27976 15 4.11984 15 5.8 15H6V19L11 15H14.2C15.8802 15 16.7202 15 17.362 14.673C17.9265 14.3854 18.3854 13.9265 18.673 13.362C19 12.7202 19 11.8802 19 10.2V5.8C19 4.11984 19 3.27976 18.673 2.63803C18.3854 2.07354 17.9265 1.6146 17.362 1.32698C16.7202 1 15.8802 1 14.2 1Z" />
      </g>
      <g transform="translate(6 7)"><path d="M1 1H11" /></g>
      <g transform="translate(6 11)"><path d="M1 1H8" /></g>
    </svg>
  );
}

/**
 * key/key-top-right-02 (Figma 8754-50337) — the mark before "Access Code".
 *
 * Two exported vectors, each placed by its own Figma inset and kept in its own
 * <g transform>. Translating the path data by hand would have been four decimal
 * points of opportunity to be wrong; the transform is exact and reversible.
 * Rendered SQUARE at the component's own 24x24, deliberately. The placed
 * instance measures 24 x 22.691 — Figma percentage insets inside an
 * overflow-clip frame that was nudged 5.5% shorter, which squashes the artwork
 * rather than resizing it. Reproducing a 5.5% vertical squash of a stroked
 * glyph looks wrong next to the 24px icons beside it, and 1.3px is not a design
 * decision worth inheriting.
 */
export function KeyIcon({ size = 24, className }: GlyphProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(2.612 3.9296)">
        <path d="M13.6316 1H16.4596V3.828L14.3386 5.949H12.7176C12.5849 5.949 12.4578 6.00168 12.364 6.09545C12.2702 6.18922 12.2176 6.31639 12.2176 6.449V8.07L9.76455 10.522C10.0886 11.4838 10.0779 12.5269 9.7343 13.482C9.39071 14.437 8.73437 15.2478 7.87186 15.7827C7.00935 16.3177 5.99133 16.5453 4.98311 16.4288C3.9749 16.3122 3.0357 15.8582 2.31803 15.1405C1.60036 14.4229 1.14638 13.4837 1.02979 12.4754C0.913213 11.4672 1.14088 10.4492 1.67583 9.58669C2.21078 8.72418 3.02159 8.06784 3.9766 7.72425C4.93161 7.38066 5.97472 7.37 6.93655 7.694L13.6316 1Z" />
      </g>
      <g transform="translate(5.684 14.8904)">
        <path d="M2.42555 2.41403L1.01255 1.00003C0.985113 1.19219 1.00281 1.38811 1.06423 1.57224C1.12566 1.75638 1.22912 1.92369 1.36643 2.0609C1.50374 2.19811 1.67111 2.30145 1.85529 2.36275C2.03948 2.42404 2.2354 2.4416 2.42755 2.41403H2.42555Z" />
      </g>
    </svg>
  );
}

/** Filled glyph in its own aspect ratio, fitted inside a `size` box. */
function Glyph({
  size = 16, className, viewBox, width, height, d,
}: GlyphProps & { viewBox: string; width: number; height: number; d: string }) {
  // Scale on the LONGER axis, so the artwork fits the box the design draws it
  // in and keeps its proportions. Height-locking instead was wrong for the two
  // glyphs that are wider than they are tall: it made the eye 21.8px across
  // against the frame's 16, and the wind 16.6.
  const k = size / Math.max(width, height);
  return (
    <svg
      className={className}
      width={width * k}
      height={height * k}
      viewBox={viewBox}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

/** Fire or Lightning, Explosion. */
export function FireGlyph(p: GlyphProps) {
  return (
    <Glyph
      {...p}
      viewBox="0 0 16.0002 16"
      width={16.0002}
      height={16}
      d="M8.13342 11.3992C9.96663 11.3992 10.7332 9.91596 10.4499 8.0161C10.2166 6.38288 9.01669 4.64967 9.01669 4.64967C9.01669 4.64967 9.45 8.68272 7.70012 8.51606C6.65019 8.43273 6.9835 6.96617 7.0835 6.58287C4.30036 9.16602 6.1169 11.3992 8.13342 11.3992ZM15.1329 13.399C15.8495 13.6824 16.1829 14.4656 15.8995 15.1656C15.5996 15.8489 14.783 16.1822 14.0663 15.8989L8.0001 13.4657L1.93386 15.8989C1.75054 15.9655 1.58389 15.9989 1.40057 15.9989C0.850606 15.9989 0.333976 15.6822 0.100659 15.1656C-0.182654 14.4656 0.150656 13.6824 0.867272 13.399L4.33369 11.9991L0.867272 10.5992C0.150656 10.3159 -0.182654 9.53266 0.100659 8.83271C0.333976 8.31608 0.850606 7.99943 1.40057 7.99943C1.58389 7.99943 1.75054 8.03276 1.93386 8.09942L3.36709 8.68272C3.50042 5.1663 7.96677 3.81639 6.93351 0C6.93351 0 10.3499 1.3499 12.0165 4.48301C12.5831 5.5496 12.8831 7.31615 12.7498 8.66605L14.0663 8.11609C14.783 7.81611 15.5996 8.14942 15.8995 8.84937C16.1829 9.53266 15.8495 10.3326 15.1329 10.6159L11.6665 11.9991L15.1329 13.399Z"
    />
  );
}

/** Smoke or Water Damage; No Flooding. */
export function DropGlyph(p: GlyphProps) {
  return (
    <Glyph
      {...p}
      viewBox="0 0 13.3333 16"
      width={13.3333}
      height={16}
      d="M12.3167 5.8C12.9833 6.85 13.3333 8.08333 13.3333 9.33333C13.3333 13.0167 10.35 16 6.66667 16C2.98333 16 0 13.0167 0 9.33333C0 8.08333 0.35 6.85 1.01667 5.8C2.06667 4.13333 5.75 0.466666 5.91667 0.316666C6.11667 0.116666 6.38333 0 6.66667 0C6.95 0 7.21667 0.116666 7.41667 0.316666C7.58333 0.466666 11.2667 4.13333 12.3167 5.8ZM6.66667 13.8667C7.13333 13.8667 7.6 13.8 8.03333 13.6667C5.58333 12.1333 4.3 10.1833 4.3 7.33333C4.3 6.4 4.31667 5.51667 4.63333 4.71667C3.85 5.58333 3.08333 6.35 2.76667 6.86667C2.31667 7.58333 2.06667 8.41667 2.06667 9.26667C2.06667 11.7667 4.16667 13.8667 6.66667 13.8667Z"
    />
  );
}

/** Vandalism, Malicious Mischief or Burglary. */
export function EyeGlyph(p: GlyphProps) {
  return (
    <Glyph
      {...p}
      viewBox="0 0 16 11.7303"
      width={16}
      height={11.7303}
      d="M15.6001 4.66545C16.1333 5.39859 16.1333 6.38167 15.6001 7.13148C15.2669 7.59802 12.251 11.7303 8.00208 11.7303C3.75319 11.7303 0.737308 7.59802 0.387399 7.13148C-0.129133 6.38167 -0.129133 5.39859 0.387399 4.66545C0.737308 4.18224 3.75319 0 8.00208 0C12.251 0 15.2669 4.18224 15.6001 4.66545ZM8.00208 9.1976C9.83494 9.1976 11.3345 7.71466 11.3345 5.86514C11.3345 5.68185 11.3179 5.49857 11.2846 5.33195H8.53528V2.58266C8.36865 2.54934 8.18537 2.53267 8.00208 2.53267C6.15256 2.53267 4.66962 4.03228 4.66962 5.86514C4.66962 7.71466 6.15256 9.1976 8.00208 9.1976Z"
    />
  );
}

/** Windstorm or Hail. */
export function WindGlyph(p: GlyphProps) {
  return (
    <Glyph
      {...p}
      viewBox="0 0 16 15.4465"
      width={16}
      height={15.4465}
      d="M15.9648 4.83783C16.1203 6.15095 15.7575 7.42952 14.9282 8.36253C14.2889 9.08821 13.0967 9.93483 10.9542 9.93483H8.89815C9.38193 11.0406 9.50288 11.9391 9.20915 12.9239C8.88087 14.0297 8.13792 14.859 7.11852 15.2564C6.70385 15.4119 6.28918 15.4465 5.83995 15.4465C5.20067 15.4465 4.56138 15.3256 3.97393 14.98C2.48803 14.0988 2.24613 12.1464 2.22886 11.0406H4.40588C4.37132 11.5935 4.33677 12.6302 5.097 13.0621C5.49439 13.2868 5.92634 13.3386 6.30646 13.2004C6.68657 13.0449 6.96302 12.7339 7.08396 12.2846C7.25674 11.7663 7.1358 11.1961 6.79024 10.7296C6.4274 10.2286 5.89178 9.93483 5.28706 9.93483H0V7.72325H11.0579C12.1637 7.70597 12.8202 7.42952 13.2695 6.91118C13.6841 6.44468 13.8569 5.8054 13.7705 5.11428C13.6841 4.49227 13.2868 4.18127 12.9757 4.04304C12.4401 3.80115 11.7836 3.87026 11.2998 4.19854C10.4359 4.786 10.4532 6.23734 10.4877 6.61746H8.3107C8.25887 5.71901 8.32798 3.5247 10.0558 2.36708C10.7123 1.91785 11.4726 1.71052 12.2328 1.7278C12.803 1.7278 13.3559 1.86602 13.8915 2.09063C15.0491 2.62625 15.7921 3.57654 15.9648 4.83783ZM4.28493 2.3498C3.87026 2.60897 3.80115 3.30009 3.80115 3.30009H1.71052C1.71052 2.1943 1.91785 1.22674 3.09276 0.466505C3.57654 0.17278 4.14671 0 4.73416 0C5.14883 0 5.5635 0.0863895 5.94362 0.241892C6.85935 0.639285 7.48136 1.43407 7.67141 2.41891C7.87875 3.49015 7.6023 4.59594 6.96302 5.39072C6.49651 5.9609 5.59806 6.61746 4.04304 6.61746H0V4.40588H3.87026C4.42316 4.40588 4.90694 4.26766 5.14883 3.97393C5.37345 3.69748 5.58078 3.26554 5.49439 2.83359C5.44256 2.57442 5.30433 2.38436 5.07972 2.28069C4.82055 2.17702 4.49227 2.21158 4.28493 2.3498Z"
    />
  );
}

/** Weight of Ice, Snow or Sleet; Building Collapse. */
export function SnowGlyph(p: GlyphProps) {
  return (
    <Glyph
      {...p}
      viewBox="0 0 16 16"
      width={16}
      height={16}
      d="M15.1724 7.17241C15.6207 7.17241 16 7.55172 16 8C16 8.46552 15.6207 8.82759 15.1724 8.82759H12.8448L14.6724 10.6724C15 11.0345 15 11.5862 14.6552 11.931C14.4828 12.0862 14.2586 12.1724 14.0345 12.1724C13.8103 12.1724 13.569 12.0862 13.3966 11.9138L10.3793 8.82759H8.82759V10.3966L11.9138 13.4138C12.2586 13.7414 12.2586 14.3103 11.931 14.6552C11.7586 14.8276 11.5172 14.9138 11.2931 14.9138C11.069 14.9138 10.8448 14.8276 10.6724 14.6724L8.82759 12.8621V15.1724C8.82759 15.6379 8.44828 16 8 16C7.53448 16 7.17241 15.6379 7.17241 15.1724V12.8621L5.32759 14.6724C4.98276 15 4.41379 15 4.06897 14.6552C3.74138 14.3103 3.74138 13.7414 4.08621 13.4138L7.17241 10.3793V8.82759H5.62069L2.58621 11.9138C2.41379 12.0862 2.18966 12.1724 1.96552 12.1724C1.74138 12.1724 1.51724 12.0862 1.34483 11.931C1 11.5862 1 11.0345 1.32759 10.6724L3.13793 8.82759H0.827586C0.362069 8.82759 0 8.46552 0 8C0 7.55172 0.362069 7.17241 0.827586 7.17241H3.13793L1.32759 5.32759C1 4.98276 1 4.41379 1.34483 4.06897C1.68966 3.74138 2.25862 3.74138 2.60345 4.08621L5.60345 7.17241H7.17241V5.62069L4.08621 2.60345C3.74138 2.25862 3.74138 1.68965 4.06897 1.34483C4.41379 0.999999 4.98276 0.999999 5.32759 1.32759L7.17241 3.15517V0.827586C7.17241 0.37931 7.53448 0 8 0C8.44828 0 8.82759 0.37931 8.82759 0.827586V3.13793L10.6724 1.32759C11.0172 0.999999 11.5862 0.999999 11.931 1.34483C12.2586 1.68965 12.2586 2.25862 11.9138 2.60345L8.82759 5.62069V7.17241H10.3793L13.3966 4.08621C13.7414 3.74138 14.3103 3.74138 14.6552 4.06897C15 4.41379 15 4.98276 14.6724 5.32759L12.8621 7.17241H15.1724Z"
    />
  );
}

/** download/download-down — "save, receive, file". STROKED, not filled. */
export function DownloadIcon({ size = 24, className }: GlyphProps) {
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
      {/* Exported 20×18 artwork, centred in the 24 box per the node's insets. */}
      <g transform="translate(2 3)" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12C1 14.7614 3.23858 17 6 17H14C16.7614 17 19 14.7614 19 12M7 9.18847C7.74024 10.1755 8.59899 11.0668 9.55643 11.8426C9.68592 11.9475 9.84296 12 10 12M13 9.18847C12.2598 10.1755 11.401 11.0668 10.4436 11.8426C10.3141 11.9475 10.157 12 10 12M10 12V1" />
      </g>
    </svg>
  );
}

/** chevron-big — rotated 90° by CSS for the select affordance. */
export function ChevronBig({ size = 24, className }: GlyphProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(8 5)">
        <path d="M1.58599 0.189675C1.26945 -0.0392302 0.84859 -0.0628562 0.508414 0.129182C0.168238 0.321219 -0.0289727 0.693759 0.00346815 1.08305C0.331619 5.02086 0.331619 8.97915 0.00346815 12.917C-0.0289726 13.3062 0.168238 13.6788 0.508414 13.8708C0.84859 14.0629 1.26945 14.0392 1.58599 13.8103C3.837 12.1825 5.8566 10.2764 7.59304 8.14103C8.13567 7.47372 8.13567 6.52629 7.59304 5.85898C5.8566 3.72356 3.837 1.81746 1.58599 0.189675Z" />
      </g>
    </svg>
  );
}
