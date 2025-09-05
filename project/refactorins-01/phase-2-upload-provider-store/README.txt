Phase 2 — UploadProvider and Central Store

Objective
- Replace prop drilling with an UploadProvider and introduce a small global store for app settings/session.

Changes
- Create src/features/upload/UploadContext.tsx with UploadProvider and useUploadMeta().
- Create src/store/appStore.ts (Zustand or lightweight reducer) to hold { locationName, teamName, sessionId } and actions.
- App initializes sessionId once and persists settings via DualWriteService.
- CollageUploader consumes useUploadMeta() and no longer requires location/team props.

Acceptance Criteria
- Changing settings updates store and flows into uploader context.
- Uploads succeed with server-side slug inference as a fallback.

Manual Verification
- Update team/location in settings; upload a photo; verify metadata in Cloudinary (tags/context/folder).
