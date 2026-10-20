# Navigation Bar (#02) — Duda content-menu setup

How to wire the Duda editor fields to the widget props added for the client's
"Nav Bar Settings" menu.

## Props the widget accepts

| Prop | Type | Default | Drives |
|---|---|---|---|
| `height` | `'narrow' \| 'wide'` | `narrow` | Primary-bar height: 100px vs 180px |
| `logoStyle` | `'banner' \| 'inline'` | `banner` | Raised overlapping tile vs inline logo |
| `separator` | `'shadow' \| 'line' \| 'none'` | `shadow` | Bottom edge of the nav |
| `showTopBar` | boolean | `true` | The grey utility bar on top |
| `showPhone` | boolean | `true` | Phone number item |
| `showChat` | boolean | `true` | Chat Bot / Live Chat item |
| `showAccount` | boolean | `true` | My Account item |
| `showPayBill` | boolean | `true` | Bill Pay item |
| `showLanguage` | boolean | `true` | Language selector item |
| `payBillUrl` | string | `#` | Bill Pay link |
| `accountUrl` | string | `#` | My Account link |

The item toggles apply to whichever bar is active — the grey top bar when
`showTopBar` is on, otherwise the inline actions in the main bar.

> **Note on semantics:** the Figma mock frames the item checkboxes as "move
> from the main bar to the top bar." This is implemented as simple **show/hide**
> (what the client asked for verbally), not a move. The standalone "Language
> Selection" checkbox at the top of the Navigation group in the mock is
> consolidated into the single `showLanguage` toggle.

Ignored per client instruction: Widget Background Color, Solid-Line colour
(both go in the design menu), and the Dropdown-vs-Mega-Menu radio (not ready).

---

## Prompt for the Duda AI content-menu builder

> Build a content menu for a widget called "Nav Bar Settings" with these fields.
> Use the exact variable names given.
>
> 1. **Height** — a radio/select field, variable name `height`, with two options:
>    "Narrow (100px)" (value `narrow`, selected by default) and
>    "Wide (180px)" (value `wide`).
>
> 2. A group titled **Navigation** containing:
>    - A toggle "Add Navigation Top Bar", variable name `showTopBar`, default ON.
>      Helper text: "Show the grey utility bar above the main navigation."
>    - The following five toggles, each **only visible when `showTopBar` is ON**
>      (conditional visibility). Helper text for the group: "Show or hide each
>      item in the top bar."
>      - "Phone Number" — variable `showPhone`, default ON
>      - "Chat Bot" — variable `showChat`, default ON
>      - "My Account" — variable `showAccount`, default ON
>      - "Bill Pay" — variable `showPayBill`, default ON
>      - "Language Selection" — variable `showLanguage`, default ON
>
> 3. A group titled **Logo** with a radio field, variable name `logoStyle`,
>    options: "Banner (Overlapping the Nav Bar)" (value `banner`, default) and
>    "Inline" (value `inline`).
>
> 4. A group titled **Separator** with a radio field, variable name `separator`,
>    options: "Dropshadow" (value `shadow`, default), "Solid Line" (value
>    `line`), and "No Separator" (value `none`).
>
> 5. A group titled **Enable external URL's** containing:
>    - A toggle "Bill Pay", variable name `enableBillPayUrl`, default OFF. When
>      it is ON, show a link/URL field, variable name `payBillUrl`, label
>      "Bill Pay link".
>    - A toggle "My Account", variable name `enableAccountUrl`, default OFF. When
>      it is ON, show a link/URL field, variable name `accountUrl`, label
>      "My Account link".
>
> Do not add a background-colour field, a separator colour field, or a
> "Storage Locations" dropdown/mega-menu field.

---

## JS tab

Paste this into the widget's **JS** tab in the Duda Widget Builder. It forwards
the content-menu values to the bundle. (`enableBillPayUrl` / `enableAccountUrl`
only drive the conditional URL fields in the editor — the widget just needs the
URLs, which are `undefined` when their toggle is off and fall back to `#`.)

> The JS tab is the function **body** — `element`, `data`, `api` are already in
> scope. Do **not** wrap it in `function(element, data, api){…}`.

```js
api.scripts.renderExternalApp(
  'https://cauleykangaroo.github.io/tenantinc-widgets/dist/widget-navigation-bar.js',
  element,
  {
    height:       data.config.height,        // 'narrow' | 'wide'
    logoStyle:    data.config.logoStyle,     // 'banner' | 'inline'
    separator:    data.config.separator,     // 'shadow' | 'line' | 'none'
    showTopBar:   data.config.showTopBar,
    showPhone:    data.config.showPhone,
    showChat:     data.config.showChat,
    showAccount:  data.config.showAccount,
    showPayBill:  data.config.showPayBill,
    showLanguage: data.config.showLanguage,
    payBillUrl:   data.config.payBillUrl,
    accountUrl:   data.config.accountUrl,
  }
);
```

> The github.io URL serves the **`master`** branch (production). Merge this work
> to `master` before the live menu will pick up the new props, or point the
> bundle URL at a staging bundle while testing.

---

## Reserving the nav's height (CLS)

**The nav's layout shift is NOT fixable from this repo.** Measured on the dev
harness at 1440px: a single layout shift of **0.282** (the "poor" band starts at
0.25) at ~1.6s, every section below the nav dropping 71px as the container goes
from 60px to its final 131px. Nothing shifts after that.

That jump happens while the bundle is still downloading, so nothing React
renders can prevent it — including the skeleton added to the links row, which
paints at the same moment and the same height as the real nav. Our CSS cannot
hold the space either: it is bundled by `style-loader` and injected at runtime,
so it does not exist until the bundle runs.

The only thing on the page before then is what Duda writes into the server
HTML, which means the widget's own **HTML and CSS tabs**.

### HTML tab

Wrap the mount point:

```html
<div class="hb-reserve" style="--h-d: 131px; --h-t: 72px; --h-m: 64px;">
  <div id="nav-mount"></div>
</div>
```

### CSS tab

```css
.hb-reserve { min-height: var(--h-d); }
@media (max-width: 1024px) { .hb-reserve { min-height: var(--h-t); } }
@media (max-width: 640px)  { .hb-reserve { min-height: var(--h-m); } }
```

### The numbers

Measured settled heights, with the breakpoints taken from
`NavigationBar.css` (1024px drops the grey top bar, 640px is the phone layout):

| Viewport | Height | Made of |
|---|---|---|
| > 1024px | **131px** | 46px top bar + 85px main bar |
| ≤ 1024px | **72px** | main bar only, top bar hidden |
| ≤ 640px | **64px** | mobile bar |

Heights come from `min-height` rules, not content, so they do not move with the
data. The one exception is the **Wide** height setting (content menu: Height),
which makes the main bar 180px instead of 85px — an instance set to Wide needs
`--h-d: 226px`.

Keep the custom properties inline on the element rather than hard-coding the
numbers in the CSS tab: every widget can then share the identical rule without
instances fighting over one class name.
