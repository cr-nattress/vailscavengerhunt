# Bug Report: Sentry browser init still uses Vite env and invalid API

## Summary
Sentry browser initialization uses `import.meta.env.VITE_*` in `src/logging/initSentryClient.ts` and references `Sentry.logger` (not a public API). This prevents consistent local/prod config (we migrated to non-Vite envs) and may silently disable Sentry in production.

## Environment
- Env: local and prod
- Files: `src/logging/initSentryClient.ts`, `src/App.jsx`, `src/services/PublicConfig.ts`, `netlify/functions/public-config.js`
- Commit: <sha>

## Steps to Reproduce
1. Ensure no VITE_* Sentry vars are set.
2. Load app; `maybeInitSentryBrowser()` uses `import.meta.env.VITE_SENTRY_*` so DSN is empty.
3. Sentry initializes in noop mode; UI errors won’t be sent to Sentry.
4. In `App.jsx`, code calls `Sentry.logger.info(...)` which is not a supported API.

## Expected
- Browser Sentry config obtains DSN/environment/release from `/\.netlify/functions/public-config`.
- Initialization succeeds when DSN is set via non-Vite envs.
- No usage of non-existent `Sentry.logger` API.

## Actual
- `initSentryClient.ts` uses Vite-specific variables.
- `App.jsx` uses `Sentry.logger`.

## Suggested Fix Prompt
@bugs Please refactor Sentry browser initialization to use PublicConfig and remove invalid API usage.

Context:
- Replace Vite env usage in `src/logging/initSentryClient.ts` with values loaded from `getPublicConfig()`:
  - dsn: `cfg.SENTRY_DSN`
  - environment: `cfg.SENTRY_ENVIRONMENT || import.meta.env.MODE`
  - release: `cfg.SENTRY_RELEASE || 'unknown'`
  - tracesSampleRate: expose `SENTRY_TRACES_SAMPLE_RATE` in `public-config.js` and use it
- Ensure `maybeInitSentryBrowser()` awaits the config once (cache ok).
- In `src/App.jsx`, replace `Sentry.logger.info(...)` with `Sentry.captureMessage('...')` and `Sentry.addBreadcrumb(...)` (already used) and remove invalid call.

Acceptance:
- With only non-Vite envs set (SENTRY_*), Sentry client initializes and sends a test `captureMessage` in both local and prod.
- No references to `import.meta.env.VITE_SENTRY_*` remain in the codebase.
- No TypeScript/ESLint errors.
