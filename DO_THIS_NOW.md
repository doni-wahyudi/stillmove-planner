# 🚨 DO THIS NOW - 3 Simple Steps

## Your Error
```
new row violates row-level security policy
```

This means your database is blocking requests for security reasons.

## The Fix (3 minutes)

### Step 1: Open Supabase
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)

### Step 2: Run the SQL
1. Click **New Query** button
2. Open the file: `COPY_PASTE_THIS_SQL.sql`
3. Select ALL the text (Ctrl+A)
4. Copy it (Ctrl+C)
5. Paste into Supabase SQL Editor (Ctrl+V)
6. Click **Run** button (or press Ctrl+Enter)
7. Wait for "Success. No rows returned" message

### Step 3: Test Your App
1. Go back to your app: `http://localhost:8000/index.html`
2. Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
3. Try to add a habit
4. Try to add an action plan
5. Try to add an annual goal

## ✅ Success!

If you can now add habits, action plans, and goals = **FIXED!**

## ❌ Still Not Working?

If you still see errors:

1. Check the SQL ran successfully (no red errors in Supabase)
2. Make sure you're signed in to the app
3. Try signing out and signing in again
4. Clear browser cache (Ctrl+Shift+Delete)

## What This Does

The SQL code:
- Enables Row Level Security (RLS) on all tables
- Creates policies that allow users to access their own data
- Blocks users from seeing other users' data

Without these policies, the database blocks ALL requests for security.

## Visual Guide

```
Before:
User → Try to add habit → Database → ❌ BLOCKED (no policy)

After:
User → Try to add habit → Database → ✅ ALLOWED (policy exists)
```

---

**TL;DR:** 
1. Open `COPY_PASTE_THIS_SQL.sql`
2. Copy all text
3. Paste in Supabase SQL Editor
4. Click Run
5. Refresh app
6. Done! 🎉
