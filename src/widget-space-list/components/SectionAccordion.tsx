import React, { useState } from 'react';
import { ReviewsSection } from './sections/ReviewsSection';
import { NearbySection } from './sections/NearbySection';
import { SizeGuideSection } from './sections/SizeGuideSection';
import { BlogSection } from './sections/BlogSection';
import { FaqsSection } from './sections/FaqsSection';
import { StoreSection } from './sections/StoreSection';
import { NotesSection } from './sections/NotesSection';
import { FeaturesSection } from './sections/FeaturesSection';
import {
  ACCORDION_SECTIONS,
  resolveVisibleOrder,
  type AccordionConfig,
  type AccordionKey,
} from '../accordionSections';

// ── Icons ──────────────────────────────────────────────────────────────────────
// Real icons from Figma (Mariposa accordion set, node 9417-86779). Stroke-style,
// drawn with currentColor so they inherit the .sl-sa-icon / .sl-sa-chevron colour.

function IconInfo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 11.9999V15.9999M12 8.6249V8.62378M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 6H16M14 10H16M14 14H16M8 6H10M8 10H10M8 14H10M16 22V19.6C16 19.0399 16 18.7599 15.891 18.546C15.7951 18.3578 15.6422 18.2049 15.454 18.109C15.2401 18 14.9601 18 14.4 18H9.6C9.03995 18 8.75992 18 8.54601 18.109C8.35785 18.2049 8.20487 18.3578 8.10899 18.546C8 18.7599 8 19.0399 8 19.6V22M16 22H17.4C17.9601 22 18.2401 22 18.454 21.891C18.6422 21.7951 18.7951 21.6422 18.891 21.454C19 21.2401 19 20.9601 19 20.4V5.2C19 4.0799 19 3.51984 18.782 3.09202C18.5903 2.71569 18.2843 2.40973 17.908 2.21799C17.4802 2 16.9201 2 15.8 2H8.2C7.0799 2 6.51984 2 6.09202 2.21799C5.71569 2.40973 5.40973 2.71569 5.21799 3.09202C5 3.51984 5 4.0799 5 5.2V20.4C5 20.9601 5 21.2401 5.10899 21.454C5.20487 21.6422 5.35785 21.7951 5.54601 21.891C5.75992 22 6.03995 22 6.6 22H8M16 22H8" />
    </svg>
  );
}

function IconReview() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V12.2C3 13.8802 3 14.7202 3.32698 15.362C3.6146 15.9265 4.07354 16.3854 4.63803 16.673C5.27976 17 6.11984 17 7.8 17H8V21L13 17H16.2C17.8802 17 18.7202 17 19.362 16.673C19.9265 16.3854 20.3854 15.9265 20.673 15.362C21 14.7202 21 13.8802 21 12.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3Z" />
      <path d="M9.0258 12.2118C9.03341 11.9795 9.03721 11.8633 9.06595 11.7542C9.09143 11.6575 9.13129 11.5651 9.18418 11.4804C9.24382 11.3847 9.32568 11.3025 9.48939 11.1381L13.4359 7.17476C13.6331 6.97678 13.9407 6.9431 14.1757 7.09378C14.4595 7.27574 14.7015 7.51618 14.8858 7.79917L14.8987 7.81897C15.0597 8.06623 15.026 8.39297 14.818 8.60187L10.9081 12.5284C10.7382 12.699 10.6533 12.7843 10.5542 12.8455C10.4664 12.8998 10.3707 12.94 10.2705 12.9647C10.1575 12.9924 10.0374 12.9932 9.79717 12.9948L9 13L9.0258 12.2118Z" strokeWidth="1" />
    </svg>
  );
}

function IconQuestion() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.28149 9.71853C9.28149 8.21713 10.4986 7 12 7C13.5014 7 14.7186 8.21713 14.7186 9.71853C14.7186 10.6748 14.2248 11.5157 13.4784 12.0003C12.7544 12.4704 12 13.1368 12 14M12 17H12.001M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11C20 9.34315 18.6569 8 17 8L16.4 8C16.0284 8 15.8426 8 15.6871 7.97538C14.8313 7.83983 14.1602 7.16865 14.0246 6.31287C14 6.1574 14 5.9716 14 5.6V5C14 3.34315 12.6569 2 11 2M8 13H16M8 17H13M20 10V18C20 20.2091 18.2091 22 16 22H8C5.79086 22 4 20.2091 4 18V6C4 3.79086 5.79086 2 8 2H12C16.4183 2 20 5.58172 20 10Z" />
    </svg>
  );
}

function IconScale() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.22213 12.707L7.75767 16.2425M9.87948 7.05L13.415 10.5855M12.7077 4.22163L14.829 6.34295M7.05033 9.87861L9.17165 11.9999M3.65648 17.7981L6.20207 20.3437C6.9941 21.1357 7.39012 21.5318 7.84678 21.6801C8.24846 21.8107 8.68116 21.8107 9.08284 21.6801C9.5395 21.5318 9.93552 21.1357 10.7276 20.3437L20.3442 10.7271C21.1362 9.93503 21.5323 9.53901 21.6806 9.08236C21.8111 8.68067 21.8111 8.24797 21.6806 7.84629C21.5323 7.38963 21.1362 6.99361 20.3442 6.20158L17.7986 3.65599C17.0066 2.86396 16.6106 2.46794 16.1539 2.31957C15.7522 2.18905 15.3195 2.18905 14.9178 2.31957C14.4612 2.46794 14.0652 2.86396 13.2731 3.65599L3.65648 13.2726C2.86445 14.0647 2.46843 14.4607 2.32005 14.9174C2.18954 15.319 2.18954 15.7517 2.32005 16.1534C2.46843 16.6101 2.86445 17.0061 3.65648 17.7981Z" />
    </svg>
  );
}

function IconFeatures() {
  // Pika list-check — "Features and Amenities".
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 6H21M11 12H21M11 18H21M3 6L4 7L6 5M3 12L4 13L6 11M3 18L4 19L6 17" />
    </svg>
  );
}

function IconNote() {
  // Pika note/edit — "Notes".
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H7.8C6.11984 4 5.27976 4 4.63803 4.32698C4.07354 4.6146 3.6146 5.07354 3.32698 5.63803C3 6.27976 3 7.11984 3 8.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21H15.2C16.8802 21 17.7202 21 18.362 20.673C18.9265 20.3854 19.3854 19.9265 19.673 19.362C20 18.7202 20 17.8802 20 16.2V13M15.5 5.5L18.3284 8.32843M10.7627 10.2373L17.634 3.36599C18.4149 2.58503 19.6812 2.58503 20.4623 3.36599C21.2433 4.14705 21.2433 5.41338 20.4623 6.19434L13.591 13.0657C13.2001 13.4566 12.7627 13.7809 12.2925 14.03L9.5 15.5L10.97 12.7075C11.2191 12.2373 11.5434 11.7999 11.9343 11.409L10.7627 10.2373Z" />
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
  features:  { icon: <IconFeatures />, content: <FeaturesSection /> },
  nearby:    { icon: <IconBuilding />, badge: 5, content: <NearbySection /> },
  reviews:   { icon: <IconReview />,   content: <ReviewsSection /> },
  faq:       { icon: <IconQuestion />, content: <FaqsSection /> },
  blog:      { icon: <IconFile />,     content: <BlogSection /> },
  sizeguide: { icon: <IconScale />,    content: <SizeGuideSection /> },
  notes:     { icon: <IconNote />,     content: <NotesSection /> },
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
  /** Show video thumbnails inside the Size Guide section. Default true. */
  showSizeGuideVideos?: boolean;
}

// ── Single accordion row ──────────────────────────────────────────────────────

function AccordionRow({ item, open, onToggle }: { item: AccordionItemDef; open: boolean; onToggle: () => void }) {
  return (
    <div className={`sl-sa-item${open ? ' open' : ''}`}>
      <button className="sl-sa-header" onClick={onToggle}>
        <div className="sl-sa-header-left">
          <span className="sl-sa-icon">{item.icon}</span>
          <span className="sl-sa-title">{item.label}</span>
          {item.badge !== undefined && (
            <span className="sl-sa-badge">{item.badge}</span>
          )}
        </div>
        <svg className="sl-sa-chevron" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9C7.57701 11.1808 9.42293 13.1364 11.4899 14.8172C11.7897 15.0609 12.2103 15.0609 12.5101 14.8172C14.5771 13.1364 16.423 11.1808 18 9" />
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
  showSizeGuideVideos = true,
}: SectionAccordionProps) {
  // Only one section open at a time — opening one closes the currently-open one.
  const [openKey, setOpenKey] = useState<AccordionKey | null>(null);

  // Every section is a candidate; the "Manage accordions" modal controls which
  // are visible (config.hidden) and their order (config.order). No config →
  // all sections shown in default order.
  const allKeys = ACCORDION_SECTIONS.map((s) => s.key);

  const items: AccordionItemDef[] = resolveVisibleOrder(allKeys, config).map((key) => ({
    key,
    label: LABELS[key],
    icon: VISUALS[key].icon,
    badge: VISUALS[key].badge,
    // Size Guide takes the video-visibility flag; others use their static content.
    content: key === 'sizeguide'
      ? <SizeGuideSection showVideos={showSizeGuideVideos} />
      : VISUALS[key].content,
  }));

  // Nothing visible and not in the editor → render nothing. In the editor we
  // still render the panel (even if every section is hidden) so the Manage
  // button stays reachable to un-hide sections.
  if (items.length === 0 && !inEditor) return null;

  return (
    <aside className="sl-sa-panel">
      {items.map((item) => (
        <AccordionRow
          key={item.key}
          item={item}
          open={openKey === item.key}
          onToggle={() => setOpenKey((prev) => (prev === item.key ? null : item.key))}
        />
      ))}
      {inEditor && (
        <button className="sl-sa-reorder-btn" onClick={onReorderClick} type="button">
          <IconReorder />
          <span>Manage accordions</span>
        </button>
      )}
    </aside>
  );
}
