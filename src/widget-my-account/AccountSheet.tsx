import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// ===========================================================================
// The phone account menu — a bottom sheet over a dimmed page, opened from the
// icon beside the greeting (≤720px only). Every row reuses an action the page
// already has: Pay Bill = the panel's "Pay Now", Account Info = the unit card's
// "Account Info", Logout = signOut. Picking a row closes the sheet first.
//
// Portalled to <body>: a Duda section can carry a transform, and position:fixed
// inside a transformed ancestor is fixed to that ancestor, not the viewport.
// ===========================================================================

export interface SheetItem {
  /** Also the row's key, so it must be unique — one row per space. */
  label: string;
  /** The glyph before the label. */
  icon?: ReactNode;
  onSelect: () => void;
}

export function AccountSheet({ items, onClose }: { items: SheetItem[]; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // A modal sheet: focus goes in on open and back to the trigger on close.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    sheetRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => { prev?.focus?.(); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // The page behind must not scroll while the sheet is up.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="ma-sheet-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* A dialog of plain buttons, not role="menu": a menu promises arrow-key
          roving focus, and these rows are reached with Tab. */}
      <div className="ma-sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-label="Account menu">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className="ma-sheet__item"
            onClick={() => { onClose(); item.onSelect(); }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
