# Notifications Feature

## Purpose

Toast notification system for displaying temporary success, error, warning, and info messages to users. Provides a centralized API for triggering notifications from anywhere in the app.

## Key Entry Points

### ToastProvider.tsx
- **Purpose**: Context provider for toast notification system
- **Used By**: `App.jsx` (wraps entire application)
- **Exports**:
  - `ToastProvider` component (provider)
  - `useToastActions()` hook (consumer)
- **Key Features**:
  - Toast queue management
  - Auto-dismiss timers
  - Multiple toast types (success, error, warning, info)
  - Stacking and positioning

## Data Flow

### Toast Notification Flow

```
Component triggers notification
    ↓
useToastActions().success('Message')
    ↓
ToastProvider context updates
    ↓
Toast added to queue
    ↓
Toast rendered in UI
    ↓
Auto-dismiss timer starts (3 seconds)
    ↓
Timer expires
    ↓
Toast removed from queue
    ↓
UI updates (toast fades out)
```

## API

### useToastActions Hook

```typescript
const { success, error, warning, info } = useToastActions()

// Success notification (green)
success('Photo uploaded successfully!')

// Error notification (red)
error('Failed to upload photo. Please try again.')

// Warning notification (yellow)
warning('Slow network detected. Upload may take longer.')

// Info notification (blue)
info('Hint revealed! Check the clue section.')
```

### Toast Options (Future Extension)

```typescript
// Custom duration
success('Message', { duration: 5000 })

// Persistent (no auto-dismiss)
error('Critical error', { persistent: true })

// With action button
warning('Unsaved changes', { 
  action: { label: 'Save', onClick: handleSave }
})
```

## State Management

### ToastProvider Internal State
- **toasts**: Array of toast objects
  ```typescript
  interface Toast {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    timestamp: number
  }
  ```
- **Auto-dismiss**: Each toast has a 3-second timer (configurable)

### No Global Store
- **Rationale**: Toast state is ephemeral and UI-only (no need for Zustand)
- **Context API**: Sufficient for this use case

## Styling

### Toast Positioning
- **Default**: Top-right corner
- **Mobile**: Top-center (full width)
- **Z-index**: 9999 (above all other content)

### Toast Types

| Type | Color | Icon | Use Case |
|------|-------|------|----------|
| `success` | Green | ✓ | Successful operations (upload, save) |
| `error` | Red | ✗ | Failed operations, validation errors |
| `warning` | Yellow | ⚠ | Non-critical issues, slow network |
| `info` | Blue | ℹ | Informational messages, hints |

## Related Files

- **Context**: `/src/features/notifications/ToastProvider.tsx`
- **Usage Examples**: `/src/features/views/ActiveView.tsx`, `/src/hooks/usePhotoUpload.ts`

## Testing

### Manual Testing Checklist
- [ ] Success toast displays with green styling
- [ ] Error toast displays with red styling
- [ ] Toasts auto-dismiss after 3 seconds
- [ ] Multiple toasts stack vertically
- [ ] Toasts are readable on mobile
- [ ] Toasts don't block critical UI

### Test Scenarios
1. **Success**: Upload photo → see green success toast
2. **Error**: Submit invalid form → see red error toast
3. **Multiple**: Trigger 3 toasts rapidly → all display stacked
4. **Auto-dismiss**: Wait 3 seconds → toast disappears

## Extension Points

### Adding Custom Toast Duration

1. Update `useToastActions` to accept options:
   ```typescript
   success(message: string, options?: { duration?: number })
   ```
2. Pass duration to toast object
3. Use duration in auto-dismiss timer

### Adding Action Buttons

1. Add `action` field to `Toast` interface:
   ```typescript
   interface Toast {
     // ...existing fields
     action?: { label: string, onClick: () => void }
   }
   ```
2. Render action button in toast UI
3. Cancel auto-dismiss when action is clicked

### Adding Toast Sounds

1. Add sound files to `/public/sounds/`
2. Play sound on toast display:
   ```typescript
   const audio = new Audio('/sounds/success.mp3')
   audio.play()
   ```
3. Add user preference for sound on/off

## Usage Examples

### Photo Upload Success

```typescript
const { success, error } = useToastActions()

try {
  await uploadPhoto(file)
  success('Photo uploaded successfully!')
} catch (err) {
  error('Failed to upload photo. Please try again.')
}
```

### Form Validation Error

```typescript
const { error } = useToastActions()

if (!teamCode) {
  error('Team code is required')
  return
}
```

### Network Warning

```typescript
const { warning } = useToastActions()

if (navigator.connection?.effectiveType === '2g') {
  warning('Slow network detected. Upload may take longer.')
}
```

## Notes

- **Toast messages should be concise** (max ~50 characters)
- **Use sentence case** (not ALL CAPS)
- **Avoid technical jargon** (user-friendly language)
- **Don't overuse toasts** (only for important feedback)
- **Toasts are not for critical errors** (use modal dialogs for blocking errors)
