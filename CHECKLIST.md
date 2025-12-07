# ✅ Fix Checklist - Get Everything Working

## Pre-Flight Check

- [ ] Python server is running: `python -m http.server 8000`
- [ ] App opens in browser: `http://localhost:8000/index.html`
- [ ] You can sign in successfully
- [ ] Pomodoro timer works (confirms app is loading)

## The Fix

### Step 1: Diagnose (2 min)
- [ ] Open: `http://localhost:8000/test-modules.html`
- [ ] Check which tests are RED (failed)
- [ ] Open browser console (F12)
- [ ] Look for error messages

### Step 2: Apply Fix (5 min)
- [ ] Go to Supabase Dashboard (https://supabase.com/dashboard)
- [ ] Click **SQL Editor** in left sidebar
- [ ] Click **New Query**
- [ ] Open `FIX_NOW.md` file
- [ ] Copy the SQL code
- [ ] Paste into Supabase SQL Editor
- [ ] Click **Run** (or press Ctrl+Enter)
- [ ] Wait for "Success" message

### Step 3: Verify (2 min)
- [ ] Go back to your app
- [ ] Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- [ ] Try to add a habit
- [ ] Try to add an action plan
- [ ] Try to add an annual goal

## Success Criteria

✅ **All Working** if you can:
- Add daily habits
- Add weekly habits
- Add action plans
- Add annual goals
- Track mood/sleep/water
- Add books to reading list
- Create monthly plans
- Set weekly goals

## If Still Not Working

### Check 1: Supabase Credentials
- [ ] Open `js/config.js`
- [ ] Check SUPABASE_URL is correct
- [ ] Check SUPABASE_ANON_KEY is correct
- [ ] Get correct values from: Supabase Dashboard > Settings > API

### Check 2: Authentication
- [ ] Sign out of app
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Sign in again
- [ ] Try adding data

### Check 3: RLS Policies
- [ ] Go to Supabase Dashboard
- [ ] Click **Database** > **Tables**
- [ ] Click on `daily_habits` table
- [ ] Check **RLS enabled** is ON
- [ ] Click **Policies** tab
- [ ] Should see at least 1 policy

### Check 4: Tables Exist
- [ ] Go to Supabase Dashboard
- [ ] Click **Table Editor**
- [ ] Should see these tables:
  - [ ] profiles
  - [ ] daily_habits
  - [ ] daily_habit_completions
  - [ ] weekly_habits
  - [ ] weekly_habit_completions
  - [ ] action_plans
  - [ ] annual_goals
  - [ ] reading_list
  - [ ] monthly_data
  - [ ] weekly_goals
  - [ ] mood_tracker
  - [ ] sleep_tracker
  - [ ] water_tracker

If tables are missing:
- [ ] Open `database/schema.sql`
- [ ] Copy entire file
- [ ] Paste in Supabase SQL Editor
- [ ] Run it

## Common Error Messages

### "new row violates row-level security policy"
**Fix:** Run SQL from `FIX_NOW.md`

### "relation does not exist"
**Fix:** Run `database/schema.sql` to create tables

### "Invalid API key"
**Fix:** Update `js/config.js` with correct credentials

### "Failed to load module"
**Fix:** Make sure using `http://localhost:8000` not `file://`

### "Cannot read property 'from' of undefined"
**Fix:** Check Supabase credentials in `js/config.js`

## Final Test

Run this in browser console (F12):
```javascript
// Test 1: Load data service
import('./js/data-service.js').then(async (m) => {
    console.log('✓ Data service loaded');
    
    // Test 2: Get habits
    try {
        const habits = await m.default.getDailyHabits();
        console.log('✓ Database works! Habits:', habits.length);
    } catch (e) {
        console.error('✗ Database error:', e.message);
    }
    
    // Test 3: Create habit
    try {
        const newHabit = await m.default.createDailyHabit({
            habit_name: 'Test Habit',
            order_index: 0
        });
        console.log('✓ Can create data! ID:', newHabit.id);
        
        // Clean up
        await m.default.deleteDailyHabit(newHabit.id);
        console.log('✓ Can delete data!');
        
        console.log('🎉 EVERYTHING WORKS!');
    } catch (e) {
        console.error('✗ Cannot create data:', e.message);
    }
});
```

If you see "🎉 EVERYTHING WORKS!" = **SUCCESS!** ✅

## Get Help

If still stuck after following this checklist:

1. Run `test-modules.html`
2. Take screenshot
3. Open console (F12)
4. Copy all errors
5. Share both

This will show exactly what's wrong!

---

**Start here:** Check the boxes as you go! ✅
