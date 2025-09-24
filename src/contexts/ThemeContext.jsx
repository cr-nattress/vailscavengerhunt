/**
 * Theme Context Provider
 * Provides theme management functionality throughout the application
 */
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import {
  themeConfig,
  shouldUseModernTheme,
  getThemeClassName,
  getCurrentColorScheme,
  setThemePreference,
  validateThemeConfig,
  isEmergencyRollbackActive,
  THEME_CLASSES
} from '../utils/themeConfig'

// Create theme context
const ThemeContext = createContext(null)

/**
 * Theme Provider Component
 */
export function ThemeProvider({ children }) {
  // Current theme state
  const [currentTheme, setCurrentTheme] = useState('legacy')
  const [isThemeReady, setIsThemeReady] = useState(false)
  const [themeValidation, setThemeValidation] = useState(null)

  // Initialize theme on mount
  useEffect(() => {
    initializeTheme()
  }, [])

  // Apply theme class to document
  useEffect(() => {
    applyThemeToDocument()
  }, [currentTheme])

  /**
   * Initialize theme based on configuration and user settings
   */
  function initializeTheme() {
    try {
      // Validate theme configuration
      const validation = validateThemeConfig()
      setThemeValidation(validation)

      if (!validation.isValid) {
        console.warn('Theme configuration issues:', validation.issues)
      }

      // Check for emergency rollback
      if (isEmergencyRollbackActive()) {
        console.warn('Emergency rollback is active - using legacy theme')
        setCurrentTheme('legacy')
        setIsThemeReady(true)
        return
      }

      // Determine theme based on configuration
      const useModern = shouldUseModernTheme()
      const newTheme = useModern ? 'modern' : 'legacy'

      setCurrentTheme(newTheme)
      setIsThemeReady(true)

      // Log theme decision for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`Theme initialized: ${newTheme}`, {
          config: themeConfig,
          validation
        })
      }
    } catch (error) {
      console.error('Error initializing theme:', error)
      // Fallback to legacy theme on error
      setCurrentTheme('legacy')
      setIsThemeReady(true)
    }
  }

  /**
   * Apply theme class to document root
   */
  function applyThemeToDocument() {
    if (typeof document === 'undefined') return

    const { body } = document
    const themeClassName = getThemeClassName()

    // Remove all theme classes
    Object.values(THEME_CLASSES).forEach(className => {
      body.classList.remove(className)
    })

    // Add current theme class
    body.classList.add(themeClassName)

    // Apply transition class temporarily for smooth changes
    if (isThemeReady) {
      body.classList.add(THEME_CLASSES.TRANSITION)
      setTimeout(() => {
        body.classList.remove(THEME_CLASSES.TRANSITION)
      }, 300)
    }
  }

  /**
   * Switch theme (only available if theme switching is enabled)
   */
  function switchTheme(newTheme) {
    if (!themeConfig.enableThemeSwitching) {
      console.warn('Theme switching is not enabled')
      return false
    }

    if (!['legacy', 'modern'].includes(newTheme)) {
      console.error('Invalid theme:', newTheme)
      return false
    }

    try {
      setThemePreference(newTheme)
      return true
    } catch (error) {
      console.error('Error switching theme:', error)
      return false
    }
  }

  /**
   * Toggle between themes
   */
  function toggleTheme() {
    const newTheme = currentTheme === 'modern' ? 'legacy' : 'modern'
    return switchTheme(newTheme)
  }

  /**
   * Get CSS custom property value for current theme
   */
  function getCSSVariable(propertyName) {
    if (typeof document === 'undefined') return null

    const computedStyle = getComputedStyle(document.documentElement)
    return computedStyle.getPropertyValue(`--${propertyName}`).trim()
  }

  /**
   * Get current color scheme
   */
  const colorScheme = useMemo(() => getCurrentColorScheme(), [currentTheme])

  // Context value
  const contextValue = useMemo(() => ({
    // Current theme state
    currentTheme,
    isModernTheme: currentTheme === 'modern',
    isLegacyTheme: currentTheme === 'legacy',
    isThemeReady,

    // Color scheme
    colors: colorScheme,

    // Theme configuration
    config: themeConfig,
    validation: themeValidation,

    // Theme actions (only available if switching enabled)
    canSwitchTheme: themeConfig.enableThemeSwitching,
    switchTheme,
    toggleTheme,

    // Utilities
    getThemeClassName,
    getCSSVariable,

    // Emergency functions
    isEmergencyRollbackActive: isEmergencyRollbackActive()
  }), [
    currentTheme,
    isThemeReady,
    colorScheme,
    themeValidation
  ])

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to use theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}

/**
 * Hook to get current colors
 */
export function useThemeColors() {
  const { colors } = useTheme()
  return colors
}

/**
 * Hook to get CSS custom property values
 */
export function useCSSVariable(propertyName) {
  const { getCSSVariable } = useTheme()
  return getCSSVariable(propertyName)
}

/**
 * HOC to provide theme to a component
 */
export function withTheme(Component) {
  return function ThemedComponent(props) {
    return (
      <ThemeProvider>
        <Component {...props} />
      </ThemeProvider>
    )
  }
}

export default ThemeContext