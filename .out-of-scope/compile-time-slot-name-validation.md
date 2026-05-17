# Compile-time slot name validation

TypeScript does not enforce that slot names returned from `defineSlots` match the template's actual `<Slot id="..." />` declarations.

## Why this is out of scope

Slot names are defined by templates at the JSX level (`<Slot id="header" />`). Extracting those names into the type system would require one of:

1. **Explicit slot name declarations** — templates manually export a union type like `type Slots = "header" | "main" | "footer"`. Adds boilerplate and a second source of truth that can drift from the actual JSX.
2. **Codegen extraction** — the framework's codegen step parses template JSX to find `<Slot id=...>` usages and generates a typed `SlotMap<TemplateName>`. Couples the type system to JSX parsing heuristics and adds fragility.
3. **Template literal type tricks** — not feasible in TypeScript today.

Runtime validation already exists (`validateSlots` with Levenshtein suggestions). Once #163 is fixed (warnings surfaced to dev console), developers get immediate feedback on typos without compile-time complexity.

The cost of the type-level solution outweighs the benefit given that:

- Runtime validation catches the same errors during development
- Templates rarely change slot names after initial authoring
- The API surface (`defineSlots` returning `Record<string, ReactNode>`) stays simple and learnable

## Prior requests

- #166 — "Enhancement: compile-time slot name validation"
