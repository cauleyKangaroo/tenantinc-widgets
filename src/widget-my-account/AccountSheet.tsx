import { useEffect } from 'react';
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
  label: string;
  onSelect: () => void;
}

export function AccountSheet({ items, onClose }: { items: SheetItem[]; onClose: () => void }) {
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
      <div className="ma-sheet" role="menu" aria-label="Account menu">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            className="ma-sheet__item"
            onClick={() => { onClose(); item.onSelect(); }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
