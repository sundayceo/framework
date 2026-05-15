# Deep handler with platform context and virtual server entry

The framework's module architecture is restructured around a single deep `createHandler` that accepts codegen output directly, a typed platform context for runtime-agnostic deployment, and a Vite virtual module (`@sundayceo/framework/server-entry`) that eliminates the user-written server entry file. This replaces the previous design where `createRequestHandler` required manual wiring (type guards, module loaders, template resolvers) and a separate Cloudflare adapter injected platform-specific values.

The motivation is threefold: (1) the codegen already produces everything the handler needs — users shouldn't write 40 lines of glue to connect them; (2) the Cloudflare adapter's only job was merging `env`/`ctx` into the context, which belongs in the context factory; (3) several internal modules were shallow (interface nearly as complex as implementation) and split concerns that belong together.

## Design

### `createHandler` — single entry point

Replaces both `createRequestHandler` and the `cloudflare` adapter. Accepts the codegen output shape directly:

```ts
type HandlerOptions<TPlatform> = {
  app: AppConfig<TPlatform>;
  routes: GeneratedRoute[];
  templates: GeneratedTemplates;
};

function createHandler<TPlatform>(
  options: HandlerOptions<TPlatform>
): { fetch(request: Request, platform?: TPlatform): Promise<Response> }
```

Internally owns: route matching, module loading (unwraps dynamic imports), context assembly, page vs handler dispatch, the full render pipeline, and error page recovery with circuit breaker.

### Platform context — typed, not adapter-specific

The context factory receives the platform context as its second argument:

```ts
const app = createApp<{ env: Env; ctx: ExecutionContext }>({
  context: (request, platform) => ({
    db: platform.env.DB,
  }),
});
```

Platform context flows: entry shim → `handler.fetch(request, platform)` → context factory → request context. When no platform context is passed (e.g. during dev or on Bun), `platform` is `undefined`.

### Entry shim — per-platform, 1–3 lines

Each platform has a thin shim that maps its calling convention to `handler.fetch`:

```ts
// entry.cloudflare.ts
import handler from "@sundayceo/framework/server-entry";
export default {
  fetch: (req, env, ctx) => handler.fetch(req, { env, ctx }),
};
```

Scaffolded by the CLI. Swapped when ejecting to a different platform.

### Virtual server entry — `@sundayceo/framework/server-entry`

A Vite virtual module resolved by the plugin. Generates handler wiring from conventions (`app.ts` + `routes.gen.ts`) — no file on disk. Used by the entry shim and the production build.

### Dev middleware — convention-based, no server file needed

In dev, the Vite dev middleware loads `app.ts` and `routes.gen.ts` via `ssrLoadModule`, builds the handler internally, and bridges Node HTTP ↔ Web Request/Response. No `server.ts` required. The Vite plugin's codegen keeps `routes.gen.ts` up to date on file changes — the dev middleware no longer scans routes independently.

### Render pipeline — deepened

`renderPage` owns the full SSR-to-hydrated-HTML pipeline: run loader, resolve meta, call defineSlots, render React to HTML, run interactivity inference, inject hydration markers and scripts. Callers get complete HTML from a single call. `resolveMeta`, `renderMeta`, `runLoader`, and the hydration modules (`isInteractive`, `injectHydration`, `generateHydrationScript`) become internal implementation details.

### Error pages — orchestrated by createHandler, rendered by renderPage

When a page or handler throws, `createHandler` catches the error, builds an error context (`{ status, message, stack? }`), attaches it to the error page's loader context as `ctx.error`, and calls `renderPage` with the error page module. `renderPage` doesn't know it's rendering an error page — it just renders a page module with loader data. If the error page itself throws, `createHandler` falls back to bare HTML (circuit breaker).

### Codegen — unified

A single codegen module owns scanning, route map generation, template registry generation, and manifest generation. The Vite plugin is the sole caller. The duplicated scanning between the plugin and dev middleware is eliminated.

## What gets removed

- `cloudflare.ts` — replaced by entry shim + platform context on context factory
- `resolve-meta.ts` — inlined into renderPage
- `render-meta.tsx` — inlined into renderPage
- `run-loader.ts` — inlined into renderPage
- `template-resolver.ts` — dead code, superseded by createHandler's internal module loading
- `generate-declarations.ts` — 13-line pass-through, inlined into codegen module

## Considered Options

- **Keep `createRequestHandler` with callback-based interface**: Maximum flexibility (callers inject their own module loaders). Rejected because every caller writes the same boilerplate to bridge the codegen output to the callback interface. The flexibility isn't used — only two callers exist (production entry, dev middleware), and both do the same thing.
- **SvelteKit model — Vite plugin generates the complete entry per platform**: Zero user-written files. Rejected because it couples the Vite plugin to every deployment platform and removes the user's ability to customize the entry point. The entry shim is simple enough that generating it adds complexity without meaningful DX gain.
- **Hono model — rest args (`fetch(request, ...args)`) instead of single platform object**: Handler signature matches Cloudflare Workers' `fetch(request, env, ctx)` natively. Rejected because rest args can't be typed per-platform without overloads, and a single `platform` object is a cleaner seam between the framework and the runtime.
- **Keep separate Cloudflare adapter**: Familiar pattern from Remix (`@remix-run/cloudflare`). Rejected because the adapter's only job was merging env/ctx into context — a 5-line concern that belongs in the context factory, not a separate module. A dedicated adapter implies custom logic that doesn't exist.
