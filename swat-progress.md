# SWAT assessment — widget-side progress

Tracking what the **tenantinc-widgets** repo can and cannot address from the
Storage Web Assessment of `storageoutlet.mariposa-preview.com`.

| | |
|---|---|
| Report | Quick Assessment, 26 October 2026 |
| Overall | 70 / 100 (Grade C) · 61 of 164 pages crawled |
| Scope of this document | Only findings attributable to **our widget code**. Duda platform, page settings, operations data and third-party scripts are listed under *Not ours*, with evidence. |

Every attribution below was checked against the repo by searching for the class
names in the audit's own evidence snippets, not inferred from the description.

---

## Done

Delivered on `clientsiderepo`. **Not live**: GitHub Pages serves `master`, so
none of this reaches customer sites until the next merge.

### ADA Compliance — both findings we own

The audit lists 10 ADA findings. Eight are third-party or platform (see below).
These two are ours.

**aria-hidden element must not be focusable or contain focusable elements**
(high — 13 elements on 10 of 60 pages, evidence `<div class="rw-track-page">`)

The reviews carousel marked off-screen pages `aria-hidden="true"`, but the cards
inside carry a "See more" button and a "Read more" link, so those stayed in the
tab order. A keyboard user tabbed into controls that no screen reader would
announce. Off-screen pages now also carry `inert`, which removes the subtree
from the tab order *and* the accessibility tree.

**Interactive controls must not be nested**
(high — 13 elements on 13 of 60 pages, evidence `<button class="pi-gallery">`)

The property gallery was a `<button>` containing the prev/next arrows and the
dot controls, so a button held three more controls. The container is now a
`<div>`, the arrows are real buttons rather than `<span role="button">`, and
keyboard access to the lightbox is kept by a dedicated control that is
invisible until focused. Mouse and touch behaviour is unchanged.

### SEO — missing h1

The audit reports **21 pages with no h1**. Three groups of those were ours.

| Pages | Was | Now |
|---|---|---|
| `/locations`, `/locations/california`, + 11 city pages | no h1; `.stl-heading` was an h2 | h1 |
| `/rental`, `/rent-or-reserve`, `/es/rental` | no h1; `.rf-heading` was an h2 | h1 |
| Facility pages | facility name was a `<p>`, no heading semantics at all | h2 |

That clears **16 of the 21** missing-h1 findings.

`.rf-heading` appears in seven places across the rental flow, but only ever one
is in the DOM at a time (measured), so promoting them all still leaves exactly
one h1 per page.

**On the facility name:** the original plan was to make it the h1. Measuring
first showed property pages *already* have exactly one h1 ("Storage Units
in …"), and the audit never flagged the English property pages — so that change
would have created the duplicate-h1 problem the Spanish pages already have,
rather than fixing anything. An h2 gives the name its semantics without
competing for the h1.

### Knock-on: Duda heading styles

Promoting an element to a heading exposes it to Duda's site-theme CSS, which
overrides widget styling on the published site. The project rule is that every
heading declaration carries `!important`. That pass was re-run after these
changes: 26 declarations across three files, 17 of them the newly promoted
property-name classes, plus four pre-existing gaps in My Account and Tier
Selection.

### Broken Links

> Internal link points at a redirect: `/my-account` to `/login`

Already fixed, separately, by the account-link change: the nav's Pay Bill and My
Account links now read the session and go straight to `/login` when signed out,
instead of loading the account page and bouncing. On `clientsiderepo`, not yet
live, so the audit still sees the old behaviour.

### Verification

Measured in Chrome against the dev harness, not asserted:

- Exactly one h1 on each of the property, rental, city/state, storage-types and
  blog-listing pages, with the expected text. Two of those had none before.
- Gallery container is a `div`, zero nested buttons, two real arrow buttons,
  zero `span[role=button]`, keyboard open control present.
- Of four review track pages, both hidden ones carry `inert` and neither visible
  one does.
- The facility name renders unchanged at 30px / 700 / margin `0 0 4px` — the
  `!important` pass stopped browser-default heading margins appearing.
- `tsc --noEmit` clean; `test:account-link`, `test:image-optimize`,
  `test:tier-panels` and `test:tier-quotes` all pass.

---

## Planned

### Core Web Vitals (score 50) — the largest item we own

> Mobile Lighthouse performance 10/100 on `/storage-units/:p/:p/:p` pages —
> LCP 7.72s, CLS 0.583, FCP 5.16s

Diagnosed, not yet fixed. Three causes, all in this repo:

1. **Bundle weight.** The space-list bundle is 2.2MB, of which **1.5MB is
   images base64-inlined into the JavaScript**; the rental flow carries another
   711KB. Nothing renders until all of it has downloaded and parsed.
2. **No reserved height.** Widgets occupy 0px until React mounts, so the page
   collapses and expands. Measured on the nav alone: a single layout shift of
   **0.282** as its container goes 60px to 131px. This one cannot be fixed from
   the repo — our CSS is bundled inside the JavaScript, so it does not exist
   yet either. It needs a `min-height` in each widget's Duda HTML and CSS tabs,
   the only part of a widget that reaches the server HTML. The snippet and
   measured heights for the nav are in
   `src/widget-navigation-bar/DUDA-SETUP.md`.
3. **React is shipped once per widget.** No webpack `externals`, so a property
   page downloads and boots several copies.

### Image weight

Partly done. Blog and property-gallery images now request Duda's pre-generated
sized copies instead of the original upload — measured, one gallery image went
from 4079KB to 483KB. Still outstanding:

- 40 bundled image files, 4.2MB on disk, including two 2320x1826 RGBA PNGs of
  **875KB each**, displayed in a unit card a few hundred pixels wide.
- Two shared S3 fallback photos at **1.7MB each**, served with no
  `Cache-Control` header at all.

### Contact Consistency (score 60)

Needs investigation before any change. Each facility shows one number in
"location lists" and a different one on its facility page, which suggests two
widgets reading different sources — that part would be ours. The
`(888) 888-8888` appearing in structured data is a placeholder in the data, not
something the widgets produce.

---

## Not ours

Listed so nobody spends time on them here.

### Typos (score 0) — recommend disputing

The score is driven almost entirely by **false positives**. The checker splits
Spanish words at accented characters and reports the fragments as misspellings:

| Reported | Actually |
|---|---|
| *ginas* | Pá**ginas** |
| *rminos* | Té**rminos** |
| *tica* | Polí**tica** |
| *nico* | electró**nico** |
| *informaci* | **informaci**ón |

The audit's own evidence snippets show the accents rendering correctly, so the
page text is fine and the tokeniser is at fault. The only genuine misspellings
in the list — "holliday", "reccomend", "polte" — are inside **Google review
content**, which is third-party and not editable.

### ADA findings that are not ours

Both **criticals** are third-party:

| Finding | Evidence | Source |
|---|---|---|
| Buttons must have discernible text | `<button class="launcher-btn">` | chat widget |
| Form elements must have labels | `<input type="password" id="pwd">` | legacy `/storagetips` pages, which also have no title and no `lang` |
| Contrast minimum (359 elements) | `<span class="morePosts text">` | Duda blog module |
| Links must have discernible text | `dm-social-icons-whatsapp` | Duda share module |
| ARIA progressbar needs a name | `v-progress-circular`, `data-v-…` | a **Vue** app — our widgets are React |
| Target size minimum | `sop__dot` | not in this repo |

None of those class names exist anywhere in the repo.

### Other

- **Missing titles, missing meta descriptions, duplicate titles, noindex** —
  Duda page settings. The duplicates are template names leaking out as titles:
  "Property Landing Page (Dynamic)" on 10 pages, "State City Page" on 11.
- **Broken external link** `https://find-storage.trigger/` — not in this repo.
- **`https://twitter.com/PomonaSO` 404** — property social data.
- **10x20 and 10x30 shown by no facility** — operations data.
- **City pages showing 3 of 6 core sizes** while the facility page shows 12 —
  could not attribute this to a widget in this repo. Worth confirming what
  renders those listings before anyone acts on it.

---

## A pattern worth watching

Several recent commits convert headings to `<p role="heading">` so Duda's theme
cannot restyle them. That removes real heading tags from the document, which is
exactly what this audit penalises. It is currently confined to My Account and
Login, both `noindex` and behind authentication, so there is no SEO cost today.
The `!important` approach achieves the same protection while keeping real
h1/h2, and is the better default for any public page.
