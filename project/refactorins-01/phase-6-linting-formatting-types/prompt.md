# Phase 6 — Linting, Formatting, and Types

Goal: Establish linting/formatting and tighten TS types.

Instructions
1) Install ESLint + Prettier + TypeScript plugins.
2) Create .eslintrc with react, react-hooks, @typescript-eslint rules.
3) Create .prettierrc with project defaults.
4) Update tsconfig to enable strict flags (incrementally if needed).
5) Add npm scripts: lint, format, lint:fix.

Verification
- Linting passes; codebase is formatted.

## CI gate and pre-commit
- Add GitHub Actions (or Netlify build command) step to run:
  - `npm ci`
  - `npm run lint`
  - `npm run test` (from Phase 5)
- Add `husky` + `lint-staged` to run ESLint and Prettier on staged files before commit.

## Incremental strictness plan
- Turn on `strictNullChecks` and `noImplicitAny` first.
- Address types in `src/services/` and `src/utils/` with highest priority (most executed code paths).
- Add explicit types or JSDoc where conversion to TS is pending.
- Track remaining type TODOs and eliminate them by the end of Phase 7.

## Commands
- `npm run lint` — verify no lint errors.
- `npm run format` — reformat codebase.
- `npm run test` — ensure tests remain green under stricter settings.
