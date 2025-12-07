# 🔧 Troubleshooting Guide

## Quick Diagnosis

### Step 1: Run Module Test
1. Make sure server is running: `python -m http.server 8000`
2. Open: `http://localhost:8000/test-modules.html`
3. Check which tests FAIL (red background)
4. This will tell us exactly what's broken

### Step 2: Check Browser Console
1. Open your app: `http://localhost:8000/index.html`
2. Press **F12** to open Developer Tools
3. Click **Console** tab
4. Look for RED error messages
5. Copy the EXACT error text

## Common Issues & Solutions

### Issue 1: "Only Pomodoro Works"

**Possible Causes:**
1. **RLS Policies Not Set Up** - Most likely!
2. **Authentication Issue**
3. **Module Loading Error**

**Solution:**
```sql
-- Go to Supabase Dashboard > SQL Editor
-- Run this to check RLS:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- If rowsecurity is false, RLS is not enabled
-- Run the schema.sql file from database/ folder
```

### Issue 2: "Cannot read property 'from' of undefined"

**Cause:** Supabase client not initialized

**Solution:**
1. Check `js/config.js`
2. Make sure SUPABASE_URL and SUPABASE_ANON_KEY are correct
3. Get them from: Supabase Dashboard > Settings > API

### Issue 3: "new row violates row-level security policy"

**Cause:** RLS policies blocking inserts

**Solution:**
```sql
-- In Supabase SQL Editor, run:

-- Enable RLS on all tables
ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Create policies (example for daily_habits)
CREATE POLICY "Users can view their own habits"
ON daily_habits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
ON daily_habits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
ON daily_habits FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
ON daily_habits FOR DELETE
USING (auth.uid() = user_id);
```

**OR** run the complete schema from `database/schema.sql`

### Issue 4: "Failed to load module"

**Cause:** Import path wrong or file missing

**Check:**
1. Open Network tab in DevTools (F12)
2. Look for 404 errors
3. Check which file is missing
4. Verify file exists in correct location

### Issue 5: "CORS error"

**Cause:** Opening file directly instead of using server

**Solution:**
- Don't double-click HTML files
- Always use: `http://localhost:8000`
- Not: `file:///C:/...`

## Detailed Debugging Steps

### 1. Test Supabase Connection

Open browser console and run:
```javascript
// Test Supabase
const { createClient } = supabase;
const client = createClient(
    'YOUR_SUPABASE_URL',
    'YOUR_SUPABASE_ANON_KEY'
);

// Test auth
client.auth.getSession().then(result => {
    console.log('Session:', result);
});

// Test database
client.from('daily_habits').select('*').then(result => {
    console.log('Habits:', result);
});
```

### 2. Test Data Service

```javascript
import('./js/data-service.js').then(async (module) => {
    const dataService = module.default;
    console.log('Data service:', dataService);
    
    try {
        const habits = await dataService.getDailyHabits();
        console.log('✓ Habits loaded:', habits);
    } catch (error) {
        console.error('✗ Error:', error);
    }
});
```

### 3. Check RLS Policies

In Supabase Dashboard:
1. Go to **Database** > **Tables**
2. Click on a table (e.g., `daily_habits`)
3. Check if **RLS enabled** is ON
4. Click **Policies** tab
5. Should see 4 policies: SELECT, INSERT, UPDATE, DELETE

### 4. Check User ID

```javascript
// In browser console
import('./js/auth-service.js').then(async (module) => {
    const session = await module.default.getSession();
    console.log('User ID:', session?.user?.id);
});
```

## Most Likely Fix

Based on "only Pomodoro works", the issue is probably **RLS policies**.

Pomodoro doesn't use the database, so it works.
Other views try to read/write database and fail due to RLS.

### Quick Fix:

1. Go to Supabase Dashboard
2. Click **SQL Editor**
3. Click **New Query**
4. Copy and paste the ENTIRE contents of `database/schema.sql`
5. Click **Run**
6. Refresh your app

This will:
- Create all tables (if missing)
- Enable RLS on all tables
- Create all necessary policies
- Set up proper permissions

## Still Not Working?

Run the module test and share the results:
1. Open: `http://localhost:8000/test-modules.html`
2. Take a screenshot
3. Also copy console errors (F12 > Console)
4. Share both

This will show exactly what's failing!

## Emergency Reset

If nothing works:

1. **Reset Database:**
   - Supabase Dashboard > Database > Tables
   - Delete all tables
   - Run `database/schema.sql` again

2. **Clear Browser:**
   - Press F12
   - Right-click refresh button
   - Click "Empty Cache and Hard Reload"

3. **Sign Out and In:**
   - Sign out of app
   - Clear localStorage (F12 > Application > Local Storage > Clear)
   - Sign in again

4. **Check Supabase Project:**
   - Make sure project is not paused
   - Check project status in dashboard
   - Verify API keys are correct

## Get Help

If still stuck, provide:
1. Screenshot of `test-modules.html` results
2. Console errors (F12 > Console)
3. Network errors (F12 > Network > filter by "failed")
4. Supabase project status

This will help diagnose the exact issue!
