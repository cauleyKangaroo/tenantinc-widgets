import React from 'react';
import { RichText } from '@shared/richText';

// Notes — the property's `notes` cell on the PropertiesInternal collection
// (SpaceList reads it; the content-menu `notesContent` is the fallback).
//
// Was a grey card that also carried a hardcoded "Visit our other
// location here: www.propertylandingpage.com" block — demo placeholder with a fake
// URL and href="#". Both removed. The demo copy that then stood in for an
// unconfigured instance is gone too (2026-10-15): the section is only
// offered while there is content, so blank renders nothing rather than
// invented notes.
export function NotesSection({ content }: { content?: string } = {}) {
  const text = (content ?? '').trim();
  if (!text) return null;

  return (
    <section className="sl-section sl-section--notes">
      {/* HTML is parsed; plain text still becomes blank-line paragraphs. */}
      <RichText value={text} className="sl-notes-text" />
    </section>
  );
}
