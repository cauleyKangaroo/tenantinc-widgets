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

## Where widget data comes from — Duda collections vs the Hummingbird API

Widgets used to call the Hummingbird (Tenant/`edge.tenant.dev`) API directly with a
key baked into each `config.json`. Property data now comes from a Duda
**external collection** first, with the keyed REST call kept as a fallback.

### Reading a collection at runtime

- `window.dmAPI.loadCollectionsAPI().data('<Name>').get()` — **no auth**. The API is
  read-only and implicitly scoped to the site it runs on, and the data is public by
  construction (it renders on a public page). The bundle is served from public
  GitHub Pages, so it could never hold a secret anyway.
- Wrapped in `src/shared/dudaCollections.ts` — the only place that touches `dmAPI`.
  It fails **soft** everywhere: no `dmAPI`, missing collection, network error → `[]`.
- **`window.dmAPI` is PUBLISHED-SITE ONLY.** It is `undefined` in the Duda editor and
  in the dev harness. Anything collection-backed therefore needs a sensible
  editor-time story (demo data, or the REST fallback below) or it will look broken
  while an editor is working on the page.
- The envelope varies; the reader normalises all of it. Verified live:
  `{ name, values: [...rows], fields, filters, language, search, sortBy,
  page: { pageSize: 100, pageNumber: 0, totalPages } }`.
  **`pageSize` is 100** while a collection can hold 1000 rows — one `get()` is not
  guaranteed to be the whole collection. Fine for small ones; anything that could
  exceed 100 rows must walk `page`.
- Rows arrive either flat or nested under `data` (with a row-level `id`);
  `readCollection` flattens both and exposes the row id as `__rowId`.

### Value shapes: external vs native collections (the trap)

The Duda UI labels every column "Rich Text", but the two collection kinds behave
differently:

- **External** collections (e.g. `Properties`) pass values through **as parsed JSON** —
  `Address` is an object, `Phones`/`Emails`/`AccessHours`/`unit_type_counts` are
  arrays, `occupancy` is a number, `is_day_closed` is a boolean. No unwrapping needed.
- **Native** collections (e.g. `BlogPosts`) wrap editor-authored text as
  `<p class="rteBlock">…</p>`, because a human authors it in a WYSIWYG. Those fields
  must go through `plainText()` (strip to text) or `RichText` (render as markup).

That difference is why the blogs mapper needs `plainText()` and `propertiesSource`
does not. Get it wrong and you either print tags on the page or strip real content.

### The `Properties` external collection

- Points at the same Hummingbird endpoint the widgets used to call, with the
  collection path set to `applicationData.<appId>[0].data.properties`, so **each row
  IS a property object** — the exact shape the existing extractors already parse.
- `src/shared/propertiesSource.ts` wraps rows back into the REST envelope
  (`{applicationData: {<appId>: [{data: {properties}}]}}`), so callers can feed either
  source to the same extractor and nothing downstream changed.
- `fetchPropertiesPreferCollection(appId, directFetch, opts)` = collection when
  available **and trustworthy**, else `directFetch`.
- **`requirePropertyId`** is the trust check: if the collection has rows but none
  matching this widget's configured property id, it's bound to a different
  company/property set — log a warning and use REST instead. All three per-property
  widgets pass it; `nearbyProperties` deliberately does not (it wants *all* rows).
  **On a dynamic page this MUST be the bound id, not the config.json one** — see
  `resolveRequireId` below.

---

## Dynamic pages — one widget instance, any property (`dynamic-page-logic`)

**Branch:** `dynamic-page-logic` (off `promo-logic`). **Status (2026-08-04): code
complete, typecheck + build green, verified against the REST path in the dev
harness. NOT yet tested on a real Duda dynamic page.**

The new site drives property pages from a Duda **dynamic page** bound to the
`Properties` collection — the editor picks the row from the page dropdown (Apex
Storage / Storage Outlet - Chino / …). One widget instance therefore has to render a
different property per page, which the old hardcoded `cfg.propertyId` cannot do.

**The new site also points its external collection at a DIFFERENT `companyId`** than
the one baked into every `config.json`. So the keyed REST fallback is not merely
stale here, it returns another company's properties — which is exactly why the trust
check had to start using the *effective* id.

### How the widget learns which property

The editor adds a **content-menu field** and uses Duda's **"Connect to data"** on it
(right-click widget → Connect to data → `Properties > <column>`). The bound value
lands in `data.config.<fieldName>` and is forwarded as a prop like any other field.

`src/shared/propertyBinding.ts` is the single place that interprets those props.

**Two strategies, and the first is much better:**

1. **Bind `propertyId` to `Properties > id`** — one field, and the widget then reads
   the whole row from the collection itself. Every nested field arrives as **parsed
   JSON**, so `Address` stays an object and `Phones`/`AccessHours`/`SocialMedia`/
   `unit_type_counts` stay arrays. **Prefer this.**
2. **Bind each field individually** (`propertyName`, `propertyAddress`, …) — fine for
   scalars, but a content-menu field is a **text input**, so Duda must flatten the
   value. Objects/arrays may arrive as a JSON string, a display string, or
   `"[object Object]"`. `boundJson()` accepts the first two and returns null for the
   rest, so the widget falls through instead of rendering garbage.

**Precedence:** individually-bound field → row found via `propertyId` → the widget's
existing props/DEFAULTS. An unbound widget behaves **exactly** as before.

### Key functions (`@shared/propertyBinding`)

- `boundText(v)` — treats `''`, unsubstituted `{{handlebars}}`, `"[object Object]"`,
  `"undefined"`/`"null"` as *not set*, so a failed binding never outranks real data.
- `boundJson<T>(v)` — already-parsed object OR JSON string → `T`; anything else null.
- `resolvePropertyId(bound, configId)` — the effective property id.
- `resolveRequireId(bound, configId)` — what to hand `requirePropertyId`. **Using the
  stale config id here rejects the very collection the page is built on, falls back
  to REST against the wrong company, and renders another company's property.**
- `readPropertyRow(tag, id)` / `resolveBoundProperty(tag, bound, opts)` — the row,
  with individually-bound fields layered on top. Fails soft to null (no dmAPI in the
  Duda editor or the dev harness).

### Content-menu fields to create in Duda

Add these to a widget's content menu, then "Connect to data" each one. **`propertyId`
alone is enough for #03 and #10.**

| Field name (variable) | Connect to | Needed? |
|---|---|---|
| `propertyId` | `Properties > id` | **Yes — the only required one** |
| `propertyName` | `Properties > name` | optional override |
| `propertyAddress` | `Properties > Address` | optional; loses lat/lng if flattened |
| `propertyPhones` | `Properties > Phones` | optional; array — prefer `propertyId` |
| `propertyEmails` | `Properties > Emails` | optional; array |
| `propertyAccessHours` | `Properties > AccessHours` | optional; array |
| `propertySocials` | `Properties > SocialMedia` | optional; array |
| `propertyUnitCounts` | `Properties > unit_type_counts` | optional; array |
| `propertyTimezone` | `Properties > utc_offset` | optional |
| `spaceGroupId` | **nothing — plain text or leave empty** | #05/#06 only, see below |

### Per-widget state

| # | Widget | Binding | Notes |
|---|---|---|---|
| 03 | property-info | `propertyId` (+ all overrides) | **fully wired.** name, address, phones, email, hours, "See all Hours", socials, map, unit counts and the **breadcrumb** all follow the id |
| 10 | faqs | `propertyId` | `fetchFaqsForProperty()`. `Faq` is an array of localized maps — no text-field binding possible, needs the id route |
| 05 | space-list | `propertyId` + `spaceGroupId` | units, sidebar and nearby follow the id; space group auto-resolved (below) |
| 06 | promotions | `propertyId` + `spaceGroupId` | same |
| 02 / 13 | nav / footer | `propertyId` | already accepted one before this work (`DEFAULT_PROPERTY_ID`) |

### `spaceGroupId` — the one thing that CANNOT be bound

#05's units and #06's promotions come from
`properties/{propertyId}/space-groups/{spaceGroupId}/groups` — **REST only, no
collection**. And `spaceGroupId` is **not a column on `Properties`**, so
"Connect to data" cannot supply it. Worse, each property has 2–4 groups and only one
is the public list.

`@shared/spaceGroups.ts` resolves it: `fetchWebsiteSpaceGroupId(creds, propertyId)`
lists the property's groups and picks the one whose **name** matches `/website/i`.

- The name is the only usable signal, and **"take the first" is wrong** — verified
  live 2026-08-04: Lancaster's groups are `INSIDE UNITS`, `HIGH CEILINGS`,
  `Closet to Office/ Entrance`, `Website Group` — the website one is **last**.
- Returns **null rather than guessing** when nothing matches. Picking `Trade Show
  Group` or `Rev Management Groups` would publish wrong prices on a live site.
- #05/#06 only do the lookup when a bound `propertyId` differs from the configured
  one (i.e. the page really is dynamic) — a static page keeps its configured group
  and makes no extra request.
- Leave the `spaceGroupId` content-menu field **empty** to auto-resolve; set it to
  pin one group explicitly.

### Still to verify / do

- **Untested on a real Duda dynamic page.** Specifically unknown: whether a
  collection-bound content-menu field reaches `data.config.<name>` for an
  **external app** widget (`renderExternalApp`) without the value also being
  referenced as `{{handlebars}}` in the widget's HTML tab. If it doesn't, the
  fallback is to put `{{propertyId}}` in a hidden element in the HTML tab and read it
  from the DOM. `boundText()` already discards an unsubstituted `{{…}}` token, so a
  half-working binding degrades to the old behaviour instead of printing the token.
- **`companyId` / `apiKey` are still build-time** (`config.json` per widget). The new
  site's collection uses a different company, so the REST fallback is wrong there —
  which means the Duda **editor** view (no `dmAPI`) will show the wrong/absent
  property until those credentials are updated or made props.
- **Gallery images and rating/reviews do NOT follow `propertyId`.** Images are
  gradient placeholders (the API's `Images` field is declared but never mapped);
  rating/review count come from the separate `GoogleReviews` collection.

### Who uses what

| Consumer | Endpoint | Source |
|---|---|---|
| `widget-property-info/api.ts` (#03) | `/properties` | collection-first |
| `widget-space-list/propertyApi.ts` (#05) | `/properties` | collection-first |
| `shared/nearbyProperties.ts` (#07, #05 nearby) | `/properties` | collection-first |
| `widget-faqs/faqApi.ts` (#10) | `/properties?faq=true` | collection-first |
| `widget-space-list/api.ts` (#05) | `/space-groups/…/groups` | **REST only** |
| `widget-promotions/api.ts` (#06) | `/space-groups/…/groups` | **REST only** |
| `shared/leadsApi.ts` | `POST /leads/` | **REST only** |

The last three are deliberate, not leftovers: space-groups (units, promotions) has no
collection, and leads is a **write** — the Collections JS API is read-only, so writes
always need credentials and therefore a server-side proxy (see `accordion-sync.php`).

### `propertyId` — Duda passes it; config.json is NOT a real property

Duda supplies `propertyId` as a prop from the JS tab, per page. Which widgets:

| Widget | propertyId |
|---|---|
| #03 property-info, #05 space-list, #06 promotions, #10 faqs | **passed by Duda** |
| #02 nav, #13 footer | not needed — site-wide contact details |
| #07 nearby, #11 size guide, #12 blogs | not needed |
| #09 reviews | work in progress |

`cfg.propertyId` is a **dev-harness / editor fallback only**. On this site it names a
property of the OLD company that does not exist, so it must never be treated as a
real property:

- **`resolveRequireId` returns the BOUND id only**, never the config one. Handing the
  trust check a stale id makes it look for a property the collection cannot contain,
  declare the site's own collection untrustworthy, and fall back to REST — the exact
  thing the check exists to prevent. Unbound ⇒ `undefined` ⇒ no check.
- **Never give those parameters a `= PROPERTY_ID` default.** `resolveRequireId`
  returning `undefined` would silently re-apply it. Caught by test, twice.
- #05's sidebar sections get the id from `PropertyIdProvider` / `usePropertyId()`
  (`propertyContext.tsx`), because `SectionAccordion`'s `VISUALS` map is a
  module-level record of pre-built elements with nowhere to pass a prop. Its default
  is `''`, deliberately not `cfg.propertyId`.
- #07 takes an **optional** `propertyId` used only to anchor distances and exclude
  the page's own facility. With none it lists every location **without distances**
  rather than rendering empty — the old code blanked the widget whenever geolocation
  was declined and the configured id wasn't in the list, which is the live case now.
- Unbound, #03 resolves to no property and keeps its DEFAULTS: on a multi-property
  site it cannot know which one to show, and guessing would be worse.

### `companyId` — the `Company` collection is the source of truth

**Every** outbound request is scoped to the company id from the one-row **`Company`**
collection, read via `@shared/companySource`. `config.json`'s `companyId` is now
only a fallback.

Why: the company id was build-time, so a new customer site meant a new build of the
bundles. It is site DATA. Each site spun up from this template gets its own
`Company` row and reuses the **same published bundles** — no rebuild.

- **`Company` is a NATIVE collection**, unlike `Properties`. The cell is authored in
  a WYSIWYG, so Duda returns `<p class="rteBlock">kQoBXA8vpn</p>`. Used raw that
  goes straight into the request URL and every call 404s — hence `plainText()`.
- Rows can arrive as `{id: <rowId>, data: {id: …}}`: the **column** `id` must win
  over Duda's own row id (`readCollection` already flattens it that way).
- Only the **first** row is read; a second logs a warning rather than being guessed
  between.
- The read is **promise-cached** per collection, so every widget on the page shares
  one request.
- **Precedence:** explicit `companyId` prop → `Company` collection → `config.json`
  (Duda editor, dev harness, sites without the collection).

Wired through: #03 (properties + createLead), #05 (space-groups, website-group
lookup, sidebar properties, nearby, createLead), #06 (space-groups), #07 (properties
+ property spaces), #10 (faqs). `@shared/leadsApi`, `@shared/nearbyProperties` and
`@shared/spaceGroups` take a creds object — callers pass the resolved id, which is
why `cfg.companyId` still appears inside them.

**#05 holds the resolved id as state (`null` = resolving) and its data effects wait
for it.** Starting from `cfg.companyId` and correcting later would fire a request
against the wrong company on every load and briefly render its units.

### Other collections on the site

`Properties` (external), `Company` (native, one row — see above), `BlogPosts`
(native, read by `@shared/blogPosts`), `GoogleReviews` (native, ratings for #03/#09),
`accordionConfig` (native, read client-side + written via the PHP proxy).
Collection names are **case-sensitive** — they're the lookup key.

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
- GET `/api/sites/multiscreen/{siteId}/collection/{name}` **needs the same Basic auth**
  as writes. (Previously documented here as public — that's wrong: it returns **401**
  unauthenticated on both `api.duda.co` and `api.eu.duda.co`, tested 2026-07-30.
  The no-auth read path is the in-page **JS** API, `window.dmAPI`, not this REST one.)
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
