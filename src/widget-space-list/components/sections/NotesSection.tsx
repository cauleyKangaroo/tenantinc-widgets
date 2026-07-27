import React from 'react';

// Notes — a free-text note card with an optional "other location" link
// (Figma 10199-55239). Demo copy; real content comes from Duda/the API later.
const NOTE_TEXT =
  'This facility offers a range of unit sizes to fit your needs, from small ' +
  'lockers to large drive-up units. Our friendly on-site team is happy to help ' +
  'you find the right space and answer any questions before your move-in date. ' +
  'Reservations are held for 7 days and there is no obligation to rent.';

export function NotesSection() {
  return (
    <section className="sl-section sl-section--notes">
      <div className="sl-notes-card">
        <p className="sl-notes-text">{NOTE_TEXT}</p>
        <div className="sl-notes-block">
          <p className="sl-notes-heading">Visit our other location here:</p>
          <a className="sl-notes-link" href="#">www.propertylandingpage.com</a>
        </div>
      </div>
    </section>
  );
}
