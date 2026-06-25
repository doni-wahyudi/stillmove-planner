-- ============================================================================
-- MULTI-PROFILE SUPPORT MIGRATION
-- Execute this script in your Supabase SQL Editor to enable multiple profiles.
-- ============================================================================

-- 1. Create sub_profiles table
CREATE TABLE IF NOT EXISTS sub_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '👤',
  avatar_data TEXT, -- Base64 representation of custom profile avatar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on sub_profiles
ALTER TABLE sub_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sub_profiles
CREATE POLICY "Users can view their own sub profiles"
  ON sub_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sub profiles"
  ON sub_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sub profiles"
  ON sub_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sub profiles"
  ON sub_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Apply updated_at trigger to sub_profiles (if trigger function exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_sub_profiles_updated_at BEFORE UPDATE ON sub_profiles
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 2. Alter profiles table to reference active_profile_id
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_profile_id UUID REFERENCES sub_profiles(id) ON DELETE SET NULL;

-- 3. Create default 'Personal' profile for all existing users
INSERT INTO sub_profiles (user_id, name, emoji)
SELECT id, 'Personal', '👤' FROM profiles
ON CONFLICT DO NOTHING;

-- 4. Set active_profile_id for all existing users
UPDATE profiles p
SET active_profile_id = (
    SELECT id FROM sub_profiles sp
    WHERE sp.user_id = p.id AND sp.name = 'Personal'
    LIMIT 1
)
WHERE p.active_profile_id IS NULL;

-- ============================================================================
-- ADD profile_id TO DATA TABLES AND BACKFILL EXISTING DATA
-- ============================================================================

-- Helper macro function or manual statement block to add profile_id to each table
-- We write them out manually for simplicity and compatibility with standard SQL editor.

-- --- 1. annual_goals ---
ALTER TABLE annual_goals ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE annual_goals t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE annual_goals ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_annual_goals_profile ON annual_goals(profile_id);

-- --- 2. reading_list ---
ALTER TABLE reading_list ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE reading_list t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE reading_list ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reading_list_profile ON reading_list(profile_id);

-- --- 3. monthly_data ---
ALTER TABLE monthly_data ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE monthly_data t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE monthly_data ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_monthly_data_profile ON monthly_data(profile_id);
-- Adjust unique constraint to include profile_id instead of user_id to allow separate records per profile
ALTER TABLE monthly_data DROP CONSTRAINT IF EXISTS monthly_data_user_id_year_month_key;
ALTER TABLE monthly_data ADD CONSTRAINT monthly_data_profile_id_year_month_key UNIQUE (profile_id, year, month);

-- --- 4. weekly_goals ---
ALTER TABLE weekly_goals ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE weekly_goals t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE weekly_goals ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_weekly_goals_profile ON weekly_goals(profile_id);

-- --- 5. time_blocks ---
ALTER TABLE time_blocks ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE time_blocks t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE time_blocks ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_blocks_profile ON time_blocks(profile_id);

-- --- 6. daily_entries ---
ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE daily_entries t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE daily_entries ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_entries_profile ON daily_entries(profile_id);
-- Adjust unique constraint for daily entries
ALTER TABLE daily_entries DROP CONSTRAINT IF EXISTS daily_entries_user_id_date_key;
ALTER TABLE daily_entries ADD CONSTRAINT daily_entries_profile_id_date_key UNIQUE (profile_id, date);

-- --- 7. daily_habits ---
ALTER TABLE daily_habits ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE daily_habits t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE daily_habits ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_habits_profile ON daily_habits(profile_id);

-- --- 8. daily_habit_completions ---
ALTER TABLE daily_habit_completions ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE daily_habit_completions t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE daily_habit_completions ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_habit_completions_profile ON daily_habit_completions(profile_id);

-- --- 9. weekly_habits ---
ALTER TABLE weekly_habits ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE weekly_habits t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE weekly_habits ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_weekly_habits_profile ON weekly_habits(profile_id);

-- --- 10. weekly_habit_completions ---
ALTER TABLE weekly_habit_completions ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE weekly_habit_completions t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE weekly_habit_completions ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_weekly_habit_completions_profile ON weekly_habit_completions(profile_id);

-- --- 11. mood_tracker ---
ALTER TABLE mood_tracker ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE mood_tracker t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE mood_tracker ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mood_tracker_profile ON mood_tracker(profile_id);
-- Adjust unique constraint
ALTER TABLE mood_tracker DROP CONSTRAINT IF EXISTS mood_tracker_user_id_date_key;
ALTER TABLE mood_tracker ADD CONSTRAINT mood_tracker_profile_id_date_key UNIQUE (profile_id, date);

-- --- 12. sleep_tracker ---
ALTER TABLE sleep_tracker ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE sleep_tracker t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE sleep_tracker ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sleep_tracker_profile ON sleep_tracker(profile_id);
-- Adjust unique constraint
ALTER TABLE sleep_tracker DROP CONSTRAINT IF EXISTS sleep_tracker_user_id_date_key;
ALTER TABLE sleep_tracker ADD CONSTRAINT sleep_tracker_profile_id_date_key UNIQUE (profile_id, date);

-- --- 13. water_tracker ---
ALTER TABLE water_tracker ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE water_tracker t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE water_tracker ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_water_tracker_profile ON water_tracker(profile_id);
-- Adjust unique constraint
ALTER TABLE water_tracker DROP CONSTRAINT IF EXISTS water_tracker_user_id_date_key;
ALTER TABLE water_tracker ADD CONSTRAINT water_tracker_profile_id_date_key UNIQUE (profile_id, date);

-- --- 14. action_plans ---
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
UPDATE action_plans t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
ALTER TABLE action_plans ALTER COLUMN profile_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_plans_profile ON action_plans(profile_id);

-- --- 15. pomodoro_sessions ---
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pomodoro_sessions') THEN
        ALTER TABLE pomodoro_sessions ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
        UPDATE pomodoro_sessions t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
        ALTER TABLE pomodoro_sessions ALTER COLUMN profile_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_profile ON pomodoro_sessions(profile_id);
    END IF;
END $$;

-- --- 16. mindmaps ---
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mindmaps') THEN
        ALTER TABLE mindmaps ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
        UPDATE mindmaps t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
        ALTER TABLE mindmaps ALTER COLUMN profile_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_mindmaps_profile ON mindmaps(profile_id);
    END IF;
END $$;

-- --- 17. kanban_boards ---
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kanban_boards') THEN
        ALTER TABLE kanban_boards ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
        UPDATE kanban_boards t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
        ALTER TABLE kanban_boards ALTER COLUMN profile_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_kanban_boards_profile ON kanban_boards(profile_id);
    END IF;
END $$;

-- --- 18. interval_challenges ---
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'interval_challenges') THEN
        ALTER TABLE interval_challenges ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
        UPDATE interval_challenges t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
        ALTER TABLE interval_challenges ALTER COLUMN profile_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_interval_challenges_profile ON interval_challenges(profile_id);
    END IF;
END $$;

-- --- 19. flowcharts ---
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'flowcharts') THEN
        ALTER TABLE flowcharts ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
        UPDATE flowcharts t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
        ALTER TABLE flowcharts ALTER COLUMN profile_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_flowcharts_profile ON flowcharts(profile_id);
    END IF;
END $$;

-- --- 20. custom_categories ---
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'custom_categories') THEN
        ALTER TABLE custom_categories ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
        UPDATE custom_categories t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
        ALTER TABLE custom_categories ALTER COLUMN profile_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_custom_categories_profile ON custom_categories(profile_id);
    END IF;
END $$;

-- --- 21. canvas_documents ---
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'canvas_documents') THEN
        ALTER TABLE canvas_documents ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
        UPDATE canvas_documents t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
        ALTER TABLE canvas_documents ALTER COLUMN profile_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_canvas_documents_profile ON canvas_documents(profile_id);
    END IF;
END $$;

-- --- 22. calendar_events ---
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_events') THEN
        ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE;
        UPDATE calendar_events t SET profile_id = (SELECT id FROM sub_profiles sp WHERE sp.user_id = t.user_id AND sp.name = 'Personal' LIMIT 1) WHERE t.profile_id IS NULL;
        ALTER TABLE calendar_events ALTER COLUMN profile_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_calendar_events_profile ON calendar_events(profile_id);
    END IF;
END $$;
