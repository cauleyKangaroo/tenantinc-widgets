// ===========================================================================
// #08 city page — live data.
//
// Two sources, exactly as #05's "Nearby Storage" section does it:
//
//   1. /properties            → name, address, phone, city/state, coordinates
//   2. /space-groups/…/groups → the unit tiers, per property
//
// The properties call is collection-first (@shared/propertiesSource via
// @shared/nearbyProperties); space-groups is REST-only because no Duda
// collection exposes it.
//
// LOADING IS STAGED, like NearbySection: the city's properties paint as soon as
// call 1 returns, then each card fills in its spaces as call 2 resolves for it.
// One property's space-groups failing must never blank the page, so every
// per-property fetch fails soft to empty.
//
// WHICH PROPERTIES: those whose `Address.city` matches the widget's `city` prop.
// Matched on the discrete field rather than a substring of the formatted
// address — "…, Irvine, CA 92620" contains "CA" and would match a city called
// "Ca". @shared/nearbyProperties already surfaces `city`/`state` separately for
// this. Note the live data is NOT reliably title-cased ("LancasTER" and
// "Lancaster" both appear), hence the normalised compare below.
// ===========================================================================

import {
  fetchProperties as fetchPropertiesShared,
  extractNearbyProperties,
  haversineMiles,
  type NearbyApiConfig,
  type NearbyBaseProperty,
} from '@shared/nearbyProperties';
import { sameState } from '@shared/usStates';
import { fetchWebsiteSpaceGroupId } from '@shared/spaceGroups';
import type { CityFacility, CityUnit } from './data';

export type CityApiConfig = NearbyApiConfig;

// ---------------------------------------------------------------------------
// Raw space-groups shapes — only what we read
// ---------------------------------------------------------------------------

interface ApiAmenity {
  name: string;
  value?: string;
  type?: string | null;
  sort_order?: number;
  show_in_website?: number;
  show_in_filter_bar?: number;
  available_units?: number;
}

interface ApiPromoEntry { id?: string; name?: string }

interface ApiTier {
  id: string;
  description: string;
  width: string;
  length: string;
  set_rate: number | null;
  sell_rate: number | null;
  units: { count: number; min_price: number | null; max_price: number | null };
  vacant: { count: number; min_price: number | null; max_price: number | null };
  amenities?: ApiAmenity[];
  space_type_associations?: { is_primary: number; unit_type_name: string }[];
  promo?: ApiPromoEntry[];
  allocated_promo?: ApiPromoEntry | Record<string, never>;
}

interface GroupsResponse {
  applicationData?: Record<string, Array<{
    data?: { spaceGroupProfile?: Record<string, { groups?: { name: string; tiers?: ApiTier[] }[] }> };
  }>>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const headers = (cfg: CityApiConfig) => ({
  'x-storageapi-date': String(Math.floor(Date.now() / 1000)),
  'x-storageapi-key': cfg.apiKey,
});

const companyBase = (cfg: CityApiConfig) =>
  `${cfg.baseUrl}/applications/${cfg.appId}/v2/companies/${cfg.companyId}`;

/** Case/whitespace-insensitive city key. See the header note on "LancasTER". */
export function cityKey(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * The city name out of whatever the `city` prop holds.
 *
 * The prop doubles as the display label and the Figma writes it "Fullerton, CA",
 * so the state has to come off before matching or nothing ever matches.
 */
export function cityNameOf(cityProp: string): string {
  return (cityProp.split(',')[0] ?? '').trim();
}

// boolean amenities → the name IS the label; text ones → the value is.
// Same rule as #05's mapper, so labels agree across widgets.
function amenityLabel(a: ApiAmenity): string {
  return a.type === 'boolean' || a.value === 'Yes' || a.value === 'No' ? a.name : (a.value ?? a.name);
}

/**
 * Area (sq ft) → the three buckets #08's filter offers. #05 splits the top one
 * further into extra_large; this page's Figma has only three pills, so Large
 * absorbs it rather than inventing a fourth that the panel can't show.
 */
export function sizeBucket(area: number): 'Small' | 'Medium' | 'Large' | '' {
  if (area <= 0) return '';
  if (area <= 50) return 'Small';
  if (area <= 150) return 'Medium';
  return 'Large';
}

function tierPromoName(t: ApiTier): string | undefined {
  const fromArray = t.promo?.find((p) => p && p.id);
  if (fromArray?.name) return fromArray.name;
  const legacy = t.allocated_promo;
  return legacy && 'id' in legacy ? legacy.name : undefined;
}

// ---------------------------------------------------------------------------
// 1. The city's properties
// ---------------------------------------------------------------------------

/** Slug/label key: lowercase, letters and digits only. "Huntington Beach",
 *  "huntington-beach" and "HuntingtonBeach" all collapse to the same thing. */
function placeKey(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** The state / city segments of `state/city/property-name-<id>`. */
function slugParts(slug: string): { state: string; city: string } {
  const parts = (slug || '').split('/').filter(Boolean);
  return { state: parts[0] ?? '', city: parts[1] ?? '' };
}

/**
 * Where a page can scope this widget. Both optional:
 *   {}                              → every property
 *   { state: 'california' }         → the state page
 *   { state: 'california', city: 'fullerton' } → the city page
 */
export interface PlaceScope {
  state?: string;
  city?: string;
}

/**
 * Does this property belong on the page for `scope`?
 *
 * Matched against the SLUG **or** the Address, because the two disagree in the
 * live data and each is authoritative for something different:
 *  - the slug is what the nav builds `/locations/{state}/{city}` links from, so
 *    a link must find its properties;
 *  - the Address is what a human means when they type "Gardena".
 * Gardena's slug says `california/irvine`, so matching only one of the two would
 * either break the nav link or break the obvious search. Accepting either finds
 * it both ways, and the cost is that a property can appear under two cities
 * until the upstream slugs are fixed.
 */
export function matchesPlace(p: NearbyBaseProperty, scope: PlaceScope): boolean {
  const slug = slugParts(p.slug ?? '');

  if (scope.state) {
    const bySlug = sameState(slug.state, scope.state);
    // Address holds the CODE ("CA") while the URL holds the name — sameState
    // bridges them either way round.
    const byAddress = sameState(p.state ?? '', scope.state);
    if (!bySlug && !byAddress) return false;
  }

  if (scope.city) {
    const want = placeKey(cityNameOf(scope.city));
    if (want && placeKey(slug.city) !== want && placeKey(p.city ?? '') !== want) return false;
  }

  return true;
}

/**
 * Every property for a place, as cards with no spaces attached yet.
 *
 * `requireCoords: false` — this page lists by place, not by distance, so a
 * property with no lat/lng still belongs here (and today they ALL lack them;
 * see @shared/nearbyProperties). Callers read `hasCoords` before mapping.
 *
 * An empty scope returns every property rather than none: an unconfigured widget
 * showing the whole portfolio is a better failure than a blank page.
 */
export async function fetchPlaceProperties(
  cfg: CityApiConfig,
  scope: PlaceScope,
): Promise<NearbyBaseProperty[]> {
  const raw = await fetchPropertiesShared(cfg);
  const all = extractNearbyProperties(raw, cfg.appId, { requireCoords: false });
  if (!scope.state && !scope.city) return all;
  return all.filter((p) => matchesPlace(p, scope));
}

/** @deprecated Use `fetchPlaceProperties` — kept so existing callers compile. */
export async function fetchCityProperties(
  cfg: CityApiConfig,
  city: string,
): Promise<NearbyBaseProperty[]> {
  return fetchPlaceProperties(cfg, { city });
}

// ---------------------------------------------------------------------------
// 2. One property's spaces
// ---------------------------------------------------------------------------

/** A tier, with everything the card AND the filter panel need. */
export interface CitySpace extends CityUnit {
  /** 'Storage' | 'Parking' — matches the filter panel's TYPE pills. */
  spaceType: 'Storage' | 'Parking';
  /** 'Small' | 'Medium' | 'Large' — matches the SIZE pills. */
  sizeBucket: string;
  /** show_in_filter_bar amenities → the "Space Features" pills. */
  features: string[];
  /** show_in_website amenities → the "Amenities" checkboxes. Mirrors #05. */
  amenities: string[];
  /**
   * EVERY amenity, sorted and de-duped, ungated — what a card would display.
   * The city card shows only the subtype today (its design has no bullet list),
   * so nothing renders this yet; it exists so the card can show amenities the
   * moment the design calls for it, without re-deriving the rule. Mirrors #05's
   * `features`.
   */
  displayAmenities: string[];
  /** Promotion name allocated to this tier, if any. */
  promo?: string;
  vacantCount: number;
}

/**
 * A property's spaces + its first promotion.
 *
 * Fails soft to empty on every error path — a 404 on one property must leave
 * the other cards alone. The website space group is resolved by name via
 * @shared/spaceGroups (never "take the first": see that module for why).
 */
export async function fetchCitySpaces(
  cfg: CityApiConfig,
  propertyId: string,
): Promise<{ promo?: string; spaces: CitySpace[] }> {
  try {
    const sgId = await fetchWebsiteSpaceGroupId(cfg, propertyId);
    if (!sgId) return { spaces: [] };

    const res = await fetch(
      `${companyBase(cfg)}/properties/${propertyId}/space-groups/${sgId}/groups`,
      { headers: headers(cfg) },
    );
    if (!res.ok) return { spaces: [] };

    const json = (await res.json()) as GroupsResponse;
    const profile = json?.applicationData?.[cfg.appId]?.[0]?.data?.spaceGroupProfile;
    if (!profile) return { spaces: [] };

    const spaces: CitySpace[] = [];
    let promo: string | undefined;

    for (const prof of Object.values(profile)) {
      for (const group of prof.groups ?? []) {
        for (const t of group.tiers ?? []) {
          const tPromo = tierPromoName(t);
          if (!promo && tPromo) promo = tPromo;

          const primary = t.space_type_associations?.find((a) => a.is_primary === 1);
          const spaceType = primary?.unit_type_name === 'parking' ? 'Parking' : 'Storage';

          const sorted = [...(t.amenities ?? [])]
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .filter((a, i, arr) => arr.findIndex((x) => x.name === a.name) === i);

          // Same three rules as #05, so the two widgets never disagree about a
          // property (see that widget's api.ts for the reasoning behind each).
          //
          // 1. CARD DISPLAY — no flag at all, just sorted and de-duped.
          //    `show_in_website` is not a display gate.
          const displayAmenities = sorted.map(amenityLabel);

          // 2. FILTER POPUP → "Amenities" — strictly show_in_website, parking
          //    included. This is the operator's pick of what's worth filtering
          //    on, and a parking bypass here would put amenities in the list
          //    that they never chose to surface.
          const amenities = sorted
            .filter((a) => a.show_in_website === 1)
            .map(amenityLabel);

          // 3. FILTER POPUP → "Space Features" — show_in_filter_bar, with the
          //    availability guard so a pill can't filter to nothing.
          const features = sorted
            .filter((a) => a.show_in_filter_bar === 1 && (a.available_units ?? 1) > 0)
            .map(amenityLabel);

          // The SUBTITLE keeps consulting the flag (parking bypassed), exactly
          // as #05 does: it needs one amenity that describes the unit, and the
          // curated ordering is the only one that reliably leads with one.
          const subtypeSource = sorted
            .filter((a) => spaceType === 'Parking' || a.show_in_website === 1);

          const vacantCount = t.vacant?.count ?? 0;
          // Quote what a customer can actually rent: a tier with vacancy prices
          // from `vacant.min_price`, else the whole-tier figure. Same rule as
          // #05 — some tiers report units.min_price 0 from legacy occupancy.
          const available = vacantCount >= 1 ? t.vacant?.min_price : t.units?.min_price;
          const startingPrice = t.sell_rate ?? available ?? t.units?.min_price ?? 0;

          const area = (parseFloat(t.width) || 0) * (parseFloat(t.length) || 0);

          spaces.push({
            id: t.id,
            dimensions: t.description,
            subtype: subtypeSource[0] ? amenityLabel(subtypeSource[0]) : group.name,
            inStorePrice: t.set_rate ?? t.units?.max_price ?? 0,
            startingPrice,
            spaceType,
            sizeBucket: sizeBucket(area),
            features,
            amenities,
            displayAmenities,
            promo: tPromo,
            vacantCount,
          });
        }
      }
    }

    return { promo, spaces };
  } catch {
    return { spaces: [] };
  }
}

// ---------------------------------------------------------------------------
// Assembling a card
// ---------------------------------------------------------------------------

/** Admin fee — not on the API, same placeholder constant #05's nearby uses. */
export const DEFAULT_ADMIN_FEE = 20;

/**
 * A property + its spaces → the card shape the components already render.
 *
 * `distanceMiles` is NaN when it can't be known (no visitor location, or the
 * property has no coordinates). Not 0: the sort treats a missing distance as
 * Infinity so it sinks rather than floating to the top of "Closest Distance",
 * and the card hides the line instead of claiming "0.0 mi away".
 */
export function toCityFacility(
  p: NearbyBaseProperty,
  spaces: CitySpace[],
  promo: string | undefined,
  ref: { lat: number; lng: number } | null,
): CityFacility {
  const cheapest = spaces.length
    ? spaces.reduce((min, s) => (s.startingPrice > 0 && s.startingPrice < min ? s.startingPrice : min), Infinity)
    : Infinity;

  return {
    id: p.id,
    name: p.name,
    address: p.address,
    phone: p.phone,
    lat: p.lat,
    lng: p.lng,
    hasCoords: p.hasCoords,
    distanceMiles: ref && p.hasCoords ? haversineMiles(ref, p) : NaN,
    // Ratings live in the separate GoogleReviews collection, not this API —
    // 0 renders as "no rating yet" rather than a fabricated score.
    rating: 0,
    reviewCount: 0,
    promo: promo ?? '',
    adminFee: DEFAULT_ADMIN_FEE,
    priceLabel: Number.isFinite(cheapest) ? `$${Math.round(cheapest)}` : '',
    units: spaces,
    imageUrl: p.imageUrl,
  };
}
