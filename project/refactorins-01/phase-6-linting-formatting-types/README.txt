Phase 6 — Linting, Formatting, and Type Strictness

Objective
- Enforce consistent code style and improve type safety.

Changes
- Add ESLint with @typescript-eslint and react plugins.
- Add Prettier and align with ESLint (eslint-config-prettier).
- Add scripts: lint, format.
- Increase TypeScript strictness (noImplicitAny, strictNullChecks) in tsconfig.

Acceptance Criteria
- npm run lint and npm run format pass.
- CI includes lint check.

Manual Verification
- Run linters and ensure the codebase is formatted and type errors are addressed.
