# BUG-001: API Routing Failure - login-initialize endpoint

## Status: FIXED ✅ (with follow-up fix for photo-upload)

## Priority: P0 - Critical

## Date Discovered: 2025-09-27
## Date Fixed: 2025-09-27

## Summary
Application failed to initialize due to incorrect routing of the `login-initialize` endpoint after switching from direct `fetch()` to centralized `apiClient`. The endpoint returned 404 errors, making the application completely unusable.

## Root Cause
- **LoginService** was updated to use `apiClient` with path `/login-initialize`
- **apiClient** prepended `/api` to the path, creating `/api/login-initialize`
- **Express server** only handled Netlify functions at `/.netlify/functions/*`
- No route existed to handle `/api/login-initialize`

## Impact
- ❌ Complete application failure on page load
- ❌ Users unable to log in or verify teams
- ❌ No data could be loaded (settings, progress, sponsors)
- ❌ Poor user experience with retry storms (3 attempts per request)

## Fix Applied
Added a route redirect in Express server (`src/server/server.ts:68-74`) to forward `/api/login-initialize` requests to the Netlify function handler:

```javascript
// Forward login-initialize requests to Netlify function handler
app.all('/api/login-initialize', async (req, res, next) => {
  // Rewrite the URL to match Netlify function pattern
  req.url = '/.netlify/functions/login-initialize';
  req.params = { functionName: 'login-initialize', '0': '' };
  next();
});
```

## Testing Performed
- ✅ Verified endpoint returns 200 OK
- ✅ Confirmed response contains expected data structure
- ✅ Application now loads successfully

## Lessons Learned
1. **Test after refactoring**: Always test critical endpoints after changing API client implementation
2. **Environment parity**: Ensure local development environment matches production routing
3. **Error monitoring**: Implement better error monitoring to catch routing issues early
4. **Documentation**: Document routing architecture for all endpoints

## Future Improvements Needed
1. **Standardize routing**: Create consistent patterns for API vs Netlify function endpoints
2. **Integration tests**: Add automated tests for all critical endpoints
3. **Development setup**: Consider using Netlify Dev exclusively for better production parity
4. **Error handling**: Improve error messages to be more descriptive about routing failures

## Related Files Modified
- `src/server/server.ts:68-81` - Added route redirects for login-initialize and photo-upload-orchestrated
- `src/client/PhotoUploadService.ts:118` - Fixed path from `/.netlify/functions/photo-upload-orchestrated` to `/photo-upload-orchestrated`
- `netlify.toml:107-113` - Added production redirect for /api/login-initialize
- `netlify.toml:115-116` - Removed invalid /.netlify/functions self-redirect
- `netlify.toml:157-158` - Fixed missing 'to' field for /api/state-list

## References
- Full analysis: `backlog/api-errors.md`
- Original error log: `errors/on-page-load`

## Prevention Checklist
- [ ] Add integration tests for all Netlify functions
- [ ] Document all API endpoints and their routing patterns
- [ ] Create environment-specific configuration for endpoint paths
- [ ] Add health checks for critical endpoints
- [ ] Implement monitoring alerts for 404 errors on critical paths