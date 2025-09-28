# STORY-024: Remove legacy state-* endpoints and call sites

- Epic: DB-Only Source of Truth
- Owner: Backend/Client
- Status: Proposed

## Description
Deprecate and remove the `state-*` endpoints and their redirects. Remove any client usage.

## Affected Files
- `netlify/functions/state-get.js`, `state-list.js`, `state-set.js`, `state-delete.js`, `state-clear.js`
- `netlify.toml` redirects for `/api/state-*`

## Acceptance Criteria
- No routes or redirects exist for `state-*`.
- No client code references these endpoints.

## Tasks
- Delete/disable functions.
- Remove redirects from `netlify.toml`.
- Search and remove client references.

## Testing
- Grep for `state-` in codebase returns no client call sites.
