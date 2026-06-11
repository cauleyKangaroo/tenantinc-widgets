import React from 'react';
import type { Unit, WidgetConfig } from '../types';
import { groupBySize } from '../filters';
import { ListCard } from './ListCard';

export function ListView({ units, config }: { units: Unit[]; config: WidgetConfig }) {
  const groups = groupBySize(units);

  if (groups.length === 0) {
    return <div className="suf-empty-msg">No spaces match your filters.</div>;
  }

  return (
    <div className="suf-list-view">
      {groups.map(({ size, units: groupUnits }) => (
        <ListCard key={size} size={size} units={groupUnits} config={config} />
      ))}
    </div>
  );
}
