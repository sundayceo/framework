# Template-and-slots over nested layouts

Every major React framework (Next.js, Remix, TanStack Start) uses nested layouts where parent layouts wrap children via an `<Outlet>` or `{children}` slot. We chose a flat template-and-slots model instead: each page declares exactly one template, and templates define named `<Slot>` insertion points that pages fill with content. Templates are full document shells (`<html>` through `</html>`), not nestable wrappers.

We made this choice because the template-and-slots model is simpler to reason about (one page → one template, no layout hierarchy to trace), easier to statically analyze for per-slot hydration and code splitting, and more token-efficient for AI-driven bundling on Cloudflare Workers. The tradeoff is that shared UI across pages (e.g. a nav bar) must be explicitly provided as slot content by each page or handled via fallbacks on slots — there's no implicit inheritance from parent layouts.

## Considered Options

- **Nested layouts (Next.js/Remix model)**: Familiar to React developers, enables implicit UI inheritance. Rejected because layout nesting creates implicit parent-child coupling that's harder to statically analyze for per-slot hydration, and the nesting hierarchy adds complexity for the multi-tenant bundler.
- **Template-and-slots (chosen)**: Flat, explicit, statically analyzable. Each page opts into exactly one template and fills named slots.
