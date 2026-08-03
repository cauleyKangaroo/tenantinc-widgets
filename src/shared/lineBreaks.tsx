import React from 'react';

/**
 * Render editor-authored copy that may contain literal `<br>` tags.
 *
 * Duda stores a line break typed into a plain text field as the literal string
 * `<br>`, and JSX escapes strings — so `{copy}` prints the tag on the page
 * instead of breaking the line. This splits on the tag and emits real elements.
 *
 * Deliberately NOT `dangerouslySetInnerHTML`: a line break is the only markup
 * these short fields need, and splitting keeps the caller's own element and
 * styling intact (RichText wraps content in its own div/p, which would restyle a
 * one-line disclaimer). For copy that can carry genuine markup, use `RichText`.
 *
 * Handles `<br>`, `<br/>` and `<br />`, any case.
 */
export function withLineBreaks(text: string): React.ReactNode {
  const parts = text.split(/<br\s*\/?>/i);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {i > 0 && <br />}
      {part}
    </React.Fragment>
  ));
}
