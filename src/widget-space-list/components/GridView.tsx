import React, { useState } from 'react';
import type { Unit, UnitSize } from '../types';
import { groupBySize } from '../filters';
import { UnitCard } from './UnitCard';

const SIZE_LABEL: Record<UnitSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

// Original default open state: only Medium expanded.
const DEFAULT_OPEN: Record<UnitSize, boolean> = {
  small: false,
  medium: true,
  large: false,
};

export function GridView({ units }: { units: Unit[] }) {
  const [open, setOpen] = useState<Record<UnitSize, boolean>>(DEFAULT_OPEN);
  const groups = groupBySize(units);

  if (groups.length === 0) {
    return <div className="suf-empty-msg">No spaces match your filters.</div>;
  }

  const toggle = (size: UnitSize) => setOpen((o) => ({ ...o, [size]: !o[size] }));

  return (
    <div className="suf-grid-view">
      {groups.map(({ size, units: groupUnits }) => {
        const isOpen = open[size];
        return (
          <div key={size} className={`suf-accordion${isOpen ? ' expanded' : ''}`}>
            <div className="suf-accordion-header" onClick={() => toggle(size)}>
              <span className="suf-accordion-title">{SIZE_LABEL[size]}</span>
              <span className="suf-chevron">{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div className="suf-accordion-body">
                <div className="suf-cards-grid">
                  {groupUnits.map((u) => (
                    <UnitCard key={u.id} unit={u} />
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
