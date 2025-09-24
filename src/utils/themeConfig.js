/**
 * Theme Configuration Utility
 * Manages the Modern Tech color scheme migration with feature flags and rollback capability
 */

// Environment variable configuration
export const themeConfig = {
  // Main feature flag to enable/disable modern theme
  useModernTheme: process.env.REACT_APP_USE_MODERN_THEME === 'true' || false,

  // Allow theme switching in UI (for testing/admin purposes)
  enableThemeSwitching: process.env.REACT_APP_ENABLE_THEME_SWITCHING === 'true' || false,

  // Gradual rollout percentage (0-100)
  rolloutPercentage: parseInt(process.env.REACT_APP_THEME_ROLLOUT_PERCENTAGE || '0', 10),

  // Development mode allows easier theme testing
  isDevelopment: process.env.NODE_ENV === 'development'
}

// Theme class names for CSS application
export const THEME_CLASSES = {
  LEGACY: 'theme-legacy',
  MODERN: 'theme-modern',
  TRANSITION: 'theme-transition'
}

// Color mapping for programmatic access
export const COLOR_SCHEMES = {
  LEGACY: {
    primary: '#552448',          // cabernet
    background: '#EAE3D4',       // cream
    surface: '#F5E6F0',          // light pink
    accent: '#552448',           // cabernet
    textPrimary: '#333333',      // dark neutral
    textSecondary: '#666666',    // medium grey
    border: '#D6D2CB',           // light grey
    success: '#4A7C59',
    error: '#8B4B47',
    warning: '#A67C52'
  },
  MODERN: {
    primary: '#0F172A',          // navy
    background: '#F1F5F9',       // cool gray
    surface: '#FFFFFF',          // white
    accent: '#14B8A6',           // teal
    textPrimary: '#475569',      // slate
    textSecondary: '#64748B',    // light slate
    border: '#E2E8F0',           // light border
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B'
  }
}

/**
 * Determines if user should see modern theme based on rollout strategy
 * @returns {boolean}
 */
export function shouldUseModernTheme() {
  // Always respect explicit feature flag
  if (themeConfig.useModernTheme) {
    return true
  }

  // In development, allow easy testing
  if (themeConfig.isDevelopment && themeConfig.enableThemeSwitching) {
    return getStoredThemePreference() === 'modern'
  }

  // Gradual rollout based on user ID hash (if available) or random
  if (themeConfig.rolloutPercentage > 0) {
    return isUserInRolloutGroup(themeConfig.rolloutPercentage)
  }

  return false
}

/**
 * Gets the appropriate theme class name for current user
 * @returns {string}
 */
export function getThemeClassName() {
  if (shouldUseModernTheme()) {
    return THEME_CLASSES.MODERN
  }
  return THEME_CLASSES.LEGACY
}

/**
 * Gets the current color scheme object
 * @returns {object}
 */
export function getCurrentColorScheme() {
  return shouldUseModernTheme() ? COLOR_SCHEMES.MODERN : COLOR_SCHEMES.LEGACY
}

/**
 * Checks if user is in rollout group based on percentage
 * Uses consistent hashing to ensure same user always gets same result
 * @param {number} percentage
 * @returns {boolean}
 */
function isUserInRolloutGroup(percentage) {
  // Use user session ID or create consistent identifier
  const userId = getUserIdentifier()
  const hash = simpleHash(userId)
  const userPercentile = hash % 100
  return userPercentile < percentage
}

/**
 * Gets a consistent user identifier for rollout decisions
 * @returns {string}
 */
function getUserIdentifier() {
  // Try to get from localStorage first
  let userId = localStorage.getItem('vail-hunt-user-id')
  if (!userId) {
    // Generate a consistent ID based on browser fingerprint
    userId = generateBrowserFingerprint()
    localStorage.setItem('vail-hunt-user-id', userId)
  }
  return userId
}

/**
 * Generates a simple browser fingerprint for consistent user identification
 * @returns {string}
 */
function generateBrowserFingerprint() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'top'
  ctx.font = '14px Arial'
  ctx.fillText('Browser fingerprint', 2, 2)

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|')

  return simpleHash(fingerprint).toString()
}

/**
 * Simple hash function for consistent user bucketing
 * @param {string} str
 * @returns {number}
 */
function simpleHash(str) {
  let hash = 0
  if (str.length === 0) return hash
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Gets stored theme preference from localStorage
 * @returns {string|null}
 */
function getStoredThemePreference() {
  try {
    return localStorage.getItem('vail-hunt-theme-preference')
  } catch (e) {
    console.warn('Could not access localStorage for theme preference')
    return null
  }
}

/**
 * Stores theme preference in localStorage
 * @param {string} theme - 'legacy' or 'modern'
 */
export function setThemePreference(theme) {
  try {
    localStorage.setItem('vail-hunt-theme-preference', theme)
    // Force re-evaluation of theme
    window.location.reload()
  } catch (e) {
    console.warn('Could not store theme preference')
  }
}

/**
 * Validates theme configuration on startup
 * @returns {object} Validation results
 */
export function validateThemeConfig() {
  const issues = []

  if (themeConfig.rolloutPercentage < 0 || themeConfig.rolloutPercentage > 100) {
    issues.push('Rollout percentage must be between 0 and 100')
  }

  if (themeConfig.useModernTheme && !themeConfig.isDevelopment && themeConfig.rolloutPercentage === 0) {
    issues.push('Modern theme enabled but rollout percentage is 0 - theme will not be visible to users')
  }

  return {
    isValid: issues.length === 0,
    issues,
    config: themeConfig
  }
}

/**
 * Emergency rollback function - forces legacy theme
 * Can be called from browser console if needed
 */
export function emergencyRollback() {
  localStorage.setItem('vail-hunt-theme-emergency-rollback', 'true')
  localStorage.removeItem('vail-hunt-theme-preference')
  console.warn('Emergency rollback activated - forcing legacy theme')
  window.location.reload()
}

/**
 * Checks if emergency rollback is active
 * @returns {boolean}
 */
export function isEmergencyRollbackActive() {
  try {
    return localStorage.getItem('vail-hunt-theme-emergency-rollback') === 'true'
  } catch (e) {
    return false
  }
}

/**
 * Clears emergency rollback flag
 */
export function clearEmergencyRollback() {
  try {
    localStorage.removeItem('vail-hunt-theme-emergency-rollback')
  } catch (e) {
    console.warn('Could not clear emergency rollback flag')
  }
}

// Make emergency functions available globally for debugging
if (typeof window !== 'undefined') {
  window.vailThemeEmergencyRollback = emergencyRollback
  window.vailThemeClearRollback = clearEmergencyRollback
  window.vailThemeConfig = themeConfig
}