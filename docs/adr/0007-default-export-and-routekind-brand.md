# Default export and RouteKind brand for route modules

Route files use `export default` instead of named exports, and `definePage`/`defineHandler`/`defineErrorPage` stamp a `RouteKind` symbol brand on the config object to enable nominal type discrimination.

Previously, route files used named exports (`export const page`, `export const handler`), and `createHandler` distinguished pages from handlers by checking for a `"page"` key in the ESM namespace and a `"template"` key in the module object. This caused two problems: (1) `extractModule` had to know every possible export name to unwrap, and a missing case for `handler` caused all handler routes to return 405; (2) structural checks like `"template" in module` are fragile and couple the dispatch logic to the module's shape rather than its intent.

With `export default`, `extractModule` reads `namespace.default` universally — no branching on export names. The `RouteKind` symbol (`Symbol.for("sundayceo.routeKind")`) is stamped by the define functions and checked by `isPageModule`, making the page-vs-handler discrimination explicit and independent of the module's other properties.

`Symbol.for` (global registry) is used instead of `Symbol()` (unique) so the brand survives across module boundaries, SSR bundles, or duplicate package installations. The key is namespaced (`"sundayceo.routeKind"`) to prevent collisions.

Error pages are branded as `"page"` because they go through the same render pipeline as regular pages. The error-specific behavior (different loader shape, error context) is handled by `adaptErrorModule` before the module enters the pipeline, not by a separate brand.

## Considered Options

- **Named exports with structural type guards (previous)**: `export const page` / `export const handler`, discriminated by `"template" in module`. Simple but fragile — every new export name requires a new unwrapping branch, and structural checks break if the module shape evolves. Rejected.
- **Named exports with RouteKind brand**: Keep named exports but add the brand. Fixes the discrimination problem but still requires `extractModule` to know export names. Rejected — half-measure that doesn't simplify the loading path.
- **Default export with RouteKind brand (chosen)**: `export default definePage(...)({...})`. One universal unwrapping path (`namespace.default`), nominal discrimination via symbol brand. The define functions are no longer identity functions at runtime — they spread the config and add the brand property.
- **Three brand values (`"page" | "handler" | "error-page"`)**: Give error pages their own kind. Rejected — error pages are pages from the domain and pipeline perspective. The distinction lives in how they're loaded (via `GeneratedErrorPages`), not in what they are.
