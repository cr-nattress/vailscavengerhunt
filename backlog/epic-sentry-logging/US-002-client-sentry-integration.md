# US-002: Client Sentry Integration

## User Story
**As a developer**, I want Sentry wired into the browser app via a generic sink so that client errors and key events are captured without changing existing log call sites.

## Priority: HIGH
**Estimated Time**: 6–8 hours
**Complexity**: MEDIUM
**Dependencies**: US-001 (Logger Facade and Core Sinks)

## Acceptance Criteria
- [ ] `@sentry/react` is installed and `Sentry.init()` runs only when `VITE_ENABLE_SENTRY === 'true'` and `VITE_SENTRY_DSN` is set.
- [ ] A `SentryBrowserSink` exists and can be added to the Logger facade at runtime.
- [ ] `beforeSend` redaction is applied (PII scrub, URL truncation, drop large blobs).
- [ ] A top-level `ErrorBoundary` is present to capture React render errors (no breaking UI changes).
- [ ] Network breadcrumbs are captured from `src/services/apiClient.ts` for requests and responses.
- [ ] Dual-write works with Console/File sinks (no loss of existing logs).

## Implementation Prompt

### Task 1: Install and Initialize Sentry for Browser

**Requirements**:
1. Add dependencies: `@sentry/react` (and `@sentry/replay` optionally if desired later).
2. Create `src/logging/initSentryClient.ts` with:
   - A `maybeInitSentryBrowser()` function that reads `import.meta.env.VITE_ENABLE_SENTRY` and `import.meta.env.VITE_SENTRY_DSN`.
   - Calls `Sentry.init({ dsn, environment: import.meta.env.MODE, release: import.meta.env.VITE_SENTRY_RELEASE, tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0) })`.
   - Configures `beforeSend` for redaction using the sanitizer from US-004 (wire later if not ready).
3. Import and invoke `maybeInitSentryBrowser()` at app startup (e.g., in `src/main.tsx`).

    #### Portal Snippet (for reference)
    For quick validation, the Sentry web portal suggests the following initialization snippet. Use this for local/dev validation; in production prefer the env-driven initialization above.

    ```ts
    import * as Sentry from "@sentry/browser";

    Sentry.init({
      dsn: "https://d4cd82417b44e0251751285fd12236cf@o4509736953315328.ingest.us.sentry.io/4509736954691584",
      // Setting this option to true will send default PII data to Sentry.
      // For example, automatic IP address collection on events
      sendDefaultPii: true
    });
    ```

    ### Task 2: Create SentryBrowserSink
**Prompt**: Implement a logging sink that forwards entries to Sentry as breadcrumbs and errors.

**Requirements**:
1. Create `src/logging/sinks/SentryBrowserSink.ts` that implements the sink interface used by the facade.
2. Map `info|warn|debug` to Sentry breadcrumbs; map `error` to `Sentry.captureException` with context.
{{ ... }}
4. Ensure sink is no-op if Sentry is not initialized.

### Task 3: ErrorBoundary Wrapper
**Prompt**: Wrap the app with Sentry ErrorBoundary to capture render-time exceptions.

**Requirements**:
1. In `src/main.tsx` (or root), wrap the root component with `Sentry.ErrorBoundary` when Sentry is enabled.
2. Provide a minimal Fallback component that preserves current UX (e.g., reload prompt or graceful message), but do not change routing.

### Task 4: Network Breadcrumbs from apiClient
**Prompt**: Add optional breadcrumbs for API calls without altering request behavior.

**Requirements**:
1. In `src/services/apiClient.ts`, add small helper hooks (guarded by a tiny Sentry client util) that, when enabled, record:
   - Method, URL (path only, redact query), status, duration, and error (if any).
2. Ensure this does not throw even if Sentry is disabled.

### Task 5: Wire Sink into Facade
**Prompt**: Update the client logger factory to include Sentry sink when enabled.

**Requirements**:
1. Modify `src/logging/factory.ts` to accept `enableSentry` and `dsn`.
2. When enabled, push `SentryBrowserSink` into the sinks array in addition to Console+File.

## Acceptance Tests
- [ ] With Sentry disabled, the app runs unchanged and logs to Console/File only.
- [ ] With Sentry enabled, errors trigger `Sentry.captureException` and info/warn/debug appear as breadcrumbs.
- [ ] API requests produce breadcrumbs with sanitized URL paths and status codes.
- [ ] ErrorBoundary captures render errors and sends events to Sentry.

## Definition of Done
- [ ] Sentry client initialization and sink implemented.
- [ ] ErrorBoundary integrated with no UX regression.
- [ ] Network breadcrumbs wired with redaction.
- [ ] Dual-write preserved to Console/File.
- [ ] Verified in Netlify Dev and local Vite with flags on/off.
