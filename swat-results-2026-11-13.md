# SWAT fixes — 13 November 2026

Work done in response to `swat-report-2026-11-13.md` (items 1–7 of "Ours".)
Branch `clientsiderepo`. Each item lists the files touched, the exact change,
what could go wrong, and how to undo it on its own.

> Both `.md` files are matched by `*.md` in `.gitignore`. Use `git add -f` to
> commit them.

---

## 1. `[object Object]` links

**Problem.** A Duda **Link** content field reaches the widget as an object:

```
{ value, label, type: 'url', href, raw_url, target, rel }
```

It was used directly as an `href`, so it rendered as
`href="[object Object]"`, a relative URL that returns HTTP 400.

**Change.**
- **`src/shared/propertyBinding.ts`:** new
  `linkHref(v, fallback = '#'): string`. It is
  `boundLink(v)?.href ?? fallback`, and `boundLink()` already existed (the
  footer uses it). A plain string passes through unchanged, so nothing
  that previously worked can change.
- **`src/widget-promotions/Promotions.tsx`:**
  - `href={bannerUrl}` is now `href={linkHref(bannerUrl)}`, on the banner `<a>`.
  - `url: barUrl` is now `url: linkHref(barUrl)`, in both `barItems` branches.
- **`src/shared/components/LeadForm.tsx`:** the terms link (`.pi-msg-terms`) is
  now `href={linkHref(termsHref)}`, plus the import. This covers #23 contact
  form and every MessageModal.
- **`src/widget-rental-flow-2step/RentalFlow2Step.tsx`:** the terms link in
  the payment step is now `href={linkHref(termsHref)}`, plus the import.

**If it goes wrong.** The symptom would be a banner or terms link pointing
somewhere unexpected.
- **Likely cause:** the editor's link object holds the URL under a key
  `boundLink` doesn't read. It reads `href`, then `value`, then `raw_url`, then
  `url`.
- **To check:** log the raw prop.
- **To undo:** revert the four `linkHref(...)` call sites to the bare prop.

**Not changed.** Other URL props (`rentalPageUrl`, `reviewsUrl`, nav URLs, and
so on) were not touched. None was seen producing `[object Object]` on the live
preview sites.

## 2. Two h1s on every facility page

**Problem.** Both of these render "Storage Units in …" as `<h1>`:
- #05 space list: `.sl-page-title`, `SpaceList.tsx`;
- #18 space list heading: `.slh-title`.

Only one is visible at a time: #18 is `display:none` at 768px and up, and #05
hides its own below that. But SEO crawlers count tags, not visibility.

**Change.** In `src/widget-space-list-heading/SpaceListHeading.tsx`:

```
<h1 className="slh-title">
```

becomes

```
<div className="slh-title" role="heading" aria-level={1}>
```

- **Screen readers:** still a level-1 heading, and the only one in the
  accessibility tree at phone width.
- **Styling:** every `.slh-wrapper .slh-title` declaration in
  `SpaceListHeading.css` is already `!important` (font, size, weight,
  line-height, colour, margin), so a div renders the same as the h1 did.

**If it goes wrong.** Mobile facility-page title looks different.
- **Likely cause:** a Duda theme rule that targeted the `h1` tag and that the
  class rules don't answer.
- **To undo:** change the `<div … role aria-level>` back to `<h1>`. The only
  consequence is that the SEO "2 h1" finding returns.

## 3. No h1 on `/locations` and the state and city pages

**Problem.** #08 map-locations' count line ("N Storage Facilities in X") was a
`<p class="ml-heading" role="status">`.

**Change.**
- **`src/widget-map-locations/MapLocations.tsx`:** both copies (mobile and
  desktop, mutually exclusive) are now
  `<h1 className="ml-heading"><span role="status">…</span></h1>`. The live
  region moved to the inner span, because `role="status"` on the h1 itself
  would replace the heading role.
- **`src/widget-map-locations/MapLocations.css`:** `.ml-heading`:
  - every declaration is now `!important`;
  - added `font-family: inherit`, `letter-spacing: 0`, `text-transform: none`
    and `text-align: left`, so the Duda theme's H1 rules can't restyle it;
  - the mobile override (18px / 600 / 22.5px) is `!important` too.

**If it goes wrong.** City-page heading has the wrong font, size, colour or
spacing on the published site.
- **Likely cause:** a theme H1 property not covered above. Add it with
  `!important`.
- **To undo:** revert both `<h1>…<span role="status">` back to
  `<p className="ml-heading" role="status">`.
- **Also check:** a page shouldn't have this widget *and* another h1 widget
  (e.g. #19 storage-type-locations' `.stl-heading`) together.

## 4. Empty click-to-call links

**Change.** In `src/widget-map-locations/MapLocations.tsx`, the facility card's
`<a className="ml-card-row" href="tel:…">` now renders only when the phone has
digits. Before, a facility with no phone rendered `href="tel:"` with an empty
label.

**If it goes wrong.** A phone row is missing on a card that has a number.
- **Likely cause:** the number field holds no digits, e.g. text only.
- **To undo:** remove the `{facility.phone.replace(…) && ( … )}` wrapper.

## 5. Duplicate IDs across widgets (`:r0:`)

**Problem.** Every widget is its own React root, and `useId()` counts from
`:r0:` in each, so two widgets on a page produced identical ids. The a11y
pass (commit `2f5159a`) added more `useId()` calls, which made it more
visible.

**Change.** In `src/shared/createWidget.tsx`:

```
createRoot(mountEl)
```

becomes

```
createRoot(mountEl, { identifierPrefix: `w${random6}-` })
```

The prefix is random rather than a counter, because each bundle has its own
module scope and a counter would restart at 0 in every widget.

**Impact.** This file is in every bundle, which is why all 27 dist files
changed. Ids now look like `wk3f9a2-:r0:`.

**If it goes wrong.**
- **Possible cause:** code that found an element by a `useId()` value by
  assuming its format. None found: all uses are `id={x}` /
  `aria-*={x}` pairs from the same variable. Hardcoded ids such as
  `#al-identifier` and `#utility-bar-cta` are unaffected.
- **To undo:** revert to `createRoot(mountEl)`.

## 6. Contrast on property-info status text

**Change.** In `src/widget-property-info/PropertyInfo.css`:

| Class | Was | Now |
|---|---|---|
| `.pi-status--open` | `#028a0c` | `#027f0b` |
| `.pi-status--closed` | `#e53935` | `#c62828` |

Contrast against each background:

| Colour | `#f9fafb` card | white | `#e1fae3` pill |
|---|---|---|---|
| `#027f0b` (open) | 4.97:1 | 5.19:1 | 4.70:1 |
| `#c62828` (closed) | 5.38:1 | 5.62:1 | 5.08:1 |

All pass the 4.5:1 text minimum. The shared `--hb-ada-green` token and the
green field borders were deliberately **not** changed: borders and icons only
need 3:1 and already pass.

**To undo:** restore the two hex values.

## 7. Breadcrumb tap target, and reviews link label

- **Breadcrumb.** In `src/shared/Breadcrumb.tsx` (the injected stylesheet),
  `.ti-crumb-link` gained:

  ```
  display: inline-block; padding-block: 2px; margin-block: -2px;
  ```

  This gives a 24px hit area on the 20px line (WCAG 2.5.8). The negative
  margin cancels the padding, so the layout is unchanged. Measured: crumb
  links are 24px tall.
  - **If it goes wrong:** crumbs sit 1–2px off, or overlap on wrap. Remove
    the three declarations.
- **Reviews link.** In `src/widget-reviews/Reviews.tsx`, the `aria-label`
  was removed from `.rw-source-meta`.
  - **Why:** the custom label ("See Google reviews: 4.3 out of 5 from 264
    ratings") didn't contain the visible text, which fails WCAG 2.5.3 Label
    in Name. The name now comes from the content ("Google 4.3 / 5 264
    ratings").
  - **To undo:** restore the `aria-label` line.

---

## Verification done before handing over

- **Screenshots:** 48 widget screenshots, covering 8 harness pages at 1440px
  and 390px, taken before and after. All pixel-identical at pixelmatch
  threshold 0.1; the colour change in item 6 is below that threshold.
- **DOM check in the harness:**
  - status colours are `rgb(2,127,11)` and `rgb(198,40,40)`;
  - crumb links are 24px tall;
  - the city page has exactly one `<h1>` (`ml-heading`) at both widths;
  - there are no `[object Object]` or `tel:`-only hrefs.
- **Checks:** `tsc --noEmit` is clean. `test:homepage-search`,
  `test:locations-banner`, `test:account-link`, `test:tier-panels` and
  `test:phone` pass. `npm run build` is OK.

**Not verified.** None of this has been seen on a published Duda page.
Duda-theme styling (items 2 and 3) and real Duda link objects (item 1) only
exist there, so look at a facility page, a city page and `/contact-us` on each
preview site after the merge.

## Still open (not touched)

- **Storageoutlet runs pre-fix bundles.** Check its JS tab URLs (report
  item 8).
- **Phone numbers differ between location lists.** Needs tracing.
- **Mobile performance on blog pages.** See `swat-progress.md` → Planned.
