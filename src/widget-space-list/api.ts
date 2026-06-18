import type { Unit, UnitSize } from './types';

const BASE_URL = process.env.WIDGET_BASE_URL as string;
const APP_ID = process.env.WIDGET_APP_ID as string;
const API_KEY = process.env.WIDGET_API_KEY as string;
const PROPERTY_ID = process.env.WIDGET_PROPERTY_ID as string;
const SPACE_GROUP_ID = process.env.WIDGET_SPACE_GROUP_ID as string;

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
  units: { count: number; min_price: number | null; max_price: number | null };
  vacant: { count: number; min_price: number | null; max_price: number | null };
  amenities: ApiAmenity[];
  space_type_associations: ApiSpaceTypeAssociation[];
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

export function classifySize(area: number): UnitSize {
  if (area === 0) return 'other';
  if (area === 1) return 'extra_small';
  if (area <= 24) return 'small';
  if (area <= 76) return 'medium';
  if (area <= 151) return 'large';
  return 'extra_large';
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

        const amenityNames = Array.from(new Set((tier.amenities ?? []).map((a) => a.name)));

        const startingPrice = tier.sell_rate ?? tier.units?.min_price ?? 0;
        const inStorePrice = tier.set_rate ?? tier.units?.max_price ?? 0;

        units.push({
          id: tier.id,
          type,
          size,
          dimensions: tier.description,
          subtype: group.name,
          features: amenityNames.slice(0, 7),
          amenities: amenityNames,
          image: '',
          inStorePrice,
          startingPrice,
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
  const url = `${BASE_URL}/properties/${PROPERTY_ID}/space-groups/${SPACE_GROUP_ID}/groups`;

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
