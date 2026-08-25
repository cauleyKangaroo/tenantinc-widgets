import React, { useEffect, useMemo, useRef, useState } from 'react';
import './NearbyLocations.css';
import { PROPERTY_IMAGES, cover, propertyImage } from '@shared/demoImages';
import { fetchPropertyHeroImages } from '@shared/propertyImages';
import {
  StarRating,
  PhoneIcon,
  TagIcon,
  MapPinIcon,
  ChevronRight,
} from './icons';
import { NearbyMap, type MapPoint } from '@shared/NearbyMap';
import { useSwipe } from '@shared/useSwipe';
import {
  fetchProperties,
  extractProperties,
  getUserLocation,
  haversineMiles,
  fetchSpacesForProperties,
  formatDistance,
  fetchPriorityOrder,
  sortByPriorityThenName,
  INTERNAL_PROPERTIES_COLLECTION,
  type NearbyProperty,
  type NearbySpace,
  type PropertySpaces,
} from './nearbyApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Space = NearbySpace;

/** Card-ready property: live fields + presentation extras (image, fee, rating). */
interface Property extends Omit<NearbyProperty, 'spaces'> {
  /** CSS gradient / demo cover — Images aren't in the API yet. */
  image: string;
  adminFee: number;
  /** Rating/reviews aren't in the properties API; present only on demo data. */
  rating?: number;
  reviewCount?: number;
  /**
   * **`null` = not looked up yet** — the card renders `SpacesSkeleton` in their
   * place. Only the properties on the visible page are ever looked up (see the
   * spaces effect), so most of the list sits at `null` and costs nothing.
   *
   * An empty ARRAY is different and means "looked up, this property has no
   * bookable space" — the space block is then omitted, as before.
   */
  spaces: NearbySpace[] | null;
}

// ---------------------------------------------------------------------------
// Demo data — fallback when the API is unreachable or returns nothing
// ---------------------------------------------------------------------------

const SPACES: Space[] = [
  { size: '5’ x 5’', subtype: 'Climate Controlled', inStorePrice: 55, startingPrice: 25 },
  { size: '10’ x 10’', subtype: 'Drive Up', inStorePrice: 174, startingPrice: 140 },
  { size: '10’ x 12’', subtype: 'Drive Up', inStorePrice: 580, startingPrice: 450 },
];

const ADDRESS = '8478 3rd Street, Fullerton, CA 02027';
const PHONE = '(555) 555-5555';

const DEMO_PROPERTIES: Property[] = [
  { id: 'p1', name: '3rd Street Storage', distanceMiles: 1.7, rating: 4.5, reviewCount: 32, address: ADDRESS, phone: PHONE, lat: 0, lng: 0, image: cover(PROPERTY_IMAGES[0]), promo: '$1 Move-In', adminFee: 20, spaces: SPACES },
  { id: 'p2', name: 'Storfun Storage', distanceMiles: 2.5, rating: 4.5, reviewCount: 32, address: ADDRESS, phone: PHONE, lat: 0, lng: 0, image: cover(PROPERTY_IMAGES[1]), promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
  { id: 'p3', name: 'Green Street Storage', distanceMiles: 3, rating: 4.5, reviewCount: 32, address: ADDRESS, phone: PHONE, lat: 0, lng: 0, image: cover(PROPERTY_IMAGES[2]), promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
  { id: 'p4', name: 'Lakeside Self Storage', distanceMiles: 4.1, rating: 4, reviewCount: 18, address: ADDRESS, phone: PHONE, lat: 0, lng: 0, image: cover(PROPERTY_IMAGES[3]), promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
  { id: 'p5', name: 'Uptown Storage Co.', distanceMiles: 5.3, rating: 5, reviewCount: 47, address: ADDRESS, phone: PHONE, lat: 0, lng: 0, image: cover(PROPERTY_IMAGES[4]), promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
  { id: 'p6', name: 'Riverside Storage', distanceMiles: 6.2, rating: 4.5, reviewCount: 29, address: ADDRESS, phone: PHONE, lat: 0, lng: 0, image: cover(PROPERTY_IMAGES[5]), promo: 'Short Promotion Title', adminFee: 20, spaces: SPACES },
];

/**
 * Columns is FIXED at three — the card was drawn for a 1314px / 3-up grid and
 * `.nl-grid` is `repeat(3, 1fr)`. Only the number of ROWS is configurable, so
 * the two layouts are 3 cards and 6 cards; the grid wraps on its own.
 */
const COLUMNS = 3;

/**
 * Compare by distance, nearest first, with the NAME as the tie-break.
 *
 * The tie-break is not cosmetic. Properties with no coordinates (or no reference
 * point at all) get `distanceMiles: null`, and `Infinity - Infinity` is NaN —
 * a comparator returning NaN leaves the sort order unspecified, so the
 * distance-less tail could come back differently on each load. Comparing equals
 * by name settles it.
 */
function byDistanceThenName(
  a: { distanceMiles: number | null; name: string },
  b: { distanceMiles: number | null; name: string },
): number {
  const da = a.distanceMiles ?? Infinity;
  const db = b.distanceMiles ?? Infinity;
  if (da !== db) return da - db;
  return (a.name || '').localeCompare(b.name || '', 'en', { numeric: true, sensitivity: 'base' });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SpaceRow({ space }: { space: Space }) {
  return (
    <div className="nl-space-row">
      <div className="nl-space-info">
        <span className="nl-space-size">{space.size}</span>
        <span className="nl-space-subtype">{space.subtype}</span>
      </div>
      <div className="nl-space-prices">
        <span className="nl-price-tag"><TagIcon size={16} /></span>
        <div className="nl-price-strike">
          <span className="nl-price-strike-label">IN-STORE</span>
          <span className="nl-price-strike-value">${space.inStorePrice}</span>
        </div>
        <span className="nl-price-divider" />
        <div className="nl-price-start">
          <span className="nl-price-start-label">STARTING AT</span>
          <span className="nl-price-start-value">${space.startingPrice}</span>
        </div>
        <button className="nl-select-btn">Select</button>
      </div>
    </div>
  );
}

function PropertyCard({ property }: { property: Property }) {
  return (
    <div className="nl-card">
      <div className="nl-card-image" style={{ background: property.image }}>
        <div className="nl-card-image-overlay" />
        {property.distanceMiles != null && (
          <span className="nl-card-distance">{formatDistance(property.distanceMiles)}</span>
        )}
        <div className="nl-card-data">
          <span className="nl-card-name">{property.name}</span>
          {property.rating != null && (
            <div className="nl-card-rating">
              <span className="nl-card-rating-num">{property.rating}</span>
              <StarRating rating={property.rating} size={16} />
              <a className="nl-card-reviews" href="#">{property.reviewCount} Reviews</a>
            </div>
          )}
          {property.address && (
            <a className="nl-card-meta" href="#">
              <MapPinIcon size={16} />
              <span>{property.address}</span>
            </a>
          )}
          {property.phone && (
            <a className="nl-card-meta" href={`tel:${property.phone.replace(/[^0-9+]/g, '')}`}>
              <PhoneIcon size={16} />
              <span>{property.phone}</span>
            </a>
          )}
        </div>
      </div>

      <div className="nl-card-body">
        {/* The property's own details are known from the collection, so the card
            is real from the first paint; only the priced spaces wait on their
            per-property lookup. */}
        {property.spaces === null ? (
          <SpacesSkeleton />
        ) : (
          <>
            {property.promo && (
              <div className="nl-promo">
                <TagIcon size={16} />
                <span className="nl-promo-text">{property.promo}</span>
              </div>
            )}

            {property.spaces.length > 0 && (
              <div className="nl-spaces">
                {property.spaces.map((space, i) => (
                  <React.Fragment key={`${space.size}-${i}`}>
                    {i > 0 && <span className="nl-space-divider" />}
                    <SpaceRow space={space} />
                  </React.Fragment>
                ))}
              </div>
            )}
          </>
        )}

        <div className="nl-card-footer">
          <span className="nl-admin-fee">+ Plus ${property.adminFee} Admin Fee</span>
          <a className="nl-see-all" href="#">
            See All Spaces
          </a>
        </div>
      </div>
    </div>
  );
}

/** Loading placeholder mirroring the card's own geometry (image, promo, 3 space
 *  rows, footer) so the grid doesn't reflow when the real cards arrive. */
/**
 * The promo bar + space rows as placeholders — the part of a card that waits on
 * the space-groups lookup.
 *
 * Shared by `SkeletonCard` (whole card, while the property list itself loads) and
 * by a REAL card whose spaces haven't arrived yet. Sharing it is what makes the
 * hand-off free of layout shift: the block a pending card reserves is the same
 * block the finished card fills.
 *
 * **Three rows and one promo line is the exact reservation, not a guess.**
 * `fetchPropertySpaces` returns the cheapest THREE spaces and at most one promo,
 * so a property with a full complement settles into precisely this height. The
 * remaining movement is a property that turns out to have no promo, or fewer than
 * three spaces, which shrinks its own card once — unavoidable without knowing the
 * answer before asking, and far cheaper than holding the whole page back.
 */
function SpacesSkeleton() {
  return (
    // The wrapper carries .nl-card-body's own 16px column gap. In a real card the
    // promo and .nl-spaces are SIBLINGS in that flex body, so the gap falls
    // between them; here they are wrapped in one element, so the body's gap falls
    // around the pair instead and the promo bar sat flush on the first space row.
    // Reproducing the gap inside the wrapper puts it back where the real card has
    // it — which is the point of this component, since a real card swaps to these
    // exact blocks.
    <div className="nl-skeleton-spaces" aria-hidden="true">
      <div className="nl-skeleton-line nl-skeleton-promo" />
      <div className="nl-spaces">
        {[0, 1, 2].map((i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="nl-space-divider" />}
            <div className="nl-skeleton-space-row">
              <div className="nl-skeleton-lines">
                <div className="nl-skeleton-line nl-skeleton-size" />
                <div className="nl-skeleton-line nl-skeleton-subtype" />
              </div>
              <div className="nl-skeleton-line nl-skeleton-price" />
              <div className="nl-skeleton-block nl-skeleton-btn" />
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="nl-card nl-skeleton-card" aria-hidden="true">
      <div className="nl-card-image nl-skeleton-block" />
      <div className="nl-card-body">
        <SpacesSkeleton />
        <div className="nl-card-footer">
          <div className="nl-skeleton-line nl-skeleton-fee" />
          <div className="nl-skeleton-line nl-skeleton-seeall" />
        </div>
      </div>
    </div>
  );
}

function Dots({ count, active, onPick }: { count: number; active: number; onPick: (i: number) => void }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <button key={i} className={`nl-dot${i === active ? ' active' : ''}`} onClick={() => onPick(i)} aria-label={`Page ${i + 1}`} />
      ))}
    </>
  );
}


// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface NearbyLocationsProps {
  heading?: string;
  subheading?: string;
  /** Duda setting: only show properties within this many miles. 0/unset = nearest-first. */
  radiusMiles?: number;
  /** Fixed admin fee shown on each card (not per-property in the API). */
  adminFee?: number;
  /**
   * The page's own property, if Duda passes one — used to anchor distances when
   * the visitor declines geolocation, and to leave that facility out of its own
   * "nearby" list. Optional: this widget is normally site-wide, and it must NOT
   * fall back to config.json's build-time id, which belongs to another company.
   */
  propertyId?: string;
  /**
   * Grid layout: **1 row of 3** (default, one page = 3 cards) or **2 rows of 3**
   * (one page = 6). Columns are fixed at three — see COLUMNS.
   *
   * Typed loosely because a Duda content-menu field is a TEXT input: the value
   * arrives as `'2'`, not `2`. Anything that isn't 2 means one row.
   */
  rows?: 1 | 2 | string | number;
  /**
   * How the list is ordered.
   *
   *  - `'nearest'` (default) — every property, closest to the visitor first.
   *  - `'featured'` — the operator's own order, from the `priorityOrder` column of
   *    the `PropertiesInternal` collection (ties, and everything left unranked,
   *    fall back to the property name).
   *
   * Matched loosely (`/featur/i`) so a Duda dropdown labelled "Featured
   * Facilities" works as well as the bare token.
   */
  sortMode?: 'nearest' | 'featured' | string;
  /**
   * Optional cap on how many properties the list holds. **0 (default) = no cap:
   * the whole portfolio, sorted, paged.**
   *
   * It used to default to two pages' worth because every property cost a
   * space-groups lookup, so a 100-facility portfolio meant ~200 REST calls up
   * front. That is no longer true — spaces are fetched only for the cards on the
   * visible page (see the spaces effect), so the list length now costs one
   * collection read regardless of size. The cap survives only as a deliberate
   * "show the nearest N" setting.
   */
  maxProperties?: number;
  /**
   * Collection holding the site's own per-property extras — `priorityOrder` and
   * the hero photos. Overridable only because a collection name is site data.
   */
  internalCollection?: string;
}

export function NearbyLocations({
  heading = 'Nearby Properties',
  subheading = 'Browse other storage facilities in the area and compare available spaces and prices.',
  radiusMiles = 0,
  adminFee = 20,
  propertyId = '',
  rows = 1,
  sortMode = 'nearest',
  maxProperties = 0,
  internalCollection = INTERNAL_PROPERTIES_COLLECTION,
}: NearbyLocationsProps) {
  // Duda hands these over as strings, so coerce before deriving anything.
  const rowCount = Number(rows) >= 2 ? 2 : 1;
  const cardsPerPage = COLUMNS * rowCount;
  const featured = /featur/i.test(String(sortMode));
  // 0 / unset / junk ⇒ no cap: the whole sorted portfolio, paged.
  const cap = Math.max(0, Number(maxProperties) || 0);

  /**
   * Spaces per property id, for the lifetime of the page.
   *
   * A ref, not state: it is a cache, and re-rendering on a write would be a
   * second render for data the state update below already carries. It deliberately
   * SURVIVES a re-sort — the ids don't change when the order does, so toggling
   * layout or ordering re-uses every lookup already paid for and costs nothing.
   */
  const spacesCache = useRef(new Map<string, PropertySpaces>());
  /** Ids with a lookup in flight, so a re-render can't fire a second one. */
  const spacesInFlight = useRef(new Set<string>());

  const [page, setPage] = useState(0);
  const [mobileIdx, setMobileIdx] = useState(0);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  // null = still loading; [] = loaded but nothing to show.
  const [apiProperties, setApiProperties] = useState<Property[] | null>(null);
  // Reference coordinates (map centre).
  const [refLoc, setRefLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Re-running means the ordering or the layout changed, so the cards on screen
    // are the wrong ones — back to skeletons rather than stale-then-swap.
    setApiProperties(null);
    setRefLoc(null);
    setPage(0);
    setMobileIdx(0);

    (async () => {
      try {
        // Properties + a geolocation attempt run together (geo may prompt).
        //
        // FEATURED DOES NOT ASK. Its order comes from the operator's
        // `priorityOrder`, so the answer would be thrown away — and a permission
        // prompt whose result is discarded is the worst of both outcomes.
        const [raw, userLoc] = await Promise.all([
          fetchProperties(internalCollection),
          featured ? Promise.resolve(null) : getUserLocation(),
        ]);
        const all = extractProperties(raw);

        // Reference point: the visitor's location, else this page's own property
        // when Duda passed one. Often there is neither — geolocation is declined and
        // the widget is site-wide — and that must NOT blank the list: showing every
        // location without distances is still the useful thing to show.
        //
        // `hasCoords !== false` on the fallback: coordinate-less rows now survive
        // extraction carrying lat/lng 0, and anchoring the whole list to 0,0 would
        // measure every distance from the Gulf of Guinea.
        const current = propertyId ? all.find((p) => p.id === propertyId) : undefined;
        const ref = userLoc
          ? { ...userLoc, source: 'user' as const }
          : current && current.hasCoords !== false
            ? { lat: current.lat, lng: current.lng, source: 'property' as const }
            : null;

        // Never exclude by a property id we weren't given — with none, nothing is
        // "the current facility" and every location belongs in the list.
        const others = propertyId ? all.filter((p) => p.id !== propertyId) : all;

        // Distances are attached in both modes when they're knowable — a featured
        // card still shows "3 Miles" if the visitor's position happens to be known
        // from a page property — but only ORDER by them in nearest mode.
        const measured = others.map((p) => ({
          ...p,
          distanceMiles:
            ref && p.hasCoords !== false ? haversineMiles(ref, p) : (null as number | null),
        }));

        let ranked: typeof measured;
        if (featured) {
          const priorities = await fetchPriorityOrder(internalCollection);
          // FEATURED IS AN OPT-IN LIST. A property with no `priorityOrder` is not
          // "ranked last", it is not featured at all — so it is filtered out
          // rather than sorted to the tail. The operator's column IS the list.
          //
          // Consequence, deliberate: with nothing ranked this yields an empty
          // list, and the widget then says so (see emptyMessage) instead of
          // quietly showing the whole portfolio in name order — which would look
          // identical to a working featured list and hide the missing column.
          const chosen = measured.filter((p) => priorities.has(p.id));
          if (!chosen.length && measured.length) {
            // eslint-disable-next-line no-console
            console.warn(
              `[#07 nearby] featured mode: no row in ${internalCollection} has a priorityOrder, so there is nothing to feature`,
            );
          }
          ranked = sortByPriorityThenName(chosen, priorities);
        } else {
          ranked = [...measured].sort(byDistanceThenName);
          // A radius is meaningless without a reference point; applying it then would
          // filter everything out, which is how this used to render empty. It is also
          // meaningless in featured mode, where the operator picked the list.
          if (ref && radiusMiles > 0) {
            ranked = ranked.filter((p) => (p.distanceMiles ?? Infinity) <= radiusMiles);
          }
        }

        // The whole sorted list, unless an explicit cap says otherwise. Length is
        // free now: the space lookups below follow the visible page, not the list.
        const top = cap > 0 ? ranked.slice(0, cap) : ranked;

        // PAINT THE CARDS NOW, spaces later.
        //
        // This used to enrich every property before painting anything, so nothing
        // appeared until the slowest of N space lookups returned and the whole
        // portfolio had to be capped to keep N small. The card's property details
        // (name, address, phone, distance, photo) all come from the collection read
        // that just returned — there is nothing to wait for. Only the priced spaces
        // need the per-property REST calls, and those are now fetched for the
        // visible page alone.
        //
        // The reason it was eager is still respected: the old staged version shifted
        // the layout because an unenriched card was SHORTER than the skeleton above
        // it and shorter again than the finished card. `SpacesSkeleton` is what fixes
        // that — a pending card reserves exactly the block its spaces will fill, so
        // cards arrive at their final height and settle in place.
        //
        // Already-cached spaces are seeded straight in, so re-sorting or switching
        // layout re-paints finished cards as finished rather than back to skeletons.
        //
        // One read for the whole list — the hero photos live in a collection keyed
        // by property id, and asking per card would repeat the same read. Fails
        // soft to an empty map, and each card then keeps its own source.
        const heroes = await fetchPropertyHeroImages(internalCollection).catch(
          () => new Map<string, string>(),
        );

        const cards: Property[] = top.map((p, i) => {
          const cached = spacesCache.current.get(p.id);
          return {
            ...p,
            // heroimage wins over the API's own Images field, which is the
            // one the operator actually chose for this property.
            image: propertyImage(heroes.get(p.id) || p.imageUrl, i),
            adminFee,
            promo: cached?.promo,
            spaces: cached ? cached.spaces : null,
          };
        });

        if (!cancelled) {
          setApiProperties(cards);
          setRefLoc(ref);
        }
      } catch {
        if (!cancelled) {
          setApiProperties([]);
          setRefLoc(null);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [radiusMiles, adminFee, propertyId, featured, cap, internalCollection]);

  // While loading we render skeleton cards — showing DEMO_PROPERTIES here meant
  // real-looking names/prices flashed up and were then replaced. Demo data is
  // still the fallback for an EMPTY result, so the section never renders blank in
  // the editor/preview.
  const loading = apiProperties === null;
  const properties = apiProperties && apiProperties.length ? apiProperties : DEMO_PROPERTIES;
  /**
   * Why the list is empty, when it is — or `null` to fall back to demo cards.
   *
   * Only a FILTER earns a message. An empty result with no filter applied is the
   * unreachable-API case, which keeps the existing demo-card fallback so the
   * section never renders blank in the Duda editor or a preview.
   *
   * Featured is a filter (the `priorityOrder` column), and it is the one worth
   * naming: an operator who has selected "featured facilities" and filled nothing
   * in needs to be told that, not shown six invented facilities.
   */
  const emptyMessage =
    !loading && apiProperties!.length === 0
      ? featured
        ? `No featured facilities yet — set “priorityOrder” on the properties to feature.`
        : radiusMiles > 0
          ? `No properties found within ${radiusMiles} miles.`
          : null
      : null;

  const totalPages = Math.ceil(properties.length / cardsPerPage);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const pageCards = properties.slice(safePage * cardsPerPage, safePage * cardsPerPage + cardsPerPage);

  /**
   * The ids on screen right now — the desktop page's cards plus the one card the
   * mobile carousel is showing.
   *
   * Both frames are always in the DOM (one is `display: none`), so both count as
   * visible; the mobile index normally sits inside the desktop page anyway, and
   * only adds an id once a visitor has swiped past it. The result is
   * `cardsPerPage` ids — **3 for a one-row layout, 6 for two** — which is exactly
   * the fan-out the spaces effect performs.
   */
  const visibleIds = useMemo(() => {
    if (!apiProperties?.length) return [] as string[];
    const ids = apiProperties
      .slice(safePage * cardsPerPage, safePage * cardsPerPage + cardsPerPage)
      .map((p) => p.id);
    const onMobile = apiProperties[Math.min(mobileIdx, apiProperties.length - 1)]?.id;
    if (onMobile && !ids.includes(onMobile)) ids.push(onMobile);
    return ids;
  }, [apiProperties, safePage, cardsPerPage, mobileIdx]);

  /**
   * Spaces for the visible cards — one parallel batch per page.
   *
   * Runs on every page turn and swipe, and asks only for ids it has neither
   * cached nor got in flight, so paging back to a page already seen costs nothing
   * and no id is ever requested twice.
   *
   * Results land **per property as each resolves** rather than after the slowest
   * of the batch: `SpacesSkeleton` has already reserved each card's space block,
   * so a card filling in early moves nothing on the page. That is the whole reason
   * the eager all-or-nothing paint could be dropped.
   *
   * The cache is written before the cancelled check on purpose — a lookup that
   * finished after a re-sort is still a valid answer for that property, and
   * throwing it away would make the next page turn pay for it again.
   */
  useEffect(() => {
    const missing = visibleIds.filter(
      (id) => !spacesCache.current.has(id) && !spacesInFlight.current.has(id),
    );
    if (!missing.length) return;

    let cancelled = false;
    missing.forEach((id) => spacesInFlight.current.add(id));

    void fetchSpacesForProperties(missing, (id, data) => {
      spacesCache.current.set(id, data);
      spacesInFlight.current.delete(id);
      if (cancelled) return;
      setApiProperties((prev) =>
        prev
          ? prev.map((p) =>
              p.id === id ? { ...p, promo: data.promo, spaces: data.spaces } : p,
            )
          : prev,
      );
    });

    return () => { cancelled = true; };
  }, [visibleIds]);

  const mobileSwipe = useSwipe({
    onSwipeLeft: () => setMobileIdx((i) => Math.min(properties.length - 1, i + 1)),
    onSwipeRight: () => setMobileIdx((i) => Math.max(0, i - 1)),
  });

  // Map pins from the live properties (price = cheapest starting rate).
  // Coordinate-less properties are DROPPED here, not plotted: extraction now keeps
  // them (see extractProperties) carrying lat/lng 0, which is a real place in the
  // Atlantic, and one such pin would blow the map's auto-fit out to the whole
  // globe. `active` is matched on identity rather than index for the same reason —
  // after the filter the indices no longer line up with the list.
  const mapPoints: MapPoint[] = (apiProperties ?? [])
    .filter((p) => p.hasCoords !== false)
    .map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      label: p.spaces?.[0] ? `$${p.spaces[0].startingPrice}` : undefined,
      name: p.name,
      address: p.address,
      distance: p.distanceMiles != null ? formatDistance(p.distanceMiles) : undefined,
      active: p.id === apiProperties?.[Math.min(mobileIdx, apiProperties.length - 1)]?.id,
    }));

  return (
    <div className="nl-wrapper">
      {/* One announcement for the whole widget: the desktop and mobile frames are
          both always in the DOM (one is display:none), so putting this inside each
          skeleton would queue it twice. The cards themselves are aria-hidden, so
          without this a screen reader gets silence for the whole load. */}
      {loading && (
        <span className="nl-sr-only" role="status">Loading nearby locations…</span>
      )}

      {/* ── Desktop ─────────────────────────────────────────────────────── */}
      <div className="nl-desktop">
        <div className="nl-heading-block">
          <div className="nl-title">{heading}</div>
          <p className="nl-subtitle">{subheading}</p>
        </div>

        {emptyMessage ? (
          <p className="nl-empty">{emptyMessage}</p>
        ) : (
          <>
            <div className="nl-grid">
              {loading
                ? Array.from({ length: cardsPerPage }, (_, i) => <SkeletonCard key={i} />)
                : pageCards.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
            </div>

            {!loading && totalPages > 1 && (
              <div className="nl-pagination">
                <button className="nl-page-btn nl-page-btn-prev" onClick={() => setPage(() => Math.max(0, safePage - 1))} disabled={safePage === 0} aria-label="Previous">
                  <ChevronRight size={40} />
                </button>
                <Dots count={totalPages} active={safePage} onPick={setPage} />
                <button className="nl-page-btn" onClick={() => setPage(() => Math.min(totalPages - 1, safePage + 1))} disabled={safePage === totalPages - 1} aria-label="Next">
                  <ChevronRight size={40} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Mobile ──────────────────────────────────────────────────────── */}
      <div className="nl-mobile">
        <div className="nl-mobile-title">
          <span>Nearby Storage</span>
        </div>

        <div className="nl-mobile-tabs">
          <button className={`nl-mobile-tab${mobileView === 'list' ? ' active' : ''}`} onClick={() => setMobileView('list')}>List View</button>
          <button className={`nl-mobile-tab${mobileView === 'map' ? ' active' : ''}`} onClick={() => setMobileView('map')}>Map View</button>
        </div>

        {mobileView === 'list' ? (
          emptyMessage ? (
            <p className="nl-empty">{emptyMessage}</p>
          ) : (
            <>
              {loading ? (
                <SkeletonCard />
              ) : (
                <>
                  {/* Dots are the indicator, swiping is the control — this view
                      never had arrows to begin with. */}
                  <div {...mobileSwipe.handlers}>
                    <PropertyCard property={properties[Math.min(mobileIdx, properties.length - 1)]} />
                  </div>
                  <div className="nl-pagination nl-pagination-dots">
                    <Dots count={properties.length} active={Math.min(mobileIdx, properties.length - 1)} onPick={setMobileIdx} />
                  </div>
                </>
              )}
            </>
          )
        ) : loading ? (
          /* "Map unavailable" is the RIGHT answer when geolocation was declined and
             no propertyId anchors us — but it used to be the answer while the fetch
             was still in flight too, stating something false. Both cases produce
             refLoc === null, so the loading one has to be tested first. */
          <div className="nl-map"><span className="nl-skeleton-block nl-skeleton-map" /></div>
        ) : refLoc && mapPoints.length ? (
          <NearbyMap center={refLoc} points={mapPoints} className="nl-map" />
        ) : (
          <div className="nl-map"><span className="nl-map-selected">Map unavailable</span></div>
        )}
      </div>

    </div>
  );
}
