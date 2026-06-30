import React from 'react';
import type { FilterState } from '../filters';

interface TopFilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  featureOptions: string[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function FilterHorizontalIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12C3.45 12 2.15833 13.0667 1.78333 14.5H0V16.1667H1.78333C2.15833 17.6 3.45 18.6667 5 18.6667C6.55 18.6667 7.84167 17.6 8.21667 16.1667H16.6667V14.5H8.21667C7.84167 13.0667 6.55 12 5 12ZM5 17C4.08333 17 3.33333 16.25 3.33333 15.3333C3.33333 14.4167 4.08333 13.6667 5 13.6667C5.91667 13.6667 6.66667 14.4167 6.66667 15.3333C6.66667 16.25 5.91667 17 5 17ZM14.8833 6.16667C14.5083 4.73333 13.2167 3.66667 11.6667 3.66667C10.1167 3.66667 8.825 4.73333 8.45 6.16667H0V7.83333H8.45C8.825 9.26667 10.1167 10.3333 11.6667 10.3333C13.2167 10.3333 14.5083 9.26667 14.8833 7.83333H16.6667V6.16667H14.8833ZM11.6667 8.66667C10.75 8.66667 10 7.91667 10 7C10 6.08333 10.75 5.33333 11.6667 5.33333C12.5833 5.33333 13.3333 6.08333 13.3333 7C13.3333 7.91667 12.5833 8.66667 11.6667 8.66667Z" fill="currentColor"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TopFilterBar({
  filters,
  onChange,
  featureOptions,
  searchTerm,
  onSearchChange,
  panelOpen,
  onTogglePanel,
}: TopFilterBarProps) {
  // Show first 2 available features as quick-access pills
  const quickPills = featureOptions.slice(0, 2);

  return (
    <div className="sl-top-bar">

      {/* Left group: icon + quick pills + More */}
      <div className="sl-top-bar-left">

        {/* Abacus / filter icon button */}
        <button
          className={`sl-top-bar-icon-btn${panelOpen ? ' active' : ''}`}
          onClick={onTogglePanel}
          aria-label="Open filters"
          title="Open filters"
        >
          <FilterHorizontalIcon />
        </button>

        {/* Quick feature pills */}
        <div className="sl-top-bar-pills">
          {quickPills.map((name) => (
            <button
              key={name}
              className={`sl-top-bar-pill${filters.features.includes(name) ? ' active' : ''}`}
              onClick={() => onChange({ ...filters, features: toggle(filters.features, name) })}
            >
              {name}
            </button>
          ))}

          {/* More — opens the full panel */}
          <button
            className={`sl-top-bar-pill${panelOpen ? ' active' : ''}`}
            onClick={onTogglePanel}
          >
            More
          </button>
        </div>
      </div>

      {/* Right: search input */}
      <div className="sl-top-bar-search">
        <input
          className="sl-top-bar-search-input"
          type="text"
          placeholder="Search Spaces"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button className="sl-top-bar-search-btn" aria-label="Search">
          <SearchIcon />
        </button>
      </div>

    </div>
  );
}
