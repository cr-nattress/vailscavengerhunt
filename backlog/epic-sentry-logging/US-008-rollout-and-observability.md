# US-008: Rollout & Observability

## User Story
**As an operator**, I want a safe, feature-flagged rollout of Sentry with documented environment variables and observability checks so that I can enable/disable it per environment with confidence.

## Priority: MEDIUM
**Estimated Time**: 3–5 hours
**Complexity**: LOW
**Dependencies**: US-001..US-007

## Acceptance Criteria
- [ ] Environment variables and feature flags are documented for dev/staging/production.
- [ ] Default behavior with Sentry disabled remains console+file logs.
- [ ] Enabling Sentry in staging demonstrates events flowing with correct environment and release tags.
- [ ] Sampling rates for traces/profiles are configurable and set to reasonable defaults.
- [ ] A simple runbook documents how to toggle, verify, and roll back.

## Implementation Prompt

### Task 1: Environment & Feature Flags
**Prompt**: Document and validate the env flags required to enable Sentry across environments.

**Requirements**:
1. Client variables (`.env` / Netlify UI):
   - `VITE_ENABLE_SENTRY` = `true|false`
   - `VITE_SENTRY_DSN`
   - `VITE_SENTRY_TRACES_SAMPLE_RATE` (e.g., `0.2`)
   - `VITE_SENTRY_RELEASE` (optional)
2. Server variables (Netlify):
   - `SENTRY_DSN`
   - `SENTRY_ENVIRONMENT` = `development|staging|production`
   - `SENTRY_RELEASE`
   - `SENTRY_TRACES_SAMPLE_RATE` (e.g., `0.2`)
3. Verify `netlify.toml` redirects remain unchanged for logging endpoints (e.g., `/api/write-log`).

### Task 2: Observability Validation
**Prompt**: Verify that Sentry events appear with correct environment/release and that console/file logs still work.

**Requirements**:
1. Enable flags in staging and trigger flows:
   - Client: induce a handled error and an unhandled render error (ErrorBoundary), trigger `apiClient` errors.
   - Server: hit `/.netlify/functions/photo-upload` with missing env to induce error; trigger `progress-set` with malformed JSON.
2. Confirm:
   - Events appear in Sentry with `environment` and `release` tags.
   - Breadcrumbs for network calls include sanitized URLs.
   - Console/file logs continue to be written.

### Task 3: Runbook Documentation
**Prompt**: Create a runbook for enabling/disabling Sentry and common troubleshooting steps.

**Requirements**:
1. Add `backlog/epic-sentry-logging/RUNBOOK.md` with:
   - How to toggle `VITE_ENABLE_SENTRY` and DSN variables.
   - How to set server DSN and environment in Netlify.
   - How to validate events and where to look in Sentry.
   - How to roll back (disable flags) and verify logs still flow to console/file.

## Definition of Done
- [ ] Env flags documented and validated.
- [ ] Staging enablement verified with events in Sentry.
- [ ] Runbook added with step-by-step guidance.
- [ ] No regressions in console/file logging.
