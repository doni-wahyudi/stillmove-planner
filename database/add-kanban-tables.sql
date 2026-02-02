-- ============================================================================
-- KANBAN BOARD TABLES
-- Add Kanban board feature for visual task management
-- 
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Create a new query
-- 3. Copy and paste this entire file
-- 4. Click Run (or press Ctrl+Enter / Cmd+Enter)
-- ============================================================================

-- ============================================================================
-- KANBAN BOARDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS kanban_boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES custom_categories(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Users can view their own kanban boards" ON kanban_boards;
DROP POLICY IF EXISTS "Users can insert their own kanban boards" ON kanban_boards;
DROP POLICY IF EXISTS "Users can update their own kanban boards" ON kanban_boards;
DROP POLICY IF EXISTS "Users can delete their own kanban boards" ON kanban_boards;

-- RLS Policy: Users can view their own boards
CREATE POLICY "Users can view their own kanban boards"
  ON kanban_boards FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own boards
CREATE POLICY "Users can insert their own kanban boards"
  ON kanban_boards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own boards
CREATE POLICY "Users can update their own kanban boards"
  ON kanban_boards FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own boards
CREATE POLICY "Users can delete their own kanban boards"
  ON kanban_boards FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_kanban_boards_user ON kanban_boards(user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_kanban_boards_updated_at ON kanban_boards;
CREATE TRIGGER update_kanban_boards_updated_at 
  BEFORE UPDATE ON kanban_boards
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- KANBAN COLUMNS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  wip_limit INTEGER,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Users can view their own kanban columns" ON kanban_columns;
DROP POLICY IF EXISTS "Users can insert their own kanban columns" ON kanban_columns;
DROP POLICY IF EXISTS "Users can update their own kanban columns" ON kanban_columns;
DROP POLICY IF EXISTS "Users can delete their own kanban columns" ON kanban_columns;

-- RLS Policy: Users can view columns of their own boards
CREATE POLICY "Users can view their own kanban columns"
  ON kanban_columns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kanban_boards 
      WHERE kanban_boards.id = kanban_columns.board_id 
      AND kanban_boards.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert columns to their own boards
CREATE POLICY "Users can insert their own kanban columns"
  ON kanban_columns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kanban_boards 
      WHERE kanban_boards.id = kanban_columns.board_id 
      AND kanban_boards.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update columns of their own boards
CREATE POLICY "Users can update their own kanban columns"
  ON kanban_columns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM kanban_boards 
      WHERE kanban_boards.id = kanban_columns.board_id 
      AND kanban_boards.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete columns of their own boards
CREATE POLICY "Users can delete their own kanban columns"
  ON kanban_columns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM kanban_boards 
      WHERE kanban_boards.id = kanban_columns.board_id 
      AND kanban_boards.user_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_kanban_columns_board ON kanban_columns(board_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_kanban_columns_updated_at ON kanban_columns;
CREATE TRIGGER update_kanban_columns_updated_at 
  BEFORE UPDATE ON kanban_columns
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- KANBAN CARDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS kanban_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE NOT NULL,
  column_id UUID REFERENCES kanban_columns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  due_date DATE,
  labels JSONB DEFAULT '[]',
  is_backlog BOOLEAN DEFAULT FALSE,
  linked_goal_id UUID REFERENCES annual_goals(id) ON DELETE SET NULL,
  pomodoro_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Users can view their own kanban cards" ON kanban_cards;
DROP POLICY IF EXISTS "Users can insert their own kanban cards" ON kanban_cards;
DROP POLICY IF EXISTS "Users can update their own kanban cards" ON kanban_cards;
DROP POLICY IF EXISTS "Users can delete their own kanban cards" ON kanban_cards;

-- RLS Policy: Users can view cards of their own boards
CREATE POLICY "Users can view their own kanban cards"
  ON kanban_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kanban_boards 
      WHERE kanban_boards.id = kanban_cards.board_id 
      AND kanban_boards.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert cards to their own boards
CREATE POLICY "Users can insert their own kanban cards"
  ON kanban_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kanban_boards 
      WHERE kanban_boards.id = kanban_cards.board_id 
      AND kanban_boards.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update cards of their own boards
CREATE POLICY "Users can update their own kanban cards"
  ON kanban_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM kanban_boards 
      WHERE kanban_boards.id = kanban_cards.board_id 
      AND kanban_boards.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete cards of their own boards
CREATE POLICY "Users can delete their own kanban cards"
  ON kanban_cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM kanban_boards 
      WHERE kanban_boards.id = kanban_cards.board_id 
      AND kanban_boards.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kanban_cards_board ON kanban_cards(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column ON kanban_cards(column_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_backlog ON kanban_cards(board_id, is_backlog) WHERE is_backlog = TRUE;
CREATE INDEX IF NOT EXISTS idx_kanban_cards_due_date ON kanban_cards(due_date) WHERE due_date IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_kanban_cards_updated_at ON kanban_cards;
CREATE TRIGGER update_kanban_cards_updated_at 
  BEFORE UPDATE ON kanban_cards
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- After running this script, verify the tables were created:
-- 1. Go to Table Editor in Supabase Dashboard
-- 2. Look for 'kanban_boards', 'kanban_columns', and 'kanban_cards' in the table list
-- 3. The tables should be empty initially
-- 
-- Tables created:
-- - kanban_boards: Stores board metadata (title, description, category)
-- - kanban_columns: Stores columns within boards (title, order, WIP limit)
-- - kanban_cards: Stores task cards (title, description, priority, due date, labels)
-- 
-- Features:
-- - Row Level Security ensures users can only access their own data
-- - Cascade delete removes columns and cards when a board is deleted
-- - Partial indexes optimize backlog and due date queries
-- - Triggers automatically update the updated_at timestamp
-- ============================================================================
