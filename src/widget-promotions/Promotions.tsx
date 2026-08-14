import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMediaQuery } from '@shared/stickyStack';
import { useSwipe } from '@shared/useSwipe';
import './Promotions.css';
import { fetchSpaceGroups, extractPromos, type ApiPromo } from './api';
import cfg from './config.json';
import { fetchWebsiteSpaceGroupId } from '@shared/spaceGroups';
import { resolvePropertyId } from '@shared/propertyBinding';
import { resolveCompanyIdFromSources } from '@shared/companySource';
import { emitShowPromo, scrollToSpaceList } from '@shared/promoBus';
import { DisclaimerModal } from './DisclaimerModal';
import { TagIcon, InfoIcon, ChevronRight } from './icons';
import promoBanner from './assets/promo-banner.png';
import promoBannerMobile from './assets/promo-banner-mobile.png';

// ---------------------------------------------------------------------------
// Promotion bars
//
// One promotion fills the width. Two, three or four split it evenly (a half, a
// third, a quarter each). Beyond four the bars stay a quarter wide and page in
// groups of four behind arrows + dots — there is no auto-advance; the viewer
// drives it.
// ---------------------------------------------------------------------------

interface BarItem { id: string; title: string; info?: string; url: string; ctaLabel: string; }

/** Max bars shown at once; also the carousel's page size. */
/**
 * Bars per desktop page: 1 fills the row, 2 split 50/50, 3 split 33/33/33, and
 * from FOUR promos the row becomes a paged carousel of three rather than
 * squeezing to quarter-width.
 */
const PAGE_SIZE = 3;

/**
 * Hold off on the skeleton for this long. A fast API response then renders the
 * real bars directly, instead of flashing a placeholder for 80ms.
 */
const SKELETON_DELAY_MS = 200;

/** Placeholder count — the live promo count is unknown until the fetch lands. */
const SKELETON_BARS = 2;

/** Shown while the promotions fetch is still in flight (past the delay above). */
function PromoBarsSkeleton() {
  return (
    <>
      <div className="promo-bars promo-bars--skeleton" data-cols={String(SKELETON_BARS)} aria-hidden="true">
        {Array.from({ length: SKELETON_BARS }, (_, i) => (
          <div className="promo-bar promo-bar--skeleton" key={i}>
            <div className="promo-bar-inner">
              <span className="promo-skel promo-skel--title" />
              <span className="promo-skel promo-skel--cta" />
            </div>
          </div>
        ))}
      </div>
      <span className="promo-sr-only" role="status">Loading promotions…</span>
    </>
  );
}

/**
 * Shown in the disclaimer modal when a promo has no `description`. The live data
 * currently has one promo with description: "" — an empty string, not a missing
 * field — so without this the (i) renders an inert icon that does nothing.
 * PLACEHOLDER: swap for the real fine print once it is authored in Hummingbird.
 */
const PLACEHOLDER_INFO =
  'Dorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis molestie, ' +
  'dictum est a, mattis tellus. Sed dignissim, metus nec fringilla accumsan, risus sem ' +
  'sollicitudin lacus, ut interdum tellus elit sed risus. Maecenas eget condimentum ' +
  'velit, sit amet feugiat lectus.\n\n' +
  'Curabitur tempor quis eros tempus lacinia. Nam bibendum pellentesque quam a ' +
  'convallis. Sed ut vulputate nisi. Integer in felis sed leo vestibulum venenatis. ' +
  'Suspendisse quis arcu sem.';

function PromoBarItem({ item }: { item: BarItem }) {
  // A bar with no explicit link filters the Space List to this promo's
  // qualifying units and scrolls to it; a real URL is left to navigate.
  const isFilterCta = !item.url || item.url === '#';

  // The (i) control opens the disclaimer modal (Figma 7158:80964). Per bar, not
  // lifted to PromoBars, so each bar owns its own copy and closing one cannot
  // affect another.
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div className="promo-bar">
      <div className="promo-bar-inner">
        {/* Tag + title group so the info icon can sit hard right (Figma 6242-44608). */}
        <div className="promo-bar-titlerow">
          <div className="promo-bar-titlewrap">
            <TagIcon size={36} />
            <span className="promo-bar-title">{item.title}</span>
          </div>
          {/* Always a button now: with the placeholder fallback there is always
              something to show, so the icon never renders as an inert span. */}
          <button
            type="button"
            className="promo-bar-info"
            aria-label={`More information about ${item.title}`}
            aria-haspopup="dialog"
            onClick={() => setInfoOpen(true)}
          >
            <InfoIcon size={36} />
          </button>
        </div>
        <a
          className="promo-bar-cta"
          href={item.url || '#'}
          onClick={(e) => {
            if (!isFilterCta) return;
            e.preventDefault();
            emitShowPromo({ promoId: item.id, promoTitle: item.title });
            scrollToSpaceList();
          }}
        >
          <ChevronRight size={24} />
          <span>{item.ctaLabel}</span>
        </a>
      </div>

      {/* Portalled to <body>: the bar sets overflow:hidden and Duda's row
          wrappers add their own stacking contexts, either of which would clip a
          modal rendered in place. */}
      {infoOpen && createPortal(
        <DisclaimerModal
          title={item.title}
          body={item.info || PLACEHOLDER_INFO}
          onClose={() => setInfoOpen(false)}
        />,
        document.body,
      )}
    </div>
  );
}

function PromoBars({ items }: { items: BarItem[] }) {
  const [page, setPage] = useState(0);

  // 560px is where the CSS used to drop every bar to flex-basis: 100% and stack
  // them vertically — the thing this carousel replaces — so JS and CSS agree on
  // the boundary. One bar per slide on a phone; desktop keeps its columns.
  const isMobile = useMediaQuery('(max-width: 560px)');
  const pageSize = isMobile ? 1 : PAGE_SIZE;

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const paged = items.length > pageSize;
  // Clamp rather than store-and-correct, so a shrinking `items` (API load
  // replacing demo data) can't leave us on a page that no longer exists.
  const current = Math.min(page, pageCount - 1);
  const visible = paged ? items.slice(current * pageSize, current * pageSize + pageSize) : items;
  // Column count drives the width + type scale in CSS.
  const cols = Math.min(items.length, pageSize);
  const go = (i: number) => setPage((i + pageCount) % pageCount);

  // Mobile has no arrows (hidden in CSS — they'd eat the width), so swipe is the
  // only way through.
  const swipe = useSwipe({
    onSwipeLeft: () => go(current + 1),
    onSwipeRight: () => go(current - 1),
  });

  const row = (
    <div className="promo-bars" data-cols={cols}>
      {visible.map((item) => (
        <PromoBarItem key={item.id} item={item} />
      ))}
    </div>
  );

  if (!paged) return row;

  return (
    <div className="promo-bars-carousel" {...swipe.handlers}>
      <div className="promo-bars-track">
        <button
          className="promo-bar-arrow promo-bar-arrow--prev"
          aria-label="Previous promotions"
          onClick={() => go(current - 1)}
        >
          <ChevronRight size={24} />
        </button>
        {row}
        <button
          className="promo-bar-arrow promo-bar-arrow--next"
          aria-label="Next promotions"
          onClick={() => go(current + 1)}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="promo-dots" role="tablist" aria-label="Promotion pages">
        {Array.from({ length: pageCount }, (_, i) => (
          <button
            key={i}
            className={`promo-dot${i === current ? ' promo-dot--active' : ''}`}
            role="tab"
            aria-selected={i === current}
            aria-label={`Promotions page ${i + 1} of ${pageCount}`}
            onClick={() => setPage(i)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface PromotionsProps {
  /** View mode (Duda dropdown). Default 'bar'. */
  mode?: 'banner' | 'bar';

  // ── Mode 1: banner (uploaded image + link) ──
  bannerImage?: string;
  bannerUrl?: string;
  bannerAlt?: string;

  // ── Mode 2: promotion bars (coloured bar + text + link) ──
  barText?: string;
  barUrl?: string;
  barCtaLabel?: string;
  /** Optional fine-print shown on the info icon's tooltip. */
  barInfo?: string;

  // ── Dynamic pages ──
  /**
   * Content-menu field connected to `Properties > id` — whose promotions to show.
   * Unset = the config.json property (static behaviour). See @shared/propertyBinding.
   */
  propertyId?: string;
  /**
   * Per-instance company override. Normally unset — the company comes from the
   * one-row `Company` collection, which is the source of truth for the whole site.
   */
  companyId?: string;
  /**
   * The property's space group. Not a column on the Properties collection, so it
   * can't be bound; leave empty on a dynamic page to auto-resolve that property's
   * "Website Group", or set it to pin one.
   */
  spaceGroupId?: string;
}

export function Promotions({
  mode = 'bar',
  bannerImage,
  bannerUrl = '#',
  bannerAlt = '',
  barText,
  barUrl = '#',
  barCtaLabel = 'See Qualifying Units',
  barInfo,
  propertyId,
  companyId,
  spaceGroupId,
}: PromotionsProps) {
  // Only two modes. Anything else from Duda (including the retired 'cards')
  // falls through to the bars, which absorbed the old cards layout.
  const view: 'banner' | 'bar' = mode === 'banner' ? 'banner' : 'bar';

  // Effective property for this instance: the dynamic-page binding, else config.json.
  const effectivePropertyId = resolvePropertyId({ propertyId }, cfg.propertyId);

  // The bars are API-driven — every tier's `allocated_promo` from the
  // space-groups API, deduped. There is no static demo set: until the fetch
  // resolves we show a skeleton, and if it returns nothing we render nothing.
  const [apiPromos, setApiPromos] = useState<ApiPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pastDelay, setPastDelay] = useState(false);

  useEffect(() => {
    // Banner mode never reads the API, so don't call it.
    if (view === 'banner') { setLoading(false); return; }

    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) setPastDelay(true); }, SKELETON_DELAY_MS);

    (async () => {
      // The `Company` collection is the source of truth; cfg.companyId is only the
      // editor/harness fallback. This endpoint is REST-only with no collection to
      // degrade to, so a wrong company here means no promotions at all.
      const company = await resolveCompanyIdFromSources('#06 promotions', { companyId }, cfg.companyId);
      if (cancelled) return;

      // Pointed at a different facility than the one config.json was built for?
      // Then the configured space group belongs to ANOTHER property and must never
      // be used — it would show a different facility's promotions.
      const isDynamicTarget =
        effectivePropertyId !== cfg.propertyId || company !== cfg.companyId;

      const sg = spaceGroupId
        ? spaceGroupId
        : isDynamicTarget || !cfg.spaceGroupId
          ? await fetchWebsiteSpaceGroupId({ ...cfg, companyId: company }, effectivePropertyId)
          : cfg.spaceGroupId;
      if (cancelled) return;

      // No website group for THIS property and nothing pinned: render nothing rather
      // than falling back to a group belonging to another facility. spaceGroups.ts
      // has already logged why it found none.
      if (!sg) { setApiPromos([]); return; }

      const raw = await fetchSpaceGroups(effectivePropertyId, sg, company);
      if (!cancelled) setApiPromos(extractPromos(raw));
    })()
      .catch((err) => console.error('[Promotions] fetchSpaceGroups error:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; clearTimeout(timer); };
  }, [view, effectivePropertyId, companyId, spaceGroupId]);

  // ── Mode 1: banner ────────────────────────────────────────────────────
  if (view === 'banner') {
    return (
      <div className="promo-wrapper">
        <a className="promo-banner" href={bannerUrl}>
          {bannerImage ? (
            <img className="promo-banner-img" src={bannerImage} alt={bannerAlt} />
          ) : (
            // Default banner (used until a Duda banner image is uploaded). Mobile
            // art swaps in below 640px.
            <picture>
              <source media="(max-width: 640px)" srcSet={promoBannerMobile} />
              <img className="promo-banner-img" src={promoBanner} alt={bannerAlt || 'Current promotion'} />
            </picture>
          )}
        </a>
      </div>
    );
  }

  // ── Mode 2: promotion bars ────────────────────────────────────────────
  // Still fetching: show the skeleton once we're past the delay, nothing before
  // (a sub-200ms response shouldn't flash a placeholder).
  if (loading) {
    return pastDelay ? <div className="promo-wrapper"><PromoBarsSkeleton /></div> : null;
  }

  // One bar per live promo. `barText` remains an explicit editor override for
  // sites that want to hand-write a single bar instead.
  const barItems: BarItem[] = apiPromos.length
    ? apiPromos.map((p) => ({
        id: p.id,
        title: p.title,
        info: p.info,
        url: barUrl,
        ctaLabel: barCtaLabel,
      }))
    : barText
      ? [{ id: 'bar', title: barText, info: barInfo, url: barUrl, ctaLabel: barCtaLabel }]
      : [];

  // No promotions and no manual override → render nothing rather than an
  // empty green bar.
  if (!barItems.length) return null;

  return (
    <div className="promo-wrapper">
      <PromoBars items={barItems} />
    </div>
  );
}
