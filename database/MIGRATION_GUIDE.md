# Database Migration Guide

This guide explains how to make changes to the database schema after initial deployment.

## Important Principles

1. **Never break existing data**: Always use additive changes when possible
2. **Test migrations**: Test on a development project before production
3. **Backup first**: Always backup data before running migrations
4. **Version control**: Keep all migration scripts in version control
5. **Document changes**: Document what changed and why

## Making Schema Changes

### Adding a New Column

```sql
-- Add a new column with a default value
ALTER TABLE annual_goals
ADD COLUMN color TEXT DEFAULT '#000000';

-- Add a new optional column
ALTER TABLE profiles
ADD COLUMN avatar_url TEXT;

-- Update RLS policies if needed (usually not required for new columns)
```

### Adding a New Table

```sql
-- Create the new table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#000000',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_tags_user ON tags(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Modifying an Existing Column

```sql
-- Change column type (be careful with data conversion)
ALTER TABLE reading_list
ALTER COLUMN rating TYPE INTEGER USING rating::INTEGER;

-- Add a constraint
ALTER TABLE annual_goals
ADD CONSTRAINT check_year_range CHECK (year >= 2020 AND year <= 2100);

-- Remove a constraint
ALTER TABLE annual_goals
DROP CONSTRAINT IF EXISTS check_year_range;

-- Rename a column
ALTER TABLE profiles
RENAME COLUMN display_name TO full_name;
```

### Adding a Relationship

```sql
-- Add a foreign key column
ALTER TABLE annual_goals
ADD COLUMN tag_id UUID REFERENCES tags(id) ON DELETE SET NULL;

-- Add an index for the foreign key
CREATE INDEX idx_annual_goals_tag ON annual_goals(tag_id);
```

### Removing a Column

```sql
-- Remove a column (be very careful - this deletes data!)
ALTER TABLE profiles
DROP COLUMN IF EXISTS old_field;
```

### Removing a Table

```sql
-- Remove a table (be very careful - this deletes all data!)
DROP TABLE IF EXISTS old_table CASCADE;
```

## Migration Workflow

### 1. Development Phase

1. Create a new Supabase project for testing
2. Apply the base schema (`schema.sql`)
3. Create test data
4. Write your migration script
5. Test the migration on the development project
6. Verify data integrity after migration
7. Test application functionality

### 2. Staging Phase (Optional)

1. Create a staging Supabase project
2. Copy production data to staging (if possible)
3. Run migration on staging
4. Test thoroughly
5. Document any issues

### 3. Production Phase

1. **Backup**: Export all data from production
2. **Announce**: Notify users of maintenance window (if needed)
3. **Execute**: Run migration script
4. **Verify**: Check that migration completed successfully
5. **Test**: Test critical application functionality
6. **Monitor**: Watch for errors in the first few hours
7. **Rollback**: If issues occur, restore from backup

## Migration Script Template

```sql
-- Migration: [Description]
-- Date: [YYYY-MM-DD]
-- Author: [Name]
-- Ticket: [Issue/Ticket Number]

-- ============================================================================
-- MIGRATION START
-- ============================================================================

-- Step 1: [Description]
-- Rationale: [Why this change is needed]

[SQL statements]

-- Step 2: [Description]
-- Rationale: [Why this change is needed]

[SQL statements]

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the changes
SELECT COUNT(*) FROM [table];
SELECT * FROM [table] LIMIT 5;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration, run:
-- [Rollback SQL statements]

-- ============================================================================
-- MIGRATION END
-- ============================================================================
```

## Common Migration Scenarios

### Scenario 1: Adding a Feature Flag

```sql
-- Add feature flag to profiles
ALTER TABLE profiles
ADD COLUMN feature_pomodoro_enabled BOOLEAN DEFAULT true;

-- No RLS changes needed (inherits from table policies)
```

### Scenario 2: Adding Tags to Goals

```sql
-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and create policies
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tags"
  ON tags FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags"
  ON tags FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON tags FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON tags FOR DELETE USING (auth.uid() = user_id);

-- Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS goal_tags (
  goal_id UUID REFERENCES annual_goals(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (goal_id, tag_id)
);

-- Enable RLS on junction table
ALTER TABLE goal_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goal tags"
  ON goal_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM annual_goals
      WHERE id = goal_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own goal tags"
  ON goal_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM annual_goals
      WHERE id = goal_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own goal tags"
  ON goal_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM annual_goals
      WHERE id = goal_id AND user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX idx_tags_user ON tags(user_id);
CREATE INDEX idx_goal_tags_goal ON goal_tags(goal_id);
CREATE INDEX idx_goal_tags_tag ON goal_tags(tag_id);

-- Add trigger
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Scenario 3: Migrating Data Format

```sql
-- Example: Converting sub_goals from JSONB array to separate table

-- Step 1: Create new table
CREATE TABLE IF NOT EXISTS sub_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID REFERENCES annual_goals(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Migrate data
INSERT INTO sub_goals (goal_id, text, completed, order_index)
SELECT 
  ag.id,
  sg->>'text',
  (sg->>'completed')::boolean,
  row_number() OVER (PARTITION BY ag.id ORDER BY ordinality) - 1
FROM annual_goals ag,
     jsonb_array_elements(ag.sub_goals) WITH ORDINALITY sg;

-- Step 3: Enable RLS
ALTER TABLE sub_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sub goals"
  ON sub_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM annual_goals
      WHERE id = goal_id AND user_id = auth.uid()
    )
  );

-- (Add other policies...)

-- Step 4: Add indexes
CREATE INDEX idx_sub_goals_goal ON sub_goals(goal_id);

-- Step 5: Add trigger
CREATE TRIGGER update_sub_goals_updated_at BEFORE UPDATE ON sub_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 6: (Optional) Remove old column after verifying
-- ALTER TABLE annual_goals DROP COLUMN sub_goals;
```

## Data Backup and Restore

### Backup Data

```sql
-- Export specific table
COPY annual_goals TO '/path/to/backup/annual_goals.csv' CSV HEADER;

-- Or use Supabase Dashboard:
-- Table Editor → Select table → Export as CSV
```

### Restore Data

```sql
-- Import from CSV
COPY annual_goals FROM '/path/to/backup/annual_goals.csv' CSV HEADER;

-- Or use Supabase Dashboard:
-- Table Editor → Select table → Import from CSV
```

### Full Database Backup

Use Supabase CLI or Dashboard:
1. Go to Database → Backups
2. Create manual backup
3. Download backup file

## Rollback Strategies

### Strategy 1: Keep Old Column

```sql
-- Instead of dropping, rename
ALTER TABLE profiles
RENAME COLUMN old_name TO old_name_deprecated;

-- Add new column
ALTER TABLE profiles
ADD COLUMN new_name TEXT;

-- Migrate data
UPDATE profiles SET new_name = old_name_deprecated;

-- Later, after verifying, drop old column
-- ALTER TABLE profiles DROP COLUMN old_name_deprecated;
```

### Strategy 2: Use Transactions

```sql
BEGIN;

-- Your migration statements here
ALTER TABLE ...;
UPDATE ...;

-- Verify changes
SELECT COUNT(*) FROM ...;

-- If everything looks good:
COMMIT;

-- If something is wrong:
-- ROLLBACK;
```

### Strategy 3: Feature Flags

```sql
-- Add feature flag
ALTER TABLE profiles
ADD COLUMN use_new_feature BOOLEAN DEFAULT false;

-- Enable for specific users first
UPDATE profiles SET use_new_feature = true WHERE email = 'test@example.com';

-- Application code checks flag before using new feature
-- If issues occur, disable flag without rolling back schema
```

## Best Practices

1. **Test First**: Always test migrations on a copy of production data
2. **Small Changes**: Make small, incremental changes rather than large migrations
3. **Backwards Compatible**: Keep changes backwards compatible when possible
4. **Document**: Document every migration with rationale
5. **Version**: Use version numbers or dates in migration file names
6. **Automate**: Use migration tools when available
7. **Monitor**: Monitor application after migration for errors
8. **Communicate**: Inform team members about schema changes

## Migration Checklist

- [ ] Migration script written and tested
- [ ] Rollback script prepared
- [ ] Backup created
- [ ] Team notified
- [ ] Maintenance window scheduled (if needed)
- [ ] Migration executed
- [ ] Verification queries run
- [ ] Application tested
- [ ] Monitoring in place
- [ ] Documentation updated

## Troubleshooting

### Issue: Migration fails midway
**Solution**: Use transactions (BEGIN/COMMIT/ROLLBACK) to ensure atomicity

### Issue: RLS policies block migration
**Solution**: Temporarily disable RLS, run migration, re-enable RLS
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
-- Run migration
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Issue: Data type conversion fails
**Solution**: Use USING clause to specify conversion
```sql
ALTER TABLE table_name
ALTER COLUMN column_name TYPE new_type USING column_name::new_type;
```

### Issue: Foreign key constraint violation
**Solution**: Temporarily drop constraint, fix data, recreate constraint
```sql
ALTER TABLE table_name DROP CONSTRAINT constraint_name;
-- Fix data
ALTER TABLE table_name ADD CONSTRAINT constraint_name ...;
```

## Resources

- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
