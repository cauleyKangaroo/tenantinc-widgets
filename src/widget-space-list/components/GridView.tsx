import React, { useState } from 'react';
import type { Unit, SpaceType, UnitSize, WidgetConfig } from '../types';
import { groupBySize } from '../filters';
import { UnitCard } from './UnitCard';

const SIZE_LABEL: Record<UnitSize, string> = {
  other: 'Other',
  extra_small: 'Extra Small',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  extra_large: 'Extra Large',
};

const TYPE_LABEL: Partial<Record<SpaceType, string>> = {
  parking: 'Parking',
};

// Every size group opens by default (dynamic — whichever sizes are present all
// start expanded on load).
const SIZE_DEFAULT_OPEN: Record<UnitSize, boolean> = {
  other: true,
  extra_small: true,
  small: true,
  medium: true,
  large: true,
  extra_large: true,
};

const ChevronDown = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ── Storage: grouped by size accordions ───────────────────────────────────────

function StorageAccordions({ units, config }: { units: Unit[]; config: WidgetConfig }) {
  const [open, setOpen] = useState<Record<UnitSize, boolean>>(SIZE_DEFAULT_OPEN);
  const toggle = (size: UnitSize) => setOpen((o) => ({ ...o, [size]: !o[size] }));

  return (
    <>
      {groupBySize(units).map(({ size, units: groupUnits }) => {
        const isOpen = open[size];
        return (
          <div key={size} className={`sl-accordion${isOpen ? ' expanded' : ''}`}>
            <div className="sl-accordion-header" onClick={() => toggle(size)}>
              <span className="sl-accordion-title">{SIZE_LABEL[size]}</span>
              <span className="sl-chevron"><ChevronDown /></span>
            </div>
            {isOpen && (
              <div className="sl-accordion-body">
                <div className="sl-cards-grid">
                  {groupUnits.map((u) => (
                    <UnitCard key={u.id} unit={u} config={config} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ── Non-storage types: one named accordion each ───────────────────────────────

function TypeAccordion({ spaceType, units, config }: { spaceType: SpaceType; units: Unit[]; config: WidgetConfig }) {
  const [open, setOpen] = useState(true);
  const label = TYPE_LABEL[spaceType] ?? (spaceType.charAt(0).toUpperCase() + spaceType.slice(1));

  return (
    <div className={`sl-accordion${open ? ' expanded' : ''}`}>
      <div className="sl-accordion-header" onClick={() => setOpen((o) => !o)}>
        <span className="sl-accordion-title">{label}</span>
        <span className="sl-chevron"><ChevronDown /></span>
      </div>
      {open && (
        <div className="sl-accordion-body">
          <div className="sl-cards-grid">
            {units.map((u) => (
              <UnitCard key={u.id} unit={u} config={config} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function GridView({ units, config }: { units: Unit[]; config: WidgetConfig }) {
  if (units.length === 0) {
    return <div className="sl-empty-msg">No spaces match your filters.</div>;
  }

  // Derive unique types in the order they appear
  const orderedTypes = Array.from(new Set(units.map((u) => u.type))) as SpaceType[];

  return (
    <div className="sl-grid-view">
      {orderedTypes.map((spaceType) => {
        const typeUnits = units.filter((u) => u.type === spaceType);
        if (spaceType === 'storage') {
          return <StorageAccordions key="storage" units={typeUnits} config={config} />;
        }
        return <TypeAccordion key={spaceType} spaceType={spaceType} units={typeUnits} config={config} />;
      })}
    </div>
  );
}
