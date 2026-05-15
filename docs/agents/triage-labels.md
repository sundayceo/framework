# Triage Labels

This document defines the label state machine used to move issues from intake
through agent work to human review.

## Labels

| Label              | Purpose                                          |
| ------------------ | ------------------------------------------------ |
| `needs-triage`     | New issue, not yet reviewed.                     |
| `needs-info`       | Blocked — needs clarification from the reporter. |
| `ready-for-agent`  | Fully specified; an agent can grab it.           |
| `ready-for-human`  | Needs human judgment or creativity.              |
| `in-progress`      | Agent is actively working on this.               |
| `ready-for-review` | PR is up, CI green, needs human review.          |
| `wontfix`          | Won't be addressed.                              |

## Transitions

| Transition                                                                        | Who                                |
| --------------------------------------------------------------------------------- | ---------------------------------- |
| → `needs-triage`                                                                  | Automation (on issue open)         |
| `needs-triage` → `ready-for-agent` / `ready-for-human` / `needs-info` / `wontfix` | Human only                         |
| `ready-for-agent` → `in-progress`                                                 | Agent (when it picks up work)      |
| `in-progress` → `ready-for-review`                                                | Automation (CI green)              |
| `in-progress` → `needs-info`                                                      | Agent (if issue is underspecified) |
| `ready-for-review` → closed                                                       | Human (after review)               |

## Key constraint

**Only humans triage.** Agents never decide an issue is `ready-for-agent`.
The `needs-triage` → `ready-for-agent` transition requires a human reviewer
to confirm that the issue is fully specified and safe to hand off.
