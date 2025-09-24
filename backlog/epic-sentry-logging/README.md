# Epic: Sentry Logging System

## Overview
Introduce a generic, swappable logging interface with multi-sink fan-out (Console, File, Sentry) for both client and server. Preserve all existing logging behavior and provide feature-flagged rollout with strong PII redaction.

## User Stories

- US-001: Logger Facade and Core Sinks
- US-002: Client Sentry Integration
- US-003: Server Sentry Integration (Netlify + Express)
- US-004: Redaction & Compliance
- US-005: Backward-Compatible Adapters (photoFlowLogger, serverLogger, teamLogger)
- US-006: Non-Breaking Call-Site Migration
- US-007: Testing & QA
- US-008: Rollout & Observability

## Implementation Order
See `IMPLEMENTATION_ORDER.md` for the recommended sequence.

## Success Criteria
- ✅ Generic `Logger` facade with multi-sink support
- ✅ Console + File + Sentry sinks available and can run concurrently
- ✅ Existing logging continues to work via adapters, with no regressions
- ✅ PII redaction enforced consistently on client and server
- ✅ Feature-flag controls and environment setup documented
- ✅ Tests verify behavior and redaction
