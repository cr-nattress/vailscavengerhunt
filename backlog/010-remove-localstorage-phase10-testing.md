# Phase 10: Testing and Validation

## Objective
Thoroughly test the application to ensure localStorage is completely removed and server storage works reliably.

## Prerequisites
- All implementation phases completed
- Server infrastructure deployed
- Error handling implemented

## Tasks

### 1. Create Automated Test Suite

```typescript
// src/__tests__/storage.test.ts
describe('Storage System', () => {
  beforeEach(() => {
    // Mock server responses
    global.fetch = jest.fn();
  });

  test('should not access localStorage', () => {
    const localStorageSpy = jest.spyOn(Storage.prototype, 'getItem');
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    // Run app initialization
    render(<App />);

    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  test('should load settings from server', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ locationName: 'BHHS', teamName: 'TestTeam' }),
    });

    const { result } = renderHook(() => useSettings('test-session'));

    await waitFor(() => {
      expect(result.current.data).toEqual({
        locationName: 'BHHS',
        teamName: 'TestTeam',
      });
    });
  });

  test('should handle server errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSettings('test-session'));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error.message).toBe('Network error');
    });
  });
});
```

### 2. Browser DevTools Validation Script

```javascript
// Run in browser console to verify no localStorage usage
(function validateNoLocalStorage() {
  const results = {
    localStorageKeys: Object.keys(localStorage),
    sessionStorageKeys: Object.keys(sessionStorage),
    indexedDBDatabases: [],
    cacheStorageNames: [],
  };

  // Check IndexedDB
  if (window.indexedDB) {
    indexedDB.databases().then(dbs => {
      results.indexedDBDatabases = dbs.map(db => db.name);
    });
  }

  // Check Cache Storage
  if ('caches' in window) {
    caches.keys().then(names => {
      results.cacheStorageNames = names;
    });
  }

  // Monitor localStorage access
  const originalSetItem = Storage.prototype.setItem;
  const originalGetItem = Storage.prototype.getItem;

  Storage.prototype.setItem = function(...args) {
    console.error('❌ localStorage.setItem called:', args);
    debugger;
    return originalSetItem.apply(this, args);
  };

  Storage.prototype.getItem = function(...args) {
    console.error('❌ localStorage.getItem called:', args);
    debugger;
    return originalGetItem.apply(this, args);
  };

  console.log('Storage Validation Results:', results);

  if (results.localStorageKeys.length > 0) {
    console.warn('⚠️ Found localStorage keys:', results.localStorageKeys);
  } else {
    console.log('✅ No localStorage keys found');
  }

  return results;
})();
```

### 3. Performance Testing

```typescript
// src/__tests__/performance.test.ts
describe('Performance', () => {
  test('should load initial data within 2 seconds', async () => {
    const startTime = performance.now();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome/)).toBeInTheDocument();
    });

    const loadTime = performance.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });

  test('should update progress within 500ms', async () => {
    const startTime = performance.now();

    const { result } = renderHook(() => useProgress('session-123'));

    act(() => {
      result.current.updateProgress({ stopId: '1', done: true });
    });

    const updateTime = performance.now() - startTime;
    expect(updateTime).toBeLessThan(500);
  });
});
```

### 4. Manual Test Checklist

```markdown
## Manual Testing Checklist

### Initial Load
- [ ] App loads without localStorage errors
- [ ] Settings load from server
- [ ] Progress data loads correctly
- [ ] No console errors about storage

### Data Persistence
- [ ] Changes persist after page refresh
- [ ] Data syncs across browser tabs
- [ ] Data available on different devices (same session)

### Network Scenarios
- [ ] Works on slow 3G connection
- [ ] Shows loading states appropriately
- [ ] Handles network timeout gracefully
- [ ] Displays offline indicator when disconnected
- [ ] Queues changes when offline (if implemented)

### Error Scenarios
- [ ] Server 500 error shows user-friendly message
- [ ] Server timeout shows retry option
- [ ] Invalid data doesn't crash app
- [ ] Rate limiting handled gracefully

### Performance
- [ ] Initial load < 3 seconds
- [ ] Subsequent loads use cache effectively
- [ ] No memory leaks after extended use
- [ ] Smooth UI interactions

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)
```

### 5. Load Testing Script

```javascript
// scripts/loadTest.js
const fetch = require('node-fetch');

async function loadTest() {
  const baseUrl = 'https://your-app.netlify.app/api';
  const sessionId = 'load-test-' + Date.now();

  console.log('Starting load test...');

  // Simulate 100 concurrent users
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(
      fetch(`${baseUrl}/settings/${sessionId}-${i}`)
        .then(res => res.json())
        .then(() => ({ success: true }))
        .catch(err => ({ success: false, error: err.message }))
    );
  }

  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success).length;

  console.log(`Results: ${successful}/100 successful requests`);
  console.log(`Failure rate: ${(100 - successful)}%`);
}

loadTest();
```

### 6. Security Audit

```typescript
// Check for sensitive data exposure
const securityChecks = {
  // Ensure no sensitive data in memory
  checkMemoryForSecrets: () => {
    const memoryDump = JSON.stringify(window);
    const patterns = [
      /api[_-]?key/i,
      /password/i,
      /secret/i,
      /token/i,
    ];

    patterns.forEach(pattern => {
      if (pattern.test(memoryDump)) {
        console.warn('⚠️ Possible sensitive data in memory');
      }
    });
  },

  // Verify HTTPS only
  checkHTTPS: () => {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.error('❌ Not using HTTPS!');
    }
  },

  // Check for XSS vulnerabilities
  checkXSS: () => {
    // Test common XSS vectors
    const testVectors = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
    ];

    // These should be properly escaped
    testVectors.forEach(vector => {
      // Test in various inputs
    });
  },
};
```

### 7. Monitoring Setup

```javascript
// Add monitoring for production
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('localStorage')) {
    // Log to monitoring service
    console.error('localStorage access detected in production!', {
      message: event.error.message,
      stack: event.error.stack,
    });
  }
});
```

## Success Criteria
- [ ] Zero localStorage access in production
- [ ] All tests pass
- [ ] Performance meets targets
- [ ] No data loss reports
- [ ] Error rate < 1%

## Sign-off Checklist
- [ ] Development team approval
- [ ] QA team approval
- [ ] Security review passed
- [ ] Performance benchmarks met
- [ ] Documentation updated

## Status
⏳ Not Started