-- RLS Policy Testing Script
-- This script helps verify that Row Level Security policies are working correctly
-- Run this in Supabase SQL Editor after creating test users

-- ============================================================================
-- SETUP: Create Test Users (Run this first in Authentication section)
-- ============================================================================
-- You need to create two test users through Supabase Auth UI or API:
-- User A: test-user-a@example.com
-- User B: test-user-b@example.com
-- 
-- Then get their UUIDs from auth.users table and replace below

-- ============================================================================
-- TEST 1: Verify RLS is enabled on all tables
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'annual_goals', 'reading_list', 'monthly_data',
    'weekly_goals', 'time_blocks', 'daily_entries', 'daily_habits',
    'daily_habit_completions', 'weekly_habits', 'weekly_habit_completions',
    'mood_tracker', 'sleep_tracker', 'water_tracker', 'action_plans'
  )
ORDER BY tablename;

-- Expected: All tables should have rowsecurity = true

-- ============================================================================
-- TEST 2: Verify all tables have 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'annual_goals', 'reading_list', 'monthly_data',
    'weekly_goals', 'time_blocks', 'daily_entries', 'daily_habits',
    'daily_habit_completions', 'weekly_habits', 'weekly_habit_completions',
    'mood_tracker', 'sleep_tracker', 'water_tracker', 'action_plans'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Expected: Each table should have 4 policies

-- ============================================================================
-- TEST 3: List all policies for verification
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'annual_goals', 'reading_list', 'monthly_data',
    'weekly_goals', 'time_blocks', 'daily_entries', 'daily_habits',
    'daily_habit_completions', 'weekly_habits', 'weekly_habit_completions',
    'mood_tracker', 'sleep_tracker', 'water_tracker', 'action_plans'
  )
ORDER BY tablename, cmd;

-- Expected: Each table should have policies for SELECT, INSERT, UPDATE, DELETE
-- All policies should use auth.uid() = user_id pattern

-- ============================================================================
-- TEST 4: Verify indexes exist for performance
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'annual_goals', 'reading_list', 'monthly_data',
    'weekly_goals', 'time_blocks', 'daily_entries', 'daily_habits',
    'daily_habit_completions', 'weekly_habits', 'weekly_habit_completions',
    'mood_tracker', 'sleep_tracker', 'water_tracker', 'action_plans'
  )
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Expected: Multiple indexes for common query patterns

-- ============================================================================
-- TEST 5: Verify triggers exist for updated_at columns
-- ============================================================================
SELECT 
  event_object_schema,
  event_object_table,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN (
    'profiles', 'annual_goals', 'reading_list', 'monthly_data',
    'weekly_goals', 'time_blocks', 'daily_entries', 'daily_habits',
    'weekly_habits', 'mood_tracker', 'sleep_tracker', 'water_tracker',
    'action_plans'
  )
  AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;

-- Expected: Triggers for all tables with updated_at column

-- ============================================================================
-- TEST 6: Verify foreign key constraints
-- ============================================================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'profiles', 'annual_goals', 'reading_list', 'monthly_data',
    'weekly_goals', 'time_blocks', 'daily_entries', 'daily_habits',
    'daily_habit_completions', 'weekly_habits', 'weekly_habit_completions',
    'mood_tracker', 'sleep_tracker', 'water_tracker', 'action_plans'
  )
ORDER BY tc.table_name, kcu.column_name;

-- Expected: All user_id columns should reference auth.users(id) with CASCADE delete

-- ============================================================================
-- TEST 7: Verify CHECK constraints
-- ============================================================================
SELECT
  tc.table_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
  AND tc.table_name IN (
    'profiles', 'annual_goals', 'reading_list', 'monthly_data',
    'weekly_goals', 'time_blocks', 'daily_entries', 'daily_habits',
    'daily_habit_completions', 'weekly_habits', 'weekly_habit_completions',
    'mood_tracker', 'sleep_tracker', 'water_tracker', 'action_plans'
  )
ORDER BY tc.table_name;

-- Expected: Constraints for progress (0-100), month (1-12), ratings (1-5), etc.

-- ============================================================================
-- TEST 8: Verify UNIQUE constraints
-- ============================================================================
SELECT
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'UNIQUE'
  AND tc.table_name IN (
    'profiles', 'annual_goals', 'reading_list', 'monthly_data',
    'weekly_goals', 'time_blocks', 'daily_entries', 'daily_habits',
    'daily_habit_completions', 'weekly_habits', 'weekly_habit_completions',
    'mood_tracker', 'sleep_tracker', 'water_tracker', 'action_plans'
  )
ORDER BY tc.table_name, kcu.column_name;

-- Expected: UNIQUE constraints on (user_id, date) and (habit_id, date) combinations

-- ============================================================================
-- MANUAL TESTING INSTRUCTIONS
-- ============================================================================
-- To manually test RLS policies:
--
-- 1. Create two test users through Supabase Auth:
--    - User A: test-user-a@example.com
--    - User B: test-user-b@example.com
--
-- 2. Sign in as User A in your application
--
-- 3. Create some test data:
--    - Add an annual goal
--    - Add a daily habit
--    - Add a mood entry
--
-- 4. Sign out and sign in as User B
--
-- 5. Verify that User B CANNOT see User A's data
--
-- 6. Create some test data as User B
--
-- 7. Sign out and sign in as User A
--
-- 8. Verify that User A CANNOT see User B's data
--
-- 9. Verify that User A can still see their own data
--
-- If all these tests pass, RLS is working correctly!

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script verifies:
-- ✓ RLS is enabled on all tables
-- ✓ All tables have 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- ✓ Policies use auth.uid() = user_id pattern
-- ✓ Indexes exist for performance
-- ✓ Triggers exist for updated_at columns
-- ✓ Foreign keys reference auth.users with CASCADE delete
-- ✓ CHECK constraints validate data ranges
-- ✓ UNIQUE constraints prevent duplicate entries
