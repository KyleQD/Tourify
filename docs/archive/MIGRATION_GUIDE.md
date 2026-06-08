# Tourify Database Migration Guide

**🎯 Goal**: Set up all missing tables for your Tourify platform safely and incrementally.

## Why Smaller Migrations?

We're breaking the large migration into smaller, focused pieces to:
- ✅ **Avoid cascading errors** - if one fails, you don't lose all progress
- ✅ **Debug issues easily** - pinpoint exactly what went wrong
- ✅ **Run incrementally** - execute one piece at a time
- ✅ **Verify at each step** - see exactly what was created

## Migration Order

Run these files **in order** in your Supabase SQL Editor:

### 1. Helper Functions Setup
**File**: `01_helper_functions.sql`
**Purpose**: Sets up utility functions and extensions
**What it creates**:
- `column_exists()` function for safe column checking
- `update_updated_at_column()` function for automatic timestamps  
- `get_events_user_column()` function for dynamic column detection
- Required PostgreSQL extensions

### 2. Core Tables
**File**: `02_core_tables.sql`  
**Purpose**: Creates the main events/booking system tables
**What it creates**:
- `events` table (enhanced if doesn't exist)
- `tours` table 
- `bookings` table
- `booking_requests` table
- RLS security + update triggers

### 3. Artist Content Tables
**File**: `03_artist_content_tables.sql`
**Purpose**: Creates artist portfolio and content management tables
**What it creates**:
- `artist_works` table (portfolio/media)
- `artist_events` table (artist-specific events)
- `artist_blog_posts` table (blog content)
- `artist_documents` table (press kits, contracts)
- `artist_merchandise` table (store items)

### 4. Event Management Tables  
**File**: `04_event_management_tables.sql`
**Purpose**: Creates analytics, campaigns, expenses, budgets tables
**What it creates**:
- `event_analytics` & `event_analytics_daily` tables
- `event_marketing_campaigns` table
- `event_promo_codes` table
- `event_expenses` & `event_budgets` tables
- `event_team_members` table

### 5. Account & Jobs Tables
**File**: `05_account_jobs_tables.sql`
**Purpose**: Creates account relationships and job system tables
**What it creates**:
- `account_relationships` table (multi-account system)
- `account_activity_log` table
- `notifications` table (enhanced)
- `staff_jobs` & `staff_applications` tables

### 6. RLS Policies & Indexes
**File**: `06_policies_indexes.sql`
**Purpose**: Creates all Row Level Security policies and performance indexes
**What it creates**:
- Comprehensive RLS policies for all tables
- Performance indexes for key columns
- Final platform verification

## How to Run

1. **Open Supabase Dashboard** → SQL Editor
2. **Run files in order** (copy/paste each file's content)
3. **Check the output** - each file shows verification results
4. **If a file fails** - debug that specific piece without losing progress
5. **Continue with next file** once current one succeeds

## What to Expect

Each migration file will:
- ✅ Show clear progress messages
- ✅ Verify what was created  
- ✅ Skip existing tables safely
- ✅ Provide helpful error messages if something fails

## Next Steps

**Start with**: `01_helper_functions.sql`

Copy the content and paste it into your Supabase SQL Editor, then run it. You should see:

```
✅ HELPER FUNCTIONS SETUP COMPLETE
Created utility functions:
- update_updated_at_column() - for automatic timestamp updates
- column_exists() - for safe column checking  
- get_events_user_column() - for dynamic events column detection
```

Then proceed to `02_core_tables.sql` and so on.

---

💡 **Tip**: If any migration fails, you can re-run it safely - they all check for existing tables/columns before creating anything. 