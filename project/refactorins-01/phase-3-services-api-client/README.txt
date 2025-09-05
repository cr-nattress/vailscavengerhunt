Phase 3 — Services Hardening and API Client

Objective
- Centralize HTTP concerns and add runtime validation for API contracts.

Changes
- Create src/services/apiClient.ts with:
  - API_BASE resolution (Express vs Netlify Functions)
  - request<T>() with JSON parsing, timeouts, retry (basic), and error mapping
- Convert services to TypeScript and consume apiClient:
  - CollageService, PhotoUploadService, DualWriteService, LocalStorageService, HybridStorageService, NetlifyStateService, StateService
- Add zod schemas in src/types/schemas.ts for request/response validation and parse responses at the boundary.

Acceptance Criteria
- Services no longer hard-code base URLs and share a consistent error strategy.
- Responses are validated with zod; descriptive errors on mismatch.

Manual Verification
- Exercise upload and collage flows; simulate bad responses to observe friendly error messages.
