# Debug Guide - Finding the Real Issue

## Step 1: Open Browser Console

1. Open your app in browser: `http://localhost:8000/index.html`
2. Press F12 to open Developer Tools
3. Go to "Console" tab
4. Look for RED error messages

## Common Errors and Solutions

### Error: "Failed to load module"
**Cause:** Import path is wrong
**Solution:** Check the file paths in imports

### Error: "dataService is not defined"
**Cause:** Import failed
**Check:** Browser Network tab for 404 errors

### Error: "Cannot read property 'from' of undefined"
**Cause:** Supabase client not initialized
**Solution:** Check `js/config.js` credentials

### Error: "new row violates row-level security policy"
**Cause:** RLS policies not set up correctly in Supabase
**Solution:** Check database/schema.sql and apply RLS policies

## Step 2: Check Network Tab

1. Open Developer Tools (F12)
2. Go to "Network" tab
3. Reload page
4. Look for RED (failed) requests
5. Click on failed request to see details

## Step 3: Test Supabase Connection

Open Console and run:
```javascript
// Test if Supabase is connected
const { createClient } = supabase;
const client = createClient('YOUR_URL', 'YOUR_KEY');
console.log('Supabase client:', client);

// Test auth
client.auth.getSession().then(r => console.log('Session:', r));
```

## Step 4: Test Data Service

Open Console and run:
```javascript
// This should work if everything is set up correctly
import('./js/data-service.js').then(module => {
    console.log('Data service loaded:', module.default);
    module.default.getDailyHabits().then(habits => {
        console.log('Habits:', habits);
    }).catch(err => {
        console.error('Error loading habits:', err);
    });
});
```

## Step 5: Check What's Actually Failing

Please copy and paste the EXACT error messages from the console here:

```
[Paste errors here]
```

## Quick Fixes

### If you see "404 Not Found" for JS files:
- Check file paths are correct
- Make sure server is running in correct directory

### If you see "CORS error":
- Make sure you're using `http://localhost:8000` not `file://`

### If you see "RLS policy violation":
- Go to Supabase Dashboard
- SQL Editor
- Run the schema.sql file from database/ folder

### If you see "Invalid API key":
- Check js/config.js
- Make sure SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Get them from Supabase Dashboard > Settings > API

## Next Steps

1. Open browser console
2. Copy ALL error messages
3. Share them so I can help fix the exact issue

The error messages will tell us exactly what's wrong!
