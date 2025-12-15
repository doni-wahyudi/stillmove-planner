-- Add notes column to daily_habit_completions table
-- Run this in your Supabase SQL Editor

-- Add notes column for habit journal entries
ALTER TABLE daily_habit_completions 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'daily_habit_completions' 
AND column_name = 'notes';
