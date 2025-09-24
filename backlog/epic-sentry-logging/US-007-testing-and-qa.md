# US-007: Testing & QA

## User Story
**As a QA engineer**, I want automated tests and a manual verification checklist so that the Sentry-enabled logging system is reliable, non-breaking, and safe.

## Priority: HIGH
**Estimated Time**: 6–8 hours
**Complexity**: MEDIUM
**Dependencies**: US-001..US-006

## Acceptance Criteria
- [ ] Unit tests cover the Logger facade fan-out; sinks don’t throw on malformed inputs.
- [ ] Unit tests cover sanitizer redaction rules (URLs, hashes, truncation, binary data suppression, cycle-safe).
- [ ] Integration tests simulate API errors/timeouts and verify breadcrumbs/error capture (when enabled).
- [ ] Manual QA performed with Sentry disabled/enabled; no regressions in console/file logging.
- [ ] A regression checklist exists and is committed with steps and expected outputs.

## Implementation Prompt

### Task 1: Facade and Sinks Unit Tests
**Prompt**: Write unit tests to validate fan-out behavior and sink robustness.

**Requirements**:
1. Create `src/logging/__tests__/logger.facade.test.ts`:
   - Mocks sinks; asserts each receives the same `LogEntry`.
   - Verifies error sink doesn’t block others on throw (catch-and-continue).
2. Create `src/logging/__tests__/consoleSink.test.ts`:
   - Spies on `console` methods; ensures structured output without throw.
3. Client FileSink tests (if feasible with fetch mock):
   - `src/logging/__tests__/fileSink.client.test.ts` uses mock fetch to assert batch flush payload and retry on failure.

### Task 2: Sanitizer Unit Tests
**Prompt**: Ensure redaction rules behave consistently.

**Requirements**:
1. `src/logging/__tests__/sanitize.test.ts`:
   - URL redaction (drop query params, truncate path ~100 chars).
   - Identifier hashing for known keys (teamCode-like fields).
   - Truncation utility.
   - Cycle-safe stringify.
   - Dropping File/Blob-like objects.

### Task 3: Integration Tests (Client)
**Prompt**: Simulate error and network flows to verify optional breadcrumbs and error capture.

**Requirements**:
1. If an integration test setup is present, add cases for:
   - `apiClient` request error -> breadcrumb recorded (guarded to no-op when Sentry disabled).
   - React render error inside a test ErrorBoundary -> capture when enabled.
2. Otherwise, add a small dev-only page/route to trigger these conditions and document manual steps.

### Task 4: Integration Tests (Server)
**Prompt**: Validate server behavior in Netlify Dev or with function handlers.

**Requirements**:
1. Use local invocations (Netlify Dev) to trigger errors in:
   - `/.netlify/functions/photo-upload` (simulate missing env -> 500).
   - `/.netlify/functions/progress-set/...` with invalid JSON -> 400.
2. Verify that:
   - Console/file logs are present.
   - With Sentry enabled, events appear with request context.

### Task 5: Manual QA Checklist
**Prompt**: Create and follow a step-by-step manual checklist, with Sentry toggled off/on.

**Requirements**:
1. Add `backlog/epic-sentry-logging/QA-CHECKLIST.md` with:
   - Toggle `VITE_ENABLE_SENTRY=false` -> verify console/file logs only.
   - Toggle `VITE_ENABLE_SENTRY=true` + DSN -> verify dual-write.
   - Exercise photo upload (success + oversized), progress save, team verify.
   - Validate no PII in logs (hashed identifiers, truncated URLs).
2. Capture screenshots/links (optional) to Sentry events for reference.

## Definition of Done
- [ ] Tests implemented or documented where automation isn’t feasible.
- [ ] Manual QA checklist added and executed.
- [ ] Verified no regressions with Sentry on/off.
- [ ] CI passes tests (if CI enabled).
