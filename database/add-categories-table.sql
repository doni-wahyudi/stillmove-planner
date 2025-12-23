-- ============================================================================
-- CUSTOM CATEGORIES TABLE
-- Add custom categories feature to allow users to manage their own categories
-- 
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Create a new query
-- 3. Copy and paste this entire file
-- 4. Click Run (or press Ctrl+Enter / Cmd+Enter)
-- ============================================================================

-- Create the custom_categories table
CREATE TABLE IF NOT EXISTS custom_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color_start TEXT NOT NULL, -- Start color for gradient (hex format: #RRGGBB)
  color_end TEXT NOT NULL,   -- End color for gradient (hex format: #RRGGBB)
  order_index INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE, -- True for system default categories (cannot be deleted)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Enable Row Level Security
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Users can view their own categories" ON custom_categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON custom_categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON custom_categories;
DROP POLICY IF EXISTS "Users can delete their own non-default categories" ON custom_categories;

-- RLS Policy: Users can view their own categories
CREATE POLICY "Users can view their own categories"
  ON custom_categories FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own categories
CREATE POLICY "Users can insert their own categories"
  ON custom_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own categories
CREATE POLICY "Users can update their own categories"
  ON custom_categories FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own non-default categories
CREATE POLICY "Users can delete their own non-default categories"
  ON custom_categories FOR DELETE
  USING (auth.uid() = user_id AND is_default = FALSE);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_custom_categories_user ON custom_categories(user_id);

-- Create trigger to automatically update the updated_at timestamp
-- Drop first if exists to avoid errors
DROP TRIGGER IF EXISTS update_custom_categories_updated_at ON custom_categories;
CREATE TRIGGER update_custom_categories_updated_at 
  BEFORE UPDATE ON custom_categories
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- After running this script, verify the table was created:
-- 1. Go to Table Editor in Supabase Dashboard
-- 2. Look for 'custom_categories' in the table list
-- 3. The table should be empty initially
-- 
-- Default categories will be automatically created when a user first
-- opens the Weekly View in the application.
-- ============================================================================
