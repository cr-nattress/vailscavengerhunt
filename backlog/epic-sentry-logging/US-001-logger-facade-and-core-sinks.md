# US-001: Logger Facade and Core Sinks

## User Story
**As a developer**, I want a generic Logger facade with multi-sink fan-out so that I can log once and send entries to console, file, and (later) Sentry without changing call sites.

## Priority: HIGH
**Estimated Time**: 6–8 hours
**Complexity**: MEDIUM
**Dependencies**: None

## Acceptance Criteria
- [ ] A `Logger` interface exists with `info|warn|error|debug(component, action, data?, errorMessage?)`.
- [ ] A `MultiSinkLogger` implementation fans out to one or more sinks reliably.
- [ ] A `ConsoleSink` writes structured logs to the console on both client and server.
- [ ] A client `FileSink` batches entries and posts to `/.netlify/functions/write-log` (existing endpoint) with backoff.
- [ ] A server `FileSink` writes JSON files to `logs/` (reuse the pattern used in `netlify/functions/_lib/serverLogger.js`).
- [ ] Factory/config helpers build a logger instance with the desired sinks (env-driven), defaulting to Console+File.
- [ ] No functional regressions: existing console logs still appear; file logs continue to be written.

## Implementation Prompt

### Task 1: Define Logger Interfaces and Types
**Prompt**: Create core types and interfaces for our logging system that are shared across client and server.

**Requirements**:
1. Create `src/logging/types.ts` with:
   - `LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'`.
   - `LogEntry` with fields: `timestamp`, `level`, `component`, `action`, `data?`, `error?`, `context?`.
   - `Logger` interface with methods `info|warn|error|debug`.
2. Create `src/logging/Logger.ts` implementing `MultiSinkLogger` and a `createLogger()` factory that takes a list of sinks.

### Task 2: Implement ConsoleSink (Client + Server)
**Prompt**: Implement a sink that logs structured messages to the console with a consistent prefix and safe serialization.

**Requirements**:
1. Create `src/logging/sinks/ConsoleSink.ts`.
2. Include readable output: `[Logger] LEVEL component:action` and attach serialized `data`/`error`.
3. Ensure no runtime errors occur when `data` contains circular refs (safe stringify fallback).

### Task 3: Implement Client FileSink (POST /.netlify/functions/write-log)
**Prompt**: Implement a batched sink that periodically sends logs to the existing `write-log` function; support `sendBeacon` on unload.

**Requirements**:
1. Create `src/logging/sinks/FileSink.client.ts`.
2. Batch entries (e.g., flush every 10 entries or 30s) and POST `{ filename, data }` to `/api/write-log`.
3. Use a filename convention such as `unified-client-<sessionId>-<iso>.json`.
4. On `beforeunload`, flush pending entries using `navigator.sendBeacon`.
5. Handle network errors with retry/backoff and do not crash the app.

### Task 4: Implement Server FileSink (JSON files under logs/)
**Prompt**: On server, write batched entries to `logs/` mirroring `serverLogger` behavior.

**Requirements**:
1. Create `netlify/functions/_lib/logging/fileSink.server.js`.
2. Ensure `logs/` is created if missing and write JSON payloads atomically.
3. Reuse the structure of `netlify/functions/_lib/serverLogger.js` (session-based filenames, flush on error or threshold).

### Task 5: Create Logger Factory and Default Wiring
**Prompt**: Provide a small helper to instantiate standard logger configurations based on environment.

**Requirements**:
1. Create `src/logging/factory.ts`:
   - `createClientLogger({ enableFile }: { enableFile: boolean })` returns Console+File by default.
   - Expose a placeholder for Sentry sink to be added later.
2. Create `netlify/functions/_lib/logging/factory.server.js` to return Console+File by default on server.

### Task 6: Smoke Test (Manual)
**Prompt**: Add a temporary dev-only harness that emits a few logs and verify console + file outputs.

**Requirements**:
1. In a small dev-only script (e.g., `src/logging/devSmoke.ts`), create the logger and send sample entries.
2. Confirm logs appear in both console and `logs/` (client: check Netlify Dev; server: run function locally).
3. Remove or guard this harness for production builds.

## Acceptance Tests
- [ ] MultiSink fan-out forwards the same `LogEntry` to all configured sinks.
- [ ] ConsoleSink shows readable, structured lines without throwing on un-serializable data.
- [ ] Client FileSink batches and flushes to `/api/write-log`; verifies payload shape and filename.
- [ ] Server FileSink writes to `logs/` with session-based filenames and rotates after threshold.
- [ ] Factory returns configured logger with expected sinks based on env flags.

## Definition of Done
- [ ] Core interfaces and multi-sink logger implemented.
- [ ] Console and File sinks implemented for client and server.
- [ ] Factory helpers created.
- [ ] Manual smoke tests verified.
- [ ] No regressions in existing logging behavior.
