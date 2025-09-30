# Architecture Documentation

> **Last Updated**: 2025-09-29  
> **Version**: 1.0.0

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Feature Organization](#feature-organization)
4. [State Management Strategy](#state-management-strategy)
5. [Data Flow Patterns](#data-flow-patterns)
6. [Naming Conventions](#naming-conventions)
7. [Global Rules](#global-rules)
8. [Key Entry Points](#key-entry-points)
9. [Extension Points](#extension-points)

---

## Overview

Vail Scavenger Hunt is a **team-based progressive web application** built with React, TypeScript, and Netlify serverless functions. The architecture follows a **feature-first organization** with clear separation between client and server concerns.

### Core Principles

- **Feature-First Structure**: Code organized by feature domain, not technical layer
- **Type Safety**: Comprehensive TypeScript coverage with Zod runtime validation
- **Server-First Data**: Supabase PostgreSQL as source of truth; client state is ephemeral
- **Consolidated APIs**: Single-request data fetching to minimize network overhead
- **Progressive Enhancement**: Works offline with degraded functionality

### Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | UI components and client logic |
| **Build** | Vite 5 | Fast dev server and optimized production builds |
| **State** | Zustand | Lightweight global state management |
| **Data Fetching** | SWR + TanStack Query | Caching, revalidation, optimistic updates |
| **Backend** | Netlify Functions (Node.js) | Serverless API handlers |
| **Database** | Supabase (PostgreSQL) | Persistent storage with RLS |
| **Storage** | Cloudinary | Image uploads and CDN delivery |
| **Monitoring** | Sentry | Error tracking and performance monitoring |

---

## System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   React    │  │  Zustand   │  │    SWR     │            │
│  │ Components │◄─┤   Stores   │◄─┤   Hooks    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                         │                                    │
│                         ▼                                    │
│                  ┌─────────────┐                            │
│                  │  apiClient  │ (HTTP wrapper)             │
│                  └─────────────┘                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   NETLIFY FUNCTIONS                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ consolidated │  │ team-verify  │  │ photo-upload │      │
│  │   -active    │  │              │  │  -complete   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                           │                                  │
│                           ▼                                  │
│                  ┌─────────────────┐                        │
│                  │ Supabase Client │                        │
│                  └─────────────────┘                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ PostgreSQL Protocol
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  teams   │  │ progress │  │  hunts   │  │ sponsors │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow Example: Photo Upload

```
1. User selects photo in StopCard component
2. usePhotoUpload hook calls PhotoUploadService
3. PhotoUploadService uses apiClient.postFormData()
4. apiClient sends multipart/form-data to /api/photo-upload-complete
5. Netlify Function validates request, uploads to Cloudinary
6. Function updates hunt_progress table in Supabase
7. Function returns { photoUrl, progress } to client
8. SWR revalidates cached data, UI updates automatically
```

---

## Feature Organization

### Directory Structure

```
src/
├── features/              # Feature-specific modules (primary organization)
│   ├── app/              # Core app UI (Header, StopCard, Settings)
│   ├── views/            # Top-level views (Active, Leaderboard, History)
│   ├── navigation/       # Bottom navigation and routing
│   ├── teamLock/         # Team verification and auth
│   ├── sponsors/         # Sponsor card display
│   ├── upload/           # Photo upload context
│   └── notifications/    # Toast notification system
├── components/           # Shared/reusable UI components
├── hooks/                # Custom React hooks (cross-feature)
├── services/             # API clients and business logic
├── store/                # Zustand stores (appStore, uiStore)
├── types/                # TypeScript type definitions
├── utils/                # Pure utility functions
├── logging/              # Logging infrastructure (Sentry, console)
└── env.ts                # Environment variable validation (Zod)

netlify/functions/        # Serverless API handlers
├── _lib/                 # Shared function utilities
├── consolidated-*.js     # Data aggregation endpoints
├── team-*.js             # Team management endpoints
├── photo-*.js            # Photo upload endpoints
└── progress-*.js         # Progress tracking endpoints
```

### Feature Folder Convention

Each feature folder should contain:
- **Components**: Feature-specific React components
- **Hooks**: Feature-specific custom hooks
- **Types**: Feature-specific TypeScript interfaces
- **README.md**: Feature documentation (purpose, entry points, data flow)

---

## State Management Strategy

### State Layers

| Layer | Technology | Scope | Persistence |
|-------|-----------|-------|-------------|
| **Server State** | Supabase | Global (all teams) | Persistent (PostgreSQL) |
| **Client Cache** | SWR / TanStack Query | Per-session | Memory (revalidated) |
| **Global UI State** | Zustand (appStore) | App-wide | Memory (ephemeral) |
| **Local UI State** | Zustand (uiStore) | UI interactions | Memory (ephemeral) |
| **Component State** | React useState | Component-scoped | Memory (unmount clears) |

### State Flow Principles

1. **Server is Source of Truth**: All persistent data lives in Supabase
2. **Optimistic Updates**: UI updates immediately, reverts on server error
3. **Cache Invalidation**: SWR revalidates on focus, network reconnect, manual trigger
4. **No Local Persistence**: No localStorage for critical data (prevents sync issues)

### Zustand Stores

#### appStore (`src/store/appStore.ts`)
- **Purpose**: Team identity, hunt configuration, settings
- **Key State**: `teamId`, `huntId`, `organizationId`, `teamName`, `locationName`, `eventName`
- **Actions**: `setTeamId()`, `initializeSettings()`, `saveSettingsToServer()`

#### uiStore (`src/store/uiStore.ts`)
- **Purpose**: UI-only state (expanded accordions, loading states, tips visibility)
- **Key State**: `expandedStops`, `transitioningStops`, `showTips`
- **Actions**: `toggleStopExpanded()`, `setTransitioning()`, `setShowTips()`

---

## Data Flow Patterns

### Pattern 1: Consolidated Data Fetching

**Use Case**: Loading all data for a view in a single request

```typescript
// ✅ GOOD: Single consolidated request
const { data, isLoading } = useActiveData(orgId, teamId, huntId)
// Returns: { stops, progress, settings, sponsors }

// ❌ BAD: Multiple sequential requests (waterfall)
const stops = useHuntStops(huntId)
const progress = useProgress(teamId)
const settings = useSettings(teamId)
```

**Implementation**: See `src/hooks/useActiveData.ts` → calls `/api/consolidated/active`

### Pattern 2: Optimistic Updates

**Use Case**: Immediate UI feedback for user actions

```typescript
// 1. Update local state immediately
setProgress(prev => ({ ...prev, [stopId]: { done: true } }))

// 2. Send request to server
await apiClient.post('/api/progress', { locationId: stopId, done: true })

// 3. Revalidate cache (SWR handles this automatically)
mutate('/api/consolidated/active')
```

### Pattern 3: Atomic Operations

**Use Case**: Photo upload + progress update must succeed or fail together

```typescript
// ✅ GOOD: Single atomic endpoint
POST /api/photo-upload-complete
// Uploads photo AND updates progress in one transaction

// ❌ BAD: Separate requests (can leave inconsistent state)
POST /api/photo-upload
POST /api/progress
```

---

## Naming Conventions

### Files and Directories

| Type | Convention | Example |
|------|-----------|---------|
| **React Components** | PascalCase.tsx | `StopCard.tsx`, `AlbumViewer.tsx` |
| **Hooks** | camelCase.ts (use prefix) | `usePhotoUpload.ts`, `useActiveData.ts` |
| **Services** | PascalCase.ts (Service suffix) | `TeamService.ts`, `LoginService.ts` |
| **Utilities** | camelCase.ts | `image.ts`, `validation.ts` |
| **Types** | camelCase.ts | `schemas.ts`, `hunt-system.ts` |
| **Stores** | camelCase.ts (Store suffix) | `appStore.ts`, `uiStore.ts` |
| **Netlify Functions** | kebab-case.js | `team-verify.js`, `photo-upload-complete.js` |

### Variables and Functions

| Type | Convention | Example |
|------|-----------|---------|
| **React Components** | PascalCase | `function StopCard() {}` |
| **Hooks** | camelCase (use prefix) | `function usePhotoUpload() {}` |
| **Functions** | camelCase | `function uploadPhoto() {}` |
| **Constants** | UPPER_SNAKE_CASE | `const MAX_FILE_SIZE = 10485760` |
| **Interfaces** | PascalCase (no I prefix) | `interface StopCardProps {}` |
| **Types** | PascalCase | `type ProgressState = {}` |

### API Endpoints

| Pattern | Example | Purpose |
|---------|---------|---------|
| **Consolidated** | `/api/consolidated/active` | Multi-resource fetch |
| **Resource** | `/api/progress/:orgId/:teamId/:huntId` | CRUD operations |
| **Action** | `/api/team-verify` | Specific action |

---

## Global Rules

### Rule 1: All HTTP Calls Must Use apiClient

**Rationale**: Centralized error handling, timeouts, retries, Sentry breadcrumbs

```typescript
// ✅ GOOD
import { apiClient } from '../services/apiClient'
const data = await apiClient.get('/api/team-current')

// ❌ BAD
const response = await fetch('/api/team-current')
```

**Location**: `src/services/apiClient.ts`

### Rule 2: Never Access process.env or import.meta.env Directly

**Rationale**: Type safety, validation, fail-fast on misconfiguration

```typescript
// ✅ GOOD
import { SUPABASE_URL, ENABLE_SENTRY } from '../env'

// ❌ BAD
const url = process.env.SUPABASE_URL
const enabled = import.meta.env.VITE_ENABLE_SENTRY === 'true'
```

**Location**: `src/env.ts`

### Rule 3: Validate All External Data with Zod

**Rationale**: Runtime type safety, clear error messages, prevents data corruption

```typescript
// ✅ GOOD
const validated = UploadResponseSchema.parse(apiResponse)

// ❌ BAD
const photoUrl = apiResponse.photoUrl as string
```

**Location**: `src/types/schemas.ts`

### Rule 4: Server-Only Code Must Not Import Client Code

**Rationale**: Prevents bundling server secrets into client, reduces bundle size

```typescript
// ✅ GOOD (in Netlify Function)
const { createClient } = require('@supabase/supabase-js')

// ❌ BAD (in Netlify Function)
import { useAppStore } from '../../src/store/appStore'
```

### Rule 5: Feature Flags Must Include Expiry Date

**Rationale**: Prevents technical debt accumulation, documents removal timeline

```typescript
// ✅ GOOD
// FEATURE_FLAG: enableNewCheckoutFlow
// Purpose: Gradual rollout of redesigned checkout
// Expires: 2025-11-01 (remove after 100% adoption)
if (enableNewCheckoutFlow) { /* ... */ }

// ❌ BAD
if (enableNewCheckoutFlow) { /* ... */ }
```

### Rule 6: All Errors Must Be Logged with Context

**Rationale**: Debuggability, Sentry integration, production troubleshooting

```typescript
// ✅ GOOD
try {
  await uploadPhoto(file)
} catch (error) {
  logger.error('Photo upload failed', { stopId, fileSize, error })
  // Expected: network timeout → show retry button
  // Unexpected: Cloudinary quota exceeded → log to Sentry
}

// ❌ BAD
try {
  await uploadPhoto(file)
} catch (error) {
  console.log(error)
}
```

---

## Key Entry Points

### Client Entry Points

| File | Purpose | Loads |
|------|---------|-------|
| `src/main.jsx` | React app bootstrap | Mounts `<App />`, initializes Sentry |
| `src/App.jsx` | Root component | Routing, auth wrapper, global providers |
| `src/features/teamLock/TeamLockWrapper.tsx` | Auth gate | Blocks app until team verified |
| `src/features/views/ActiveView.tsx` | Main hunt interface | Stops, progress, photo upload |

### Server Entry Points

| File | Purpose | Dependencies |
|------|---------|--------------|
| `netlify/functions/team-verify.js` | Team authentication | Supabase, JWT generation |
| `netlify/functions/consolidated-active.js` | Active hunt data | Supabase (4 queries) |
| `netlify/functions/photo-upload-complete.js` | Atomic photo upload | Cloudinary, Supabase |

### Configuration Entry Points

| File | Purpose | Validated By |
|------|---------|--------------|
| `src/env.ts` | Environment variables | Zod schemas |
| `vite.config.js` | Build configuration | Vite |
| `netlify.toml` | Deployment configuration | Netlify |

---

## Extension Points

### Adding a New Feature

1. **Create feature folder**: `src/features/my-feature/`
2. **Add README.md**: Document purpose, entry points, data flow
3. **Create components**: `MyFeature.tsx`, `MyFeatureCard.tsx`
4. **Create hook (if needed)**: `useMyFeature.ts`
5. **Add to navigation**: Update `src/features/navigation/BottomNavigation.tsx`
6. **Add tests**: `__tests__/MyFeature.test.tsx`

**Annotate with**:
```typescript
/**
 * @extension-point: Safe to add new features here
 * Follow pattern: feature folder → README → components → hook → tests
 */
```

### Adding a New API Endpoint

1. **Create function**: `netlify/functions/my-endpoint.js`
2. **Add JSDoc contract**:
   ```javascript
   /**
    * POST /api/my-endpoint
    * Request:  { field: string }
    * Response: { result: string }
    * Errors:   400 validation; 401 auth; 5xx unexpected
    * Side effects: revalidateTag('my-data')
    */
   ```
3. **Add Zod schema**: `src/types/schemas.ts`
4. **Create service**: `src/services/MyService.ts`
5. **Add tests**: `netlify/functions/__tests__/my-endpoint.test.js`

### Adding a New Database Table

1. **Create migration**: `scripts/sql/add-my-table.sql`
2. **Add RLS policies**: Ensure row-level security
3. **Update types**: `src/types/supabase.ts`
4. **Add Zod schema**: `src/types/schemas.ts`
5. **Document in README**: Update database schema section

---

## Design Decisions

### Why Netlify Functions Instead of Next.js API Routes?

- **Rationale**: Vite build speed, simpler deployment, no SSR complexity
- **Trade-off**: No server-side rendering (acceptable for PWA use case)

### Why Zustand Instead of Redux?

- **Rationale**: Minimal boilerplate, TypeScript-first, no Provider hell
- **Trade-off**: Less ecosystem tooling (acceptable for app size)

### Why SWR and TanStack Query Together?

- **Rationale**: SWR for simple fetching, TanStack Query for complex mutations
- **Trade-off**: Two libraries to learn (acceptable for flexibility)

### Why Supabase Instead of Firebase?

- **Rationale**: PostgreSQL (relational), better RLS, no vendor lock-in
- **Trade-off**: More manual setup (acceptable for control)

---

## Related Documentation

- **[README.md](../README.md)**: Getting started, installation, deployment
- **[DOCUMENTATION.md](../knowledge/DOCUMENTATION.md)**: Documentation guidelines
- **[Supabase Setup](./SUPABASE_SETUP_INSTRUCTIONS.md)**: Database initialization
- **[Sponsors Configuration](./sponsors-configuration.md)**: Sponsor system guide
- **[Sentry Troubleshooting](./sentry-troubleshooting.md)**: Error tracking setup

---

## Maintenance Notes

### When to Update This Document

- ✅ Adding a new feature folder
- ✅ Changing state management strategy
- ✅ Adding a global rule or convention
- ✅ Major architectural refactor
- ❌ Minor bug fixes
- ❌ Styling changes
- ❌ Adding individual components

### Document Ownership

- **Primary Maintainer**: Tech Lead
- **Review Cadence**: Quarterly or after major releases
- **Approval Required**: Yes (for architectural changes)

---

**End of Architecture Documentation**
