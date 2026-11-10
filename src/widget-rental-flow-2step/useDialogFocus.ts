import { useEffect, useRef } from 'react';

/**
 * Focus for the flow's aria-modal lightboxes: on open, move focus to the
 * returned ref (the close button), and on close hand it back to whatever had
 * it — usually the button that opened the modal. Without this an aria-modal
 * dialog opened with focus left behind it on the page, where a screen reader
 * was told nothing outside the dialog exists.
 */
export function useDialogFocus<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    return () => {
      if (prev && prev.isConnected) prev.focus({ preventScroll: true });
    };
  }, [open]);
  return ref;
}
