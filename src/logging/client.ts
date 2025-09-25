/**
 * Client-side logging exports - browser compatible only
 * US-008: Setup rollout and observability - Browser compatibility fix
 */

// Core types and utilities
export * from './types'
export { MultiSinkLogger } from './MultiSinkLogger'

// Client-safe sinks only
export { ConsoleSink } from './sinks/ConsoleSink'
export { ClientFileSink } from './sinks/ClientFileSink'
export { SentryBrowserSink } from './sinks/SentryBrowserSink'

// Client-safe factories and initialization
export * from './factories/clientLoggerFactory'
export * from './initSentryClient'

// Utilities and adapters (client-safe)
export * from './piiRedaction'
export * from './adapters/consoleAdapter'

// Configuration and monitoring (shared)
export * from './config'
export * from './monitoring'

// Legacy logger with client-only functionality
export { createLegacyLogger } from './adapters/legacyLogger'