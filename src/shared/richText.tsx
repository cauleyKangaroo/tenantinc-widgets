// ===========================================================================
// Rich text from editor-authored copy (Duda content-menu handlebars) and from
// API text fields.
//
// The problem this solves: those fields arrive as strings, and rendering them as
// `{text}` in JSX means React escapes them — an editor who types `<p>Hello</p>`
// sees the tags, not a paragraph. React's only way to parse a string as markup is
// `dangerouslySetInnerHTML`, so that's what `RichText` does, with the string run
// through `sanitizeHtml` first.
//
// Plain text still works: a value with no tags is split on blank lines into
// paragraphs, which is what the About/Notes sections did before.
// ===========================================================================

import React from 'react';

/** Dropped outright — none of these belong in body copy. */
const BLOCKED = 'script,style,iframe,object,embed,link,meta,base,form,input,button';

/** Cheap detector: does this look like markup rather than prose? */
export function looksLikeHtml(value: string): boolean {
  return /<[a-z][a-z0-9]*\b[^>]*>|<br\s*\/?>|&[a-z]+;/i.test(value);
}

/**
 * Strip anything script-like from an HTML string, keeping formatting markup.
 *
 * The copy is author-controlled, so this is a guard against a careless paste
 * (and against an API field we don't own), not a hostile-input defence. It runs
 * through DOMParser — an inert document, so nothing executes and no <img onerror>
 * fires while we inspect it.
 */
export function sanitizeHtml(html: string): string {
  // No DOM (jsdom-less test run): strip tags rather than pass the string through
  // unchecked.
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]*>/g, '');

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  doc.body.querySelectorAll(BLOCKED).forEach((el) => el.remove());

  doc.body.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.replace(/\s+/g, '').toLowerCase();
      const isUrlAttr = name === 'href' || name === 'src' || name === 'xlink:href';
      // Inline handlers (onclick=…) and script-bearing URLs are the two ways
      // markup smuggles behaviour in.
      if (name.startsWith('on') || (isUrlAttr && /^(javascript|data|vbscript):/.test(value))) {
        el.removeAttribute(attr.name);
      }
    }
  });

  return doc.body.innerHTML;
}

export interface RichTextProps {
  /** The authored value — HTML or plain text. */
  value?: string;
  /** Class for the HTML container / each generated paragraph. */
  className?: string;
  /** Extra class on the HTML container only (defaults to the shared `sl-rich`). */
  htmlClassName?: string;
}

/**
 * Render authored copy: HTML is parsed (sanitised), plain text becomes
 * blank-line-separated paragraphs. Renders nothing for an empty value.
 */
export function RichText({ value, className, htmlClassName = 'sl-rich' }: RichTextProps) {
  const text = (value ?? '').trim();
  if (!text) return null;

  if (looksLikeHtml(text)) {
    return (
      <div
        className={[className, htmlClassName].filter(Boolean).join(' ')}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
      />
    );
  }

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p className={className} key={i}>{p}</p>
      ))}
    </>
  );
}
