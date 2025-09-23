# JSON Data Architecture, Flow, and APIs

This document explains how the application creates, stores, reads, and modifies JSON data. It catalogs the data types, endpoints, storage backends, and end-to-end data flow during normal app usage. It also proposes opportunities to consolidate and simplify data and alternative storage options.


## Overview

- The app is a multi-tenant scavenger hunt. All server-side data is namespaced by organization, team, and hunt.
- JSON data is persisted primarily in Netlify Blobs (production) and in an in-memory map during local development.
- Images are uploaded to Cloudinary; JSON metadata about uploads can also be saved to server storage.
- The React client uses plain `fetch` or a small `apiClient` wrapper to call `/api/*` endpoints, which are redirected to Netlify Functions in production via `netlify.toml`.


## Namespacing and Keys

- Most JSON objects are stored under hierarchical keys: `orgId/teamId/huntId/<resource>`.
- Examples:
  - Settings: `${orgId}/${teamId}/${huntId}/settings`
  - Progress: `${orgId}/${teamId}/${huntId}/progress`
  - Metadata: `${orgId}/${teamId}/${huntId}/metadata`
  - Photos (by session): `photos/${sessionId}` (stored within the current org/team/hunt context when using `ServerStorageService`)

Key context is derived on the client by path segments `/{org}/{hunt}/{team}` or explicit params, see `src/services/ServerStorageService.ts` and initializers in `src/App.jsx`.


## Core JSON Data Types

Below are the main JSON structures used throughout the app, with references to their TypeScript/Zod definitions or inferred shapes.

- **Settings** (`src/services/ServerSettingsService.ts`)
  - Shape (inferred):
    ```json
    {
      "locationName": "BHHS | Vail Valley | Vail Village | ...",
      "teamName": "string",
      "sessionId": "guid",
      "eventName": "string",
      "organizationId": "string",
      "huntId": "string",
      "lastModifiedBy": "guid",
      "lastModifiedAt": "ISO-8601"
    }
    ```
  - Stored at: `${orgId}/${teamId}/${huntId}/settings`
  - Metadata maintained at `${orgId}/${teamId}/${huntId}/metadata` tracks contributors and update counts (see `netlify/functions/settings-set.js`).

- **Progress** (`src/services/ProgressService.ts` → `ProgressData` and `StopProgress`)
  - Shape:
    ```json
    {
      "<stopId>": {
        "done": true,
        "notes": "string",
        "photo": "url|null",
        "revealedHints": 0,
        "completedAt": "ISO-8601",
        "lastModifiedBy": "guid"
      }
    }
    ```
  - Stored at: `${orgId}/${teamId}/${huntId}/progress`
  - Metadata (contributors, totals) written at `${orgId}/${teamId}/${huntId}/metadata` by `progress-set.js`.

- **Upload Metadata (client context)** (`src/types/schemas.ts` → `UploadMetaSchema`)
  - Schema:
    ```ts
    {
      dateISO: string,               // YYYY-MM-DD
      locationSlug: string,          // slug
      teamSlug?: string,             // slug
      sessionId: string,             // GUID
      eventName?: string,
      teamName?: string,
      locationName?: string,
      locationTitle?: string
    }
    ```
  - Used to tag uploads; not directly persisted by itself unless included in a saved photo record.

- **Photo Upload Response** (`src/types/schemas.ts` → `UploadResponseSchema`)
  - Schema:
    ```ts
    {
      photoUrl: string,     // Cloudinary secure_url
      publicId: string,     // Cloudinary public_id
      locationSlug: string,
      title: string,
      uploadedAt: string     // ISO-8601
    }
    ```

- **Photo Record** (`src/types/schemas.ts` → `PhotoRecordSchema`)
  - Schema extends UploadResponse with:
    ```ts
    {
      locationId: string
    }
    ```
  - Session photo collections are stored as:
    ```json
    [
      { "photoUrl": "...", "publicId": "...", "locationSlug": "...", "title": "...", "uploadedAt": "...", "locationId": "..." }
    ]
    ```
  - Stored under key `photos/<sessionId>` via `ServerStorageService` in `PhotoUploadService`.

- **KV/Generic JSON** (`src/types/schemas.ts` → `KVUpsertSchema`, `KVGetResponseSchema`, `KVListResponseSchema`)
  - Generic JSON payloads written under arbitrary keys via `/api/kv/*` endpoints.
  - Often used for session info and ad-hoc records, with simple index support (append-only sets) in Netlify Blobs.


## Storage Backends

- **Netlify Blobs** (production)
  - Stores JSON for settings, progress, metadata, and arbitrary KV entries under stores: `hunt-data` and `kv` (see `netlify.toml`).
  - Functions use `@netlify/blobs` (`getStore({ name: 'hunt-data'|'kv' })`).
  - Note: Align store names consistently across functions; avoid environment fallbacks that point to non-existent stores.

- **In-memory Map** (local development)
  - `src/server/settingsRoute.ts` demonstrates using a `Map<string, any>` for dev.

- **Cloudinary** (images)
  - Binary images are uploaded to Cloudinary via Netlify function `netlify/functions/photo-upload.js`.
  - JSON responses (publicId, secureUrl) are returned to client, and may be persisted into session photo JSON collections.


## API Endpoints (JSON)

All public client calls are made to `/api/...` and redirected to Netlify Functions in production (`netlify.toml`).

- **Settings**
  - GET `/api/settings/:orgId/:teamId/:huntId` → returns Settings JSON or 404 if not found
    - Impl: `netlify/functions/settings-get.js`
  - POST `/api/settings/:orgId/:teamId/:huntId` with body:
    ```json
    { "settings": { ... }, "sessionId": "guid", "timestamp": "ISO-8601" }
    ```
    - Impl: `netlify/functions/settings-set.js`
    - Side effect: updates `${orgId}/${teamId}/${huntId}/metadata`
  - Client service: `src/services/ServerSettingsService.ts`

- **Progress**
  - GET `/api/progress/:orgId/:teamId/:huntId` → returns `ProgressData` JSON
    - Impl: `netlify/functions/progress-get.js` (store `hunt-data`)
  - POST `/api/progress/:orgId/:teamId/:huntId` with body:
    ```json
    { "progress": { ... }, "sessionId": "guid", "timestamp": "ISO-8601" }
    ```
    - Impl: `netlify/functions/progress-set.js` (merge existing + update metadata)
  - Client service: `src/services/ProgressService.ts`

- **KV (Generic JSON)**
  - POST `/api/kv/upsert` with body:
    ```json
    { "key": "string", "value": { ... }, "indexes": [{ "key": "index:name", "member": "value" }] }
    ```
    - Impl: `netlify/functions/kv-upsert.js` (store `kv`)
  - GET `/api/kv/get/<key>` → returns raw JSON or 404
    - Impl: `netlify/functions/kv-get.js` (ensure store name matches `kv`)
  - GET `/api/kv/list?prefix=<prefix>&includeValues=true|false`
    - Impl: `netlify/functions/kv-list.js` (store `kv`)
  - Client: `src/services/ServerStorageService.ts` wraps usage with org/team/hunt prefixes.

- **Photo Upload (Cloudinary)**
  - POST `/api/photo-upload` (multipart/form-data)
    - Fields: `photo` (file), `locationTitle`, `sessionId`, `teamName?`, `locationName?`, `eventName?`
    - Response: `UploadResponse` JSON
    - Impl: `netlify/functions/photo-upload.js`
  - Client: `src/client/PhotoUploadService.ts`


## Client-Side Data Flow (User Journey)

1. **App Initialization** (`src/App.jsx`)
   - Extracts `orgId`, `teamId`, `huntId` from URL path or query params.
   - Calls `ServerSettingsService.initializeSettings(orgId, teamId, huntId, sessionId)` to fetch or create default Settings JSON server-side.
   - Optionally creates a session record in storage via `ServerStorageService.createSession()`.

2. **Settings Edit/Save**
   - UI (`src/features/app/SettingsPanel.tsx`) updates store values (location/team/event) and triggers `saveSettingsToServer()` via `ServerSettingsService.saveSettings(...)`.
   - Server persists JSON to `${orgId}/${teamId}/${huntId}/settings` and updates `${...}/metadata`.

3. **Progress Tracking** (`src/features/views/ActiveView.tsx` + `src/hooks/useProgress.ts` + `src/services/ProgressService.ts`)
   - Client loads progress via GET `/api/progress/<org>/<team>/<hunt>`.
   - As user marks stops done / uploads photos, the app updates the in-memory `progress` map.
   - A debounced save posts the full `ProgressData` as JSON to the progress endpoint. Server merges and writes to `${...}/progress` and `${...}/metadata`.

4. **Photo Uploads** (`src/client/PhotoUploadService.ts`)
   - Client sends multipart to `/api/photo-upload`.
   - Function uploads to Cloudinary and returns `UploadResponse` JSON (publicId, secureUrl, etc.).
   - Client can persist a session-scoped photo list JSON under `photos/<sessionId>` using `ServerStorageService.set()`.

5. **KV / Misc JSON** (`src/services/ServerStorageService.ts`)
   - Generic JSON can be set/get/listed with keys automatically prefixed by `org/team/hunt` context.


## End-to-End Data Flow (Mermaid)

```mermaid
flowchart TD
   A[User opens app] --> B[App parses URL/query for org/team/hunt]
   B --> C[ServerSettingsService.initializeSettings]
   C -->|GET /api/settings/:org/:team/:hunt| D[settings-get (Netlify Fn)]
   D -->|hunt-data store| E[(Netlify Blobs)]
   D --> C
   C --> F[Zustand app store seeded]

   F --> G[ActiveView mounts]
   G -->|GET /api/progress/:org/:team/:hunt| H[progress-get (Netlify Fn)]
   H -->|hunt-data store| E
   H --> G

   G --> I[User interacts -> progress changes]
   I -->|debounce| J[POST /api/progress/:org/:team/:hunt]
   J -->|progress-set merges + metadata| E

   G --> K[User uploads photo]
   K -->|multipart/form-data| L[POST /api/photo-upload]
   L -->|Cloudinary upload\nsecure_url, public_id| M[(Cloudinary)]
   L -->|JSON UploadResponse| N[Client]
   N -->|optionally| O[ServerStorageService.set photos/<sessionId>]
   O -->|kv store with org/team/hunt prefix| E

   F --> P[Generic KV operations]
   P -->|/api/kv/upsert|get|list| Q[KV Netlify Functions]
   Q -->|kv store| E
```


## Opportunities to Consolidate and Simplify Data

- **Unify Blob Stores**
  - Ensure all KV-related functions use the same store name (`kv`) and all team/hunt data uses `hunt-data`. Remove env fallbacks like `'vail-hunt-state'` to avoid drift.

- **Single Metadata Object**
  - Both settings and progress functions write to `${...}/metadata`. Consider a single, well-defined metadata document with typed fields and a shared updater utility.

- **Normalize Settings**
  - Settings currently duplicate path params (orgId, huntId, teamName). Consider treating these as context rather than properties to reduce redundancy.

- **Photo Records Storage**
  - Today, photo metadata is optional in server storage and mainly lives in Cloudinary. If server-side analytics or galleries are planned, store a canonical photo record under `${orgId}/${teamId}/${huntId}/photos/<sessionId>` or under `${...}/photos/index` keyed by stopId.

- **Consistent Schemas (Zod)**
  - Expand `src/types/schemas.ts` to include Settings and Progress schemas for runtime validation on both client and server.


## Proposed Data Consolidation Plan (with examples)

- **Unify stores and keys**
  - Make all "team/hunt scoped" JSON live under the `hunt-data` store and all generic KV under `kv`.
  - Remove environment fallbacks that point to undeclared stores to avoid drift.

- **Define canonical schemas (Zod) for server-validated JSON**
  - Add server-validated schemas for Settings and Progress to `src/types/schemas.ts` and use them in both client services and Netlify Functions.
  - Example:
    ```ts
    // Settings (server-validated)
    export const SettingsSchema = z.object({
      locationName: z.string().min(1),
      teamName: z.string().min(1),
      sessionId: GuidSchema,
      eventName: z.string().optional(),
      // Context fields may be omitted if inferred from key
      organizationId: z.string().optional(),
      huntId: z.string().optional(),
      lastModifiedBy: GuidSchema.optional(),
      lastModifiedAt: DateISOSchema.optional(),
    })

    // Progress (server-validated)
    export const StopProgressSchema = z.object({
      done: z.boolean(),
      notes: z.string().optional(),
      photo: z.string().url().nullable().optional(),
      revealedHints: z.number().int().nonnegative().optional(),
      completedAt: DateISOSchema.optional(),
      lastModifiedBy: GuidSchema.optional(),
    })

    export const ProgressDataSchema = z.record(StopProgressSchema)
    ```

- **Single metadata document**
  - Instead of each function ad-hoc updating `${...}/metadata`, create a single schema and a helper to update it.
  - Example structure stored at `${orgId}/${teamId}/${huntId}/metadata`:
    ```json
    {
      "contributors": [
        { "sessionId": "guid", "firstActive": "ISO", "lastActive": "ISO" }
      ],
      "lastModifiedBy": "guid",
      "lastModifiedAt": "ISO-8601",
      "settingsUpdateCount": 12,
      "progressUpdateCount": 57
    }
    ```
  - Provide a small module (e.g., `server/metadata.ts`) to increment typed counters and update contributor timestamps.

- **Canonical photo records**
  - Store a canonical list of uploaded photos per team/hunt under `${orgId}/${teamId}/${huntId}/photos/<sessionId>` (or a team-level aggregate index).
  - Example array item (align with `PhotoRecordSchema`):
    ```json
    {
      "photoUrl": "https://...",
      "publicId": "<cloudinary_public_id>",
      "locationSlug": "bridge-to-vail",
      "title": "Bridge to Vail",
      "uploadedAt": "2025-09-18T02:04:05Z",
      "locationId": "stop-bridge"
    }
    ```

- **Context-as-key, not payload**
  - Prefer omitting `organizationId`/`huntId` in payload bodies and derive them from the storage key/path to avoid duplication.

- **Indexing strategy**
  - For KV searchability, standardize indexes via `kv-upsert` with append-only sets:
    - Examples: `index:sessions`, `index:photos:<org>/<hunt>/<team>`, `index:progress-updates`.

- **Optional relational mirror (Supabase/Neon)**
  - If analytics or reporting grows, mirror JSON writes into structured tables:
    - `teams(org_id, team_id, hunt_id, name)`
    - `progress(org_id, team_id, hunt_id, stop_id, done, completed_at, last_modified_by, notes)`
    - `photos(org_id, team_id, hunt_id, session_id, stop_id, public_id, url, uploaded_at)`
  - Keep Cloudinary for media; store references and metadata relationally.


## Patch: Fix `kv-get.js` store mismatch (detailed)

- **Problem**
  - `netlify/functions/kv-get.js` currently uses:
    ```js
    const store = getStore({
      name: process.env.NETLIFY_BLOBS_STORE_NAME || 'vail-hunt-state',
      siteID: context.site.id
    })
    ```
  - Other KV functions (`kv-upsert.js`, `kv-list.js`) use the declared `[[blobs]] name = "kv"` from `netlify.toml`.
  - Result: writes go to `kv`, but reads may go to a non-existent `vail-hunt-state` store, causing intermittent 404/500.

- **Recommended fix (code change)**
  - Replace the `getStore(...)` call to explicitly use the `kv` store name:
    ```js
    import { getStore } from '@netlify/blobs'

    export default async (req, context) => {
      // ...
      const store = getStore({ name: 'kv' })
      const value = await store.get(key)
      // ...
    }
    ```
  - This aligns reads/writes against the same configured store.

- **Alternative (environment-based)**
  - If you prefer indirection via env vars, set in Netlify site settings:
    - `NETLIFY_BLOBS_STORE_NAME=kv`
  - And keep `getStore({ name: process.env.NETLIFY_BLOBS_STORE_NAME })` (remove the fallback to `'vail-hunt-state'`).
  - Caveat: ensure every environment sets the variable; explicit code is safer.

- **Testing the patch**
  - After deploying the change:
    1. POST `/api/kv/upsert` with `{ key: "diag/test", value: { hello: "world" } }`.
    2. GET `/api/kv/get/diag/test` → should return the JSON.
    3. GET `/api/kv/list?prefix=diag/` → should list `diag/test`.
  - Confirm no errors in Netlify function logs.

- **Why this matters**
  - Ensures data consistency and eliminates confusing intermittent failures where only some functions can see the data.


## Migration Checklist (to consolidated model)

- [ ] **Align blob stores**
  - Ensure all KV reads/writes use `getStore({ name: 'kv' })`.
  - Ensure progress/settings use `getStore({ name: 'hunt-data' })`.
- [ ] **Adopt canonical schemas**
  - Implement `SettingsSchema`, `StopProgressSchema`, `ProgressDataSchema` in `src/types/schemas.ts`.
  - Validate client payloads/responses with `validateSchema(...)`.
- [ ] **Validate on server**
  - In `netlify/functions/progress-set.js`, validate incoming `progress` (added).
  - Mirror for settings in `settings-set.js` (add SettingsSchema equivalent inline with zod).
- [ ] **Single metadata document**
  - Create `server/metadata.ts` helper (or inline) to update `${...}/metadata` consistently with typed counters and contributors.
- [ ] **Canonical photo records**
  - Persist session photo arrays to `${org}/${team}/${hunt}/photos/<sessionId>` after successful upload.
  - Add index `index:photos:<org>/<hunt>/<team>` via `/api/kv/upsert` for discoverability.
- [ ] **Context-as-key**
  - Remove redundant `organizationId`/`huntId` from payloads where path already implies context.
- [ ] **Diagnostics**
  - Add/verify `/api/health` and a `/diagnostics` page to exercise settings/progress/kv/photo endpoints post-deploy.
- [ ] **Optional relational mirror**
  - Stand up Supabase/Neon and mirror writes for analytics/reporting (tables listed above).


## Alternative Storage Options

- **Azure Storage (Blob + Table/Cosmos)**
  - Pros: Enterprise features, RBAC, regional controls.
{{ ... }}

- **Supabase (Postgres + Storage)**
  - Pros: Relational schemas for teams, hunts, progress; row-level security; Realtime.
  - Use Cases: Normalize data into tables (teams, hunts, stops, progress), store images in Supabase Storage or continue Cloudinary.

- **Neon (Serverless Postgres)**
  - Pros: Managed Postgres with branching; great for structured data.
  - Use Cases: Store progress and settings as rows; use JSONB for flexible fields.

- **Netlify Blobs (Current)**
  - Pros: Simple, serverless, low-friction.
  - Cons: Limited querying and indexing; eventually consistency in complex indexing scenarios.

A hybrid approach is viable: keep simple JSON in Blobs for rapid iteration, move high-value/analytics-heavy data into a relational store as needs grow.


## Appendix: Key Code References

- **Client Services**
  - Settings: `src/services/ServerSettingsService.ts`
  - Progress: `src/services/ProgressService.ts`
  - Generic KV/Context: `src/services/ServerStorageService.ts`
  - Photo Uploads: `src/client/PhotoUploadService.ts`
  - API Client Base URL Resolution: `src/services/apiClient.ts`

- **Server/Functions**
  - Settings: `netlify/functions/settings-get.js`, `netlify/functions/settings-set.js`
  - Progress: `netlify/functions/progress-get.js`, `netlify/functions/progress-set.js`
  - KV: `netlify/functions/kv-upsert.js`, `netlify/functions/kv-get.js`, `netlify/functions/kv-list.js`
  - Photo Upload: `netlify/functions/photo-upload.js`
  - Local Dev Express Router (for settings): `src/server/settingsRoute.ts`

- **Schemas/Types**
  - Zod schemas and types: `src/types/schemas.ts`


## Verification Checklist

- **Settings**: GET/POST responds with valid JSON and updates metadata.
- **Progress**: GET returns a map of stops; POST merges and persists.
- **KV**: Upsert/Get/List works against the intended blob store.
- **Photos**: Upload returns Cloudinary `publicId` and `secureUrl`; optional JSON records saved for session if needed.
- **Routing**: `/api/*` endpoints reach Netlify Functions (not SPA fallback).
