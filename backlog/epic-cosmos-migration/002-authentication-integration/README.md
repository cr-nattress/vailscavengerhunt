# User Story 002: Authentication Integration

## Description
As a developer, I need to integrate Supabase Auth to replace the custom JWT system so that team authentication is simplified, more secure, and leverages built-in session management.

## Acceptance Criteria
- [ ] Supabase Auth configured for team-based authentication
- [ ] Custom authentication flow for team codes implemented
- [ ] Existing team verification API updated to use Supabase Auth
- [ ] JWT tokens replaced with Supabase session tokens
- [ ] Auth context and helpers created for frontend integration
- [ ] Session persistence and refresh handled automatically

## Tasks
1. **Supabase Auth Configuration** - Configure auth settings and team-based user creation
2. **Team Verification Integration** - Update team-verify function to create Supabase auth sessions
3. **Auth Context Creation** - Create React context for authentication state management
4. **Session Management** - Implement automatic session refresh and persistence
5. **Migration from JWT** - Replace existing JWT implementation with Supabase auth

## Dependencies
- User Story 001 (Database Setup) completed
- Current team authentication system analysis

## Definition of Done
- Supabase Auth fully configured for team authentication
- Team code verification creates proper auth sessions
- Frontend auth context manages authentication state
- Automatic session refresh prevents expiration issues
- All existing authentication functionality preserved
- JWT system successfully replaced