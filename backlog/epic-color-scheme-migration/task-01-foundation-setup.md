# Task 01: Foundation & Theme Configuration Setup

**Phase:** 1 - Foundation & Safety
**Risk Level:** Low
**Estimated Effort:** 2 days
**Sprint:** 1

## User Story
**As a developer**, I want to set up CSS custom properties for the new color scheme alongside existing colors, so that I can implement changes incrementally without breaking the current design.

## Acceptance Criteria
- [ ] New CSS custom properties defined in `:root`
- [ ] Old color variables preserved during transition
- [ ] Theme configuration system in place
- [ ] Feature flag mechanism ready
- [ ] Rollback mechanism implemented
- [ ] A/B testing infrastructure set up

## Technical Tasks

### 1. Create CSS Custom Properties
**File:** `src/styles/theme.css` or `src/index.css`

**Prompt for Claude:**
```
Add CSS custom properties to the main stylesheet for the Modern Tech color scheme. Keep existing colors with -old suffix for backward compatibility. Use this exact color mapping:

Primary/Header: Navy blue #0F172A
Background: Cool gray #F1F5F9
Cards/Containers: White #FFFFFF
Accent/Progress: Teal #14B8A6
Primary Text: Slate #475569
Secondary Text: Light slate #64748B
Border/Divider: #E2E8F0
Shadow: rgba(15, 23, 42, 0.08)
Error: #EF4444
Success: #10B981

Create appropriate CSS custom property names following BEM or similar methodology.
```

### 2. Theme Configuration Utility
**File:** `src/utils/themeConfig.js`

**Prompt for Claude:**
```
Create a theme configuration utility that:
1. Reads environment variables for theme switching
2. Provides a function to get current theme class name
3. Supports feature flagging for gradual rollout
4. Includes theme validation and fallback mechanisms
5. Exports constants for theme-related CSS class names
```

### 3. Feature Flag Implementation
**Files:** `.env.example`, `.env.local`

**Prompt for Claude:**
```
Add environment variables for controlling the color scheme migration:
- REACT_APP_USE_MODERN_THEME (boolean)
- REACT_APP_ENABLE_THEME_SWITCHING (boolean)
- REACT_APP_THEME_ROLLOUT_PERCENTAGE (number 0-100)

Update .env.example with documentation for each variable.
```

### 4. Theme Context Provider
**File:** `src/contexts/ThemeContext.js`

**Prompt for Claude:**
```
Create a React context provider for theme management that:
1. Reads theme configuration from environment variables
2. Provides theme state to all components
3. Includes functions to switch themes if enabled
4. Handles theme persistence in localStorage
5. Provides rollback capability
```

### 5. CSS Class Application System
**File:** `src/hooks/useTheme.js`

**Prompt for Claude:**
```
Create a custom React hook that:
1. Uses the ThemeContext to get current theme
2. Returns appropriate CSS class names for components
3. Handles theme transitions smoothly
4. Provides utility functions for conditional styling
5. Includes TypeScript definitions if applicable
```

## Testing Requirements

### Unit Tests
- [ ] Theme configuration utility tests
- [ ] Feature flag logic tests
- [ ] Theme context provider tests
- [ ] CSS custom property validation

### Integration Tests
- [ ] Theme switching functionality
- [ ] Environment variable handling
- [ ] LocalStorage persistence
- [ ] Rollback mechanism verification

### Manual Testing
- [ ] Verify theme variables are available in browser DevTools
- [ ] Test feature flag toggling
- [ ] Confirm no visual changes yet (foundation only)
- [ ] Validate rollback procedure

## Code Review Checklist
- [ ] CSS custom properties follow naming conventions
- [ ] Feature flag implementation is secure and performant
- [ ] Theme switching logic is atomic and error-safe
- [ ] TypeScript definitions are complete (if applicable)
- [ ] Documentation is clear and comprehensive
- [ ] No hard-coded color values introduced

## Rollback Plan
1. **Environment Variable Rollback**: Set `REACT_APP_USE_MODERN_THEME=false`
2. **Code Rollback**: Remove new CSS custom properties
3. **Context Rollback**: Disable ThemeContext provider
4. **Cache Clear**: Clear browser localStorage for theme settings

## Deployment Notes
- This phase introduces no visual changes
- Safe to deploy to all environments
- Monitor for JavaScript errors in theme configuration
- Verify feature flags work in production environment

## Dependencies
- None (foundational work)

## Follow-up Tasks
- Task 02: Background & Typography updates
- Performance monitoring setup for CSS recalculations
- Visual regression testing baseline establishment