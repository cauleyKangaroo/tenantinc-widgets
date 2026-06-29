import React, { useState } from 'react';
import { ReviewsSection } from './sections/ReviewsSection';
import { NearbySection } from './sections/NearbySection';
import { SizeGuideSection } from './sections/SizeGuideSection';
import { BlogSection } from './sections/BlogSection';
import { FaqsSection } from './sections/FaqsSection';
import { StoreSection } from './sections/StoreSection';
import {
  ACCORDION_SECTIONS,
  resolveVisibleOrder,
  type AccordionConfig,
  type AccordionKey,
} from '../accordionSections';

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconInfo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5" />
      <line x1="12" y1="11" x2="12" y2="16" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}

function IconReview() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      <path d="M12 8v4M10 10h4" />
    </svg>
  );
}

function IconQuestion() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function IconScale() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="3" x2="12" y2="21" />
      <path d="M5 21h14" />
      <path d="M5 6l-2 5c0 1.66 1.34 3 3 3s3-1.34 3-3L7 6z" />
      <path d="M19 6l-2 5c0 1.66 1.34 3 3 3s3-1.34 3-3l-2-5z" />
      <path d="M5 6h14" />
    </svg>
  );
}

function IconReorder() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
      <polyline points="6 3 9 6 6 9" transform="translate(-3 0)" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AccordionVisual {
  icon: React.ReactNode;
  badge?: number;
  content: React.ReactNode;
}

/** Per-key icon + content. Labels + default order live in accordionSections.ts. */
const VISUALS: Record<AccordionKey, AccordionVisual> = {
  store:     { icon: <IconInfo />,     content: <StoreSection /> },
  nearby:    { icon: <IconBuilding />, badge: 5, content: <NearbySection /> },
  reviews:   { icon: <IconReview />,   content: <ReviewsSection /> },
  faq:       { icon: <IconQuestion />, content: <FaqsSection /> },
  blog:      { icon: <IconFile />,     content: <BlogSection /> },
  sizeguide: { icon: <IconScale />,    content: <SizeGuideSection /> },
};

const LABELS: Record<AccordionKey, string> = Object.fromEntries(
  ACCORDION_SECTIONS.map((s) => [s.key, s.label]),
) as Record<AccordionKey, string>;

interface AccordionItemDef {
  key: AccordionKey;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  content: React.ReactNode;
}

export interface SectionAccordionProps {
  /** Per-instance arrangement (order + hidden). Null = default order, none hidden. */
  config?: AccordionConfig | null;
  /** Editor-only: when true, render the floating "Manage accordions" button. */
  inEditor?: boolean;
  /** Opens the manage-accordions modal (owned by SpaceList). */
  onReorderClick?: () => void;
}

// ── Single accordion row ──────────────────────────────────────────────────────

function AccordionRow({ item }: { item: AccordionItemDef }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`sl-sa-item${open ? ' open' : ''}`}>
      <button className="sl-sa-header" onClick={() => setOpen((o) => !o)}>
        <div className="sl-sa-header-left">
          <span className="sl-sa-icon">{item.icon}</span>
          <span className="sl-sa-title">{item.label}</span>
          {item.badge !== undefined && (
            <span className="sl-sa-badge">{item.badge}</span>
          )}
        </div>
        <svg className="sl-sa-chevron" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="sl-sa-body">{item.content}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SectionAccordion({
  config      = null,
  inEditor    = false,
  onReorderClick,
}: SectionAccordionProps) {
  // Every section is a candidate; the "Manage accordions" modal controls which
  // are visible (config.hidden) and their order (config.order). No config →
  // all sections shown in default order.
  const allKeys = ACCORDION_SECTIONS.map((s) => s.key);

  const items: AccordionItemDef[] = resolveVisibleOrder(allKeys, config).map((key) => ({
    key,
    label: LABELS[key],
    icon: VISUALS[key].icon,
    badge: VISUALS[key].badge,
    content: VISUALS[key].content,
  }));

  // Nothing visible and not in the editor → render nothing. In the editor we
  // still render the panel (even if every section is hidden) so the Manage
  // button stays reachable to un-hide sections.
  if (items.length === 0 && !inEditor) return null;

  return (
    <aside className="sl-sa-panel">
      {items.map((item) => <AccordionRow key={item.key} item={item} />)}
      {inEditor && (
        <button className="sl-sa-reorder-btn" onClick={onReorderClick} type="button">
          <IconReorder />
          <span>Manage accordions</span>
        </button>
      )}
    </aside>
  );
}
