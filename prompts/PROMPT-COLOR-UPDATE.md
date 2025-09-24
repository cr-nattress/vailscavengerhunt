Prompt: Color Scheme Migration Analysis & Implementation Guide
Task: Analyze the current mobile web application interface and create a detailed migration plan to implement the Modern Tech color scheme while maintaining application stability.
Current State Analysis Required:

Identify all UI components visible in the application
Document current color values being used
Map each component to its CSS/styling implementation
Note any hardcoded colors vs. variable-based colors
Identify critical interaction states (hover, active, disabled)

Target Color Scheme (Modern Tech):

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
Bottom Navigation: White #FFFFFF

Required Deliverables:
1. Create README.md with the following sections:
markdown# Color Scheme Migration Guide - Modern Tech Theme

## Overview
Migration from current purple/beige theme to Modern Tech color palette

## Color Mapping Table
| Component | Current Color | New Color | CSS Variable Name |
|-----------|--------------|-----------|-------------------|
| [Document each component] | | | |

## Implementation Phases

### Phase 1: Setup & Preparation (Non-Breaking)
- [ ] Create CSS variables/theme configuration
- [ ] Add new color variables alongside existing ones
- [ ] Create feature flag for theme switching

### Phase 2: Global Styles (Low Risk)
- [ ] Update background colors
- [ ] Update text colors
- [ ] Update border colors
- [ ] Update shadow styles

### Phase 3: Component Updates (Medium Risk)
- [ ] Header/Navigation bar
- [ ] Progress bar component
- [ ] Card containers
- [ ] Button styles (Upload Photo)
- [ ] Bottom navigation
- [ ] Form inputs and interactions

### Phase 4: Interactive States (Medium Risk)  
- [ ] Hover states
- [ ] Active/Focus states
- [ ] Disabled states
- [ ] Loading states

### Phase 5: Icons & Assets (Low Risk)
- [ ] Update icon colors
- [ ] Update logo/brand elements if needed
- [ ] Update notification badges

### Phase 6: Testing & Refinement
- [ ] Cross-browser testing
- [ ] Mobile responsive testing
- [ ] Accessibility contrast checking
- [ ] User acceptance testing

## Code Changes Required

### CSS/SCSS Changes
[Provide specific code blocks]

### Component Changes
[List any component-level changes needed]

### Configuration Files
[Document any config updates]

## Rollback Plan
[Detail how to revert changes if needed]

## Testing Checklist
- [ ] All text remains readable (WCAG AA compliance)
- [ ] Interactive elements are clearly visible
- [ ] No broken layouts
- [ ] Consistent styling across all screens
- [ ] Dark text on light backgrounds maintained
2. Analyze and document:
For each visible component in the current interface:

Header bar (currently purple #6B4475 estimate)
"Team Alpha" badge
CHALKAMAXA logo
Progress bar (currently purple)
Progress percentage text
Stop counter ("1 of 10 stops")
User avatar circle
Notification badge (red with "1")
"Clue" section with pink background
Photo upload placeholder
"Upload Photo" button (purple)
Bottom navigation icons
Card container (beige background)

Generate specific CSS/code changes such as:
css/* Example variable setup */
:root {
  /* Deprecated - to be removed after migration */
  --color-primary-old: #6B4475;
  --color-background-old: #F5E6D3;
  
  /* New Modern Tech theme */
  --color-primary: #0F172A;
  --color-background: #F1F5F9;
  --color-surface: #FFFFFF;
  --color-accent: #14B8A6;
  --color-text-primary: #475569;
  --color-text-secondary: #64748B;
  --color-border: #E2E8F0;
  --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.08);
  --shadow-md: 0 4px 6px rgba(15, 23, 42, 0.08);
}
3. Provide incremental implementation steps:
Step-by-step migration approach:

First commit: Add new color variables without removing old ones
Second commit: Create theme switcher utility function
Third commit: Update non-critical backgrounds
Fourth commit: Update text colors with fallbacks
Fifth commit: Update interactive components
Sixth commit: Update icons and badges
Seventh commit: Remove old color variables
Final commit: Cleanup and optimization

Include safeguards:

Feature flag implementation
Progressive rollout strategy
A/B testing setup if applicable
Performance monitoring for style recalculations
Browser compatibility checks

Generate validation criteria:

Minimum contrast ratios (4.5:1 for normal text, 3:1 for large text)
Touch target sizes remain unchanged (minimum 44x44px)
Loading performance impact < 100ms
No layout shifts during migration


Output Requirements:

Complete README.md file with all sections filled
Specific CSS/SCSS code blocks ready to implement
Migration script if applicable
Testing scripts/commands
Rollback procedures documented
Timeline estimation for each phase