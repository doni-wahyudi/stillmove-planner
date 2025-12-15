-- Migration: Add deadline column to annual_goals table
-- This enables the Goal Deadlines feature with countdown display

-- Add the deadline column to annual_goals
ALTER TABLE annual_goals 
ADD COLUMN IF NOT EXISTS deadline DATE;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'annual_goals' AND column_name = 'deadline';
