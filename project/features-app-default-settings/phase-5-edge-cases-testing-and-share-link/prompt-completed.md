Phase 5 completed.

Changes implemented
- Edge handling: path parsing defaults to unlocked state on partial/malformed segments and on errors; `popstate` listener re-evaluates lock.
- Share link: added a "Copy Link" button in `src/App.jsx` that builds a path URL `/${slugify(location)}/${slugify(event)}/${slugify(team)}` and copies it to the clipboard.

Verification
- With full path params present, the app is locked (gear hidden) and values propagate to uploads.
- With partial/malformed or no params, the app remains unlocked (gear visible).
- Copy Link produces a path-based URL that, when opened, locks the app with the same settings.
