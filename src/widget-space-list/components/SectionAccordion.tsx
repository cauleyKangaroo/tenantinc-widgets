import React, { useState } from 'react';
import { orderSections } from '../sections';

/**
 * Additional Panel "all" mode — every section as an independently collapsible
 * accordion item, in the editor-defined order (panelOrder). Reuses the
 * .suf-accordion styling from the grid view. Dummy body content for now; real
 * content plugs in via sections.ts (see HANDOFF.md).
 */
export function SectionAccordion({ order }: { order?: string[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const sections = orderSections(order);

  return (
    <div className="suf-section-accordion">
      {sections.map((s) => {
        const isOpen = !!open[s.key];
        return (
          <div className="suf-accordion" key={s.key} data-section={s.key}>
            <div
              className="suf-accordion-header"
              onClick={() => setOpen((o) => ({ ...o, [s.key]: !o[s.key] }))}
            >
              <span className="suf-accordion-title">{s.title}</span>
              <span className="suf-chevron">{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div className="suf-accordion-body">
                <div className="suf-section-body">{s.title} content goes here.</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
