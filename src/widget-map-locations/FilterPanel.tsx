// Filter panel — what the header's Filter button opens. Figma 10557:146492.
//
// Centred lightbox over a dark overlay, same pattern as #05's FilterModal
// (`.sl-modal-overlay`): fixed overlay, click-away to close, Esc, host-page
// scroll locked while open. Selections are real local state so the panel
// demonstrates properly, but nothing is filtered yet: #08 is still static.

import React, { useEffect } from 'react';
import {
  type FilterState,
  TYPE_OPTIONS, SIZE_OPTIONS, FEATURE_OPTIONS, AMENITY_OPTIONS, PROMOTION_OPTIONS,
  PRICE_OPTIONS, DISTANCE_OPTIONS, activeFilterCount,
} from './filters';

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Pill row — a selected pill inverts and grows a clear (x) button, per the frame. */
function PillGroup({
  options, selected, onToggle,
}: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="ml-fp-pills">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            className={`ml-fp-pill${on ? ' ml-fp-pill--on' : ''}`}
            onClick={() => onToggle(opt)}
            aria-pressed={on}
          >
            {on && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm3.5 12.1-1.4 1.4L12 13.4l-2.1 2.1-1.4-1.4L10.6 12 8.5 9.9l1.4-1.4L12 10.6l2.1-2.1 1.4 1.4L13.4 12l2.1 2.1Z" />
              </svg>
            )}
            <span>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Checkbox list — 24px box + 14px label. */
function CheckList({
  options, selected, onToggle,
}: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="ml-fp-checks">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <label key={opt} className="ml-fp-check">
            <input type="checkbox" checked={on} onChange={() => onToggle(opt)} />
            <span className="ml-fp-box" aria-hidden="true">
              {on && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span className="ml-fp-check-label">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

/** Label-over-value select, the frame's ".Form 2.0" control. */
function FieldSelect({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="ml-fp-field">
      <span className="ml-fp-field-label">{label}</span>
      <select className="ml-fp-field-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg className="ml-fp-field-chevron" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </label>
  );
}

export function FilterPanel({
  filters, onChange, onClose, onReset, onApply,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
}) {
  // Close on Escape; lock host-page scroll while the lightbox is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value });

  const count = activeFilterCount(filters);

  return (
    <div className="ml-fp-overlay" onClick={onClose}>
      <div
        className="ml-fp"
        role="dialog"
        aria-modal="true"
        aria-label="Filter spaces"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ml-fp-head">
          <div className="ml-fp-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
            <span>Filter Spaces</span>
            {count > 0 && <span className="ml-fp-count">{count}</span>}
          </div>
          <div className="ml-fp-head-actions">
            <button type="button" className="ml-fp-reset" onClick={onReset}>Reset</button>
            <button type="button" className="ml-fp-close" aria-label="Close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="ml-fp-body">
          <div className="ml-fp-search">
            <input type="text" placeholder="Filter Spaces by... " aria-label="Filter spaces by" />
            <span className="ml-fp-search-btn" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" />
                <path d="M18 15l.8 2.2 2.2.8-2.2.8L18 21l-.8-2.2-2.2-.8 2.2-.8L18 15Z" />
              </svg>
            </span>
          </div>

          <section className="ml-fp-section">
            <p className="ml-fp-section-title">Type:</p>
            <PillGroup options={TYPE_OPTIONS} selected={filters.types} onToggle={(v) => set('types', toggle(filters.types, v))} />
          </section>

          <section className="ml-fp-section">
            <p className="ml-fp-section-title">Size:</p>
            <PillGroup options={SIZE_OPTIONS} selected={filters.sizes} onToggle={(v) => set('sizes', toggle(filters.sizes, v))} />
          </section>

          <section className="ml-fp-section">
            <p className="ml-fp-section-title">Price:</p>
            <div className="ml-fp-fields">
              <FieldSelect label="Min Price" value={filters.minPrice} options={PRICE_OPTIONS} onChange={(v) => set('minPrice', v)} />
              <FieldSelect label="Max Price" value={filters.maxPrice} options={PRICE_OPTIONS} onChange={(v) => set('maxPrice', v)} />
            </div>
          </section>

          <section className="ml-fp-section">
            <p className="ml-fp-section-title">Distance:</p>
            <div className="ml-fp-fields">
              <FieldSelect label="Max Distance" value={filters.maxDistance} options={DISTANCE_OPTIONS} onChange={(v) => set('maxDistance', v)} />
            </div>
          </section>

          <section className="ml-fp-section">
            <p className="ml-fp-section-title">Space Features:</p>
            <PillGroup options={FEATURE_OPTIONS} selected={filters.features} onToggle={(v) => set('features', toggle(filters.features, v))} />
          </section>

          <section className="ml-fp-section">
            <p className="ml-fp-section-title">Amenities</p>
            <CheckList options={AMENITY_OPTIONS} selected={filters.amenities} onToggle={(v) => set('amenities', toggle(filters.amenities, v))} />
          </section>

          <section className="ml-fp-section">
            <p className="ml-fp-section-title">Promotions</p>
            <CheckList options={PROMOTION_OPTIONS} selected={filters.promotions} onToggle={(v) => set('promotions', toggle(filters.promotions, v))} />
          </section>
        </div>

        {/* Footer */}
        <div className="ml-fp-foot">
          <button type="button" className="ml-fp-apply" onClick={onApply}>Apply Filters</button>
        </div>
      </div>
    </div>
  );
}
