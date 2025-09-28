🤖 Best Code Commenting Practices for Claude Code
NextJS/NodeJS with TypeScript
A comprehensive guide to commenting your code for maximum AI assistance effectiveness.

📋 Table of Contents

Core Principles
Function Comments
Class Comments
Component Comments
API Route Comments
Complex Logic Comments
Type/Interface Comments
File Headers
Special Claude Markers
Anti-Patterns to Avoid


Core Principles
The 5 Rules for Claude-Optimized Comments

Explain WHY, not WHAT - Claude can read the code, explain intentions
Document assumptions - State what you're assuming to be true
Describe relationships - How does this connect to other parts?
Flag complexity - Mark areas that are tricky or non-obvious
Provide examples - Show typical usage or edge cases


Function Comments
Best Pattern: JSDoc with Rich Context
typescript/**
 * Validates and processes user authentication tokens with refresh capability.
 * 
 * @description
 * This function handles the complex token refresh flow, including:
 * - Checking token expiry with a 5-minute buffer
 * - Attempting refresh if close to expiry
 * - Managing race conditions with mutex locking
 * - Fallback to re-authentication if refresh fails
 * 
 * @param {string} accessToken - JWT access token from client
 * @param {string} refreshToken - Refresh token for getting new access token
 * @param {Object} options - Configuration options
 * @param {boolean} options.forceRefresh - Skip expiry check and refresh immediately
 * @param {number} options.retryCount - Number of refresh attempts (default: 3)
 * 
 * @returns {Promise<AuthTokens>} New token pair or original if still valid
 * 
 * @throws {AuthenticationError} When refresh fails after all retries
 * @throws {NetworkError} When token service is unreachable
 * 
 * @example
 * // Normal usage with automatic refresh
 * const tokens = await refreshTokenIfNeeded(accessToken, refreshToken);
 * 
 * @example
 * // Force refresh regardless of expiry
 * const tokens = await refreshTokenIfNeeded(accessToken, refreshToken, { 
 *   forceRefresh: true 
 * });
 * 
 * @sideEffects
 * - Updates Redis cache with new tokens
 * - Logs refresh attempts to monitoring service
 * - May trigger user notification if approaching refresh token expiry
 * 
 * @performance O(1) for valid tokens, O(n) for refresh where n = retry count
 * 
 * @security
 * - Tokens are validated for signature before processing
 * - Refresh tokens are single-use and rotated on each refresh
 * - Failed attempts are rate-limited by user ID
 * 
 * @relatedFunctions
 * - validateAccessToken() - Called internally for token validation
 * - notifyTokenExpiry() - Triggered when refresh token near expiry
 * 
 * @todo Handle edge case where user revokes access during refresh
 * @deprecated Option 'legacyMode' will be removed in v3.0
 */
async function refreshTokenIfNeeded(
  accessToken: string,
  refreshToken: string,
  options: RefreshOptions = {}
): Promise<AuthTokens> {
  // Implementation...
}
Inline Function Comments
typescriptasync function processPayment(order: Order): Promise<PaymentResult> {
  // CRITICAL: Always validate amounts in smallest currency unit (cents)
  // to avoid floating point precision issues
  const amountInCents = Math.round(order.total * 100);
  
  // MUTEX: Prevent double-charging by locking on order ID
  // This addresses the race condition found in bug #1234
  await acquireLock(`payment:${order.id}`);
  
  try {
    // RETRY LOGIC: Payment gateway has intermittent failures
    // Exponential backoff: 1s, 2s, 4s
    const result = await retryWithBackoff(
      () => paymentGateway.charge(amountInCents),
      { maxAttempts: 3 }
    );
    
    // AUDIT: Log all payment attempts for compliance
    // Required by PCI DSS 3.2.1 section 10.2
    await auditLog.record('payment.processed', {
      orderId: order.id,
      amount: amountInCents,
      result: result.status
    });
    
    return result;
  } finally {
    // ALWAYS: Release lock even if payment fails
    // Otherwise, order gets stuck in processing state
    await releaseLock(`payment:${order.id}`);
  }
}

Class Comments
Best Pattern: Comprehensive Class Documentation
typescript/**
 * Manages user session lifecycle with distributed state synchronization.
 * 
 * @class SessionManager
 * @implements {ISessionManager}
 * 
 * @description
 * Core session management service that handles:
 * - Session creation, validation, and destruction
 * - Cross-device session synchronization
 * - Activity tracking and timeout management
 * - Security event monitoring and response
 * 
 * Architecture Notes:
 * - Uses Redis for distributed session storage
 * - Implements sliding window expiration
 * - Broadcasts session events via WebSocket
 * - Falls back to local storage in offline mode
 * 
 * @stateManagement
 * - Sessions stored in Redis with key: `session:${userId}:${sessionId}`
 * - Local cache with 5-minute TTL for performance
 * - Sync events published to `session.sync` channel
 * 
 * @errorHandling
 * - Automatic retry with exponential backoff for Redis failures
 * - Graceful degradation to read-only mode if Redis unavailable
 * - Circuit breaker pattern for external service calls
 * 
 * @performance
 * - Session reads: ~5ms (cached), ~20ms (Redis)
 * - Session writes: ~30ms (Redis + broadcast)
 * - Supports 10,000 concurrent sessions per instance
 * 
 * @security
 * - Sessions encrypted at rest using AES-256
 * - Session tokens rotated every 24 hours
 * - Implements CSRF protection via double-submit cookies
 * 
 * @example
 * ```typescript
 * const sessionManager = new SessionManager({
 *   redis: redisClient,
 *   encryptionKey: process.env.SESSION_KEY
 * });
 * 
 * const session = await sessionManager.create(userId);
 * await sessionManager.validate(session.token);
 * ```
 * 
 * @relationshipDiagram
 * ```
 * SessionManager
 *   ├── RedisClient (dependency)
 *   ├── WebSocketServer (broadcasts)
 *   ├── AuditLogger (security events)
 *   └── MetricsCollector (performance)
 * ```
 * 
 * @configurationOptions
 * - `sessionTimeout`: Minutes until session expires (default: 30)
 * - `maxConcurrentSessions`: Per-user limit (default: 5)
 * - `enableOfflineMode`: Allow local-only sessions (default: false)
 * 
 * @events
 * - 'session.created': New session established
 * - 'session.expired': Session timed out
 * - 'session.revoked': Session manually terminated
 * - 'session.suspicious': Potential security threat detected
 * 
 * @monitoring
 * - Metric: `session.create.duration` - Creation time histogram
 * - Metric: `session.active.count` - Current active sessions gauge
 * - Alert: `session.error.rate` > 1% triggers PagerDuty
 * 
 * @maintenance
 * - Run `cleanupExpiredSessions()` daily via cron
 * - Monitor Redis memory usage, sessions use ~2KB each
 * - Review session.suspicious events weekly
 * 
 * @knownIssues
 * - Race condition in concurrent session limit enforcement (#456)
 * - Memory leak in WebSocket broadcaster under high load (#789)
 * 
 * @futureImprovements
 * - TODO: Implement session replay for debugging
 * - TODO: Add biometric authentication support
 * - TODO: Migrate to JWT for stateless sessions
 */
export class SessionManager implements ISessionManager {
  private redis: RedisClient;
  private localCache: Map<string, SessionData>;
  private circuitBreaker: CircuitBreaker;
  
  /**
   * Initializes SessionManager with required dependencies.
   * 
   * @param config - Configuration object
   * @throws {ConfigurationError} If required config missing
   * 
   * @initialization
   * 1. Validates configuration
   * 2. Establishes Redis connection
   * 3. Initializes local cache
   * 4. Registers event handlers
   * 5. Starts cleanup scheduler
   */
  constructor(config: SessionConfig) {
    // VALIDATION: Ensure required config present
    // These are critical for security and cannot be defaulted
    if (!config.redis) throw new ConfigurationError('Redis client required');
    if (!config.encryptionKey) throw new ConfigurationError('Encryption key required');
    
    this.redis = config.redis;
    this.localCache = new Map();
    
    // PATTERN: Circuit breaker prevents cascade failures
    // Opens after 5 failures, attempts reset after 60s
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000
    });
    
    // STARTUP: Register cleanup and monitoring
    this.initializeCleanupScheduler();
    this.registerMetrics();
  }
  
  // Method implementations...
}

Component Comments
NextJS Component Pattern
typescript/**
 * Renders a data table with real-time updates and virtual scrolling.
 * 
 * @component DataTable
 * @category UI Components
 * 
 * @description
 * High-performance table component optimized for large datasets.
 * Features:
 * - Virtual scrolling for 100,000+ rows
 * - Real-time updates via WebSocket
 * - Column sorting and filtering
 * - Row selection with keyboard navigation
 * - Responsive design with mobile fallback
 * 
 * @performance
 * - Initial render: <100ms for 10,000 rows
 * - Scroll FPS: 60fps with virtual rendering
 * - Memory: O(k) where k = visible rows (typically 50)
 * 
 * @accessibility
 * - ARIA labels for screen readers
 * - Keyboard navigation (Tab, Arrow keys, Space, Enter)
 * - High contrast mode support
 * - Focus management for modal interactions
 * 
 * @stateManagement
 * - Server state: React Query with 5-minute cache
 * - UI state: Component-level useState/useReducer
 * - Selection state: Context API for cross-component access
 * 
 * @example
 * ```tsx
 * <DataTable
 *   data={users}
 *   columns={columnDefs}
 *   onRowSelect={(row) => console.log('Selected:', row)}
 *   enableRealTimeUpdates
 *   virtualScrollThreshold={100}
 * />
 * ```
 * 
 * @props {DataTableProps}
 * 
 * @hooks
 * - useVirtualScroll: Manages virtual row rendering
 * - useTableSort: Handles multi-column sorting
 * - useWebSocketUpdates: Subscribes to real-time changes
 * - useKeyboardNavigation: Manages keyboard interactions
 * 
 * @cssModules
 * - DataTable.module.css: Component-specific styles
 * - Uses CSS Grid for layout (fallback to flexbox)
 * 
 * @testing
 * - Unit tests: DataTable.test.tsx
 * - Integration: /e2e/data-table.spec.ts
 * - Visual regression: /visual/data-table.spec.ts
 * 
 * @browserSupport
 * - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
 * - Graceful degradation for IE11 (no virtual scroll)
 * 
 * @relatedComponents
 * - TableHeader: Sortable column headers
 * - TableRow: Individual row component
 * - TablePagination: Pagination controls
 * - TableFilters: Advanced filtering UI
 * 
 * @figmaDesign https://figma.com/file/abc123/DataTable
 * @storybook https://storybook.company.com/?path=/story/datatable
 */
export const DataTable: FC<DataTableProps> = memo(({
  data,
  columns,
  onRowSelect,
  enableRealTimeUpdates = false,
  virtualScrollThreshold = 100,
  ...props
}) => {
  // PERFORMANCE: Memo heavy computations
  // Recalculates only when columns change, not on every render
  const columnConfig = useMemo(() => 
    processColumnDefinitions(columns),
    [columns]
  );
  
  // PATTERN: Bail out early for edge cases
  // Prevents unnecessary processing and renders cleaner UI
  if (!data || data.length === 0) {
    return <EmptyState message="No data available" />;
  }
  
  // STATE: Separate concerns for better debugging
  // Each piece of state has a single responsibility
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // OPTIMIZATION: Virtual scrolling for large datasets
  // Only renders visible rows + buffer for smooth scrolling
  const shouldVirtualize = data.length > virtualScrollThreshold;
  const {
    virtualRows,
    totalHeight,
    scrollTop,
    handleScroll
  } = useVirtualScroll({
    items: data,
    enabled: shouldVirtualize,
    rowHeight: 48,
    overscan: 5 // Render 5 rows outside viewport for smoother scrolling
  });
  
  // REAL-TIME: WebSocket subscription for live updates
  // Automatically reconnects on connection loss
  useEffect(() => {
    if (!enableRealTimeUpdates) return;
    
    // SUBSCRIPTION: Listen for data changes
    // Uses exponential backoff for reconnection
    const unsubscribe = subscribeToDataUpdates({
      channel: `table.${props.tableId}`,
      onUpdate: (update) => {
        // OPTIMIZATION: Batch updates to prevent excessive re-renders
        // Accumulates updates for 100ms before applying
        batchedUpdateHandler(update);
      },
      onError: (error) => {
        // FALLBACK: Show stale data with warning
        console.error('Real-time update failed:', error);
        showNotification('Using cached data. Refresh to get latest.');
      }
    });
    
    return () => {
      // CLEANUP: Prevent memory leaks
      unsubscribe();
    };
  }, [enableRealTimeUpdates, props.tableId]);
  
  return (
    <div className={styles.container} role="table" aria-label="Data table">
      {/* Component JSX */}
    </div>
  );
});

// DISPLAY NAME: Helps with debugging in React DevTools
DataTable.displayName = 'DataTable';

API Route Comments
NextJS API Route Pattern
typescript/**
 * API Route: /api/users/[id]/profile
 * 
 * @endpoint GET, PUT, DELETE
 * @authentication Required (JWT Bearer token)
 * @rateLimit 100 requests per minute per user
 * 
 * @description
 * Manages user profile data with automatic caching and validation.
 * 
 * @requests
 * GET /api/users/[id]/profile
 *   - Returns user profile data
 *   - Cached for 5 minutes
 *   - Response: UserProfile | 404
 * 
 * PUT /api/users/[id]/profile
 *   - Updates user profile
 *   - Validates against UserProfileSchema
 *   - Triggers profile.updated event
 *   - Response: UpdatedProfile | 400 | 403
 * 
 * DELETE /api/users/[id]/profile
 *   - Soft deletes user profile
 *   - Schedules hard delete after 30 days
 *   - Response: 204 | 403 | 404
 * 
 * @middleware
 * 1. cors() - CORS headers
 * 2. authenticate() - JWT validation
 * 3. authorize() - Permission check
 * 4. rateLimit() - Request throttling
 * 5. validateInput() - Schema validation
 * 
 * @errors
 * - 400: Invalid input data
 * - 401: Missing or invalid authentication
 * - 403: Insufficient permissions
 * - 404: User not found
 * - 429: Rate limit exceeded
 * - 500: Internal server error
 * 
 * @database
 * - Reads: users, profiles tables
 * - Writes: profiles, audit_log tables
 * - Transactions: Used for DELETE operation
 * 
 * @caching
 * - GET responses cached in Redis for 5 minutes
 * - Cache invalidated on PUT/DELETE
 * - Cache key: `profile:${userId}`
 * 
 * @monitoring
 * - Metric: api.users.profile.[method].duration
 * - Metric: api.users.profile.[method].status.[code]
 * - Alert: Error rate > 1% or latency > 500ms
 * 
 * @example
 * ```bash
 * # Get profile
 * curl -H "Authorization: Bearer $TOKEN" \
 *   https://api.example.com/api/users/123/profile
 * 
 * # Update profile
 * curl -X PUT -H "Authorization: Bearer $TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{"bio": "New bio"}' \
 *   https://api.example.com/api/users/123/profile
 * ```
 * 
 * @changelog
 * - 2024-01-15: Added profile picture upload support
 * - 2024-01-10: Implemented soft delete
 * - 2024-01-05: Initial implementation
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS: Required for browser-based API access
  // Allows specific origins in production, * in development
  await cors(req, res);
  
  // ROUTING: Method-based request handling
  // Each method has its own error boundary and monitoring
  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        // METHOD NOT ALLOWED: Return allowed methods
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ 
          error: 'Method not allowed',
          allowedMethods: ['GET', 'PUT', 'DELETE']
        });
    }
  } catch (error) {
    // ERROR BOUNDARY: Catch all unhandled errors
    // Logs to Sentry and returns safe error message
    return handleApiError(error, req, res);
  }
}

Complex Logic Comments
Pattern for Complex Algorithms
typescript/**
 * Implements the Raft consensus algorithm for distributed state management.
 * 
 * @algorithm Raft Consensus
 * @complexity Time: O(n log n) for leader election, Space: O(n)
 * @reference https://raft.github.io/raft.pdf
 * 
 * This implementation focuses on:
 * 1. Leader election with randomized timeouts
 * 2. Log replication with consistency guarantees
 * 3. Safety properties (Election Safety, Leader Append-Only, etc.)
 * 
 * IMPORTANT: This is a simplified version for our use case.
 * We assume:
 * - Network partitions are temporary (<30s)
 * - Maximum of 7 nodes in the cluster
 * - Messages are not corrupted (only lost or delayed)
 */
function implementRaftConsensus(
  nodes: Node[],
  currentTerm: number,
  logs: LogEntry[]
): ConsensusResult {
  /*
   * PHASE 1: Leader Election
   * 
   * Visual representation of the election process:
   * 
   * Node A (Leader)     Node B            Node C
   *   |                   |                 |
   *   |--heartbeat------->|                 |
   *   |--heartbeat------------------------->|
   *   |                   |                 |
   *   X (fails)           |                 |
   *                       |                 |
   *                  (timeout)         (timeout)
   *                       |                 |
   *                       |<---vote request-|
   *                       |---vote granted->|
   *                       |                 |
   *                  (new leader)           |
   * 
   * The election timeout is randomized between 150-300ms to prevent
   * split votes where multiple candidates request votes simultaneously.
   */
  
  // STEP 1.1: Check if current node should start election
  // Timeout is randomized to prevent synchronized elections
  const electionTimeout = 150 + Math.random() * 150; // 150-300ms
  
  if (timeSinceLastHeartbeat > electionTimeout) {
    // TRANSITION: Follower -> Candidate
    // Increment term and vote for self
    currentTerm++;
    votedFor = self.id;
    
    // STEP 1.2: Request votes from all other nodes
    // Parallel requests with timeout for better performance
    const voteRequests = nodes
      .filter(node => node.id !== self.id)
      .map(node => requestVoteWithTimeout(node, currentTerm, lastLogIndex));
    
    // STEP 1.3: Count votes (including self-vote)
    // Majority is required: floor(n/2) + 1
    const votes = await Promise.allSettled(voteRequests);
    const grantedVotes = votes.filter(v => 
      v.status === 'fulfilled' && v.value.voteGranted
    ).length + 1; // +1 for self-vote
    
    const majority = Math.floor(nodes.length / 2) + 1;
    
    if (grantedVotes >= majority) {
      // TRANSITION: Candidate -> Leader
      // Start sending heartbeats immediately
      becomeLeader();
    } else {
      // TRANSITION: Candidate -> Follower
      // Another node won the election or split vote
      becomeFollower();
    }
  }
  
  /*
   * PHASE 2: Log Replication
   * 
   * The leader ensures all followers have consistent logs:
   * 
   * Leader Log:  [A] [B] [C] [D] [E]
   *                           ^
   *                      commitIndex
   * 
   * Follower 1:  [A] [B] [C] [D]     <- needs [E]
   * Follower 2:  [A] [B]             <- needs [C], [D], [E]
   * 
   * The leader maintains nextIndex[] for each follower,
   * tracking the next log entry to send to that follower.
   */
  
  if (state === 'leader') {
    // STEP 2.1: Send AppendEntries to all followers
    // This serves as both heartbeat and log replication
    
    for (const follower of followers) {
      // OPTIMIZATION: Only send new entries if needed
      // nextIndex[follower] tracks what to send next
      const entriesToSend = logs.slice(nextIndex[follower.id]);
      
      if (entriesToSend.length > 0 || shouldSendHeartbeat()) {
        // ASYNC: Don't block on individual followers
        // Slow followers shouldn't impact the leader
        sendAppendEntries(follower, entriesToSend)
          .then(response => {
            if (response.success) {
              // UPDATE: Advance nextIndex and matchIndex
              nextIndex[follower.id] += entriesToSend.length;
              matchIndex[follower.id] = nextIndex[follower.id] - 1;
              
              // CHECK: Can we advance commitIndex?
              // Entry is committed once replicated to majority
              updateCommitIndex();
            } else {
              // BACKTRACK: Follower's log is inconsistent
              // Decrement nextIndex and retry
              nextIndex[follower.id] = Math.max(1, nextIndex[follower.id] - 1);
            }
          })
          .catch(error => {
            // NETWORK: Handle transient failures
            // Follower might be temporarily unreachable
            markFollowerAsUnreachable(follower);
          });
      }
    }
  }
  
  /*
   * PHASE 3: Safety Guarantees
   * 
   * Critical invariants that must always hold:
   * 1. Election Safety: At most one leader per term
   * 2. Leader Append-Only: Leader never overwrites its log
   * 3. Log Matching: If two logs contain same entry, logs are identical up to that entry
   * 4. Leader Completeness: Committed entries appear in all future leaders' logs
   * 5. State Machine Safety: If entry applied at index, no different entry at same index
   */
  
  // INVARIANT CHECK: Validate safety properties
  // These assertions help catch bugs during development
  assert(leadersPerTerm[currentTerm] <= 1, 'Multiple leaders in same term');
  assert(isMonotonicallyIncreasing(logs), 'Leader overwrote its log');
  assert(logsAreConsistent(logs, followers), 'Log matching property violated');
  
  return {
    state,
    term: currentTerm,
    leader: state === 'leader' ? self.id : currentLeader,
    committed: commitIndex,
    logs
  };
}

Type/Interface Comments
TypeScript Type Documentation
typescript/**
 * Represents a user in the system with authentication and profile data.
 * 
 * @interface User
 * @extends {BaseEntity}
 * 
 * @description
 * Core user model that connects to all user-related features.
 * This is the primary entity returned by authentication services.
 * 
 * @databaseTable users
 * @indexedFields id, email, username
 * @uniqueConstraints email, username
 * 
 * @validation
 * - email: Must be valid email format
 * - username: 3-20 characters, alphanumeric + underscore
 * - password: Minimum 8 characters, never returned in API responses
 * 
 * @relationships
 * - Has many: posts, comments, sessions
 * - Has one: profile, preferences
 * - Belongs to: organization (optional)
 * 
 * @serialization
 * - Password field excluded from JSON
 * - Timestamps converted to ISO 8601
 * - Virtual fields computed on-demand
 */
export interface User extends BaseEntity {
  /**
   * Unique identifier for the user.
   * @format UUID v4
   * @example "123e4567-e89b-12d3-a456-426614174000"
   * @readonly
   */
  id: string;
  
  /**
   * User's email address (unique).
   * @format email
   * @example "user@example.com"
   * @indexed
   * @sensitive PII - requires encryption at rest
   */
  email: string;
  
  /**
   * Display username (unique).
   * @pattern ^[a-zA-Z0-9_]{3,20}$
   * @example "john_doe"
   * @indexed
   * @mutable Once per 30 days
   */
  username: string;
  
  /**
   * Hashed password - never exposed via API.
   * @format bcrypt hash
   * @hidden
   * @security Hashed with bcrypt, cost factor 12
   */
  password?: never; // Type trick to prevent accidental exposure
  
  /**
   * User's role determining permissions.
   * @default 'user'
   * @allowedValues 'user' | 'moderator' | 'admin' | 'super_admin'
   * @authorization Required role: admin to modify
   */
  role: UserRole;
  
  /**
   * Account verification status.
   * @default false
   * @workflow Set to true after email verification
   */
  emailVerified: boolean;
  
  /**
   * Two-factor authentication status.
   * @default false
   * @security When true, requires TOTP for login
   */
  twoFactorEnabled: boolean;
  
  /**
   * Account status flags.
   * @nestedObject
   */
  status: {
    /**
     * Whether the account is active.
     * @default true
     * @impact When false, all authentication attempts fail
     */
    isActive: boolean;
    
    /**
     * Whether the user is banned.
     * @default false
     * @workflow Requires admin action with reason
     */
    isBanned: boolean;
    
    /**
     * Reason for ban if applicable.
     * @nullable
     * @example "Violation of terms of service - spam"
     */
    banReason?: string;
    
    /**
     * Account lock status (too many failed logins).
     * @default false
     * @autoReset After 30 minutes
     */
    isLocked: boolean;
  };
  
  /**
   * User metadata for analytics and features.
   * @flexible Additional properties allowed
   */
  metadata: {
    /**
     * User's last known IP address.
     * @format IPv4 or IPv6
     * @sensitive PII - requires compliance with privacy laws
     */
    lastIp?: string;
    
    /**
     * User's preferred language.
     * @format ISO 639-1
     * @default 'en'
     * @example 'es', 'fr', 'de'
     */
    language: string;
    
    /**
     * User's timezone.
     * @format IANA timezone
     * @default 'UTC'
     * @example 'America/New_York'
     */
    timezone: string;
    
    /**
     * Custom attributes for feature flags.
     * @flexible
     * @example { "beta_features": true, "theme": "dark" }
     */
    [key: string]: unknown;
  };
  
  /**
   * Subscription details if applicable.
   * @nullable For free tier users
   * @relationship References subscriptions table
   */
  subscription?: {
    /**
     * Subscription tier.
     * @enum 'free' | 'basic' | 'premium' | 'enterprise'
     */
    tier: SubscriptionTier;
    
    /**
     * Subscription expiry date.
     * @format ISO 8601
     * @nullable For lifetime subscriptions
     */
    expiresAt?: Date;
    
    /**
     * Whether subscription auto-renews.
     * @default true
     */
    autoRenew: boolean;
  };
  
  /**
   * Virtual field - calculated at runtime.
   * @virtual
   * @computed From metadata and activity
   */
  readonly riskScore?: number;
  
  /**
   * Account creation timestamp.
   * @format ISO 8601
   * @readonly
   * @indexed For user cohort analysis
   */
  createdAt: Date;
  
  /**
   * Last update timestamp.
   * @format ISO 8601
   * @autoUpdate On any field change
   */
  updatedAt: Date;
  
  /**
   * Soft deletion timestamp.
   * @format ISO 8601
   * @nullable
   * @softDelete User data retained for 30 days
   */
  deletedAt?: Date;
}

/**
 * Type guard to check if an object is a valid User.
 * 
 * @param obj - Object to validate
 * @returns True if object matches User interface
 * 
 * @example
 * if (isUser(data)) {
 *   // TypeScript now knows data is User type
 *   console.log(data.email);
 * }
 */
export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    'username' in obj
  );
}

/**
 * Creates a safe user object for API responses.
 * Removes sensitive fields and adds computed properties.
 * 
 * @param user - Complete user object from database
 * @returns Sanitized user safe for client
 * 
 * @transforms
 * - Removes: password, metadata.lastIp
 * - Adds: displayName, avatarUrl
 * - Computes: riskScore
 */
export function sanitizeUser(user: User): SafeUser {
  // Implementation...
}

File Headers
Standard File Header Pattern
typescript/**
 * @file services/payment/stripe-handler.ts
 * @module PaymentService
 * @version 2.3.0
 * 
 * @description
 * Stripe payment processing service with PCI compliance.
 * Handles payment intents, subscriptions, and webhooks.
 * 
 * @architecture
 * Part of the payment microservice architecture:
 * - Integrates with Stripe API v2023-10-16
 * - Publishes events to payment.events queue
 * - Stores transaction logs in PostgreSQL
 * 
 * @dependencies
 * - stripe: ^14.0.0 - Stripe Node.js SDK
 * - @company/logger: ^1.0.0 - Internal logging
 * - bullmq: ^4.0.0 - Job queue for retries
 * 
 * @environment
 * Required environment variables:
 * - STRIPE_SECRET_KEY: Stripe API key
 * - STRIPE_WEBHOOK_SECRET: Webhook endpoint secret
 * - PAYMENT_QUEUE_URL: Redis URL for job queue
 * 
 * @security
 * - All card data handled by Stripe (PCI compliance)
 * - Webhook signatures verified
 * - API keys stored in secure vault
 * - Rate limiting: 100 requests per minute
 * 
 * @monitoring
 * - DataDog APM traces all transactions
 * - Custom metrics: payment.success.rate, payment.latency
 * - Alerts: Failed payment rate > 5%
 * 
 * @testing
 * - Unit tests: /tests/unit/stripe-handler.test.ts
 * - Integration tests: /tests/integration/payments.test.ts
 * - Test cards: https://stripe.com/docs/testing
 * 
 * @maintainers
 * - Payment Team: payments@company.com
 * - On-call: #payments-oncall Slack channel
 * 
 * @changelog
 * - 2.3.0 (2024-01-15): Added subscription pause feature
 * - 2.2.0 (2024-01-01): Migrated to Payment Intents API
 * - 2.1.0 (2023-12-15): Added webhook retry logic
 * 
 * @license MIT
 * @copyright 2024 Company Inc.
 */

Special Claude Markers
Patterns Claude Code Recognizes
typescript// Claude-specific markers that improve AI understanding

/**
 * @claudeContext
 * This service is critical for revenue. Any changes need careful testing.
 * Common issues: webhook timeouts, duplicate charges, currency conversion.
 * Always check the payment-service channel in Slack before deploying.
 */

// FIXME(claude): This needs refactoring but maintains backwards compatibility
// The old implementation is inefficient but changing it breaks client v1

// TODO(priority:high): Implement rate limiting before public launch
// Without this, we're vulnerable to abuse

// HACK: Temporary workaround for Stripe API bug
// Remove this once Stripe fixes the issue (tracking: STRIPE-1234)
// @removeBy 2024-06-01

// BRITTLE: This relies on undocumented Stripe behavior
// Test thoroughly if upgrading Stripe SDK

// ASSUMPTION: Users always have a valid email
// This breaks for social login without email permission

// GOTCHA: Order matters here! 
// Must validate before sanitizing or XSS is possible

// PATTERN: Repository pattern for data access
// Allows easy mocking in tests and future database migration

// ANTIPATTERN: Don't copy this approach
// Only works due to legacy constraints, use ServiceX instead

// PERF: Cache this expensive computation
// Reduces API calls from O(n) to O(1)

// SECURITY: Never log sensitive data
// PII must be redacted before any console.log or error message

// DEPRECATED: Use newPaymentMethod() instead
// @deprecated since 2.0.0 - will be removed in 3.0.0
// @migration See migration guide: /docs/migrations/v3.md

// CONTEXT: This weird code exists because [explanation]
// Don't "fix" it without understanding the business requirement

// WORKAROUND: NodeJS bug #12345
// Remove when we upgrade to Node 20+

// INVARIANT: This condition must always be true
// If this fails, the entire system is in an invalid state

// SIDE EFFECT: This also updates the cache
// Must be called even if result is not used

// PURE: This function has no side effects
// Safe to call multiple times or skip entirely

// IDEMPOTENT: Calling multiple times is safe
// Used by retry logic and distributed systems

// BLOCKING: This is a synchronous operation
// Consider moving to background job for large datasets

// ASYNC TRAP: Don't forget to await this!
// Missing await causes silent failures

// RACE CONDITION: Needs mutex/lock
// Multiple requests can cause data corruption

// MEMORY LEAK: Must cleanup listeners
// Forgetting disposal causes gradual memory growth

// HOT PATH: Optimized for performance
// This code runs thousands of times per second

Anti-Patterns to Avoid
Comments That Don't Help Claude (or Humans)
typescript// ❌ BAD: Obvious comments that add no value
let count = 0; // Initialize count to 0
count++; // Increment count

// ❌ BAD: Outdated comments that mislead
// Sends email to user
await sendSlackNotification(user); // Function was changed but comment wasn't

// ❌ BAD: Vague comments without context  
// Fix the thing
if (x > 10) { // Magic number without explanation
  doSomething();
}

// ❌ BAD: Comments that should be code
// Check if user is admin or moderator
if (user.role === 'admin' || user.role === 'moderator') {
  // Better: Extract to function isPrivilegedUser()
}

// ❌ BAD: Commented-out code without explanation
// getUserById(id);
// processUser(user);
// saveUser(user);

// ❌ BAD: TODOs without ownership or timeline
// TODO: Fix this
// TODO: Optimize

// ❌ BAD: Emotional comments
// This is stupid but it works
// I hate this code

// ❌ BAD: Redundant JSDoc
/**
 * Gets user by id
 * @param id - The id
 * @returns The user
 */
function getUserById(id: string): User {
Better Alternatives
typescript// ✅ GOOD: Explain the why
// Start at 0 because array indices are 0-based and we use this
// to track position in the pagination cursor
let cursorPosition = 0;

// ✅ GOOD: Document the business logic
// Increment by 2 because we're processing pairs of items
// (original + translated version)
cursorPosition += 2;

// ✅ GOOD: Explain magic numbers
const MAX_RETRY_ATTEMPTS = 10; // Based on P99 latency of external service

// ✅ GOOD: Extract complex conditions
const isPrivilegedUser = (user: User): boolean => {
  return user.role === 'admin' || user.role === 'moderator';
};

if (isPrivilegedUser(user)) {
  // Now the code is self-documenting
}

// ✅ GOOD: Explain why code is commented out
// REMOVED: Direct user fetch caused N+1 queries
// Now handled by batch loader in parent component
// Keeping for reference until migration complete (Jan 2024)
// getUserById(id);

// ✅ GOOD: Actionable TODOs
// TODO(john): Implement rate limiting by Feb 1
// Tracking in JIRA: PROJ-1234

// ✅ GOOD: Professional explanation
// CONSTRAINT: Legacy API requires this specific format
// Modernizing would break mobile app v1.x (30% of users)

Summary: The 10 Commandments for Claude-Friendly Comments

Explain intentions, not mechanics - Claude can read code
Document assumptions and constraints - What can't change?
Describe relationships and dependencies - How parts connect
Mark complexity and gotchas - Where to pay attention
Provide examples for complex APIs - Show typical usage
Include architecture context - Where this fits in the system
Document security and performance implications - Critical concerns
Add testing and debugging hints - How to verify it works
Use consistent markers - TODO, FIXME, HACK, etc.
Keep comments updated - Outdated comments are worse than none

By following these patterns, Claude Code will better understand your codebase's context, intentions, and constraints, leading to more accurate and helpful assistance.