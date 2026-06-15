# Space Widget — API Integration Plan

## Overview

This document is the single source of truth for wiring the `widget-space-list`
to the live TenantInc (Hummingbird) API. It covers every file that will be
created or changed, exactly what goes in each file, why decisions were made the
way they were, and how the code will evolve when the backend proxy is ready.

**Read this before writing a single line of code.**

---

## 1. What We Are Connecting To

Three REST endpoints power the widget. All three live under the same base path.

```
Base: https://edge.tenant.dev/api/v3/applications/{APP_ID}/v2/companies/{COMPANY_ID}

① GET /properties/
   → list of properties for the company

② GET /properties/{propertyId}/space-groups
   → list of space groups for a property

③ GET /properties/{propertyId}/space-groups/{spaceGroupId}/groups
   → all space groups with their tiers (this is what the widget renders)
```

Each request requires two headers:

| Header | Value | Note |
|---|---|---|
| `x-storageapi-key` | API key string | Passed from Duda content panel prop — temporary until proxy |
| `x-storageapi-date` | Unix timestamp (seconds) | Generated at request time: `Math.floor(Date.now() / 1000)` |

All three responses are wrapped in the same envelope:

```json
{
  "message": "success",
  "applicationData": {
    "{APP_ID}": [
      {
        "status": 200,
        "data": { ... }
      }
    ]
  }
}
```

The actual payload is always at:
```
response.applicationData[APP_ID][0].data
```

---

## 2. Constants — Where They Live and Why

### File: `src/shared/api/hummingbird.ts`

`APP_ID` and `COMPANY_ID` are **hardcoded constants in this file only**. They are
never passed as Duda props, never user-configurable, and never duplicated
elsewhere in the codebase.

**Why hardcoded here?**
When the backend proxy is built, the proxy will embed these values server-side.
The widget will stop calling the TenantInc API directly and will call the proxy
instead. At that point, `APP_ID` and `COMPANY_ID` are removed from this file,
`BASE_URL` changes to the proxy URL, and auth headers are dropped. That is a
**one-file change** — no components, no props, no other files touch these values.

```ts
// src/shared/api/hummingbird.ts

// ─── Hardcoded — will be removed when the proxy is live ────────────────────
const APP_ID     = 'appbc35600a675841eea5893df84231789e';
const COMPANY_ID = 'kQoBXpBpnx';
const BASE_URL   = `https://edge.tenant.dev/api/v3/applications/${APP_ID}/v2/companies/${COMPANY_ID}`;
// ───────────────────────────────────────────────────────────────────────────
```

**After proxy migration, those three lines become:**
```ts
const BASE_URL = 'https://your-proxy.example.com/api';
```

That is the entire diff for the proxy cutover in this file.

---

## 3. API Client — Full Structure of `hummingbird.ts`

This file is rewritten from the current stub. It exports three async functions.
No class is needed — plain functions are easier to tree-shake and test.

```
src/shared/api/hummingbird.ts
```

### 3.1 Internal helpers

```ts
// Generates current Unix timestamp — required by the API on every request
function timestamp(): string {
  return String(Math.floor(Date.now() / 1000));
}

// Builds the two auth headers
// apiKey param is removed when switching to proxy
function authHeaders(apiKey: string): Record<string, string> {
  return {
    'x-storageapi-date': timestamp(),
    'x-storageapi-key': apiKey,
  };
}

// Unwraps the envelope every response shares
// applicationData[APP_ID][0].data
function unwrap<T>(json: unknown): T {
  const appData = (json as any).applicationData?.[APP_ID];
  if (!appData?.[0] || appData[0].status !== 200) {
    throw new Error('[Hummingbird] API error: ' + JSON.stringify(json));
  }
  return appData[0].data as T;
}
```

### 3.2 `getSpaceGroups(propertyId, apiKey)`

Called when the Duda editor has not specified a `spaceGroupId`. The widget
auto-picks the first group.

```ts
export async function getSpaceGroups(
  propertyId: string,
  apiKey: string,
): Promise<SpaceGroup[]> {
  const res = await fetch(
    `${BASE_URL}/properties/${propertyId}/space-groups`,
    { headers: authHeaders(apiKey) },
  );
  if (!res.ok) throw new Error(`[Hummingbird] getSpaceGroups HTTP ${res.status}`);
  const json = await res.json();
  return unwrap<{ spaceGroups: SpaceGroup[] }>(json).spaceGroups;
}
```

### 3.3 `getSpaceGroupDetails(propertyId, spaceGroupId, apiKey)`

This is the main call. Returns the full group + tier structure that gets
transformed into `Unit[]`.

```ts
export async function getSpaceGroupDetails(
  propertyId: string,
  spaceGroupId: string,
  apiKey: string,
): Promise<ApiGroup[]> {
  const res = await fetch(
    `${BASE_URL}/properties/${propertyId}/space-groups/${spaceGroupId}/groups`,
    { headers: authHeaders(apiKey) },
  );
  if (!res.ok) throw new Error(`[Hummingbird] getSpaceGroupDetails HTTP ${res.status}`);
  const json = await res.json();
  // Response shape: data.spaceGroupProfile[COMPANY_ID].groups[]
  const profile = unwrap<{ spaceGroupProfile: Record<string, { groups: ApiGroup[] }> }>(json);
  return profile.spaceGroupProfile[COMPANY_ID].groups;
}
```

### 3.4 Raw API types (also in `hummingbird.ts`)

These are the TypeScript shapes of the raw API responses — not the widget's
internal `Unit` type. They exist so the transform function is type-safe.

```ts
export interface SpaceGroup {
  id: string;
  name: string;
  num_spaces: number;
  num_groups: number;
  active: number;
}

export interface ApiAmenity {
  id: string;
  name: string;
  type: string | null;
  value: string;
  sort_order: number;
  available_units: number;
  show_in_website: number;   // 1 = show in feature list on card
  show_in_filter_bar: number; // 1 = show in filter checkboxes
}

export interface ApiPromo {
  id: string;
  name: string;
  type: string;           // "percent" | "fixed"
  label: string;
  value: number;
  description: string;
}

export interface ApiTier {
  id: string;
  description: string;    // "10' x 10'"
  width: string;
  length: string;
  set_rate: number | null;              // rack rate — null in some environments
  sell_rate: number | null;             // online rate — null in some environments
  promotion_sell_rate: number | null;
  promotion_sell_rate_discount: number;
  units: {
    count: number;
    min_price: number;
    max_price: number;
  };
  vacant: {
    count: number;
    min_price: number | null;
    max_price: number | null;
  };
  amenities: ApiAmenity[];
  promo: ApiPromo[];
  allocated_promo: Partial<ApiPromo>;   // {} when no promo
  space_type_associations: Array<{
    unit_type_name: 'storage' | 'parking';
  }>;
}

export interface ApiGroup {
  name: string;
  amenities: ApiAmenity[];
  tiers: ApiTier[];
}
```

---

## 4. Data Transform — `transform.ts`

### File: `src/widget-space-list/transform.ts`

This is a **new file**. Its only job is to map `ApiGroup[]` (raw API shape) into
`Unit[]` (widget's internal shape). It is a pure function with no side effects —
no fetch, no state, no React.

Keeping this separate from `hummingbird.ts` means:
- The API client can be reused across future widgets
- The mapping logic can be unit-tested in isolation
- When the API response shape changes, only this file needs updating

### 4.1 Size classification

The API has no `small` / `medium` / `large` concept. We derive it from
`width × length` (square footage):

```ts
function classifySize(width: string, length: string): 'small' | 'medium' | 'large' {
  const sqft = parseFloat(width) * parseFloat(length);
  if (sqft < 60)  return 'small';
  if (sqft < 150) return 'medium';
  return 'large';
}
```

Thresholds are based on industry standard storage categories:
- Small  → < 60 sqft  (5×5=25, 5×10=50)
- Medium → 60–149 sqft (10×10=100)
- Large  → ≥ 150 sqft  (10×20=200, 20×30=600)

### 4.2 Full field mapping

```
ApiGroup + ApiTier → Unit

tier.id                                    → unit.id
tier.space_type_associations[0]
  .unit_type_name                          → unit.type   ('storage' | 'parking')
classifySize(tier.width, tier.length)      → unit.size
`${tier.width}' x ${tier.length}'`        → unit.dimensions
group.name                                 → unit.subtype
tier.amenities
  .filter(a => a.show_in_website === 1)
  .map(a => a.name)                        → unit.features
tier.amenities
  .filter(a => a.show_in_filter_bar === 1)
  .map(a => a.name)                        → unit.amenities
tier.set_rate ?? tier.units.max_price      → unit.inStorePrice
tier.vacant.min_price
  ?? tier.units.min_price                  → unit.startingPrice
tier.allocated_promo.description           → unit.promo      (undefined if empty)
tier.vacant.count === 1
  ? 'Only 1 left · Rent soon!'            → unit.urgency    (undefined otherwise)
tier.vacant.count === 0
  ? 'waitlist'                             → unit.availability (undefined otherwise)
bundled default image                      → unit.image
```

### 4.3 `transformGroups` function signature

```ts
import type { Unit } from './types';
import type { ApiGroup } from '@shared/api/hummingbird';
import unitImg from './assets/unit-medium.png.png';

export function transformGroups(groups: ApiGroup[]): Unit[] {
  const units: Unit[] = [];

  for (const group of groups) {
    for (const tier of group.tiers) {
      // skip tiers with no price data (incomplete API records)
      if (!tier.units.min_price && !tier.units.max_price) continue;

      units.push({
        id: tier.id,
        type: tier.space_type_associations[0]?.unit_type_name ?? 'storage',
        size: classifySize(tier.width, tier.length),
        dimensions: `${tier.width}' x ${tier.length}'`,
        subtype: group.name,
        features: tier.amenities
          .filter((a) => a.show_in_website === 1)
          .map((a) => a.name),
        amenities: tier.amenities
          .filter((a) => a.show_in_filter_bar === 1)
          .map((a) => a.name),
        image: unitImg,
        inStorePrice: tier.set_rate ?? tier.units.max_price,
        startingPrice: tier.vacant.min_price ?? tier.units.min_price,
        promo: tier.allocated_promo?.description || undefined,
        urgency: tier.vacant.count === 1 ? 'Only 1 left · Rent soon!' : undefined,
        availability: tier.vacant.count === 0 ? 'waitlist' : undefined,
      });
    }
  }

  return units;
}
```

---

## 5. Props Changes — `types.ts`

### File: `src/widget-space-list/types.ts`

Three new props are added to the bottom of `SpaceListProps`. All three are optional
so existing Duda installs without these values continue rendering `DEMO_UNITS`.

```ts
export interface SpaceListProps {
  // ... all existing props unchanged ...

  // ── API connection (temporary — will be removed when proxy is live) ──────
  /**
   * The TenantInc API key. Passed from the Duda content panel.
   * REMOVED when the backend proxy is live (proxy holds the key server-side).
   */
  apiKey?: string;
  /**
   * Property ID to fetch spaces for. Set once by the Duda site editor.
   * e.g. "8W2WA6f9BY"
   */
  apiPropertyId?: string;
  /**
   * Optional space group ID. If omitted, the widget automatically fetches
   * the list of space groups and uses the first one.
   * e.g. "WEj66pIYje"
   */
  apiSpaceGroupId?: string;
}
```

`APP_ID`, `COMPANY_ID`, and the base URL are **not props**. They live only in
`hummingbird.ts` (see Section 2).

---

## 6. SpaceList.tsx — Fetch Logic

### File: `src/widget-space-list/SpaceList.tsx`

This is where the dynamic fetch is wired in. The existing component structure
(filter state, layout, slots) is untouched. Only the data source changes.

### 6.1 New state

```ts
const [units, setUnits]   = useState<Unit[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError]   = useState<string | null>(null);
```

### 6.2 Fetch effect

Runs whenever `apiPropertyId` changes (i.e., the editor picks a different
property in the Duda panel). If no `apiPropertyId` is configured, falls back to
`DEMO_UNITS` so the widget still works in dev and in Duda preview.

```ts
useEffect(() => {
  // No API config → fall back to demo data (dev/preview mode)
  if (!apiPropertyId || !apiKey) {
    setUnits(DEMO_UNITS);
    return;
  }

  let cancelled = false; // prevents state update if component unmounts mid-fetch

  async function load() {
    setLoading(true);
    setError(null);

    try {
      // Step 1: resolve the space group ID
      let groupId = apiSpaceGroupId;
      if (!groupId) {
        const groups = await getSpaceGroups(apiPropertyId!, apiKey!);
        if (!groups.length) throw new Error('No space groups found for this property');
        groupId = groups[0].id;
      }

      // Step 2: fetch full group details and transform
      const rawGroups = await getSpaceGroupDetails(apiPropertyId!, groupId, apiKey!);
      const transformed = transformGroups(rawGroups);

      if (!cancelled) setUnits(transformed);
    } catch (err) {
      if (!cancelled) setError((err as Error).message);
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  load();

  return () => { cancelled = true; };
}, [apiPropertyId, apiSpaceGroupId, apiKey]);
```

### 6.3 Render wiring

`DEMO_UNITS` reference in `visibleUnits` is replaced with the `units` state:

```ts
// BEFORE
const visibleUnits = useMemo(() => filterUnits(DEMO_UNITS, filters), [filters]);

// AFTER
const visibleUnits = useMemo(() => filterUnits(units, filters), [units, filters]);
```

Loading and error are rendered before the main layout:

```tsx
if (loading) return <div className="suf-wrapper suf-loading">Loading spaces…</div>;
if (error)   return <div className="suf-wrapper suf-error">Failed to load spaces: {error}</div>;
```

---

## 7. Dynamic Fetch Chain — Full Flow Diagram

```
SpaceList mounts / apiPropertyId prop changes
        │
        ├─ apiPropertyId missing OR apiKey missing?
        │       └─ setUnits(DEMO_UNITS)   ← dev / preview fallback
        │
        └─ Both present:
                │
                setLoading(true)
                │
                ├─ apiSpaceGroupId provided by Duda editor?
                │       └─ skip to Step 2
                │
                └─ NOT provided:
                        Step 1: GET /properties/{propertyId}/space-groups
                                └─ pick spaceGroups[0].id
                │
                Step 2: GET /properties/{propertyId}/space-groups/{spaceGroupId}/groups
                        └─ response.applicationData[APP_ID][0].data
                                .spaceGroupProfile[COMPANY_ID].groups[]
                │
                transformGroups(rawGroups) → Unit[]
                │
                setUnits(units)
                setLoading(false)
                │
                render: filterUnits(units, filters)
```

---

## 8. All Files Changed — Summary Table

| File | Status | What changes |
|---|---|---|
| `src/shared/api/hummingbird.ts` | Rewrite | Add `APP_ID`, `COMPANY_ID`, `BASE_URL` constants; add `authHeaders()`, `unwrap()`, `timestamp()` helpers; add `SpaceGroup`, `ApiGroup`, `ApiTier`, `ApiAmenity`, `ApiPromo` raw types; implement `getSpaceGroups()` and `getSpaceGroupDetails()` |
| `src/shared/types/index.ts` | Minor edit | Remove unused `HummingbirdClientOptions` and stub `Property` type (superseded by raw types in hummingbird.ts) |
| `src/widget-space-list/transform.ts` | **New file** | `classifySize()` helper + `transformGroups(ApiGroup[]) → Unit[]` |
| `src/widget-space-list/types.ts` | Minor edit | Add `apiKey?`, `apiPropertyId?`, `apiSpaceGroupId?` to `SpaceListProps` |
| `src/widget-space-list/SpaceList.tsx` | Edit | Add `units`/`loading`/`error` state; add `useEffect` fetch chain; replace `DEMO_UNITS` reference with `units` state; add loading/error render guards |

**No component files change.** `FilterPanel`, `GridView`, `ListView`, `UnitCard`,
`ListCard`, `Pricing`, `SectionPanel`, `SectionAccordion` — all untouched.
The `Unit[]` contract is the firewall.

---

## 9. Proxy Migration — What Changes Later

When the backend proxy is ready, the diff is intentionally small:

### `src/shared/api/hummingbird.ts`

```diff
- const APP_ID     = 'appbc35600a675841eea5893df84231789e';
- const COMPANY_ID = 'kQoBXpBpnx';
- const BASE_URL   = `https://edge.tenant.dev/api/v3/applications/${APP_ID}/v2/companies/${COMPANY_ID}`;
+ const BASE_URL   = 'https://your-proxy.example.com/api';

- function authHeaders(apiKey: string): Record<string, string> {
-   return {
-     'x-storageapi-date': String(Math.floor(Date.now() / 1000)),
-     'x-storageapi-key': apiKey,
-   };
- }
+ function authHeaders(): Record<string, string> {
+   return {};  // proxy handles auth server-side
+ }
```

### `src/widget-space-list/types.ts`

```diff
- apiKey?: string;
```

### `src/widget-space-list/SpaceList.tsx`

```diff
- if (!apiPropertyId || !apiKey) {
+ if (!apiPropertyId) {
```

Remove `apiKey` from the destructured props and the `useEffect` dependency array.

**That is the entire proxy migration.** No component, no transform, no type
shape, no Duda layout config changes.

---

## 10. Duda Content Panel Config

The Duda editor will expose these fields for this widget:

| Duda field label | Prop | Type | Notes |
|---|---|---|---|
| API Key | `apiKey` | text | Temporary — remove from panel after proxy goes live |
| Property ID | `apiPropertyId` | text | Required for live data |
| Space Group ID | `apiSpaceGroupId` | text | Optional — leave blank to auto-use first group |
| Layout Mode | `layoutMode` | radio | Grid / List |
| Filter Position | `filterPosition` | dropdown | Left / Top / Right |
| ... | all existing props | — | Unchanged |

---

## 11. What Is NOT Changing

- All CSS (`SpaceList.css`) — untouched
- All filter logic (`filters.ts`) — untouched
- All section logic (`sections.ts`) — untouched
- All card and view components (`components/`) — untouched
- Webpack config, tsconfig, build scripts — untouched
- `widget-hero` and `widget-clock` — untouched
- The `createWidget` Duda lifecycle wrapper — untouched
- `DEMO_UNITS` itself stays in `data.ts` (used as fallback when no API props)

---

## 12. Verification After Implementation

Run these in order after the code is written:

```bash
npm run typecheck   # confirms all new types are correct
npm run build       # confirms the bundle compiles
npm run smoke       # headless render test — update expected counts if needed
npm run dev         # open localhost:3000, enter real propertyId/apiKey in harness
```

For the dev harness (`dev/index.html`), add input fields for `apiKey`,
`apiPropertyId`, and `apiSpaceGroupId` alongside the existing layout dropdowns
so the fetch can be exercised locally without deploying to Duda.

---

## Appendix A — Verified API Credentials & IDs

These values were live-tested on 2026-06-15 and confirmed working.

| Item | Value |
|---|---|
| Company ID | `kQoBXpBpnx` |
| App ID | `appbc35600a675841eea5893df84231789e` |
| API Key | `309365e7685b4b048d79dc7d29bd4f57` |
| Property ID (test) | `8W2WA6f9BY` |
| Space Group ID (first group) | `WEj66pIYje` |

---

## Appendix B — Live API Response Samples

All three endpoints were called and verified. Responses are shown below with
irrelevant fields trimmed for readability. The full raw JSON is the authoritative
source — these samples exist to document the structural shape.

---

### B.1 — GET /properties/

**Request**
```
GET https://edge.tenant.dev/api/v3/applications/appbc35600a675841eea5893df84231789e/v2/companies/kQoBXpBpnx/properties/
x-storageapi-date: <current unix timestamp>
x-storageapi-key: 309365e7685b4b048d79dc7d29bd4f57
```

**Response shape**
```json
{
  "message": "success",
  "applicationData": {
    "appbc35600a675841eea5893df84231789e": [
      {
        "status": 200,
        "data": {
          "properties": [
            {
              "id": "8W2WA6f9BY",
              "company_id": "WEj67IYBe3",
              "name": "test3434234",
              "status": 1,
              "unit_count": 136,
              "lease_count": 23,
              "utc_offset": "America/Los_Angeles",
              "occupancy": 16.91,
              "Address": {
                "address": "12223",
                "city": "Ordino",
                "zip": "92660",
                "country": "Andorra"
              },
              "Phones": [
                { "type": "Main", "phone": "61412345678" }
              ],
              "Emails": [
                { "type": "Main", "email": "a@a.com" }
              ]
            }
          ]
        }
      }
    ]
  }
}
```

**What we use from this response:** `properties[].id` — the property ID passed
to all subsequent calls. In live usage the widget receives the property ID as a
Duda prop and does not need to call this endpoint.

---

### B.2 — GET /properties/{propertyId}/space-groups

**Request**
```
GET .../properties/8W2WA6f9BY/space-groups
x-storageapi-date: <current unix timestamp>
x-storageapi-key: 309365e7685b4b048d79dc7d29bd4f57
```

**Response shape**
```json
{
  "message": "success",
  "applicationData": {
    "appbc35600a675841eea5893df84231789e": [
      {
        "status": 200,
        "data": {
          "spaceGroups": [
            {
              "id": "WEj66pIYje",
              "property_id": "8W2WA6f9BY",
              "name": "test1",
              "description": "tes",
              "active": 1,
              "num_spaces": 136,
              "num_groups": 9
            },
            {
              "id": "oLvp8pUdv9",
              "property_id": "8W2WA6f9BY",
              "name": "Custom",
              "description": "This is a custom group",
              "active": 1,
              "num_spaces": 0,
              "num_groups": 0
            },
            {
              "id": "yVvaVESk2m",
              "property_id": "8W2WA6f9BY",
              "name": "Revman space group",
              "active": 1,
              "num_spaces": 136,
              "num_groups": 8
            }
          ]
        },
        "message": ""
      }
    ]
  }
}
```

**What we use from this response:** `spaceGroups[0].id` — auto-selected when the
Duda editor has not provided an explicit `apiSpaceGroupId` prop.

**Confirmed auto-pick:** First group is `WEj66pIYje` ("test1") with 136 spaces
across 9 groups. This is the group used in all subsequent testing.

---

### B.3 — GET /properties/{propertyId}/space-groups/{spaceGroupId}/groups

**Request**
```
GET .../properties/8W2WA6f9BY/space-groups/WEj66pIYje/groups
x-storageapi-date: <current unix timestamp>
x-storageapi-key: 309365e7685b4b048d79dc7d29bd4f57
```

**Top-level response shape**
```json
{
  "message": "success",
  "applicationData": {
    "appbc35600a675841eea5893df84231789e": [
      {
        "status": 200,
        "data": {
          "spaceGroupProfile": {
            "WEj67IYBe3": {
              "groups": [ ... ]
            }
          },
          "insurance": [ ... ],
          "num_spaces": 136,
          "num_groups": 9
        }
      }
    ]
  }
}
```

**Note on the key:** The `spaceGroupProfile` is keyed by `COMPANY_ID`
(`"WEj67IYBe3"` in this account). This is a different value from the
`kQoBXpBpnx` company ID used in the URL — it is the internal company ID
returned in the property response (`company_id` field). This is why `COMPANY_ID`
in `hummingbird.ts` may need to be the internal ID, not the URL slug. **Verify
this before finalising the `unwrap` logic in `getSpaceGroupDetails`.**

**One group object (trimmed)**
```json
{
  "name": "Access - UAT1 > 18 Wheeler Aisles",
  "amenities": [
    {
      "id": "8W2W8xU9jY",
      "name": "Access",
      "type": null,
      "value": "Access - UAT1",
      "sort_order": 1
    },
    {
      "id": "XNv4Jycrje",
      "name": "18 Wheeler Aisles",
      "type": "boolean",
      "value": "Yes",
      "sort_order": 2
    }
  ],
  "tiers": [
    {
      "id": "ojDmeMahJB",
      "description": "10' x 10'",
      "width": "10",
      "length": "10",
      "set_rate": null,
      "sell_rate": null,
      "promotion_sell_rate": 0,
      "promotion_sell_rate_discount": 0,
      "units": {
        "count": 47,
        "min_price": 100,
        "max_price": 200
      },
      "vacant": {
        "count": 0,
        "min_price": null,
        "max_price": null
      },
      "amenities": [
        {
          "id": "yVvaGYHkjm",
          "name": "Climate Controlled",
          "type": "boolean",
          "value": "Yes",
          "sort_order": 999999,
          "available_units": 0,
          "show_in_website": 0,
          "show_in_filter_bar": 0
        }
      ],
      "promo": [],
      "allocated_promo": {
        "id": "wnB9ZDtrv6",
        "name": "Promotion Test for Payment",
        "type": "percent",
        "label": "promotion",
        "value": 30,
        "description": "30% Off First Month"
      },
      "apw_data": {
        "rentalDays": "2",
        "reservationDays": "5",
        "planStatus": 1,
        "onlineCutOffTime": "4:00 PM"
      },
      "space_type_associations": [
        {
          "is_primary": 1,
          "unit_type_id": "WEj67IYBe3",
          "unit_type_name": "storage"
        }
      ]
    }
  ]
}
```

**One tier with a promo and vacant units (trimmed)**
```json
{
  "id": "MjRZwNPcmj",
  "description": "20' x 30'",
  "width": "20",
  "length": "30",
  "set_rate": null,
  "sell_rate": null,
  "units": {
    "count": 51,
    "min_price": 200,
    "max_price": 200
  },
  "vacant": {
    "count": 46,
    "min_price": 200,
    "max_price": 200
  },
  "allocated_promo": {},
  "space_type_associations": [
    { "unit_type_name": "storage" }
  ]
}
```

---

### B.4 — Key Observations From Live Data

| Observation | Impact on implementation |
|---|---|
| `set_rate` and `sell_rate` are `null` across all test tiers | Use `units.max_price` as `inStorePrice` fallback; use `vacant.min_price ?? units.min_price` as `startingPrice` |
| `vacant.count === 0` and `vacant.min_price === null` for most tiers | These units render as unavailable — use `'waitlist'` for `availability` |
| `allocated_promo` is `{}` (empty object) when no promo applies | Check `allocated_promo.description` with `|| undefined` guard |
| `show_in_website` and `show_in_filter_bar` are both `0` in test data | Test data may not have these flags configured — in production they will be set. Do not hard-filter on these being `1` until confirmed with real facility data |
| `spaceGroupProfile` key is `"WEj67IYBe3"` (internal ID), not `"kQoBXpBpnx"` (URL slug) | **Action required:** confirm whether the internal company ID is constant or per-response. May need to read it dynamically from the property response rather than hardcoding |
| Group `name` field is a compound string: `"Access - UAT1 > 18 Wheeler Aisles"` | Use as `unit.subtype` as-is, or strip the amenity suffix — decide with product team |
| No parking-type units in test data | The `space_type_associations[0].unit_type_name` field drives `unit.type`; test with real facility data that has parking spaces |
| `tier.amenities` array can contain 20+ entries even when `show_in_filter_bar` is `0` | Always filter before mapping — never show raw amenity list directly |
