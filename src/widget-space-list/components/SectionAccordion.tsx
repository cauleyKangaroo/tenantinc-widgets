import React, { useState } from 'react';
import { SECTIONS } from '../sections';

/**
 * Additional Panel "all" mode — every section as an independently collapsible
 * accordion item. Reuses the .suf-accordion styling from the grid view. Dummy
 * body content for now; real content plugs in via sections.ts (see HANDOFF.md).
 */
export function SectionAccordion() {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="suf-section-accordion">
      {SECTIONS.map((s) => {
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
