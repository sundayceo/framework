# @sundayceo/framework

A lightweight, React-based TypeScript framework built around a template-and-slots rendering model where pages declare which components fill which template regions. Designed for Cloudflare Workers as the primary deployment target, but platform-agnostic — ejectable to any runtime that supports the Web Fetch API.

## Language

**Template**:
A React component that defines the full HTML document structure (`<html>`, `<head>`, `<body>`) with named `<Slot>` insertion points. One template per page, not nestable.
_Avoid_: Layout, shell, wrapper

**Slot**:
A named insertion point declared in a template via the `<Slot>` component. Defines where content can be placed, not the content itself.
_Avoid_: Placeholder, region, zone

**Slot Content**:
The React nodes a page provides to fill a specific slot. Returned from `defineSlots` as a map of slot names to React elements.
_Avoid_: Fill, slot value, slot children

**Route**:
A URL pattern derived from a file in `/src/routes/`. The parent concept for both pages and handlers.
_Avoid_: Endpoint (for pages), path (when referring to the module)

**Page**:
A route that renders HTML by filling slots in a template. Defined with `definePage` and exported as the default export of the route file.
_Avoid_: View, screen, component

**Handler**:
A route that returns a raw `Response` (typically JSON). Defined with `defineHandler` and exported as the default export of the route file. Has HTTP method handlers (GET, POST, etc.) instead of templates and slots.
_Avoid_: API route, endpoint, controller

**Loader**:
A server-side async function on a page that fetches data before rendering. Receives `{ request, ctx }` and its return value becomes `loaderData` in `defineSlots`.
_Avoid_: Fetcher, data function, getServerSideProps

**Request Context**:
The `ctx` object passed to loaders and handlers. Contains route params plus custom properties from the context factory.
_Avoid_: Context (alone), ctx (in documentation — ok in code)

**Context Factory**:
The function passed to `createApp`'s `context` field. Receives a `Request` and the **platform context**, returns custom properties that become part of every **request context**. This is where platform-specific values (e.g. Cloudflare env bindings) are mapped into the app's domain.
_Avoid_: Context provider, context builder

**Platform Context**:
A typed object representing the runtime environment's platform-specific values, passed as the second argument to `handler.fetch(request, platform)` and forwarded to the **context factory**. On Cloudflare Workers this is `{ env, ctx }`; on other runtimes it may be different or absent. Declared as a type parameter on `createApp<TPlatform>`.
_Avoid_: Bindings (too Cloudflare-specific), environment (ambiguous with env vars)

**Entry Shim**:
A per-platform file (e.g. `entry.cloudflare.ts`) that maps the platform's calling convention to `handler.fetch(request, platform)`. Typically 1–3 lines. Scaffolded by the CLI; swapped when ejecting to a different platform.
_Avoid_: Adapter (implies custom logic — the shim is pure argument mapping), server entry (that's the virtual module)

**Server Entry** (virtual module):
The `@sundayceo/framework/server-entry` import, resolved by the Vite plugin to a wired-up handler built from the app's conventions (`app.ts` + `routes.gen.ts`). No file on disk — the plugin generates the wiring in memory. Used by the **entry shim** and the production build.
_Avoid_: Server file, server.ts (there is no user-written server file)

**Static** (slot):
Slot content that contains no interactive components. Server-rendered to HTML with zero client-side JavaScript shipped.
_Avoid_: Inert, passive, server-only

**Interactive** (slot):
Slot content that contains components using hooks, event handlers, or browser APIs. Server-rendered to HTML and then hydrated on the client.
_Avoid_: Dynamic, client-side, live

**Hydration**:
The process of attaching React to server-rendered HTML for an interactive slot, making it responsive to user input. Only happens for interactive slots.
_Avoid_: Rehydration, activation, bootstrapping

**Interactivity Inference**:
Build-time static analysis that walks a component's import tree to determine whether it is interactive. Checks for hooks, event handlers, and browser APIs.
_Avoid_: Interactivity detection, client analysis

**Codegen**:
Umbrella term for all build-time code generation performed by the Vite plugin. Encompasses type codegen and the route transform.
_Avoid_: Code generation (verbose)

**Type Codegen**:
Generates `framework.gen.d.ts` with module augmentations for `TemplateRegistry` and `RouteMap`. Triggered by file additions, deletions, or renames in templates/ and routes/.
_Avoid_: Type generation, declaration generation

**Route Transform**:
Source code transform that auto-fills the route path string in `definePage()` and `defineHandler()` calls based on file location.
_Avoid_: Route injection, path auto-fill

**Request Pipeline**:
The full request-handling flow from incoming request to outgoing response. Branches into the page pipeline or handler pipeline based on the matched route's module type.
_Avoid_: Request handler, middleware chain

**Render Pipeline**:
The SSR portion of the page pipeline: runs the loader, resolves meta, calls `defineSlots`, renders React to HTML, runs **interactivity inference** per slot, injects **hydration** markers and scripts for interactive slots, and returns the Response. One module owns this entire flow — callers get complete HTML (static or hydrated) from a single call.
_Avoid_: SSR pipeline, page renderer

**Error Page**:
A page that renders for a specific HTTP error status (4xx–5xx). Defined with `defineErrorPage` in a file whose basename is the status code (e.g., `404.tsx`). Lives in `src/routes/` but is excluded from the route table. Goes through the full render pipeline with an error context on the loader.
_Avoid_: Error template, error handler, error route

**Error Context**:
Additional data available on the loader's `ctx.error` field when rendering an error page. Contains `status`, `message`, and in dev mode `stack` and `error`. Never present on regular pages.
_Avoid_: Error data, error info

## Relationships

- A **template** declares one or more **slots**
- A **page** references exactly one **template** and provides **slot content** for its slots
- A **handler** has no template or slots — it returns a Response directly
- A **route** is either a **page** or a **handler**, determined by its `RouteKind` brand (a symbol stamped by `definePage`/`defineHandler`)
- A **loader** belongs to a **page** and produces data that flows into `defineSlots` as `loaderData`
- The **context factory** (in `createApp`) receives a `Request` and the **platform context**, and produces custom properties included in every **request context**
- The **request context** combines route params with context factory output
- The **platform context** flows from the **entry shim** → `handler.fetch` → **context factory** → **request context**
- The **server entry** (virtual module) is resolved by the Vite plugin and wires `app.ts` + `routes.gen.ts` into a handler
- **Interactivity inference** determines whether **slot content** is **static** or **interactive**
- **Interactive** slot content undergoes **hydration**; **static** slot content does not
- **Type codegen** produces types for templates and routes; the **route transform** auto-fills route paths
- The **request pipeline** branches into the page path (which uses the **render pipeline**) or the handler path
- An **error page** is defined with `defineErrorPage`, lives in `src/routes/`, and is excluded from the route table
- An **error page** goes through the full **render pipeline** with an **error context** on the loader
- If an **error page** itself throws, the framework falls back to a bare HTML default (circuit breaker)

## Example dialogue

> **Dev:** "I added a new **template** with a `sidebar` **slot**, but my **page** doesn't fill it — will that break?"
> **Domain expert:** "Only if the **slot** has no fallback. If the **slot** declares a fallback, missing **slot content** just renders the fallback."

> **Dev:** "My counter component uses `useState` — will the whole **page** get **hydrated**?"
> **Domain expert:** "No. **Interactivity inference** detects the hook and marks that **slot content** as **interactive**. Only that slot gets **hydration** scripts. Other slots stay **static** — zero JS."

> **Dev:** "Where do I put my SDK so every **loader** can access it?"
> **Domain expert:** "In the **context factory** inside `createApp`. It becomes part of the **request context**, available as `ctx.sdk` in every **loader** and **handler**."

> **Dev:** "How do I access my Cloudflare D1 database in a **loader**?"
> **Domain expert:** "Declare a **platform context** type on `createApp<{ env: { DB: D1Database }; ctx: ExecutionContext }>`. The **context factory** receives `(request, platform)` — map `platform.env.DB` to whatever name you want in the **request context**. The **entry shim** passes `{ env, ctx }` from the Workers `fetch` call."

> **Dev:** "I want to eject from Cloudflare to Bun. What changes?"
> **Domain expert:** "Swap the **entry shim**. Your `entry.cloudflare.ts` becomes `entry.bun.ts` with `Bun.serve({ fetch: (req) => handler.fetch(req) })`. Update the **platform context** type if your **context factory** used Cloudflare-specific values."

## Flagged ambiguities

- "context" was used to mean React Context, the `ctx` object, and the `createApp` config function — resolved: **request context** for the `ctx` object, **context factory** for the `createApp` function. React Context is an implementation detail not in the domain language.
- "adapter" was used for both the Cloudflare integration (`cloudflare.ts`) and the Vite dev HTTP bridge — resolved: the Cloudflare adapter is eliminated in favor of an **entry shim** + **platform context** on the context factory. The Vite dev HTTP bridge is an internal concern, not user-facing.
