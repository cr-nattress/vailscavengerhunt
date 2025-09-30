# React Refactor Audit — Index

## Summary

**Total Files Analyzed:** 30
**Files Flagged for Refactoring:** 3 (React) + 2 (Netlify Functions)
**Analysis Date:** 2025-09-30

---

## Overview Table

| File | LOC | Max Complexity | JSX Depth | Issues Count | Effort | Impact | Risk | Total Score | Report |
|------|-----|----------------|-----------|--------------|--------|--------|------|-------------|--------|
| src/features/views/ActiveView.tsx | 321 | 8 | 7 | 10 | 7 | 9 | 6 | 22 | [REACT_VIEW_ACTIVE.md](./REACT_VIEW_ACTIVE.md) |
| src/App.jsx | 253 | 8 | 6 | 6 | 5 | 8 | 5 | 18 | [REACT_APP_ROOT.md](./REACT_APP_ROOT.md) |
| src/features/app/StopCard.tsx | 268 | 7 | 8 | 8 | 6 | 8 | 5 | 19 | [REACT_COMPONENT_STOP_CARD.md](./REACT_COMPONENT_STOP_CARD.md) |

---

## Top Priority Refactor Targets

### React Files

#### 1. ActiveView.tsx (Score: 22) ⚠️ CRITICAL
**321 LOC, 12 hooks, complexity 8**
- Mixed concerns (data + UI + logic)
- Too many hooks in single component
- Needs container/presentational split + extract custom hooks
- See: [REACT_VIEW_ACTIVE.md](./REACT_VIEW_ACTIVE.md)

#### 2. StopCard.tsx (Score: 19) ⚠️ HIGH
**268 LOC, JSX depth 8, 10+ props**
- Too many responsibilities
- Deep nesting, type safety issues
- Split into StopCardHeader/Content/Actions components
- See: [REACT_COMPONENT_STOP_CARD.md](./REACT_COMPONENT_STOP_CARD.md)

#### 3. App.jsx (Score: 18) ⚠️ HIGH
**253 LOC, complexity 8, 6 issues**
- Central orchestration point, needs breaking down
- Extract initialization logic to custom hooks
- Remove dev-only code to separate module
- See: [REACT_APP_ROOT.md](./REACT_APP_ROOT.md)

### Netlify Functions

#### 1. consolidated-active.js (Score: 16) ⚠️ MEDIUM
**258 LOC, complexity 7**
- Complex session/config aggregation logic
- Extract query builders and data transformers
- See: [NETLIFY_FUNCTION_CONSOLIDATED_ACTIVE.md](./NETLIFY_FUNCTION_CONSOLIDATED_ACTIVE.md)

#### 2. photo-upload-complete.js (Score: 14) ⚠️ MEDIUM
**247 LOC, complexity 6**
- Mixed upload orchestration + Cloudinary + Supabase logic
- Extract service layer for external APIs
- See: [NETLIFY_FUNCTION_PHOTO_UPLOAD_COMPLETE.md](./NETLIFY_FUNCTION_PHOTO_UPLOAD_COMPLETE.md)

---

## Theme Insights

### Common Issues Across Files

#### React Components

1. **Mixed Concerns in View Components**
   - ActiveView: Data fetching + state + rendering + photo upload logic all in one
   - **Pattern:** God components doing too much
   - **Solution:** Container/Presentational pattern + custom hooks

2. **Deep Component Nesting**
   - StopCard has JSX depth of 8 levels
   - **Pattern:** Nested ternaries and conditional rendering
   - **Solution:** Extract sub-components, use early returns

3. **Prop Drilling & Type Safety**
   - Multiple components passing 8+ props down
   - Excessive use of `any` type
   - **Solution:** Context for shared state, proper TypeScript interfaces

#### Netlify Functions

1. **Monolithic Request Handlers**
   - consolidated-active: Session + teams + hunt + progress + sponsors all in one
   - photo-upload-complete: Upload + Cloudinary + Supabase + error handling mixed
   - **Pattern:** Handler doing too many things
   - **Solution:** Extract to service layer (queries, transformers, API clients)

2. **Repeated Logic Patterns**
   - Similar Supabase query patterns across functions
   - Duplicate error handling code
   - **Solution:** Shared utility modules for common operations

### Recommended Patterns

#### For React Components

1. **Container/Presentational Split**
   - Separate data fetching from rendering
   - Extract custom hooks for complex state logic
   - Example: `ActiveViewContainer` + `ActiveViewPresentation`

2. **Component Composition**
   - Break down large components into smaller pieces
   - Use composition instead of prop drilling
   - Example: `StopCardHeader` + `StopCardContent` + `StopCardActions`

3. **Type Safety First**
   - Replace all `any` with proper interfaces
   - Add strict TypeScript to catch errors early

#### For Netlify Functions

1. **Service Layer Extraction**
   - Extract Supabase queries to `services/database.js`
   - Extract Cloudinary logic to `services/cloudinary.js`
   - Keep handlers thin - just routing and response formatting

2. **Shared Utilities**
   - Create `lib/supabase-helpers.js` for common query patterns
   - Create `lib/error-handlers.js` for consistent error responses
   - Reduce code duplication across functions

---

## 3-Phase Refactor Plan

### Phase 1: React Components (Week 1-2)
**Focus:** Break down complex components, extract hooks

**Targets:**
1. **ActiveView.tsx (Score: 22)**
   - Extract `usePhotoUpload()` hook for upload logic
   - Split into Container + Presentation components
   - Extract `useStopProgress()` for progress tracking

2. **StopCard.tsx (Score: 19)**
   - Split into `StopCardHeader`, `StopCardContent`, `StopCardActions`
   - Reduce JSX depth from 8 to 4 or less
   - Add proper TypeScript interfaces

3. **App.jsx (Score: 18)**
   - Extract `useAppInitialization()` hook
   - Move dev-only logging to separate module
   - Clean up URL parsing logic

**Expected Impact:**
- 30-40% LOC reduction in these files
- Improved testability and maintainability
- Clearer separation of concerns

### Phase 2: Netlify Functions (Week 3)
**Focus:** Extract service layer, reduce duplication

**Targets:**
1. **Create Shared Services**
   - `netlify/lib/supabase-helpers.js` - Common query patterns
   - `netlify/lib/cloudinary-service.js` - Image upload/transform logic
   - `netlify/lib/error-handlers.js` - Consistent error responses

2. **Refactor Functions**
   - **consolidated-active.js** - Extract query builders
   - **photo-upload-complete.js** - Use Cloudinary service

**Expected Impact:**
- 40-50% code reduction through shared utilities
- Easier to maintain and test
- Consistent patterns across all functions

### Phase 3: Type Safety & Testing (Week 4)
**Focus:** Add types, improve test coverage

**Targets:**
1. **TypeScript Migration**
   - Convert remaining `.jsx` files to `.tsx`
   - Add proper interfaces for all props
   - Replace all `any` types

2. **Test Coverage**
   - Unit tests for extracted hooks
   - Integration tests for critical flows
   - Snapshot tests for refactored components

**Expected Impact:**
- 100% TypeScript coverage
- 80%+ test coverage
- Catch bugs at compile time

---

## Risk & Mitigation Strategy

### High-Risk Files
1. **ActiveView.tsx** — Core photo upload flow
2. **App.jsx** — Central orchestration, routing, initialization
3. **consolidated-active.js** — Primary data endpoint

**Mitigation:**
- Write comprehensive tests BEFORE refactoring
- Use feature flags for gradual rollout
- Keep old code alongside new during transition
- Extra QA on photo upload and team selection flows

### Medium-Risk Files
- **StopCard.tsx** — Photo upload UI
- **photo-upload-complete.js** — Upload orchestration

**Mitigation:**
- Snapshot tests for UI components
- Integration tests for upload flow
- Deploy to staging first, monitor for 24hrs

### Testing Strategy
1. **Before refactoring:** Establish baseline (current behavior)
2. **During refactoring:** Test-driven - write tests first
3. **After refactoring:** Visual regression + E2E tests
4. **Integration tests:** Photo upload, team selection, leaderboard display

---

## Success Metrics

### Code Quality Targets
- **30-40% LOC reduction** in flagged files
- **Max complexity ≤ 5** (currently 8-10)
- **JSX depth ≤ 4** (currently up to 8)
- **100% TypeScript** (no .jsx files)

### Performance Targets
- **Lighthouse score:** +10 points
- **Bundle size:** -15% (code splitting)
- **Initial load:** -20% faster

### Developer Experience
- **Test coverage:** 80%+
- **PR size:** 30% smaller (better component isolation)
- **Type safety:** Catch bugs at compile time

---

## Quick Reference

### Files to Refactor
- [REACT_VIEW_ACTIVE.md](./REACT_VIEW_ACTIVE.md) - ActiveView.tsx (Score: 22)
- [REACT_COMPONENT_STOP_CARD.md](./REACT_COMPONENT_STOP_CARD.md) - StopCard.tsx (Score: 19)
- [REACT_APP_ROOT.md](./REACT_APP_ROOT.md) - App.jsx (Score: 18)
- [NETLIFY_FUNCTION_CONSOLIDATED_ACTIVE.md](./NETLIFY_FUNCTION_CONSOLIDATED_ACTIVE.md) - consolidated-active.js (Score: 16)
- [NETLIFY_FUNCTION_PHOTO_UPLOAD_COMPLETE.md](./NETLIFY_FUNCTION_PHOTO_UPLOAD_COMPLETE.md) - photo-upload-complete.js (Score: 14)
- [NETLIFY-FUNCTIONS-INDEX.md](./NETLIFY-FUNCTIONS-INDEX.md) - All Netlify functions overview

---

**Generated:** 2025-09-30
**Tool:** Claude Code (Sonnet 4.5)
**Prompt:** PROMPT-REACT-FILE-REFACTOR.md
