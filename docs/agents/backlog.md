# Agent backlog workflow

This document defines the full lifecycle for coding agents working on this
repository. Every agent session follows these steps exactly.

## 1. Find work

```sh
gh issue list --label ready-for-agent --json number,title --limit 1
```

Pick one issue. If the list is empty, stop — there is nothing to do.

## 2. Claim the issue

```sh
gh issue edit <N> --remove-label ready-for-agent --add-label in-progress
```

This signals to other agents (and humans) that the issue is taken.

## 3. Read the issue

Read the full issue body, comments, and any linked ADRs or context docs before
writing a single line of code. Understand the acceptance criteria completely.

## 4. Implement

- Create a branch off `main` (e.g. `feat/issue-<N>-short-description`).
- Follow existing project conventions:
  - **Conventional commits** enforced by commitlint.
  - **Semantic PR titles** enforced by CI (`feat(scope):`, `fix(scope):`, etc.).
- Keep changes focused — one issue, one PR. Never batch unrelated work.

## 5. Open a PR

Push the branch and open a pull request:

```sh
gh pr create \
  --title "feat(scope): short description" \
  --body "Closes #<N>"
```

The PR body **must** include `Closes #<N>` (or `Fixes #<N>`) linking the source
issue so that CI automation can transition labels automatically.

## 6. Stop

After the PR is opened, the agent's job is done. CI runs automatically and, on
success, the `ci-status-labels` workflow removes `in-progress` and adds
`ready-for-review` to the linked issue. Do not wait for CI or merge the PR.

## 7. Clean up

If you worked in a git worktree, remove it after the PR is merged:

```sh
git worktree remove <path>
```

## Escalation: underspecified issues

If the issue is underspecified or touches unclear domain territory, **do not
guess at requirements**. Instead:

1. Remove `in-progress` and add `needs-info`:
   ```sh
   gh issue edit <N> --remove-label in-progress --add-label needs-info
   ```
2. Comment on the issue suggesting a `/grill-with-docs` session:
   ```sh
   gh issue comment <N> --body "This issue needs clarification before implementation. Suggesting a \`/grill-with-docs\` session to resolve open questions."
   ```
3. Stop — do not proceed with implementation.

## Label state machine

See [docs/agents/triage-labels.md](triage-labels.md) for the full label state
machine governing issue lifecycle.
