import React from 'react';
import type { Unit, WidgetConfig } from '../types';
import { groupBySize } from '../filters';
import { ListCard } from './ListCard';

export function ListView({ units, config, type }: { units: Unit[]; config: WidgetConfig; type: string }) {
  if (units.length === 0) {
    return <div className="suf-empty-msg">No spaces match your filters.</div>;
  }

  const renderStorageGroups = (storageUnits: Unit[]) =>
    groupBySize(storageUnits).map(({ size, units: groupUnits }) => (
      <ListCard key={size} size={size} units={groupUnits} config={config} />
    ));

  const renderParkingFlat = (parkingUnits: Unit[]) =>
    parkingUnits.map((u) => (
      <ListCard key={u.id} size={u.size} units={[u]} config={config} />
    ));

  if (type === 'all') {
    const storageUnits = units.filter((u) => u.type === 'storage');
    const parkingUnits = units.filter((u) => u.type === 'parking');
    return (
      <div className="suf-list-view">
        {renderStorageGroups(storageUnits)}
        {renderParkingFlat(parkingUnits)}
      </div>
    );
  }

  if (type === 'parking') {
    return (
      <div className="suf-list-view">
        {renderParkingFlat(units)}
      </div>
    );
  }

  return (
    <div className="suf-list-view">
      {renderStorageGroups(units)}
    </div>
  );
}
