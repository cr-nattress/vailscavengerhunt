# US-005: Backward-Compatible Adapters (photoFlowLogger, serverLogger, teamLogger)

## User Story
**As a maintainer**, I want existing logger modules to keep their names and signatures so that no callers break while the new logging facade handles the actual routing to sinks (Console/File/Sentry).

## Priority: HIGH
**Estimated Time**: 4–6 hours
**Complexity**: MEDIUM
**Dependencies**: US-001 (Logger Facade and Core Sinks), US-004 (Sanitizer)

## Acceptance Criteria
- [ ] `photoFlowLogger` remains import-compatible (`src/utils/photoFlowLogger.ts`) and delegates to the `Logger` facade, preserving batching and `sendBeacon` behavior.
- [ ] `serverLogger` remains import-compatible (`netlify/functions/_lib/serverLogger.js`) and delegates to the server `Logger` facade; continues writing JSON to `logs/`.
- [ ] `teamLogger` (`netlify/functions/_lib/teamLogger.js`) delegates to the facade and ensures team codes are hashed before logging.
- [ ] No call sites need to change; all existing imports compile and run.
- [ ] All logs still appear (console/file) when Sentry is disabled; dual-write with Sentry works when enabled.

## Implementation Prompt

### Task 1: Adapter for photoFlowLogger (Client)
**Prompt**: Refactor `src/utils/photoFlowLogger.ts` to delegate to the Logger facade while preserving its public API and batching behavior.

**Requirements**:
1. Import `createClientLogger` from `src/logging/factory.ts` and initialize a module-level logger.
2. Replace `console.log` lines with `logger.info|warn|error|debug` calls.
3. Keep the batching and `sendBeacon` flush semantics intact but route actual entries through facade sinks.
4. Ensure the filename used by FileSink remains stable (include sessionId) for continuity.

### Task 2: Adapter for serverLogger (Netlify Functions)
**Prompt**: Refactor `netlify/functions/_lib/serverLogger.js` to use the server logger factory and keep the same export shape.

**Requirements**:
1. Import `createServerLogger` from `netlify/functions/_lib/logging/factory.server.js`.
2. Keep exporting `{ serverLogger }` to avoid breaking imports.
3. Map `info|warn|error|debug` to the underlying facade and remove redundant file write logic (FileSink owns it).
4. Preserve session-based file naming and flush thresholds by configuring FileSink accordingly.

### Task 3: Adapter for teamLogger (security-aware)
**Prompt**: Update `netlify/functions/_lib/teamLogger.js` to validate and sanitize inputs, then route through facade.

**Requirements**:
1. Use `LockUtils.hashTeamCode` to hash `teamCode` or add a helper for generic identifiers.
2. Replace direct `console.log` calls with `logger.info|warn|error` and attach structured context only with hashed identifiers.
3. Keep method signatures unchanged: `logVerificationAttempt`, `logLockOperation`, `logWriteRejection`, `logStorageOperation`, `logSecurityEvent`.

### Task 4: Manual Verification
**Prompt**: Run Netlify Dev and verify both client and server adapters produce:
- Console logs
- File logs under `logs/`
- Optional Sentry events when enabled

**Requirements**:
1. Trigger flows: photo upload, team verify, progress set.
2. Confirm filenames and payload shapes match prior behavior (sessionId included, truncated URLs, etc.).

## Definition of Done
- [ ] Adapters implemented and import-compatible across codebase.
- [ ] Logs route through the Logger facade on client and server.
- [ ] No broken imports or runtime errors.
- [ ] Verified behavior with Sentry disabled and enabled.
