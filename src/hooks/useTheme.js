/**
 * Theme Hook Utilities
 * Provides easy access to theme functionality in components
 */
import { useMemo } from 'react'
import { useTheme, useThemeColors } from '../contexts/ThemeContext'

/**
 * Enhanced theme hook with utility functions
 */
export function useThemeEnhanced() {
  const theme = useTheme()

  return useMemo(() => ({
    ...theme,

    /**
     * Get theme-aware class names
     */
    getClassName: (baseClass, modernClass = null, legacyClass = null) => {
      let className = baseClass

      if (theme.isModernTheme && modernClass) {
        className += ` ${modernClass}`
      } else if (theme.isLegacyTheme && legacyClass) {
        className += ` ${legacyClass}`
      }

      return className
    },

    /**
     * Get conditional styling based on theme
     */
    getStyle: (baseStyle = {}, modernStyle = {}, legacyStyle = {}) => {
      const themeStyle = theme.isModernTheme ? modernStyle : legacyStyle
      return { ...baseStyle, ...themeStyle }
    },

    /**
     * Check if specific theme is active
     */
    isTheme: (themeName) => theme.currentTheme === themeName,

    /**
     * Get theme-specific value
     */
    getThemeValue: (modernValue, legacyValue) => {
      return theme.isModernTheme ? modernValue : legacyValue
    }
  }), [theme])
}

/**
 * Hook for component-specific theme classes
 */
export function useThemeClasses(componentName, classes = {}) {
  const theme = useTheme()

  return useMemo(() => {
    const themePrefix = theme.isModernTheme ? 'modern' : 'legacy'
    const result = {}

    Object.entries(classes).forEach(([key, value]) => {
      if (typeof value === 'string') {
        result[key] = `${componentName}-${key} ${componentName}-${key}--${themePrefix} ${value}`
      } else if (typeof value === 'object') {
        result[key] = theme.isModernTheme ? value.modern : value.legacy
      }
    })

    return result
  }, [theme.currentTheme, componentName, classes])
}

/**
 * Hook for conditional rendering based on theme
 */
export function useThemeConditional() {
  const theme = useTheme()

  return {
    /**
     * Render component only for specific theme
     */
    renderIf: (themeName, component) => {
      return theme.currentTheme === themeName ? component : null
    },

    /**
     * Render different components for different themes
     */
    renderByTheme: (components) => {
      return components[theme.currentTheme] || components.default || null
    },

    /**
     * Apply theme-conditional props
     */
    getConditionalProps: (props) => {
      const themeProps = props[theme.currentTheme] || {}
      const baseProps = { ...props }
      delete baseProps.modern
      delete baseProps.legacy

      return { ...baseProps, ...themeProps }
    }
  }
}

/**
 * Hook for CSS-in-JS styling with theme support
 */
export function useThemeStyles() {
  const colors = useThemeColors()
  const theme = useTheme()

  return useMemo(() => ({
    colors,

    /**
     * Create theme-aware inline styles
     */
    createStyles: (styleDefinitions) => {
      const styles = {}

      Object.entries(styleDefinitions).forEach(([key, value]) => {
        if (typeof value === 'function') {
          styles[key] = value(colors, theme)
        } else {
          styles[key] = value
        }
      })

      return styles
    },

    /**
     * Get color with opacity
     */
    withOpacity: (colorKey, opacity) => {
      const color = colors[colorKey]
      if (!color) return 'transparent'

      // Convert hex to rgba
      const hex = color.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16)
      const g = parseInt(hex.substr(2, 2), 16)
      const b = parseInt(hex.substr(4, 2), 16)

      return `rgba(${r}, ${g}, ${b}, ${opacity})`
    },

    /**
     * Create gradient background
     */
    createGradient: (startColor, endColor, direction = 'to right') => {
      const start = colors[startColor] || startColor
      const end = colors[endColor] || endColor
      return `linear-gradient(${direction}, ${start}, ${end})`
    }
  }), [colors, theme])
}

/**
 * Hook for theme debugging in development
 */
export function useThemeDebug() {
  const theme = useTheme()

  if (process.env.NODE_ENV !== 'development') {
    return {}
  }

  return {
    /**
     * Log theme information
     */
    logTheme: () => {
      console.log('Current Theme:', {
        theme: theme.currentTheme,
        colors: theme.colors,
        config: theme.config,
        validation: theme.validation
      })
    },

    /**
     * Add theme debug info to component
     */
    addDebugProps: (props = {}) => ({
      ...props,
      'data-theme': theme.currentTheme,
      'data-theme-ready': theme.isThemeReady,
      'data-theme-switchable': theme.canSwitchTheme
    }),

    /**
     * Create debug overlay
     */
    createDebugInfo: () => ({
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      borderRadius: '4px'
    })
  }
}