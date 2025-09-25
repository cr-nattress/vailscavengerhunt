# Epic: Production Verification and Live Supabase Integration

## Overview
Verify the production readiness of the application by validating the splash page UX, all API endpoints, live data flow from Supabase, absence of hardcoded data, and overall stability in production. Identify any bugs and, if discovered, create actionable prompts in the `@bugs` directory to resolve them.

## Goals
- Ensure the splash/landing page renders correctly, quickly, and without console errors.
- Confirm all endpoints respond successfully and use live data from Supabase.
- Eliminate hardcoded data across serverless functions and dev server routes.
- Validate that the same non-Vite environment variables are used locally and in production.
- Verify the production deployment works end-to-end with no regressions.
- Document and triage any bugs with a high-quality reproduction prompt in `@bugs`.

## Success Criteria
- [ ] Splash page loads within budgeted time and has zero blocking errors in console.
- [ ] All endpoints return 2xx for happy-path requests.
- [ ] Responses reflect live Supabase data (no static or stubbed content).
- [ ] No hardcoded team codes, sponsors, or sample data in execution paths.
- [ ] Local and production use identical, non-Vite env keys.
- [ ] Sentry (if enabled) shows no recurring errors after verification.
- [ ] Any discovered bugs are captured in `@bugs` with a clear prompt and repro steps.

## Scope
- UI: Splash page and core feature screens.
- API: Netlify Functions and Express dev endpoints.
- Storage: Supabase tables, policies, and buckets.
- Observability: Sentry instrumentation and logs.

## Environments
- Production site: <ADD_PROD_URL>
- Local dev: `http://localhost:5173` (UI), `http://localhost:3001/api` (Express proxy), `http://localhost:8888` (Netlify Dev UI)

## Required Environment Variables (non-Vite)
Set identically in local `.env` and Netlify:
- SUPABASE_URL
- SUPABASE_ANON_KEY (browser-safe)
- SUPABASE_SERVICE_ROLE_KEY (server-only)
- SPONSOR_CARD_ENABLED
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_UNSIGNED_PRESET
- CLOUDINARY_UPLOAD_FOLDER
- MAX_UPLOAD_BYTES, ALLOW_LARGE_UPLOADS, ENABLE_UNSIGNED_UPLOADS, DISABLE_CLIENT_RESIZE
- SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE (optional)

## Endpoint Matrix (must return 2xx)
- GET `/api/health`
- POST `/.netlify/functions/team-verify`
- GET `/.netlify/functions/team-current`
- POST `/.netlify/functions/team-setup` (dev-only; create mapping)
- POST `/.netlify/functions/sponsors-get`
- GET  `/.netlify/functions/progress-get/:org/:team/:hunt` (if used)
- POST `/.netlify/functions/progress-set`
- GET  `/.netlify/functions/progress-get-supabase/:org/:team/:hunt`
- POST `/.netlify/functions/progress-set-supabase`
- GET  `/.netlify/functions/settings-get`
- POST `/.netlify/functions/settings-set`
- POST `/.netlify/functions/photo-upload` (if enabled)
- GET/POST `/.netlify/functions/public-config` (GET)

Note: In dev, `/api/*` routes proxy to the above via `netlify.toml` or Express.

## Verification Plan

### 1) Splash Page
- [ ] Load splash page on production.
- [ ] Confirm core hero, CTA, and sponsor card sections render and are styled.
- [ ] Open DevTools and verify:
  - [ ] No red (error) logs.
  - [ ] No 404 network calls.
  - [ ] App initialized with public config (check GET `/.netlify/functions/public-config`).

### 2) Public Config
- [ ] GET `/.netlify/functions/public-config` returns:
  - [ ] `SUPABASE_URL` populated (no secrets exposed: service key must not appear).
  - [ ] Flags and Cloudinary settings correct.

### 3) Supabase Live Data
- [ ] Verify `/.netlify/functions/sponsors-get` returns actual sponsor items when `SPONSOR_CARD_ENABLED=true` and data exists in `sponsor_assets`.
- [ ] Verify `team-verify` resolves codes from Supabase first (if present), falling back to blobs only in dev.
- [ ] Write/read progress via `progress-set-supabase` and `progress-get-supabase`.

### 4) Team Authentication Flow
- [ ] POST `team-setup` in dev to generate code (or insert in Supabase in prod if allowed).
- [ ] POST `team-verify` with `{ code }` returns `lockToken`.
- [ ] GET `team-current` with `x-team-lock` returns team metadata.
- [ ] Confirm device lock behavior works (no false conflicts).

### 5) No Hardcoded Data Audit
- [ ] Search codebase for suspicious tokens:
  - [ ] `ALPHA01`, `BETA02`, `GAMMA03`, `TEAM_`.
  - [ ] Static arrays of codes or teams in runtime paths.
- [ ] Confirm `src/server/teamRoute.ts` proxies to functions (no local maps).
- [ ] Confirm `netlify/functions/team-setup.js` accepts dynamic mappings (no baked codes).

### 6) Production Deployment Verification
- [ ] Ensure identical env keys exist in Netlify site settings.
- [ ] Validate homepage, primary user flow, and sponsor card rendering.
- [ ] Confirm Sentry (if DSN set) is emitting events tagged with release and environment.

## Example Requests (curl)

- Create team mapping (dev/local):
```bash
curl -X POST http://localhost:3001/api/team-setup \
  -H "Content-Type: application/json" \
  -d '{
        "mappings": [
          { "code": "ALPHA01", "teamId": "TEAM_alpha_001", "teamName": "Team Alpha", "isActive": true, "organizationId": "bhhs", "huntId":"fall-2025" }
        ]
      }'
```

- Verify team code:
```bash
curl -X POST http://localhost:3001/api/team-verify \
  -H "Content-Type: application/json" \
  -d '{ "code": "ALPHA01", "deviceHint": "prod-verification" }'
```

- Get current team:
```bash
curl -X GET http://localhost:3001/api/team-current \
  -H "x-team-lock: <LOCK_TOKEN_FROM_VERIFY>"
```

- Sponsors:
```bash
curl -X POST https://<SITE>/.netlify/functions/sponsors-get \
  -H "Content-Type: application/json" \
  -d '{ "organizationId": "bhhs", "huntId": "fall-2025" }'
```

## Bug Handling Process
- If any step fails, immediately capture a bug prompt in `@bugs/` with:
  - Title: short summary (e.g., `team-verify returns 401 for valid code`).
  - Context:
    - Endpoint and request.
    - Expected vs. actual behavior.
    - Relevant logs or stack traces.
    - Environment (local/prod) and commit SHA.
  - Reproduction steps (copy/paste-ready curl or code snippet).
  - Hypothesis (optional) and severity.

Recommended location and format:
```
@bugs/BUG-<yyyymmdd>-<slug>.md
```

Template to use:
```
# Bug Report: <title>

## Summary
<one-liner>

## Environment
- Env: <local|prod>
- Commit: <sha>
- URL: <site-url>

## Steps to Reproduce
```bash
<curl or script>
```

## Expected
<what should happen>

## Actual
<what happened>

## Logs / Evidence
```
<error output>
```

## Hypothesis
<optional>

## Suggested Fix Prompt
```
@bugs Please fix <issue>. Context: <key details>. Acceptance: <tests that must pass>.
```
```

## Deliverables
- Completed checklist with timestamps and assignee initials.
- Bug prompts for any defects discovered.
- Summary report of findings and any remaining risks.

## Timeline & Owners
- Target window: <dates>
- Owner(s): <names>
- Reviewers: <names>
