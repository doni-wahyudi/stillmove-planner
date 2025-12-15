-- Add page progress columns to reading_list table
-- Run this in your Supabase SQL Editor

-- Add current_page column (tracks how many pages read)
ALTER TABLE reading_list 
ADD COLUMN IF NOT EXISTS current_page INTEGER DEFAULT 0;

-- Add total_pages column (total pages in the book)
ALTER TABLE reading_list 
ADD COLUMN IF NOT EXISTS total_pages INTEGER DEFAULT 0;

-- Update RLS policies if needed (the existing policies should cover these new columns)

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'reading_list' 
AND column_name IN ('current_page', 'total_pages');
