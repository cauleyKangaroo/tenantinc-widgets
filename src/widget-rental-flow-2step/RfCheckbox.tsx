import React from 'react';
import { Checkbox } from '@shared/ui';

/**
 * Thin pass-through to the shared Checkbox.
 *
 * It used to carry this flow's skin — an 18px near-square box, a lighter
 * outline, a near-black fill and a solid tick — as a `rf-check` class plus an
 * injected `tick` node. All of that is now the KIT's default, so there is
 * nothing left to add: every widget gets the same checkbox, which was the
 * point of moving it.
 *
 * Kept rather than deleted so the ~dozen call sites in this flow keep reading
 * as they do, and so there is one place to reintroduce a flow-specific tweak
 * if one is ever genuinely needed.
 */
export function RfCheckbox({
  checked, onChange, className, children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Extra classes for the ROW — layout, not the box's skin. */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Checkbox checked={checked} onChange={onChange} className={className}>
      {children}
    </Checkbox>
  );
}
