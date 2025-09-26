/**
 * Server-side logging exports - Node.js specific
 * US-008: Setup rollout and observability - Server-side modules
 */

// Core types and utilities
export * from './types'
export { MultiSinkLogger } from './MultiSinkLogger'

// All sinks (server can use both client and server sinks)
export { ConsoleSink } from './sinks/ConsoleSink'
export { ClientFileSink } from './sinks/ClientFileSink'
export { ServerFileSink } from './sinks/ServerFileSink'
export { SentryBrowserSink } from './sinks/SentryBrowserSink'
export { SentryNodeSink } from './sinks/SentryNodeSink'

// All factories and initialization
export * from './factories/clientLoggerFactory'
export * from './factories/serverLoggerFactory'
export * from './initSentryClient'
export * from './initSentryNode'

// Utilities and adapters
export * from './adapters/legacyLogger'
export * from './adapters/consoleAdapter'

// Configuration and monitoring
export * from './config'
export * from './monitoring'