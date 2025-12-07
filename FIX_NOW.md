# 🚨 FIX IT NOW - Quick Solution

## The Problem
Only Pomodoro works = **RLS (Row Level Security) policies are missing or wrong**

Pomodoro doesn't use database, so it works.
Everything else needs database access and fails.

## The Solution (5 minutes)

### Step 1: Open Supabase Dashboard
Go to: https://supabase.com/dashboard

### Step 2: Open SQL Editor
Click: **SQL Editor** (left sidebar)

### Step 3: Run This Query
Click **New Query** and paste this:

```sql
-- Fix RLS for daily_habits
ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own daily habits" ON daily_habits;
CREATE POLICY "Users can manage their own daily habits"
ON daily_habits
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix RLS for daily_habit_completions
ALTER TABLE daily_habit_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own completions" ON daily_habit_completions;
CREATE POLICY "Users can manage their own completions"
ON daily_habit_completions
FOR ALL
USING (
    auth.uid() = (
        SELECT user_id FROM daily_habits 
        WHERE id = daily_habit_completions.habit_id
    )
);

-- Fix RLS for weekly_habits
ALTER TABLE weekly_habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own weekly habits" ON weekly_habits;
CREATE POLICY "Users can manage their own weekly habits"
ON weekly_habits
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix RLS for weekly_habit_completions
ALTER TABLE weekly_habit_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own weekly completions" ON weekly_habit_completions;
CREATE POLICY "Users can manage their own weekly completions"
ON weekly_habit_completions
FOR ALL
USING (
    auth.uid() = (
        SELECT user_id FROM weekly_habits 
        WHERE id = weekly_habit_completions.habit_id
    )
);

-- Fix RLS for action_plans
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own action plans" ON action_plans;
CREATE POLICY "Users can manage their own action plans"
ON action_plans
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix RLS for annual_goals
ALTER TABLE annual_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own annual goals" ON annual_goals;
CREATE POLICY "Users can manage their own annual goals"
ON annual_goals
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix RLS for reading_list
ALTER TABLE reading_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own reading list" ON reading_list;
CREATE POLICY "Users can manage their own reading list"
ON reading_list
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix RLS for monthly_data
ALTER TABLE monthly_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own monthly data" ON monthly_data;
CREATE POLICY "Users can manage their own monthly data"
ON monthly_data
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix RLS for weekly_goals
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own weekly goals" ON weekly_goals;
CREATE POLICY "Users can manage their own weekly goals"
ON weekly_goals
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix RLS for mood_tracker
ALTER TABLE mood_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own mood" ON mood_tracker;
CREATE POLICY "Users can manage their own mood"
ON mood_tracker
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix RLS for sleep_tracker
ALTER TABLE sleep_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own sleep" ON sleep_tracker;
CREATE POLICY "Users can manage their own sleep"
ON sleep_tracker
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix RLS for water_tracker
ALTER TABLE water_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own water" ON water_tracker;
CREATE POLICY "Users can manage their own water"
ON water_tracker
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Step 4: Click "Run" (or press Ctrl+Enter)

### Step 5: Refresh Your App
Go back to your app and refresh the page (F5)

## Test It

1. Try to add a habit
2. Try to add an action plan
3. Try to add an annual goal

**Should all work now!** ✅

## Still Not Working?

### Quick Check:
Open: `http://localhost:8000/test-modules.html`

This will show exactly what's failing.

### Most Common Issues:

1. **Wrong Supabase credentials**
   - Check `js/config.js`
   - Get correct values from Supabase Dashboard > Settings > API

2. **Not signed in**
   - Sign out and sign in again
   - Clear browser cache (Ctrl+Shift+R)

3. **Tables don't exist**
   - Run the FULL `database/schema.sql` file
   - This creates all tables + RLS policies

## Need More Help?

1. Open browser console (F12)
2. Copy any RED error messages
3. Open `http://localhost:8000/test-modules.html`
4. Take screenshot
5. Share both

That will show exactly what's wrong!

---

**TL;DR:** Run the SQL above in Supabase Dashboard > SQL Editor, then refresh your app. Done! 🎉
