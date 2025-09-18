# Phase 9: Error Handling and Offline Support

## Objective
Implement comprehensive error handling and provide clear feedback when server storage is unavailable.

## Prerequisites
- Server storage fully implemented
- localStorage completely removed

## Tasks

### 1. Create Error Boundary Components

```typescript
// src/components/StorageErrorBoundary.tsx
class StorageErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return { hasError: true, error };
    }
    throw error; // Re-throw non-network errors
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Connection Problem</h2>
          <p>Unable to connect to server. Please check your internet connection.</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 2. Add Connection Status Monitor

```typescript
// src/hooks/useConnectionStatus.ts
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger data sync
      queryClient.invalidateQueries();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection periodically
    const interval = setInterval(async () => {
      try {
        await fetch('/health', { method: 'HEAD' });
        setIsOnline(true);
        setLastSync(new Date());
      } catch {
        setIsOnline(false);
      }
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, lastSync };
}
```

### 3. Create Offline Indicator Component

```tsx
// src/components/OfflineIndicator.tsx
export function OfflineIndicator() {
  const { isOnline, lastSync } = useConnectionStatus();

  if (isOnline) return null;

  return (
    <div className="offline-indicator">
      <Icon name="wifi-off" />
      <span>Offline - Last sync: {formatTime(lastSync)}</span>
    </div>
  );
}
```

### 4. Implement Request Queue for Offline

```typescript
// src/services/OfflineQueue.ts
class OfflineQueue {
  private queue: QueuedRequest[] = [];

  add(request: QueuedRequest) {
    this.queue.push({
      ...request,
      timestamp: Date.now(),
      retries: 0,
    });
  }

  async processQueue() {
    if (!navigator.onLine) return;

    const pending = [...this.queue];
    this.queue = [];

    for (const request of pending) {
      try {
        await this.executeRequest(request);
      } catch (error) {
        if (request.retries < 3) {
          request.retries++;
          this.queue.push(request);
        } else {
          console.error('Failed after 3 retries:', request);
        }
      }
    }
  }

  private async executeRequest(request: QueuedRequest) {
    const { method, url, body } = request;
    return await fetch(url, { method, body: JSON.stringify(body) });
  }
}

export const offlineQueue = new OfflineQueue();
```

### 5. Add Loading States

```tsx
// src/components/LoadingStates.tsx
export function DataLoader({ isLoading, error, children }) {
  if (isLoading) {
    return (
      <div className="loading-container">
        <Spinner />
        <p>Loading data from server...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <Icon name="alert-circle" />
        <p>Failed to load data</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  return children;
}
```

### 6. Add User Feedback for Operations

```typescript
// src/hooks/useToast.ts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const showSaveStatus = async (promise: Promise<any>) => {
    try {
      showToast('Saving...', 'warning');
      await promise;
      showToast('Saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save. Please try again.', 'error');
      throw error;
    }
  };

  return { toasts, showToast, showSaveStatus };
}
```

### 7. Add Retry Logic with Exponential Backoff

```typescript
// src/utils/retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

### 8. Add Graceful Degradation

```typescript
// Allow read-only mode when server is unavailable
export function useProgressReadOnly(sessionId: string) {
  const [progress, setProgress] = useState({});
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const data = await ProgressService.getProgress(sessionId);
        setProgress(data);
        setIsReadOnly(false);
      } catch (error) {
        console.error('Failed to load progress, entering read-only mode');
        setIsReadOnly(true);
        // Show last known data if available
      }
    };

    loadProgress();
  }, [sessionId]);

  return { progress, isReadOnly };
}
```

## UX Guidelines
- Always show loading states
- Provide clear error messages
- Allow retry for failed operations
- Show offline status prominently
- Queue changes when offline
- Sync automatically when back online

## Testing Checklist
- [ ] App shows offline indicator when disconnected
- [ ] Error messages are user-friendly
- [ ] Retry mechanisms work correctly
- [ ] Loading states appear during operations
- [ ] App doesn't crash when server is down

## Status
⏳ Not Started