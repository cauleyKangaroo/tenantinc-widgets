# tenantinc-widgets — project context

React/TypeScript widgets bundled as AMD and loaded into Duda sites via
`api.scripts.renderExternalApp(...)`. Bundles are served from GitHub Pages
(`https://cauleykangaroo.github.io/tenantinc-widgets/dist/widget-*.js`) — Pages
serves the **`master`** branch, which is production on live customer sites.
`dist/` is committed (not gitignored). See `README.md` for the framework basics
and `src/shared/createWidget.tsx` for the Duda mount bridge.

---

## Widgets

Numbering is the single source of truth in `webpack.config.js` (`widgetEntries`).

| #  | Widget                   | Source dir                     |
|----|--------------------------|--------------------------------|
| 01 | widget-utility-bar       | `src/widget-utility-bar/`      |
| 02 | widget-navigation-bar    | `src/widget-navigation-bar/`   |
| 03 | widget-property-info     | `src/widget-property-info/`    |
| 05 | widget-space-list        | `src/widget-space-list/`       |
| 06 | widget-promotions        | `src/widget-promotions/`       |
| 07 | widget-nearby-locations  | `src/widget-nearby-locations/` |
| 09 | widget-reviews           | `src/widget-reviews/`          |
| 10 | widget-faqs              | `src/widget-faqs/`             |
| 11 | widget-size-guide        | `src/widget-size-guide/`       |
| 12 | widget-blogs-listing     | `src/widget-blogs-listing/`    |
| 13 | widget-footer            | `src/widget-footer/`           |
| 14 | widget-tier-selection    | `src/widget-tier-selection/`   |

Widget **#14 widget-tier-selection** lives on the **value tiers page** (there is
also a property landing page in the dev harness).

---

## widget-tier-selection (#14) — Value Tiers

Storage-tier chooser (Good / Better / Best) built figma-perfect from the Mariposa
Duda file. **One widget, three interchangeable layouts** via a `variant` prop
(`'option1'` | `'option2'` | `'option3'`, default `option1`); each is responsive
(desktop + mobile). The dev harness "Value Tiers page" tab has a **Layout**
dropdown that re-inits the widget with each variant.

- **Option 1** — tier selector (pills) + comparison table + order-summary card.
  Desktop: two columns. Mobile (<640px, measured via `ResizeObserver` on the
  wrapper): centred header, stacked selector, collapsible "Total Cost to Move-In".
- **Option 2** — three Good/Better/Best pricing cards. Desktop: 3 columns with a
  "Most Popular" badge on Better. Mobile: accordion — one expanded card (dark
  outline; badge only on the popular one), others collapse to summary bars.
- **Option 3** — pricing cards fused with a comparison table; the Better column is
  one bordered box spanning card + table rows. Narrow widths scroll horizontally
  (no dedicated mobile frame yet).

Details:
- Selected/popular outline is **2px** `#101318` across all layouts.
- **"Pricing Details"** (Options 2 & 3) shows a dark breakdown tooltip on hover:
  fades in/out, `cursor: help`, `position: fixed` tracking the mouse (mouse at the
  tooltip's top-centre), `pointer-events: none`. See `PricingDetails` in
  `TierSelection.tsx`.
- Icons are inline SVG traced from Figma (`icons.tsx`) — rounded promo star,
  circle-check, plain check, tag, play-circle, info, chevron, map-pin, phone.
  Payment brand marks are inline SVG in `paymentIcons.tsx` (self-contained; the
  AMD bundle can't load remote assets). Building/unit photos use bundled demo
  imagery from `@shared/demoImages`.
- Each layout carries its **own demo dataset** (`TIERS`/`ROWS`, `OPTION2`,
  `OPTION3`/`ROWS3`) because the Figma frames used inconsistent placeholder
  numbers — real values will come from Duda/Hummingbird later.
- Fonts: heading weights are **700** (matches the other widgets), not the Figma's
  600 token.

---

## CURRENT WORK IN PROGRESS — Sidebar accordion reordering

**Branch:** `space-list-ordering` (off `master`). **Status (2026-06-29): working
end-to-end on a staging Duda site.** Feature commit `e620b70`.

Lets a Duda site editor manage the Space List widget's sidebar accordion
sections (store / nearby / reviews / faq / blog / sizeguide) **per widget
instance** (so Home and About pages can differ). Editor-only **"Manage accordions"**
modal: a toggle switch per section (show/hide) + up/down arrows (order). Both
visibility (`hidden`) and order (`order`) persist to the collection. All six
sections are always candidates — the widget **no longer reads the content-menu
`isX` toggles**; an unconfigured instance shows all six.

### Architecture
- **Why a server proxy:** Duda's client-side Collections JS API is **READ-ONLY**,
  and the public bundle can't hold API credentials — so writes go server-side.
- Editor modal → **POST to a PHP write-proxy** → upserts a row in the Duda
  `accordionConfig` collection, keyed by `instanceKey = "{siteId}_{elementId}"`.
- Widget **reads** the row client-side via the Collections JS API
  (`window.dmAPI.loadCollectionsAPI().data(name).get()`), failing soft to the
  default order when absent / not in Duda.
- Duda runtime values are forwarded as props from the Duda JS tab
  (`data.inEditor`, `data.elementId`, `data.siteId`) — NOT `data.config`. Plus
  `configApiUrl` (the PHP URL), `configCollection`, and `apLocation` (`'left'`|`'right'`).
- **Layout:** filters always render as a top bar — the old `filterPosition`
  (left/top/right) is deprecated/ignored. `apLocation` chooses which side the
  accordion panel sits on (default `right`). The sidebar FilterPanel was removed.
- Key files: `src/widget-space-list/accordionSections.ts` (single source of truth
  for keys/labels/order), `accordionConfigApi.ts` (read+write),
  `components/ReorderModal.tsx` (the modal), and `accordion-sync.php` (proxy, repo root).
- **Drag-to-reorder does NOT work inside the Duda editor** (dragging an item drags
  the whole widget) — that's why it uses up/down arrows.

### Duda collection REST API (hard-won reference)
- Auth: HTTP Basic `base64(apiuser:apipass)` (Partner API). Base `https://api.duda.co`
  (EU accounts: `api.eu.duda.co`).
- GET `/api/sites/multiscreen/{siteId}/collection/{name}` is **public** (no auth).
- Write body is a **BARE ARRAY**, not `{"values":[...]}`:
  - Create: `POST .../collection/{name}/row` body `[{"data":{...fields...}}]`
  - Update: `PUT .../collection/{name}/row` body `[{"id":"<rowId>","data":{...}}]`
  - Wrong shape → `400 InvalidInput`. (Confirmed from the official `@dudadev/partner-api` source.)
- Returned rows nest fields under `data` with a row-level `id`.

### Deployment / gotchas
- Proxy lives at `https://kangaroodev.co.uk/server/tenantinc/accordion-sync.php`.
  Test/staging site id: `26c1f204`.
- **Plesk/nginx WAF 403s any filename containing "config"** — hence
  `accordion-sync.php` (not `accordion-config.php`).
- Credentials live in an **un-committed** sibling `accordion-creds.php` on Plesk
  (`$DUDA_API_USER` / `$DUDA_API_PASS`), so `accordion-sync.php` can be copied
  wholesale. The proxy has a `?debug=1&siteId=X` mode that dumps Duda's raw response.
- Staging bundle is hosted **on Plesk** (not Pages, which would hit production);
  a duplicated Duda widget shell "Space List (Staging)" points at it. To ship:
  merge `space-list-ordering` → `master` and switch the JS tab back to the
  github.io bundle URL.
- Full setup runbook (collection schema, JS-tab snippet, test checklist): `server/SETUP.md`.

### What's left
- Decide: **refresh or retire the stale `npm run smoke` test** (it tests an old
  `.suf-` prefix + removed `additionalPanel` props — unrelated to this work).
- Any further UX polish on the modal.
- Merge to `master` to ship once happy.
