import React from 'react';

// Notes — a free-text note card with an optional "other location" link
// (Figma 10199-55239). Demo copy; real content comes from Duda/the API later.
const NOTE_TEXT =
  'This facility offers a range of unit sizes to fit your needs, from small ' +
  'lockers to large drive-up units. Our friendly on-site team is happy to help ' +
  'you find the right space and answer any questions before your move-in date. ' +
  'Reservations are held for 7 days and there is no obligation to rent.';

/** `content` comes from the Duda content menu; blank falls back to the demo copy. */
export function NotesSection({ content }: { content?: string } = {}) {
  const text = (content ?? '').trim() || NOTE_TEXT;
  // Blank-line separated paragraphs, so an editor can add structure from a
  // plain textarea without needing HTML.
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <section className="sl-section sl-section--notes">
      <div className="sl-notes-card">
        {paragraphs.map((p, i) => (
          <p className="sl-notes-text" key={i}>{p}</p>
        ))}
        <div className="sl-notes-block">
          <p className="sl-notes-heading">Visit our other location here:</p>
          <a className="sl-notes-link" href="#">www.propertylandingpage.com</a>
        </div>
      </div>
    </section>
  );
}
