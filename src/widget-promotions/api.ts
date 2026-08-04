import cfg from './config.json';

const BASE_URL = cfg.baseUrl;
const APP_ID = cfg.appId;
const API_KEY = cfg.apiKey;
const COMPANY_ID = cfg.companyId;
const PROPERTY_ID = cfg.propertyId;
const SPACE_GROUP_ID = cfg.spaceGroupId;

// ---------------------------------------------------------------------------
// Raw API response types — only what we read. Many tiers share one promo, so we
// dedupe by id.
//
// The promo moved fields upstream (seen 2026-07-31): it used to arrive as a
// single `allocated_promo` OBJECT, and now arrives as a `promo` ARRAY, with
// `allocated_promo` left as `{}` on every tier. Both are read below so the
// widget survives the API going either way. `type` also changed from
// 'fixed' | 'percent' to 'regular'; nothing here keys off it.
// ---------------------------------------------------------------------------

interface ApiAllocatedPromo {
  id: string;
  name: string;          // e.g. "50% OFF FIRST MONTH"
  type: string;          // 'regular' (was 'fixed' | 'percent')
  label: string;         // "promotion"
  value: number;         // 1 (fixed $) or 50 (percent)
  channel?: string;      // "online" — absent from the array-shaped payload
  description: string;
}

interface ApiTier {
  /** Current shape. Empty array when the tier has no promotion. */
  promo?: ApiAllocatedPromo[];
  /** Legacy shape — an empty object when unset. */
  allocated_promo?: ApiAllocatedPromo | Record<string, never>;
}

interface ApiGroup {
  tiers: ApiTier[];
}

interface ApiSpaceGroupProfile {
  groups: ApiGroup[];
}

interface ApiResponse {
  applicationData: Record<string, Array<{
    status: number;
    data: { spaceGroupProfile: Record<string, ApiSpaceGroupProfile> };
  }>>;
}

// ---------------------------------------------------------------------------
// Mapped shape the widget consumes (mirrors the Promo interface in Promotions.tsx)
// ---------------------------------------------------------------------------

export interface ApiPromo {
  id: string;
  title: string;
  info?: string;
}

// ---------------------------------------------------------------------------
// Fetch + extract
// ---------------------------------------------------------------------------

/**
 * Promotions for one property's space group. Both ids are overridable so a Duda
 * DYNAMIC PAGE can bind `propertyId` to `Properties > id`; the space group is not a
 * column on that collection, so it is either supplied explicitly or resolved from
 * the property's "Website Group" (see #05 `fetchWebsiteSpaceGroupId`).
 */
export async function fetchSpaceGroups(
  propertyId: string = PROPERTY_ID,
  spaceGroupId: string = SPACE_GROUP_ID,
): Promise<unknown> {
  const url = `${BASE_URL}/applications/${APP_ID}/v2/companies/${COMPANY_ID}/properties/${propertyId}/space-groups/${spaceGroupId}/groups`;

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

/**
 * Every promotion attached to a tier, newest field shape first. Returns [] for
 * a tier with no promo — `promo` is an empty array and `allocated_promo` an
 * empty object in that case, neither of which yields an entry.
 */
function tierPromos(tier: ApiTier): ApiAllocatedPromo[] {
  if (Array.isArray(tier.promo)) return tier.promo.filter((p) => p && p.id);
  // `in` doesn't narrow away Record<string, never> (every key is optional-never),
  // so assert once the id check has passed.
  const legacy = tier.allocated_promo;
  return legacy && 'id' in legacy ? [legacy as ApiAllocatedPromo] : [];
}

/** Walk every tier, collect the unique promos. */
export function extractPromos(raw: unknown): ApiPromo[] {
  const response = raw as ApiResponse;
  const appEntries = response?.applicationData?.[APP_ID];
  const spaceGroupProfile = appEntries?.[0]?.data?.spaceGroupProfile;
  if (!spaceGroupProfile) return [];

  const seen = new Map<string, ApiPromo>();

  for (const profile of Object.values(spaceGroupProfile)) {
    for (const group of profile.groups ?? []) {
      for (const tier of group.tiers ?? []) {
        for (const promo of tierPromos(tier)) {
          if (seen.has(promo.id)) continue;
          seen.set(promo.id, {
            id: promo.id,
            title: promo.name,
            info: promo.description || undefined,
          });
        }
      }
    }
  }

  return Array.from(seen.values());
}
