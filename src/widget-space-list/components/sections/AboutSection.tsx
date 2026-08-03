import React from 'react';
import { RichText } from '@shared/richText';

// About — free-text copy about the location, editable from the Duda content
// menu (`aboutContent`). Reuses the Notes card treatment so the two read as a
// pair. Renders nothing when there's no copy, so an unconfigured instance shows
// an empty body rather than placeholder text pretending to be real.

export function AboutSection({ content }: { content?: string }) {
  const text = (content ?? '').trim();
  if (!text) return null;

  return (
    <section className="sl-section sl-section--about">
      <div className="sl-notes-card">
        {/* HTML is parsed; plain text still becomes blank-line paragraphs. */}
        <RichText value={text} className="sl-notes-text" />
      </div>
    </section>
  );
}
