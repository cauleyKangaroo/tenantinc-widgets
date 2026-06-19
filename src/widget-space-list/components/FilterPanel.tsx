import React from 'react';
import type { SpaceType, UnitSize } from '../types';
import type { FilterState } from '../filters';
import { TYPE_OPTIONS, SIZE_OPTIONS } from '../data';

interface FilterPanelProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  badge: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onReset: () => void;
  amenityOptions: string[];
  featureOptions: string[];
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterPanel({
  filters,
  onChange,
  badge,
  collapsed,
  onToggleCollapse,
  onReset,
  amenityOptions,
  featureOptions,
}: FilterPanelProps) {
  return (
    <aside className={`suf-filter-panel${collapsed ? ' collapsed' : ''}`}>
      <div className="suf-filter-header" onClick={onToggleCollapse}>
        <div className="suf-filter-title-row">
          <span className="suf-filter-icon">
            <svg width="17" height="15" viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 8.33333C3.45 8.33333 2.15833 9.4 1.78333 10.8333H0V12.5H1.78333C2.15833 13.9333 3.45 15 5 15C6.55 15 7.84167 13.9333 8.21667 12.5H16.6667V10.8333H8.21667C7.84167 9.4 6.55 8.33333 5 8.33333ZM5 13.3333C4.08333 13.3333 3.33333 12.5833 3.33333 11.6667C3.33333 10.75 4.08333 10 5 10C5.91667 10 6.66667 10.75 6.66667 11.6667C6.66667 12.5833 5.91667 13.3333 5 13.3333ZM14.8833 2.5C14.5083 1.06667 13.2167 0 11.6667 0C10.1167 0 8.825 1.06667 8.45 2.5H0V4.16667H8.45C8.825 5.6 10.1167 6.66667 11.6667 6.66667C13.2167 6.66667 14.5083 5.6 14.8833 4.16667H16.6667V2.5H14.8833ZM11.6667 5C10.75 5 10 4.25 10 3.33333C10 2.41667 10.75 1.66667 11.6667 1.66667C12.5833 1.66667 13.3333 2.41667 13.3333 3.33333C13.3333 4.25 12.5833 5 11.6667 5Z" fill="currentColor"/>
            </svg>
          </span>
          <span className="suf-filter-title">Filter Spaces</span>
          <span className="suf-filter-badge">{badge}</span>
        </div>
        <div className="suf-filter-header-right">
          <button
            className="suf-reset-btn"
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
          >
            Reset
          </button>
          <span className="suf-filter-chevron">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
      </div>

      <div className="suf-filter-separator" />

      <div className="suf-filter-body">
        <div className="suf-filter-left-group">
          {/* Type — single select */}
          <div className="suf-filter-section">
            <div className="suf-filter-label">Type:</div>
            <div className="suf-pills">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`suf-pill${filters.type === opt.value ? ' active' : ''}`}
                  onClick={() => onChange({ ...filters, type: opt.value as SpaceType, features: [] })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size — multi select */}
          <div className="suf-filter-section">
            <div className="suf-filter-label">Size:</div>
            <div className="suf-pills">
              {SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`suf-pill${filters.sizes.includes(opt.value) ? ' active' : ''}`}
                  onClick={() =>
                    onChange({ ...filters, sizes: toggle<UnitSize>(filters.sizes, opt.value) })
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Features — multi select */}
          <div className="suf-filter-section">
            <div className="suf-filter-label">Space Features:</div>
            <div className="suf-pills suf-pills-wrap">
              {featureOptions.map((name) => (
                <button
                  key={name}
                  className={`suf-pill${filters.features.includes(name) ? ' active' : ''}`}
                  onClick={() =>
                    onChange({ ...filters, features: toggle(filters.features, name) })
                  }
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="suf-filter-right-group">
          <div className="suf-filter-section">
            <div className="suf-filter-label">Amenities</div>
            <div className="suf-checkboxes">
              {amenityOptions.map((amenity) => (
                <label key={amenity} className="suf-checkbox-item">
                  <input
                    type="checkbox"
                    className="suf-checkbox"
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
        </div>
      </div>
    </aside>
  );
}
