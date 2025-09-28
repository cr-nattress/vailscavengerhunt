/**
 * @file components/ErrorBoundary.tsx
 * @component ErrorBoundary
 * @category Error Handling
 *
 * @description
 * React error boundary component for graceful error handling.
 * Features:
 * - Catches JavaScript errors in child component tree
 * - Displays fallback UI instead of white screen
 * - Generates unique error IDs for tracking
 * - Retry mechanism for transient errors
 * - Development mode shows detailed stack traces
 *
 * @errorHandling
 * - Catches errors during render, lifecycle methods, and constructors
 * - Does NOT catch errors in event handlers, async code, or SSR
 * - Logs errors with unique IDs for debugging
 *
 * @stateManagement
 * - Uses React's getDerivedStateFromError for state updates
 * - componentDidCatch for side effects (logging)
 *
 * @production
 * - Hides stack traces from users
 * - Ready for integration with error reporting services
 * - Displays user-friendly error messages
 *
 * @development
 * - Shows full stack traces for debugging
 * - Preserves component names in error messages
 *
 * @relatedPatterns
 * - withErrorBoundary HOC for easy component wrapping
 * - Custom fallback UI via render props
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Custom error UI renderer.
   * @param error - The caught error object
   * @param retry - Function to reset error state and retry
   * @returns ReactNode to render as fallback UI
   */
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  /**
   * Unique identifier for error tracking.
   * @format `error-{timestamp}-{random}`
   * @example "error-1706234567890-abc123"
   */
  errorId: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    /**
     * PATTERN: Unique error ID generation
     * Combines timestamp + random string for:
     * - Correlation with server logs
     * - Support ticket reference
     * - Preventing ID collisions
     */
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    /**
     * SIDE EFFECT: Error logging and reporting
     * Runs after getDerivedStateFromError for side effects
     * Perfect place for error reporting services
     */
    console.error('ErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack, // React component tree where error occurred
      errorId: this.state.errorId
    });

    // INTEGRATION POINT: Error reporting service
    // Uncomment and configure for production monitoring
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with Sentry, Rollbar, or similar
      // errorReportingService.captureException(error, {
      //   extra: errorInfo,
      //   tags: { errorId: this.state.errorId }
      // });
    }
  }

  handleRetry = (): void => {
    /**
     * RECOVERY: Reset error state to retry rendering
     * Useful for transient errors like:
     * - Network timeouts
     * - Race conditions
     * - Temporary API failures
     */
    this.setState({
      hasError: false,
      error: null,
      errorId: ''
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // FLEXIBILITY: Allow parent to provide custom error UI
      // Useful for context-specific error messages
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // DEFAULT UI: User-friendly error display
      // Balances information with not overwhelming users
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6 bg-red-50 border-2 border-red-200 rounded-lg">
          <div className="text-center max-w-md">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-red-700 text-sm mb-4">
              An unexpected error occurred in this part of the application.
            </p>
            
            {/**
             * DEVELOPMENT ONLY: Detailed error information
             * Hidden in production to prevent information leakage
             * Uses <details> for collapsible view
             */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-red-800 font-medium text-sm">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono text-red-900 overflow-auto">
                  <div className="font-semibold">Message:</div>
                  <div className="mb-2">{this.state.error.message}</div>
                  {this.state.error.stack && (
                    <>
                      <div className="font-semibold">Stack:</div>
                      <pre className="whitespace-pre-wrap break-words">
                        {this.state.error.stack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
            
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              aria-label="Retry and attempt to recover from the error"
            >
              Try Again
            </button>
            
            <p className="text-xs text-red-600 mt-3">
              Error ID: {this.state.errorId}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component for adding error boundaries.
 *
 * @description
 * Wraps any component with error boundary protection.
 * Useful for isolating risky components or third-party libraries.
 *
 * @example
 * ```tsx
 * // Wrap a risky component
 * const SafeChart = withErrorBoundary(ChartComponent, (error, retry) => (
 *   <div>Chart failed to load. <button onClick={retry}>Retry</button></div>
 * ));
 *
 * // Use in JSX
 * <SafeChart data={chartData} />
 * ```
 *
 * @param WrappedComponent - Component to protect with error boundary
 * @param fallback - Optional custom error UI
 * @returns Component wrapped with ErrorBoundary
 *
 * @pattern Higher-Order Component (HOC)
 * @useCase Protecting specific parts of the app without prop drilling
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: (error: Error, retry: () => void) => ReactNode
) {
  // PATTERN: Named function for better DevTools display
  return function ErrorBoundaryWrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;