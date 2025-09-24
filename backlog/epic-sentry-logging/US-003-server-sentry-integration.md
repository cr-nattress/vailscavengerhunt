# US-003: Server Sentry Integration (Netlify + Express)

## User Story
**As a developer**, I want Sentry wired into server code (Netlify Functions and local Express) so that exceptions and critical logs from backend paths are captured with request context and without changing existing call sites.

## Priority: HIGH
**Estimated Time**: 6–10 hours
**Complexity**: MEDIUM
**Dependencies**: US-001 (Logger Facade and Core Sinks)

## Acceptance Criteria
- [ ] `@sentry/node` is installed and initialized in Netlify Functions and the local Express server.
- [ ] A `SentryNodeSink` exists to forward `Logger` entries to Sentry, mapping errors to `captureException`.
- [ ] Netlify functions `progress-set.js`, `photo-upload.js`, `team-verify.js`, and `progress-get-supabase.js` capture unhandled errors and include context (path, method, requestId).
- [ ] Local Express routes (`src/server/*.ts`) capture exceptions via middleware and forward to Sentry.
- [ ] Initialization is conditional on `SENTRY_DSN` being set; otherwise no-op.
- [ ] Dual-write preserved to Console/File sinks with no regressions.

## Implementation Prompt
 
 ### Task 1: Install and Initialize Sentry for Node
 **Prompt**: Add Sentry Node to the project and create a reusable initializer for server-side code.
 
 **Requirements**:
 1. Add dependency: `@sentry/node`.
 2. Create `netlify/functions/_lib/logging/initSentry.node.js` with an idempotent `maybeInitSentryNode()` that:
    - Reads `process.env.SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_TRACES_SAMPLE_RATE`.
    - Calls `Sentry.init({...})` only once per cold start (guard with module-level flag).
    - Sets default `beforeSend` to use sanitizer from US-004.
 
 #### Portal Snippet (for reference)
 For quick validation, the Sentry web portal suggests the following Node initialization snippet. Use this for local/dev validation; in production prefer the env-driven initialization above.
 
 ```js
 import * as Sentry from '@sentry/node'
 
 Sentry.init({
   dsn: 'https://d4cd82417b44e0251751285fd12236cf@o4509736953315328.ingest.us.sentry.io/4509736954691584',
   // Setting this option to true will send default PII data to Sentry.
   // For example, automatic IP address collection on events
   sendDefaultPii: true
 })
 ```
 
 ### Task 2: Create SentryNodeSink
**Prompt**: Implement a sink that sends `Logger` entries to Sentry on the server.

**Requirements**:
1. Create `netlify/functions/_lib/logging/SentryNodeSink.js`.
2. Map `info|warn|debug` to breadcrumbs; map `error` to `Sentry.captureException` with serialized `entry` context.
3. Include `requestId` when available and attach `component`, `action`, and sanitized `data`.

### Task 3: Wrap Netlify Functions with Sentry
**Prompt**: Add Sentry initialization and error capture to key functions without changing their public signature.

**Targets**:
- `netlify/functions/progress-set.js`
- `netlify/functions/photo-upload.js`
- `netlify/functions/team-verify.js`
- `netlify/functions/progress-get-supabase.js`

**Requirements**:
1. At the top of each file, call `maybeInitSentryNode()`.
2. In catch blocks, call `Sentry.captureException(error)` (in addition to existing logging).
3. Attach `requestId` from headers where present (e.g., `x-nf-request-id`), and include `url`, `method`, `status` in Sentry context.

### Task 4: Express Integration
**Prompt**: Initialize Sentry for the local Express server and capture route errors via middleware.

**Requirements**:
1. In the Express server bootstrap (entry file), call `maybeInitSentryNode()`.
2. Add a minimal error-handling middleware that catches thrown errors from routes and calls `Sentry.captureException`.
3. Ensure existing console logs remain unchanged.

### Task 5: Wire Sink into Server Logger Factory
**Prompt**: Update the server logger factory to include the Sentry sink when `SENTRY_DSN` is present.

**Requirements**:
1. In `netlify/functions/_lib/logging/factory.server.js`, when env contains `SENTRY_DSN`, add `SentryNodeSink` to sinks alongside Console+File.

## Acceptance Tests
- [ ] With `SENTRY_DSN` unset, functions and Express routes behave unchanged; logs go to Console/File only.
- [ ] With `SENTRY_DSN` set, thrown errors appear in Sentry with request context.
- [ ] Verify `progress-set.js` and `photo-upload.js` produce Sentry events on simulated errors.
- [ ] Confirm no duplicate events are created across retries; initializer runs once per cold start.

## Definition of Done
- [ ] Sentry Node initialization is in place and safe.
- [ ] SentryNodeSink implemented and integrated via factory.
- [ ] Key Netlify functions and Express routes are capturing exceptions into Sentry.
- [ ] Dual-write preserved to Console/File sinks.
- [ ] Verified locally and in Netlify Dev.
