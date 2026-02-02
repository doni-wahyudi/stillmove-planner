-- ============================================================================
-- HABIT-CARD LINKING MIGRATION
-- Adds linked_habit_id to kanban_cards to associate tasks with habits
-- ============================================================================

-- Add linked_habit_id column to kanban_cards
ALTER TABLE kanban_cards 
ADD COLUMN IF NOT EXISTS linked_habit_id UUID REFERENCES daily_habits(id) ON DELETE SET NULL;

-- Add index for performance on habit-card lookups
CREATE INDEX IF NOT EXISTS idx_kanban_cards_habit ON kanban_cards(linked_habit_id) WHERE linked_habit_id IS NOT NULL;

-- Verification:
-- After running this in Supabase SQL Editor:
-- 1. kanban_cards should have a new column 'linked_habit_id'
-- 2. Index 'idx_kanban_cards_habit' should be created
