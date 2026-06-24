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
    return <div className="sl-empty-msg">No spaces match your filters.</div>;
  }

  const toggle = (size: UnitSize) => setOpen((o) => ({ ...o, [size]: !o[size] }));

  const renderStorageAccordions = (storageUnits: Unit[]) =>
    groupBySize(storageUnits).map(({ size, units: groupUnits }) => {
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
    });

  const renderParkingFlat = (parkingUnits: Unit[]) => (
    <div className="sl-cards-grid">
      {parkingUnits.map((u) => (
        <UnitCard key={u.id} unit={u} config={config} />
      ))}
    </div>
  );

  if (type === 'all') {
    const storageUnits = units.filter((u) => u.type === 'storage');
    const parkingUnits = units.filter((u) => u.type === 'parking');
    return (
      <div className="sl-grid-view">
        {renderStorageAccordions(storageUnits)}
        {parkingUnits.length > 0 && renderParkingFlat(parkingUnits)}
      </div>
    );
  }

  if (type === 'parking') {
    return (
      <div className="sl-grid-view">
        {renderParkingFlat(units)}
      </div>
    );
  }

  return (
    <div className="sl-grid-view">
      {renderStorageAccordions(units)}
    </div>
  );
}
