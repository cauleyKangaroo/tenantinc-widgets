// ===========================================================================
// Space-group discovery — which space group is the PUBLIC unit list?
//
// The space-groups endpoint (units, prices, promotions) is REST-only: there is no
// Duda collection for it, so a dynamic page cannot bind it the way it binds
// `Properties > id`. And the id is per-property — the configured one belongs to one
// specific facility, so reusing it across dynamic-page rows would list the wrong
// property's units.
//
// Every property carries SEVERAL groups and only the website one is public.
// Verified live 2026-08-04 against the 8 Storelocal properties, e.g.:
//   Dove Mountain → "Website Group", "Close/Closer/Closest to Entrance",
//                   "Trade Show Group", "Rev Management Groups"
//   Lancaster     → "INSIDE UNITS", "HIGH CEILINGS",
//                   "Closet to Office/ Entrance", "Website Group"
// Note Lancaster's website group is LAST — so "just take the first" is wrong, and
// the name is the only reliable signal. Casing is inconsistent in the real data
// ("Website Group" vs "Website group"), hence the case-insensitive match.
//
// Each widget passes its own credentials (from its config.json), so this module
// stays config-agnostic — same pattern as @shared/leadsApi.
// ===========================================================================

export interface SpaceGroupCreds {
  baseUrl: string;
  appId: string;
  apiKey: string;
  companyId: string;
}

interface SpaceGroupsResponse {
  applicationData?: Record<string, Array<{
    data?: { spaceGroups?: Array<{ id?: string; name?: string }> };
  }>>;
}

/**
 * The "Website Group" space-group id for a property.
 *
 * Returns null rather than guessing when nothing matches — picking the trade-show
 * or revenue-management group would silently publish the wrong prices on a live
 * site. Callers fall back to their configured `spaceGroupId`.
 *
 * Fails soft (null) on network/HTTP/parse errors too: a missing space group should
 * degrade to the configured behaviour, not throw out of the widget's data effect.
 */
export async function fetchWebsiteSpaceGroupId(
  cfg: SpaceGroupCreds,
  propertyId: string,
): Promise<string | null> {
  if (!propertyId) return null;

  const url = `${cfg.baseUrl}/applications/${cfg.appId}/v2/companies/${cfg.companyId}/properties/${propertyId}/space-groups`;

  try {
    const res = await fetch(url, {
      headers: {
        'x-storageapi-date': String(Math.floor(Date.now() / 1000)),
        'x-storageapi-key': cfg.apiKey,
      },
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[spaceGroups] list failed for ${propertyId}: ${res.status} ${res.statusText}`);
      return null;
    }

    const json = await res.json() as SpaceGroupsResponse;
    const groups = json?.applicationData?.[cfg.appId]?.[0]?.data?.spaceGroups ?? [];
    // Exact "Website Group" first (what the real data uses), then a looser
    // case/whitespace-tolerant match for "Website group" and friends. Never a
    // substring of something else — "Available Space by Attribute", "Residential"
    // and "test" all sit in the same list and must not win.
    const website =
      groups.find((g) => (g.name ?? '').trim() === 'Website Group')
      ?? groups.find((g) => /^website\s+group$/i.test((g.name ?? '').trim()))
      ?? groups.find((g) => /website/i.test(g.name ?? ''));

    if (!website?.id) {
      // eslint-disable-next-line no-console
      console.warn(
        `[spaceGroups] property ${propertyId} has no "Website" group ` +
        `(found: ${groups.map((g) => g.name).join(', ') || 'none'}) — using the configured id.`,
      );
      return null;
    }
    return website.id;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[spaceGroups] lookup error for ${propertyId}:`, err);
    return null;
  }
}
