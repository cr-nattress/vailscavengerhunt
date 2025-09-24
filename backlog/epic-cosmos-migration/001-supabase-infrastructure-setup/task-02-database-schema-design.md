# Task: Database Schema Design

## Objective
Create complete PostgreSQL database schema with proper relationships and constraints for the scavenger hunt data model.

## Prompt
```
Create a comprehensive PostgreSQL database schema for the Vail Scavenger Hunt application using Supabase.

Requirements:
1. Execute the complete database schema from the migration plan:

   **Core Tables to Create:**
   - `organizations` - Organization master data
   - `hunts` - Hunt configurations per organization
   - `teams` - Team data with organization/hunt relationships
   - `team_codes` - Team access codes with usage tracking
   - `hunt_progress` - Individual location progress per team
   - `sessions` - User sessions with automatic expiration
   - `settings` - Application settings per team

2. **Implement Key Features:**
   - Proper foreign key relationships
   - UUID primary keys where appropriate
   - Automatic timestamps (created_at, updated_at)
   - Unique constraints for business rules
   - Check constraints for data validation

3. **Add Performance Elements:**
   - Strategic indexes for common queries
   - Leaderboard view for easy ranking
   - Trigger function for updated_at timestamps
   - Cleanup function for expired sessions

4. Use the SQL schema provided in the migration plan as your foundation, ensuring:
   - All tables have proper relationships
   - Indexes support expected query patterns
   - Views simplify complex queries
   - Functions automate maintenance tasks

Execute this schema in the Supabase SQL editor and verify all tables are created successfully.
```

## Expected Deliverables
- Complete database schema implemented
- All tables created with proper relationships
- Indexes and views created for performance
- Trigger functions implemented for automation
- Schema validated and tested

## Success Criteria
- All 7 core tables created successfully
- Foreign key relationships working correctly
- Indexes improve query performance
- Leaderboard view returns expected data
- Automatic timestamp updates functioning