# Task 03: Navigation & Header Modernization

**Phase:** 3 - Navigation & Header
**Risk Level:** Medium
**Estimated Effort:** 2 days
**Sprint:** 2

## User Story
**As a user**, I want a professional-looking header and navigation that clearly shows my progress and team information, so that I can track my hunt status at a glance.

## Acceptance Criteria
- [ ] Header background changed from purple (#6B4475) to navy (#0F172A)
- [ ] Navigation text maintains high contrast and visibility
- [ ] Progress bar updated with teal accent color (#14B8A6)
- [ ] Team badge styling updated to match new theme
- [ ] Logo/branding elements adapted to new color scheme
- [ ] Notification badges remain clearly visible
- [ ] All interactive states (hover, active) work properly
- [ ] Mobile navigation remains functional and accessible

## Technical Tasks

### 1. Update Header Background
**Files:** Header component, navigation components

**Prompt for Claude:**
```
Update the main header/navigation bar background from purple to navy (#0F172A).

Look for:
- Main header component background
- Navigation bar styling
- Any gradient backgrounds that include purple
- Mobile navigation drawer/menu backgrounds

Use CSS custom property var(--color-primary) and ensure:
- Text contrast meets accessibility standards
- Navigation elements remain clearly visible
- Mobile responsive behavior is preserved
- Smooth transitions are applied
```

### 2. Update Navigation Text Colors
**Files:** Header, navigation, and menu components

**Prompt for Claude:**
```
Update navigation text colors to work with the new navy background.

Text elements to update:
- Main navigation links
- Menu items
- Breadcrumb text
- Navigation titles and labels

Ensure:
- High contrast against navy background (minimum 4.5:1 ratio)
- Use white (#FFFFFF) or light colors for primary nav text
- Maintain hierarchy with different text weights/opacities
- Consistent styling across all navigation elements
```

### 3. Update Progress Bar Component
**Files:** Progress indicator components

**Prompt for Claude:**
```
Update the progress bar to use the new teal accent color (#14B8A6) instead of purple.

Look for:
- Progress bar fill color
- Progress percentage indicators
- Completion status indicators
- Any progress-related animations

Use CSS custom property var(--color-accent) and ensure:
- Good contrast against backgrounds
- Progress animations remain smooth
- Mobile sizing and visibility maintained
- Accessible to users with color vision differences
```

### 4. Update Team Badge/Avatar Styling
**Files:** Team badge, user avatar, and profile components

**Prompt for Claude:**
```
Update team badge and user avatar styling to complement the new color scheme.

Elements to update:
- Team name badge background/border
- User avatar borders or backgrounds
- Team identifier elements
- Profile-related indicators

Considerations:
- Maintain team badge visibility and prominence
- Use subtle borders with var(--color-border)
- Keep user avatar recognizable
- Preserve any existing team branding within the new scheme
```

### 5. Update Logo/Branding Elements
**Files:** Logo components, brand elements

**Prompt for Claude:**
```
Adapt logo and branding elements to work with the new navy header background.

Check for:
- Logo color variations (may need light version for dark header)
- Brand text colors
- Icon colors in the header
- Any branded elements that clash with navy background

Ensure:
- Logo remains clearly visible and on-brand
- Brand colors complement the new navy background
- Consider using white or light variants of logos if available
- Maintain brand recognition and consistency
```

### 6. Update Notification Badges
**Files:** Notification components, badge elements

**Prompt for Claude:**
```
Update notification badges and indicators to maintain visibility with the new header colors.

Elements to update:
- Notification count badges (currently red with "1")
- Status indicators
- Alert badges
- Unread message indicators

Ensure:
- High visibility against navy background
- Maintain urgency/importance visual cues
- Use appropriate colors (red for errors/alerts, teal for info)
- Proper contrast for badge text
```

### 7. Interactive States & Hover Effects
**Files:** Navigation components with interactive states

**Prompt for Claude:**
```
Update all interactive states for navigation elements to work with the new color scheme.

States to update:
- Hover states for navigation links
- Active/selected navigation items
- Focus states for keyboard navigation
- Pressed/clicked states

Use:
- Subtle hover effects with rgba or HSL variations
- Proper focus indicators for accessibility
- Consistent interaction feedback
- Smooth transitions between states
```

## Component-Specific Updates

### Critical Path Components
1. **Main Header Component** - Background and layout
2. **Primary Navigation** - Text colors and hover states
3. **Progress Bar** - Accent color and animations
4. **Team Badge** - Styling and visibility
5. **Mobile Navigation Menu** - Background and text colors

### Secondary Components
1. **Breadcrumb Navigation** - Text colors and separators
2. **User Profile Dropdown** - Background and text
3. **Search Bar** (if present) - Styling consistency
4. **Action Buttons** in header - Color coordination

## Testing Requirements

### Visual Testing
- [ ] Header looks professional and modern
- [ ] All text is clearly readable against navy background
- [ ] Progress bar stands out appropriately
- [ ] Team badge is prominent and clear
- [ ] Logo/branding maintains recognition
- [ ] Notification badges are clearly visible

### Interaction Testing
- [ ] All navigation links work properly
- [ ] Hover effects are smooth and appropriate
- [ ] Mobile navigation opens/closes correctly
- [ ] Keyboard navigation works with proper focus indicators
- [ ] Touch targets remain appropriately sized (44px minimum)

### Responsive Testing
- [ ] Header layout remains intact on all screen sizes
- [ ] Navigation collapses appropriately on mobile
- [ ] Progress bar scales properly
- [ ] Team badge positioning remains correct
- [ ] All interactive elements remain accessible on touch devices

### Accessibility Testing
- [ ] Contrast ratios meet WCAG AA standards
- [ ] Focus indicators are clearly visible
- [ ] Screen reader navigation remains functional
- [ ] Color-blind users can still navigate effectively
- [ ] High contrast mode compatibility verified

## Code Review Checklist
- [ ] CSS custom properties used consistently
- [ ] No hard-coded color values introduced
- [ ] Interactive states properly implemented
- [ ] Mobile responsiveness preserved
- [ ] Accessibility standards maintained
- [ ] Brand consistency maintained within new scheme
- [ ] Performance impact minimal
- [ ] Smooth transitions implemented

## Risk Mitigation
- **High Visibility Elements**: Extra attention to progress bar and navigation clarity
- **Brand Recognition**: Ensure logo/branding remain recognizable
- **Mobile Navigation**: Test thoroughly on various mobile devices
- **User Orientation**: Maintain familiar navigation patterns despite color changes

## Rollback Plan
1. **Component-Level Rollback**: Revert individual component color changes
2. **CSS Variable Rollback**: Reset header-specific custom properties
3. **Feature Flag Rollback**: Disable header color updates while keeping other changes
4. **Asset Rollback**: Revert to original logo/brand assets if needed

## Browser Compatibility
- [ ] Chrome (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Edge (latest 2 versions)
- [ ] iOS Safari (latest 2 versions)
- [ ] Chrome Mobile (latest version)

## Performance Considerations
- [ ] CSS recalculation times remain under 50ms
- [ ] No layout thrashing during hover/interaction
- [ ] Smooth 60fps animations maintained
- [ ] No significant impact on Time to Interactive (TTI)

## Success Metrics
- [ ] Navigation usability maintained or improved
- [ ] Visual hierarchy remains clear
- [ ] Brand recognition preserved
- [ ] Zero accessibility violations
- [ ] Positive user feedback on header appearance

## Dependencies
- Task 02: Background & Typography Updates (must be complete)
- Logo/brand assets available in light variants (if needed)
- Design approval for navigation styling decisions

## Follow-up Tasks
- Task 04: Interactive Components & Controls
- User feedback collection on navigation changes
- Performance monitoring for header interactions