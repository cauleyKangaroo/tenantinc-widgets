# AGENTS.md — Tenantinc Widgets Codebase Guide

This is a **React + TypeScript widget library** that compiles to AMD modules for Duda (a web builder platform). The critical insight: **Duda's lifecycle gotcha requires special handling that's already baked into `createWidget`**.

## The One Big Thing: Duda's Container Wipe & createWidget Pattern

**The problem:** When a site editor changes a content panel field in Duda, the platform:
1. Calls your widget's `init()` again with new props
2. **Empties the DOM container before calling init again** (wipes subtree)

If you mount React directly on `container`, React's internal fiber tree goes out of sync with the now-empty DOM. `root.render()` then diffs against stale nodes and paints nothing — the widget goes blank forever.

**The solution** (already implemented in `src/shared/createWidget.tsx`):
- Mount React into our own **child `<div>`** inside the container, not the container itself
- On each `init()` call, detect if `mountEl.parentNode !== container` (our child was wiped)
- If detached, unmount the stale root and build a fresh one
- New props are rendered into the fresh root

**For agents:** Every widget must be built with `createWidget<TProps>(Component)`. This returns `{ init, clean }` that Duda expects. **Never write custom lifecycle logic**—it's already there. See `src/shared/createWidget.tsx` (53 lines, read it first when starting work).

## Adding a Widget

1. **Create component:** `src/widget-{name}/{Name}.tsx` (React component with typed props)
2. **Wrap it:** `src/widget-{name}/index.tsx` — one line:
   ```tsx
   import { createWidget } from '@shared/createWidget';
   import { YourComponent } from './YourComponent';
   import type { YourProps } from '@shared/types';
   
   export const { init, clean } = createWidget<YourProps>(YourComponent);
   ```
3. **Register in webpack:** Add one line to `webpack.config.js` in `widgetEntries`:
   ```js
   'widget-name': './src/widget-{name}/index.tsx',
   ```
4. **Add sample props** to `dev/index.html` if testing locally
5. **Done.** No other config changes needed.

## Build & AMD Output

- `npm run build` → produces `dist/widget-*.js` (AMD modules, self-contained, React included internally)
- **Critical:** Output is **AMD format only**. Duda loads via `require.js`. Do NOT change `libraryTarget` in webpack.config.js.
- CSS and images are base64-inlined into the `.js`. This keeps each widget as one CDN file.
- No separate build step required after adding a widget entry — webpack handles it.

## Data Flow: Duda → Widget

```
Content Panel (editor fields)
  ↓
Duda JS function (renderExternalApp)
  ↓
props object passed to init({ container, props })
  ↓
Your React component receives props
  ↓
When editor changes a field → init() called again with new props → createWidget detects container change → fresh render
```

**Key insight:** Props are the only connection between Duda and your widget. No global state, no window pollution.

## API Pattern: Hummingbird via Proxy

- **Never call Hummingbird directly.** All requests go through a server-side proxy (URL supplied at runtime).
- **No secrets in bundles.** All API keys stay server-side.
- `src/shared/api/hummingbird.ts` is a typed stub. Real implementations call `fetch(${this.proxyBaseUrl}/endpoint)`.
- Pass `proxyBaseUrl` and `tenantId` via `props` from Duda's JS tab or via `options.additionalData`.

See the `widget-space-list` handoff guide for a concrete example: the widget does `fetch(${proxyBaseUrl}/spaces?tenantId=...)` to get unit data.

## Project Structure & Shared Conventions

```
src/shared/              # Used by all widgets
  createWidget.tsx      # THE lifecycle pattern — read this first
  api/hummingbird.ts    # Typed API stub
  components/           # Button, Card — reusable UI bits
  hooks/                # useInterval — reusable logic
  types/index.ts        # Shared TypeScript interfaces

src/widget-{name}/      # One folder per widget
  index.tsx             # One line: createWidget(Component)
  {Name}.tsx            # Main React component
  (optional) {Name}.css # CSS bundled into .js via style-loader
  types.ts              # Widget-specific types if needed
```

**Path alias:** `@shared/*` resolves to `src/shared/*` (configured in `tsconfig.json` and webpack).

## Styling & CSS Classes

- Import CSS: `import './MyWidget.css'` — bundled inline at build time
- **Scope classes** under the widget's root element — no CSS-module isolation exists
- Prefix class names (e.g., `.suf-card`, `.suf-button`) to avoid leaking into the host Duda page
- All CSS lives inside your widget folder; no global stylesheet

## Testing & Validation

```bash
npm run typecheck       # TS check without emitting (fast)
npm run lint            # ESLint over all TypeScript source
npm run dev             # Dev server at http://localhost:3000 with require.js harness
npm run smoke           # Build + headless jsdom render (jsdom + require.js)
npm run build           # Production build → dist/
```

**Dev harness** (`dev/index.html`):
- Loads both widgets via require.js (same loader Duda uses)
- Dropdowns to change layout/timezone on the fly (simulates editor updates)
- Clean button per widget (tests unmount lifecycle)
- Add sample props here when adding a new widget

## Complex Widget Example: widget-space-list

This is the "real" widget with data fetching, filtering, grid/list views, and responsive layout. Reference it when:
- Implementing filtering logic → `filters.ts` shows the pattern
- Fetching data → `SpaceList.tsx` shows the `useState` + `useEffect` pattern
- Type-safe data contracts → `types.ts` defines the `Unit` interface that all components render against
- See `HANDOFF.md` in that folder for implementation notes (replacing static data with Hummingbird calls, filtering rules, etc.)

## TypeScript & Linting

- Strict mode enabled (`"strict": true`)
- React 18 (`"jsx": "react-jsx"`)
- ESLint + Prettier configured (run `npm run lint` before committing)
- All widgets must export `{ init, clean }` with compatible types

## Common Gotchas

1. **Container gets wiped** → handled by createWidget, don't bypass it
2. **Props as the only bridge** → can't access global state or window variables from Duda; pass everything as props
3. **No separate CSS files** → bundle one `.css` file per widget, keep it scoped
4. **AMD format required** → do not change webpack `libraryTarget`
5. **Cache delay on GitHub Pages CDN** → wait 10–15 minutes after a push before hard-testing; stale bundles can be served
6. **Styling leaks** → prefix classes and scope under widget root; there is no isolation layer

## When Adding Features

- **New component?** Check if it belongs in `src/shared/components/` first (might be reused)
- **New hook?** Same—check `src/shared/hooks/`
- **New API method?** Implement in `src/shared/api/hummingbird.ts` (follow the proxy pattern)
- **New widget?** Follow the four-step process above; the scaffold is minimal by design
- **Testing new logic?** Add to `dev/smoke-test.js` (jsdom-based smoke test) or update the dev harness HTML

## Files to Read When Starting

1. `src/shared/createWidget.tsx` (53 lines) — understand the lifecycle pattern first
2. `README.md` → project context, Duda integration, content panel fields
3. `src/widget-space-list/types.ts` and `HANDOFF.md` → example of a real data-driven widget
4. `webpack.config.js` (84 lines) — understand the output shape and why AMD is required

