# Framework 1.0 module architecture

Restructures the framework package from a flat `src/` directory into a layered module architecture with strict boundaries between runtime, codegen, and Vite concerns. Informed by the cloudflare-dynamic-workers prototype, which proved the framework's codegen pipeline can run inside a Cloudflare Worker — but only if the runtime has zero Node.js dependencies and codegen has zero Vite dependencies.

The tradeoff is more directories and import paths to navigate, but each layer has a clear contract: runtime is platform-agnostic (works on Workers, Bun, Node), codegen is pure transforms (string-in/string-out), and Vite is the only layer that touches Node.js APIs or Vite internals. This makes the framework viable both as a Vite-based dev tool and as a programmatic codegen API for multi-tenant platforms.

## Directory structure

```
src/
├── runtime/        → @sundayceo/framework       (main entry point)
│   ├── types.ts                                  (shared runtime types)
│   ├── create-app.ts
│   ├── create-handler.ts
│   ├── define-page.ts
│   ├── define-handler.ts
│   ├── define-error-page.ts
│   ├── render-page.tsx
│   ├── render-error-page.ts
│   ├── handle-error.ts
│   ├── route-matcher.ts
│   ├── slot.tsx
│   ├── extract-slots.ts
│   ├── validate-slots.ts
│   ├── inject-hydration.ts
│   ├── generate-hydration-script.ts
│   ├── redirect-response.ts
│   ├── http-error-response.ts
│   ├── default-error-pages.ts
│   └── view-transition.ts
├── codegen/        → @sundayceo/framework/codegen (public codegen API)
│   ├── build.ts                                   (orchestrator)
│   ├── babel-helpers.ts
│   ├── slot-extraction.ts
│   ├── interactivity-inference.ts
│   ├── hydration-manifest.ts
│   ├── codegen-routes.ts
│   ├── codegen-templates.ts
│   ├── generate-route-manifest.ts
│   ├── generate-server-entry.ts
│   ├── build-client-entries.ts
│   ├── resolve-modules.ts
│   ├── route-scanner.ts
│   ├── transform-route-module.ts
│   ├── file-filters.ts                            (from dissolved conventions/)
│   └── route-paths.ts                             (from dissolved conventions/)
├── codegen-disk/   → internal (CLI + Vite plugin consume directly)
│   ├── scan.ts                                    (read routes/templates from disk)
│   └── write.ts                                   (write framework.gen.d.ts + routes.gen.ts)
├── vite/           → @sundayceo/framework/vite    (Vite plugin entry point)
│   ├── vite-plugin.ts
│   ├── vite-dev-middleware.ts
│   ├── virtual-slot-modules.ts
│   ├── web-request.ts                             (Node ↔ Web Request/Response bridge)
│   ├── hydrate-ids.ts                             (from dissolved conventions/)
│   ├── client-build-config.ts                     (Vite build config factories)
│   ├── server-build-config.ts
│   ├── server-entry-stub.js
│   └── server-entry.d.ts
├── cli.ts          → bin: sundayceo
└── index.ts        → barrel for @sundayceo/framework
```

## Entry points

| Export path                         | Layer   | Dependency rule                                  |
| ----------------------------------- | ------- | ------------------------------------------------ |
| `@sundayceo/framework`              | runtime | Zero Node.js deps. Works on Workers, Bun, Node.  |
| `@sundayceo/framework/codegen`      | codegen | Pure transforms. No Vite, no Node.js filesystem. |
| `@sundayceo/framework/vite`         | vite    | Node.js + Vite deps allowed.                     |
| `@sundayceo/framework/server-entry` | vite    | Virtual module type stub.                        |

The `codegen-disk/` directory is not a public entry point. The CLI and Vite plugin import from it directly.

## Boundary rules

1. **Runtime imports nothing from codegen, vite, or codegen-disk.** It is the dependency root.
2. **Codegen imports nothing from vite or codegen-disk.** It may import types from runtime (e.g. `HandlerConfig` shape for `generateServerEntry`), but only as type-only imports — no runtime code flows from runtime into codegen.
3. **Vite imports from codegen and codegen-disk freely.** It also imports `createHandler` from runtime (direct import in dev middleware, not via `ssrLoadModule`).
4. **Codegen-disk imports from codegen only.** It wraps pure codegen transforms with filesystem I/O.
5. **CLI imports from codegen-disk only.**

## Public API surface

### Runtime barrel (`@sundayceo/framework`)

Functions: `createApp`, `definePage`, `defineHandler`, `defineErrorPage`, `createHandler`, `Slot`, `SlotProvider`, `redirect`, `httpError`, `isRedirectResponse`, `isHttpErrorResponse`, `viewTransitionName`.

Types: `AppConfig`, `ErrorContext`, `Context`, `PageModule`, `HandlerModule`, `SlotMap`, `TemplateComponent`, `TemplateRegistry`, `RouteMap`, `RouteKind`, `Register`, `HandlerConfig`, `RouteEntry`, `GeneratedTemplates`, `GeneratedErrorPages`.

Internal pipeline functions (`matchRoute`, `renderPage`, `defaultNotFoundPage`, `defaultServerErrorPage`) are not exported.

### Codegen barrel (`@sundayceo/framework/codegen`)

Five exports: `codegen`, `generateServerEntry`, `CodegenInput`, `CodegenOutput`, `HydrationManifest`.

No runtime re-exports. No Vite re-exports.

`codegen()` returns structured `clientEntries` (with `routePath`, `slotName`, `moduleSource`) instead of Vite virtual module IDs, so consumers never need to parse `virtual:hydrate/*` strings.

## Key decisions

### `conventions/` dissolved

The prototype's `src/conventions/` directory was a grab bag of shared utilities. Each file moved to its primary consumer: `file-filters.ts` and `route-paths.ts` to `codegen/`, `hydrate-ids.ts` to `vite/`.

### `core/` merged into `runtime/`

The prototype split `core/` (types + define functions) from `runtime/` (request-time code). The boundary was artificial — both are exported from the same barrel, no consumer imports from `core/` directly. Types live in `runtime/types.ts`.

### Shared runtime types in `runtime/types.ts`

`GeneratedTemplates`, `GeneratedErrorPages`, `RouteEntry`, `HandlerConfig` live in a dedicated types file. This eliminates circular dependencies between `create-handler`, `handle-error`, and `render-error-page`.

### `virtual:hydration-manifest` dropped

The hydration manifest lives in `routes.gen.ts` as a static export. No separate virtual module. The Vite plugin rewrites `routes.gen.ts` on route file changes (add, unlink, and content changes), and Vite's native file watching handles HMR.

### Runtime doesn't know about Vite virtual module IDs

The Vite dev middleware populates `slotAssets` with virtual module paths before calling `renderPage`. The runtime never constructs `virtual:hydrate/*` strings. `formatHydrateId` lives exclusively in `vite/`.

### Build configs live in `vite/`

`client-build-config.ts` and `server-build-config.ts` import Vite's `UserConfig` type. They belong in the Vite layer, not codegen.

## Code style rules

- **Re-exports only in barrel files.** Internal modules export at the declaration site (`export function`, `export type`). No `export {}` blocks.
- **JSDoc on all exported functions and types.** Single-line. No `@param`/`@returns` unless types are insufficient. No JSDoc on file-private functions.
- **Blank lines between logical steps** inside function bodies. Each distinct phase (destructure, validate, transform, return) gets visual separation.
- **File ordering:** imports → types → constants → private functions → exported functions.

## Considered options

- **Keep `conventions/` as a shared directory**: Rejected — the contents had no unifying domain concept. Moving each file to its primary consumer eliminates a directory that existed only for implementation convenience.
- **Keep `core/` separate from `runtime/`**: Rejected — the split was invisible to consumers (both exported from the same barrel) and created an artificial boundary between types and the functions that use them.
- **Export all codegen internals from the barrel**: Rejected — 20+ exports would commit the public API to implementation details. The multi-tenant platform only needs `codegen()`, `generateServerEntry()`, and types.
- **Virtual module for hydration manifest**: Rejected — `routes.gen.ts` already contains the manifest. A separate virtual module adds a parallel invalidation path with no benefit. Vite's file watcher handles HMR when `routes.gen.ts` is rewritten.
- **Runtime constructs virtual module IDs**: Rejected — couples the platform-agnostic runtime to Vite conventions. The Vite dev middleware is responsible for translating virtual module IDs into `slotAssets` before the runtime sees them.
