# Task 02: Background & Typography Updates

**Phase:** 2 - Background & Typography
**Risk Level:** Low
**Estimated Effort:** 1 day
**Sprint:** 1

## User Story
**As a user**, I want clean, modern backgrounds and readable text that don't distract from the content, so that I can easily focus on hunt information and tasks without eye strain.

## Acceptance Criteria
- [ ] App background changed from beige (#F5E6D3) to cool gray (#F1F5F9)
- [ ] Card containers changed from beige to clean white (#FFFFFF)
- [ ] Primary text updated to slate color (#475569)
- [ ] Secondary text updated to light slate (#64748B)
- [ ] Border colors updated to #E2E8F0
- [ ] Contrast ratios meet WCAG AA standards (4.5:1 minimum)
- [ ] Smooth color transitions implemented
- [ ] No layout shifts during color changes
- [ ] Text remains readable on all backgrounds

## Technical Tasks

### 1. Update App Background
**Files:** `src/App.css`, `src/index.css`, or main layout component

**Prompt for Claude:**
```
Update the main app background color from the current beige/tan color to cool gray (#F1F5F9).

Search for existing background color declarations and replace them with:
- Use CSS custom property var(--color-background) where possible
- Ensure the change applies to the root/body element
- Maintain any existing responsive behavior
- Add smooth transitions for color changes

Also update any hard-coded background colors in layout components.
```

### 2. Update Card/Container Backgrounds
**Files:** Component files with card-like containers

**Prompt for Claude:**
```
Find all card, container, and surface elements that currently have beige/tan backgrounds and update them to white (#FFFFFF).

Look for:
- Stop cards in the hunt interface
- Clue/hint containers
- Modal backgrounds
- Panel components
- Any surface-level containers

Use CSS custom property var(--color-surface) where possible and ensure proper contrast with text content.
```

### 3. Update Primary Text Colors
**Files:** Global styles and typography components

**Prompt for Claude:**
```
Update primary text colors to slate (#475569) across the application.

Target elements:
- Main headings (h1, h2, h3)
- Primary body text
- Button text
- Navigation text
- Card titles and main content

Use CSS custom property var(--color-text-primary) and ensure:
- Minimum 4.5:1 contrast ratio against backgrounds
- Consistent application across all text elements
- Proper inheritance for nested elements
```

### 4. Update Secondary Text Colors
**Files:** Typography and helper text components

**Prompt for Claude:**
```
Update secondary text colors to light slate (#64748B) for supporting text elements.

Target elements:
- Subtitle text
- Helper text and descriptions
- Timestamps and metadata
- Placeholder text
- Captions and footnotes

Use CSS custom property var(--color-text-secondary) and maintain readability standards.
```

### 5. Update Border and Divider Colors
**Files:** Components with borders, dividers, or outlines

**Prompt for Claude:**
```
Update border colors to #E2E8F0 throughout the application.

Look for:
- Input field borders
- Card borders
- Divider lines
- Button outlines
- Navigation separators

Use CSS custom property var(--color-border) and ensure borders remain subtle but visible.
```

### 6. Add Color Transition Effects
**Files:** Global styles or transition utilities

**Prompt for Claude:**
```
Add smooth CSS transitions for color changes to prevent jarring updates when theme switching occurs.

Add transitions for:
- background-color
- color (text)
- border-color

Use appropriate transition duration (200-300ms) and easing functions.
```

## Component-Specific Updates

### High Priority Components
1. **Main App Layout** - Background color
2. **Stop Cards** - Card backgrounds and text
3. **Header/Navigation** - Text colors (not background yet)
4. **Progress Indicators** - Text colors
5. **Bottom Navigation** - Text colors

### Medium Priority Components
1. **Modal/Dialog Components** - Backgrounds and text
2. **Form Elements** - Border and text colors
3. **Notification Components** - Text colors
4. **Loading States** - Text colors

## Testing Requirements

### Automated Tests
- [ ] Contrast ratio validation tests
- [ ] CSS custom property usage verification
- [ ] Visual regression tests for updated components

### Manual Testing Checklist
- [ ] Verify all text meets WCAG AA contrast requirements (4.5:1)
- [ ] Test on multiple screen sizes and orientations
- [ ] Check color appearance on different monitors/devices
- [ ] Validate no layout shifts occur during color transitions
- [ ] Ensure no text becomes unreadable against new backgrounds
- [ ] Test with browser zoom at 150% and 200%

### Accessibility Testing
- [ ] Run axe-core accessibility tests
- [ ] Test with screen readers (color should not affect functionality)
- [ ] Validate color-blind accessibility (colors not relied upon for meaning)
- [ ] Test high contrast mode compatibility

### Browser Testing
- [ ] Chrome (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Edge (latest 2 versions)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Code Review Checklist
- [ ] CSS custom properties used instead of hard-coded colors
- [ ] Contrast ratios verified with tools (WebAIM, Chrome DevTools)
- [ ] Transitions applied for smooth color changes
- [ ] No layout shifts introduced
- [ ] Consistent color application across similar elements
- [ ] Responsive behavior maintained
- [ ] Performance impact minimal (< 50ms recalculation time)

## Performance Considerations
- [ ] Monitor CSS recalculation times after changes
- [ ] Verify no significant First Contentful Paint (FCP) regression
- [ ] Check for any Cumulative Layout Shift (CLS) issues
- [ ] Validate smooth transition performance on lower-end devices

## Rollback Plan
1. **Feature Flag Rollback**: Toggle theme feature flag to revert to old colors
2. **CSS Property Rollback**: Update CSS custom properties back to original values
3. **Component Rollback**: Revert specific component color changes
4. **Cache Invalidation**: Clear browser caches to ensure color updates apply

## Deployment Strategy
- **Staging Environment**: Deploy and validate all color changes
- **Canary Deployment**: Release to 10% of users initially
- **Full Rollout**: After 24 hours of successful canary deployment
- **Monitoring**: Track user feedback and error rates during rollout

## Success Metrics
- [ ] Zero accessibility violations reported
- [ ] No increase in user-reported visual issues
- [ ] Page load performance within 5% of baseline
- [ ] Positive feedback on visual improvements (if feedback mechanism available)

## Dependencies
- Task 01: Foundation & Theme Configuration Setup (must be complete)
- Design approval for final color choices
- Accessibility testing tools configured

## Follow-up Tasks
- Task 03: Navigation & Header modernization
- Performance monitoring and optimization
- User feedback collection and analysis