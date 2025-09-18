/**
 * Application entry point
 * - Mounts the React app into the DOM element with id="root" defined in `index.html`.
 * - Keeps the boot logic minimal; all app logic resides in `src/App.jsx`.
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { ToastProvider } from './features/notifications/ToastProvider.tsx'
import { QueryProvider } from './providers/QueryProvider.tsx'

// Grab the root container from `index.html`. If this returns null, verify the element id.
const container = document.getElementById('root')

// Initialize a concurrent-mode root (React 18+) and render the top-level <App/> component.
createRoot(container).render(
  <ErrorBoundary>
    <QueryProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryProvider>
  </ErrorBoundary>
)
