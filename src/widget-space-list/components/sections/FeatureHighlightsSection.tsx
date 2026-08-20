import React from 'react';
import { CarouselChevron } from '../chevron';
import type { FeatureHighlight } from '../../featureHighlights';

// Feature Highlights (Figma 10550-32752) — a plain list of feature links inside
// the sidebar accordion: 16px semibold label, right chevron, hairline dividers
// between rows. Clicking one puts `?feature=<slug>` on the URL and the whole
// widget becomes that feature's landing page. A row is a TRIGGER, never a
// toggle: clicking the active row re-selects the same feature instead of
// clearing it, so a second click can't silently unfilter the page. The way back
// to the full listing is the explicit "Show all spaces" button.

interface FeatureHighlightsSectionProps {
  features: FeatureHighlight[];
  /** Slug of the feature the page is currently locked to, if any. */
  activeSlug?: string | null;
  onSelect: (slug: string | null) => void;
}

export function FeatureHighlightsSection({
  features,
  activeSlug,
  onSelect,
}: FeatureHighlightsSectionProps) {
  if (features.length === 0) return null;

  return (
    <section className="sl-section sl-section--highlights">
      <ul className="sl-fh-list">
        {features.map((f) => {
          const active = f.slug === activeSlug;
          return (
            <li className="sl-fh-item" key={f.slug}>
              <button
                type="button"
                className={`sl-fh-row${active ? ' active' : ''}`}
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(f.slug)}
              >
                <span className="sl-fh-label">{f.name}</span>
                <span className="sl-fh-chevron" aria-hidden="true">
                  <CarouselChevron dir="right" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
