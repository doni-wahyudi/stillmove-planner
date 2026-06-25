-- Flowchart Tables Migration
-- For storing flowchart boards, their shape nodes, and connecting edges
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- FLOWCHARTS TABLE (board metadata)
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowcharts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Flowchart',
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
  thumbnail_url TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for flowcharts
ALTER TABLE flowcharts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flowcharts"
  ON flowcharts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flowcharts"
  ON flowcharts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flowcharts"
  ON flowcharts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flowcharts"
  ON flowcharts FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_flowcharts_user
  ON flowcharts(user_id, updated_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_flowcharts_updated_at BEFORE UPDATE ON flowcharts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FLOWCHART NODES TABLE (shapes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowchart_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flowchart_id UUID REFERENCES flowcharts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'rectangle', -- rectangle, diamond, capsule, parallelogram, cylinder
  label TEXT DEFAULT '',
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  width FLOAT NOT NULL DEFAULT 120,
  height FLOAT NOT NULL DEFAULT 60,
  color TEXT DEFAULT '#475569', -- stroke color
  bg_color TEXT DEFAULT '#f8fafc', -- fill color
  text_color TEXT DEFAULT '#0f172a',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for flowchart_nodes
ALTER TABLE flowchart_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flowchart nodes"
  ON flowchart_nodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flowchart nodes"
  ON flowchart_nodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flowchart nodes"
  ON flowchart_nodes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flowchart nodes"
  ON flowchart_nodes FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flowchart_nodes_flowchart
  ON flowchart_nodes(flowchart_id);

CREATE INDEX IF NOT EXISTS idx_flowchart_nodes_user
  ON flowchart_nodes(user_id);


-- ============================================================================
-- FLOWCHART EDGES TABLE (connecting lines)
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowchart_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flowchart_id UUID REFERENCES flowcharts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_node_id UUID REFERENCES flowchart_nodes(id) ON DELETE CASCADE NOT NULL,
  target_node_id UUID REFERENCES flowchart_nodes(id) ON DELETE CASCADE NOT NULL,
  source_handle TEXT DEFAULT 'right', -- top, right, bottom, left
  target_handle TEXT DEFAULT 'left',
  label TEXT DEFAULT '', -- Text on the line (e.g., 'Yes', 'No')
  color TEXT DEFAULT '#94a3b8',
  style TEXT DEFAULT 'orthogonal', -- straight, orthogonal, curved
  dashed BOOLEAN DEFAULT false,
  animated BOOLEAN DEFAULT false, -- For showing flow direction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for flowchart_edges
ALTER TABLE flowchart_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flowchart edges"
  ON flowchart_edges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flowchart edges"
  ON flowchart_edges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flowchart edges"
  ON flowchart_edges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flowchart edges"
  ON flowchart_edges FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flowchart_edges_flowchart
  ON flowchart_edges(flowchart_id);

CREATE INDEX IF NOT EXISTS idx_flowchart_edges_source
  ON flowchart_edges(source_node_id);

CREATE INDEX IF NOT EXISTS idx_flowchart_edges_target
  ON flowchart_edges(target_node_id);

CREATE INDEX IF NOT EXISTS idx_flowchart_edges_user
  ON flowchart_edges(user_id);

-- V2 Migrations (safe to run on existing tables)
ALTER TABLE flowchart_edges 
  ADD COLUMN IF NOT EXISTS source_handle TEXT DEFAULT 'right',
  ADD COLUMN IF NOT EXISTS target_handle TEXT DEFAULT 'left',
  ADD COLUMN IF NOT EXISTS arrow_type TEXT DEFAULT 'forward';
