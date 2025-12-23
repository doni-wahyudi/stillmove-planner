-- ============================================
-- COPY THIS ENTIRE FILE AND RUN IN SUPABASE
-- ============================================
-- Go to: Supabase Dashboard > SQL Editor
-- Click: New Query
-- Paste this entire file
-- Click: Run (or Ctrl+Enter)
-- ============================================

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

-- Fix RLS for time_blocks
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own time blocks" ON time_blocks;
CREATE POLICY "Users can manage their own time blocks"
ON time_blocks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix RLS for daily_entries
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own daily entries" ON daily_entries;
CREATE POLICY "Users can manage their own daily entries"
ON daily_entries
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

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

DROP POLICY IF EXISTS "Users can manage their own daily habit completions" ON daily_habit_completions;
CREATE POLICY "Users can manage their own daily habit completions"
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

DROP POLICY IF EXISTS "Users can manage their own weekly habit completions" ON weekly_habit_completions;
CREATE POLICY "Users can manage their own weekly habit completions"
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

-- Fix RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================
-- DONE! Now refresh your app and try again
-- ============================================
