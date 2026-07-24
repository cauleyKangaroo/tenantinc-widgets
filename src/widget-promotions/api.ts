import cfg from './config.json';

const BASE_URL = cfg.baseUrl;
const APP_ID = cfg.appId;
const API_KEY = cfg.apiKey;
const COMPANY_ID = cfg.companyId;
const PROPERTY_ID = cfg.propertyId;
const SPACE_GROUP_ID = cfg.spaceGroupId;

// ---------------------------------------------------------------------------
// Raw API response types — only what we read. Promotions live on each tier's
// `allocated_promo`; many tiers share one promo, so we dedupe by id.
// ---------------------------------------------------------------------------

interface ApiAllocatedPromo {
  id: string;
  name: string;          // e.g. "50% OFF FIRST MONTH"
  type: 'fixed' | 'percent' | string;
  label: string;         // "promotion"
  value: number;         // 1 (fixed $) or 50 (percent)
  channel: string;       // "online"
  description: string;
}

interface ApiTier {
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

/** Walk every tier, collect the unique allocated promos (skipping empty {}). */
export function extractPromos(raw: unknown): ApiPromo[] {
  const response = raw as ApiResponse;
  const appEntries = response?.applicationData?.[APP_ID];
  const spaceGroupProfile = appEntries?.[0]?.data?.spaceGroupProfile;
  if (!spaceGroupProfile) return [];

  const seen = new Map<string, ApiPromo>();

  for (const profile of Object.values(spaceGroupProfile)) {
    for (const group of profile.groups ?? []) {
      for (const tier of group.tiers ?? []) {
        const promo = tier.allocated_promo;
        // Empty tiers send `allocated_promo: {}` — only objects with an id count.
        if (!promo || !('id' in promo) || seen.has(promo.id)) continue;
        seen.set(promo.id, {
          id: promo.id,
          title: promo.name,
          info: promo.description || undefined,
        });
      }
    }
  }

  return Array.from(seen.values());
}
