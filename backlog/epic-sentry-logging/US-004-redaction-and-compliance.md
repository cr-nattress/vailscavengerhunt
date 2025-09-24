# US-004: Redaction & Compliance

## User Story
**As a security reviewer**, I want sensitive information redacted from logs so that we avoid leaking PII or secrets while maintaining observability.

## Priority: HIGH
**Estimated Time**: 4–6 hours
**Complexity**: MEDIUM
**Dependencies**: US-001 (Logger Facade), US-002/US-003 (Sentry sinks planned)

## Acceptance Criteria
- [ ] Sanitizer utilities exist for client and server with the same redaction rules.
- [ ] Team codes and similar identifiers are hashed before logging (use `LockUtils.hashTeamCode` semantics where applicable).
- [ ] URLs are truncated and query parameters are removed for breadcrumbs/events.
- [ ] Large payloads and binary data (e.g., files, ArrayBuffers) are omitted; only metadata remains.
- [ ] Sentry `beforeSend` hooks apply the sanitizer to all events.
- [ ] Unit tests verify all sanitizer rules.

## Implementation Prompt

### Task 1: Implement Shared Redaction Rules
**Prompt**: Create a consistent set of redaction rules for client and server.

**Requirements**:
1. Create `src/logging/sanitize.ts` (client) with helpers:
   - `sanitizeLogData(input: unknown): SafeObject`
   - `redactUrl(url: string): string` (drop query params, truncate to ~100 chars)
   - `truncate(value: string, max = 100): string`
   - Handle objects with cycles (safe stringify), omit File/Blob/Binary data.
2. Create `netlify/functions/_lib/logging/sanitize.server.js` with equivalent behavior for Node.

### Task 2: Hash Team Codes and Similar Identifiers
**Prompt**: Ensure team-related identifiers are never logged in plaintext.

**Requirements**:
1. On server, import and use `LockUtils.hashTeamCode` where available or replicate hashing for generic inputs.
2. Expose a helper `hashIdentifier(input: string): string` used by sanitizer for known keys (`teamCode`, `teamId` if needed, etc.).

### Task 3: Integrate `beforeSend` with Sentry
**Prompt**: Apply sanitizer to all Sentry events on client and server.

**Requirements**:
1. In `src/logging/initSentryClient.ts`, set `beforeSend(event) { return sanitizeSentryEvent(event) }`.
2. In `netlify/functions/_lib/logging/initSentry.node.js`, set `beforeSend` to the server sanitizer.
3. Strip personal headers and tokens from request context.

### Task 4: Unit Tests
**Prompt**: Add tests to verify sanitization works as expected.

**Requirements**:
1. Create `src/logging/sanitize.test.ts` for client rules.
2. Create `netlify/functions/_lib/logging/sanitize.server.test.js` for server rules (if test runner supports it) or document manual verification.
3. Test cases: URL redaction, query stripping, truncation, hashing identifiers, dropping binary data, cycle-safe stringification.

## Definition of Done
- [ ] Sanitizer implemented on client and server.
- [ ] Sentry `beforeSend` wired to sanitizer.
- [ ] Hashing and truncation rules verified with tests.
- [ ] Documentation added to epic about what data is logged/redacted.
