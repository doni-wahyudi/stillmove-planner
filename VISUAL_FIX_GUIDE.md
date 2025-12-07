# 📸 Visual Fix Guide - With Screenshots

## What You're Seeing

Your browser console shows:
```
❌ new row violates row-level security policy for table "annual_goals"
❌ new row violates row-level security policy for table "daily_habits"
❌ new row violates row-level security policy for table "action_plans"
```

## What This Means

Your Supabase database is **blocking all write operations** because security policies (RLS) are not set up.

## The Fix - Step by Step

### 1️⃣ Open Supabase Dashboard

```
🌐 Go to: https://supabase.com/dashboard
```

You should see:
```
┌─────────────────────────────────────┐
│  Supabase Dashboard                 │
├─────────────────────────────────────┤
│  📁 Your Projects                   │
│  └─ Daily Planner (or your name)   │
└─────────────────────────────────────┘
```

Click on your project.

### 2️⃣ Open SQL Editor

On the left sidebar, click:
```
┌─────────────────┐
│ 🏠 Home         │
│ 📊 Table Editor │
│ 🔍 SQL Editor   │ ← Click this
│ 🔐 Auth         │
│ ⚙️  Settings    │
└─────────────────┘
```

### 3️⃣ Create New Query

Click the **+ New Query** button at the top.

You'll see an empty editor:
```
┌─────────────────────────────────────┐
│  Untitled Query                     │
├─────────────────────────────────────┤
│                                     │
│  [Empty editor - paste SQL here]   │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

### 4️⃣ Copy the SQL

1. Open the file: **`COPY_PASTE_THIS_SQL.sql`**
2. Select ALL text: **Ctrl+A** (Windows) or **Cmd+A** (Mac)
3. Copy: **Ctrl+C** or **Cmd+C**

### 5️⃣ Paste and Run

1. Click in the Supabase SQL Editor
2. Paste: **Ctrl+V** or **Cmd+V**
3. Click the **Run** button (or press **Ctrl+Enter**)

You should see:
```
┌─────────────────────────────────────┐
│  ✅ Success                         │
│  No rows returned                   │
│  Completed in 234ms                 │
└─────────────────────────────────────┘
```

### 6️⃣ Verify Policies Created

1. Click **Database** in left sidebar
2. Click **Tables**
3. Click on **daily_habits** table
4. Click **Policies** tab

You should see:
```
┌─────────────────────────────────────┐
│  RLS Enabled: ✅ ON                 │
├─────────────────────────────────────┤
│  Policies:                          │
│  ✓ Users can manage their own...   │
└─────────────────────────────────────┘
```

### 7️⃣ Test Your App

1. Go to: `http://localhost:8000/index.html`
2. Hard refresh: **Ctrl+Shift+R** or **Cmd+Shift+R**
3. Try to add a habit
4. Try to add an action plan

## ✅ Success Indicators

You'll know it worked when:

1. **No more red errors** in browser console
2. **Can add habits** - they appear in the list
3. **Can add action plans** - they appear in the table
4. **Can add annual goals** - they appear in the cards
5. **Data persists** - refresh page and data is still there

## ❌ Troubleshooting

### If SQL fails with error:

**"relation does not exist"**
→ Tables not created yet
→ Run `database/schema.sql` first

**"syntax error"**
→ Didn't copy all the SQL
→ Make sure you copied from `--` at top to `--` at bottom

**"permission denied"**
→ Not project owner
→ Ask project owner to run the SQL

### If app still doesn't work:

1. **Clear browser cache:**
   - Press **F12**
   - Right-click refresh button
   - Click "Empty Cache and Hard Reload"

2. **Sign out and in:**
   - Click user menu
   - Sign out
   - Sign in again

3. **Check you're signed in:**
   - Look for your email in top right
   - If not there, sign in first

## What the SQL Does

```
Before:
┌──────────┐     ┌──────────┐
│   User   │────▶│ Database │
└──────────┘     └──────────┘
                      ❌ BLOCKED
                 (no policy)

After:
┌──────────┐     ┌──────────┐     ┌──────────┐
│   User   │────▶│ Policy   │────▶│ Database │
└──────────┘     └──────────┘     └──────────┘
                      ✅ ALLOWED
                 (policy checks user_id)
```

The SQL creates policies that:
- ✅ Allow users to see their own data
- ✅ Allow users to add their own data
- ✅ Allow users to edit their own data
- ✅ Allow users to delete their own data
- ❌ Block users from seeing others' data

## Quick Test

After running the SQL, open browser console (F12) and run:

```javascript
import('./js/data-service.js').then(async (m) => {
    const habit = await m.default.createDailyHabit({
        habit_name: 'Test',
        order_index: 0
    });
    console.log('✅ SUCCESS! Created habit:', habit.id);
    await m.default.deleteDailyHabit(habit.id);
    console.log('✅ Cleaned up test habit');
});
```

If you see "✅ SUCCESS!" = **Everything works!** 🎉

---

## Summary

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy `COPY_PASTE_THIS_SQL.sql`
4. Paste and Run
5. Refresh app
6. Everything works! ✅

**Time needed:** 3 minutes
**Difficulty:** Copy & Paste
**Result:** All features working! 🎉
