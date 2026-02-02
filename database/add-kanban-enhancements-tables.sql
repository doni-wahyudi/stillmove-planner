-- ============================================================================
-- KANBAN CARD ENHANCEMENTS TABLES
-- Add checklist items, attachments, comments, and activity log for Kanban cards
-- 
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Create a new query
-- 3. Copy and paste this entire file
-- 4. Click Run (or press Ctrl+Enter / Cmd+Enter)
-- 
-- PREREQUISITES:
-- - The kanban_boards, kanban_columns, and kanban_cards tables must exist
-- - Run add-kanban-tables.sql first if not already done
-- ============================================================================

-- ============================================================================
-- KANBAN CHECKLIST ITEMS TABLE
-- Stores subtasks/checklist items within cards
-- Requirements: 1.4
-- ============================================================================
CREATE TABLE IF NOT EXISTS kanban_checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID REFERENCES kanban_cards(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE kanban_checklist_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Users can view their own checklist items" ON kanban_checklist_items;
DROP POLICY IF EXISTS "Users can insert their own checklist items" ON kanban_checklist_items;
DROP POLICY IF EXISTS "Users can update their own checklist items" ON kanban_checklist_items;
DROP POLICY IF EXISTS "Users can delete their own checklist items" ON kanban_checklist_items;

-- RLS Policy: Users can view checklist items of their own cards
CREATE POLICY "Users can view their own checklist items"
    ON kanban_checklist_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM kanban_cards c
            JOIN kanban_boards b ON c.board_id = b.id
            WHERE c.id = kanban_checklist_items.card_id
            AND b.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can insert checklist items to their own cards
CREATE POLICY "Users can insert their own checklist items"
    ON kanban_checklist_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM kanban_cards c
            JOIN kanban_boards b ON c.board_id = b.id
            WHERE c.id = kanban_checklist_items.card_id
            AND b.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can update checklist items of their own cards
CREATE POLICY "Users can update their own checklist items"
    ON kanban_checklist_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM kanban_cards c
            JOIN kanban_boards b ON c.board_id = b.id
            WHERE c.id = kanban_checklist_items.card_id
            AND b.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can delete checklist items of their own cards
CREATE POLICY "Users can delete their own checklist items"
    ON kanban_checklist_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM kanban_cards c
            JOIN kanban_boards b ON c.board_id = b.id
            WHERE c.id = kanban_checklist_items.card_id
            AND b.user_id = auth.uid()
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_checklist_items_card ON kanban_checklist_items(card_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_order ON kanban_checklist_items(card_id, order_index);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_kanban_checklist_items_updated_at ON kanban_checklist_items;
CREATE TRIGGER update_kanban_checklist_items_updated_at 
    BEFORE UPDATE ON kanban_checklist_items
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- KANBAN ATTACHMENTS TABLE
-- Stores file attachment metadata (files stored in Supabase Storage)
-- Requirements: 5.3
-- ============================================================================
CREATE TABLE IF NOT EXISTS kanban_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID REFERENCES kanban_cards(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE kanban_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Users can view their own attachments" ON kanban_attachments;
DROP POLICY IF EXISTS "Users can insert their own attachments" ON kanban_attachments;
DROP POLICY IF EXISTS "Users can update their own attachments" ON kanban_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON kanban_attachments;

-- RLS Policy: Users can view attachments of their own cards
CREATE POLICY "Users can view their own attachments"
    ON kanban_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM kanban_cards c
            JOIN kanban_boards b ON c.board_id = b.id
            WHERE c.id = kanban_attachments.card_id
            AND b.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can insert attachments to their own cards
CREATE POLICY "Users can insert their own attachments"
    ON kanban_attachments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM kanban_cards c
            JOIN kanban_boards b ON c.board_id = b.id
            WHERE c.id = kanban_attachments.card_id
            AND b.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can update attachments of their own cards
CREATE POLICY "Users can update their own attachments"
    ON kanban_attachments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM kanban_cards c
            JOIN kanban_boards b ON c.board_id = b.id
            WHERE c.id = kanban_attachments.card_id
            AND b.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can delete attachments of their own cards
CREATE POLICY "Users can delete their own attachments"
    ON kanban_attachments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM kanban_cards c
            JOIN kanban_boards b ON c.board_id = b.id
            WHERE c.id = kanban_attachments.card_id
            AND b.user_id = auth.uid()
        )
    );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_attachments_card ON kanban_attachments(card_id);

-- ============================================================================
-- KANBAN COMMENTS TABLE
-- Stores user comments on cards
-- Requirements: 8.2
-- ============================================================================
CREATE TABLE IF NOT EXISTS kanban_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID REFERENCES kanban_cards(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE kanban_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Users can view comments on their cards" ON kanban_comments;
DROP POLICY IF EXISTS "Users can insert comments on their cards" ON kanban_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON kanban_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON kanban_comments;

-- RLS Policy: Users can view comments on their own cards
CREATE POLICY "Users can view comments on their cards"
    ON kanban_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM kanban_cards c
            JOIN kanban_boards b ON c.board_id = b.id
            WHERE c.id = kanban_comments.card_id
            AND b.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can insert comments on their own cards
CREATE POLICY "Users can insert comments on their cards"
    ON kanban_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM kanban_cards c
            JOIN kanban_boards b ON c.board_id = b.id
            WHERE c.id = kanban_comments.card_id
            AND b.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can update their own comments only
CREATE POLICY "Users can update their own comments"
    ON kanban_comments FOR UPDATE
    USING (user_id = auth.uid());

-- RLS Policy: Users can delete their own comments only
CREATE POLICY "Users can delete their own comments"
    ON kanban_comments FOR DELETE
    USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_card ON kanban_comments(card_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON kanban_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON kanban_comments(card_id, created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_kanban_comments_updated_at ON kanban_comments;
CREATE TRIGGER update_kanban_comments_updated_at 
    BEFORE UPDATE ON kanban_comments
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- KANBAN ACTIVITY LOG TABLE
-- Stores chronological history of card events
-- Requirements: 11.1
-- ============================================================================
CREATE TABLE IF NOT EXISTS kanban_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID REFERENCES kanban_cards(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    action_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE kanban_activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Users can view activity log of their cards" ON kanban_activity_log;
DROP POLICY IF EXISTS "Users can insert activity log entries" ON kanban_activity_log;

-- RLS Policy: Users can view activity log of their own cards
CREATE POLICY "Users can view activity log of their cards"
    ON kanban_activity_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM kanban_cards c
            JOIN kanban_boards b ON c.board_id = b.id
            WHERE c.id = kanban_activity_log.card_id
            AND b.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can insert activity log entries for their own cards
CREATE POLICY "Users can insert activity log entries"
    ON kanban_activity_log FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM kanban_cards c
            JOIN kanban_boards b ON c.board_id = b.id
            WHERE c.id = kanban_activity_log.card_id
            AND b.user_id = auth.uid()
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_log_card ON kanban_activity_log(card_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON kanban_activity_log(card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON kanban_activity_log(action_type);

-- ============================================================================
-- VERIFICATION
-- After running this script, verify the tables were created:
-- 1. Go to Table Editor in Supabase Dashboard
-- 2. Look for the new tables in the table list:
--    - kanban_checklist_items
--    - kanban_attachments
--    - kanban_comments
--    - kanban_activity_log
-- 3. The tables should be empty initially
-- 
-- Tables created:
-- - kanban_checklist_items: Stores subtasks within cards (text, completion, order)
-- - kanban_attachments: Stores file attachment metadata (name, path, type, size)
-- - kanban_comments: Stores user comments on cards (text, user, timestamps)
-- - kanban_activity_log: Stores card event history (action type, data, timestamp)
-- 
-- Features:
-- - Row Level Security ensures users can only access their own data
-- - Cascade delete removes related data when a card is deleted
-- - Comments have separate update/delete policies for ownership enforcement
-- - Indexes optimize queries by card_id and chronological ordering
-- - Triggers automatically update the updated_at timestamp where applicable
-- ============================================================================
