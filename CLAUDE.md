# tenantinc-widgets — project context

React/TypeScript widgets bundled as AMD and loaded into Duda sites via
`api.scripts.renderExternalApp(...)`. Bundles are served from GitHub Pages
(`https://cauleykangaroo.github.io/tenantinc-widgets/dist/widget-*.js`) — Pages
serves the **`master`** branch, which is production on live customer sites.
`dist/` is committed (not gitignored). See `README.md` for the framework basics
and `src/shared/createWidget.tsx` for the Duda mount bridge.

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
