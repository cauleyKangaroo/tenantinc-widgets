import React, { useEffect } from 'react';
import type { SpaceType, UnitSize } from '../types';
import type { FilterState } from '../filters';
import { TYPE_OPTIONS, SIZE_OPTIONS } from '../data';

interface FilterModalProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  badge: number;
  onClose: () => void;
  onReset: () => void;
  amenityOptions: string[];
  featureOptions: string[];
  promotionOptions: string[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function FilterIcon() {
  return (
    <svg width="17" height="15" viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 8.33333C3.45 8.33333 2.15833 9.4 1.78333 10.8333H0V12.5H1.78333C2.15833 13.9333 3.45 15 5 15C6.55 15 7.84167 13.9333 8.21667 12.5H16.6667V10.8333H8.21667C7.84167 9.4 6.55 8.33333 5 8.33333ZM5 13.3333C4.08333 13.3333 3.33333 12.5833 3.33333 11.6667C3.33333 10.75 4.08333 10 5 10C5.91667 10 6.66667 10.75 6.66667 11.6667C6.66667 12.5833 5.91667 13.3333 5 13.3333ZM14.8833 2.5C14.5083 1.06667 13.2167 0 11.6667 0C10.1167 0 8.825 1.06667 8.45 2.5H0V4.16667H8.45C8.825 5.6 10.1167 6.66667 11.6667 6.66667C13.2167 6.66667 14.5083 5.6 14.8833 4.16667H16.6667V2.5H14.8833ZM11.6667 5C10.75 5 10 4.25 10 3.33333C10 2.41667 10.75 1.66667 11.6667 1.66667C12.5833 1.66667 13.3333 2.41667 13.3333 3.33333C13.3333 4.25 12.5833 5 11.6667 5Z" fill="currentColor"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/** Circle-with-X shown inside an active (removable) pill. */
function PillRemoveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      <line x1="5.5" y1="5.5" x2="10.5" y2="10.5" stroke="#101318" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="10.5" y1="5.5" x2="5.5" y2="10.5" stroke="#101318" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.5c.4 3.9 1.6 5.1 5.5 5.5-3.9.4-5.1 1.6-5.5 5.5-.4-3.9-1.6-5.1-5.5-5.5 3.9-.4 5.1-1.6 5.5-5.5Z" />
      <path d="M18.5 13.5c.2 2 .8 2.6 2.8 2.8-2 .2-2.6.8-2.8 2.8-.2-2-.8-2.6-2.8-2.8 2-.2 2.6-.8 2.8-2.8Z" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FilterModal({
  filters,
  onChange,
  badge,
  onClose,
  onReset,
  amenityOptions,
  featureOptions,
  promotionOptions,
  searchTerm,
  onSearchChange,
}: FilterModalProps) {
  // Close on Escape; lock host-page scroll while the lightbox is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const showSize = filters.types.length === 0 || filters.types.includes('storage');

  return (
    <div className="sl-modal-overlay" onClick={onClose}>
      <div
        className="sl-filter-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Filter Spaces"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sl-modal-header">
          <div className="sl-filter-title-row">
            <span className="sl-filter-icon"><FilterIcon /></span>
            <span className="sl-filter-title">Filter Spaces</span>
            <span className="sl-filter-badge">{badge}</span>
          </div>
          <div className="sl-modal-header-right">
            <button className="sl-modal-reset" onClick={onReset}>Reset</button>
            <button className="sl-modal-close" onClick={onClose} aria-label="Close filters">
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="sl-filter-separator" />

        {/* Body */}
        <div className="sl-modal-body">
          {/* Search */}
          <div className="sl-modal-search">
            <input
              className="sl-modal-search-input"
              type="text"
              placeholder="Filter Spaces by..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <button className="sl-modal-search-btn" aria-label="Search">
              <SparkleIcon />
            </button>
          </div>

          {/* Type — multi select; empty = all types shown */}
          <div className="sl-filter-section">
            <div className="sl-filter-label">Type:</div>
            <div className="sl-pills">
              {TYPE_OPTIONS.map((opt) => {
                const val = opt.value as SpaceType;
                const active = filters.types.includes(val);
                return (
                  <button
                    key={opt.value}
                    className={`sl-pill${active ? ' active' : ''}`}
                    onClick={() => {
                      const next = active
                        ? filters.types.filter((t) => t !== val)
                        : [...filters.types, val];
                      onChange({
                        ...filters,
                        types: next,
                        sizes: next.length > 0 && !next.includes('storage') ? [] : filters.sizes,
                      });
                    }}
                  >
                    {active && <span className="sl-pill-x"><PillRemoveIcon /></span>}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size — only relevant when storage could be showing */}
          {showSize && (
            <div className="sl-filter-section">
              <div className="sl-filter-label">Size:</div>
              <div className="sl-pills">
                {SIZE_OPTIONS.map((opt) => {
                  const active = filters.sizes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      className={`sl-pill${active ? ' active' : ''}`}
                      onClick={() =>
                        onChange({ ...filters, sizes: toggle<UnitSize>(filters.sizes, opt.value) })
                      }
                    >
                      {active && <span className="sl-pill-x"><PillRemoveIcon /></span>}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Space Features — multi select */}
          <div className="sl-filter-section">
            <div className="sl-filter-label">Space Features:</div>
            <div className="sl-pills sl-pills-wrap">
              {featureOptions.map((name) => {
                const active = filters.features.includes(name);
                return (
                  <button
                    key={name}
                    className={`sl-pill${active ? ' active' : ''}`}
                    onClick={() => onChange({ ...filters, features: toggle(filters.features, name) })}
                  >
                    {active && <span className="sl-pill-x"><PillRemoveIcon /></span>}
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amenities — multi select, AND */}
          <div className="sl-filter-section">
            <div className="sl-filter-label">Amenities</div>
            <div className="sl-checkboxes">
              {amenityOptions.map((amenity) => (
                <label key={amenity} className="sl-checkbox-item">
                  <input
                    type="checkbox"
                    className="sl-checkbox"
                    checked={filters.amenities.includes(amenity)}
                    onChange={() =>
                      onChange({ ...filters, amenities: toggle(filters.amenities, amenity) })
                    }
                  />{' '}
                  {amenity}
                </label>
              ))}
            </div>
          </div>

          {/* Promotions — multi select, OR */}
          <div className="sl-filter-section">
            <div className="sl-filter-label">Promotions</div>
            <div className="sl-checkboxes">
              {promotionOptions.map((promo) => (
                <label key={promo} className="sl-checkbox-item">
                  <input
                    type="checkbox"
                    className="sl-checkbox"
                    checked={filters.promotions.includes(promo)}
                    onChange={() =>
                      onChange({ ...filters, promotions: toggle(filters.promotions, promo) })
                    }
                  />{' '}
                  {promo}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
