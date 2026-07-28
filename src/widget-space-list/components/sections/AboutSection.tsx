import React from 'react';

// About — free-text copy about the location, editable from the Duda content
// menu (`aboutContent`). Reuses the Notes card treatment so the two read as a
// pair. Renders nothing when there's no copy, so an unconfigured instance shows
// an empty body rather than placeholder text pretending to be real.

export function AboutSection({ content }: { content?: string }) {
  const text = (content ?? '').trim();
  if (!text) return null;

  // Blank-line separated paragraphs, so an editor can add structure from a
  // plain textarea without needing HTML.
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <section className="sl-section sl-section--about">
      <div className="sl-notes-card">
        {paragraphs.map((p, i) => (
          <p className="sl-notes-text" key={i}>{p}</p>
        ))}
      </div>
    </section>
  );
}
