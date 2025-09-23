New Feature Prompt — Vite + TypeScript + Netlify (Branch: features/demo-01)

You are Claude Code working inside this repository/branch. Inherit all conventions from the codebase and configs. Before making changes, read and follow:

Root configs: package.json, tsconfig*.json, .eslintrc*, .prettierrc*

Build/dev: vite.config.js

Tests: vitest.config.ts, existing tests under test/ (if any)

Hosting/runtime: netlify.toml, files under netlify/functions/

App code and assets: src/, public/

Project docs: STARTUP.md, BACKLOG.md, CLAUDE.md, ENVIRONMENT_SETUP.md

If the repo establishes a pattern, reuse it; propose new patterns only when clearly safer or simpler, and explain why.

0) Feature Brief

Name: {{FEATURE_NAME}}

User story: As a {{ROLE}}, I want {{CAPABILITY}} so that {{OUTCOME}}.

Context: {{ISSUE_LINKS/SPECS}}

Non-goals: {{NONGOALS}}

1) Deliverables

 Working implementation in src/ (TypeScript modules & small, composable components)

 Tests with Vitest (unit + integration as appropriate)

 A11y states (loading/empty/error/success), keyboard support

 Performance sanity (lazy import where appropriate)

 Netlify Function(s) if needed, aligned with netlify/functions/ conventions

 Docs: brief notes in PR describing approach, risks, and test plan

2) Implementation Plan (summarize first)

Scan repo to find related utilities/components to reuse. List files to touch/create.

Data contracts: define/extend TS types and any request/response shapes.

UX flow: outline happy path and edge cases; define explicit UI states.

Security/privacy: validate inputs on both client and function boundaries; avoid leaking secrets.

Testing plan: list unit/integration cases and any DOM testing (Testing Library if present).

Proceed without asking unless a change would alter existing patterns materially.

3) UI/UX Guidelines (framework-agnostic)

Mobile-first, responsive layout; fluid spacing; clamped typography.

Clear states: loading, empty, error, success; visible focus; trap-free dialogs.

Use semantic HTML; ARIA only when needed; label form controls; maintain 4.5:1 contrast.

Keep components small and single-purpose; extract logic into pure TS utilities where possible.

4) Web Dev Best Practices

TypeScript strict; avoid any; narrow types at boundaries.

Error handling: no silent catches; surface actionable messages; centralize logging.

API: wrap fetch/Xhr with a small typed helper; validate input (e.g., Zod) before calling functions.

Netlify: functions must be stateless and fast; return typed JSON; set appropriate status codes.

Config: read env via Netlify mechanism; document new vars and provide safe fallbacks.

Observability: use existing logger; add minimal timing/metrics if such utility exists.

5) Testing Best Practices (Vitest)

Unit for pure functions and state helpers.

Integration/DOM for components/features (use @testing-library/* if available).

Make tests deterministic, parallelizable, and runnable in CI.

Consider a light a11y lint (axe) on key DOM if tooling exists.

6) Definition of Done

✅ Lint/format/type-check clean.

✅ Tests added and passing.

✅ No console errors at runtime.

✅ A11y keyboard/labels/focus pass.

✅ PR text includes scope, screenshots/GIFs (if UI), risks, rollbacks.

7) Git Hygiene

Branch: feat/{{kebab-feature-name}}

Conventional commits (feat:, fix:, chore: …)

8) Execution Output (what to return)

Plan & file list

Patches/diffs

Test files

Notes (env, functions)

PR description

Begin by scanning this branch (features/demo-01) and proposing the minimal, convention-aligned plan for {{FEATURE_NAME}}.