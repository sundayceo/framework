# Two-pass build with compiler-level slot extraction for per-slot hydration

Implements ADR-0002's automatic interactivity inference by extracting each slot's JSX into standalone virtual modules at compile time, then producing a separate client build containing only interactive slots. The server build embeds the client manifest so it can reference hashed asset paths at runtime.

We chose compiler-level extraction (over runtime source analysis) because it ships zero dead code to the client — each interactive slot becomes its own minimal entry point containing only its JSX, local bindings, and imports. A two-pass build (client then server) follows the same proven pattern as Astro's islands architecture.

The tradeoff is significant compiler complexity: the Vite plugin must parse `defineSlots` AST, resolve identifier closures, and emit virtual modules. This is harder to maintain than a simpler "ship the whole route module" approach, but it's the only way to guarantee per-slot code splitting without developer intervention.

## Architecture

### Build order

1. **Client build** — Vite bundles each `virtual:hydrate/{route}/{slot}` as an entry point. Rollup code-splits React into a shared vendor chunk. Output goes to `dist/client/assets/`.
2. **Server build** — `vite build --ssr entry.cloudflare.ts`. Imports the client build's manifest (`.vite/manifest.json`) as a JSON module, embedding hashed asset paths into the Worker bundle. Output goes to `dist/server/`.

### Slot extraction (Vite plugin, compile time)

The plugin parses each route module's `defineSlots` function via Babel AST:

1. Find the `defineSlots` property (arrow or function expression)
2. For each key in the returned object, extract the JSX expression
3. Walk the AST to collect referenced identifiers
4. Trace each identifier to its source: import statement, local binding, or `loaderData`
5. Emit a virtual module containing only: React import, required imports, required locals, and a `HydrateSlot({ loaderData })` default export

Supports: inline JSX, imported components, local variables, helper functions, conditionals, multi-component trees. No constraints on what developers write inside `defineSlots`.

### Hydration manifest

```ts
// virtual:hydration-manifest
export default {
	"/demo": { main: true, header: false, footer: false },
	"/blog/[slug]": { main: false, header: false, footer: false },
};
```

Computed at `buildStart` (prod) or lazily per-request (dev, using Vite module graph for HMR freshness). When all slots are `false`, `renderPage` skips hydration injection entirely — zero JS guarantee preserved.

### Client-side hydration script

Each interactive slot gets an inline `<script type="module">`:

```js
import HydrateSlot from "/assets/hydrate-demo-main-abc123.js";
import { hydrateRoot } from "/assets/react-vendor-def456.js";

const data = JSON.parse(document.querySelector('[data-hydrate-data="main"]').textContent);
hydrateRoot(document.querySelector('[data-hydrate="main"]'), HydrateSlot({ loaderData: data }));
```

In dev, imports resolve to Vite-served virtual modules directly (no hashed paths).

### Deployment (Cloudflare Workers)

- `dist/server/index.js` → Worker entry (SSR)
- `dist/client/assets/*` → static assets (served via Workers Static Assets / KV / R2)
- Client manifest inlined in Worker — no runtime filesystem reads

### Dev mode

- Virtual modules served by Vite dev server (no client build needed)
- Interactivity analysis runs lazily per-request using `server.moduleGraph` to read fresh source
- HMR invalidates `virtual:hydrate/*` modules when route files change

## Considered Options

- **Runtime source analysis per-request (option A)**: Pass raw `slotSources` + `importGraph` to `renderPage` at request time. Simpler — no virtual modules, no second build. Rejected because it ships the full route module to the client (dead code: loader, static slots, meta config), and `defineSlots` is a single function that can't be tree-shaken per-slot.
- **Compiler-level slot extraction with two-pass build (chosen)**: Zero dead code, per-slot chunks, shared React vendor. Requires AST parsing and virtual module emission but produces optimal output.
- **esbuild for client build**: Faster bundling. Rejected because virtual module resolution is a Vite concept — replicating Vite's plugin pipeline in esbuild adds complexity. esbuild remains viable as a future optimization since extraction output is valid esbuild input (prototype-verified).
- **Vite Environments API (single build)**: Vite 6 feature for multi-target builds in one config. Rejected for now due to API maturity concerns. Separate `vite.build()` call is proven (same as Astro).
