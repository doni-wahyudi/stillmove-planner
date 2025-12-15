-- Migration: Add linked_goal_id column to daily_habits table
-- This allows linking habits to annual goals for progress tracking

-- Add the linked_goal_id column to daily_habits
ALTER TABLE daily_habits 
ADD COLUMN IF NOT EXISTS linked_goal_id UUID REFERENCES annual_goals(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_habits_linked_goal ON daily_habits(linked_goal_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'daily_habits' AND column_name = 'linked_goal_id';
