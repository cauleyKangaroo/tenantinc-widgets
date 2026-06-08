import React from 'react';
import { getSection } from '../sections';

/**
 * Dummy content section — a titled container with placeholder body text.
 * No real design or content yet; real per-section content plugs in via
 * sections.ts later. Renders nothing for 'none' / unknown section keys.
 */
export function SectionPanel({ section }: { section?: string }) {
  const found = getSection(section);
  if (!found) return null;

  return (
    <div className="suf-section" data-section={found.key}>
      <div className="suf-section-title">{found.title}</div>
      <div className="suf-section-body">{found.title} content goes here.</div>
    </div>
  );
}
