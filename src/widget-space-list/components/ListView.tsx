import React from 'react';
import type { Unit, WidgetConfig } from '../types';
import { groupBySize } from '../filters';
import { ListCard } from './ListCard';

export function ListView({ units, config, type }: { units: Unit[]; config: WidgetConfig; type: string }) {
  if (units.length === 0) {
    return <div className="suf-empty-msg">No spaces match your filters.</div>;
  }

  if (type === 'parking') {
    return (
      <div className="suf-list-view">
        {units.map((u) => (
          <ListCard key={u.id} size={u.size} units={[u]} config={config} />
        ))}
      </div>
    );
  }

  const groups = groupBySize(units);

  return (
    <div className="suf-list-view">
      {groups.map(({ size, units: groupUnits }) => (
        <ListCard key={size} size={size} units={groupUnits} config={config} />
      ))}
    </div>
  );
}
