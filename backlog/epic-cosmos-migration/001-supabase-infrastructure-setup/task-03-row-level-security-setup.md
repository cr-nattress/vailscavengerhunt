# Task: Row Level Security Setup

## Objective
Implement Row Level Security (RLS) policies to ensure teams can only access their own data, providing secure multi-tenant data isolation.

## Prompt
```
Implement comprehensive Row Level Security (RLS) policies for the Vail Scavenger Hunt database to ensure proper data isolation between teams.

Requirements:
1. **Enable RLS on key tables:**
   - `teams` - Teams can only see their own data
   - `hunt_progress` - Teams can only access their own progress
   - `sessions` - Teams can only view their own sessions
   - `settings` - Teams can only modify their own settings

2. **Create authentication helper function:**
   - Extract team_id from JWT claims
   - Support both direct team_id and auth sub fields
   - Handle missing or invalid tokens gracefully

3. **Implement specific policies:**

   **Teams Table:**
   - SELECT: Teams can view their own team data
   - UPDATE: Teams can update their own team data

   **Hunt Progress Table:**
   - SELECT: Teams can view their own progress
   - INSERT/UPDATE/DELETE: Teams can modify their own progress

   **Sessions Table:**
   - SELECT: Teams can view their own sessions
   - INSERT: Teams can create their own sessions

   **Team Codes Table:**
   - SELECT: Public access for verification (before authentication)

4. **Test RLS policies:**
   - Verify teams cannot see other teams' data
   - Confirm authenticated operations work correctly
   - Test edge cases with invalid tokens

Use the RLS implementation from the migration plan as your foundation, ensuring all policies properly isolate team data.
```

## Expected Deliverables
- RLS enabled on all security-sensitive tables
- Authentication helper function created
- Comprehensive policies for each table
- Testing completed for data isolation
- Documentation of security model

## Success Criteria
- Teams cannot access other teams' data
- Authenticated operations work as expected
- Public team code verification functions
- No data leakage between teams
- Security policies properly tested