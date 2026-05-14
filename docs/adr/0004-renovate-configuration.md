# Renovate dependency update configuration

We use Renovate to automate dependency updates across the monorepo, configured to update pnpm catalog entries directly. Key choices: rebase policy is `never` (PRs merge as-is or are manually rebased) to minimise CI churn; dependencies are grouped by ecosystem (React, ESLint, Commitlint) with blanket groups for remaining patch/minor updates and individual PRs for majors; concurrency is capped at 3 PRs to match the team size; no automerge — all PRs require manual review. Modelled after the @betternotify configuration, scaled down for a smaller monorepo.

## Considered Options

- **Automerge patch updates**: would reduce toil but we don't yet have enough CI coverage to trust unreviewed merges. Can be enabled later.
- **`auto` rebase policy**: keeps PRs up-to-date automatically but triggers unnecessary CI runs. Rejected in favour of `never` to reduce noise.
- **Pin dev dependencies preset**: would conflict with the existing `^` range convention in the pnpm catalog. Rejected.
