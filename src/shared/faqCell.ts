// ===========================================================================
// A property's FAQ list, whatever shape the source handed it over in.
//
// Hummingbird's REST `Faq` is an array of LOCALIZED maps —
// `[{question: {en, es}, answer: {en, es}}]` — and the extractors were written
// against exactly that. But the `PropertiesInternal` collection's `faq` cell is
// authored as text, and on a real site (91076993, cell inspected 2026-11-04) it
// holds PLAIN STRINGS — `[{"question": "…", "answer": "…"}]` — with literal
// line breaks inside the answer values. That one cell defeats the extractors
// twice over, both times silently:
//
//   1. `f.question?.en` on a string is undefined, so every row is filtered
//      out and the widget falls back to its generic demo set;
//   2. an unescaped newline inside a JSON string is invalid JSON, so the cell
//      never parses at all, `Faq` stays a string, and `Array.isArray` fails —
//      same fallback, different route.
//
// This module accepts every shape seen in the wild: the localized array, the
// plain-string array, and the still-unparsed text of either. Both #10 and
// #05's FAQ section read through it, so the two can never disagree about what
// a cell means.
// ===========================================================================

/** The REST shape: per-language texts. Only `en` is rendered today. */
interface LocalizedText { en?: string; es?: string; }

/** One entry as either source provides it. */
export interface RawFaq {
  question?: LocalizedText | string;
  answer?: LocalizedText | string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/** Localized map or plain string → the English text, trimmed. */
function text(v: LocalizedText | string | undefined): string {
  if (typeof v === 'string') return v.trim();
  return (v?.en ?? '').trim();
}

/**
 * The value of a `Faq` field → clean `{question, answer}` pairs.
 *
 * Entries missing either half are dropped — half a FAQ reads as a mistake on
 * the page. An unusable value (not an array, unparseable text) is `[]`, which
 * callers already treat as "this property has none".
 */
export function parseFaqList(value: unknown): FaqEntry[] {
  return coerceRows(value)
    .map((f) => ({ question: text(f?.question), answer: text(f?.answer) }))
    .filter((f) => f.question && f.answer);
}

/**
 * The raw field → an array of entries, parsing text if that is what arrived.
 *
 * Three parse attempts, mildest first:
 *  1. as-is — a well-formed cell;
 *  2. line breaks escaped to `\n` — the live cells carry literal breaks INSIDE
 *     the string values, which JSON forbids; escaping keeps the paragraph
 *     breaks, which the FAQ renderers turn back into line breaks;
 *  3. line breaks flattened to spaces — covers a break that fell BETWEEN
 *     tokens, where attempt 2 would have manufactured an invalid `\n` outside
 *     any string. Paragraphs are lost, the FAQs are not.
 */
function coerceRows(value: unknown): RawFaq[] {
  if (Array.isArray(value)) return value as RawFaq[];
  if (typeof value !== 'string') return [];
  const s = value.trim();
  // Anything not shaped like a JSON array can't be an FAQ list — a display
  // string or "[object Object]" must not reach JSON.parse just to throw.
  if (!s.startsWith('[')) return [];
  const candidates = [
    s,
    s.replace(/\r\n|\r|\n/g, '\\n').replace(/\t/g, '\\t'),
    s.replace(/[\r\n\t]+/g, ' '),
  ];
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed as RawFaq[];
    } catch { /* not this shape — try the next */ }
  }
  return [];
}
