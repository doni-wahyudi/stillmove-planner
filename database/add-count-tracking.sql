-- Migration to add count tracking support to interval challenges
-- Run this if you have already created the challenge tables

DO $$ 
BEGIN
    -- Add count_value if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='challenge_completions' AND column_name='count_value') THEN
        ALTER TABLE challenge_completions ADD COLUMN count_value NUMERIC DEFAULT NULL;
    END IF;

    -- Add notes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='challenge_completions' AND column_name='notes') THEN
        ALTER TABLE challenge_completions ADD COLUMN notes TEXT;
    END IF;
END $$;
