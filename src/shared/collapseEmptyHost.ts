// ===========================================================================
// Collapse the host page's wrappers around a widget that has nothing to show.
//
// A widget that renders nothing still leaves its Duda SECTION behind: the
// section's padding, the row and column spacing, a background. That is the
// band of whitespace a page shows where, say, a property with no FAQs used to
// have its FAQ section. The widget cannot style what it does not own, so this
// hides those wrappers instead.
//
// WHICH wrappers, without knowing Duda's markup: climb from the widget through
// every ancestor that holds nothing else a visitor could see — no text, no
// media, no controls — and hide the outermost of them. The climb stops at the
// first ancestor with anything else in it, so a section shared with another
// widget, or with a heading typed into Duda, is never hidden; only the part
// that is this widget's alone is. Duda's own page wrappers always contain the
// rest of the page, so the climb can never reach them.
//
// Returns an undo, so the section comes back the moment the widget has
// content again (a dynamic page switching property, the editor re-running it).
// ===========================================================================

/** Anything a visitor could see or use, other than text. */
const VISIBLE = 'img, picture, video, iframe, svg, canvas, object, embed, input, select, textarea, button';

/** True when `el` shows nothing outside `own` (the widget's own subtree). */
function holdsOnly(el: HTMLElement, own: HTMLElement): boolean {
  // innerText, not textContent: Duda widgets carry <script>/<style> in their
  // markup, and their source text is not something a visitor sees.
  if ((el.innerText ?? '').trim()) return false;
  for (const node of Array.from(el.querySelectorAll(VISIBLE))) {
    if (!own.contains(node)) return false;
  }
  return true;
}

/**
 * Hide the outermost ancestor of `own` that holds nothing else visible.
 * `own` should be the widget's mount node, already empty. Returns the undo.
 */
export function collapseEmptyHost(own: HTMLElement): () => void {
  let target: HTMLElement | null = null;
  let el: HTMLElement = own;
  while (el.parentElement && el.parentElement !== document.body && el.parentElement !== document.documentElement) {
    const parent = el.parentElement;
    if (!holdsOnly(parent, own)) break;
    target = parent;
    el = parent;
  }
  if (!target) return () => {};
  const hidden = target;
  const prevValue = hidden.style.getPropertyValue('display');
  const prevPriority = hidden.style.getPropertyPriority('display');
  // !important: Duda sets display on its rows and sections from stylesheets
  // whose specificity this inline style must not lose to.
  hidden.style.setProperty('display', 'none', 'important');
  return () => {
    if (prevValue) hidden.style.setProperty('display', prevValue, prevPriority);
    else hidden.style.removeProperty('display');
  };
}
