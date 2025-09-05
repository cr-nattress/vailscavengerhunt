# Phase 4 — Error Boundaries and Notifications

Goal: Add an ErrorBoundary and unify user error notifications.

Instructions
1) Create src/components/ErrorBoundary.tsx:
   - Class component with componentDidCatch and getDerivedStateFromError
   - Render fallback with a retry action

2) Create src/features/notifications/ToastProvider.tsx and useToasts():
   - Context provider to enqueue/dismiss toasts
   - Simple, accessible markup; auto-dismiss with timeout

3) Replace alert() calls with toasts or inline UI in relevant components/services.

4) Wrap the app tree with <ErrorBoundary> and <ToastProvider> in main.jsx or App composition root.

Verification
- Force an error and confirm boundary captures it.
- Simulate a failing upload and confirm toast is displayed.

## Regression safeguards
- Existing flows (uploading, collage creation, settings, progress) must continue to function with ErrorBoundary wrapped.
- No blocking `alert()` usage remains; user-visible errors are routed through toasts or inline banners.
- Toasts are non-blocking, accessible, and auto-dismiss after a reasonable delay.

## Scenarios to test
1) Component render crash
   - Temporarily throw in `StopCard` render method → Boundary shows fallback; rest of app remains usable.
2) Network failure
   - Stop backend temporarily → Upload triggers an error toast with actionable message; no crash.
3) Schema mismatch
   - Simulate malformed response (Phase 3) → Toast shows validation error summary; UI remains responsive.

## Unit tests (Vitest + RTL)
- `src/components/ErrorBoundary.tsx`: verifies fallback UI on error and retry handler restores rendering.
- `src/features/notifications/ToastProvider.tsx`: enqueues, displays, and auto-dismisses toasts; asserts `role="status"` or `aria-live="polite"` for accessibility.
- Replace `alert()` calls with toasts: search codebase and ensure no alerts remain.

## Accessibility checks
- Toast container uses `aria-live="polite"` and does not trap focus.
- Fallback UI is reachable and offers a retry button with an accessible name.

## Commands
- `npm run dev` — simulate the scenarios above.
- `npm run test` — ensure new unit tests pass.
