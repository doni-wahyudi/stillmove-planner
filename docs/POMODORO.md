# Pomodoro Timer - Feature Documentation

## Overview

The Pomodoro Timer helps you stay focused using the Pomodoro Technique - a time management method that uses focused work sessions followed by short breaks.

## Desktop Layout

On desktop screens, the Pomodoro view uses a two-column layout:

### Left Panel
- **Weekly Progress Chart** - Bar chart showing sessions completed each day of the week
- **Recent Sessions** - Summary of sessions from the last 7 days grouped by date
- **Goal Progress** - Shows goals you've linked sessions to and total time spent

### Right Panel
- Statistics dashboard
- Timer display and controls
- Task selection
- Settings
- Today's session history

On mobile, the layout stacks with the timer on top and the progress panels below.

## Features

### 1. Timer Modes

| Mode | Default Duration | Description |
|------|------------------|-------------|
| Focus | 25 min | Concentrated work session |
| Short Break | 5 min | Quick rest between sessions |
| Long Break | 15 min | Extended rest after 4 sessions |

### 2. Customizable Durations ⚙️

Click the settings button (⚙️) to customize:
- **Focus Duration** - 1 to 60 minutes
- **Short Break** - 1 to 30 minutes
- **Long Break** - 1 to 60 minutes
- **Sessions before long break** - 2 to 10 sessions

Settings are saved to localStorage and persist across sessions.

### 3. Statistics Dashboard

Track your productivity with real-time statistics:

- **Today** - Sessions completed today
- **This Week** - Total sessions this week
- **Focus Time** - Total hours of focused work
- **Day Streak** - Consecutive days with completed sessions

### 4. Task Linking

Link your Pomodoro sessions to specific tasks:

- **Custom Task** - Enter any task description
- **Link to Goal** - Connect to your annual goals
- **Link to Time Block** - Connect to today's scheduled activities

This helps you track which tasks received focused attention.

### 5. Break Suggestions 💡

During breaks, you'll see helpful suggestions:

**Short Break Ideas:**
- Look away from screen (20-20-20 rule)
- Deep breathing exercises
- Drink water
- Stretch your body

**Long Break Ideas:**
- Take a walk
- Have a healthy snack
- Meditate
- Get fresh air

### 6. Mini Timer in Navigation 🕐

When the timer is running, a mini timer appears in the navigation bar:
- Shows current mode and time remaining
- Click to pause/resume
- Click the timer to navigate to Pomodoro view
- Works while you're on other views

### 7. Session History

View all completed sessions for the current day, including:
- Session number
- Completion time
- Duration
- Linked task (if any)

### 8. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Start/Pause timer |
| R | Reset timer |
| S | Skip to next phase |

### 9. Notifications

- **Browser Notifications** - Desktop alerts when sessions complete
- **Toast Notifications** - In-app notifications
- **Audio Alert** - Sound notification (800Hz beep)

## Database Schema

Sessions are persisted to the `pomodoro_sessions` table:

```sql
CREATE TABLE pomodoro_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_minutes INTEGER DEFAULT 25,
  session_type TEXT CHECK (session_type IN ('focus', 'shortBreak', 'longBreak')),
  was_completed BOOLEAN DEFAULT FALSE,
  linked_goal_id UUID,           -- Optional link to annual_goals
  linked_time_block_id UUID,     -- Optional link to time_blocks
  task_description TEXT,
  notes TEXT
);
```

## Setup

### 1. Run Database Migration

Execute the SQL migration in Supabase:

```bash
# File: database/add-pomodoro-sessions-table.sql
```

### 2. Enable Browser Notifications (Optional)

When you first start a timer, the browser will ask for notification permission. Allow this for desktop alerts when sessions complete.

## Configuration

Timer durations are configured in `js/config.js`:

```javascript
pomodoro: {
    focusDuration: 25 * 60,        // 25 minutes in seconds
    shortBreakDuration: 5 * 60,    // 5 minutes
    longBreakDuration: 15 * 60,    // 15 minutes
    sessionsBeforeLongBreak: 4     // Long break after 4 focus sessions
}
```

## How It Works

### Session Flow

1. **Start Focus Session**
   - Timer begins counting down from 25:00
   - Session is created in database (not yet completed)
   - Progress circle fills as time passes

2. **Focus Session Completes**
   - Audio notification plays
   - Browser notification appears
   - Session marked as completed in database
   - Statistics update
   - Short break automatically starts

3. **After 4 Focus Sessions**
   - Long break (15 min) instead of short break
   - Session counter resets

### Data Persistence

- **Local Storage** - Timer state survives page refreshes
- **Database** - Completed sessions stored permanently
- **Daily Reset** - Session count resets at midnight

## API Reference

### DataService Methods

```javascript
// Get sessions for a date
await dataService.getPomodoroSessions('2024-01-15');

// Get sessions for date range
await dataService.getPomodoroSessionsRange('2024-01-01', '2024-01-31');

// Get statistics
await dataService.getPomodoroStats('2024-01-01', '2024-01-31');

// Create session
await dataService.createPomodoroSession({
    date: '2024-01-15',
    started_at: new Date().toISOString(),
    duration_minutes: 25,
    session_type: 'focus',
    task_description: 'Working on feature X'
});

// Update session (mark complete)
await dataService.updatePomodoroSession(sessionId, {
    completed_at: new Date().toISOString(),
    was_completed: true
});

// Delete session
await dataService.deletePomodoroSession(sessionId);
```

## Tips for Effective Use

1. **Set a clear task** before starting each session
2. **Minimize distractions** during focus time
3. **Actually take breaks** - they improve long-term focus
4. **Track your patterns** - use statistics to find your peak hours
5. **Link to goals** - see which goals get the most attention

## Troubleshooting

### Timer doesn't persist after refresh
- Check that localStorage is enabled
- Clear browser cache and try again

### Notifications not working
- Check browser notification permissions
- Ensure the site has notification access

### Sessions not saving to database
- Verify you're logged in
- Check Supabase connection
- Run the database migration if not done

### Statistics showing 0
- Run the database migration first
- Complete at least one full session
- Check browser console for errors
