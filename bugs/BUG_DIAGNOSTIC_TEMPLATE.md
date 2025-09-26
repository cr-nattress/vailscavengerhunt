# Bug Diagnostic Template

Use this document to investigate and resolve issues. Duplicate it for each bug (e.g., `bugs/2025-09-26-bug-title.md`). Keep it concise but complete.

---

## Metadata
- **Title:** <one-line summary>
- **Date Discovered:** <YYYY-MM-DD>
- **Reporter:** <name/handle>
- **Owners:** <engineer(s)>
- **Status:** <new / investigating / mitigated / fixed / monitoring / closed>
- **Severity:** <blocker / critical / major / minor / trivial>
- **Priority:** <P0 / P1 / P2 / P3>
- **Area/Component:** <frontend | netlify function | API | deploy>
- **Environment:** <prod / staging / dev>  
  - **URL:** <page or endpoint>
  - **Branch/Commit:** <branch @ short-sha>
  - **Deploy ID:** <Netlify deploy id>
  - **Sentry Release/Env:** <release / env>
- **Affected Org/Hunt/Team (if applicable):** <orgId / huntId / teamId>

---

## Summary
Describe what’s broken in 1–3 sentences. Include current user impact.

## Context / Background
Optional: recent changes, feature flags, releases, migrations, dependencies that might relate.

## Steps to Reproduce
1. <step>
2. <step>
3. <step>

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens (include error messages, HTTP status, screenshots).

## Impact Assessment
- **Who is affected:** <all users / subset>  
- **Scope/Blast Radius:** <endpoints, pages, features>
- **Frequency:** <always / intermittent>

---

## Evidence: Logs, Traces, Screenshots
- **Browser Console:**
  - <paste errors/warnings>
- **Network Requests:**
  - Request: `<method> <url>`
  - Response: `<status> <content-type>`  
  - Headers: <relevant headers>
  - Body: <relevant payload>
- **Server/Function Logs (Netlify):**
  - <link to function logs or pasted excerpts>
- **Sentry:**
  - Event link(s): <url>
  - Event IDs: <ids>
- **Request/Trace IDs:** <ids>
- **Screenshots:** <paths or links>

---

## Quick Diagnostics Checklist
- [ ] **Endpoint mapping correct** (Netlify `netlify.toml` redirect points to desired function)
- [ ] **SPA fallback not intercepting** (ensure API redirect precedes `/* -> /index.html`)
- [ ] **Allowed methods configured** (GET/HEAD/OPTIONS as needed)
- [ ] **CORS headers present** for function responses
- [ ] **Accept header** does not cause HTML negotiation
- [ ] **Direct function URL works** (`/.netlify/functions/<name>/...`)
- [ ] **Cache/Edge/CDN** not serving stale HTML
- [ ] **Env vars present** for function (DSN, Supabase, etc.)
- [ ] **Function throws handled** (returns JSON, not default HTML)
- [ ] **Sentry errors captured** (if expected)

---

## Hypotheses
List possible root causes.
- <hypothesis 1>
- <hypothesis 2>

## Experiments / Tests Run
Document what you tried and the outcome.
- <test> → <result>

## Findings
What you learned from the experiments.

## Root Cause
Concise root cause statement.

## Fix Plan
- **Code/Config Changes:** <files, functions, redirects, env vars>
- **Risk:** <low/med/high>
- **Rollback Plan:** <how to revert quickly>
- **Owners:** <names>

## Validation Plan
- **Test Cases:** <manual/automated checks>
- **Environments:** <dev/stage/prod>
- **Monitoring:** <Sentry dashboards, logs, metrics>

## Follow-ups / Tech Debt
- <action 1>
- <action 2>

## Timeline (optional)
- <time> Event/Observation
- <time> Action/Fix

## References
- Related issues/PRs: <links>
- Docs: `netlify.toml`, `src/server/consolidatedRoute.ts`, `netlify/functions/*`
- Example cURL:
  ```bash
  # Direct function (bypasses redirect layer)
  curl -i "https://<site>/.netlify/functions/consolidated-active/bhhs/teacup/fall-2025"

  # Redirected API route
  curl -i -H "Accept: application/json" \
    "https://<site>/api/consolidated/active/bhhs/teacup/fall-2025"
  ```
