Phase 4 — Error Boundaries and Notifications

Objective
- Prevent full-app crashes and provide consistent user-visible error messages.

Changes
- Add src/components/ErrorBoundary.tsx and wrap app root.
- Add toast notifications via a lightweight provider/hook (e.g., src/features/notifications/ToastProvider.tsx + useToasts()).
- Replace alert() calls with toasts or inline banners.

Acceptance Criteria
- Uncaught errors in child components do not crash the app; display fallback UI.
- User sees non-blocking notifications for upload/collage errors.

Manual Verification
- Throw in a child component to observe boundary fallback.
- Simulate network failure and verify toasts appear.
