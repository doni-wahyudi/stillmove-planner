-- Daily Planner Application Database Schema
-- This file contains all table definitions and Row Level Security (RLS) policies
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ============================================================================
-- ANNUAL GOALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS annual_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  sub_goals JSONB DEFAULT '[]',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for annual_goals
ALTER TABLE annual_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
  ON annual_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON annual_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON annual_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON annual_goals FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- READING LIST TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS reading_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  book_title TEXT NOT NULL,
  author TEXT,
  completed BOOLEAN DEFAULT FALSE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for reading_list
ALTER TABLE reading_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reading list"
  ON reading_list FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading list"
  ON reading_list FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading list"
  ON reading_list FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading list"
  ON reading_list FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- MONTHLY DATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS monthly_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  notes TEXT,
  checklist JSONB DEFAULT '[]',
  action_plan JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- RLS Policies for monthly_data
ALTER TABLE monthly_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own monthly data"
  ON monthly_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly data"
  ON monthly_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly data"
  ON monthly_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly data"
  ON monthly_data FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- WEEKLY GOALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 53),
  goal_text TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('Urgent', 'Medium', 'Low')),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for weekly_goals
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly goals"
  ON weekly_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly goals"
  ON weekly_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly goals"
  ON weekly_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly goals"
  ON weekly_goals FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TIME BLOCKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS time_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  activity TEXT NOT NULL,
  category TEXT CHECK (category IN ('Personal', 'Work', 'Business', 'Family', 'Education', 'Social', 'Project')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for time_blocks
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own time blocks"
  ON time_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time blocks"
  ON time_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time blocks"
  ON time_blocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time blocks"
  ON time_blocks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- DAILY ENTRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  checklist JSONB DEFAULT '[]',
  journal_text TEXT,
  gratitude_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- RLS Policies for daily_entries
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily entries"
  ON daily_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily entries"
  ON daily_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily entries"
  ON daily_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily entries"
  ON daily_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- DAILY HABITS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_name TEXT NOT NULL,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for daily_habits
ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily habits"
  ON daily_habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily habits"
  ON daily_habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily habits"
  ON daily_habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily habits"
  ON daily_habits FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- DAILY HABIT COMPLETIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_habit_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID REFERENCES daily_habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

-- RLS Policies for daily_habit_completions
ALTER TABLE daily_habit_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own habit completions"
  ON daily_habit_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit completions"
  ON daily_habit_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit completions"
  ON daily_habit_completions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit completions"
  ON daily_habit_completions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- WEEKLY HABITS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_name TEXT NOT NULL,
  target_days_per_week INTEGER DEFAULT 7 CHECK (target_days_per_week >= 1 AND target_days_per_week <= 7),
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for weekly_habits
ALTER TABLE weekly_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly habits"
  ON weekly_habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly habits"
  ON weekly_habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly habits"
  ON weekly_habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly habits"
  ON weekly_habits FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- WEEKLY HABIT COMPLETIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_habit_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID REFERENCES weekly_habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

-- RLS Policies for weekly_habit_completions
ALTER TABLE weekly_habit_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly habit completions"
  ON weekly_habit_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly habit completions"
  ON weekly_habit_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly habit completions"
  ON weekly_habit_completions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly habit completions"
  ON weekly_habit_completions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- MOOD TRACKER TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS mood_tracker (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  mood_emoji TEXT NOT NULL CHECK (mood_emoji IN ('🥰', '😁', '😶', '😵', '😩')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- RLS Policies for mood_tracker
ALTER TABLE mood_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mood tracker"
  ON mood_tracker FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mood tracker"
  ON mood_tracker FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood tracker"
  ON mood_tracker FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood tracker"
  ON mood_tracker FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SLEEP TRACKER TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sleep_tracker (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  bedtime TIME,
  wake_time TIME,
  hours_slept DECIMAL(3,1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- RLS Policies for sleep_tracker
ALTER TABLE sleep_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sleep tracker"
  ON sleep_tracker FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sleep tracker"
  ON sleep_tracker FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep tracker"
  ON sleep_tracker FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sleep tracker"
  ON sleep_tracker FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- WATER TRACKER TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS water_tracker (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  glasses_consumed INTEGER DEFAULT 0 CHECK (glasses_consumed >= 0),
  goal_glasses INTEGER DEFAULT 8 CHECK (goal_glasses > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- RLS Policies for water_tracker
ALTER TABLE water_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own water tracker"
  ON water_tracker FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own water tracker"
  ON water_tracker FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own water tracker"
  ON water_tracker FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own water tracker"
  ON water_tracker FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- ACTION PLANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS action_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  life_area TEXT NOT NULL,
  specific_action TEXT NOT NULL,
  frequency TEXT,
  success_criteria TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  evaluation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for action_plans
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own action plans"
  ON action_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own action plans"
  ON action_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own action plans"
  ON action_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own action plans"
  ON action_plans FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_annual_goals_user_year ON annual_goals(user_id, year);
CREATE INDEX IF NOT EXISTS idx_reading_list_user_year ON reading_list(user_id, year);
CREATE INDEX IF NOT EXISTS idx_monthly_data_user_year_month ON monthly_data(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_year_week ON weekly_goals(user_id, year, week_number);
CREATE INDEX IF NOT EXISTS idx_time_blocks_user_date ON time_blocks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_entries_user_date ON daily_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_habits_user ON daily_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_habit_completions_habit_date ON daily_habit_completions(habit_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_habit_completions_user_date ON daily_habit_completions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_weekly_habits_user ON weekly_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_habit_completions_habit_date ON weekly_habit_completions(habit_id, date);
CREATE INDEX IF NOT EXISTS idx_weekly_habit_completions_user_date ON weekly_habit_completions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_mood_tracker_user_date ON mood_tracker(user_id, date);
CREATE INDEX IF NOT EXISTS idx_sleep_tracker_user_date ON sleep_tracker(user_id, date);
CREATE INDEX IF NOT EXISTS idx_water_tracker_user_date ON water_tracker(user_id, date);
CREATE INDEX IF NOT EXISTS idx_action_plans_user_year_month ON action_plans(user_id, year, month);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annual_goals_updated_at BEFORE UPDATE ON annual_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reading_list_updated_at BEFORE UPDATE ON reading_list
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_data_updated_at BEFORE UPDATE ON monthly_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_goals_updated_at BEFORE UPDATE ON weekly_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_blocks_updated_at BEFORE UPDATE ON time_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_entries_updated_at BEFORE UPDATE ON daily_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_habits_updated_at BEFORE UPDATE ON daily_habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_habits_updated_at BEFORE UPDATE ON weekly_habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mood_tracker_updated_at BEFORE UPDATE ON mood_tracker
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sleep_tracker_updated_at BEFORE UPDATE ON sleep_tracker
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_water_tracker_updated_at BEFORE UPDATE ON water_tracker
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_plans_updated_at BEFORE UPDATE ON action_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
