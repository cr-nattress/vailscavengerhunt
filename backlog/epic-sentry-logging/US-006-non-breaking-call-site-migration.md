# US-006: Non-Breaking Call-Site Migration

## User Story
**As a developer**, I want to migrate existing logging call sites to the new facade without changing behavior so that the app remains stable while we gain Sentry support.

## Priority: HIGH
**Estimated Time**: 4–6 hours
**Complexity**: MEDIUM
**Dependencies**: US-001 (Logger Facade), US-005 (Adapters)

## Acceptance Criteria
- [ ] No source files outside the logging modules require breaking import changes.
- [ ] Existing calls to `photoFlowLogger`, `serverLogger`, and `teamLogger` continue functioning via the adapters.
- [ ] Optional: selective high-value `console.log` lines are mirrored through the facade (without removing the console line) to provide breadcrumbs.
- [ ] All Netlify redirects for `/api/write-log` remain unchanged (`netlify.toml`).
- [ ] Manual smoke tests across photo upload, progress save, and team verify show expected logs in console and `logs/` with Sentry disabled and enabled.

## Implementation Prompt

### Task 1: Audit and Inventory Call Sites
**Prompt**: Identify key logging points and confirm which ones should be mirrored via the facade.

**Targets** (examples):
- `src/services/ProgressService.ts`
- `src/hooks/usePhotoUpload.ts`
- `src/services/apiClient.ts`
- `netlify/functions/progress-set.js`
- `netlify/functions/photo-upload.js`
- `netlify/functions/team-verify.js`
- `src/server/progressRoute.ts`, `src/server/collageRoute.ts`, `src/server/leaderboardRoute.ts`

**Requirements**:
1. Make a short list of high-signal `console` statements that should also go through the facade for breadcrumbs (keep existing logs intact).
2. Ensure none of these changes alter control flow or throw.

### Task 2: Mirror High-Value Console Logs via Facade
**Prompt**: For selected call sites, add a parallel `logger.info|warn|error` call that carries structured context (keeping the original `console` call).

**Requirements**:
1. Add minimal imports or get a logger instance via small local helper to avoid large code diffs.
2. Use the sanitizer-friendly shapes (no large blobs; truncate URLs; hash identifiers as needed).
3. Ensure code compiles in both Vite dev and Netlify Functions.

### Task 3: Manual Verification
**Prompt**: Run Netlify Dev and Vite, then exercise the flows to confirm no behavior change and dual-write works when Sentry is on.

**Requirements**:
1. Photo upload happy-path and error-path.
2. Progress save with/without photos.
3. Team verify success and invalid code.

## Definition of Done
- [ ] Key call sites mirrored through the facade where it adds value (breadcrumbs), without removing existing logs.
- [ ] No regressions in functionality.
- [ ] Verified in local/dev environments with Sentry off and on.
