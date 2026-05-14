# Curried definePage API for type inference

`definePage` and `defineHandler` use a curried calling convention: `definePage("/blog/[slug]")({...})`. The first call accepts the route path and locks in the params type. The second call accepts the page config (template, loader, defineSlots, meta) and infers the loader return type, which flows into defineSlots as `loaderData`.

This exists because of a TypeScript limitation: when you manually specify one generic parameter, TypeScript stops inferring all others. A flat `definePage<"/blog/[slug]">({...})` would force `loaderData` to become `unknown`. The curried form lets TypeScript infer each generic independently — the first call infers params from the path string, the second call infers loader data from the config object. This is the same pattern TanStack Router uses with `createFileRoute` and the reason it exists there too. At runtime, `definePage` is an identity function — the currying exists purely for the type system.

## Considered Options

- **Flat function with explicit generic**: `definePage<"/blog/[slug]">({...})`. Simpler syntax but breaks TypeScript's ability to infer the loader return type. Rejected.
- **Flat function with two generics**: `definePage<Path, LoaderData>({...})`. Requires the developer to manually type loader data, defeating the purpose. Rejected.
- **Curried function (chosen)**: `definePage("/path")({...})`. Unusual syntax but enables full inference across the entire config object.
