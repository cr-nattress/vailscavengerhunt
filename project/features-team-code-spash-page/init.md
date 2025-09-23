Companion Feature Prompt — Team Code Splash & 24-Hour Team Lock (Blob + Table Storage)

Feature Name: Team Code Splash & 24-Hour Team Lock
Branch context: features/demo-01 (reuse all patterns and tooling already established in this branch)

0) Feature Brief (Storage-aware)

User story:
As a returning participant, I want to enter a Team Code on a splash screen so I can be assigned to my team and contribute to the hunt. If I come back within 24 hours, I should skip the splash and continue with my team automatically.

Key rules

Team code validation is server-side only (Netlify Function).

On success, client stores a lock in localStorage with a 24h TTL.

Writes to team data require the server-issued lockToken bound to a single team for 24h.

Anti multi-team writes: a device may not write to >1 team within the active 24h lock.

Teams live in Blob Storage as JSON (authoritative team state).

Team code → team mapping lives in Table Storage (fast lookup).

Non-goals

Team creation/rotation UI, multi-device identity, organizer admin tools.

1) Storage Model
Table Storage (Mapping)

PartitionKey: "team"

RowKey: teamCode (opaque unique)

Columns: teamId, teamName, isActive (bool), createdAt, optional eventId

Lookup path (verify): ("team", code) → returns { teamId, teamName, isActive }

Blob Storage (Team JSON)

Path: teams/team_{teamId}.json

Shape (example):

{
  "teamId": "TEAM_abc123",
  "name": "The Powder Hounds",
  "score": 250,
  "huntProgress": { "found": [], "submitted": [] },
  "updatedAt": "2025-09-23T00:00:00Z"
}


Use ETag for optimistic concurrency on writes.

2) Client Contracts
localStorage key

Key: hunt.team.lock.v1

{
  "teamId": "TEAM_abc123",
  "issuedAt": 1737676800000,
  "expiresAt": 1737763200000,
  "teamCodeHash": "sha256:deadbeef...",
  "lockToken": "lk_opaque_server_minted"
}

Write header

Attach X-Team-Lock: <lockToken> on all team-mutating requests.

Splash behavior

Show full-screen takeover when lock missing/expired.

On valid lock, bypass splash and continue to app.

3) API (Netlify Functions)
POST /.netlify/functions/team-verify

Req: { code: string, deviceHint?: string }
Resp 200: { teamId: string, teamName: string, lockToken: string, ttlSeconds: number }
Errors:

401 TEAM_CODE_INVALID (unknown/inactive code)

409 TEAM_LOCK_CONFLICT (device already locked to different team for remaining TTL)

429 RATE_LIMITED (verify throttled)

Notes

lockToken is opaque (e.g., HMAC/JWT) with embedded teamId + exp.

Optionally bind to a privacy-respecting device fingerprint (HMAC of UA + random seed stored server-side) to enforce single-team lock.

Write middleware (apply to any existing/new write endpoints)

Validate X-Team-Lock → resolve to { teamId, exp }

Reject if expired (419 TEAM_LOCK_EXPIRED)

Reject if team mismatch vs requested path/body (403 TEAM_MISMATCH)

On success, proceed to read/modify Blob teams/team_{teamId}.json using ETag.

4) UX Flow & States

App init

Read/parse hunt.team.lock.v1. If expiresAt <= now, purge and route to splash.

If valid, fire lock_restored event and continue.

Splash

Input (alphanumeric), paste-friendly, submit via “Go” key.

POST verify → on 200, persist lock JSON and route to home.

On 401: non-revealing error (“That code didn’t work. Check with your host.”)

On 409: show remaining time (“You’re already checked in with another team for the next {{hoursLeft}}h.”)

Writes

All mutations include X-Team-Lock.

On 403/419 from server: clear lock and route to splash with reason banner.

A11y: focus management, ARIA live for errors, label controls, mobile keyboard safe.

5) Security & Privacy

Codes compared in constant-time; only hashed codes logged.

lockToken signed + exp, never trusted client-side for team identity (server resolves).

Rate-limit /team-verify by IP+UA; minimal storage of device hints.

Strict CORS per site origin; avoid verbose error copy.

6) Observability

Client events

splash_impression { source: 'cold|expired' }

code_submit { hashedCodePrefix }

code_success { teamId, ttlSeconds }

code_failure { reason }

lock_restored { teamId, remainingTtlSeconds }

write_rejected_no_lock { endpoint, reason }

Server logs

Verify attempts (hashed code), outcome, latency.

Lock issuance, write rejects (reason counts).

Blob write conflicts (ETag mismatch) + retries.

7) Testing (Vitest + DOM)

Unit

TTL parse/expiry edge ±1s.

Storage helpers (get/set/clear).

Header attach logic.

Integration

Verify success → lock persisted → subsequent write 200.

Invalid code 401 → error shown, retry works.

Existing lock Team A → attempting Team B code → 409.

Expired lock → write 419 → client purge + redirect.

Server

Verify path hits Table lookup; isActive=false → 401.

LockToken encode/decode; exp respected.

Blob write with ETag; simulate conflict and retry.

E2E (light)

Mobile keyboard flows, offline behavior (read-only with valid lock; blocked join when offline).

8) Files to Add/Touch (propose minimal, align with repo)

Scan the repo first; reuse existing utilities (fetch wrappers, logger, env reader). Keep file names consistent with project idioms.

Client

src/features/teamLock/localStorage.ts (get/set/clear/validate)

src/features/teamLock/api.ts (verifyTeamCode, attaches headers helper)

src/features/teamLock/SplashGate.tsx (full-screen prompt; keyboard-safe)

src/features/teamLock/useTeamLock.ts (boot-time check, redirect, events)

src/components/TeamChip.tsx (optional small “Team: name” indicator)

Server (Netlify)

netlify/functions/team-verify.ts (Table lookup → lock mint)

netlify/functions/_lib/storage.ts (blob/table helpers, ETag ops)

netlify/functions/_lib/lock.ts (create/verify lockToken, conflict checks)

Middleware pattern for write endpoints (either shared helper or per-fn guard)

Tests

test/teamLock/localStorage.test.ts

test/teamLock/api.test.ts

test/teamLock/splash-gate.dom.test.tsx

test/functions/team-verify.test.ts

Docs

Update BACKLOG.md & CLAUDE.md with feature notes and env vars.

9) Env & Config

TEAM_TABLE_NAME — table storage mapping

BLOB_CONTAINER — teams container

BLOB_CONN_STRING or provider-specific creds (use Netlify env)

TEAM_LOCK_TTL_SECONDS=86400

ALLOW_TEAM_SWITCH=false (feature flag)

If using JWT: LOCK_JWT_SECRET

Document these in ENVIRONMENT_SETUP.md and respect existing env loading utilities.

10) Error Codes (server → client)

401 TEAM_CODE_INVALID

409 TEAM_LOCK_CONFLICT

419 TEAM_LOCK_EXPIRED

403 TEAM_MISMATCH

429 RATE_LIMITED

11) Implementation Plan (summarize first)

Discover & reuse: identify existing fetch/logger/env utils; note target files.

Server: implement team-verify (table lookup → lock mint), add shared lock guard for write fns.

Client: SplashGate + storage + api wrapper + write header injection.

Wire-through: add guard to all existing write calls; add TeamChip indicator (optional).

Tests: unit → integration → server; keep deterministic.

Observability: add events/logging hooks where the codebase expects them.

Docs & PR: risks (token leakage, clock skew), rollbacks (feature flag), screenshots/GIF.

12) Definition of Done (this feature)

Valid lock skips splash; expired lock redirects to splash.

Verify function enforces single-team lock per device for 24h.

All write endpoints reject missing/expired/mismatch locks.

Blob updates use ETag; conflict handled gracefully.

Tests pass; a11y verified on splash; no console errors.

PR includes plan, diffs, tests, env notes, screenshots.

Execution Output (return)

Plan & file list (concrete to this repo)

Patches/diffs for client + functions

Test files

Env notes & function docs

PR description with risks/rollbacks

Begin by scanning features/demo-01 for existing patterns/utilities and propose the minimal, convention-aligned plan to implement Team Code Splash & 24-Hour Team Lock.