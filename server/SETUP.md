# Accordion Reorder — Duda setup

The Space List widget lets editors drag-reorder and show/hide the sidebar
accordion sections **per widget instance** (so the same widget can be arranged
differently on the Home page vs the About page). The arrangement is saved to a
Duda collection through a small PHP proxy.

```
Editor → drag-reorder modal → Save
      → POST accordion-config.php  (holds Duda API creds, server-side)
      → upsert row in Duda collection "accordionConfig"
Published/editor load
      → widget reads the row via Duda's client-side Collections JS API
      → renders sections in the saved order / visibility
```

There are **three things to set up**: the collection, the PHP proxy, and the
JS-tab props.

---

## 1. Create the `accordionConfig` collection

In the Duda site editor → **Collections** → create a new internal collection
named exactly `accordionConfig` with these fields (all type **Text**):

| Field         | Type | Notes                                              |
|---------------|------|----------------------------------------------------|
| `instanceKey` | Text | `"{siteId}_{elementId}"` — the per-instance key    |
| `siteId`      | Text | for debugging / filtering                          |
| `elementId`   | Text | for debugging / filtering                          |
| `order`       | Text | JSON array, e.g. `["nearby","store","reviews"]`    |
| `hidden`      | Text | JSON array, e.g. `["faq"]`                         |
| `updatedAt`   | Text | ISO timestamp, written by the proxy                |

> The widget only ever **reads** this collection client-side; all writes go
> through the PHP proxy. You don't need to add any rows by hand.

---

## 2. Deploy the PHP proxy

The proxy is two files. The main one lives in the repo root and can be
copy-pasted wholesale; credentials live in a separate file that is **never**
committed (the repo is public).

1. Upload [`accordion-sync.php`](../accordion-sync.php) (repo root) to Plesk —
   note the filename avoids the substring "config", which Plesk's WAF blocks.
   Current deployment: `https://kangaroodev.co.uk/server/tenantinc/accordion-sync.php`.
2. Create a sibling file `accordion-creds.php` **on the server only** containing:
   ```php
   <?php
   $DUDA_API_USER = 'your-duda-api-username';
   $DUDA_API_PASS = 'your-duda-api-password';
   ```
   `accordion-sync.php` requires this, so you can re-copy the main file anytime
   without touching your credentials.
3. **Validate before wiring the widget** — visit in a browser:
   ```
   https://kangaroodev.co.uk/server/tenantinc/accordion-sync.php?debug=1&siteId=YOUR_SITE_ID
   ```
   A healthy response is JSON with `"getStatus": 200` and the collection's raw
   contents — confirms credentials + collection name, and shows the row shape.

---

## 3. Wire the widget's Duda JS tab

In the widget's **JS tab**, add these lines to the props object passed to
`renderExternalApp` (keep all your existing `data.config.*` lines):

```js
// ── reorder feature: Duda runtime context + persistence ──
inEditor:         data.inEditor,
elementId:        data.elementId,
siteId:           data.siteId,
configApiUrl:     'https://YOURDOMAIN.com/duda/accordion-config.php',
configCollection: 'accordionConfig',
```

For reference, the full call looks like:

```js
api.scripts.renderExternalApp(
  'https://cauleykangaroo.github.io/tenantinc-widgets/dist/widget-space-list.js',
  element,
  {
    layoutMode:      data.config.layoutMode,
    filterPosition:  data.config.filterPosition,
    showInstorePrice: data.config.showInstorePrice,
    instorePriceLabel: data.config.instorePriceLabel,
    showJunkFeeDisclaimer: data.config.showJunkFeeDisclaimer,
    showUrgencyMessage: data.config.showUrgencyMessage,
    enableWaitlist:  data.config.enableWaitlist,
    callOnLimitedAvailability: data.config.callOnLimitedAvailability,
    ctaButtonCopy:   data.config.ctaButtonCopy,
    isStore:         data.config.isStore,
    isNearby:        data.config.isNearby,
    isReviews:       data.config.isReviews,
    isFAQ:           data.config.isFAQ,
    isBlog:          data.config.isBlog,
    isSizeGuide:     data.config.isSizeGuide,
    // reorder feature:
    inEditor:         data.inEditor,
    elementId:        data.elementId,
    siteId:           data.siteId,
    configApiUrl:     'https://YOURDOMAIN.com/duda/accordion-config.php',
    configCollection: 'accordionConfig'
  }
);
```

> Remember the JS tab is the function **body** — `element`, `data`, `api` are
> already in scope. Don't wrap it in `function(element, data, api){…}`.

---

## 4. Test checklist (on the live site)

1. **Editor-only button** — in the editor, the dashed orange "Reorder sections"
   button appears under the accordions. On the **published** site it does *not*.
2. **Save persists** — open the modal, drag + toggle, Save. The modal closes with
   no error. Check the `accordionConfig` collection: a row with your `instanceKey`
   now holds your `order` / `hidden` JSON.
3. **Read on reload** — reload the editor page: the accordion reflects the saved
   order + hidden sections.
4. **Published reflects it** — publish/preview: the saved arrangement shows, with
   no reorder button.
5. **Per-instance independence** — drop the same widget on a second page, reorder
   it differently, and confirm page 1 is unchanged (different `elementId` →
   different row).

If Save shows an error, the modal stays open and the message includes the HTTP
status from the proxy — paste it to me and we'll sort it.
