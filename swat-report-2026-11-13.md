# SWAT assessment triage — 13 November 2026

Three Quick Assessments run on 13 Nov 2026:

| Site | Score |
|---|---|
| `stopnstorstorage.mariposa-preview.com` | 71 (C) |
| `showcase.mariposa-preview.com` | 57 (F) |
| `storageoutlet.mariposa-preview.com` | 56 (F) |

Each finding was attributed by searching the repo for the class names in the
report's own evidence. The `[object Object]` links, the duplicate h1 and the
empty `tel:` links were also confirmed by loading the live preview pages and
reading the DOM. The earlier pass is in `swat-progress.md`.

---

## Ours — fixable in this repo

1. **`[object Object]` broken links**: the whole of stopnstor's Errors 0/100.
   - **Cause:** Duda passes a Link field as an object, not a string, and two of
     our props use it directly as an `href`. The URL resolves to
     `…/[object Object]` and returns HTTP 400.
     - Promotions banner (`bannerUrl`, `Promotions.tsx`): on every facility
       page. This accounts for all 14 broken links and all 7 4xx pages on
       stopnstor.
     - Contact form "Click to see our Terms and Privacy Policy" (`termsHref`):
       on showcase `/contact-us`.
   - **Fix:** route every link prop through `boundLink()` in
     `@shared/propertyBinding`. It already handles the object, but only the
     footer uses it today.
2. **Two h1s on every facility page.** Both `slh-title` (space list heading,
   #20) and `sl-page-title` (space list, #05) render "Storage Units in …" as h1.
3. **No h1 on `/locations` and the state and city pages.** The map-locations
   heading (`ml-heading`, "N Storage Facilities in X") is a `<p>`.
4. **Empty click-to-call links.**
   - **Cause:** a map-locations facility with no phone still renders
     `<a class="ml-card-row" href="tel:">`.
   - **Flags it triggers:** "invalid phone number", "link has no discernible
     text" and "link purpose".
5. **Duplicate IDs (`:r0:`).**
   - **Cause:** every widget is a separate React root, so `useId()` numbers from
     `:r0:` in each of them. Two widgets on one page can then produce the same
     ID.
   - **Fix:** give each root a unique `identifierPrefix` in
     `src/shared/createWidget.tsx`.
6. **Hardcoded contrast.** Property-info `pi-status--open` `#028a0c` (4.32:1)
   and `pi-status--closed` `#e53935` (4.04:1) against `#f9fafb` need 4.5:1.
7. **Small items:**
   - Breadcrumb links (`ti-crumb-link`) are under the 24px touch-target
     minimum.
   - The reviews header link's `aria-label` doesn't include its visible text.
     axe marks this check experimental.
8. **Storageoutlet still shows pre-fix code.** The a11y fixes reached `master`
   on 10 Nov and stopnstor's report shows them. Storageoutlet's report still
   shows:
   - the old `nl-track-col` `aria-hidden` carousel;
   - `<main class="sl-listing-area">`;
   - the old reviews label.

   Its Duda JS tabs probably point at a different bundle URL (for example
   Plesk staging), or a cached copy. To check in Duda.
9. **Mobile performance on blog pages (LCP 7–9s).** Partly ours: bundle weight
   and base64-inlined images. Already diagnosed in `swat-progress.md`.

## Possibly ours — investigate first

- **Phone numbers differ between "location lists"** on storageoutlet. Example:
  Escondido shows (760) 230-0039 on 24 pages and (760) 227-2854 on 10.
  - **Suspicion:** two widgets reading different sources (`Properties` vs
    `PropertiesInternal`), or different entries of the `Phones` array.
  - **Next step:** trace it before calling it a data problem.

## False flags

- **Typos (0/100 on showcase and storageoutlet).**
  - **Accent splitting:** the tokeniser splits Spanish words at accented
    characters, so "Páginas" becomes "ginas", "Política" becomes "tica" and
    "Términos" becomes "rminos".
  - **Spanish indexed as English:** it also checks the `/es` pages as English.
  - **The genuine misspellings** ("yound", "bussiness", "polte", "on on") are
    inside Google review text, which can't be edited.
- **Noindex on every page, and "sitemap lists a noindex URL".** Expected on a
  preview domain. Switch noindex off at launch, which also clears the sitemap
  findings.
- **Offerings: "Shows 1 of 6 common sizes" on city pages.** The map-locations
  cards deliberately preview the top three sizes only.
- **"Needs manual review" items.** These are not failures. For example, the
  map's "+" button labelled "Zoom in".

## Real, but Duda or content — not our widgets

- **Titles, meta descriptions and duplicate titles.** Duda page settings.
  "Property Landing Page (Dynamic)" and "State City Page" are the dynamic page
  templates' SEO titles and should use the row's name.
- **Structured data.** Duda generates it, including the `(888) 888-8888`
  placeholder and the price mismatches on stopnstor. The repo emits no
  `ld+json`.
- **ADA criticals and highs.** None of these are in this repo:
  - the chat launcher (`launcher-btn`);
  - Duda store controls (`data-auto=` swatches, selects, search);
  - the YouTube player;
  - custom HTML blocks (`sop__`, `sov-`, `soe`, `sgx-`, `sec-h`), including the
    unlabelled radios;
  - Duda's cookie bar and share icons;
  - the Twitter embed.
- **Showcase broken links.**
  - "View deals" and "Learn more" point to old slugs, from the custom `sop__`
    block.
  - Several blog and storage-tip pages return 404.
- **Theme-colour contrast.** White text on the CTA green and orange is
  `--color_2`, set in the Duda theme.
- **Content typos** in blogs and pages: "with with", "about about",
  "relacing", "knowledgably", "permissable", "significates".
