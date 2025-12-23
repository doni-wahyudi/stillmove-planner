-- Pomodoro Sessions Table Migration
-- For tracking Pomodoro sessions with task linking and statistics
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- POMODORO SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  session_type TEXT NOT NULL DEFAULT 'focus' CHECK (session_type IN ('focus', 'shortBreak', 'longBreak')),
  was_completed BOOLEAN DEFAULT FALSE,
  -- Task linking (optional)
  linked_goal_id UUID REFERENCES annual_goals(id) ON DELETE SET NULL,
  linked_time_block_id UUID REFERENCES time_blocks(id) ON DELETE SET NULL,
  task_description TEXT,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Users can view their own pomodoro sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Users can insert their own pomodoro sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Users can update their own pomodoro sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Users can delete their own pomodoro sessions" ON pomodoro_sessions;

-- RLS Policies
CREATE POLICY "Users can view their own pomodoro sessions"
  ON pomodoro_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pomodoro sessions"
  ON pomodoro_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pomodoro sessions"
  ON pomodoro_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pomodoro sessions"
  ON pomodoro_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_date ON pomodoro_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_completed ON pomodoro_sessions(user_id, was_completed);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_pomodoro_sessions_updated_at ON pomodoro_sessions;
CREATE TRIGGER update_pomodoro_sessions_updated_at 
  BEFORE UPDATE ON pomodoro_sessions
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- After running, check:
-- 1. Table 'pomodoro_sessions' exists in Table Editor
-- 2. RLS is enabled (lock icon visible)
-- ============================================================================
