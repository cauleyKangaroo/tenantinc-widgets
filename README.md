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
│   │   ├── components/     # Card, Button — used across widgets
│   │   ├── hooks/          # useInterval — used across widgets
│   │   ├── api/            # HummingbirdClient stub
│   │   └── types/          # Shared TypeScript interfaces
│   ├── widget-hero/
│   │   ├── index.tsx       # Duda lifecycle: exports init() and clean()
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

1. Create `src/widget-foo/index.tsx` with `init()` and `clean()` exports (copy from an existing widget).
2. Create `src/widget-foo/Foo.tsx` for the React component.
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

When the site editor changes the dropdown, Duda calls `renderExternalApp()` again, which calls your `init()` again with the new props. Because `init()` reuses the existing React root (rather than creating a new one), React simply re-renders with the updated props — the layout shifts live in the editor preview.

### Live editor updates — how re-renders work

Duda calls `renderExternalApp()` once on page load and again **every time** a content panel field changes. Your `init()` is therefore called multiple times on the same container. The correct pattern (already in place in this repo) is:

```ts
let root: Root | null = null;

export function init({ container, props }) {
  if (!root) {
    root = createRoot(container); // first mount only
  }
  root.render(<YourComponent {...props} />); // re-render on subsequent calls
}

export function clean() {
  root?.unmount();
  root = null;
}
```

This means all content panel changes — text, dropdowns, toggles, image pickers — are reflected in real time with no extra work on your side.

### Supported field types

Duda's Content Editor supports: text input, textarea, number, toggle/checkbox, select/dropdown, image picker, link picker, colour picker. All of them land in `data.config` by their variable name and can be forwarded as props.

### Passing non-editor data (additionalData)

If you need to pass data that doesn't come from the editor — e.g. a proxy base URL determined at build time — use `options.additionalData`. It arrives in `init()` as spread properties alongside `container` and `props`:

```js
// JS tab in Duda
api.scripts.renderExternalApp(scriptSrc, element, props, {
  additionalData: { proxyBaseUrl: 'https://proxy.tenantinc.com' },
});
```

```ts
// index.tsx
export function init({ container, props, proxyBaseUrl }: DudaInitParams & { proxyBaseUrl?: string }) {
  // proxyBaseUrl available here
}
```

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
