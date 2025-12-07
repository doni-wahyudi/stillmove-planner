# Quick Start Guide

Get up and running with the Daily Planner Application in 10 minutes!

## What You'll Need

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- A free Supabase account
- 10 minutes of your time

## Step 1: Create Supabase Account (2 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Click **Start your project**
3. Sign up with GitHub, Google, or email
4. Verify your email if required

## Step 2: Create Supabase Project (3 minutes)

1. Click **New Project**
2. Choose your organization (or create one)
3. Fill in project details:
   - **Name**: Daily Planner (or any name you like)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free (sufficient for personal use)
4. Click **Create new project**
5. Wait 2-3 minutes for setup to complete

## Step 3: Get Your Credentials (1 minute)

1. In your Supabase project dashboard
2. Go to **Settings** (gear icon) > **API**
3. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
4. Keep these handy for the next step

## Step 4: Set Up Database (2 minutes)

1. In Supabase, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `database/schema.sql` from this project
4. Copy ALL the contents
5. Paste into the Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

## Step 5: Configure the App (1 minute)

1. Open the project folder in your code editor
2. Open the file `js/config.js`
3. Replace the placeholder values with your credentials:

```javascript
export const SUPABASE_URL = 'https://xxxxx.supabase.co'; // Your Project URL
export const SUPABASE_ANON_KEY = 'eyJ...'; // Your anon public key
```

4. Save the file

## Step 6: Run the App (1 minute)

### Option A: Simple (Double-click)
- Open `index.html` in your browser

### Option B: Local Server (Recommended)

**Using Python:**
```bash
python -m http.server 8000
```

**Using Node.js:**
```bash
npx http-server
```

**Using PHP:**
```bash
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser

## Step 7: Create Your Account

1. You'll see the sign-in page
2. Click **Sign Up**
3. Enter your email and password
4. Click **Sign Up**
5. Check your email for confirmation (if required)
6. Sign in with your credentials

## You're Done! 🎉

You should now see the Daily Planner dashboard. Let's explore!

## Quick Tour

### 1. Annual View (Where you start)
- Set your yearly goals
- Track reading list
- Create vision board
- Review last year

**Try it:** Click **Add Goal** and create your first annual goal!

### 2. Monthly View
- See calendar for the month
- Color-code activities
- Track monthly goals
- Add notes

**Try it:** Click on today's date and assign it a category color!

### 3. Weekly View
- Plan your week hour-by-hour
- Create time blocks
- Set weekly goals
- Journal daily

**Try it:** Click on a time slot and create your first time block!

### 4. Habits View
- Track up to 30 daily habits
- Monitor weekly habits
- Track mood, sleep, and water intake
- See progress percentages

**Try it:** Add a habit like "Exercise" and mark today as complete!

### 5. Action Plan View
- Create action plans
- Track progress
- Evaluate results
- Organize by month

**Try it:** Create an action plan for a goal you want to achieve!

### 6. Pomodoro Timer
- 25-minute focus sessions
- Automatic breaks
- Session tracking
- Productivity boost

**Try it:** Start a Pomodoro session and focus on a task!

## Tips for Success

### 1. Start Small
Don't try to fill everything at once. Start with:
- 2-3 annual goals
- 5 daily habits
- This week's schedule

### 2. Make It a Habit
- Check your planner every morning
- Update it every evening
- Review weekly progress
- Adjust as needed

### 3. Use Categories
Color-code your activities:
- 🟢 Personal (green)
- 🔵 Work (blue)
- 🟠 Business (orange)
- 🔴 Family (pink)
- 🟣 Education (purple)
- 🔵 Social (cyan)
- 🟤 Project (brown)

### 4. Track What Matters
Focus on habits that align with your goals:
- Want to be healthier? Track exercise, sleep, water
- Want to learn? Track reading, courses, practice
- Want to grow? Track meditation, journaling, reflection

### 5. Review Regularly
- **Daily**: Check your schedule and habits
- **Weekly**: Review progress and plan next week
- **Monthly**: Evaluate goals and adjust plans
- **Yearly**: Reflect and set new goals

## Common Questions

### Q: Can I use this on my phone?
**A:** Yes! The app is fully responsive and works great on mobile devices.

### Q: Is my data private?
**A:** Yes! Your data is stored in your personal Supabase database with Row Level Security. Only you can access it.

### Q: Can I access it from multiple devices?
**A:** Yes! Sign in from any device and your data syncs automatically.

### Q: What if I'm offline?
**A:** The app works offline! Changes are queued and sync when you're back online.

### Q: Can I export my data?
**A:** Yes! Go to Settings and click Export Data to download a JSON backup.

### Q: Is it free?
**A:** Yes! The app is free and open-source. Supabase free tier is sufficient for personal use.

## Troubleshooting

### Problem: Can't sign in
**Solution:**
- Check your email for confirmation link
- Verify credentials are correct
- Check browser console for errors
- Try resetting password

### Problem: Data not saving
**Solution:**
- Check internet connection
- Verify Supabase credentials in config.js
- Check browser console for errors
- Try refreshing the page

### Problem: Page looks broken
**Solution:**
- Clear browser cache
- Try a different browser
- Check if all files loaded (Network tab)
- Verify CSS file loaded correctly

## Next Steps

Now that you're set up:

1. **Explore Features**: Try each view and feature
2. **Customize**: Set up your goals, habits, and schedule
3. **Read Docs**: Check out `README.md` for detailed info
4. **Get Help**: Open an issue on GitHub if you need help
5. **Share**: Tell others about the app!

## Resources

- **Full Documentation**: `README.md`
- **Database Setup**: `database/README.md`
- **Deployment Guide**: `DEPLOYMENT.md`
- **Accessibility**: `ACCESSIBILITY.md`
- **Performance**: `PERFORMANCE_OPTIMIZATION.md`

## Need Help?

- **Documentation**: Check the docs folder
- **Issues**: Open a GitHub issue
- **Questions**: Start a GitHub discussion
- **Bugs**: Report on GitHub with details

## Welcome to Your Planning Journey! 🚀

You're all set to start planning and achieving your goals. Remember:
- Progress over perfection
- Consistency beats intensity
- Small steps lead to big changes

Happy planning! 📝✨
