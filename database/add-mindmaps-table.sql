-- Mindmap Tables Migration
-- For storing mindmap boards and their nodes with tree structure
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- MINDMAPS TABLE (board metadata)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mindmaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Mindmap',
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for mindmaps
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mindmaps"
  ON mindmaps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mindmaps"
  ON mindmaps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mindmaps"
  ON mindmaps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mindmaps"
  ON mindmaps FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_mindmaps_user
  ON mindmaps(user_id, updated_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_mindmaps_updated_at BEFORE UPDATE ON mindmaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MINDMAP NODES TABLE (nodes with tree structure via parent_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mindmap_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mindmap_id UUID REFERENCES mindmaps(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES mindmap_nodes(id) ON DELETE SET NULL,
  label TEXT NOT NULL DEFAULT 'New Node',
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  shape TEXT DEFAULT 'rounded',
  collapsed BOOLEAN DEFAULT false,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for mindmap_nodes
ALTER TABLE mindmap_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mindmap nodes"
  ON mindmap_nodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mindmap nodes"
  ON mindmap_nodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mindmap nodes"
  ON mindmap_nodes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mindmap nodes"
  ON mindmap_nodes FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mindmap_nodes_mindmap
  ON mindmap_nodes(mindmap_id);

CREATE INDEX IF NOT EXISTS idx_mindmap_nodes_parent
  ON mindmap_nodes(parent_id);

CREATE INDEX IF NOT EXISTS idx_mindmap_nodes_user
  ON mindmap_nodes(user_id);
