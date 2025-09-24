# Epic: Sentry.io Integration via Generic Logging Interface

## Overview
Integrate Sentry.io error and event logging across the UI and server (Netlify Functions and local Express server) through a generic, swappable logging interface. The interface must support multiple sinks simultaneously (e.g., console + file + Sentry) and preserve all existing logs. The rollout must be non-breaking and feature-flagged.

This epic documents current logging usage and provides a phased plan with user stories, acceptance criteria, and detailed task prompts.

---

## Current Logging Inventory (as of 2025-09-24)

- **Client custom logger**
  - `src/utils/photoFlowLogger.ts`
    - Methods: `info|warn|error|debug`, accumulates entries and periodically flushes to `POST /api/write-log`.
    - Uses `console.log` and `navigator.sendBeacon` on unload.
- **Client console logging**
  - `src/services/ProgressService.ts` – structured console logs and calls to `photoFlowLogger`.
  - `src/hooks/usePhotoUpload.ts` – lifecycle logs, validation, and upload-path selection.
  - `src/services/apiClient.ts` – request/response logging and error details.
  - `src/features/views/ActiveView.tsx` – logs during auto-save and progress updates.
- **Server function logging**
  - `netlify/functions/_lib/serverLogger.js`
    - Methods: `info|warn|error|debug`, writes JSON files into `logs/` on disk.
  - `netlify/functions/_lib/teamLogger.js`
    - Security-aware console logs for verification, locks, storage operations.
  - `netlify/functions/progress-set.js` – uses `serverLogger` + console logs and validation output.
  - `netlify/functions/photo-upload.js` – detailed request, validation, and Cloudinary logs.
  - `netlify/functions/team-verify.js` – verification, device lock, and error logs.
  - `netlify/functions/write-log.js` – API endpoint used by the client to write logs to `logs/`.
- **Local Express server routes**
  - `src/server/*.ts` (e.g., `progressRoute.ts`, `collageRoute.ts`, `leaderboardRoute.ts`) make liberal use of `console.log|warn|error`.

Conclusion: The app already has structured log points we must preserve. We will provide a facade so these call sites can keep their method signatures while letting us route to Sentry and/or other sinks.

---

## Goals

- **Introduce a generic logging interface** that can send to multiple sinks concurrently.
- **Integrate Sentry.io** on both client and server with minimal code churn.
- **Preserve all current logs**; no functionality or observability loss.
- **Feature-flagged rollout** and safe fallbacks (console/file only) if Sentry is unconfigured.
- **PII protection** (hash team codes, truncate long URLs/content, drop sensitive headers).

## Non-Goals

- Rewriting log messages’ semantics across the app.
- Centralizing all historical logs in Sentry (we will support dual-write to file + Sentry).

---

## Architecture Proposal

- **Logging Facade** in `src/logging/` and `netlify/functions/_lib/logging/`
  - Interface: `Logger` with methods: `info(component, action, data?)`, `warn(...)`, `error(..., errorMessage?)`, `debug(...)`.
  - `LogEntry` shape: `{ timestamp, level, component, action, data?, error?, context? }`.
  - **Multi-sink support**: facade fans out to configured sinks.
    - `ConsoleSink` – maps to `console` with structured output.
    - `FileSink` – client uses existing `POST /api/write-log`; server writes JSON using `fs` (reuse `serverLogger` internals).
    - `SentryBrowserSink` – uses `@sentry/react` to record errors/events/breadcrumbs.
    - `SentryNodeSink` – uses `@sentry/node` in Netlify Functions/Express.
  - **Adapters to preserve compatibility**:
    - `photoFlowLogger` becomes a thin wrapper around the facade (same API, adds auto-flush semantics but delegates writes to sinks).
    - `serverLogger` re-implemented as a facade instance with `FileSink` + optional `SentryNodeSink`.
    - `teamLogger` updated to route through facade (still supports hashing via `LockUtils`).

- **Initialization**
  - Client: `@sentry/react` `Sentry.init({...})` in app bootstrap (e.g., `src/main.tsx` or `src/App.jsx`).
  - Server: wrap each Netlify function with Sentry handler or initialize Sentry per invocation with DSN caching.
  - **Feature flags/env**:
    - `VITE_ENABLE_SENTRY` (`true|false`)
    - `VITE_SENTRY_DSN` (browser)
    - `SENTRY_DSN` (functions/Express)
    - `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`

- **PII/Secrets controls**
  - Client and server sinks implement: `beforeSend` (Sentry) and sanitizer in facade to:
    - Hash team codes (use `LockUtils.hashTeamCode` where applicable).
    - Truncate URLs (already truncating in many places) and strip query params.
    - Drop large payloads and `File` blobs; replace with metadata.

- **Correlation**
  - Include `sessionId` (client) and `requestId` (server) in `context` for correlation across sinks.

---

## User Stories

- **As an engineer**, I can log using a single `Logger` API so I don’t care which provider is active.
- **As an operator**, I can enable Sentry and still keep console/file logs for auditing.
- **As a developer**, I can view UI errors in Sentry with breadcrumbs for network/API calls.
- **As a developer**, I can view Netlify Function exceptions in Sentry with request context.
- **As a security reviewer**, I can confirm logs avoid leaking PII or secrets (hashed codes, redaction).
- **As a maintainer**, I can roll back to console/file-only without code changes.
- **As a QA**, I can verify that all existing log statements still appear (no loss) after migration.

---

## Acceptance Criteria

- A new `Logger` facade exists with `info|warn|error|debug` and supports multiple sinks.
- The app can run in three modes: console-only, console+file, console+file+Sentry.
- `photoFlowLogger`, `serverLogger`, and `teamLogger` continue to work (adapters) and write to the new facade.
- Sentry is active only when DSN + feature flag are set; otherwise, no errors occur and logging falls back.
- Client React errors are captured by Sentry’s `ErrorBoundary`.
- Netlify functions capture exceptions and send to Sentry along with request metadata.
- Logs redact PII per policy (hashed team code, truncated URLs).
- E2E test verifies no loss of existing logs; empty-state and error flows still log.

---

## Phased Plan & Tasks

### Phase 1 – Core Facade & Sinks

- **Design & Create** `src/logging/Logger.ts`
  - Define `LogLevel`, `LogEntry`, `Logger` interface.
  - Implement `MultiSinkLogger` that fans out to sinks.
- **Create Sinks (client)**
  - `ConsoleSink`
  - `FileSink` – posts to `/.netlify/functions/write-log` (existing) with batched entries.
- **Create Sinks (server)**
  - `ConsoleSink`
  - `FileSink` – reuse `logs/` write pattern in `serverLogger`.
- **Adapters**
  - Update `src/utils/photoFlowLogger.ts` to delegate to `Logger` facade (keep API).
  - Update `netlify/functions/_lib/serverLogger.js` to use facade internally but preserve exported name.
  - Update `netlify/functions/_lib/teamLogger.js` to write through facade, preserving hash behavior.
- **Config**
  - Add feature flag `VITE_ENABLE_SENTRY` and default to `false`.

### Phase 2 – Client Sentry Integration

- Install and initialize `@sentry/react`.
- Create `SentryBrowserSink` with `beforeSend` redaction (hash codes, drop large body, truncate URLs).
- Wrap root with Sentry `ErrorBoundary` and enable browser tracing if required.
- Add integration with network breadcrumbs: capture `apiClient` requests as breadcrumbs.
- Make sink opt-in via env: `VITE_ENABLE_SENTRY=true` and `VITE_SENTRY_DSN`.

### Phase 3 – Server Sentry Integration (Netlify + Express)

- Install `@sentry/node` and initialize in:
  - Netlify functions (e.g., `progress-set.js`, `photo-upload.js`, `team-verify.js`).
  - Local Express server entry.
- Create `SentryNodeSink` and wire into server facade.
- Wrap handlers with Sentry error middleware or try/catch + `Sentry.captureException`.
- Ensure `requestId`, path, method, and selected headers are attached as context.

### Phase 4 – Redaction & Compliance

- Implement a common sanitizer utility used by all sinks.
  - Hash/obfuscate team codes (use `LockUtils.hashTeamCode` for parity).
  - Truncate photo URLs to first ~100 chars (matches existing usage in `photoFlowLogger`/services).
  - Remove binary data and sensitive headers.
- Add unit tests for sanitizer.

### Phase 5 – Migrate Call Sites (No Behavior Change)

- Client files to verify/update:
  - `src/services/ProgressService.ts`
  - `src/hooks/usePhotoUpload.ts`
  - `src/services/apiClient.ts`
  - `src/features/views/ActiveView.tsx`
- Server files to verify/update:
  - `netlify/functions/progress-set.js`
  - `netlify/functions/photo-upload.js`
  - `netlify/functions/team-verify.js`
  - `src/server/progressRoute.ts`, `collageRoute.ts`, `leaderboardRoute.ts`
- Ensure all existing logs still emit and appear in console/file; enable Sentry and confirm dual-write.

### Phase 6 – Testing & QA

- **Unit tests** for facade and sinks (fan-out order, error handling, redaction).
- **Integration tests** that trigger:
  - Successful photo upload (client + function), validation errors, timeouts.
  - Progress save happy-path and failure-path.
  - Team verify success and failure.
- **E2E manual checklist**
  - With Sentry disabled: logs present in console and `logs/`.
  - With Sentry enabled: same plus events in Sentry with correct environment/release and without PII.

### Phase 7 – Rollout & Observability

- Add `SENTRY_ENVIRONMENT`=`development|staging|production` and `SENTRY_RELEASE`.
- Set sampling rates: `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`.
- Document env var setup in Netlify and Vite.
- Enable in staging first; verify. Then production.

---

## Implementation Notes

- **Zero Downtime Principle**: default to console+file sinks; Sentry attached only when `ENABLE_SENTRY && DSN` present.
- **Adapters**: Keep names `photoFlowLogger`, `serverLogger`, and `teamLogger` to avoid sweeping refactors; internally route to facade.
- **Batching**: `FileSink` can batch entries to reduce write volume (client already flushes periodically).
- **Breadcrumbs**: critical network interactions logged via `apiClient` should become Sentry breadcrumbs.
- **Correlation IDs**: include `sessionId` and `requestId` where available.

---

## Environment Variables

- Client:
  - `VITE_ENABLE_SENTRY` (default `false`)
  - `VITE_SENTRY_DSN`
  - `VITE_SENTRY_TRACES_SAMPLE_RATE` (e.g., `0.2`)
  - `VITE_SENTRY_PROFILES_SAMPLE_RATE` (optional)
- Server:
  - `SENTRY_DSN`
  - `SENTRY_ENVIRONMENT`
  - `SENTRY_RELEASE`
  - `SENTRY_TRACES_SAMPLE_RATE`

---

## Definition of Done

- Logger facade and multi-sink implementation in place.
- Client and server can log to console+file+Sentry concurrently.
- Existing loggers (`photoFlowLogger`, `serverLogger`, `teamLogger`) continue to function via adapters.
- Sentry dashboards show client and function errors with sanitized payloads.
- Tests pass; manual QA confirms no logging regressions.

---

## References (key files)

- Client: `src/utils/photoFlowLogger.ts`, `src/services/ProgressService.ts`, `src/services/apiClient.ts`, `src/hooks/usePhotoUpload.ts`, `src/features/views/ActiveView.tsx`
- Server: `netlify/functions/_lib/serverLogger.js`, `netlify/functions/_lib/teamLogger.js`, `netlify/functions/progress-set.js`, `netlify/functions/photo-upload.js`, `netlify/functions/team-verify.js`, `netlify/functions/write-log.js`
- Local Express: `src/server/progressRoute.ts`, `src/server/collageRoute.ts`, `src/server/leaderboardRoute.ts`
