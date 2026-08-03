import React, { useState } from 'react';
import type { Unit, SpaceType, WidgetConfig } from '../types';
import { groupBySizeSorted, sortUnits, orderTypes } from '../filters';
import { ListCard } from './ListCard';

const TYPE_LABEL: Partial<Record<SpaceType, string>> = {
  parking: 'Parking',
};

const ChevronDown = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

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
          {sortUnits(units, config.sortBy).map((u) => (
            <ListCard key={u.id} size={u.size} units={[u]} config={config} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function ListView({ units, config }: { units: Unit[]; config: WidgetConfig }) {
  if (units.length === 0) {
    return <div className="sl-empty-msg">No spaces match your filters.</div>;
  }

  const orderedTypes = orderTypes(
    Array.from(new Set(units.map((u) => u.type))) as SpaceType[],
    config.categoryOrdering,
  );

  return (
    <div className="sl-list-view">
      {orderedTypes.map((spaceType) => {
        const typeUnits = units.filter((u) => u.type === spaceType);
        if (spaceType === 'storage') {
          return groupBySizeSorted(typeUnits, config.sortBy).map(({ size, units: groupUnits }) => (
            <ListCard key={size} size={size} units={groupUnits} config={config} />
          ));
        }
        return <TypeAccordion key={spaceType} spaceType={spaceType} units={typeUnits} config={config} />;
      })}
    </div>
  );
}
