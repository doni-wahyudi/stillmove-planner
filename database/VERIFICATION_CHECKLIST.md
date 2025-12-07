# Database Verification Checklist

Use this checklist to verify that your database setup is complete and correct.

## ✅ Pre-Setup Checklist

- [✅] Supabase account created
- [✅] Supabase project created and provisioned
- [✅] Project URL obtained from Settings → API
- [✅] Anon key obtained from Settings → API
- [✅] Config.js updated with credentials

## ✅ Schema Creation Checklist

### Tables Created
- [✅] profiles
- [✅] annual_goals
- [✅] reading_list
- [✅] monthly_data
- [✅] weekly_goals
- [✅] time_blocks
- [✅] daily_entries
- [✅] daily_habits
- [✅] daily_habit_completions
- [✅] weekly_habits
- [✅] weekly_habit_completions
- [✅] mood_tracker
- [✅] sleep_tracker
- [✅] water_tracker
- [✅] action_plans

**Total: 15 tables**

### Verification Steps
1. Go to Supabase Dashboard → Table Editor
2. Verify all 15 tables are listed
3. Click on each table to verify columns exist

## ✅ Row Level Security (RLS) Checklist

### RLS Enabled
- [✅] RLS enabled on all 15 tables

### Policies Created (4 per table)
For each table, verify these policies exist:
- [✅] SELECT policy (view own data)
- [✅] INSERT policy (create own data)
- [✅] UPDATE policy (modify own data)
- [✅] DELETE policy (delete own data)

**Total: 60 policies (4 × 15 tables)**

### Verification Steps
1. Go to Supabase Dashboard → Table Editor
2. Click on any table
3. Click "Policies" tab
4. Verify 4 policies exist
5. Repeat for all tables

### Quick Verification Query
Run this in SQL Editor:
```sql
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```
Expected: Each table should have 4 policies

## ✅ Constraints Checklist

### Foreign Keys
- [✅] All user_id columns reference auth.users(id)
- [✅] All foreign keys have ON DELETE CASCADE
- [✅] habit_id columns reference respective habit tables

### CHECK Constraints
- [✅] annual_goals.progress: 0-100
- [✅] reading_list.rating: 1-5
- [✅] monthly_data.month: 1-12
- [✅] weekly_goals.week_number: 1-53
- [✅] weekly_habits.target_days_per_week: 1-7
- [✅] water_tracker.glasses_consumed: >= 0
- [✅] water_tracker.goal_glasses: > 0
- [✅] action_plans.progress: 0-100
- [✅] action_plans.month: 1-12
- [✅] time_blocks.category: Valid enum values
- [✅] weekly_goals.priority: Valid enum values
- [✅] mood_tracker.mood_emoji: Valid emoji values

### UNIQUE Constraints
- [ ] monthly_data: (user_id, year, month)
- [ ] daily_entries: (user_id, date)
- [ ] daily_habit_completions: (habit_id, date)
- [ ] weekly_habit_completions: (habit_id, date)
- [ ] mood_tracker: (user_id, date)
- [ ] sleep_tracker: (user_id, date)
- [ ] water_tracker: (user_id, date)

### Verification Steps
Run `database/test-rls.sql` in SQL Editor to verify all constraints

## ✅ Indexes Checklist

### Performance Indexes Created
- [ ] idx_annual_goals_user_year
- [ ] idx_reading_list_user_year
- [ ] idx_monthly_data_user_year_month
- [ ] idx_weekly_goals_user_year_week
- [ ] idx_time_blocks_user_date
- [ ] idx_daily_entries_user_date
- [ ] idx_daily_habits_user
- [ ] idx_daily_habit_completions_habit_date
- [ ] idx_daily_habit_completions_user_date
- [ ] idx_weekly_habits_user
- [ ] idx_weekly_habit_completions_habit_date
- [ ] idx_weekly_habit_completions_user_date
- [ ] idx_mood_tracker_user_date
- [ ] idx_sleep_tracker_user_date
- [ ] idx_water_tracker_user_date
- [ ] idx_action_plans_user_year_month

**Total: 16 indexes**

### Verification Query
```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY indexname;
```

## ✅ Triggers Checklist

### Updated_at Triggers Created
- [ ] profiles
- [ ] annual_goals
- [ ] reading_list
- [ ] monthly_data
- [ ] weekly_goals
- [ ] time_blocks
- [ ] daily_entries
- [ ] daily_habits
- [ ] weekly_habits
- [ ] mood_tracker
- [ ] sleep_tracker
- [ ] water_tracker
- [ ] action_plans

**Total: 13 triggers**

### Verification Query
```sql
SELECT 
  event_object_table,
  trigger_name
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;
```

## ✅ Functional Testing Checklist

### Authentication Testing
- [ ] Create test user account
- [ ] Verify user appears in auth.users
- [ ] Sign in with test user
- [ ] Verify session is created

### Data Isolation Testing
- [ ] Create User A account
- [ ] Sign in as User A
- [ ] Create test data (goal, habit, etc.)
- [ ] Sign out
- [ ] Create User B account
- [ ] Sign in as User B
- [ ] Verify User B cannot see User A's data
- [ ] Create test data as User B
- [ ] Sign out and sign in as User A
- [ ] Verify User A cannot see User B's data
- [ ] Verify User A can still see their own data

### CRUD Operations Testing
For each major table, test:
- [ ] CREATE: Insert new record
- [ ] READ: Query records
- [ ] UPDATE: Modify existing record
- [ ] DELETE: Remove record

### Constraint Testing
- [ ] Try to insert invalid progress (e.g., 150) → Should fail
- [ ] Try to insert invalid month (e.g., 13) → Should fail
- [ ] Try to insert duplicate (user_id, date) → Should fail
- [ ] Try to insert without user_id → Should fail
- [ ] Try to insert with wrong user_id → Should fail (RLS)

### Cascade Delete Testing
- [ ] Create habit with completions
- [ ] Delete habit
- [ ] Verify completions are also deleted

## ✅ Performance Testing Checklist

### Query Performance
- [ ] Test query with user_id filter (should use index)
- [ ] Test query with date range (should use index)
- [ ] Test query with year/month filter (should use index)
- [ ] Verify queries complete in < 100ms

### Bulk Operations
- [ ] Insert 100 habit completions
- [ ] Query all completions for a month
- [ ] Verify performance is acceptable

## ✅ Documentation Checklist

- [ ] schema.sql file exists and is complete
- [ ] README.md exists with setup instructions
- [ ] test-rls.sql exists for verification
- [ ] QUICK_REFERENCE.md exists with examples
- [ ] SCHEMA_DIAGRAM.md exists with visual representation
- [ ] VERIFICATION_CHECKLIST.md exists (this file)

## ✅ Integration Checklist

### Application Integration
- [ ] Supabase client initialized in app
- [ ] Authentication flow works
- [ ] Can create data from application
- [ ] Can read data from application
- [ ] Can update data from application
- [ ] Can delete data from application
- [ ] Real-time subscriptions work
- [ ] Offline queue works

## 🎉 Final Verification

Run all tests in `database/test-rls.sql` and verify:
- [ ] All tables have RLS enabled
- [ ] All tables have 4 policies
- [ ] All indexes exist
- [ ] All triggers exist
- [ ] All constraints are enforced
- [ ] Data isolation works correctly

## Troubleshooting

If any checks fail, refer to:
- `database/README.md` for setup instructions
- `database/QUICK_REFERENCE.md` for query examples
- `database/test-rls.sql` for verification queries
- Supabase documentation for specific issues

## Sign-off

Once all checks pass:
- [ ] Database schema is complete
- [ ] RLS policies are working
- [ ] All constraints are enforced
- [ ] Performance is acceptable
- [ ] Documentation is complete
- [ ] Ready for application development

**Date Completed**: _______________

**Verified By**: _______________

**Notes**: _______________________________________________
