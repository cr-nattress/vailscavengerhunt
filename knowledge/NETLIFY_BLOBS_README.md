# Netlify Blobs Integration

## Overview

This project implements the updated design using **Netlify Blobs** for serverless storage with a **dual-write pattern** that ensures data is stored in both localStorage and Netlify Blobs.

## Architecture

### Client-Side (Unchanged Principle)
- **Always writes to localStorage** for immediate UX
- **Always POSTs to `/api/kv/upsert`** for persistence
- Reads from localStorage first (fast), falls back to server for fresh data

### Server-Side (Netlify Functions + Blobs)
- **Netlify Blobs** replaces previous server storage
- Each record stored as JSON blob with predictable key patterns
- Automatic indexing support for searchability

## Files Created

### 1. Netlify Functions
- **`netlify/functions/kv-upsert.ts`** - POST endpoint for dual-write operations
- **`netlify/functions/kv-get.ts`** - GET endpoint for reading values by key
- **`netlify/functions/kv-list.ts`** - GET endpoint for listing keys with optional values

### 2. Client Services
- **`src/client/DualWriteService.js`** - Main service implementing dual-write pattern
- **`src/client/LocalStorageService.js`** - Comprehensive localStorage wrapper
- **`src/client/HybridStorageService.js`** - Hybrid server + localStorage service

### 3. Configuration
- **`netlify.toml`** - Updated with blob store config and function redirects
- **`test-netlify-blobs.html`** - Interactive test interface

## Key Features

### Dual-Write Pattern
```javascript
// Always writes to both localStorage and server
const results = await DualWriteService.set(key, value, indexes);
// results: { localStorage: true, server: true, errors: [] }
```

### Automatic Indexing
```javascript
// Sessions automatically create searchable indexes
await DualWriteService.createSession(sessionId, {
  id: sessionId,
  location: 'Vail Valley',
  team: 'Adventure Team'
});
// Creates indexes: index:sessions, index:location:Vail Valley
```

### Smart Retrieval
```javascript
// Fast localStorage first, server fallback
const settings = await DualWriteService.get('app-settings');
// Automatically caches server data in localStorage
```

## Netlify Blobs Configuration

### netlify.toml
```toml
[[blobs]]
name = "kv"

[[redirects]]
  from = "/api/kv/upsert"
  to = "/.netlify/functions/kv-upsert"
  status = 200
```

### Function Structure
```typescript
import { getStore } from "@netlify/blobs";

const store = getStore("kv");

export const handler = async (event) => {
  const { key, value, indexes } = JSON.parse(event.body);
  
  // Write main record
  await store.setJSON(key, value);
  
  // Handle indexes
  if (indexes) {
    for (const ix of indexes) {
      const set = store.set(ix.key);
      await set.add(ix.member);
    }
  }
  
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
```

## Benefits

### 1. Serverless & Auto-scaling
- No infrastructure management
- Scales automatically with usage
- Built-in encryption and versioning

### 2. Developer Experience
- JSON helpers built-in (`setJSON`, `getJSON`)
- Set abstraction for index-like behavior
- TypeScript support with proper types

### 3. Reliability
- Dual-write ensures data persistence
- localStorage provides offline capability
- Automatic failover between storage systems

### 4. Performance
- Fast localStorage reads for UX
- Background server sync for durability
- Efficient batch operations

## Usage Examples

### Session Management
```javascript
// Create session with automatic indexing
const sessionData = {
  id: generateGuid(),
  location: 'Vail Valley',
  startTime: new Date().toISOString(),
  team: 'Mountain Explorers'
};

const results = await DualWriteService.createSession(sessionId, sessionData);
console.log(results); // { localStorage: true, server: true }
```

### Settings Persistence
```javascript
// Save app settings
const settings = {
  location: 'Aspen Valley',
  team: 'Adventure Squad',
  updatedAt: new Date().toISOString()
};

await DualWriteService.saveSettings(settings);
```

### Batch Operations
```javascript
// Set multiple values with custom indexes
const data = {
  'user:123': { name: 'John', role: 'admin' },
  'user:456': { name: 'Jane', role: 'user' }
};

const indexConfig = {
  'user:123': [{ key: 'index:admins', member: 'user:123' }],
  'user:456': [{ key: 'index:users', member: 'user:456' }]
};

await DualWriteService.setMultiple(data, indexConfig);
```

## Testing

### Local Development
1. Start the app: `npm start`
2. Open test interface: `test-netlify-blobs.html`
3. Test dual-write functionality

### Production Deployment
1. Deploy to Netlify
2. Blob store automatically configured
3. Functions auto-wired to blob storage

## Integration Status

✅ **@netlify/blobs** dependency installed  
✅ **Netlify Functions** created (kv-upsert, kv-get, kv-list)  
✅ **DualWriteService** implemented with localStorage + server  
✅ **netlify.toml** configured for blob store  
✅ **App.jsx** updated to use DualWriteService  
✅ **Test interface** created for validation  

The implementation is ready for production deployment to Netlify!