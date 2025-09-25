# Unified Logging System

A comprehensive logging system with Sentry integration, PII redaction, and backward compatibility.

## US-008: Setup rollout and observability

### Features

✅ **US-001**: Install Sentry SDK packages
✅ **US-002**: Implement client Sentry integration
✅ **US-003**: Implement server Sentry integration
✅ **US-004**: Implement PII redaction and compliance
✅ **US-005**: Create backward-compatible adapters
✅ **US-006**: Migrate existing call sites
✅ **US-007**: Add testing and QA
✅ **US-008**: Setup rollout and observability

## Quick Start

### Environment Setup

Set the following environment variables for Sentry integration:

```bash
# Required for Sentry integration
SENTRY_DSN=your-sentry-dsn-here

# Optional - defaults shown
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=1.0.0
```

### Client-side Usage

```typescript
import { createClientLogger } from './logging'

// Create a logger
const logger = createClientLogger({
  minLevel: 'info',
  enableConsole: true,
  enableSentry: true,
  tags: ['frontend', 'user-action']
})

// Log messages
logger.info('userAction', 'button-click', {
  buttonId: 'submit-form',
  userId: '123'
})

// Log errors
logger.error('apiError', 'fetch-failed', new Error('Network timeout'), {
  url: '/api/users',
  retryCount: 3
})
```

### Server-side Usage

```typescript
import { createServerLogger } from './logging'

const logger = createServerLogger({
  minLevel: 'info',
  enableConsole: true,
  enableSentry: true,
  enableFileLogging: true,
  logFilePath: './logs/app.log',
  tags: ['backend', 'api']
})

// Log with context
logger.setContext({ requestId: 'req-123', userId: 'user-456' })
logger.info('apiRequest', 'user-created', {
  endpoint: '/api/users',
  method: 'POST',
  statusCode: 201
})
```

### Legacy Compatibility

For backward compatibility with existing logging patterns:

```typescript
import { createLegacyLogger, getGlobalLogger } from './logging'

// Drop-in replacement for existing loggers
const logger = createLegacyLogger('my-component')
logger.info('User logged in', { userId: '123' })
logger.error('Database error', error, { query: 'SELECT * FROM users' })

// Express middleware
app.use(logger.middleware())

// Global logger
const globalLogger = getGlobalLogger()
globalLogger.warn('System overload detected', { cpuUsage: 95 })
```

## PII Redaction

The system automatically redacts personally identifiable information:

### Automatically Redacted Patterns

- **Email addresses**: `user@example.com` → `[EMAIL_REDACTED]`
- **Phone numbers**: `555-123-4567` → `[PHONE_REDACTED]`
- **Social Security Numbers**: `123-45-6789` → `[SSN_REDACTED]`
- **Credit card numbers**: `4532-1234-5678-9012` → `[CREDITCARD_REDACTED]`
- **API keys**: Long alphanumeric strings → `[APIKEY_REDACTED]`

### Automatically Redacted Field Names

Fields with sensitive names are redacted regardless of content:
- `password`, `secret`, `token`, `apiKey`
- `email`, `phone`, `ssn`, `address`
- `name`, `firstName`, `lastName`
- And more...

### Custom PII Redaction

```typescript
import { redactPII } from './logging'

const sensitiveData = {
  user: {
    email: 'user@example.com',
    password: 'secret123',
    profile: {
      phone: '555-1234',
      address: '123 Main St'
    }
  }
}

const redactedData = redactPII(sensitiveData)
// All sensitive fields and patterns are automatically redacted
```

## Configuration Options

### Client Logger Options

```typescript
interface ClientLoggerConfig {
  minLevel?: LogLevel           // Minimum log level (default: 'info')
  enableConsole?: boolean       // Console output (default: true)
  enableSentry?: boolean        // Sentry integration (default: true)
  tags?: string[]              // Custom tags for categorization
}
```

### Server Logger Options

```typescript
interface ServerLoggerConfig {
  minLevel?: LogLevel           // Minimum log level (default: 'info')
  enableConsole?: boolean       // Console output (default: true)
  enableSentry?: boolean        // Sentry integration (default: true)
  enableFileLogging?: boolean   // File logging (default: false)
  logFilePath?: string         // Log file path
  tags?: string[]              // Custom tags for categorization
}
```

## Testing

The logging system includes comprehensive tests:

```bash
# Run all logging tests
npm test src/logging/__tests__

# Run specific test suites
npm test src/logging/__tests__/piiRedaction.test.ts
npm test src/logging/__tests__/loggerFactory.test.ts
npm test src/logging/__tests__/legacyLogger.test.ts
```

## Architecture

### Core Components

- **MultiSinkLogger**: Central logging orchestrator
- **LogSink**: Interface for different output destinations
- **ConsoleSink**: Console output with formatting
- **ClientFileSink**: Browser localStorage logging
- **ServerFileSink**: Node.js file system logging
- **SentryBrowserSink**: Browser Sentry integration
- **SentryNodeSink**: Node.js Sentry integration

### PII Redaction System

- **Pattern-based redaction**: Regex patterns for common PII
- **Field name detection**: Sensitive field names are redacted
- **Recursive processing**: Deep object and array traversal
- **Size limits**: Large objects are truncated for performance

### Backward Compatibility

- **LegacyLogger**: Drop-in replacement for existing loggers
- **ConsoleAdapter**: Enhanced console methods
- **Factory functions**: Easy migration from existing patterns

## Monitoring and Observability

### Key Metrics to Monitor

1. **Log Volume**: Track logs per minute/hour
2. **Error Rates**: Monitor error log frequency
3. **Sentry Integration**: Ensure events reach Sentry
4. **Performance**: Monitor logging overhead
5. **PII Redaction**: Verify sensitive data is redacted

### Health Checks

The system provides health check utilities:

```typescript
import { createClientLogger } from './logging'

const logger = createClientLogger()

// Test logging functionality
try {
  logger.info('health-check', 'system-status', {
    timestamp: new Date(),
    status: 'healthy'
  })
  console.log('✅ Logging system healthy')
} catch (error) {
  console.error('❌ Logging system unhealthy:', error)
}
```

### Rollout Strategy

1. **Phase 1**: Deploy with existing logging intact
2. **Phase 2**: Gradually migrate high-traffic components
3. **Phase 3**: Monitor error rates and performance
4. **Phase 4**: Complete migration and remove old logging
5. **Phase 5**: Fine-tune configuration based on usage patterns

## Troubleshooting

### Common Issues

**Sentry not receiving events:**
- Check `SENTRY_DSN` environment variable
- Verify network connectivity to Sentry
- Check browser console for Sentry errors

**Console not showing logs:**
- Verify `enableConsole: true` in logger config
- Check minimum log level settings
- Ensure logger is properly instantiated

**Performance issues:**
- Review log volume and frequency
- Consider increasing minimum log level
- Monitor large object redaction

**PII not being redacted:**
- Verify sensitive field names in `SENSITIVE_FIELD_NAMES`
- Check regex patterns in `PII_PATTERNS`
- Test with `redactPII()` function directly

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
const logger = createClientLogger({
  minLevel: 'debug',
  enableConsole: true
})

// Debug logs will now appear in console
logger.debug('system', 'debug-info', {
  component: 'user-auth',
  action: 'login-attempt'
})
```

## Migration Guide

### From Console Logging

```typescript
// Before
console.log('User logged in:', { userId: '123' })
console.error('Database error:', error)

// After
import { getGlobalLogger } from './logging'
const logger = getGlobalLogger()

logger.info('User logged in', { userId: '123' })
logger.error('Database error', error)
```

### From Custom Logging

```typescript
// Before
import { myCustomLogger } from './myLogger'
myCustomLogger.logInfo('component', 'User action', data)

// After
import { createLegacyLogger } from './logging'
const logger = createLegacyLogger('component')
logger.info('User action', data)
```

## Contributing

### Adding New Sinks

1. Implement `LogSink` interface
2. Add configuration options
3. Update factory functions
4. Add tests
5. Update documentation

### Extending PII Redaction

1. Add patterns to `PII_PATTERNS`
2. Add field names to `SENSITIVE_FIELD_NAMES`
3. Add test cases
4. Update documentation

---

For questions or issues, please refer to the test files for usage examples or create an issue in the project repository.