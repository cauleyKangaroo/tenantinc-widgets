# Space List widget — backend handoff

This widget is a **fully working front end** running on static demo data. Your
job is to replace the static data with live data from Hummingbird. The UI,
filtering, grid/list views, and responsive layout are done and need no changes.

## TL;DR — the one thing to change

Everything the widget renders comes from `DEMO_UNITS` in [`data.ts`](./data.ts).
Replace that static array with units fetched from Hummingbird, keeping the same
`Unit[]` shape, and the whole widget keeps working.

```ts
// data.ts today
export const DEMO_UNITS: Unit[] = [ /* hand-written demo units */ ];
```

The component reads it in [`SpaceList.tsx`](./SpaceList.tsx):

```tsx
const visibleUnits = useMemo(() => filterUnits(DEMO_UNITS, filters), [filters]);
```

## The data contract — `Unit`

This is the shape every component renders against (see [`types.ts`](./types.ts)).
As long as Hummingbird data is mapped into this shape, nothing else changes:

```ts
interface Unit {
  id: string;
  type: 'storage' | 'parking';
  size: 'small' | 'medium' | 'large';
  dimensions: string;     // "5' x 5'"
  subtype: string;        // "Climate Controlled"
  features: string[];     // bullet list on the card
  amenities: string[];    // matched against the amenity checkboxes
  image: string;          // absolute URL
  inStorePrice: number;   // strike-through price
  startingPrice: number;  // main "starting at" price
  adminFee?: number;      // optional "+ Plus $X Admin Fee"
  promo?: string;         // optional promo badge text
  urgency?: string;       // optional "Only 1 left ..." line
}
```

Both views derive from this single flat array:
- **Grid view** — units grouped by `size` into accordions, one card per unit.
- **List view** — units grouped by `size`, one row per size, each unit's
  `dimensions` shown as a selectable pill.

## How to wire in Hummingbird

Widgets must **not** call Hummingbird directly or hold any API key — all
requests go through the server-side proxy (see the repo README and
`src/shared/api/hummingbird.ts`). The proxy URL is passed in at runtime, never
bundled.

Recommended approach: fetch in `SpaceList.tsx` and keep `filterUnits` as-is.

```tsx
const [units, setUnits] = useState<Unit[]>([]);

useEffect(() => {
  // proxyBaseUrl comes from props/additionalData — never a hardcoded secret.
  fetch(`${proxyBaseUrl}/spaces?tenantId=${tenantId}`)
    .then((r) => r.json())
    .then((raw) => setUnits(raw.map(mapHummingbirdToUnit)));
}, [proxyBaseUrl, tenantId]);

const visibleUnits = useMemo(() => filterUnits(units, filters), [units, filters]);
```

You'll want to add loading/error states. `proxyBaseUrl`/`tenantId` can be passed
from the Duda JS via `props` (or `additionalData`); coordinate with whoever owns
the Duda Widget Builder config.

## Filtering semantics (in [`filters.ts`](./filters.ts))

These are sensible defaults for the demo — **tune them to match the real
product rules**:

- **type** — single select; unit must match.
- **sizes** — multi select, OR within the group; empty = all sizes.
- **features** — multi select, OR within the group; empty = all. A feature
  matches if the unit's `subtype`/`features`/`amenities` include the feature's
  label (e.g. "Climate Controlled").
- **amenities** — multi select, AND; unit must have *every* checked amenity.

> ⚠️ **Known demo quirk:** the default filters are `type=storage`,
> `features=['climate']`, `amenities=['Smart Phone Access','Ground Floor']`.
> Because amenities use AND and no demo parking unit is climate-controlled,
> selecting **Parking** with the defaults shows zero results (the empty-state
> message). This is the filter logic behaving correctly on the placeholder
> data — with real Hummingbird data and/or tuned defaults it resolves itself.
> Adjust `DEFAULT_FILTERS` / the semantics above as the product requires.

## Content-panel props (from Duda)

Set by the site editor, passed straight through as props — no backend work
needed, listed here for completeness:

| Prop | Values | Effect |
|---|---|---|
| `layoutMode` | `grid` \| `list` | which view renders |
| `filterPosition` | `left` \| `top` \| `right` | filter panel placement |
| `additionalPanelMode` | `single` \| `all` | AP shows one section, or all sections as an accordion |
| `additionalPanelSection` | `none` \| section key | section shown in the AP when mode is `single` |
| `additionalPanelPosition` | `left` \| `right` \| `bottom` | where the Additional Panel sits |

Section keys: `reviews`, `features`, `nearby`, `store`, `notes`, `faqs`, `hours`.
The Additional Panel can't share the filter panel's side (e.g. filter right ⇒ AP
left or bottom); the widget falls back to bottom if a colliding combo is sent.
In `all` mode `additionalPanelSection` is ignored (Duda hides it via conditional
logic); the AP renders every section as a collapsible accordion.

## Content sections (also placeholder, also a seam)

The sections (Customer Reviews, Features, Hours, etc.) are currently **dummy
titled containers** — see [`sections.ts`](./sections.ts) and
[`components/SectionPanel.tsx`](./components/SectionPanel.tsx). `sections.ts` is
the seam for their real content the same way `data.ts` is for units: add fields
to `Section` (and any fetching) and render them in `SectionPanel`. The layout
(`SpaceList.tsx`) and the AP placement logic don't change. Some sections
(reviews, hours) will likely be Hummingbird-backed via the proxy; others may be
editor-authored content passed in as props.

## File map

| File | Role |
|---|---|
| `data.ts` | **← your main edit.** Static units + filter option lists |
| `types.ts` | `Unit` and prop types — the data contract |
| `filters.ts` | Filtering + grouping logic and defaults |
| `SpaceList.tsx` | Top-level: owns filter state, applies `filterUnits` |
| `components/` | Presentational components (no data fetching) |
| `SpaceList.css` | Styles (bundled into the JS at build via style-loader) |

## Verifying your changes

- `npm run typecheck` — confirms your data still matches the `Unit` contract.
- `npm run smoke` — headless render + filtering smoke test (`dev/smoke-test.js`).
  Update its expected counts if you change the demo/default data.
- `npm run dev` then open http://localhost:3000 — interactive harness with
  dropdowns for `layoutMode` / `filterPosition`.
