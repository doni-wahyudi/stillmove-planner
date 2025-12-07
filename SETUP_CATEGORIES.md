# Setup Custom Categories - Quick Guide

## Step 1: Create the Database Table

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the SQL below:

```sql
-- Create custom categories table
CREATE TABLE IF NOT EXISTS custom_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color_start TEXT NOT NULL,
  color_end TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Enable Row Level Security
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own categories"
  ON custom_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON custom_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON custom_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own non-default categories"
  ON custom_categories FOR DELETE
  USING (auth.uid() = user_id AND is_default = FALSE);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_custom_categories_user ON custom_categories(user_id);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_custom_categories_updated_at 
  BEFORE UPDATE ON custom_categories
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

6. Click **Run** button (or press Ctrl+Enter / Cmd+Enter)
7. You should see "Success. No rows returned"

## Step 2: Verify the Table

1. In Supabase Dashboard, click **Table Editor** in the left sidebar
2. You should see `custom_categories` in the list of tables
3. The table should be empty (no rows yet)

## Step 3: Test the App

1. Refresh your Daily Planner app
2. Go to Weekly View
3. The default categories should load automatically
4. Click the ⚙️ icon to manage categories

## Troubleshooting

### Error: "Could not find the table 'public.custom_categories'"
- The table hasn't been created yet
- Go back to Step 1 and run the SQL

### Error: "function update_updated_at_column() does not exist"
- This function should already exist from your main schema.sql
- If not, run this first:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Categories not loading
- Check browser console for errors
- Make sure you're logged in
- Try logging out and back in

### Can't add categories
- Check that RLS policies are enabled
- Verify you're authenticated
- Check browser console for specific error messages

## What Happens on First Load

When you first open the Weekly View after creating the table:
1. The app checks for existing categories
2. If none exist, it automatically creates 7 default categories:
   - Personal (Pink to Red)
   - Work (Blue to Cyan)
   - Business (Pink to Yellow)
   - Family (Yellow to Pink)
   - Education (Purple to Pink)
   - Social (Cyan to Blue)
   - Project (Red to Orange)
3. These default categories cannot be deleted (but colors can be changed)

## Next Steps

Once the table is created and working:
- Add your own custom categories
- Change colors to match your preferences
- Categories will be used in Weekly View time blocks
- Future updates will add category support to other views
