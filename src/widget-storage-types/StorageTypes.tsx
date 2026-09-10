// ===========================================================================
// #20 — Storage type cards
//
// One widget, two layouts:
//   • variant="index"   — the full grid on /storage-types/
//   • variant="related" — the "More Space Types" row at the foot of a type
//                         page, a swipeable carousel on mobile
//
// Both read the same sources (see ./storageTypeSource): the PAGE TREE decides
// which types exist, featurePage supplies copy, and PropertiesInternal's
// amenities supply imagery. Missing enrichment never removes a real page.
// ===========================================================================

import { useEffect, useMemo, useState } from 'react';
import './StorageTypes.css';
import { useCarousel, usePrefersReducedMotion } from '@shared/useCarousel';
import { CarouselDots } from '@shared/CarouselDots';
import { hasSitePagesApi } from '@shared/sitePages';
import { fetchStorageTypes, FEATURE_PAGE_COLLECTION, type StorageType } from './storageTypeSource';

export type StorageTypesVariant = 'index' | 'related';

export interface StorageTypesProps {
  variant?: StorageTypesVariant;
  /** Index-page H1, or the related-section H2. */
  heading?: string;
  /** Index-page introductory sentence. Not rendered by the related variant. */
  subheading?: string;
  /** Route(s) holding the type pages. Comma separated. */
  storageTypesRoute?: string;
  /** Existing `featurePage` collection providing `name` + `description`. */
  collectionName?: string;
  /** Existing property collection providing `amenities[].image`. */
  internalCollectionName?: string;
  /** The page this row sits on, excluded from a "related" list. */
  currentSlug?: string;
  /** Cards in the related row. Default 3, as drawn. */
  limit?: number | string;
  /** Mirror the nav exactly, dropping pages hidden from it. Default false. */
  skipHiddenPages?: boolean | string;
  inEditor?: boolean | string;
}

const PREVIEW: StorageType[] = [
  { slug: 'covered-vehicle-storage', title: 'Covered Vehicle Storage', href: '#',
    abstract: "Don't start the year off with overflowing closets, stuffed garages, and just too much…", image: '', imageAlt: 'Covered Vehicle Storage' },
  { slug: 'drive-up-climate-controlled-storage', title: 'Drive-Up Climate Controlled Storage', href: '#',
    abstract: "Don't start the year off with overflowing closets, stuffed garages, and just too much…", image: '', imageAlt: 'Drive-Up Climate Controlled Storage' },
  { slug: 'drive-up-storage', title: 'Drive-Up Storage', href: '#',
    abstract: "Don't start the year off with overflowing closets, stuffed garages, and just too much…", image: '', imageAlt: 'Drive-Up Storage' },
];

function boolProp(v: boolean | string | undefined): boolean {
  return v === true || v === 'true';
}

function intProp(v: number | string | undefined, fallback: number): number {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function isLocalHarness(): boolean {
  if (typeof window === 'undefined') return false;
  return /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);
}

function dudaEnvironment(): string {
  try {
    const dm = (window as unknown as { dmAPI?: { getCurrentEnvironment?: () => string } }).dmAPI;
    const value = dm?.getCurrentEnvironment?.();
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
  } catch {
    return '';
  }
}

/** Published storage-type pages identify themselves without a widget field. */
function slugFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const parts = window.location.pathname.split('/').filter(Boolean);
  const branch = parts.lastIndexOf('storage-types');
  return branch >= 0 && parts[branch + 1] ? parts[branch + 1].toLowerCase() : '';
}

/** The related row is a carousel below this width and a static row above it. */
const NARROW_BP = '(max-width: 768px)';

/**
 * Temporary design artwork for a type with no amenity image yet.
 *
 * Referenced by URL, NOT imported: webpack's image rule is `asset/inline`, so
 * an import base64s the file into the bundle — three of these took #20 from
 * 168KB to 629KB, downloaded and parsed as JavaScript on every page. By URL
 * they are cached, lazy-loadable, and cost the bundle nothing.
 *
 * Served from the same folder as the bundle so the two move together.
 */
const FALLBACK_IMAGE_BASE =
  'https://raymond-tenantinc-widgets-test.s3.us-west-2.amazonaws.com/tenantinc-widgets/dist/storagetypes/assets';
const FIGMA_CARD_FALLBACKS = [
  `${FALLBACK_IMAGE_BASE}/figma-card-1.jpg`,
  `${FALLBACK_IMAGE_BASE}/figma-card-2.jpg`,
  `${FALLBACK_IMAGE_BASE}/figma-card-3.jpg`,
] as const;

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(NARROW_BP).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(NARROW_BP);
    if (!mq) return;
    const onChange = () => setNarrow(mq.matches);
    onChange();
    // Safari < 14 has no addEventListener on MediaQueryList.
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return narrow;
}

/** Cards are the same in both layouts; only their container differs. */
function Card({ type, position }: { type: StorageType; position: number }) {
  // Temporary design artwork while a storage type has no amenity image.
  // Collection data remains authoritative whenever it is available.
  const image = type.image || FIGMA_CARD_FALLBACKS[position % FIGMA_CARD_FALLBACKS.length];
  return (
    <a className="st-card" href={type.href}>
      <div className="st-card-media">
        <img className="st-card-img" src={image} alt={type.imageAlt} loading="lazy" />
      </div>
      <div className="st-card-body">
        <h3 className="st-card-title">{type.title}</h3>
        {type.abstract ? <p className="st-card-abstract">{type.abstract}</p> : null}
        <span className="st-card-more">Read more</span>
      </div>
    </a>
  );
}

/** Mobile-only section mark drawn beside the related-section heading. */
function StorageTypesMark() {
  return (
    <svg className="st-heading-mark" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="1" y="1" width="18" height="18" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7 9h6M7 12h6M7 15h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function StorageTypes({
  variant = 'index',
  heading,
  subheading,
  storageTypesRoute = 'storage-types',
  collectionName = FEATURE_PAGE_COLLECTION,
  internalCollectionName,
  currentSlug = '',
  limit,
  skipHiddenPages,
  inEditor,
}: StorageTypesProps) {
  const [types, setTypes] = useState<StorageType[] | null>(null);
  const isRelated = variant === 'related';
  const perView = intProp(limit, 3);
  // Unfilled Duda text fields arrive as null despite the compile-time prop
  // shape. Normalize them before passing them into collection/page readers.
  const resolvedRoute = typeof storageTypesRoute === 'string' && storageTypesRoute.trim()
    ? storageTypesRoute
    : 'storage-types';
  const resolvedCollection = typeof collectionName === 'string' && collectionName.trim()
    ? collectionName
    : FEATURE_PAGE_COLLECTION;
  const resolvedInternalCollection = typeof internalCollectionName === 'string' && internalCollectionName.trim()
    ? internalCollectionName
    : undefined;
  const explicitCurrentSlug = typeof currentSlug === 'string'
    ? currentSlug.trim().toLowerCase()
    : '';
  const resolvedCurrentSlug = explicitCurrentSlug || slugFromLocation();
  const resolvedIndexSubheading = typeof subheading === 'string' && subheading.trim()
    ? subheading.trim()
    : 'These are all the storage types we offer.';

  useEffect(() => {
    let cancelled = false;
    const tag = `[#20 storage-types ${variant}]`;
    const environment = dudaEnvironment();

    // Same gate as #19. `isLocalHarness()` alone is NOT enough: the harness can
    // serve a page tree via ?mockCollections=1, and short-circuiting on hostname
    // would hide the real path behind example cards exactly where we test it.
    // And never `!hasSitePagesApi()` alone — dmAPI is injected late on a
    // published page, so that would leak example cards into production.
    const explicitPreview = boolProp(inEditor) || (!!environment && environment !== 'live');
    const localPreview = isLocalHarness() && !hasSitePagesApi();
    if (explicitPreview || localPreview) {
      setTypes(PREVIEW.slice(0, isRelated ? perView : PREVIEW.length));
      return;
    }

    fetchStorageTypes(tag, {
      route: resolvedRoute,
      collectionName: resolvedCollection,
      internalCollectionName: resolvedInternalCollection,
      excludeSlug: isRelated ? resolvedCurrentSlug : '',
      skipHidden: boolProp(skipHiddenPages),
    })
      .then((rows) => {
        if (cancelled) return;
        if (!rows.length) console.warn(`${tag} no pages under "${resolvedRoute}"`);
        setTypes(isRelated ? rows.slice(0, perView) : rows);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error(`${tag} could not build the list:`, err instanceof Error ? err.message : String(err));
        setTypes([]);
      });

    return () => { cancelled = true; };
  }, [variant, resolvedRoute, resolvedCollection, resolvedInternalCollection, resolvedCurrentSlug, perView, skipHiddenPages, inEditor, isRelated]);

  const list = types ?? [];
  const reduceMotion = usePrefersReducedMotion();
  const isNarrow = useIsNarrow();

  // One structure serves both widths. Desktop shows the whole row at once
  // (perView === count ⇒ maxIndex 0 ⇒ no transform, no dots); mobile steps one
  // card at a time. The slide width follows perView through a custom property,
  // so the CSS never has to know the count.
  const perViewNow = isRelated && isNarrow ? 1 : Math.max(list.length, 1);
  const carousel = useCarousel({
    count: list.length,
    perView: perViewNow,
    draggable: isRelated && isNarrow && !reduceMotion,
  });

  const title = useMemo(
    () => heading || (isRelated ? 'More Space Types' : 'Storage Types'),
    [heading, isRelated],
  );

  if (types === null) return null;
  // No pages under the route is the honest "this site has no storage types",
  // and a heading over an empty grid reads as broken.
  if (!list.length) return null;

  if (!isRelated) {
    return (
      <section className="st st--index">
        <header className="st-index-header">
          <h1 className="st-index-title">{title}</h1>
          <p className="st-index-subheading">{resolvedIndexSubheading}</p>
        </header>
        <div className="st-grid">
          {list.map((t, index) => <Card type={t} position={index} key={t.slug} />)}
        </div>
      </section>
    );
  }

  const railStyle: React.CSSProperties = {
    transform: `translateX(calc(${carousel.offsetPct}% / ${perViewNow}))`,
    transition: carousel.dragging || reduceMotion ? 'none' : 'transform 260ms ease',
  };

  return (
    <section className="st st--related">
      <h2 className="st-heading"><StorageTypesMark /><span>{title}</span></h2>
      <div className="st-track">
        <div className="st-rail" style={railStyle} {...carousel.handlers}>
          {list.map((t, index) => (
            <div className="st-slide" key={t.slug}><Card type={t} position={index} /></div>
          ))}
        </div>
      </div>
      {carousel.maxIndex > 0 ? (
        <div className="st-dots">
          <CarouselDots
            count={carousel.maxIndex + 1}
            active={carousel.index}
            onPick={carousel.goTo}
            dotClass="st-dot"
            label="Go to storage type {n}"
          />
        </div>
      ) : null}
    </section>
  );
}
