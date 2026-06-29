import React, { useEffect, useMemo, useState } from 'react';
import {
  ACCORDION_SECTIONS,
  type AccordionConfig,
  type AccordionKey,
  type AccordionSectionMeta,
} from '../accordionSections';

interface ReorderModalProps {
  /** The enabled candidate sections (isX = true), in default order. */
  sections: AccordionSectionMeta[];
  /** Currently-saved arrangement for this instance (null = defaults). */
  config: AccordionConfig | null;
  onClose: () => void;
  onSave: (config: AccordionConfig) => void;
  /** True while the save request is in flight. */
  saving?: boolean;
  /** Set when the last save failed, shown inline. */
  error?: string | null;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronUp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 15 12 9 18 15" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const DEFAULT_INDEX = new Map<AccordionKey, number>(
  ACCORDION_SECTIONS.map((s, i) => [s.key, i]),
);

/**
 * Initial ordered list: every enabled section, ordered by the saved config
 * first, with any remaining enabled sections appended in default order.
 */
function initialOrder(sections: AccordionSectionMeta[], config: AccordionConfig | null): AccordionKey[] {
  const enabled = new Set(sections.map((s) => s.key));
  const seen = new Set<AccordionKey>();
  const ordered: AccordionKey[] = [];
  for (const key of config?.order ?? []) {
    if (enabled.has(key) && !seen.has(key)) { ordered.push(key); seen.add(key); }
  }
  const rest = sections.map((s) => s.key).filter((k) => !seen.has(k));
  rest.sort((a, b) => (DEFAULT_INDEX.get(a)! - DEFAULT_INDEX.get(b)!));
  return [...ordered, ...rest];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReorderModal({ sections, config, onClose, onSave, saving = false, error = null }: ReorderModalProps) {
  const labelOf = useMemo(
    () => new Map(sections.map((s) => [s.key, s.label])),
    [sections],
  );

  const [order, setOrder] = useState<AccordionKey[]>(() => initialOrder(sections, config));

  // Close on Escape; lock host-page scroll while open (matches FilterModal).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Move the item at `from` to index `to` (no-op if out of range).
  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    setOrder((cur) => {
      const next = [...cur];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function handleSave() {
    // Visibility was removed — every enabled section is shown; only order is saved.
    onSave({ order, hidden: [] });
  }

  return (
    <div className="sl-modal-overlay" onClick={onClose}>
      <div
        className="sl-reorder-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Reorder sidebar sections"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sl-modal-header">
          <div className="sl-reorder-title-row">
            <span className="sl-reorder-title">Reorder sections</span>
            <span className="sl-reorder-subtitle">Use the arrows — top appears first</span>
          </div>
          <button className="sl-modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="sl-filter-separator" />

        <ul className="sl-reorder-list">
          {order.map((key, i) => (
            <li key={key} className="sl-reorder-row">
              <span className="sl-reorder-pos">{i + 1}</span>
              <span className="sl-reorder-label">{labelOf.get(key)}</span>
              <div className="sl-reorder-arrows">
                <button
                  className="sl-reorder-arrow"
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  aria-label={`Move ${labelOf.get(key)} up`}
                >
                  <ChevronUp />
                </button>
                <button
                  className="sl-reorder-arrow"
                  type="button"
                  disabled={i === order.length - 1}
                  onClick={() => move(i, i + 1)}
                  aria-label={`Move ${labelOf.get(key)} down`}
                >
                  <ChevronDown />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {error && <div className="sl-reorder-error">{error}</div>}

        <div className="sl-reorder-footer">
          <span className="sl-reorder-count">{order.length} sections</span>
          <div className="sl-reorder-actions">
            <button className="sl-reorder-cancel" onClick={onClose} type="button" disabled={saving}>
              Cancel
            </button>
            <button className="sl-reorder-save" onClick={handleSave} type="button" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
