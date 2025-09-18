import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  dismissible?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant, options?: { duration?: number; dismissible?: boolean }) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
  defaultDuration?: number;
}

export function ToastProvider({ children, defaultDuration = 5000 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    
    // Clear any existing timeout for this toast
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const addToast = useCallback((
    message: string, 
    variant: ToastVariant = 'info', 
    options: { duration?: number; dismissible?: boolean } = {}
  ): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const { duration = defaultDuration, dismissible = true } = options;
    
    const toast: Toast = {
      id,
      message,
      variant,
      duration,
      dismissible
    };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss after duration if duration > 0
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        removeToast(id);
      }, duration);
      
      timeoutRefs.current.set(id, timeoutId);
    }

    return id;
  }, [defaultDuration, removeToast]);

  const clearAllToasts = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
    
    setToasts([]);
  }, []);

  const contextValue: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToasts();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div 
      className="fixed top-4 right-4 z-50 space-y-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onDismiss={removeToast}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const variantStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconMap = {
    success: '',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div
      className={`
        min-w-[300px] max-w-md p-4 rounded-lg border-2 shadow-lg
        transform transition-all duration-300 ease-in-out
        ${variantStyles[toast.variant]}
      `}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {iconMap[toast.variant] && (
          <span className="text-lg flex-shrink-0" aria-hidden="true">
            {iconMap[toast.variant]}
          </span>
        )}
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">
            {toast.message}
          </p>
        </div>
        
        {toast.dismissible && (
          <button
            onClick={() => onDismiss(toast.id)}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded"
            aria-label="Dismiss notification"
          >
            <span className="text-lg" aria-hidden="true">×</span>
          </button>
        )}
      </div>
      
      {/* Progress bar for auto-dismiss */}
      {toast.duration && toast.duration > 0 && (
        <div className="mt-2 bg-gray-200 rounded-full h-1 overflow-hidden">
          <div 
            className="bg-current h-full rounded-full transition-all ease-linear w-full"
            style={{
              transitionDuration: `${toast.duration}ms`,
              width: '0%'
            }}
          />
        </div>
      )}
    </div>
  );
}

// Custom hook for using toasts
export function useToasts() {
  const context = useContext(ToastContext);
  
  if (context === undefined) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  
  return context;
}

// Convenience functions for different toast types
export function useToastActions() {
  const { addToast } = useToasts();
  
  return {
    success: (message: string, options?: { duration?: number }) => 
      addToast(message, 'success', options),
    
    error: (message: string, options?: { duration?: number }) => 
      addToast(message, 'error', options),
    
    warning: (message: string, options?: { duration?: number }) => 
      addToast(message, 'warning', options),
    
    info: (message: string, options?: { duration?: number }) => 
      addToast(message, 'info', options)
  };
}

export default ToastProvider;