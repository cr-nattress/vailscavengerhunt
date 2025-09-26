/**
 * Configuration management for the logging system
 * US-008: Setup rollout and observability
 */

import { LogLevel } from './types'

export interface LoggingSystemConfig {
  // Environment detection
  environment: 'development' | 'staging' | 'production'

  // Feature flags
  features: {
    sentryIntegration: boolean
    fileLogging: boolean
    consoleLogging: boolean
    monitoring: boolean
  }

  // Log levels by environment
  logLevels: {
    client: LogLevel
    server: LogLevel
  }

  // Sentry configuration
  sentry: {
    enabled: boolean
    dsn?: string
    environment?: string
    release?: string
    tracesSampleRate: number
  }

  // Performance settings
  performance: {
    maxLogSize: number
    maxArrayLength: number
    maxObjectDepth: number
    flushIntervalMs: number
  }

  // Rollout configuration
  rollout: {
    enabledComponents: string[]
    rolloutPercentage: number
    canaryUsers: string[]
  }
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: LoggingSystemConfig = {
  environment: 'development',

  features: {
    sentryIntegration: true,
    fileLogging: false,
    consoleLogging: true,
    monitoring: true
  },

  logLevels: {
    client: LogLevel.INFO,
    server: LogLevel.INFO
  },

  sentry: {
    enabled: true,
    tracesSampleRate: 0.1
  },

  performance: {
    maxLogSize: 10000,
    maxArrayLength: 100,
    maxObjectDepth: 10,
    flushIntervalMs: 5000
  },

  rollout: {
    enabledComponents: [],
    rolloutPercentage: 100,
    canaryUsers: []
  }
}

/**
 * Environment-specific configurations
 */
export const ENVIRONMENT_CONFIGS: Record<string, Partial<LoggingSystemConfig>> = {
  development: {
    logLevels: {
      client: LogLevel.DEBUG,
      server: LogLevel.DEBUG
    },
    features: {
      sentryIntegration: false,
      fileLogging: true,
      consoleLogging: true,
      monitoring: true
    },
    sentry: {
      enabled: false,
      tracesSampleRate: 0
    }
  },

  staging: {
    logLevels: {
      client: LogLevel.INFO,
      server: LogLevel.DEBUG
    },
    features: {
      sentryIntegration: true,
      fileLogging: true,
      consoleLogging: true,
      monitoring: true
    },
    sentry: {
      enabled: true,
      tracesSampleRate: 0.5
    },
    rollout: {
      enabledComponents: [],
      rolloutPercentage: 50,
      canaryUsers: []
    }
  },

  production: {
    logLevels: {
      client: LogLevel.WARN,
      server: LogLevel.INFO
    },
    features: {
      sentryIntegration: true,
      fileLogging: true,
      consoleLogging: false,
      monitoring: true
    },
    sentry: {
      enabled: true,
      tracesSampleRate: 0.1
    },
    rollout: {
      enabledComponents: [],
      rolloutPercentage: 100,
      canaryUsers: []
    }
  }
}

/**
 * Current configuration instance
 */
let currentConfig: LoggingSystemConfig = { ...DEFAULT_CONFIG }

/**
 * Load configuration from environment variables and overrides
 */
export function loadConfig(overrides: Partial<LoggingSystemConfig> = {}): LoggingSystemConfig {
  // Browser-safe environment detection
  const isBrowser = typeof window !== 'undefined'
  const environment = isBrowser ?
    ((import.meta as any)?.env?.MODE || 'development') :
    (process?.env?.NODE_ENV || 'development')
  const envConfig = ENVIRONMENT_CONFIGS[environment] || {}

  // Merge configurations: defaults -> environment -> overrides
  currentConfig = {
    ...DEFAULT_CONFIG,
    ...envConfig,
    ...overrides,
    environment,

    // Handle nested objects properly
    features: {
      ...DEFAULT_CONFIG.features,
      ...envConfig.features,
      ...overrides.features
    },

    logLevels: {
      ...DEFAULT_CONFIG.logLevels,
      ...envConfig.logLevels,
      ...overrides.logLevels
    },

    sentry: {
      ...DEFAULT_CONFIG.sentry,
      ...envConfig.sentry,
      ...overrides.sentry,
      dsn: isBrowser ?
        (/** @type {any} */(import.meta))?.env?.VITE_SENTRY_DSN :
        process?.env?.SENTRY_DSN,
      environment: isBrowser ?
        ((/** @type {any} */(import.meta))?.env?.VITE_SENTRY_ENVIRONMENT || environment) :
        (process?.env?.SENTRY_ENVIRONMENT || environment),
      release: isBrowser ?
        ((/** @type {any} */(import.meta))?.env?.VITE_SENTRY_RELEASE || '1.0.0') :
        (process?.env?.SENTRY_RELEASE || '1.0.0')
    },

    performance: {
      ...DEFAULT_CONFIG.performance,
      ...envConfig.performance,
      ...overrides.performance
    },

    rollout: {
      ...DEFAULT_CONFIG.rollout,
      ...envConfig.rollout,
      ...overrides.rollout
    }
  }

  return currentConfig
}

/**
 * Get current configuration
 */
export function getConfig(): LoggingSystemConfig {
  return currentConfig
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof LoggingSystemConfig['features']): boolean {
  return currentConfig.features[feature]
}

/**
 * Check if component is enabled for rollout
 */
export function isComponentEnabled(componentName: string): boolean {
  const { enabledComponents, rolloutPercentage } = currentConfig.rollout

  // If specific components are listed, check if this one is included
  if (enabledComponents.length > 0) {
    return enabledComponents.includes(componentName)
  }

  // Otherwise, use rollout percentage
  // Simple hash-based deterministic rollout
  const hash = componentName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)

  return Math.abs(hash) % 100 < rolloutPercentage
}

/**
 * Check if user is in canary group
 */
export function isCanaryUser(userId: string): boolean {
  return currentConfig.rollout.canaryUsers.includes(userId)
}

/**
 * Get log level for environment
 */
export function getLogLevel(context: 'client' | 'server'): LogLevel {
  return currentConfig.logLevels[context]
}

/**
 * Get Sentry configuration
 */
export function getSentryConfig() {
  return currentConfig.sentry
}

/**
 * Validate configuration
 */
export function validateConfig(config: LoggingSystemConfig): string[] {
  const errors: string[] = []

  if (config.sentry.enabled && !config.sentry.dsn) {
    errors.push('Sentry is enabled but no DSN provided')
  }

  if (config.sentry.tracesSampleRate < 0 || config.sentry.tracesSampleRate > 1) {
    errors.push('Sentry traces sample rate must be between 0 and 1')
  }

  if (config.rollout.rolloutPercentage < 0 || config.rollout.rolloutPercentage > 100) {
    errors.push('Rollout percentage must be between 0 and 100')
  }

  if (config.performance.maxLogSize <= 0) {
    errors.push('Max log size must be positive')
  }

  return errors
}

/**
 * Generate configuration summary for debugging
 */
export function getConfigSummary(): string {
  const config = getConfig()
  const validation = validateConfig(config)

  return `
Logging System Configuration
===========================
Environment: ${config.environment}
Validation: ${validation.length === 0 ? 'VALID' : 'ERRORS: ' + validation.join(', ')}

Features:
- Sentry Integration: ${config.features.sentryIntegration ? 'ENABLED' : 'DISABLED'}
- File Logging: ${config.features.fileLogging ? 'ENABLED' : 'DISABLED'}
- Console Logging: ${config.features.consoleLogging ? 'ENABLED' : 'DISABLED'}
- Monitoring: ${config.features.monitoring ? 'ENABLED' : 'DISABLED'}

Log Levels:
- Client: ${LogLevel[config.logLevels.client]}
- Server: ${LogLevel[config.logLevels.server]}

Sentry:
- Enabled: ${config.sentry.enabled}
- DSN: ${config.sentry.dsn ? 'SET' : 'NOT SET'}
- Environment: ${config.sentry.environment}
- Traces Sample Rate: ${config.sentry.tracesSampleRate}

Rollout:
- Percentage: ${config.rollout.rolloutPercentage}%
- Canary Users: ${config.rollout.canaryUsers.length}
- Enabled Components: ${config.rollout.enabledComponents.length || 'ALL'}
  `.trim()
}

// Load initial configuration
loadConfig()