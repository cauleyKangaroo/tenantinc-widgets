import React from 'react';
import { Checkbox } from '@shared/ui';
import { CheckTickSolid } from './icons';

/**
 * The rental flow's checkbox (Figma 8507-23354 / 8507-25446).
 *
 * The shared kit Checkbox is built for the form kit: 8px radius, an #a5b4bf
 * resting border, a GREEN (--hb-cta) fill when on, and the curved Pika check as
 * its tick. This flow's design wants a near-square box with a lighter outline
 * that fills NEAR-BLACK, marked with a solid geometric tick.
 *
 * Two of those cannot be done from CSS — the tick is a different SHAPE, not a
 * different weight — so this wrapper exists to carry both the `rf-check` class
 * and the tick node. Every checkbox in the widget goes through it, which is
 * what stops one screen drifting from another; the shared component keeps its
 * kit appearance for every other widget.
 *
 * ONE SIZE: the 18px box from Additional Information (8507-23354), used for
 * every checkbox in the flow. There is deliberately no size variant — the kit's
 * 24px default is what made the business rows and agree bars look heavier than
 * the toggles, and a flow whose boxes differ screen to screen reads as an
 * accident rather than a choice. The tick is 13px, the frame's ~74.5% of box.
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
    <Checkbox
      checked={checked}
      onChange={onChange}
      className={['rf-check', className ?? ''].filter(Boolean).join(' ')}
      tick={<CheckTickSolid size={13} className="hb-check__tick" />}
    >
      {children}
    </Checkbox>
  );
}
