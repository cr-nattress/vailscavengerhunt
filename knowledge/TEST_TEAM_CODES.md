# Test Team Codes for Development

## Integration Status ✅

The Team Code Splash feature has been successfully integrated into the main application!

## How It Works Now

1. **First Visit**: When you navigate to http://localhost:5174, you'll see the Team Code Splash screen
2. **Enter Team Code**: Use one of the test codes below
3. **Team Session**: After successful verification, the splash disappears and you see the main app
4. **Team Indicator**: Your team name appears in the header
5. **24-Hour Session**: Team lock persists for 24 hours, no splash on return visits
6. **Team Logout**: Click the team name in header to switch teams

## Test Team Codes

Use these codes to test the feature:

### Test Codes Available
- **ALPHA01** - Team Alpha
- **BETA02** - Team Beta
- **GAMMA03** - Team Gamma

### To Create Test Codes (Development)

If you need to create test team codes, you can add them manually to the Netlify Blobs storage or create a setup function.

## Testing Scenarios

### 1. First Time User
- Visit http://localhost:5174
- Should see splash screen immediately
- Enter "ALPHA01"
- Should successfully enter app with "Team Alpha" showing in header

### 2. Returning User (within 24h)
- Close/reopen browser
- Visit http://localhost:5174 again
- Should bypass splash and go directly to app
- Team name still visible in header

### 3. Team Switch
- Click on team name in header
- Confirm switch teams
- Should return to splash screen
- Enter different code (e.g., "BETA02")
- Should now show "Team Beta" in header

### 4. Invalid Code
- Enter invalid code like "INVALID"
- Should show error message
- Should allow retry

### 5. 24-Hour Expiration
- Wait 24 hours OR manually clear localStorage
- Visit app again
- Should show splash screen for re-authentication

## Manual Testing

To manually test without waiting 24 hours:

1. Open browser developer tools (F12)
2. Go to Application > Local Storage
3. Delete the `hunt.team.lock.v1` key
4. Refresh the page
5. Splash should appear again

## Current Behavior

✅ **Splash Always Shows**: On first visit or when no valid team lock exists
✅ **Team Verification**: Validates codes and creates 24-hour sessions
✅ **Team Indicator**: Shows current team in header
✅ **Session Persistence**: Remembers team for 24 hours
✅ **Team Switching**: Click team name to logout and switch
✅ **Error Handling**: Clear messages for invalid codes

## Production Notes

For production deployment:
1. Set up actual team codes in Netlify Blobs storage
2. Configure environment variables for JWT secrets
3. The team verification endpoints will be at `/.netlify/functions/team-verify`
4. All functionality works the same in production

The feature is now fully integrated and ready for use!