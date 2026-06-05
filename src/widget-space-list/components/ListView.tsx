import React from 'react';
import type { Unit } from '../types';
import { groupBySize } from '../filters';
import { ListCard } from './ListCard';

export function ListView({ units }: { units: Unit[] }) {
  const groups = groupBySize(units);

  if (groups.length === 0) {
    return <div className="suf-empty-msg">No spaces match your filters.</div>;
  }

  return (
    <div className="suf-list-view">
      {groups.map(({ size, units: groupUnits }) => (
        // key includes size; remounting per group is fine and resets the
        // selected dimension when the group's contents change.
        <ListCard key={size} size={size} units={groupUnits} />
      ))}
    </div>
  );
}
