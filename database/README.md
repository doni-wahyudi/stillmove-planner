# Database Setup Guide

This guide will help you set up the database schema and Row Level Security (RLS) policies for the Daily Planner Application using Supabase.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- A Supabase project created

## Setup Instructions

### Step 1: Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in the project details:
   - Name: Daily Planner
   - Database Password: (choose a strong password)
   - Region: (select closest to your users)
4. Click "Create new project"
5. Wait for the project to be provisioned (takes ~2 minutes)

### Step 2: Execute the Schema SQL

1. In your Supabase project dashboard, navigate to the **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `schema.sql` file
4. Paste it into the SQL editor
5. Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
6. Verify that all tables were created successfully

### Step 3: Verify Tables Were Created

1. Navigate to **Table Editor** in the left sidebar
2. You should see all 15 tables:
   - profiles
   - annual_goals
   - reading_list
   - monthly_data
   - weekly_goals
   - time_blocks
   - daily_entries
   - daily_habits
   - daily_habit_completions
   - weekly_habits
   - weekly_habit_completions
   - mood_tracker
   - sleep_tracker
   - water_tracker
   - action_plans

### Step 4: Verify Row Level Security (RLS)

1. Click on any table in the Table Editor
2. Click on the "Policies" tab
3. You should see 4 policies for each table:
   - SELECT policy (view own data)
   - INSERT policy (insert own data)
   - UPDATE policy (update own data)
   - DELETE policy (delete own data)

### Step 5: Get Your Supabase Credentials

1. Navigate to **Settings** → **API** in the left sidebar
2. Copy the following values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)
3. Add these to your `js/config.js` file:

```javascript
const SUPABASE_URL = 'YOUR_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

## Database Schema Overview

### Tables and Their Purpose

| Table | Purpose |
|-------|---------|
| `profiles` | User profile information (display name, timezone) |
| `annual_goals` | Annual goals with sub-goals and progress tracking |
| `reading_list` | Books to read with completion status and ratings |
| `monthly_data` | Monthly notes, checklists, and action plans |
| `weekly_goals` | Weekly goals with priority levels |
| `time_blocks` | Time blocks for weekly schedule (30-min increments) |
| `daily_entries` | Daily checklists, journal entries, and gratitude notes |
| `daily_habits` | Daily habit definitions (up to 30 habits) |
| `daily_habit_completions` | Daily habit completion tracking |
| `weekly_habits` | Weekly habit definitions (up to 10 habits) |
| `weekly_habit_completions` | Weekly habit completion tracking |
| `mood_tracker` | Daily mood tracking with emoji indicators |
| `sleep_tracker` | Sleep hours tracking (bedtime, wake time, duration) |
| `water_tracker` | Daily water intake tracking |
| `action_plans` | Action plans with progress and evaluation |

## Row Level Security (RLS)

All tables have RLS enabled to ensure data isolation between users. Each user can only:
- **SELECT**: View their own data
- **INSERT**: Create data associated with their user ID
- **UPDATE**: Modify their own data
- **DELETE**: Remove their own data

### How RLS Works

RLS policies use `auth.uid()` to get the currently authenticated user's ID and compare it with the `user_id` column in each table. This ensures that:

1. Users cannot see other users' data
2. Users cannot modify other users' data
3. All security is enforced at the database level
4. Even if someone has your API keys, they can only access their own data

## Testing RLS Policies

To test that RLS policies are working correctly:

1. Create two test user accounts
2. Sign in as User A and create some data (goals, habits, etc.)
3. Sign out and sign in as User B
4. Verify that User B cannot see User A's data
5. Create some data as User B
6. Sign out and sign in as User A
7. Verify that User A cannot see User B's data

You can also use the `test-rls.sql` script to verify RLS policies programmatically.

## Performance Optimization

The schema includes indexes on commonly queried columns:
- User ID + Date combinations
- User ID + Year/Month combinations
- Foreign key relationships

These indexes ensure fast query performance even with large amounts of data.

## Automatic Timestamp Updates

All tables with an `updated_at` column have triggers that automatically update this timestamp whenever a row is modified. You don't need to manually set `updated_at` in your application code.

## Troubleshooting

### Issue: Tables not created
**Solution**: Make sure you're running the SQL in the correct project and that you have the necessary permissions.

### Issue: RLS policies not working
**Solution**: Verify that:
1. RLS is enabled on the table (check the Policies tab)
2. You're authenticated when making requests
3. The `user_id` column matches `auth.uid()`

### Issue: Foreign key constraint errors
**Solution**: Make sure you're inserting data in the correct order:
1. User must be authenticated (creates entry in `auth.users`)
2. Create profile (optional)
3. Create other data (goals, habits, etc.)

### Issue: Cannot insert data
**Solution**: Check that:
1. You're authenticated
2. The `user_id` in your INSERT matches your authenticated user ID
3. All required fields are provided
4. Data types match the schema

## Next Steps

After setting up the database:
1. Update `js/config.js` with your Supabase credentials
2. Test authentication by signing up a new user
3. Test data operations (create, read, update, delete)
4. Verify real-time subscriptions are working
5. Test offline functionality

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
