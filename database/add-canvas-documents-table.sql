-- Canvas Documents Table Migration
-- For storing freehand drawing and handwriting canvas documents with stroke data
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- CANVAS DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS canvas_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Canvas',
  stroke_data JSONB NOT NULL DEFAULT '{"version": 1, "strokes": []}',
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for canvas_documents
ALTER TABLE canvas_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own canvas documents"
  ON canvas_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own canvas documents"
  ON canvas_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own canvas documents"
  ON canvas_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own canvas documents"
  ON canvas_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance (user_id with updated_at DESC for efficient document listing)
CREATE INDEX IF NOT EXISTS idx_canvas_documents_user 
  ON canvas_documents(user_id, updated_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_canvas_documents_updated_at BEFORE UPDATE ON canvas_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
