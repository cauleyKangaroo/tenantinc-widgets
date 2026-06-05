import React from 'react';
import type { SpaceType, UnitSize } from '../types';
import type { FilterState } from '../filters';
import { TYPE_OPTIONS, SIZE_OPTIONS, FEATURE_OPTIONS, AMENITY_OPTIONS } from '../data';

interface FilterPanelProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  badge: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onReset: () => void;
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
}: FilterPanelProps) {
  return (
    <aside className={`suf-filter-panel${collapsed ? ' collapsed' : ''}`}>
      <div className="suf-filter-header" onClick={onToggleCollapse}>
        <div className="suf-filter-title-row">
          <span className="suf-filter-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
          </span>
          <span className="suf-filter-title">Filter Spaces</span>
          <span className="suf-filter-badge">{badge}</span>
        </div>
        <div className="suf-filter-header-right">
          <button
            className="suf-reset-btn"
            onClick={(e) => {
              e.stopPropagation(); // don't collapse the panel
              onReset();
            }}
          >
            Reset
          </button>
          <span className="suf-filter-chevron">▲</span>
        </div>
      </div>

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
                  onClick={() => onChange({ ...filters, type: opt.value as SpaceType })}
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
            <div className="suf-pills">
              {FEATURE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`suf-pill${filters.features.includes(opt.value) ? ' active' : ''}`}
                  onClick={() =>
                    onChange({ ...filters, features: toggle(filters.features, opt.value) })
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="suf-filter-right-group">
          <div className="suf-filter-section">
            <div className="suf-filter-label">Amenities</div>
            <div className="suf-checkboxes">
              {AMENITY_OPTIONS.map((amenity) => (
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
