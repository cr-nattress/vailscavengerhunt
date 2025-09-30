# Sentry to Rollbar Migration Analysis

**Date**: 2025-09-30
**Status**: Research Complete - Implementation NOT Started
**Complexity**: **HARD (7/10)**
**Estimated Effort**: **18-29 hours (3-4 days)**
**Risk Level**: **MEDIUM-HIGH**

---

## Executive Summary

This document analyzes the complexity and requirements for migrating from Sentry.io to Rollbar for error tracking and monitoring. The analysis reveals a **deeply integrated** Sentry implementation across **47+ files** including client-side React code, server-side Node.js code, and 25+ Netlify serverless functions.

### Key Findings

| Metric | Value |
|--------|-------|
| **Files Affected** | 47+ files |
| **Sentry Packages** | 4 (browser, React, Node, Vite plugin) |
| **Netlify Functions** | 25+ functions using Sentry wrapper |
| **Environment Variables** | 7+ to update |
| **Estimated Time** | 18-29 hours |
| **Complexity** | Hard (7/10) |
| **Risk** | Medium-High |

### Critical Gaps with Rollbar

⚠️ **You will LOSE these Sentry features:**
- Performance monitoring (transactions/spans/traces)
- Automatic HTTP/fetch instrumentation
- Official Vite plugin for source maps
- Automatic release tracking

---

## 1. Current Sentry Implementation

### 1.1 Package Dependencies

**Client-side (root `package.json`):**
```json
{
  "@sentry/browser": "^10.15.0",
  "@sentry/react": "^10.15.0",
  "@sentry/vite-plugin": "^4.3.0",
  "@sentry/node": "^10.15.0"
}
```

**Server-side (`netlify/functions/package.json`):**
```json
{
  "@sentry/node": "^10.15.0"
}
```

### 1.2 Environment Variables

```bash
# Client-side (Vite)
VITE_SENTRY_DSN=<dsn>
VITE_SENTRY_ENVIRONMENT=development|production
VITE_SENTRY_RELEASE=<version>
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1-1.0

# Server-side
SENTRY_DSN=<dsn>
SENTRY_ENVIRONMENT=development|production
SENTRY_RELEASE=<version>
SENTRY_TRACES_SAMPLE_RATE=0.1-1.0

# Build-time (source maps)
SENTRY_AUTH_TOKEN=<token>
SENTRY_ORG=<org-slug>
SENTRY_PROJECT=<project-slug>
```

### 1.3 Files Using Sentry (47+ files)

**Core Infrastructure (14 files):**
1. `src/logging/initSentryClient.ts` - Browser initialization
2. `src/logging/initSentryNode.ts` - Node.js initialization
3. `netlify/functions/_lib/sentry.js` - Serverless wrapper
4. `src/logging/sinks/SentryBrowserSink.ts` - Browser sink
5. `src/logging/sinks/SentryNodeSink.ts` - Node.js sink
6. `src/logging/config.ts` - Configuration
7. `src/logging/monitoring.ts` - Metrics & monitoring
8. `src/logging/sentryBreadcrumbUtils.ts` - Breadcrumbs
9. `src/logging/factories/clientLoggerFactory.ts` - Client factory
10. `src/logging/factories/serverLoggerFactory.ts` - Server factory
11. `src/main.jsx` - App entry point
12. `src/App.jsx` - Root component
13. `vite.config.js` - Build configuration
14. `src/utils/globalErrorHandler.js` - Error handlers

**Integration Points (6 files):**
1. `src/components/ErrorBoundary.tsx` - React error boundary
2. `src/components/SentryTestComponent.jsx` - Testing
3. `src/services/apiClient.ts` - API wrapper
4. `src/services/LoginService.ts` - Login service
5. `src/services/ConsolidatedDataService.ts` - Data service
6. `src/logging/client.ts` - Client exports
7. `src/logging/server.ts` - Server exports

**Netlify Functions (25+ files):**
All use `withSentry()` wrapper from `_lib/sentry.js`:
- consolidated-active.js
- consolidated-history.js
- consolidated-rankings.js
- consolidated-updates.js
- health.js
- kv-get-supabase.js
- kv-list.js
- kv-upsert-supabase.js
- leaderboard-get-supabase.js
- leaderboard-get-supabase-v2.js
- login-initialize.js
- photo-upload.js
- photo-upload-complete.js
- photo-upload-orchestrated.js
- progress-get-supabase.js
- progress-patch-supabase.js
- progress-set-supabase.js
- settings-get-supabase.js
- settings-set-supabase.js
- sponsors-get.js
- team-current.js
- team-setup.js
- team-verify.js
- test-supabase.js
- write-log.js

**Documentation (4 files):**
1. `knowledge/SENTRY_IO.md`
2. `knowledge/SENTRY_SETUP.md`
3. `docs/sentry-troubleshooting.md`
4. `docs/sentry-always-enabled.md`

### 1.4 Sentry Features Currently Used

✅ **Core Error Tracking:**
- Exception capture (`captureException()`)
- Message capture (`captureMessage()`)
- Error boundaries (React)
- Global error handlers
- Network error tracking

✅ **Context & Metadata:**
- User context (`setUser()`)
- Tags (`setTags()`, `setTag()`)
- Breadcrumbs (`addBreadcrumb()`)
- Custom contexts
- Request/response metadata

✅ **Performance Monitoring:**
- Transaction tracking (`startTransaction()`)
- Span tracking (`startChild()`)
- Traces sample rate
- Performance timing

✅ **Integrations:**
- React integration
- Browser tracing
- Session replay
- HTTP instrumentation (Node.js)
- Fetch instrumentation

✅ **Build & Release:**
- Source map uploads (Vite plugin)
- Release tracking
- Environment tracking
- Debug ID injection

---

## 2. Rollbar Feature Parity Analysis

### 2.1 Feature Comparison Matrix

| Feature | Sentry | Rollbar | Migration Impact |
|---------|--------|---------|------------------|
| **Error Tracking** | ✅ | ✅ | ✅ Direct equivalent |
| Exception capture | `captureException()` | `Rollbar.error()` | Simple API change |
| Message capture | `captureMessage()` | `Rollbar.info/warn()` | Different log levels |
| Error boundaries | @sentry/react | rollbar-react | Package swap |
| User context | `setUser()` | `configure({payload.person})` | Different structure |
| Tags/metadata | `setTags()` | Custom data fields | Less structured |
| Breadcrumbs | `addBreadcrumb()` | Telemetry API | Different API |
| **Performance** | ✅ | ❌ | ⚠️ **FEATURE LOSS** |
| Transactions | `startTransaction()` | ❌ Not available | **Lost** |
| Spans | `startChild()` | ❌ Not available | **Lost** |
| Traces | Built-in | ❌ Not available | **Lost** |
| **Build Tools** | ✅ | ⚠️ | Manual workaround |
| Vite plugin | @sentry/vite-plugin | ❌ No official plugin | Custom script |
| Auto source maps | Yes | Via API/script | Manual upload |
| Release tracking | Automatic | Manual/CI | More manual |
| **Integrations** | ✅ | ✅ | Mostly equivalent |
| React | @sentry/react | rollbar-react | ✅ Available |
| Browser | @sentry/browser | rollbar.js | ✅ Available |
| Node.js | @sentry/node | rollbar (Node) | ✅ Available |
| Express | Middleware | Middleware | ✅ Available |

### 2.2 Critical Gaps

**You Will Lose:**
1. ❌ **Performance monitoring** - No transactions, spans, or traces
2. ❌ **Vite plugin** - Need custom script for source maps
3. ❌ **Automatic instrumentation** - Manual HTTP/fetch tracking
4. ❌ **Performance insights** - No slow request detection

**API Differences:**
```javascript
// BEFORE (Sentry)
Sentry.captureException(error, {
  tags: { component: 'Login' },
  contexts: { user: userData },
  fingerprint: ['login-error']
})

// AFTER (Rollbar)
Rollbar.error(error, {
  component: 'Login',  // Flatter structure
  userData: userData,
  fingerprint: 'login-error'
})
```

---

## 3. Migration Complexity Assessment

### 3.1 Complexity Rating: **HARD (7/10)**

**Why Hard:**
1. 📁 **47+ files** need changes
2. 🔧 **Deep integration** - Not just imports, but architecture
3. 🛠️ **Custom tooling** - No Vite plugin, need custom solution
4. ⚡ **Feature loss** - Must remove/replace performance monitoring
5. 🔄 **API learning curve** - Different patterns and structure
6. 🎯 **25+ functions** - Every Netlify function needs update
7. 🗺️ **Source maps** - Manual upload vs automatic

**Why Not Harder:**
1. ✅ **Abstraction layer** - Sink pattern helps isolate changes
2. ✅ **Similar concepts** - Both use similar error tracking paradigms
3. ✅ **Good docs** - Rollbar documentation is solid
4. ✅ **Rollback possible** - Can revert if issues arise

### 3.2 Effort Estimate

| Phase | Tasks | Time |
|-------|-------|------|
| **1. Preparation** | Research, setup, planning | 2-4 hours |
| **2. Core Infrastructure** | Init, sinks, wrappers | 4-6 hours |
| **3. Integration Points** | React, services, handlers | 4-6 hours |
| **4. Build Configuration** | Source maps, CI/CD | 2-3 hours |
| **5. Testing** | Comprehensive testing | 3-4 hours |
| **6. Documentation** | Docs, cleanup | 1-2 hours |
| **7. Contingency** | Unexpected issues | 2-4 hours |
| **TOTAL** | | **18-29 hours** |

**Conservative estimate: 24-32 hours (3-4 days)**

### 3.3 Risk Analysis

**🔴 HIGH RISK:**
- Data loss during migration (some errors might not be captured)
- Source map upload failures (manual process is error-prone)
- Performance blind spot (losing transaction tracking)
- Silent failures from API differences

**🟡 MEDIUM RISK:**
- Configuration errors (env var mismatches)
- Deployment pipeline issues
- Testing gaps

**🟢 LOW RISK:**
- Rollback capability
- Core feature parity
- Community support

---

## 4. Areas Requiring Changes

### 4.1 High Impact - Complete Rewrite (11 files)

These files need complete rewrites, not just find/replace:

1. **`src/logging/initSentryClient.ts`** → `initRollbarClient.ts`
   - Change: Complete rewrite for Rollbar initialization
   - Lines: ~100 lines
   - Complexity: High

2. **`src/logging/initSentryNode.ts`** → `initRollbarNode.ts`
   - Change: Complete rewrite for Node.js Rollbar
   - Lines: ~80 lines
   - Complexity: High

3. **`netlify/functions/_lib/sentry.js`** → `rollbar.js`
   - Change: Rewrite `withSentry()` → `withRollbar()`
   - Lines: ~120 lines
   - Complexity: High
   - Impact: All 25+ functions depend on this

4. **`src/logging/sinks/SentryBrowserSink.ts`** → `RollbarBrowserSink.ts`
   - Change: Rewrite for Rollbar API
   - Lines: ~60 lines
   - Complexity: Medium-High

5. **`src/logging/sinks/SentryNodeSink.ts`** → `RollbarNodeSink.ts`
   - Change: Rewrite for Rollbar API
   - Lines: ~60 lines
   - Complexity: Medium-High

6. **`src/logging/sentryBreadcrumbUtils.ts`** → `rollbarTelemetryUtils.ts`
   - Change: Convert breadcrumbs to Rollbar telemetry
   - Lines: ~40 lines
   - Complexity: Medium

7. **`src/utils/globalErrorHandler.js`**
   - Change: Update all Sentry calls to Rollbar
   - Lines: ~50 lines
   - Complexity: Medium

8. **`src/components/SentryTestComponent.jsx`** → `RollbarTestComponent.jsx`
   - Change: Complete rewrite for testing
   - Lines: ~80 lines
   - Complexity: Low

9. **`vite.config.js`**
   - Change: Remove Sentry plugin, add source map config
   - Lines: ~30 lines affected
   - Complexity: Medium
   - Additional: Need new upload script

10. **`src/main.jsx`**
    - Change: Replace Sentry init with Rollbar
    - Lines: ~20 lines affected
    - Complexity: Low

11. **`src/App.jsx`**
    - Change: Update breadcrumb/telemetry calls
    - Lines: ~15 lines affected
    - Complexity: Low

### 4.2 Medium Impact - Significant Updates (10 files)

These files need substantial changes but follow patterns:

1. **`src/logging/config.ts`**
   - Change: Update config structure for Rollbar
   - Lines: ~30 lines

2. **`src/logging/monitoring.ts`**
   - Change: Remove transaction tracking, update metrics
   - Lines: ~40 lines

3. **`src/logging/factories/clientLoggerFactory.ts`**
   - Change: Update factory for Rollbar sinks
   - Lines: ~25 lines

4. **`src/logging/factories/serverLoggerFactory.ts`**
   - Change: Update factory for Rollbar sinks
   - Lines: ~25 lines

5. **`src/services/apiClient.ts`**
   - Change: Replace Sentry breadcrumbs with Rollbar telemetry
   - Lines: ~20 lines

6. **`src/services/LoginService.ts`**
   - Change: Update error tracking calls
   - Lines: ~15 lines

7. **`src/services/ConsolidatedDataService.ts`**
   - Change: Update error tracking calls
   - Lines: ~15 lines

8. **`src/components/ErrorBoundary.tsx`**
   - Change: Replace Sentry error reporting with Rollbar
   - Lines: ~20 lines

9. **`src/logging/client.ts`**
   - Change: Update exports
   - Lines: ~10 lines

10. **`src/logging/server.ts`**
    - Change: Update exports
    - Lines: ~10 lines

### 4.3 Low Impact - Minor Changes (26+ files)

**All Netlify Functions (25+ files):**
- Change: Replace `withSentry` import with `withRollbar`
- Pattern: Find/replace in each file
- Lines: 2-3 lines per file
- Example:
  ```javascript
  // Before
  const { withSentry } = require('./_lib/sentry')
  exports.handler = withSentry(async (event, context) => {

  // After
  const { withRollbar } = require('./_lib/rollbar')
  exports.handler = withRollbar(async (event, context) => {
  ```

**Configuration Files (3 files):**
1. `package.json` - Update dependencies
2. `.env` - Update variable names
3. `.env.example` - Update template

**Documentation (4+ files):**
1. Update all Sentry references to Rollbar
2. Create new setup guides
3. Update troubleshooting docs

### 4.4 New Files Required

**Must Create:**
1. `src/logging/initRollbarClient.ts` - ~100 lines
2. `src/logging/initRollbarNode.ts` - ~80 lines
3. `netlify/functions/_lib/rollbar.js` - ~120 lines
4. `src/logging/sinks/RollbarBrowserSink.ts` - ~60 lines
5. `src/logging/sinks/RollbarNodeSink.ts` - ~60 lines
6. `scripts/upload-sourcemaps.js` - ~80 lines (replaces Vite plugin)

**Must Delete:**
1. All Sentry-specific files listed above
2. `knowledge/SENTRY_IO.md`
3. `knowledge/SENTRY_SETUP.md`
4. `docs/sentry-troubleshooting.md`

---

## 5. Step-by-Step Migration Plan

### Phase 1: Preparation (2-4 hours)

**Prerequisites:**
- [ ] Get stakeholder approval for migration
- [ ] Schedule 3-4 day migration window
- [ ] Create Rollbar account
- [ ] Generate access tokens (client + server)
- [ ] Set up test environment

**Research:**
- [ ] Review Rollbar React documentation
- [ ] Review Rollbar Node.js documentation
- [ ] Test Rollbar in isolated sandbox
- [ ] Document API mapping (Sentry → Rollbar)
- [ ] Create rollback plan

**Planning:**
- [ ] Identify features we'll lose (performance monitoring)
- [ ] Plan workarounds for lost features
- [ ] Create migration checklist
- [ ] Schedule deployment window
- [ ] Notify team of changes

### Phase 2: Core Infrastructure (4-6 hours)

**1. Install Packages**
```bash
# Remove Sentry
npm uninstall @sentry/browser @sentry/react @sentry/node @sentry/vite-plugin

# Install Rollbar
npm install rollbar rollbar-react

# Netlify functions
cd netlify/functions
npm uninstall @sentry/node
npm install rollbar
```

**2. Create Core Files**
- [ ] Create `src/logging/initRollbarClient.ts`
- [ ] Create `src/logging/initRollbarNode.ts`
- [ ] Create `netlify/functions/_lib/rollbar.js`
- [ ] Create `src/logging/sinks/RollbarBrowserSink.ts`
- [ ] Create `src/logging/sinks/RollbarNodeSink.ts`

**3. Update Configuration**
- [ ] Update `src/logging/config.ts` for Rollbar
- [ ] Update environment variables
- [ ] Add Rollbar tokens to .env

### Phase 3: Integration Points (4-6 hours)

**1. Update Initialization**
- [ ] Update `src/main.jsx`
- [ ] Update `src/App.jsx`
- [ ] Update logger factories

**2. Update Error Handling**
- [ ] Update `src/components/ErrorBoundary.tsx`
- [ ] Update `src/utils/globalErrorHandler.js`
- [ ] Update error capture in services

**3. Update Services**
- [ ] Update `src/services/apiClient.ts`
- [ ] Update `src/services/LoginService.ts`
- [ ] Update `src/services/ConsolidatedDataService.ts`

**4. Update Monitoring**
- [ ] Update `src/logging/monitoring.ts`
- [ ] Remove performance monitoring code
- [ ] Add manual performance tracking if needed

### Phase 4: Netlify Functions (2-3 hours)

**Update All 25+ Functions:**
```bash
# Find all functions using Sentry
grep -r "withSentry" netlify/functions/*.js

# Update each function:
# Replace: const { withSentry } = require('./_lib/sentry')
# With: const { withRollbar } = require('./_lib/rollbar')
# Replace: withSentry(
# With: withRollbar(
```

Files to update:
- [ ] consolidated-active.js
- [ ] consolidated-history.js
- [ ] consolidated-rankings.js
- [ ] consolidated-updates.js
- [ ] health.js
- [ ] (... continue for all 25 functions)

### Phase 5: Build Configuration (2-3 hours)

**1. Update vite.config.js**
```javascript
// Remove @sentry/vite-plugin
// Keep sourcemap generation
export default defineConfig({
  build: {
    sourcemap: true
  }
})
```

**2. Create Source Map Upload Script**
- [ ] Create `scripts/upload-sourcemaps.js`
- [ ] Test upload locally
- [ ] Update `package.json` build script

**3. Update CI/CD**
- [ ] Update environment variables in Netlify
- [ ] Test build pipeline
- [ ] Verify source map upload

### Phase 6: Testing (3-4 hours)

**1. Create Test Component**
- [ ] Create `src/components/RollbarTestComponent.jsx`
- [ ] Test error capture
- [ ] Test message logging
- [ ] Test telemetry
- [ ] Test user context

**2. Manual Testing**
- [ ] Test client errors appear in Rollbar
- [ ] Test server errors appear in Rollbar
- [ ] Test function errors appear in Rollbar
- [ ] Test source maps work
- [ ] Test error grouping
- [ ] Test notifications

**3. Integration Testing**
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Test all critical paths
- [ ] Verify error patterns match expectations

### Phase 7: Documentation & Cleanup (1-2 hours)

**1. Update Documentation**
- [ ] Create `docs/ROLLBAR_SETUP.md`
- [ ] Update README
- [ ] Update deployment docs
- [ ] Create troubleshooting guide

**2. Clean Up**
- [ ] Delete Sentry files
- [ ] Remove Sentry documentation
- [ ] Update .env.template
- [ ] Clean up unused imports

**3. Final Steps**
- [ ] Deploy to production
- [ ] Monitor for 48 hours
- [ ] Document any issues
- [ ] Archive Sentry data

---

## 6. Code Examples

### 6.1 Initialization Comparison

**BEFORE (Sentry):**
```typescript
// src/logging/initSentryClient.ts
import * as Sentry from '@sentry/react'

export async function maybeInitSentryBrowser(): Promise<boolean> {
  const env: any = (import.meta as any)?.env || {}
  const dsn = env.VITE_SENTRY_DSN

  Sentry.init({
    dsn: dsn || '',
    enabled: !!dsn,
    environment: env.VITE_SENTRY_ENVIRONMENT,
    release: env.VITE_SENTRY_RELEASE,
    tracesSampleRate: Number(env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay()
    ]
  })

  return true
}
```

**AFTER (Rollbar):**
```typescript
// src/logging/initRollbarClient.ts
import Rollbar from 'rollbar'

export async function maybeInitRollbarBrowser(): Promise<boolean> {
  const env: any = (import.meta as any)?.env || {}
  const accessToken = env.VITE_ROLLBAR_ACCESS_TOKEN

  const rollbar = new Rollbar({
    accessToken: accessToken || '',
    enabled: !!accessToken,
    environment: env.VITE_ROLLBAR_ENVIRONMENT,
    codeVersion: env.VITE_ROLLBAR_CODE_VERSION,
    captureUncaught: true,
    captureUnhandledRejections: true,
    payload: {
      client: {
        javascript: {
          source_map_enabled: true,
          guess_uncaught_frames: true
        }
      }
    }
  })

  // Make globally available
  ;(window as any).Rollbar = rollbar

  return true
}
```

### 6.2 Error Capture Comparison

**BEFORE (Sentry):**
```typescript
import * as Sentry from '@sentry/react'

// Capture exception with context
Sentry.captureException(error, {
  tags: {
    component: 'LoginService',
    action: 'authenticate'
  },
  contexts: {
    user: { id: userId, email: userEmail },
    request: { url, method, status }
  },
  fingerprint: ['login-auth-error'],
  level: 'error'
})

// Capture message
Sentry.captureMessage('User logged in', {
  level: 'info',
  tags: { userId }
})

// Add breadcrumb
Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'User navigated to dashboard',
  level: 'info',
  data: { from: '/login', to: '/dashboard' }
})

// Set user context
Sentry.setUser({ id: userId, email: userEmail })
```

**AFTER (Rollbar):**
```typescript
const rollbar = (window as any).Rollbar

// Capture exception with context
rollbar.error(error, {
  component: 'LoginService',
  action: 'authenticate',
  user: { id: userId, email: userEmail },
  request: { url, method, status },
  fingerprint: 'login-auth-error'
})

// Capture message (different log levels)
rollbar.info('User logged in', {
  userId
})

// Add telemetry (breadcrumb equivalent)
rollbar.configure({
  payload: {
    context: 'navigation: User navigated to dashboard',
    custom: {
      from: '/login',
      to: '/dashboard'
    }
  }
})

// Set user context (different structure)
rollbar.configure({
  payload: {
    person: {
      id: userId,
      email: userEmail
    }
  }
})
```

### 6.3 Netlify Function Wrapper Comparison

**BEFORE (Sentry):**
```javascript
// netlify/functions/_lib/sentry.js
const Sentry = require('@sentry/node')

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  tracesSampleRate: 0.1
})

function withSentry(handler) {
  return async (event, context) => {
    const transaction = Sentry.startTransaction({
      name: context.functionName,
      op: 'serverless.function'
    })

    try {
      const result = await handler(event, context)
      transaction.setStatus('ok')
      return result
    } catch (error) {
      Sentry.captureException(error, {
        tags: { function: context.functionName }
      })
      transaction.setStatus('error')
      throw error
    } finally {
      transaction.finish()
    }
  }
}
```

**AFTER (Rollbar):**
```javascript
// netlify/functions/_lib/rollbar.js
const Rollbar = require('rollbar')

let rollbar = null

function initRollbar() {
  if (rollbar) return

  const accessToken = process.env.ROLLBAR_SERVER_TOKEN
  rollbar = new Rollbar({
    accessToken: accessToken || '',
    enabled: !!accessToken,
    environment: process.env.ROLLBAR_ENVIRONMENT,
    captureUncaught: true,
    captureUnhandledRejections: true
  })
}

function withRollbar(handler) {
  initRollbar()

  return async (event, context) => {
    const startTime = Date.now()

    try {
      // Set context
      if (rollbar) {
        rollbar.configure({
          payload: {
            context: context.functionName,
            request: {
              method: event.httpMethod,
              url: event.path
            }
          }
        })
      }

      const result = await handler(event, context)

      // Manual performance tracking (no automatic transactions)
      const duration = Date.now() - startTime
      if (duration > 5000 && rollbar) {
        rollbar.warning('Slow function execution', {
          functionName: context.functionName,
          duration
        })
      }

      return result
    } catch (error) {
      if (rollbar) {
        rollbar.error(error, {
          functionName: context.functionName,
          path: event.path,
          method: event.httpMethod
        })
      }
      throw error
    }
  }
}

module.exports = { withRollbar, initRollbar }
```

### 6.4 Source Map Upload Script

**NEW FILE REQUIRED:**
```javascript
// scripts/upload-sourcemaps.js
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROLLBAR_TOKEN = process.env.ROLLBAR_POST_SERVER_ITEM_TOKEN
const VERSION = process.env.ROLLBAR_CODE_VERSION || 'unknown'
const BASE_URL = 'https://findr.quest'

if (!ROLLBAR_TOKEN) {
  console.warn('⚠️  No Rollbar token found, skipping source map upload')
  process.exit(0)
}

const distPath = path.join(__dirname, '../dist')

function findSourceMaps(dir) {
  const files = fs.readdirSync(dir)
  let maps = []

  files.forEach(file => {
    const filePath = path.join(dir, file)
    if (fs.statSync(filePath).isDirectory()) {
      maps = maps.concat(findSourceMaps(filePath))
    } else if (file.endsWith('.js.map')) {
      maps.push(filePath)
    }
  })

  return maps
}

const sourceMaps = findSourceMaps(distPath)

console.log(`📦 Found ${sourceMaps.length} source maps to upload`)

let uploaded = 0
let failed = 0

sourceMaps.forEach(mapPath => {
  const jsPath = mapPath.replace('.map', '')
  const relativePath = jsPath.replace(distPath, '')
  const minifiedUrl = `${BASE_URL}${relativePath}`

  try {
    execSync(
      `curl https://api.rollbar.com/api/1/sourcemap ` +
      `-F access_token=${ROLLBAR_TOKEN} ` +
      `-F version=${VERSION} ` +
      `-F minified_url=${minifiedUrl} ` +
      `-F source_map=@${mapPath}`,
      { stdio: 'pipe' }
    )
    console.log(`✅ Uploaded: ${minifiedUrl}`)
    uploaded++
  } catch (error) {
    console.error(`❌ Failed: ${minifiedUrl}`)
    failed++
  }
})

console.log(`\n✨ Upload complete: ${uploaded} succeeded, ${failed} failed`)

if (failed > 0) {
  process.exit(1)
}
```

**Update package.json:**
```json
{
  "scripts": {
    "build": "vite build && node scripts/upload-sourcemaps.js"
  }
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Create Test Component:**
```jsx
// src/components/RollbarTestComponent.jsx
import React, { useState } from 'react'

export default function RollbarTestComponent() {
  const [errorType, setErrorType] = useState('')
  const rollbar = (window as any).Rollbar

  const testError = () => {
    try {
      throw new Error('Test error from RollbarTestComponent')
    } catch (error) {
      rollbar?.error(error, {
        component: 'RollbarTestComponent',
        testType: 'manual'
      })
    }
  }

  const testMessage = () => {
    rollbar?.info('Test info message', {
      timestamp: new Date().toISOString()
    })
  }

  const testUserContext = () => {
    rollbar?.configure({
      payload: {
        person: {
          id: 'test-user-123',
          email: 'test@example.com',
          username: 'testuser'
        }
      }
    })
    rollbar?.info('User context set')
  }

  const testUncaughtError = () => {
    setTimeout(() => {
      throw new Error('Uncaught error for testing')
    }, 100)
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Rollbar Test Component</h2>

      <div className="space-x-2">
        <button onClick={testError} className="px-4 py-2 bg-blue-500 text-white">
          Test Error
        </button>
        <button onClick={testMessage} className="px-4 py-2 bg-green-500 text-white">
          Test Message
        </button>
        <button onClick={testUserContext} className="px-4 py-2 bg-purple-500 text-white">
          Test User Context
        </button>
        <button onClick={testUncaughtError} className="px-4 py-2 bg-red-500 text-white">
          Test Uncaught Error
        </button>
      </div>

      <div className="text-sm text-gray-600">
        Check Rollbar dashboard for captured events
      </div>
    </div>
  )
}
```

### 7.2 Integration Tests

**Test Checklist:**
- [ ] Client error capture works
- [ ] Server error capture works
- [ ] Netlify function errors captured
- [ ] Source maps resolve correctly
- [ ] User context persists
- [ ] Custom data attached
- [ ] Error grouping works
- [ ] Notifications trigger
- [ ] Offline mode works (no token)
- [ ] Performance acceptable

### 7.3 Deployment Testing

**Staging Environment:**
1. Deploy to staging with Rollbar
2. Run smoke tests
3. Trigger test errors
4. Verify in Rollbar dashboard
5. Check source map resolution
6. Test error grouping
7. Verify notifications

**Production Checklist:**
- [ ] All environment variables set
- [ ] Source maps uploaded
- [ ] Test error appears correctly
- [ ] Error grouping works
- [ ] Notifications configured
- [ ] Team has access to Rollbar
- [ ] Monitor for 48 hours

---

## 8. Environment Variables

### 8.1 Variables to Add

**Client-side (.env, Netlify):**
```bash
VITE_ROLLBAR_ACCESS_TOKEN=<client-access-token>
VITE_ROLLBAR_ENVIRONMENT=development|staging|production
VITE_ROLLBAR_CODE_VERSION=<git-sha-or-version>
```

**Server-side (.env, Netlify):**
```bash
ROLLBAR_SERVER_TOKEN=<server-access-token>
ROLLBAR_ENVIRONMENT=development|staging|production
ROLLBAR_CODE_VERSION=<git-sha-or-version>
```

**Build-time (CI/CD only):**
```bash
ROLLBAR_POST_SERVER_ITEM_TOKEN=<post-server-item-token>
```

### 8.2 Variables to Remove

```bash
# Remove these
VITE_SENTRY_DSN
VITE_SENTRY_ENVIRONMENT
VITE_SENTRY_RELEASE
VITE_SENTRY_TRACES_SAMPLE_RATE
SENTRY_DSN
SENTRY_ENVIRONMENT
SENTRY_RELEASE
SENTRY_TRACES_SAMPLE_RATE
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

---

## 9. Rollback Plan

### 9.1 Pre-Migration Backup

**Before starting:**
1. Create feature branch: `git checkout -b rollback/sentry-backup`
2. Commit current state: `git commit -am "Backup before Rollbar migration"`
3. Tag for reference: `git tag pre-rollbar-migration`
4. Document current Sentry configuration
5. Export Sentry data/settings if possible

### 9.2 Rollback Procedure

**If migration fails:**

1. **Code Rollback**
   ```bash
   git checkout main
   git revert <migration-commits>
   # OR
   git reset --hard pre-rollbar-migration
   ```

2. **Dependency Rollback**
   ```bash
   npm uninstall rollbar rollbar-react
   npm install @sentry/browser @sentry/react @sentry/node @sentry/vite-plugin
   cd netlify/functions
   npm uninstall rollbar
   npm install @sentry/node
   ```

3. **Environment Variables**
   - Revert to Sentry variables in Netlify
   - Update .env locally

4. **Build & Deploy**
   ```bash
   npm run build
   netlify deploy --prod
   ```

5. **Verify**
   - Test error capture
   - Check Sentry dashboard
   - Monitor for issues

### 9.3 Rollback Timeline

**Critical issues:** Rollback within 1 hour
**Major issues:** Rollback within 4 hours
**Minor issues:** Fix forward or rollback within 24 hours

---

## 10. Recommendations

### 10.1 Should You Migrate?

**✅ Migrate to Rollbar IF:**
- You need significant cost savings
- You don't rely on performance monitoring
- You have 3-4 days available for migration
- Your team is comfortable with medium-high risk
- You have good test coverage
- Current Sentry costs are prohibitive

**⛔ Stay with Sentry IF:**
- You actively use performance monitoring
- You can't afford 3-4 days of migration work
- You need automatic instrumentation
- Current setup is working well
- Risk tolerance is low
- Budget allows for Sentry costs

### 10.2 Alternative: Optimize Sentry

**Instead of migrating, consider:**
1. Reduce `tracesSampleRate` (e.g., 0.1 → 0.05)
2. Use session sample rate limits
3. Filter out noisy errors
4. Optimize data retention settings
5. Review organization-level settings
6. Consider Sentry's smaller plans

**Potential savings:**
- 50% cost reduction with minimal effort
- Keep all features
- No migration risk
- 1-2 hours of configuration work

### 10.3 Phased Migration (Lower Risk)

**Week 1: Parallel Setup**
- Install Rollbar alongside Sentry
- Configure Rollbar in test environment
- Send errors to both platforms
- Compare results

**Week 2: Client Migration**
- Migrate client-side only
- Keep server-side on Sentry
- Monitor and compare

**Week 3: Server Migration**
- Migrate server and functions
- Full Rollbar implementation
- Sentry as backup

**Week 4: Sentry Removal**
- Remove Sentry packages
- Clean up code
- Archive Sentry data

**Benefits:**
- Lower risk
- Gradual transition
- Easy rollback
- Team learning time

**Drawbacks:**
- Longer timeline (4 weeks)
- Dual maintenance
- Higher temporary costs

---

## 11. Success Criteria

### 11.1 Migration Complete When:

- [ ] All Sentry packages removed
- [ ] All Rollbar packages installed and configured
- [ ] All 47+ files updated
- [ ] All 25+ Netlify functions updated
- [ ] Source maps uploading correctly
- [ ] Errors appearing in Rollbar dashboard
- [ ] Error grouping working correctly
- [ ] Notifications configured and tested
- [ ] Documentation updated
- [ ] Team trained on Rollbar
- [ ] Production running stable for 48 hours
- [ ] No Sentry-related code remains
- [ ] All tests passing

### 11.2 Quality Metrics

**Error Tracking:**
- Error capture rate: 100% (same as Sentry)
- False positive rate: <1%
- Source map resolution: 100%
- Grouping accuracy: >95%

**Performance:**
- Page load impact: <50ms increase
- Error capture latency: <1 second
- Function cold start: <100ms increase

**Operational:**
- Deployment time: No increase
- Build time: <10% increase
- Team satisfaction: >4/5

---

## 12. Conclusion

### 12.1 Summary

The migration from Sentry to Rollbar is **feasible but challenging**:

**Pros:**
- ✅ Potential cost savings
- ✅ Similar core functionality
- ✅ Rollback possible
- ✅ Learning opportunity

**Cons:**
- ❌ 47+ files to modify
- ❌ 18-29 hours of work
- ❌ Loss of performance monitoring
- ❌ Medium-high risk
- ❌ Manual source map uploads
- ❌ API learning curve

### 12.2 Final Recommendation

**Consider migration ONLY if:**
1. Sentry costs are unsustainable
2. You have dedicated 3-4 days available
3. Performance monitoring is not critical
4. You have strong rollback capability
5. Team has appetite for risk

**Otherwise:**
- Optimize current Sentry configuration
- Reduce sample rates
- Filter unnecessary errors
- Stay with proven, working solution

### 12.3 Next Steps

**If proceeding with migration:**
1. Get stakeholder approval
2. Schedule migration window
3. Create Rollbar account
4. Follow Phase 1 of migration plan
5. Execute methodically with testing at each step

**If staying with Sentry:**
1. Review Sentry configuration
2. Optimize sample rates
3. Filter noisy errors
4. Document current setup
5. Review costs quarterly

---

## Appendix A: Quick Reference

### Sentry → Rollbar API Mapping

| Sentry API | Rollbar API |
|------------|-------------|
| `Sentry.captureException(error)` | `Rollbar.error(error)` |
| `Sentry.captureMessage(msg)` | `Rollbar.info(msg)` |
| `Sentry.setUser({id, email})` | `Rollbar.configure({payload: {person: {id, email}}})` |
| `Sentry.setTag(key, val)` | Include in custom data object |
| `Sentry.addBreadcrumb()` | Use telemetry or custom logging |
| `Sentry.startTransaction()` | ❌ Not available |
| `Sentry.captureEvent()` | `Rollbar.log()` with custom data |

### Key Differences

| Feature | Sentry | Rollbar |
|---------|--------|---------|
| **Config Structure** | Flat object | Nested `payload` object |
| **User Context** | `setUser()` method | `payload.person` config |
| **Tags** | Structured tags | Flat custom data |
| **Breadcrumbs** | `addBreadcrumb()` | Telemetry API |
| **Performance** | Full APM | ❌ None |
| **Log Levels** | Via `level` param | Separate methods (info, warn, error) |

---

**Document Status:** ✅ COMPLETE
**Author:** Claude Code
**Date:** 2025-09-30
**Version:** 1.0
**Implementation Status:** NOT STARTED - RESEARCH ONLY
