// Supabase Configuration
// Replace these values with your actual Supabase project credentials
// You can find these in your Supabase project settings under API

export const SUPABASE_URL = 'https://qoubdtqujluxqfkwleuh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvdWJkdHF1amx1eHFma3dsZXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTAwNDUsImV4cCI6MjA4MDMyNjA0NX0.i0zo6ipADvqmacBuCU72mpagy2kyn-YFU2bZMFdC4Ks';

// Application Configuration
export const APP_CONFIG = {
    appName: 'Daily Planner',
    version: '1.0.0',
    defaultView: 'weekly',
    
    // Invitation Code Settings
    // IMPORTANT: Change these codes regularly for security
    // You can add multiple valid codes separated by commas
    invitationCodes: [
        'PLANNER2025',
        'WELCOME2025',
        'DAILYPLAN'
    ],
    
    // Pomodoro Timer Settings
    pomodoro: {
        focusDuration: 25 * 60, // 25 minutes in seconds
        shortBreakDuration: 5 * 60, // 5 minutes in seconds
        longBreakDuration: 15 * 60, // 15 minutes in seconds
        sessionsBeforeLongBreak: 4
    },
    
    // Habit Tracking Settings
    habits: {
        maxDailyHabits: 30,
        maxWeeklyHabits: 10,
        defaultWaterGoal: 8 // glasses per day
    },
    
    // Reading List Settings
    reading: {
        maxBooks: 50
    }
};
