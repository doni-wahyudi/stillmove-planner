# StillMove Planner - API Documentation

## Overview

This document describes the JavaScript API for the StillMove Planner application. The app uses a modular architecture with services for data management, caching, and UI components.

---

## Core Services

### DataService (`js/data-service.js`)

The main service for all database operations. Uses Supabase as the backend with IndexedDB caching for offline support.

#### Annual Goals

```javascript
// Get all goals for a year
const goals = await dataService.getAnnualGoals(2024);

// Create a new goal
const goal = await dataService.createAnnualGoal({
    title: 'Learn Spanish',
    year: 2024,
    category: 'personal',
    sub_goals: ['Complete Duolingo', 'Watch Spanish movies']
});

// Update a goal
await dataService.updateAnnualGoal(goalId, {
    progress: 75,
    notes: 'Making good progress!'
});

// Delete a goal
await dataService.deleteAnnualGoal(goalId);
```

#### Time Blocks

```javascript
// Get time blocks for a specific date
const blocks = await dataService.getTimeBlocks('2024-01-15');

// Get time blocks for a date range
const weekBlocks = await dataService.getTimeBlocksRange('2024-01-15', '2024-01-21');

// Create a time block
const block = await dataService.createTimeBlock({
    date: '2024-01-15',
    start_time: '09:00',
    end_time: '10:00',
    title: 'Team Meeting',
    category_id: 'work-category-id'
});

// Update a time block
await dataService.updateTimeBlock(blockId, {
    title: 'Updated Meeting',
    end_time: '10:30'
});

// Delete a time block
await dataService.deleteTimeBlock(blockId);
```

#### Daily Habits

```javascript
// Get all daily habits
const habits = await dataService.getDailyHabits();

// Create a habit
const habit = await dataService.createDailyHabit({
    name: 'Exercise',
    icon: '🏃',
    color: '#4CAF50'
});

// Toggle habit completion
await dataService.toggleDailyHabitCompletion(habitId, '2024-01-15', true);

// Get habit completions for date range
const completions = await dataService.getDailyHabitCompletions('2024-01-01', '2024-01-31');

// Add note to habit completion
await dataService.updateHabitNote(habitId, '2024-01-15', 'Ran 5km today!');
```

#### Mood, Sleep & Water Tracking

```javascript
// Set mood for a day
await dataService.setMood('2024-01-15', '😊');

// Get mood entries
const moods = await dataService.getMoodEntries('2024-01-01', '2024-01-31');

// Set sleep data
await dataService.setSleepData('2024-01-15', '23:00', '07:00', 8);

// Get sleep entries
const sleep = await dataService.getSleepEntries('2024-01-01', '2024-01-31');

// Set water intake
await dataService.setWaterIntake('2024-01-15', 6, 8); // 6 glasses of 8 goal

// Get water entries
const water = await dataService.getWaterEntries('2024-01-01', '2024-01-31');
```

#### Data Export/Import

```javascript
// Export all user data
const exportData = await dataService.exportAllData();

// Download as JSON file
dataService.downloadExportFile(exportData);

// Import data (with validation)
const isValid = dataService.validateImportData(importData);
if (isValid) {
    await dataService.importAllData(importData);
}
```

---

### CacheService (`js/cache-service.js`)

Handles IndexedDB caching for offline support with TTL (time-to-live) management.

#### Cache Operations

```javascript
import cacheService, { STORES, CACHE_TTL } from './cache-service.js';

// Initialize cache
await cacheService.init();

// Check if cache is fresh
if (cacheService.isCacheFresh('goals')) {
    const cachedGoals = await cacheService.getAll(STORES.goals);
}

// Get cache age
const age = cacheService.getCacheAge('goals'); // "5m ago"

// Force refresh from server
await cacheService.forceRefresh('goals');

// Invalidate specific cache
cacheService.invalidateCache('goals');

// Invalidate all caches
cacheService.invalidateAllCaches();
```

#### Cache TTL Configuration

| Store | TTL | Description |
|-------|-----|-------------|
| goals | 24 hours | Annual goals rarely change |
| habits | 12 hours | Habit definitions are stable |
| habitLogs | 5 minutes | Logs change frequently |
| timeBlocks | 5 minutes | Time blocks change often |
| categories | 24 hours | Categories rarely change |
| monthlyData | 30 minutes | Monthly summaries |
| actionPlans | 30 minutes | Action plan data |

---

### PerformanceMonitor (`js/performance-monitor.js`)

Tracks Web Vitals and view load times for performance monitoring.

#### Usage

```javascript
import performanceMonitor from './performance-monitor.js';

// Initialize (called automatically in app.js)
performanceMonitor.init();

// Track view load time
performanceMonitor.startViewLoad('weekly');
// ... view loads ...
performanceMonitor.endViewLoad('weekly');

// Get performance summary
const summary = performanceMonitor.getSummary();
console.log(summary);
// {
//   avgLCP: 2500,
//   avgFID: 50,
//   avgCLS: "0.100",
//   viewLoadAverages: { weekly: 600, monthly: 800 },
//   totalMetrics: 25
// }

// Log summary to console
performanceMonitor.logSummary();

// Clear stored metrics
performanceMonitor.clearMetrics();
```

#### Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | < 2.5s | 2.5s - 4s | > 4s |
| FID | < 100ms | 100ms - 300ms | > 300ms |
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 |
| TTFB | < 800ms | 800ms - 1.8s | > 1.8s |

---

### ErrorHandler (`js/error-handler.js`)

Centralized error handling with user-friendly messages.

#### Usage

```javascript
import { ErrorHandler, ErrorCategory } from './error-handler.js';

// Handle any error
const result = ErrorHandler.handle(error, 'Context');
// Returns: { category, userMessage, originalError, context }

// Handle specific error types
ErrorHandler.handleAuthError(error, 'Login');
ErrorHandler.handleNetworkError(error, 'API Call');
ErrorHandler.handleDatabaseError(error, 'Save Goal');

// Show loading state
const loadingToast = ErrorHandler.showLoading('Saving...');
// ... operation ...
ErrorHandler.hideLoading(loadingToast);
```

#### Error Categories

- `AUTH` - Authentication errors (login, session, token)
- `NETWORK` - Connection errors (offline, timeout)
- `DATABASE` - Database errors (constraints, permissions)
- `VALIDATION` - Input validation errors
- `GENERIC` - Unknown errors


---

## UI Components

### Toast (`components/toast.js`)

Display notification messages to users.

```javascript
// Success message
window.Toast.success('Data saved successfully!');

// Error message
window.Toast.error('Failed to save data');

// Warning message
window.Toast.warning('You are offline');

// Info message
window.Toast.info('Remember to backup your data', 8000); // 8 second duration

// Remove a specific toast
const toast = window.Toast.info('Loading...', 0); // 0 = persistent
window.Toast.remove(toast);
```

### Modal (`components/modal.js`)

Create and manage modal dialogs.

```javascript
// Create a modal
const modal = new Modal({
    title: 'Confirm Delete',
    content: 'Are you sure you want to delete this item?',
    buttons: [
        { text: 'Cancel', type: 'secondary', onClick: () => modal.close() },
        { text: 'Delete', type: 'danger', onClick: () => handleDelete() }
    ]
});

modal.open();
```

### Spinner (`components/spinner.js`)

Show loading indicators.

```javascript
// Show global spinner
Spinner.show('Loading data...');

// Hide spinner
Spinner.hide();
```

---

## State Management

### StateManager (in `js/app.js`)

Manages application state with subscription support.

```javascript
// Get current state
const authState = stateManager.getState('auth');
const navState = stateManager.getState('navigation');

// Update state
stateManager.setState('navigation', {
    ...stateManager.getState('navigation'),
    currentView: 'monthly'
});

// Subscribe to state changes
stateManager.subscribe('auth', (newState) => {
    console.log('Auth state changed:', newState);
});
```

#### State Structure

```javascript
{
    auth: {
        user: null,
        session: null,
        isAuthenticated: false
    },
    navigation: {
        currentView: 'weekly',
        currentDate: new Date(),
        selectedYear: 2024,
        selectedMonth: 1,
        selectedWeek: 1
    },
    data: {
        annualGoals: [],
        readingList: [],
        monthlyData: {},
        weeklyGoals: [],
        timeBlocks: [],
        dailyHabits: [],
        // ... more data
    },
    ui: {
        loading: false,
        error: null,
        modals: {},
        selectedItem: null
    },
    pomodoro: {
        isRunning: false,
        isPaused: false,
        mode: 'focus',
        timeRemaining: 1500,
        sessionCount: 0
    },
    sync: {
        isOnline: true,
        lastSync: null,
        pendingOperations: []
    }
}
```

---

## Accessibility

### AccessibilityManager (`js/accessibility.js`)

Handles keyboard navigation and screen reader support.

```javascript
// Announce message to screen readers
window.accessibilityManager.announce('Item saved successfully');

// Announce with priority
window.accessibilityManager.announce('Error occurred', 'assertive');

// Make element keyboard accessible
window.accessibilityManager.makeKeyboardAccessible(element, (e) => {
    // Handle Enter/Space key press
});
```

### ThemeManager (`js/accessibility.js`)

Manages dark/light mode.

```javascript
// Toggle theme
window.themeManager.toggle();

// Set specific theme
window.themeManager.setTheme('dark');
window.themeManager.setTheme('light');
window.themeManager.setTheme('system');

// Get current theme
const theme = window.themeManager.getCurrentEffectiveTheme(); // 'dark' or 'light'
```

---

## Configuration

### APP_CONFIG (`js/config.js`)

Application configuration constants.

```javascript
import { APP_CONFIG } from './config.js';

// Default view
APP_CONFIG.defaultView // 'weekly'

// Pomodoro settings
APP_CONFIG.pomodoro.focusDuration // 1500 (25 minutes in seconds)
APP_CONFIG.pomodoro.shortBreak // 300 (5 minutes)
APP_CONFIG.pomodoro.longBreak // 900 (15 minutes)

// Cache settings
APP_CONFIG.cache.enabled // true
APP_CONFIG.cache.maxAge // 3600000 (1 hour)
```

---

## Database Schema

See `database/SCHEMA_DIAGRAM.md` for the complete database schema documentation.

### Key Tables

| Table | Description |
|-------|-------------|
| `annual_goals` | Yearly goals with sub-goals |
| `reading_list` | Books to read with progress |
| `monthly_data` | Monthly summaries and notes |
| `weekly_goals` | Weekly goal tracking |
| `time_blocks` | Daily schedule blocks |
| `daily_habits` | Habit definitions |
| `daily_habit_logs` | Habit completion records |
| `categories` | Color-coded categories |
| `mood_entries` | Daily mood tracking |
| `sleep_entries` | Sleep tracking |
| `water_entries` | Water intake tracking |
| `action_plans` | Task/action items |

---

## Events

### Custom Events

The app dispatches custom events for inter-component communication:

```javascript
// Listen for view changes
document.addEventListener('viewChanged', (e) => {
    console.log('New view:', e.detail.view);
});

// Listen for data updates
document.addEventListener('dataUpdated', (e) => {
    console.log('Updated:', e.detail.type, e.detail.data);
});
```

### Service Worker Messages

```javascript
// Listen for sync messages from service worker
navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'SYNC_REQUIRED') {
        // Trigger data sync
    }
});

// Send message to service worker
navigator.serviceWorker.controller.postMessage({
    type: 'SKIP_WAITING'
});
```
