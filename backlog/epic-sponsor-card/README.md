# Epic: Sponsor Card System

## Overview
Add a sponsor card component to display sponsor logos on the Active page, with configurable grid layouts and Supabase-backed sponsor asset management.

## User Stories

### US-001: Database Schema and Storage Setup
**As a developer**, I need a Supabase table and storage bucket for sponsor assets so that sponsor data can be stored and retrieved efficiently.

### US-002: Sponsor Data API
**As a developer**, I need a Netlify function to retrieve sponsor assets so that the frontend can display sponsor information.

### US-003: Core Sponsor Card Component
**As an attendee**, I want to see sponsor logos displayed prominently on the Active page so that I know who sponsored the event.

### US-004: Layout Configuration
**As an organizer**, I want to configure 1x1, 1x2, or 1x3 grid layouts so that sponsor logos display appropriately for each event.

### US-005: ActiveView Integration
**As a developer**, I need the sponsor card integrated into ActiveView with proper spacing and conditional rendering so that it appears above the progress card only when sponsors exist.

### US-006: Testing and Quality Assurance
**As a developer**, I need comprehensive tests for the sponsor card system so that it works reliably across different layouts and edge cases.

## Implementation Order
1. US-001: Database Schema and Storage Setup (Foundation)
2. US-002: Sponsor Data API (Backend)
3. US-003: Core Sponsor Card Component (Frontend Core)
4. US-004: Layout Configuration (Configuration)
5. US-005: ActiveView Integration (Integration)
6. US-006: Testing and Quality Assurance (Validation)

## Estimated Effort
**Total**: 3-4 days (24-32 hours)
- Backend: 1 day
- Frontend: 1.5 days
- Integration & Testing: 1-1.5 days

## Success Criteria
- ✅ Sponsor assets stored in Supabase with proper RLS
- ✅ API returns sponsor data in expected format
- ✅ Sponsor card displays with 1x1, 1x2, 1x3 layouts
- ✅ Card appears above progress card when sponsors exist
- ✅ Card is completely hidden when no sponsors exist
- ✅ All accessibility requirements met
- ✅ Tests pass and functionality works across devices