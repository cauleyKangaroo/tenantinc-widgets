import type { Unit, UnitSize } from './types';
import cfg from './config.json';
import { spaceImageFor } from './spaceImages';

const BASE_URL = cfg.baseUrl;
const APP_ID = cfg.appId;
const API_KEY = cfg.apiKey;
const COMPANY_ID = cfg.companyId;
const PROPERTY_ID = cfg.propertyId;
const SPACE_GROUP_ID = cfg.spaceGroupId;

// ---------------------------------------------------------------------------
// Raw API response types
// ---------------------------------------------------------------------------

interface ApiAmenity {
  id: string;
  name: string;
  type: string | null;
  value: string;
  sort_order?: number;
  show_in_website?: number;
  show_in_filter_bar?: number;
  available_units?: number;
}

interface ApiSpaceTypeAssociation {
  is_primary: number;
  unit_type_id: string;
  unit_type_name: string;
}

interface ApiTier {
  id: string;
  tier_id: string;
  description: string;   // e.g. "10' x 10'" — used directly as Unit.dimensions
  width: string;
  length: string;
  set_rate: number | null;
  sell_rate: number | null;
  promotion_sell_rate: number | null;
  promotion_sell_rate_discount: number;
  units:  { count: number; min_price: number | null; max_price: number | null };
  vacant: { count: number; min_price: number | null; max_price: number | null };
  amenities: ApiAmenity[];
  space_type_associations: ApiSpaceTypeAssociation[];
  /**
   * Promotion(s) on this tier. The API moved shapes (seen 2026-07-31): it used
   * to send a single `allocated_promo` OBJECT and now sends a `promo` ARRAY,
   * with `allocated_promo` left as `{}` on every tier. Both are read so the
   * promo badge — and the #06 "See Qualifying Units" hand-off, which matches on
   * `promoId` — keep working whichever way the API goes. Mirrors
   * `tierPromos` in widget-promotions/api.ts.
   */
  promo?: Array<{ id?: string; name?: string }>;
  allocated_promo?: { id?: string; name?: string } | Record<string, never>;
}

interface ApiGroup {
  name: string;
  amenities: ApiAmenity[];
  tiers: ApiTier[];
}

interface ApiSpaceGroupProfile {
  groups: ApiGroup[];
}

interface ApiResponse {
  message: string;
  applicationData: Record<string, Array<{
    status: number;
    data: {
      spaceGroupProfile: Record<string, ApiSpaceGroupProfile>;
    };
  }>>;
}

// ---------------------------------------------------------------------------
// Size classification — width × length area (sq ft) → UnitSize
// ---------------------------------------------------------------------------

/**
 * Area (sq ft) → size bucket, per the client's guide (2026-07-30):
 *
 *   Small        ≤ 50    5×5, 5×10
 *   Medium    51–150     8×10, 8×12, 10×10, 10×15
 *   Large    151–300     10×20, 10×22, 10×25, 10×30, 15×20 (and 20×15, also 300)
 *   Extra Large  > 300   15×30, 20×30
 *
 * The previous thresholds (24 / 76 / 151) put every live tier but the two largest
 * in the wrong bucket — 5×10 read as Medium, 10×10 as Large, 10×20 as Extra Large.
 *
 * `other` is kept for a tier whose width/length don't parse (area 0), so it can't
 * silently land in Small. `extra_small` is no longer produced — it stays in the
 * UnitSize union because the label/open-state maps are keyed on the full union.
 */
export function classifySize(area: number): UnitSize {
  if (area <= 0) return 'other';
  if (area <= 50) return 'small';
  if (area <= 150) return 'medium';
  if (area <= 300) return 'large';
  return 'extra_large';
}

// boolean amenities → the name IS the label (e.g. "Climate Controlled", not "Yes")
// string/text/null amenities → the value IS the label (e.g. "Drive-Up Access", not "Access")
function amenityLabel(a: ApiAmenity): string {
  return a.type === 'boolean' || a.value === 'Yes' || a.value === 'No'
    ? a.name
    : a.value;
}

/**
 * The tier's promotion, or null when it has none — reading the current `promo`
 * array first and falling back to the legacy `allocated_promo` object (see the
 * note on ApiTier). Empty tiers send `promo: []` / `allocated_promo: {}`,
 * neither of which counts; only an entry with an id does.
 */
function tierPromo(tier: ApiTier): { id?: string; name?: string } | null {
  const fromArray = tier.promo?.find((p) => p && p.id);
  if (fromArray) return fromArray;
  const legacy = tier.allocated_promo;
  return legacy && 'id' in legacy ? legacy : null;
}

// ---------------------------------------------------------------------------
// Mapper — raw API response → Unit[]
// ---------------------------------------------------------------------------

export function mapApiToUnits(raw: unknown): Unit[] {
  const response = raw as ApiResponse;
  const appEntries = response?.applicationData?.[APP_ID];
  if (!appEntries?.length) return [];

  const spaceGroupProfile = appEntries[0]?.data?.spaceGroupProfile;
  if (!spaceGroupProfile) return [];

  const units: Unit[] = [];

  for (const profile of Object.values(spaceGroupProfile)) {
    for (const group of profile.groups ?? []) {
      for (const tier of group.tiers ?? []) {
        const width = parseFloat(tier.width) || 0;
        const length = parseFloat(tier.length) || 0;
        const area = width * length;
        const size = classifySize(area);

        const primaryAssoc = tier.space_type_associations?.find((a) => a.is_primary === 1);
        const type: Unit['type'] = primaryAssoc?.unit_type_name === 'parking' ? 'parking' : 'storage';

        // Storage: only show_in_website:1 amenities. Parking: all amenities
        // (parking data rarely sets show_in_website:1, so the filter would leave cards empty).
        const sortedUnique = [...(tier.amenities ?? [])]
          .filter((a) => type === 'parking' || a.show_in_website === 1)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .filter((a, i, arr) => arr.findIndex((x) => x.name === a.name) === i);

        const subtype = sortedUnique[0] ? amenityLabel(sortedUnique[0]) : group.name;
        const features = sortedUnique.slice(1, 5).map(amenityLabel);
        const amenityNames = sortedUnique.map(amenityLabel);
        const filterBarFeatures = Array.from(new Set(
          (tier.amenities ?? [])
            .filter((a) => a.show_in_filter_bar === 1 && (a.available_units ?? 1) > 0)
            .map(amenityLabel)
        ));

        const vacantCount = tier.vacant?.count ?? 0;

        // Which min_price to quote (per Jaweed, 2026-07-30): a tier with vacancy is
        // quoted from `vacant.min_price` — the cheapest unit a customer can actually
        // rent — and only a tier with nothing vacant falls back to the whole-tier
        // `units.min_price`.
        //
        // Not cosmetic: 10'x10' reports units.min_price 0 across all 267 units (some
        // occupied at a legacy/zero rate) while its 125 vacant units start at 70, so
        // the card was advertising $0.00.
        //
        // `>= 1`, not `> 1`: the spec said "more than 1" / "0 or less" and left 1
        // unstated — one vacant unit still has a real vacant price. No live tier is
        // affected either way (the single vacant.count === 1 tier, 8'x12', reports
        // 116 in both objects).
        const availableMinPrice =
          vacantCount >= 1 ? tier.vacant?.min_price : tier.units?.min_price;

        // sell_rate stays the leading preference for when the API starts setting it;
        // it is null on every tier today, so the rule above governs in practice.
        const startingPrice =
          tier.sell_rate ?? availableMinPrice ?? tier.units?.min_price ?? 0;
        const inStorePrice = tier.set_rate ?? tier.units?.max_price ?? 0;

        // Promotion allocated to this tier (matched against the Promotions
        // widget by id). A tier carries at most one today, so take the first.
        const promo = tierPromo(tier);

        units.push({
          id: tier.id,
          type,
          size,
          dimensions: tier.description,
          subtype,
          features,
          amenities: amenityNames,
          filterBarFeatures,
          vacantCount,
          // DEMO: derive card image from dimensions/size/type until the API
          // returns one per unit — see spaceImages.ts.
          image: spaceImageFor({ type, dimensions: tier.description, size, subtype }),
          inStorePrice,
          startingPrice,
          promoId: promo?.id,
          promo: promo?.name || undefined,
        });
      }
    }
  }

  return units;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

export async function fetchSpaceGroups(): Promise<unknown> {
  const url = `${BASE_URL}/applications/${APP_ID}/v2/companies/${COMPANY_ID}/properties/${PROPERTY_ID}/space-groups/${SPACE_GROUP_ID}/groups`;

  const res = await fetch(url, {
    headers: {
      'x-storageapi-date': String(Math.floor(Date.now() / 1000)),
      'x-storageapi-key': API_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`fetchSpaceGroups failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
