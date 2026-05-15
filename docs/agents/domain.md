# Domain knowledge

## Where things live

| Artifact | Location | Purpose |
|---|---|---|
| Domain glossary (ubiquitous language) | `CONTEXT.md` (repo root) | Canonical terms for the project |
| Architecture Decision Records | `docs/adr/` | Rationale behind key decisions |

## How to use the glossary

- Use canonical terms from `CONTEXT.md` in code, PRs, and issue comments.
- If a term in the code conflicts with the glossary, flag it -- do not silently adopt the code's term.

## Read-only rule

Agents must **never** update `CONTEXT.md` or create/modify ADRs unilaterally.
These artifacts evolve only through a `/grill-with-docs` session with a human.

## Escalation

Flag the following in the PR or issue comment:

- A term not present in `CONTEXT.md`.
- A decision not captured in an ADR.
- An implementation that would contradict an existing ADR.

Suggest a `/grill-with-docs` session to resolve it. If the gap blocks progress, label the issue `needs-info`.
