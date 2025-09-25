/**
 * Application entry point
 * - Mounts the React app into the DOM element with id="root" defined in `index.html`.
 * - Keeps the boot logic minimal; all app logic resides in `src/App.jsx`.
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { ToastProvider } from './features/notifications/ToastProvider.tsx'
import { QueryProvider } from './providers/QueryProvider.tsx'
import { maybeInitSentryBrowser } from './logging/client'
import { setupGlobalErrorHandlers } from './utils/globalErrorHandler'

// Initialize Sentry if enabled
const sentryInitialized = maybeInitSentryBrowser()

// Setup global error handlers to capture all errors
setupGlobalErrorHandlers()

// Grab the root container from `index.html`. If this returns null, verify the element id.
const container = document.getElementById('root')

// Create the app component with optional Sentry ErrorBoundary wrapper
const AppWithProviders = () => (
  <QueryProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </QueryProvider>
)

// Initialize a concurrent-mode root (React 18+) and render the top-level <App/> component.
createRoot(container).render(
  <ErrorBoundary>
    {sentryInitialized ? (
      <Sentry.ErrorBoundary fallback={({ error, resetError }) => (
        <div className="min-h-[200px] flex items-center justify-center p-6 bg-red-50 border-2 border-red-200 rounded-lg">
          <div className="text-center max-w-md">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-red-700 text-sm mb-4">
              An unexpected error occurred. This error has been reported.
            </p>
            <button
              onClick={resetError}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}>
        <AppWithProviders />
      </Sentry.ErrorBoundary>
    ) : (
      <AppWithProviders />
    )}
  </ErrorBoundary>
)
