# Phase 5 — Edge Cases, Testing, and Share Link

Objective
- Harden edge cases, add a simple manual test plan, and optionally provide a "Copy link" feature that encodes current settings into the URL.

Scope of changes
- Edge cases
  - Treat partial path params as none (require exactly three non-empty segments: `/location/event/team`).
  - Normalize whitespace/casing; trim values. Consider mapping locations to a known set if applicable.
  - Listen for `popstate` and re-evaluate lock state; if segments are removed or malformed, unlock and show gear again.
  - If parsing throws or path format is unexpected, default to no-params behavior (do not lock).
- Testing / Manual verification
  - No params: gear visible; user sets values; uploads include those values.
  - Full path params (e.g., `/bhhs/SummerFest/TheFoxes`): lock engaged; gear hidden; uploads include URL-provided values.
  - Partial/malformed path params: treat as none; gear visible.
  - Runtime navigation: switching between locked and unlocked updates UI accordingly.
- Optional: Share link feature
  - Add a button (e.g., near header or settings) to copy a URL path of the form `/${location}/${event}/${team}` reflecting current store values.
  - Use `navigator.clipboard.writeText` and show a toast/alert confirmation.

Details
- Keep the UX unobtrusive; document behavior in comments.
- Ensure `lockedByQuery` is not persisted.

Acceptance criteria
- Manual test matrix passes.
 - Share link copies a path-parameter URL that, when loaded, locks the app with the same settings.
