// Filter panel — what the header's Filter button opens. Figma 10557:146492.
//
// Centred lightbox over a dark overlay, same pattern as #05's FilterModal
// (`.sl-modal-overlay`): fixed overlay, click-away to close, Esc, host-page
// scroll locked while open. Selections are real local state so the panel
// demonstrates properly, but nothing is filtered yet: #08 is still static.

import { FilterIcon, CloseIcon, AiSparkleIcon, ChevronDownIcon, ClearCircleIcon, CheckboxIcon } from './icons';
import React, { useEffect } from 'react';
import {
  type FilterState, type FilterOptions,
  PRICE_OPTIONS, DISTANCE_OPTIONS, activeFilterCount,
} from './filters';

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// ── Icons ───────────────────────────────────────────────────────────────────
// The REAL Figma artwork now (node 10557-146402), not the approximations that
// used to live here: `filter/filter-horizontal`, `Close` (mdiClose),
// `ai/ai-01`, `Clear` (mdiCloseCircle) and the design-system checkbox.
// See ./icons.tsx.

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
            {on && <ClearCircleIcon size={20} />}
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
            <CheckboxIcon checked={on} size={24} className="ml-fp-box" />
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
      <ChevronDownIcon size={24} className="ml-fp-field-chevron" />
    </label>
  );
}

export function FilterPanel({
  filters, options, onChange, onClose, onReset, onApply, resultCount,
}: {
  filters: FilterState;
  /** Facets present in the loaded data — see deriveFilterOptions. A section
   *  with no options hides itself rather than showing an empty heading. */
  options: FilterOptions;
  onChange: (next: FilterState) => void;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
  /** How many facilities the current selection leaves, shown on Apply so the
   *  visitor isn't applying a filter blind and landing on an empty page. */
  resultCount?: number;
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
            <FilterIcon size={24} />
            <span>Filter Spaces</span>
            {count > 0 && <span className="ml-fp-count">{count}</span>}
          </div>
          <div className="ml-fp-head-actions">
            <button type="button" className="ml-fp-reset" onClick={onReset}>Reset</button>
            <button type="button" className="ml-fp-close" aria-label="Close" onClick={onClose}>
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="ml-fp-body">
          {/* Figma 10557:146418 — 54px pill, dark circular AI button inset right.
              Same .ml-search block the mobile header uses, one size down. */}
          <div className="ml-search ml-search--sm">
            <input
              className="ml-search-input"
              type="text"
              placeholder="Filter Spaces by... "
              aria-label="Filter spaces by"
            />
            <button type="button" className="ml-search-btn" aria-label="Search">
              <AiSparkleIcon size={24} />
            </button>
          </div>

          {/* Each facet section renders only if the loaded data actually offers
              it — an empty "Amenities" heading over nothing looks broken, and
              on a property whose amenity flags aren't set that is the norm. */}
          {options.types.length > 0 && (
            <section className="ml-fp-section">
              <p className="ml-fp-section-title">Type:</p>
              <PillGroup options={options.types} selected={filters.types} onToggle={(v) => set('types', toggle(filters.types, v))} />
            </section>
          )}

          {options.sizes.length > 0 && (
            <section className="ml-fp-section">
              <p className="ml-fp-section-title">Size:</p>
              <PillGroup options={options.sizes} selected={filters.sizes} onToggle={(v) => set('sizes', toggle(filters.sizes, v))} />
            </section>
          )}

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

          {options.features.length > 0 && (
            <section className="ml-fp-section">
              <p className="ml-fp-section-title">Space Features:</p>
              <PillGroup options={options.features} selected={filters.features} onToggle={(v) => set('features', toggle(filters.features, v))} />
            </section>
          )}

          {options.amenities.length > 0 && (
            <section className="ml-fp-section">
              <p className="ml-fp-section-title">Amenities</p>
              <CheckList options={options.amenities} selected={filters.amenities} onToggle={(v) => set('amenities', toggle(filters.amenities, v))} />
            </section>
          )}

          {options.promotions.length > 0 && (
            <section className="ml-fp-section">
              <p className="ml-fp-section-title">Promotions</p>
              <CheckList options={options.promotions} selected={filters.promotions} onToggle={(v) => set('promotions', toggle(filters.promotions, v))} />
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="ml-fp-foot">
          <button type="button" className="ml-fp-apply" onClick={onApply}>
            {resultCount == null
              ? 'Apply Filters'
              : `Show ${resultCount} ${resultCount === 1 ? 'Facility' : 'Facilities'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
