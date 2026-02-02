-- ============================================================================
-- ADD DUE DATE TO CHECKLIST ITEMS
-- Adds a due_date column to kanban_checklist_items table
-- 
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Create a new query
-- 3. Copy and paste this entire file
-- 4. Click Run (or press Ctrl+Enter / Cmd+Enter)
-- ============================================================================

-- Add due_date column to checklist items
ALTER TABLE kanban_checklist_items 
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Add index for querying checklist items by due date
CREATE INDEX IF NOT EXISTS idx_checklist_items_due_date 
ON kanban_checklist_items(due_date);

-- ============================================================================
-- VERIFICATION
-- After running this script, verify the column was added:
-- 1. Go to Table Editor in Supabase Dashboard
-- 2. Select kanban_checklist_items table
-- 3. Verify the due_date column exists (should be nullable DATE type)
-- ============================================================================
