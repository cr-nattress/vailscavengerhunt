# Implementation Order: Sentry Logging System

1) US-001: Logger Facade and Core Sinks (Foundation)
2) US-002: Client Sentry Integration (Browser)
3) US-003: Server Sentry Integration (Netlify + Express)
4) US-004: Redaction & Compliance (Sanitizer + beforeSend)
5) US-005: Backward-Compatible Adapters (photoFlowLogger, serverLogger, teamLogger)
6) US-006: Non-Breaking Call-Site Migration (Verification)
7) US-007: Testing & QA (Unit, Integration, E2E)
8) US-008: Rollout & Observability (Flags, Env, Docs)

Notes:
- Phase 4 can begin in parallel with 2/3 once the facade shape is finalized.
- Phase 5 (adapters) should be applied after the sinks exist to ensure dual-write.
- Keep Sentry disabled until Phase 7 validates behavior; flip flag in Phase 8.
