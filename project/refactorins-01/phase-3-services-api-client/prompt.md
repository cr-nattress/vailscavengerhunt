# Phase 3 — Services API Client and Validation

Goal: Introduce a central apiClient and type-safe, validated services.

Instructions
1) Create src/services/apiClient.ts:
   - Resolve API_BASE:
     - If window.location.port === '8888' → '/.netlify/functions'
     - Else prefer import.meta.env.VITE_API_URL (typed via vite-env) or fallback to 'http://localhost:3001/api'
   - Implement request<T>(path, init?, opts?) that:
     - Applies base URL
     - Adds JSON headers when body is object
     - Handles timeouts (AbortController) and optional retry
     - Parses JSON and throws on !response.ok with structured Error
   - Provide a helper for multipart uploads (e.g., requestFormData<T>(path, FormData, opts?)) that:
     - Does not force JSON headers
     - Preserves FormData boundary
     - Reuses timeout/retry/error handling

2) Create src/types/schemas.ts with zod schemas:
   - UploadMetaSchema (include teamName, locationName, eventName as optional)
   - UploadResponseSchema
   - CollageFromIdsResponseSchema
   - KVUpsertSchema

3) Update client services to TS and to use apiClient + schemas:
   - CollageService: createCollage, createCollageFromIds
   - PhotoUploadService: uploadSingle (multipart)
     - Include optional metadata fields: teamName, locationName, eventName in FormData
     - Use apiClient multipart helper (or a narrowly scoped fetch wrapper) for uploads
   - DualWriteService, LocalStorageService, HybridStorageService, NetlifyStateService, StateService: align types and use apiClient

4) Remove hard-coded API_BASE from CollageService and others; rely on apiClient.

Verification
- Build succeeds, flows still work. Intentionally mock an incorrect response to verify schema errors are clear.

## Test matrix (apiClient + services)
- Success 200 + valid JSON → returns typed data.
- 4xx with JSON body `{ error }` → throws structured error with status and message.
- 5xx with non-JSON body (HTML) → throws network/server error with fallback message.
- Timeout (AbortController) → throws AbortError and no pending operations remain.
- Schema mismatch (200 but missing required fields) → zod parse error with field paths.

## Unit tests (Vitest)
- `src/services/apiClient.ts`: happy path; 4xx; 5xx non-JSON; timeout; schema mismatch consumer.
- `src/client/CollageService.ts`: `createCollageFromIds` success and 400 error.
- `src/client/PhotoUploadService.ts`: `uploadSingle` builds correct multipart payload including optional team/location/event; maps errors.
- Storage services (DualWrite/Hybrid/Local/NetlifyState/State): basic method contracts still work.

## Manual verification checklist
1) Upload a photo and confirm the request path uses resolved `API_BASE` for the current environment (dev server vs netlify dev) and includes metadata fields when present.
2) Turn off the server temporarily to simulate failure → UI shows consistent error (Phase 4 toasts if implemented) and no crashes.
3) Temporarily instrument server to omit a required response field → client surfaces schema validation error cleanly.

## Commands
- `npm run test` — ensure unit tests pass.
- `npm run dev` — perform manual checks above.
