import React, { useLayoutEffect, useRef, useState } from 'react';
import type { Unit, UnitSize, WidgetConfig } from '../types';
import { PriceBlock, CtaButton, FeatureList, CheckIcon, JunkFeeDisclaimer, PromoTagIcon, priceFigures } from './Pricing';
import { unitImageSrc, unitImageOnError } from './unitImage';

const SIZE_LABEL: Record<UnitSize, string> = {
  other: 'Other',
  extra_small: 'Extra Small',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  extra_large: 'Extra Large',
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlayCircleIcon() {
  // Pika play/play-circle (outline) — inherits currentColor from .sl-lc-see-fits.
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.0001 21.1501C17.0535 21.1501 21.1501 17.0535 21.1501 12.0001C21.1501 6.94669 17.0535 2.8501 12.0001 2.8501C6.94669 2.8501 2.8501 6.94669 2.8501 12.0001C2.8501 17.0535 6.94669 21.1501 12.0001 21.1501Z" />
      <path d="M9.50012 11.896C9.50012 10.4641 9.50012 9.74818 9.79935 9.34849C10.0601 9.00019 10.4593 8.78227 10.8933 8.75127C11.3913 8.7157 11.9935 9.10284 13.1979 9.87713L13.3597 9.98113C14.4049 10.653 14.9275 10.989 15.108 11.4161C15.2657 11.7894 15.2657 12.2105 15.108 12.5838C14.9275 13.011 14.4049 13.3469 13.3597 14.0188L13.1979 14.1228C11.9935 14.8971 11.3913 15.2842 10.8933 15.2487C10.4593 15.2177 10.0601 14.9997 9.79935 14.6514C9.50012 14.2517 9.50012 13.5358 9.50012 12.104V11.896Z" />
    </svg>
  );
}

/** Small promo tag flag pinned to the top-right of an available size pill. */
function SizeTagIcon() {
  return (
    /* currentColor — a fill attribute is unthemeable and unstyleable; the
       colour comes from .sl-lc-size-tag. */
    /* The design's tag (tag.svg, Figma 14158-20469). Its #509E2F fill is
       replaced by currentColor, and its white outline is left out: the white
       keyline already comes from .sl-lc-size-tag's drop-shadows. */
    <svg width="16" height="16" viewBox="0.5 0.5 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        d="M5.87642 1.54628C6.83634 1.49562 7.43954 1.46378 8.01858 1.58044C8.53092 1.68366 9.02228 1.87221 9.47215 2.13823C9.98059 2.43887 10.4076 2.86606 11.0873 3.54587L12.861 5.31955C13.6479 6.1061 14.1569 6.61481 14.4453 7.18076C15.0266 8.32163 15.0266 9.67183 14.4453 10.8127C14.1569 11.3786 13.6479 11.8873 12.861 12.6739L12.6728 12.8621C11.8862 13.649 11.3775 14.158 10.8116 14.4464C9.67073 15.0277 8.32053 15.0277 7.17967 14.4464C6.61371 14.158 6.10502 13.649 5.31845 12.8621L3.54477 11.0884C2.86496 10.4087 2.43777 9.98169 2.13713 9.47325C1.87112 9.02338 1.68256 8.53202 1.57934 8.01968C1.46268 7.44064 1.49452 6.83743 1.54518 5.87751L1.58021 5.21223C1.6058 4.72591 1.627 4.32285 1.67018 3.99358C1.71519 3.65029 1.78954 3.33587 1.94856 3.03935C2.19664 2.57679 2.5757 2.19773 3.03825 1.94966C3.33477 1.79064 3.64919 1.71629 3.99248 1.67128C4.32176 1.6281 4.72481 1.60689 5.21113 1.58131L5.87642 1.54628ZM5.82585 4.49247C5.08947 4.49247 4.49251 5.08943 4.49251 5.82581C4.49251 6.56219 5.08947 7.15914 5.82585 7.15914C6.56223 7.15914 7.15918 6.56219 7.15918 5.82581C7.15918 5.08943 6.56223 4.49247 5.82585 4.49247Z"
      />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ListCard({ size, units, config }: { size: UnitSize; units: Unit[]; config: WidgetConfig }) {
  const [selectedId, setSelectedId] = useState(units[0].id);
  // The selected unit may disappear if filters change; fall back to first.
  const selected = units.find((u) => u.id === selectedId) ?? units[0];
  // Every figure any size in this card can show, so PriceBlock can hold each
  // slot at the widest and the price labels stay put between sizes.
  const figures = units.map((u) => priceFigures(u, config));
  const anyPromo = units.some((u) => u.promo);
  // The last promotion shown, kept so a closing promo box still has its text.
  const lastPromo = useRef<string | undefined>(undefined);
  if (selected.promo) lastPromo.current = selected.promo;
  const shownPromo = selected.promo ?? lastPromo.current;
  const reserve = {
    strike: Array.from(new Set(figures.map((f) => f.strike))),
    main: Array.from(new Set(figures.map((f) => f.main))),
  };

  // The frame completes the last row with empty slots, so the grid reads as a
  // block rather than a ragged edge. How many to add depends on the column
  // count, and that is NOT a constant — four columns at desktop, two below an
  // 820px card, three below 680px — so it is read from the laid-out grid
  // rather than hardcoded.
  //
  // Read from grid-template-columns, i.e. the TRACKS, not from how the items
  // happened to land. Counting items per row (their offsetTop) asks the
  // content how wide the grid is, which gets it wrong in exactly the cases
  // this feature exists for: one long label packs 3 to a row, and a group of
  // one unit looks like a 1-column grid that is already complete. The track
  // list is the column count whatever the content does, so a single pill
  // correctly pads out to a full row.
  const sizesRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(0);
  useLayoutEffect(() => {
    const el = sizesRef.current;
    if (!el) return undefined;
    const measure = () => {
      const tracks = getComputedStyle(el).gridTemplateColumns;
      const n = tracks && tracks !== 'none' ? tracks.split(' ').filter(Boolean).length : 0;
      // Only on a real change: the track count does not depend on the fillers,
      // so this settles on the first pass instead of feeding itself.
      setCols((c) => (c === n ? c : n));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fillers = cols > 0 ? (cols - (units.length % cols)) % cols : 0;

  return (
    <div className="sl-list-card">
      {/* Display panel — image + amenities (left) and the size grid (right) */}
      <div className="sl-lc-display">
        <div className="sl-lc-left">
          <div className="sl-lc-image-col">
            {/* No artwork ⇒ no element — see unitImage.ts. */}
            {unitImageSrc(selected) && (
              <img
                className="sl-lc-img"
                src={unitImageSrc(selected)}
                alt="Storage Unit"
                onError={unitImageOnError(selected)}
              />
            )}
            {/* The video follows the SELECTED pill, like the image beside it. */}
            <a
              href="#"
              className="sl-lc-see-fits"
              onClick={(e) => { e.preventDefault(); config.onSeeWhatFits?.(selected); }}
            >
              See what fits <PlayCircleIcon />
            </a>
          </div>

          <div className="sl-lc-info">
            <div className="sl-lc-size-label">{SIZE_LABEL[size]}</div>
            {/* The subtype chip and the feature ticks, wrapped so the narrow
                frame can lay them out as ONE two-column grid (7112-56027) with
                the chip as its first cell. `display: contents` on every other
                width, so this element does not exist as far as the desktop
                layout is concerned. */}
            {/* The row count lets the narrow frame fill its two columns
                top-to-bottom (chip, then the first ticks, then the right
                column), as Figma 7112-56210 does. Ignored at wider widths. */}
            <div
              className="sl-lc-amenities"
              style={{ '--lc-am-rows': Math.max(1, Math.ceil(((selected.subtype ? 1 : 0) + selected.features.length) / 2)) } as React.CSSProperties}
            >
              {selected.subtype && (
                <span className="sl-lc-subtype">
                  <CheckIcon /> {selected.subtype}
                </span>
              )}
              <FeatureList features={selected.features} />
            </div>
          </div>
        </div>

        <div className="sl-lc-sizes" ref={sizesRef}>
          {units.map((u) => {
            const isSelected = u.id === selected.id;
            const isUnavail = u.availability === 'waitlist';
            return (
              <button
                key={u.id}
                className={`sl-lc-size${isSelected ? ' selected' : ''}${isUnavail ? ' unavail' : ''}`}
                onClick={() => setSelectedId(u.id)}
              >
                {u.dimensions}
                {u.promo && <span className="sl-lc-size-tag"><SizeTagIcon /></span>}
              </button>
            );
          })}
          {/* Decorative: there is no space here, so nothing to press or to
              announce. */}
          {Array.from({ length: fillers }, (_, i) => (
            <span key={`empty-${i}`} className="sl-lc-size sl-lc-size-empty" aria-hidden="true" />
          ))}
        </div>
      </div>

      {/* Action panel — promo banner + price + CTA */}
      <div className="sl-lc-action">
        {/* Slides open / closed between sizes (where it stacks above the
            price — see .sl-lc-promo-wrap) rather than snapping, so the price
            row glides instead of jumping. It closes on the LAST promotion shown,
            so the text does not vanish before the box has shut. Cards where no
            size has a promotion render none of this. */}
        {anyPromo && (
          <div className={`sl-lc-promo-wrap${selected.promo ? ' is-open' : ''}`} aria-hidden={!selected.promo || undefined}>
            <div className="sl-lc-promo-clip">
              {shownPromo && (
                <div className="sl-lc-promo">
                  <span className="sl-lc-promo-icon"><PromoTagIcon size={16} /></span>
                  {shownPromo}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="sl-lc-price-button">
          <div className="sl-lc-price">
            <PriceBlock unit={selected} config={config} reserve={reserve} />
            {/* Narrow frames: the small print stays under the price. */}
            {config.showJunkFeeDisclaimer && (
              <div className="sl-lc-fee-inline"><JunkFeeDisclaimer config={config} /></div>
            )}
          </div>
          <CtaButton unit={selected} config={config} full colClass="sl-lc-btn-col" />
        </div>
        {/* Desktop: the small print sits in the LEFT column — under the promo
            when there is one, in its place at the top when there is not. AFTER
            the price row in the DOM so the narrow frame's
            `.sl-lc-promo-wrap + .sl-lc-price-button` slide still matches; the
            grid places it. Only one of the two copies is ever displayed. */}
        {config.showJunkFeeDisclaimer && (
          <div className="sl-lc-fee"><JunkFeeDisclaimer config={config} /></div>
        )}
      </div>
    </div>
  );
}
