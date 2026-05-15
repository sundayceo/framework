# onError as side-effect hook

`onError` in `createApp` is a side-effect hook for logging and error reporting, not a response producer. Its signature is `(error: unknown, request: Request) => void | Promise<void>`. The framework always renders the matching error page (or falls back to bare HTML defaults) regardless of whether `onError` is defined.

Previously `onError` returned a `Response`, which made it an alternative response path competing with error pages. With the introduction of `defineErrorPage`, having two response-producing mechanisms for errors creates ambiguity: which one wins? Making `onError` side-effect-only eliminates the conflict — error pages own the response, `onError` owns the side effects.

This is a breaking change for any app that relies on `onError` to produce custom error responses. Those apps should migrate to `defineErrorPage`.

## Considered Options

- **`onError` overrides error pages**: If defined, `onError` produces the response and error pages are skipped. Preserves backwards compatibility but means error pages are silently ignored when `onError` exists, which is confusing. Rejected.
- **`onError` as side-effect hook (chosen)**: `onError` runs for logging/reporting, error pages always produce the response. Clear ownership, no ambiguity. Breaking change.
- **Remove `onError` entirely**: Too aggressive — side-effect error reporting is a legitimate need (Sentry, logging, etc.). Rejected.
