import React, { useState } from 'react';
import type { Unit, UnitSize, WidgetConfig } from '../types';
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

const DEFAULT_OPEN: Record<UnitSize, boolean> = {
  other: false,
  extra_small: false,
  small: false,
  medium: true,
  large: false,
  extra_large: false,
};

const ChevronDown = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export function GridView({ units, config, type }: { units: Unit[]; config: WidgetConfig; type: string }) {
  const [open, setOpen] = useState<Record<UnitSize, boolean>>(DEFAULT_OPEN);

  if (units.length === 0) {
    return <div className="suf-empty-msg">No spaces match your filters.</div>;
  }

  if (type === 'parking') {
    return (
      <div className="suf-grid-view">
        <div className="suf-cards-grid">
          {units.map((u) => (
            <UnitCard key={u.id} unit={u} config={config} />
          ))}
        </div>
      </div>
    );
  }

  const groups = groupBySize(units);
  const toggle = (size: UnitSize) => setOpen((o) => ({ ...o, [size]: !o[size] }));

  return (
    <div className="suf-grid-view">
      {groups.map(({ size, units: groupUnits }) => {
        const isOpen = open[size];
        return (
          <div key={size} className={`suf-accordion${isOpen ? ' expanded' : ''}`}>
            <div className="suf-accordion-header" onClick={() => toggle(size)}>
              <span className="suf-accordion-title">{SIZE_LABEL[size]}</span>
              <span className="suf-chevron"><ChevronDown /></span>
            </div>
            {isOpen && (
              <div className="suf-accordion-body">
                <div className="suf-cards-grid">
                  {groupUnits.map((u) => (
                    <UnitCard key={u.id} unit={u} config={config} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
