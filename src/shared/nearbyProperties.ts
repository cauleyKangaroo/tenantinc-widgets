// Shared nearby-properties data layer, used by #07 nearby-locations and the
// #05 space-list "Nearby Storage" accordion section. Each widget passes its own
// API credentials (from its config.json) so this stays config-agnostic.
//
//   • fetchProperties()      – all company properties (lat/lng, name, address, phone)
//   • extractNearbyProperties() – map the response to base cards with coordinates
//   • getUserLocation()      – browser geolocation (allow/deny prompt), or null
//   • haversineMiles()       – great-circle distance
//   • fetchPropertySpaces()  – per-property spaces + promo via the space-groups calls

import {
  fetchPropertiesPreferCollection,
  type PropertiesSourceOptions,
} from './propertiesSource';

export interface NearbyApiConfig {
  baseUrl: string;
  appId: string;
  apiKey: string;
  companyId: string;
}

export interface NearbySpace {
  size: string;
  subtype: string;
  inStorePrice: number;
  startingPrice: number;
}

/** A property before distance/spaces/promo are attached. */
export interface NearbyBaseProperty {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /**
   * Did the API actually give coordinates? **False** → lat/lng are 0
   * placeholders and must not be plotted or measured; only ever false when the
   * caller passed `requireCoords: false` (see extractNearbyProperties).
   *
   * Optional, and absent means "assume yes": the default extraction drops
   * coordinate-less rows anyway, and hand-written fixtures shouldn't have to
   * restate it. Test with `hasCoords !== false`, never a bare truthiness check.
   */
  hasCoords?: boolean;
  address: string;
  /** Raw city/state off the Address object — for filtering (see #08 map-locations). */
  city?: string;
  state?: string;
  /**
   * `state/city/property-name-<id>` — the property's page path. Kept because it,
   * not Address, is what the nav's links are built from; see the note at the
   * assignment in extractNearbyProperties.
   */
  slug?: string;
  phone: string;
  /** First facility photo URL from the API, if any (else undefined → placeholder). */
  imageUrl?: string;
}

const headers = (cfg: NearbyApiConfig) => ({
  'x-storageapi-date': String(Math.floor(Date.now() / 1000)),
  'x-storageapi-key': cfg.apiKey,
});

const companyBase = (cfg: NearbyApiConfig) =>
  `${cfg.baseUrl}/applications/${cfg.appId}/v2/companies/${cfg.companyId}`;

// ---------------------------------------------------------------------------
// Raw response types (only what we read)
// ---------------------------------------------------------------------------

interface ApiAddress {
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  formatted_address?: string | null;
  lat?: number;
  lng?: number;
}

interface ApiPhone { phone?: string; number?: string; status?: number; }

interface ApiPropertyRaw {
  id: string;
  name?: string;
  Address?: ApiAddress | '';
  Phones?: ApiPhone[] | '';
  Images?: unknown[] | '';
  /** `state/city/property-name-<id>` — the page path. */
  slug?: string;
}

interface PropertiesResponse {
  applicationData: Record<string, Array<{ status: number; data: { properties: ApiPropertyRaw[] } }>>;
}

interface ApiSpaceGroup { id: string; name?: string; }
interface SpaceGroupsResponse {
  applicationData: Record<string, Array<{ status: number; data: { spaceGroups: ApiSpaceGroup[] } }>>;
}

interface ApiAmenity { name: string; value?: string; type?: string | null; sort_order?: number; show_in_website?: number; }
interface ApiTier {
  description: string;
  sell_rate: number | null;
  set_rate: number | null;
  units?: { count: number; min_price: number | null; max_price: number | null };
  vacant?: { count: number };
  amenities?: ApiAmenity[];
  allocated_promo?: { id?: string; name?: string } | Record<string, never>;
}
interface ApiGroup { name: string; tiers: ApiTier[]; }
interface GroupsResponse {
  applicationData: Record<string, Array<{ status: number; data: { spaceGroupProfile: Record<string, { groups: ApiGroup[] }> } }>>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (local.length !== 10) return raw;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

function buildAddress(a: ApiAddress): string {
  if (a.formatted_address) return a.formatted_address;
  const line1 = [a.address, a.address2].map((s) => s?.trim()).filter(Boolean).join(' ');
  return [line1, a.city, `${a.state ?? ''} ${a.zip ?? ''}`.trim()].filter(Boolean).join(', ');
}

/** First usable image URL from the API's Images array (string or object shape). */
function firstImageUrl(images: unknown): string | undefined {
  if (!Array.isArray(images) || images.length === 0) return undefined;
  const first = images[0];
  if (typeof first === 'string') return first.trim() || undefined;
  if (first && typeof first === 'object') {
    const o = first as Record<string, unknown>;
    for (const key of ['url', 'image', 'src', 'path', 'full', 'large', 'original', 'thumbnail']) {
      const v = o[key];
      if (typeof v === 'string' && v.trim()) return v;
    }
  }
  return undefined;
}

// boolean/"Yes" amenities → the name is the label; otherwise the value is.
function amenityLabel(a: ApiAmenity): string {
  return a.type === 'boolean' || a.value === 'Yes' || a.value === 'No' ? a.name : (a.value ?? a.name);
}

/** Great-circle distance in miles between two lat/lng points. */
export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8; // Earth radius, miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Card-ready distance label: thousands separator, decimals dropped.
 *   5183.9 → "5,183 Miles"    1.7 → "1 Miles"
 * Truncates rather than rounds, per the spec'd example (5183.9 → 5,183).
 */
export function formatDistance(miles: number): string {
  return `${Math.trunc(miles).toLocaleString('en-US')} Miles`;
}

/** Browser geolocation, resolving null on denial/error/timeout (never rejects). */
export function getUserLocation(timeoutMs = 8000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 5 * 60 * 1000 },
    );
  });
}

// ---------------------------------------------------------------------------
// Fetches
// ---------------------------------------------------------------------------

export async function fetchProperties(
  cfg: NearbyApiConfig,
  opts: PropertiesSourceOptions = {},
): Promise<unknown> {
  // Duda's "Properties" collection first (no API key, no round trip); the keyed
  // call is the fallback. Same envelope either way — see @shared/propertiesSource.
  return fetchPropertiesPreferCollection(cfg.appId, async () => {
    const res = await fetch(`${companyBase(cfg)}/properties?unit_type_counts=true`, { headers: headers(cfg) });
    if (!res.ok) throw new Error(`fetchProperties failed: ${res.status} ${res.statusText}`);
    return res.json();
  }, opts);
}

/**
 * Properties mapped to the base card shape.
 *
 * By default only those with usable coordinates: #07 and #05's nearby section
 * rank by distance, so a property that can't be placed can't be ranked.
 *
 * `requireCoords: false` keeps the rest, for a consumer that lists by something
 * other than distance — #08's city page groups by `Address.city`. It matters:
 * verified live 2026-08-13 that ALL SEVEN properties on the current company have
 * `lat: null, lng: null`, so the default would drop every one of them and render
 * an empty page. Coordinate-less rows come back with lat/lng 0 and `hasCoords`
 * false, so callers can hide the map and distances instead of plotting them off
 * the coast of Africa.
 */
export function extractNearbyProperties(
  raw: unknown,
  appId: string,
  opts: { requireCoords?: boolean } = {},
): NearbyBaseProperty[] {
  const { requireCoords = true } = opts;
  const response = raw as PropertiesResponse;
  const list = response?.applicationData?.[appId]?.[0]?.data?.properties ?? [];
  const out: NearbyBaseProperty[] = [];

  for (const p of list) {
    const addr = p.Address && typeof p.Address === 'object' ? p.Address : null;
    if (!addr) continue;
    const hasCoords = typeof addr.lat === 'number' && typeof addr.lng === 'number';
    if (requireCoords && !hasCoords) continue;
    const firstPhone = Array.isArray(p.Phones) ? p.Phones.find((ph) => ph.status !== 0) : undefined;
    out.push({
      id: p.id,
      name: p.name ?? '',
      // 0/0 rather than null keeps the type a plain number for the distance and
      // map maths; `hasCoords` is the flag callers must check first.
      lat: hasCoords ? (addr.lat as number) : 0,
      lng: hasCoords ? (addr.lng as number) : 0,
      hasCoords,
      address: buildAddress(addr),
      // Kept separate from the formatted address so a city page can filter on it
      // exactly, rather than substring-matching "…, Irvine, CA 92620".
      city: (addr.city ?? '').trim(),
      state: (addr.state ?? '').trim(),
      // The slug is the PAGE URL, so a /locations/{state}/{city} page has to be
      // able to match on it — the nav builds those links from the slug, and the
      // slug and Address disagree on three live properties. Address alone would
      // leave a nav link resolving to an empty page.
      slug: typeof p.slug === 'string' ? p.slug.trim() : '',
      phone: firstPhone ? formatPhone(firstPhone.phone ?? firstPhone.number ?? '') : '',
      imageUrl: firstImageUrl(p.Images),
    });
  }
  return out;
}

/**
 * Fetch a property's spaces (cheapest few, in-store + starting price) and its
 * first promotion title, via the space-groups list → groups chain. Returns
 * empty data (never throws) so one property's failure can't break the grid.
 */
export async function fetchPropertySpaces(
  cfg: NearbyApiConfig,
  propertyId: string,
): Promise<{ promo?: string; spaces: NearbySpace[] }> {
  const base = companyBase(cfg);
  try {
    const listRes = await fetch(`${base}/properties/${propertyId}/space-groups`, { headers: headers(cfg) });
    if (!listRes.ok) return { spaces: [] };
    const listJson = (await listRes.json()) as SpaceGroupsResponse;
    const groups = listJson?.applicationData?.[cfg.appId]?.[0]?.data?.spaceGroups ?? [];
    // Prefer the "Website group" (public-facing), else the first available.
    const sg = groups.find((g) => /website/i.test(g.name ?? '')) ?? groups[0];
    if (!sg) return { spaces: [] };

    const grpRes = await fetch(`${base}/properties/${propertyId}/space-groups/${sg.id}/groups`, { headers: headers(cfg) });
    if (!grpRes.ok) return { spaces: [] };
    const grpJson = (await grpRes.json()) as GroupsResponse;
    const profile = grpJson?.applicationData?.[cfg.appId]?.[0]?.data?.spaceGroupProfile;
    if (!profile) return { spaces: [] };

    const tiers: ApiTier[] = [];
    for (const prof of Object.values(profile)) for (const g of prof.groups ?? []) tiers.push(...(g.tiers ?? []));

    let promo: string | undefined;
    const spaces: NearbySpace[] = [];
    for (const t of tiers) {
      if (!promo && t.allocated_promo && 'id' in t.allocated_promo && t.allocated_promo.name) {
        promo = t.allocated_promo.name;
      }
      // Only offer tiers that have vacancy and a real starting price.
      if ((t.vacant?.count ?? 0) <= 0) continue;
      const startingPrice = t.sell_rate ?? t.units?.min_price ?? 0;
      if (startingPrice <= 0) continue;
      const website = [...(t.amenities ?? [])]
        .filter((a) => a.show_in_website === 1)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      spaces.push({
        size: t.description,
        subtype: website[0] ? amenityLabel(website[0]) : '',
        inStorePrice: t.set_rate ?? t.units?.max_price ?? 0,
        startingPrice,
      });
    }

    // Cheapest three, so the card leads with the best-value spaces.
    const ranked = spaces.sort((a, b) => a.startingPrice - b.startingPrice).slice(0, 3);
    return { promo, spaces: ranked };
  } catch {
    return { spaces: [] };
  }
}
