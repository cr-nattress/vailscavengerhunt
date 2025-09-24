# Epic: Supabase Migration

## Overview
Migrate all JSON data storage from Netlify Blobs to Supabase PostgreSQL for improved scalability, real-time capabilities, built-in authentication, and enhanced developer experience with significant cost savings.

## User Stories

### 001 - Supabase Setup & Database Design
Set up Supabase project, database schema with proper relationships, RLS policies, and indexes.

### 002 - Authentication Integration
Implement Supabase Auth to replace custom JWT system with built-in team authentication.

### 003 - Real-time Features
Implement real-time leaderboards and live progress updates using Supabase subscriptions.

### 004 - Data Migration Scripts
Create scripts to migrate existing data from Netlify Blobs to Supabase PostgreSQL.

### 005 - Storage Migration (Optional)
Evaluate and optionally migrate from Cloudinary to Supabase Storage for additional cost savings.

## Implementation Order
Follow the numerical order of user stories for proper dependency management.

## Success Criteria
- Zero data loss during migration
- Real-time leaderboard functionality
- Built-in authentication replaces custom JWT
- Row Level Security protects team data
- Improved developer experience with PostgreSQL
- Significant cost reduction vs current setup

## Estimated Timeline
- Total: 2-3 weeks
- Foundation (001-002): 1 week
- Features & Migration (003-004): 1 week
- Optional Storage (005): 1 week

## Cost Benefits
- **Current**: Netlify ($19) + Cloudinary ($89) = $108/month
- **With Supabase**: Netlify ($19) + Supabase ($25) = $44/month
- **Potential Savings**: $64/month (59% reduction)