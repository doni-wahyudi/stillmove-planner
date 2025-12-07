# How to Run Daily Planner Application

## Important: This app MUST be run with a local server

Due to browser security restrictions (CORS), you cannot open `index.html` directly by double-clicking it. You must use a local web server.

## Quick Start Options

### Option 1: Python HTTP Server (Recommended)
```bash
# If you have Python 3:
python -m http.server 8000

# If you have Python 2:
python -m SimpleHTTPServer 8000
```
Then open: http://localhost:8000

### Option 2: Node.js HTTP Server
```bash
# Install http-server globally (one time only)
npm install -g http-server

# Run the server
http-server -p 8000
```
Then open: http://localhost:8000

### Option 3: PHP Built-in Server
```bash
php -S localhost:8000
```
Then open: http://localhost:8000

### Option 4: VS Code Live Server Extension
1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## First Time Setup

1. Make sure your Supabase credentials are configured in `js/config.js`
2. Start your local server using one of the options above
3. Navigate to `http://localhost:8000/auth.html`
4. Sign up for a new account
5. After signing in, you'll be redirected to the main app

## Troubleshooting

### "Nothing shows up when I open the file"
- You're opening the file directly. Use a local server instead.

### "Can't add habits or action plans"
- Check browser console (F12) for errors
- Verify Supabase credentials in `js/config.js`
- Make sure you're signed in

### "Authentication not working"
- Clear browser cache and localStorage
- Check Supabase project is active
- Verify RLS policies are set up correctly

## Features Available

- ✅ Annual Goals with sub-goals
- ✅ Monthly Planning
- ✅ Weekly Goals
- ✅ Daily & Weekly Habits Tracking
- ✅ Action Plans
- ✅ Mood, Sleep & Water Tracking
- ✅ Pomodoro Timer
- ✅ Reading List

Enjoy planning your life! 🎯
