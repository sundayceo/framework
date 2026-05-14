# Marko-style interactivity inference over "use client" directives

Rather than requiring developers to mark interactive components with `"use client"` (the React Server Components convention), the framework automatically determines interactivity via build-time static analysis. The analyzer walks each component's import tree looking for React hooks, event handler props, and browser API usage. If any are found, that slot content is marked interactive and receives hydration scripts. Otherwise it's static — zero JS shipped.

We chose this because it eliminates developer overhead entirely: you write React, the framework figures out what needs hydration. The tradeoff is a significant compiler investment (AST analysis + import graph traversal) and potential edge cases where the inference is wrong (e.g. a component that's technically interactive but the developer wants static). An escape hatch may be needed later.

## Considered Options

- **`"use client"` directives (React Server Components model)**: Well-understood, zero compiler investment. Rejected because it puts the burden on developers to manually annotate every interactive boundary, which is error-prone and adds boilerplate that conflicts with the framework's "minimal and token-efficient" goal.
- **Automatic interactivity inference (chosen)**: Zero DX overhead, optimal JS splitting. Requires compiler work and may need escape hatches for edge cases.
