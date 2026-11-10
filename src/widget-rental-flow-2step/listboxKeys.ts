import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

// ---------------------------------------------------------------------------
// Keyboard support for the flow's custom role="listbox" menus (Protection
// plan, Key-share plan, additionalInfo's Select). Each is laid out the same
// way: a trigger button with aria-haspopup="listbox" and, while open, a
// SIBLING .rf2-plan-menu holding <button role="option">s. The options are
// already tabbable buttons; this adds what a listbox is expected to do as
// well — arrows/Home/End move between options, Escape and a pick hand focus
// back to the trigger instead of dropping it on <body> when the menu unmounts.
// Found through the DOM rather than refs so the three call sites need no
// extra plumbing.
// ---------------------------------------------------------------------------

const triggerOf = (el: Element | null) =>
  el?.closest('[role="listbox"]')?.parentElement
    ?.querySelector<HTMLElement>(':scope > [aria-haspopup="listbox"]') ?? null;

const optionsIn = (list: Element | null | undefined) =>
  list ? Array.from(list.querySelectorAll<HTMLElement>('[role="option"]')) : [];

/** Focus the selected option (or the first) in the trigger's sibling menu. */
function focusSelected(trigger: HTMLElement) {
  const list = trigger.parentElement?.querySelector(':scope > [role="listbox"]');
  const opts = optionsIn(list);
  (opts.find((o) => o.getAttribute('aria-selected') === 'true') ?? opts[0])?.focus();
}

/** onKeyDown for the trigger: ArrowDown/ArrowUp opens and moves into the list. */
export function listboxTriggerKeyDown(
  e: ReactKeyboardEvent<HTMLElement>, open: boolean, setOpen: (o: boolean) => void,
) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const trigger = e.currentTarget;
  if (!open) setOpen(true);
  // After the render that mounts the menu.
  window.setTimeout(() => focusSelected(trigger), 0);
}

/** onKeyDown for the role="listbox" element. */
export function listboxKeyDown(e: ReactKeyboardEvent<HTMLElement>) {
  const opts = optionsIn(e.currentTarget);
  const i = opts.indexOf(document.activeElement as HTMLElement);
  let next: HTMLElement | undefined;
  switch (e.key) {
    case 'ArrowDown': next = opts[Math.min(i + 1, opts.length - 1)]; break;
    case 'ArrowUp': next = opts[Math.max(i - 1, 0)]; break;
    case 'Home': next = opts[0]; break;
    case 'End': next = opts[opts.length - 1]; break;
    // The document-level Escape handlers close the menu; this only rescues focus.
    case 'Escape': triggerOf(e.currentTarget)?.focus(); return;
    default: return;
  }
  e.preventDefault();
  next?.focus();
}

/** Call from an option's click, before it closes the menu, to keep focus. */
export function focusListboxTrigger(option: Element) {
  triggerOf(option)?.focus();
}
