# Tenantinc Widget Suite

React + TypeScript widgets for Duda sites, built as AMD bundles and loaded via Duda's External App mechanism.

---

## Table of contents

1. [Project structure](#project-structure)
2. [Scripts](#scripts)
3. [Local dev harness](#local-dev-harness)
4. [Adding a new widget](#adding-a-new-widget)
5. [Deploying a widget to Duda](#deploying-a-widget-to-duda)
6. [Content panel config — connecting Duda editor fields to your widget](#content-panel-config)
7. [Hummingbird API client](#hummingbird-api-client)

---

## Project structure

```
tenantinc-widgets/
├── src/
│   ├── shared/
│   │   ├── createWidget.tsx # Wraps a React component as a Duda app (init/clean)
│   │   ├── components/     # Card, Button — used across widgets
│   │   ├── hooks/          # useInterval — used across widgets
│   │   ├── api/            # HummingbirdClient stub
│   │   └── types/          # Shared TypeScript interfaces
│   ├── widget-hero/
│   │   ├── index.tsx       # One-liner: createWidget(Hero) → exports init/clean
│   │   └── Hero.tsx        # React component
│   └── widget-clock/
│       ├── index.tsx
│       └── Clock.tsx
├── dev/
│   └── index.html          # Local testing harness (require.js + both widgets)
├── dist/                   # Generated — one AMD bundle per widget
├── webpack.config.js
├── tsconfig.json
└── package.json
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run build` | Compile all widgets to `dist/` (AMD, minified) |
| `npm run dev` | Start dev server at `http://localhost:3000` with the test harness |
| `npm run typecheck` | Type-check without emitting files |
| `npm run lint` | ESLint over all TypeScript source |
| `npm run smoke` | Build, then headless-render the widgets (jsdom) to verify they mount, style, and filter without a browser |

---

## Local dev harness

The `dev/` harness loads the AMD bundles via **require.js** — the same loader Duda uses — so local testing genuinely mirrors production behaviour.

```
npm run dev
# open http://localhost:3000
```

The harness gives you:

- Both widgets mounted on page load with sample props
- Dropdowns to change layout/timezone, which call `init()` again with new props — simulating what Duda does when a site editor changes a content panel field
- A **clean()** button per widget to test the unmount lifecycle

> **Note:** The first `npm run dev` will also write the bundles to `dist/` on disk via `writeToDisk`. Subsequent saves trigger a live reload.

---

## Adding a new widget

1. Create `src/widget-foo/Foo.tsx` for the React component.
2. Create `src/widget-foo/index.tsx` — a single line that wraps the component with `createWidget`:

```tsx
import { createWidget } from '@shared/createWidget';
import { Foo } from './Foo';
import type { FooProps } from '@shared/types';

export const { init, clean } = createWidget<FooProps>(Foo);
```

`createWidget` provides the `init`/`clean` lifecycle Duda expects, including the
root-management that survives Duda's content-panel updates (see
[Live editor updates](#live-editor-updates--how-re-renders-work)). You never
write that logic per-widget.

3. Add **one line** to `webpack.config.js`:

```js
const widgetEntries = {
  'widget-hero':  './src/widget-hero/index.tsx',
  'widget-clock': './src/widget-clock/index.tsx',
  'widget-foo':   './src/widget-foo/index.tsx',  // ← add this
};
```

4. Add sample props for the widget to `dev/index.html` if you want to test it locally.

That's it — no other config changes needed.

### Styling

Widgets may use inline styles (like `widget-hero`) or import a real stylesheet
(like `widget-space-list`): `import './MyWidget.css'`. CSS is bundled **into**
the widget's `.js` and injected as a `<style>` tag at runtime by `style-loader`,
so there's still only one CDN file per widget. Prefix your classes (e.g.
`.suf-`) and scope rules under the widget's root element so they don't leak into
the host Duda page — there is no CSS-module isolation.

For a larger, data-driven example — component breakdown, a typed data seam, and
functional filtering — see [`src/widget-space-list/`](src/widget-space-list/)
and its [`HANDOFF.md`](src/widget-space-list/HANDOFF.md).

---

## Deploying a widget to Duda

### 1. Build the bundle

```
npm run build
```

This produces `dist/widget-hero.js`, `dist/widget-clock.js`, etc. Each file is a self-contained AMD module (React included — no external dependencies).

### 2. Host the bundle on a CDN

Upload the bundle to your CDN, e.g.:

```
https://cdn.tenantinc.com/widgets/widget-hero.js
```

### 3. Wire it up in Duda's Widget Builder

In Duda's Widget Builder, paste the following into the **JS** tab. This is the shell Duda executes when it renders the widget on a page:

```js
function(element, data, api) {
  var scriptSrc = 'https://cdn.tenantinc.com/widgets/widget-hero.js';

  api.scripts.renderExternalApp(scriptSrc, element, {
    title:    data.config.title,
    subtitle: data.config.subtitle,
    layout:   data.config.layout,
    ctaLabel: data.config.ctaLabel,
    ctaHref:  data.config.ctaHref,
  });
}
```

Key points:
- `renderExternalApp` takes **positional arguments** — `(scriptSrc, container, props, options)`. Not an options object.
- Duda loads the bundle via **require.js** (`options.amd` defaults to `true`). The bundle must be AMD format — which is what this repo builds.
- Duda calls your bundle's exported `init({ container, props })` automatically.
- When the widget is removed from the page, Duda calls `clean()`.

---

## Content panel config

This is how you connect Duda's visual editor fields to your widget's props. The pattern is equivalent to `{{variableName}}` in a Duda HTML widget — same editor experience for the site editor user, just wired differently.

### How it works

In the Widget Builder, you define fields in the **Content Editor** tab. Each field has a **variable name**. When the widget renders, Duda passes all content panel values into your JS function as `data.config`:

```js
data.config.title    // → whatever the site editor typed in the "Title" field
data.config.layout   // → whichever dropdown option they selected
```

You then forward whichever fields you need as the `props` argument to `renderExternalApp()`. They arrive in your widget's `init({ container, props })` as `props.title`, `props.layout`, etc.

### Example: text fields

**Content Editor tab:** Add a text input, set variable name to `title`. Add another, variable name `subtitle`.

**JS tab:**
```js
function(element, data, api) {
  api.scripts.renderExternalApp(
    'https://cdn.tenantinc.com/widgets/widget-hero.js',
    element,
    {
      title:    data.config.title,
      subtitle: data.config.subtitle,
    }
  );
}
```

**In your widget (`Hero.tsx`):** `props.title` and `props.subtitle` are whatever the site editor entered.

### Example: dropdown for layout switching

This is how you drive multiple layout variants from a single widget — the site editor picks a layout from a dropdown and the widget re-renders live.

**Content Editor tab:** Add a select/dropdown field, variable name `layout`, with options `default`, `centered`, `split`.

**JS tab:**
```js
function(element, data, api) {
  api.scripts.renderExternalApp(
    'https://cdn.tenantinc.com/widgets/widget-hero.js',
    element,
    {
      title:  data.config.title,
      layout: data.config.layout,   // 'default' | 'centered' | 'split'
    }
  );
}
```

**In your widget:**
```tsx
// Hero.tsx — props.layout drives which JSX branch renders
if (layout === 'centered') return <Card><div style={{ textAlign: 'center' }}>...</div></Card>;
if (layout === 'split')    return <Card><div style={{ display: 'flex' }}>...</div></Card>;
return <Card>...</Card>;
```

When the site editor changes the dropdown, Duda calls `renderExternalApp()` again, which calls your `init()` again with the new props. `createWidget` handles the re-render correctly so the layout shifts live in the editor preview — see the section below for why this is more subtle than it looks.

### Live editor updates — how re-renders work

Duda calls `renderExternalApp()` once on page load and again **every time** a content panel field changes. Your `init()` is therefore called multiple times. Getting this right is the core of the whole framework, and it is more subtle than it first appears.

#### The gotcha: Duda wipes your container on every update

`renderExternalApp`'s `options.keepSubtree` **defaults to `false`** — meaning that on each content-panel update, Duda re-runs the widget and **empties the DOM subtree inside `container`** *before* calling `init()` again. It reuses the same container element; it just guts its contents.

This breaks the naive React pattern:

```ts
// ❌ DO NOT do this — looks correct, fails in Duda
let root: Root | null = null;
export function init({ container, props }) {
  if (!root) root = createRoot(container);
  root.render(<YourComponent {...props} />);
}
```

`createRoot(container)` builds an internal **fiber tree** — React's private model of the DOM it rendered. When Duda wipes the container behind React's back, that model goes stale. The next `root.render()` diffs the new output against the fiber tree (which still believes the old DOM is present), computes a tiny patch, and tries to update nodes **that no longer exist** — so it paints nothing. The widget goes blank and never recovers, because React's model stays permanently out of sync. (A container-identity check like `container !== rootContainer` does **not** catch this — it's the *same* container, just emptied.)

#### The fix: mount into our own child node

`createWidget` (in `src/shared/createWidget.tsx`) solves this by mounting React onto a child `<div>` we create *inside* the container, rather than on the container itself. When Duda wipes the container, our child node is removed too — giving us a reliable tripwire. On the next `init()` we detect the detachment and rebuild a fresh root:

```ts
export function createWidget<TProps extends object>(Component) {
  let root: Root | null = null;
  let mountEl: HTMLElement | null = null;
  let rootContainer: HTMLElement | null = null;

  function init({ container, props }) {
    const detached = !mountEl || mountEl.parentNode !== container;
    if (root && (detached || container !== rootContainer)) {
      root.unmount();
      root = null;
      mountEl = null;
    }
    if (!root) {
      mountEl = document.createElement('div');
      container.appendChild(mountEl);
      root = createRoot(mountEl);
      rootContainer = container;
    }
    root.render(React.createElement(Component, props));
  }

  function clean() {
    root?.unmount();
    root = null;
    mountEl = null;
    rootContainer = null;
  }

  return { init, clean };
}
```

This handles all three cases that occur in Duda:

| Situation | What we detect | What we do |
|---|---|---|
| First render | no root yet | create child node + root |
| Duda wiped the container (the update case) | `mountEl.parentNode` is now `null` | unmount stale root, rebuild fresh |
| Duda hands a brand-new container | `container !== rootContainer` | unmount stale root, rebuild fresh |

Because every widget is built with `createWidget`, all content panel changes — text, dropdowns, toggles, image pickers — are reflected in real time with no per-widget work.

> **Note:** You do **not** need to set `keepSubtree: true` in the Duda JS to make this work. The fix lives entirely in the bundle, which keeps your Duda config dead simple and makes the widgets robust regardless of host cleanup behaviour.

### Supported field types

Duda's Content Editor supports: text input, textarea, number, toggle/checkbox, select/dropdown, image picker, link picker, colour picker. All of them land in `data.config` by their variable name and can be forwarded as props.

#### Toggle fields are real booleans — no conversion needed

Duda passes toggle values as actual JavaScript `true` / `false`, not the strings `"true"` / `"false"`. Forward them directly:

```js
// ✅ Correct
showInstorePrice: data.config.showInstorePrice,

// ❌ Wrong — do not do this
showInstorePrice: data.config.showInstorePrice !== 'false',
showInstorePrice: data.config.showInstorePrice === 'true',
```

The widget's TypeScript prop types (`boolean`) match exactly — no adapter code is needed anywhere.

#### Groups are visual only — fields stay flat in data.config

Adding a **group** in the Content Editor is purely a UI affordance (collapsible section in the editor panel). It does **not** create a nested namespace in `data.config`. Fields inside a group called `clientConfig` are still accessed as `data.config.fieldName`, not `data.config.clientConfig.fieldName`.

```js
// ✅ Correct — even if the field lives inside a group in the editor
showInstorePrice: data.config.showInstorePrice,

// ❌ Wrong
showInstorePrice: data.config.clientConfig.showInstorePrice,
```

#### GitHub Pages CDN cache — wait after deploying

After `git push`, GitHub Pages may serve a stale bundle for up to 10–15 minutes while the CDN invalidates. If a widget appears not to respond to new props immediately after a push, wait a few minutes and hard-refresh before debugging further.

### Passing non-editor data (additionalData)

If you need to pass data that doesn't come from the editor — e.g. a proxy base URL determined at build time — use `options.additionalData`. It arrives in `init()` as spread properties alongside `container` and `props`:

```js
// JS tab in Duda
api.scripts.renderExternalApp(scriptSrc, element, props, {
  additionalData: { proxyBaseUrl: 'https://proxy.tenantinc.com' },
});
```

`createWidget` currently forwards only `props` to your component. The simplest way to consume `additionalData` today is to fold it into the props you pass from the Duda JS tab. If a widget genuinely needs the spread `init({ container, props, ...additionalData })` shape, write that widget's `index.tsx` by hand instead of using `createWidget` — but keep the mount-into-own-child logic from `createWidget`, or it will hit the [blank-on-update bug](#live-editor-updates--how-re-renders-work).

> Never put API keys or secrets in `props` or `additionalData` — both are visible in the browser. All secrets must stay server-side in the proxy.

---

## Hummingbird API client

`src/shared/api/hummingbird.ts` contains a typed stub client. Widgets never call Hummingbird directly — all requests go through a server-side proxy, whose URL is supplied at runtime (via `additionalData` or a build-time env var). No credentials belong in the widget bundle.

To implement a real method, replace the stub body in `HummingbirdClient` with a `fetch` call to `this.proxyBaseUrl`:

```ts
async getProperties(): Promise<Property[]> {
  const res = await fetch(`${this.proxyBaseUrl}/properties?tenantId=${this.tenantId}`);
  if (!res.ok) throw new Error(`Hummingbird proxy error: ${res.status}`);
  return res.json();
}
```
