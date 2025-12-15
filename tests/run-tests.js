/**
 * Simple Node.js test runner for property-based tests
 * Run with: node run-tests.js
 */

// Mock localStorage for Node.js environment
global.localStorage = {
    store: {},
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = value.toString();
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    }
};

// Mock navigator for Node.js environment
if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = { onLine: true };
}

import { 
    calculateGoalProgress, 
    calculateHabitProgressForDays,
    calculateMonthlyHabitProgress,
    calculateDailyCompletionPercentage,
    calculateSleepDuration,
    calculateWaterIntakePercentage,
    initializePomodoroTimer,
    completePomodoroSession,
    pausePomodoroTimer,
    resumePomodoroTimer,
    resetPomodoroTimer
} from './js/utils.js';

// Simple test framework
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('\n🧪 Running Property-Based Tests for Daily Planner\n');
        console.log('='.repeat(60));

        for (const test of this.tests) {
            try {
                await test.fn();
                this.passed++;
                console.log(`✓ ${test.name}`);
            } catch (error) {
                this.failed++;
                console.log(`✗ ${test.name}`);
                console.log(`  Error: ${error.message}`);
            }
        }

        console.log('='.repeat(60));
        console.log(`\nResults: ${this.passed} passed, ${this.failed} failed`);
        console.log(`Success Rate: ${Math.round((this.passed / this.tests.length) * 100)}%\n`);

        process.exit(this.failed > 0 ? 1 : 0);
    }
}

// Simple assertion library
function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${expected} but got ${actual}`);
            }
        },
        toBeGreaterThanOrEqual(expected) {
            if (actual < expected) {
                throw new Error(`Expected ${actual} to be >= ${expected}`);
            }
        },
        toBeLessThanOrEqual(expected) {
            if (actual > expected) {
                throw new Error(`Expected ${actual} to be <= ${expected}`);
            }
        }
    };
}

// Simple property-based testing (without fast-check for now)
function generateRandomSubGoals(count) {
    const subGoals = [];
    for (let i = 0; i < count; i++) {
        subGoals.push({
            text: `Goal ${i + 1}`,
            completed: Math.random() > 0.5
        });
    }
    return subGoals;
}

// Create test runner
const runner = new TestRunner();

// Test Suite: Goal Progress Calculation
runner.test('Property 15: Goal progress calculation - manual property test', () => {
    // Run 100 iterations with random data
    for (let i = 0; i < 100; i++) {
        const count = Math.floor(Math.random() * 20) + 1; // 1-20 sub-goals
        const subGoals = generateRandomSubGoals(count);
        
        const completedCount = subGoals.filter(sg => sg.completed === true).length;
        const totalCount = subGoals.length;
        const expectedProgress = Math.round((completedCount / totalCount) * 100 * 100) / 100;
        
        const actualProgress = calculateGoalProgress(subGoals);
        
        expect(actualProgress).toBe(expectedProgress);
        expect(actualProgress).toBeGreaterThanOrEqual(0);
        expect(actualProgress).toBeLessThanOrEqual(100);
    }
});

runner.test('Empty sub-goals array returns 0% progress', () => {
    expect(calculateGoalProgress([])).toBe(0);
});

runner.test('Null or undefined input returns 0% progress', () => {
    expect(calculateGoalProgress(null)).toBe(0);
    expect(calculateGoalProgress(undefined)).toBe(0);
});

runner.test('All completed sub-goals returns 100% progress', () => {
    const subGoals = [
        { text: 'Goal 1', completed: true },
        { text: 'Goal 2', completed: true },
        { text: 'Goal 3', completed: true }
    ];
    expect(calculateGoalProgress(subGoals)).toBe(100);
});

runner.test('No completed sub-goals returns 0% progress', () => {
    const subGoals = [
        { text: 'Goal 1', completed: false },
        { text: 'Goal 2', completed: false },
        { text: 'Goal 3', completed: false }
    ];
    expect(calculateGoalProgress(subGoals)).toBe(0);
});

runner.test('Half completed sub-goals returns 50% progress', () => {
    const subGoals = [
        { text: 'Goal 1', completed: true },
        { text: 'Goal 2', completed: true },
        { text: 'Goal 3', completed: false },
        { text: 'Goal 4', completed: false }
    ];
    expect(calculateGoalProgress(subGoals)).toBe(50);
});

runner.test('One third completed returns 33.33% progress', () => {
    const subGoals = [
        { text: 'Goal 1', completed: true },
        { text: 'Goal 2', completed: false },
        { text: 'Goal 3', completed: false }
    ];
    expect(calculateGoalProgress(subGoals)).toBe(33.33);
});

runner.test('Two thirds completed returns 66.67% progress', () => {
    const subGoals = [
        { text: 'Goal 1', completed: true },
        { text: 'Goal 2', completed: true },
        { text: 'Goal 3', completed: false }
    ];
    expect(calculateGoalProgress(subGoals)).toBe(66.67);
});

// Test Suite: Habit Progress for 7 Days
runner.test('Property 16: Habit progress for 7 days - (completed / 7) × 100', () => {
    // Run 100 iterations with random data
    for (let i = 0; i < 100; i++) {
        const completions = [];
        for (let day = 0; day < 7; day++) {
            completions.push({
                date: `2025-01-${String(day + 1).padStart(2, '0')}`,
                completed: Math.random() > 0.5
            });
        }
        
        const completedCount = completions.filter(c => c.completed === true).length;
        const expectedProgress = Math.round((completedCount / 7) * 100 * 100) / 100;
        
        const actualProgress = calculateHabitProgressForDays(completions, 7);
        
        expect(actualProgress).toBe(expectedProgress);
        expect(actualProgress).toBeGreaterThanOrEqual(0);
        expect(actualProgress).toBeLessThanOrEqual(100);
    }
});

// Test Suite: Habit Progress for 14 Days
runner.test('Property 17: Habit progress for 14 days - (completed / 14) × 100', () => {
    // Run 100 iterations with random data
    for (let i = 0; i < 100; i++) {
        const completions = [];
        for (let day = 0; day < 14; day++) {
            completions.push({
                date: `2025-01-${String(day + 1).padStart(2, '0')}`,
                completed: Math.random() > 0.5
            });
        }
        
        const completedCount = completions.filter(c => c.completed === true).length;
        const expectedProgress = Math.round((completedCount / 14) * 100 * 100) / 100;
        
        const actualProgress = calculateHabitProgressForDays(completions, 14);
        
        expect(actualProgress).toBe(expectedProgress);
        expect(actualProgress).toBeGreaterThanOrEqual(0);
        expect(actualProgress).toBeLessThanOrEqual(100);
    }
});

// Test Suite: Habit Progress for 21 Days
runner.test('Property 18: Habit progress for 21 days - (completed / 21) × 100', () => {
    // Run 100 iterations with random data
    for (let i = 0; i < 100; i++) {
        const completions = [];
        for (let day = 0; day < 21; day++) {
            completions.push({
                date: `2025-01-${String(day + 1).padStart(2, '0')}`,
                completed: Math.random() > 0.5
            });
        }
        
        const completedCount = completions.filter(c => c.completed === true).length;
        const expectedProgress = Math.round((completedCount / 21) * 100 * 100) / 100;
        
        const actualProgress = calculateHabitProgressForDays(completions, 21);
        
        expect(actualProgress).toBe(expectedProgress);
        expect(actualProgress).toBeGreaterThanOrEqual(0);
        expect(actualProgress).toBeLessThanOrEqual(100);
    }
});

// Test Suite: Habit Progress for 28 Days
runner.test('Property 19: Habit progress for 28 days - (completed / 28) × 100', () => {
    // Run 100 iterations with random data
    for (let i = 0; i < 100; i++) {
        const completions = [];
        for (let day = 0; day < 28; day++) {
            completions.push({
                date: `2025-01-${String(day + 1).padStart(2, '0')}`,
                completed: Math.random() > 0.5
            });
        }
        
        const completedCount = completions.filter(c => c.completed === true).length;
        const expectedProgress = Math.round((completedCount / 28) * 100 * 100) / 100;
        
        const actualProgress = calculateHabitProgressForDays(completions, 28);
        
        expect(actualProgress).toBe(expectedProgress);
        expect(actualProgress).toBeGreaterThanOrEqual(0);
        expect(actualProgress).toBeLessThanOrEqual(100);
    }
});

// Test Suite: Monthly Habit Progress
runner.test('Property 20: Monthly habit progress - (completed / total days in month) × 100', () => {
    // Run 100 iterations with random months
    for (let i = 0; i < 100; i++) {
        const month = Math.floor(Math.random() * 12) + 1; // 1-12
        const year = 2025;
        const daysInMonth = new Date(year, month, 0).getDate();
        
        const completions = [];
        for (let day = 1; day <= daysInMonth; day++) {
            completions.push({
                date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                completed: Math.random() > 0.5
            });
        }
        
        const completedCount = completions.filter(c => c.completed === true).length;
        const expectedProgress = Math.round((completedCount / daysInMonth) * 100 * 100) / 100;
        
        const actualProgress = calculateMonthlyHabitProgress(completions, daysInMonth);
        
        expect(actualProgress).toBe(expectedProgress);
        expect(actualProgress).toBeGreaterThanOrEqual(0);
        expect(actualProgress).toBeLessThanOrEqual(100);
    }
});

// Test Suite: Daily Completion Percentage
runner.test('Property 21: Daily completion percentage - (completed habits / total habits) × 100', () => {
    // Run 100 iterations with random habit counts
    for (let i = 0; i < 100; i++) {
        const totalHabits = Math.floor(Math.random() * 30) + 1; // 1-30 habits
        
        const completions = [];
        for (let h = 0; h < totalHabits; h++) {
            completions.push({
                habit_id: `habit-${h}`,
                date: '2025-01-15',
                completed: Math.random() > 0.5
            });
        }
        
        const completedCount = completions.filter(c => c.completed === true).length;
        const expectedPercentage = Math.round((completedCount / totalHabits) * 100 * 100) / 100;
        
        const actualPercentage = calculateDailyCompletionPercentage(completions, totalHabits);
        
        expect(actualPercentage).toBe(expectedPercentage);
        expect(actualPercentage).toBeGreaterThanOrEqual(0);
        expect(actualPercentage).toBeLessThanOrEqual(100);
    }
});

// Test Suite: Sleep Duration Calculation
runner.test('Property 27: Sleep duration - time difference in hours', () => {
    // Run 100 iterations with random times
    for (let i = 0; i < 100; i++) {
        const bedHour = Math.floor(Math.random() * 6) + 18; // 18-23
        const bedMin = Math.floor(Math.random() * 60);
        const wakeHour = Math.floor(Math.random() * 9) + 4; // 4-12
        const wakeMin = Math.floor(Math.random() * 60);
        
        const bedtime = `${String(bedHour).padStart(2, '0')}:${String(bedMin).padStart(2, '0')}`;
        const wakeTime = `${String(wakeHour).padStart(2, '0')}:${String(wakeMin).padStart(2, '0')}`;
        
        let bedMinutes = bedHour * 60 + bedMin;
        let wakeMinutes = wakeHour * 60 + wakeMin;
        
        if (wakeMinutes < bedMinutes) {
            wakeMinutes += 24 * 60;
        }
        
        const durationMinutes = wakeMinutes - bedMinutes;
        const expectedDuration = Math.round((durationMinutes / 60) * 10) / 10;
        
        const actualDuration = calculateSleepDuration(bedtime, wakeTime);
        
        expect(actualDuration).toBe(expectedDuration);
        expect(actualDuration).toBeGreaterThanOrEqual(0);
        expect(actualDuration).toBeLessThanOrEqual(24);
    }
});

runner.test('Sleep duration: 22:00 to 06:00 is 8 hours', () => {
    expect(calculateSleepDuration('22:00', '06:00')).toBe(8.0);
});

runner.test('Sleep duration: 23:30 to 07:30 is 8 hours', () => {
    expect(calculateSleepDuration('23:30', '07:30')).toBe(8.0);
});

// Test Suite: Water Intake Percentage
runner.test('Property 28: Water intake percentage - (consumed / goal) × 100', () => {
    // Run 100 iterations with random values
    for (let i = 0; i < 100; i++) {
        const glassesConsumed = Math.floor(Math.random() * 21); // 0-20
        const goalGlasses = Math.floor(Math.random() * 20) + 1; // 1-20
        
        const expectedPercentage = Math.round((glassesConsumed / goalGlasses) * 100 * 100) / 100;
        
        const actualPercentage = calculateWaterIntakePercentage(glassesConsumed, goalGlasses);
        
        expect(actualPercentage).toBe(expectedPercentage);
        expect(actualPercentage).toBeGreaterThanOrEqual(0);
    }
});

runner.test('Water intake: 8 glasses out of 8 goal is 100%', () => {
    expect(calculateWaterIntakePercentage(8, 8)).toBe(100);
});

runner.test('Water intake: 4 glasses out of 8 goal is 50%', () => {
    expect(calculateWaterIntakePercentage(4, 8)).toBe(50);
});

runner.test('Water intake: 0 glasses out of 8 goal is 0%', () => {
    expect(calculateWaterIntakePercentage(0, 8)).toBe(0);
});

// Test Suite: Pomodoro Timer Properties
runner.test('Property 57: Timer initialization - starts at 25 minutes (1500 seconds)', () => {
    // Run 100 iterations to ensure consistency
    for (let i = 0; i < 100; i++) {
        const timer = initializePomodoroTimer();
        
        expect(timer.mode).toBe('focus');
        expect(timer.timeRemaining).toBe(1500);
        expect(timer.sessionCount).toBe(0);
        expect(timer.isRunning).toBe(false);
        expect(timer.isPaused).toBe(false);
        expect(timer.timeRemaining).toBeGreaterThanOrEqual(0);
        expect(timer.sessionCount).toBeGreaterThanOrEqual(0);
    }
});

runner.test('Property 58: Session completion - auto-starts 5-minute break', () => {
    // Test sessions 1-3 (not 4, which triggers long break)
    for (let sessionCount = 0; sessionCount < 3; sessionCount++) {
        const result = completePomodoroSession({
            mode: 'focus',
            sessionCount: sessionCount,
            timeRemaining: 0
        });
        
        expect(result.mode).toBe('shortBreak');
        expect(result.timeRemaining).toBe(300);
        expect(result.sessionCount).toBe(sessionCount + 1);
        expect(result.notificationShown).toBe(true);
        expect(result.isRunning).toBe(true);
        expect(result.timeRemaining).toBeGreaterThanOrEqual(0);
        expect(result.sessionCount).toBeGreaterThanOrEqual(sessionCount);
    }
});

runner.test('Property 59: Long break after four sessions - auto-starts 15-minute break', () => {
    // Run 100 iterations to ensure consistency
    for (let i = 0; i < 100; i++) {
        const result = completePomodoroSession({
            mode: 'focus',
            sessionCount: 3, // After completion, will be 4
            timeRemaining: 0
        });
        
        expect(result.mode).toBe('longBreak');
        expect(result.timeRemaining).toBe(900);
        expect(result.sessionCount).toBe(4);
        expect(result.notificationShown).toBe(true);
        expect(result.isRunning).toBe(true);
        expect(result.timeRemaining).toBeGreaterThanOrEqual(0);
    }
});

runner.test('Every 4th session triggers long break', () => {
    // Test sessions 4, 8, 12
    for (const sessionNum of [4, 8, 12]) {
        const result = completePomodoroSession({
            mode: 'focus',
            sessionCount: sessionNum - 1,
            timeRemaining: 0
        });
        
        expect(result.mode).toBe('longBreak');
        expect(result.timeRemaining).toBe(900);
        expect(result.sessionCount).toBe(sessionNum);
    }
});

runner.test('Property 60: Pause and resume - continues from paused time', () => {
    // Run 100 iterations with random times
    for (let i = 0; i < 100; i++) {
        const timeRemaining = Math.floor(Math.random() * 1500) + 1; // 1-1500 seconds
        const modes = ['focus', 'shortBreak', 'longBreak'];
        const mode = modes[Math.floor(Math.random() * modes.length)];
        
        const runningTimer = {
            mode: mode,
            timeRemaining: timeRemaining,
            isRunning: true,
            isPaused: false
        };
        
        // Pause the timer
        const pausedTimer = pausePomodoroTimer(runningTimer);
        
        expect(pausedTimer.isPaused).toBe(true);
        expect(pausedTimer.isRunning).toBe(true);
        expect(pausedTimer.timeRemaining).toBe(timeRemaining);
        expect(pausedTimer.mode).toBe(mode);
        
        // Resume the timer
        const resumedTimer = resumePomodoroTimer(pausedTimer);
        
        expect(resumedTimer.isPaused).toBe(false);
        expect(resumedTimer.isRunning).toBe(true);
        expect(resumedTimer.timeRemaining).toBe(timeRemaining);
        expect(resumedTimer.mode).toBe(mode);
    }
});

runner.test('Property 61: Timer reset - returns to initial state', () => {
    // Run 100 iterations with random timer states
    for (let i = 0; i < 100; i++) {
        const timeRemaining = Math.floor(Math.random() * 1501); // 0-1500 seconds
        const modes = ['focus', 'shortBreak', 'longBreak'];
        const mode = modes[Math.floor(Math.random() * modes.length)];
        const isRunning = Math.random() > 0.5;
        const isPaused = Math.random() > 0.5;
        
        const timer = {
            mode: mode,
            timeRemaining: timeRemaining,
            isRunning: isRunning,
            isPaused: isPaused,
            sessionCount: 2
        };
        
        // Reset the timer
        const resetTimer = resetPomodoroTimer(timer);
        
        expect(resetTimer.mode).toBe('focus');
        expect(resetTimer.timeRemaining).toBe(1500);
        expect(resetTimer.isRunning).toBe(false);
        expect(resetTimer.isPaused).toBe(false);
        expect(resetTimer.timeRemaining).toBeGreaterThanOrEqual(0);
    }
});

runner.test('Pausing at 10 minutes remaining preserves time', () => {
    const timer = {
        mode: 'focus',
        timeRemaining: 600,
        isRunning: true,
        isPaused: false
    };
    
    const paused = pausePomodoroTimer(timer);
    expect(paused.timeRemaining).toBe(600);
    expect(paused.isPaused).toBe(true);
});

runner.test('Resuming from pause maintains time', () => {
    const timer = {
        mode: 'focus',
        timeRemaining: 600,
        isRunning: true,
        isPaused: true
    };
    
    const resumed = resumePomodoroTimer(timer);
    expect(resumed.timeRemaining).toBe(600);
    expect(resumed.isPaused).toBe(false);
});

runner.test('Reset from any state returns to 25 minutes focus', () => {
    const timer = {
        mode: 'shortBreak',
        timeRemaining: 150,
        isRunning: true,
        isPaused: false,
        sessionCount: 3
    };
    
    const reset = resetPomodoroTimer(timer);
    expect(reset.mode).toBe('focus');
    expect(reset.timeRemaining).toBe(1500);
    expect(reset.isRunning).toBe(false);
});

runner.test('Break completion returns to focus mode', () => {
    // Complete short break
    const afterShortBreak = completePomodoroSession({
        mode: 'shortBreak',
        sessionCount: 2,
        timeRemaining: 0
    });
    
    expect(afterShortBreak.mode).toBe('focus');
    expect(afterShortBreak.timeRemaining).toBe(1500);
    expect(afterShortBreak.isRunning).toBe(false);
    
    // Complete long break
    const afterLongBreak = completePomodoroSession({
        mode: 'longBreak',
        sessionCount: 4,
        timeRemaining: 0
    });
    
    expect(afterLongBreak.mode).toBe('focus');
    expect(afterLongBreak.timeRemaining).toBe(1500);
    expect(afterLongBreak.isRunning).toBe(false);
});

// Run all tests
runner.run();

// Test Suite: Real-Time Update Propagation
runner.test('Property 44: Real-time updates - changes propagate to UI', async () => {
    const { default: SyncManager } = await import('./js/sync-manager.js');
    
    // Run 100 iterations with random data
    for (let i = 0; i < 100; i++) {
        const tables = [
            'annual_goals', 'reading_list', 'monthly_data', 'weekly_goals',
            'time_blocks', 'daily_entries', 'daily_habits', 'daily_habit_completions',
            'weekly_habits', 'weekly_habit_completions', 'mood_tracker',
            'sleep_tracker', 'water_tracker', 'action_plans'
        ];
        const table = tables[Math.floor(Math.random() * tables.length)];
        
        const eventTypes = ['INSERT', 'UPDATE', 'DELETE'];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        
        const recordData = {
            id: `${Math.random().toString(36).substring(7)}`,
            user_id: `${Math.random().toString(36).substring(7)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Create a new SyncManager instance
        const syncManager = new SyncManager();
        
        // Track if onChange was called
        let changeReceived = false;
        let receivedChange = null;
        
        // Subscribe to the table with a change handler
        const onChange = (change) => {
            changeReceived = true;
            receivedChange = change;
        };
        
        // Test the handleChange method directly
        syncManager.handleChange(table, {
            eventType: eventType,
            new: eventType !== 'DELETE' ? recordData : null,
            old: eventType !== 'INSERT' ? recordData : null
        }, onChange);
        
        // Assert that the change was received
        expect(changeReceived).toBe(true);
        if (receivedChange === null) {
            throw new Error('receivedChange should not be null');
        }
        expect(receivedChange.table).toBe(table);
        expect(receivedChange.eventType).toBe(eventType);
        
        // Assert that the change was recorded
        const changes = syncManager.getChangesForTable(table);
        if (changes.length === 0) {
            throw new Error('Changes should be recorded');
        }
        
        const lastChange = changes[changes.length - 1];
        expect(lastChange.eventType).toBe(eventType);
        
        // Verify correct record is in the change based on event type
        if (eventType === 'INSERT') {
            if (lastChange.newRecord === null) {
                throw new Error('INSERT should have newRecord');
            }
            if (lastChange.oldRecord !== null) {
                throw new Error('INSERT should not have oldRecord');
            }
        } else if (eventType === 'UPDATE') {
            if (lastChange.newRecord === null) {
                throw new Error('UPDATE should have newRecord');
            }
            if (lastChange.oldRecord === null) {
                throw new Error('UPDATE should have oldRecord');
            }
        } else if (eventType === 'DELETE') {
            if (lastChange.newRecord !== null) {
                throw new Error('DELETE should not have newRecord');
            }
            if (lastChange.oldRecord === null) {
                throw new Error('DELETE should have oldRecord');
            }
        }
        
        // Cleanup
        syncManager.clearChanges();
    }
});

runner.test('Multiple changes are tracked in order', async () => {
    const { default: SyncManager } = await import('./js/sync-manager.js');
    const syncManager = new SyncManager();
    
    const table = 'annual_goals';
    const changes = [];
    
    const onChange = (change) => {
        changes.push(change);
    };
    
    // Simulate multiple changes
    const record1 = { id: '1', title: 'Goal 1' };
    const record2 = { id: '2', title: 'Goal 2' };
    const record3 = { id: '3', title: 'Goal 3' };
    
    syncManager.handleChange(table, {
        eventType: 'INSERT',
        new: record1,
        old: null
    }, onChange);
    
    syncManager.handleChange(table, {
        eventType: 'INSERT',
        new: record2,
        old: null
    }, onChange);
    
    syncManager.handleChange(table, {
        eventType: 'UPDATE',
        new: { ...record1, title: 'Updated Goal 1' },
        old: record1
    }, onChange);
    
    syncManager.handleChange(table, {
        eventType: 'DELETE',
        new: null,
        old: record3
    }, onChange);
    
    // Assert all changes were received
    expect(changes.length).toBe(4);
    expect(changes[0].eventType).toBe('INSERT');
    expect(changes[1].eventType).toBe('INSERT');
    expect(changes[2].eventType).toBe('UPDATE');
    expect(changes[3].eventType).toBe('DELETE');
    
    // Assert changes are stored
    const storedChanges = syncManager.getChangesForTable(table);
    expect(storedChanges.length).toBe(4);
    
    syncManager.clearChanges();
});

runner.test('Changes are isolated by table', async () => {
    const { default: SyncManager } = await import('./js/sync-manager.js');
    const syncManager = new SyncManager();
    
    const table1 = 'annual_goals';
    const table2 = 'daily_habits';
    
    const record1 = { id: '1', title: 'Goal 1' };
    const record2 = { id: '2', name: 'Habit 1' };
    
    // Add changes to different tables
    syncManager.handleChange(table1, {
        eventType: 'INSERT',
        new: record1,
        old: null
    }, null);
    
    syncManager.handleChange(table2, {
        eventType: 'INSERT',
        new: record2,
        old: null
    }, null);
    
    // Assert changes are isolated
    const changes1 = syncManager.getChangesForTable(table1);
    const changes2 = syncManager.getChangesForTable(table2);
    
    expect(changes1.length).toBe(1);
    expect(changes2.length).toBe(1);
    
    syncManager.clearChanges();
});

runner.test('INSERT events have new record and no old record', async () => {
    const { default: SyncManager } = await import('./js/sync-manager.js');
    const syncManager = new SyncManager();
    
    const table = 'annual_goals';
    const newRecord = { id: '1', title: 'New Goal' };
    
    let receivedChange = null;
    syncManager.handleChange(table, {
        eventType: 'INSERT',
        new: newRecord,
        old: null
    }, (change) => {
        receivedChange = change;
    });
    
    expect(receivedChange.eventType).toBe('INSERT');
    if (receivedChange.oldRecord !== null) {
        throw new Error('INSERT should not have oldRecord');
    }
    
    syncManager.clearChanges();
});

runner.test('UPDATE events have both new and old records', async () => {
    const { default: SyncManager } = await import('./js/sync-manager.js');
    const syncManager = new SyncManager();
    
    const table = 'annual_goals';
    const oldRecord = { id: '1', title: 'Old Goal' };
    const newRecord = { id: '1', title: 'Updated Goal' };
    
    let receivedChange = null;
    syncManager.handleChange(table, {
        eventType: 'UPDATE',
        new: newRecord,
        old: oldRecord
    }, (change) => {
        receivedChange = change;
    });
    
    expect(receivedChange.eventType).toBe('UPDATE');
    if (receivedChange.newRecord === null) {
        throw new Error('UPDATE should have newRecord');
    }
    if (receivedChange.oldRecord === null) {
        throw new Error('UPDATE should have oldRecord');
    }
    
    syncManager.clearChanges();
});

runner.test('DELETE events have old record and no new record', async () => {
    const { default: SyncManager } = await import('./js/sync-manager.js');
    const syncManager = new SyncManager();
    
    const table = 'annual_goals';
    const oldRecord = { id: '1', title: 'Deleted Goal' };
    
    let receivedChange = null;
    syncManager.handleChange(table, {
        eventType: 'DELETE',
        new: null,
        old: oldRecord
    }, (change) => {
        receivedChange = change;
    });
    
    expect(receivedChange.eventType).toBe('DELETE');
    if (receivedChange.newRecord !== null) {
        throw new Error('DELETE should not have newRecord');
    }
    if (receivedChange.oldRecord === null) {
        throw new Error('DELETE should have oldRecord');
    }
    
    syncManager.clearChanges();
});

runner.test('Changes include timestamp', async () => {
    const { default: SyncManager } = await import('./js/sync-manager.js');
    const syncManager = new SyncManager();
    
    const table = 'annual_goals';
    const record = { id: '1', title: 'Goal 1' };
    
    const beforeTime = new Date();
    
    syncManager.handleChange(table, {
        eventType: 'INSERT',
        new: record,
        old: null
    }, null);
    
    const afterTime = new Date();
    
    const changes = syncManager.getChangesForTable(table);
    expect(changes.length).toBe(1);
    
    if (!changes[0].timestamp) {
        throw new Error('Change should have timestamp');
    }
    if (!(changes[0].timestamp instanceof Date)) {
        throw new Error('Timestamp should be a Date object');
    }
    if (changes[0].timestamp.getTime() < beforeTime.getTime()) {
        throw new Error('Timestamp should be after beforeTime');
    }
    if (changes[0].timestamp.getTime() > afterTime.getTime()) {
        throw new Error('Timestamp should be before afterTime');
    }
    
    syncManager.clearChanges();
});


// Test Suite: Offline Queue and Sync
runner.test('Property 45: Offline queue and sync - queued operations sync when online', async () => {
    const { OfflineManager } = await import('./js/offline-manager.js');
    
    // Run 100 iterations with random operations
    for (let i = 0; i < 100; i++) {
        const tables = ['annual_goals', 'daily_habits', 'time_blocks', 'action_plans'];
        const actions = ['insert', 'update', 'delete', 'upsert'];
        
        const operationCount = Math.floor(Math.random() * 10) + 1; // 1-10 operations
        const operations = [];
        
        for (let j = 0; j < operationCount; j++) {
            operations.push({
                table: tables[Math.floor(Math.random() * tables.length)],
                action: actions[Math.floor(Math.random() * actions.length)],
                data: {
                    id: `${Math.random().toString(36).substring(7)}`,
                    title: `Item ${j}`,
                    completed: Math.random() > 0.5
                }
            });
        }
        
        // Create a fresh offline manager instance for testing
        const offlineManager = new OfflineManager();
        
        // Clear any existing queue
        offlineManager.clearQueue();
        
        // Simulate offline state
        offlineManager.isOnline = false;
        
        // Add operations to queue
        operations.forEach(op => {
            offlineManager.addToQueue(op);
        });
        
        // Verify operations are queued
        const queue = offlineManager.getQueue();
        expect(queue.length).toBe(operations.length);
        
        // Verify each operation has required fields
        queue.forEach((queuedOp, index) => {
            expect(queuedOp.table).toBe(operations[index].table);
            expect(queuedOp.action).toBe(operations[index].action);
            if (!queuedOp.timestamp) {
                throw new Error('Operation should have timestamp');
            }
            if (!queuedOp.id) {
                throw new Error('Operation should have id');
            }
        });
        
        // Verify queue persists to localStorage
        const storedQueue = JSON.parse(localStorage.getItem('offlineQueue'));
        expect(storedQueue.length).toBe(operations.length);
        
        // Cleanup
        offlineManager.clearQueue();
    }
});

runner.test('Operations added to queue have timestamp and ID', async () => {
    const { OfflineManager } = await import('./js/offline-manager.js');
    const offlineManager = new OfflineManager();
    
    offlineManager.clearQueue();
    
    const operation = {
        table: 'annual_goals',
        action: 'insert',
        data: { id: '123', title: 'Test Goal' }
    };
    
    offlineManager.addToQueue(operation);
    
    const queue = offlineManager.getQueue();
    expect(queue.length).toBe(1);
    if (!queue[0].timestamp) {
        throw new Error('Operation should have timestamp');
    }
    if (!queue[0].id) {
        throw new Error('Operation should have id');
    }
    expect(queue[0].table).toBe('annual_goals');
    expect(queue[0].action).toBe('insert');
    
    offlineManager.clearQueue();
});

runner.test('Queue persists to localStorage', async () => {
    const { OfflineManager } = await import('./js/offline-manager.js');
    const offlineManager = new OfflineManager();
    
    offlineManager.clearQueue();
    
    const operations = [
        { table: 'annual_goals', action: 'insert', data: { id: '1', title: 'Goal 1' } },
        { table: 'daily_habits', action: 'update', data: { id: '2', title: 'Habit 1' } },
        { table: 'time_blocks', action: 'delete', data: { id: '3' } }
    ];
    
    operations.forEach(op => offlineManager.addToQueue(op));
    
    // Verify queue is saved to localStorage
    const stored = localStorage.getItem('offlineQueue');
    if (!stored) {
        throw new Error('Queue should be saved to localStorage');
    }
    
    const parsedQueue = JSON.parse(stored);
    expect(parsedQueue.length).toBe(3);
    
    // Create new instance to simulate page reload
    const newOfflineManager = new OfflineManager();
    const loadedQueue = newOfflineManager.getQueue();
    
    expect(loadedQueue.length).toBe(3);
    expect(loadedQueue[0].table).toBe('annual_goals');
    expect(loadedQueue[1].table).toBe('daily_habits');
    expect(loadedQueue[2].table).toBe('time_blocks');
    
    offlineManager.clearQueue();
});

runner.test('Queue is cleared after operations are processed', async () => {
    const { OfflineManager } = await import('./js/offline-manager.js');
    const offlineManager = new OfflineManager();
    
    offlineManager.clearQueue();
    
    const operation = {
        table: 'annual_goals',
        action: 'insert',
        data: { id: '123', title: 'Test Goal' }
    };
    
    offlineManager.addToQueue(operation);
    expect(offlineManager.getQueueLength()).toBe(1);
    
    // Clear queue (simulating successful sync)
    offlineManager.clearQueue();
    expect(offlineManager.getQueueLength()).toBe(0);
    
    // Verify localStorage is also cleared
    const stored = localStorage.getItem('offlineQueue');
    const parsedQueue = JSON.parse(stored);
    expect(parsedQueue.length).toBe(0);
});

runner.test('Online/offline status is tracked correctly', async () => {
    const { OfflineManager } = await import('./js/offline-manager.js');
    const offlineManager = new OfflineManager();
    
    // Initial status should match navigator.onLine
    const initialStatus = offlineManager.isOnlineStatus();
    if (typeof initialStatus !== 'boolean') {
        throw new Error(`Status should be boolean, got ${typeof initialStatus}: ${initialStatus}`);
    }
    
    // Simulate going offline
    offlineManager.handleOffline();
    expect(offlineManager.isOnlineStatus()).toBe(false);
    
    // Simulate going online
    await offlineManager.handleOnline();
    expect(offlineManager.isOnlineStatus()).toBe(true);
    
    offlineManager.clearQueue();
});

runner.test('Listeners are notified of online/offline events', async () => {
    const { OfflineManager } = await import('./js/offline-manager.js');
    const offlineManager = new OfflineManager();
    
    let eventReceived = null;
    let statusReceived = null;
    
    const listener = (event, isOnline) => {
        eventReceived = event;
        statusReceived = isOnline;
    };
    
    offlineManager.addListener(listener);
    
    // Trigger offline event
    offlineManager.handleOffline();
    expect(eventReceived).toBe('offline');
    expect(statusReceived).toBe(false);
    
    // Trigger online event
    await offlineManager.handleOnline();
    expect(eventReceived).toBe('online');
    expect(statusReceived).toBe(true);
    
    // Remove listener
    offlineManager.removeListener(listener);
    
    // Trigger event again - listener should not be called
    eventReceived = null;
    offlineManager.handleOffline();
    expect(eventReceived).toBe(null);
    
    offlineManager.clearQueue();
});

runner.test('Operations maintain FIFO order in queue', async () => {
    const { OfflineManager } = await import('./js/offline-manager.js');
    const offlineManager = new OfflineManager();
    
    offlineManager.clearQueue();
    
    const operations = [
        { table: 'annual_goals', action: 'insert', data: { id: '1', order: 1 } },
        { table: 'daily_habits', action: 'update', data: { id: '2', order: 2 } },
        { table: 'time_blocks', action: 'delete', data: { id: '3', order: 3 } },
        { table: 'action_plans', action: 'upsert', data: { id: '4', order: 4 } }
    ];
    
    operations.forEach(op => offlineManager.addToQueue(op));
    
    const queue = offlineManager.getQueue();
    expect(queue.length).toBe(4);
    
    // Verify order is maintained
    queue.forEach((queuedOp, index) => {
        expect(queuedOp.data.order).toBe(index + 1);
    });
    
    offlineManager.clearQueue();
});

runner.test('Queue handles large number of operations', async () => {
    const { OfflineManager } = await import('./js/offline-manager.js');
    const offlineManager = new OfflineManager();
    
    offlineManager.clearQueue();
    
    // Add 100 operations
    for (let i = 0; i < 100; i++) {
        offlineManager.addToQueue({
            table: 'annual_goals',
            action: 'insert',
            data: { id: `${i}`, title: `Goal ${i}` }
        });
    }
    
    expect(offlineManager.getQueueLength()).toBe(100);
    
    // Verify all operations are in queue
    const queue = offlineManager.getQueue();
    expect(queue.length).toBe(100);
    
    offlineManager.clearQueue();
});

runner.test('Duplicate operations can be queued', async () => {
    const { OfflineManager } = await import('./js/offline-manager.js');
    const offlineManager = new OfflineManager();
    
    offlineManager.clearQueue();
    
    const operation = {
        table: 'annual_goals',
        action: 'update',
        data: { id: '123', title: 'Updated Goal' }
    };
    
    // Add same operation multiple times
    offlineManager.addToQueue(operation);
    offlineManager.addToQueue(operation);
    offlineManager.addToQueue(operation);
    
    expect(offlineManager.getQueueLength()).toBe(3);
    
    // Each should have unique ID and timestamp
    const queue = offlineManager.getQueue();
    const ids = queue.map(op => op.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
    
    offlineManager.clearQueue();
});



// Test Suite: Data Export and Import
runner.test('Property 53: Export completeness - exported data contains all required fields', async () => {
    const dataService = (await import('./js/data-service.js')).default;
    
    // Mock the Supabase client methods
    const originalSupabase = dataService.supabase;
    
    dataService.supabase = {
        auth: {
            getUser: async () => ({
                data: { user: { id: 'test-user-id', email: 'test@example.com' } }
            })
        }
    };
    
    // Mock all data fetching methods
    const originalGetUserProfile = dataService.getUserProfile;
    const originalGetAnnualGoals = dataService.getAnnualGoals;
    const originalGetReadingList = dataService.getReadingList;
    const originalGetMonthlyData = dataService.getMonthlyData;
    const originalGetWeeklyGoals = dataService.getWeeklyGoals;
    const originalGetTimeBlocksRange = dataService.getTimeBlocksRange;
    const originalGetDailyEntry = dataService.getDailyEntry;
    const originalGetDailyHabits = dataService.getDailyHabits;
    const originalGetDailyHabitCompletions = dataService.getDailyHabitCompletions;
    const originalGetWeeklyHabits = dataService.getWeeklyHabits;
    const originalGetWeeklyHabitCompletions = dataService.getWeeklyHabitCompletions;
    const originalGetMoodEntries = dataService.getMoodEntries;
    const originalGetSleepEntries = dataService.getSleepEntries;
    const originalGetWaterEntries = dataService.getWaterEntries;
    const originalGetActionPlans = dataService.getActionPlans;
    
    dataService.getUserProfile = async () => ({ display_name: 'Test User', timezone: 'UTC' });
    dataService.getAnnualGoals = async () => [];
    dataService.getReadingList = async () => [];
    dataService.getMonthlyData = async () => null;
    dataService.getWeeklyGoals = async () => [];
    dataService.getTimeBlocksRange = async () => [];
    dataService.getDailyEntry = async () => null;
    dataService.getDailyHabits = async () => [];
    dataService.getDailyHabitCompletions = async () => [];
    dataService.getWeeklyHabits = async () => [];
    dataService.getWeeklyHabitCompletions = async () => [];
    dataService.getMoodEntries = async () => [];
    dataService.getSleepEntries = async () => [];
    dataService.getWaterEntries = async () => [];
    dataService.getActionPlans = async () => [];
    
    // Export data
    const exportData = await dataService.exportAllData();
    
    // Verify export structure
    if (!exportData) throw new Error('Export data is undefined');
    if (!exportData.version) throw new Error('Missing version field');
    if (!exportData.exportDate) throw new Error('Missing exportDate field');
    if (exportData.userId !== 'test-user-id') throw new Error('Incorrect userId');
    if (exportData.userEmail !== 'test@example.com') throw new Error('Incorrect userEmail');
    
    // Verify data field exists
    if (!exportData.data) throw new Error('Missing data field');
    if (typeof exportData.data !== 'object') throw new Error('Data field is not an object');
    
    // Verify all required data fields are present
    const requiredFields = [
        'profile',
        'annualGoals',
        'readingList',
        'monthlyData',
        'weeklyGoals',
        'timeBlocks',
        'dailyEntries',
        'dailyHabits',
        'dailyHabitCompletions',
        'weeklyHabits',
        'weeklyHabitCompletions',
        'moodEntries',
        'sleepEntries',
        'waterEntries',
        'actionPlans'
    ];
    
    for (const field of requiredFields) {
        if (!(field in exportData.data)) {
            throw new Error(`Missing required field: ${field}`);
        }
    }
    
    // Verify export date is valid ISO string
    const exportDate = new Date(exportData.exportDate);
    if (isNaN(exportDate.getTime())) {
        throw new Error('Invalid exportDate');
    }
    if (exportDate.toISOString() !== exportData.exportDate) {
        throw new Error('exportDate is not a valid ISO string');
    }
    
    // Restore original methods
    dataService.supabase = originalSupabase;
    dataService.getUserProfile = originalGetUserProfile;
    dataService.getAnnualGoals = originalGetAnnualGoals;
    dataService.getReadingList = originalGetReadingList;
    dataService.getMonthlyData = originalGetMonthlyData;
    dataService.getWeeklyGoals = originalGetWeeklyGoals;
    dataService.getTimeBlocksRange = originalGetTimeBlocksRange;
    dataService.getDailyEntry = originalGetDailyEntry;
    dataService.getDailyHabits = originalGetDailyHabits;
    dataService.getDailyHabitCompletions = originalGetDailyHabitCompletions;
    dataService.getWeeklyHabits = originalGetWeeklyHabits;
    dataService.getWeeklyHabitCompletions = originalGetWeeklyHabitCompletions;
    dataService.getMoodEntries = originalGetMoodEntries;
    dataService.getSleepEntries = originalGetSleepEntries;
    dataService.getWaterEntries = originalGetWaterEntries;
    dataService.getActionPlans = originalGetActionPlans;
});

runner.test('Property 54: Import validation - invalid formats are rejected', async () => {
    const dataService = (await import('./js/data-service.js')).default;
    
    // Test various invalid data structures
    const invalidDataSets = [
        // Missing version
        {
            exportDate: new Date().toISOString(),
            userId: 'test-id',
            data: {
                annualGoals: [],
                readingList: [],
                dailyHabits: [],
                weeklyHabits: [],
                actionPlans: []
            }
        },
        // Missing data field
        {
            version: '1.0',
            exportDate: new Date().toISOString(),
            userId: 'test-id'
        },
        // Invalid data field (not an object)
        {
            version: '1.0',
            exportDate: new Date().toISOString(),
            userId: 'test-id',
            data: 'invalid'
        },
        // Missing required array fields
        {
            version: '1.0',
            exportDate: new Date().toISOString(),
            userId: 'test-id',
            data: {
                annualGoals: []
                // Missing other required fields
            }
        },
        // Invalid array field types
        {
            version: '1.0',
            exportDate: new Date().toISOString(),
            userId: 'test-id',
            data: {
                annualGoals: 'not an array',
                readingList: [],
                dailyHabits: [],
                weeklyHabits: [],
                actionPlans: []
            }
        }
    ];
    
    for (const invalidData of invalidDataSets) {
        const validation = dataService.validateImportData(invalidData);
        
        // Should be invalid
        if (validation.valid !== false) {
            throw new Error('Invalid data was marked as valid');
        }
        
        // Should have error messages
        if (!validation.errors) {
            throw new Error('Missing errors array');
        }
        if (!Array.isArray(validation.errors)) {
            throw new Error('Errors is not an array');
        }
        if (validation.errors.length === 0) {
            throw new Error('No error messages provided');
        }
        
        // Each error should be a string
        for (const error of validation.errors) {
            if (typeof error !== 'string') {
                throw new Error('Error message is not a string');
            }
            if (error.length === 0) {
                throw new Error('Empty error message');
            }
        }
    }
});

runner.test('Valid export data passes validation', async () => {
    const dataService = (await import('./js/data-service.js')).default;
    
    const validData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        data: {
            profile: { display_name: 'Test User', timezone: 'UTC' },
            annualGoals: [],
            readingList: [],
            monthlyData: null,
            weeklyGoals: [],
            timeBlocks: [],
            dailyEntries: null,
            dailyHabits: [],
            dailyHabitCompletions: [],
            weeklyHabits: [],
            weeklyHabitCompletions: [],
            moodEntries: [],
            sleepEntries: [],
            waterEntries: [],
            actionPlans: []
        }
    };
    
    const validation = dataService.validateImportData(validData);
    
    if (validation.valid !== true) {
        throw new Error(`Valid data failed validation: ${validation.errors.join(', ')}`);
    }
    if (validation.errors.length !== 0) {
        throw new Error('Valid data has error messages');
    }
});

runner.test('Null or undefined data is rejected', async () => {
    const dataService = (await import('./js/data-service.js')).default;
    
    const nullValidation = dataService.validateImportData(null);
    if (nullValidation.valid !== false) {
        throw new Error('Null data was not rejected');
    }
    if (nullValidation.errors.length === 0) {
        throw new Error('No errors for null data');
    }
    
    const undefinedValidation = dataService.validateImportData(undefined);
    if (undefinedValidation.valid !== false) {
        throw new Error('Undefined data was not rejected');
    }
    if (undefinedValidation.errors.length === 0) {
        throw new Error('No errors for undefined data');
    }
});

runner.test('Non-object data is rejected', async () => {
    const dataService = (await import('./js/data-service.js')).default;
    
    const stringValidation = dataService.validateImportData('invalid');
    if (stringValidation.valid !== false) {
        throw new Error('String data was not rejected');
    }
    
    const numberValidation = dataService.validateImportData(123);
    if (numberValidation.valid !== false) {
        throw new Error('Number data was not rejected');
    }
    
    const arrayValidation = dataService.validateImportData([]);
    if (arrayValidation.valid !== false) {
        throw new Error('Array data was not rejected');
    }
});

runner.test('Missing required fields are detected', async () => {
    const dataService = (await import('./js/data-service.js')).default;
    
    const missingAnnualGoals = {
        version: '1.0',
        data: {
            readingList: [],
            dailyHabits: [],
            weeklyHabits: [],
            actionPlans: []
        }
    };
    
    const validation = dataService.validateImportData(missingAnnualGoals);
    if (validation.valid !== false) {
        throw new Error('Missing annualGoals was not detected');
    }
    
    const hasAnnualGoalsError = validation.errors.some(e => e.includes('annualGoals'));
    if (!hasAnnualGoalsError) {
        throw new Error('Error message does not mention annualGoals');
    }
});

runner.test('Invalid field types are detected', async () => {
    const dataService = (await import('./js/data-service.js')).default;
    
    const invalidTypes = {
        version: '1.0',
        data: {
            annualGoals: 'not an array',
            readingList: [],
            dailyHabits: [],
            weeklyHabits: [],
            actionPlans: []
        }
    };
    
    const validation = dataService.validateImportData(invalidTypes);
    if (validation.valid !== false) {
        throw new Error('Invalid annualGoals type was not detected');
    }
    
    const hasTypeError = validation.errors.some(e => e.includes('annualGoals'));
    if (!hasTypeError) {
        throw new Error('Error message does not mention annualGoals type issue');
    }
});


// Test Suite: Error Handling Display
runner.test('Property 43: Error handling display - database errors show appropriate messages', async () => {
    const { ErrorHandler, ErrorCategory } = await import('./js/error-handler.js');
    
    // Test different types of database errors
    const databaseErrors = [
        { message: 'database connection failed', code: '' },
        { message: 'query execution failed', code: 'PGRST' },
        { message: 'insert operation failed', code: '' },
        { message: 'permission denied', code: '' },
        { message: 'record not found', code: '' },
        { message: 'duplicate key value', code: '23505' },
        { message: 'foreign key constraint', code: '23503' }
    ];
    
    for (const errorData of databaseErrors) {
        const error = new Error(errorData.message);
        if (errorData.code) {
            error.code = errorData.code;
        }
        
        const result = ErrorHandler.handle(error, 'Test Database Operation');
        
        // Assert error is categorized correctly
        expect(result.category).toBe(ErrorCategory.DATABASE);
        
        // Assert user message is provided
        if (!result.userMessage) {
            throw new Error('User message is missing');
        }
        if (result.userMessage.length === 0) {
            throw new Error('User message is empty');
        }
        
        // Assert user message is user-friendly (not technical)
        if (result.userMessage.includes('PGRST')) {
            throw new Error('User message contains technical code PGRST');
        }
        if (result.userMessage.includes('23505')) {
            throw new Error('User message contains technical code 23505');
        }
        if (result.userMessage.includes('23503')) {
            throw new Error('User message contains technical code 23503');
        }
        
        // Assert context is preserved
        expect(result.context).toBe('Test Database Operation');
        
        // Assert original error is preserved
        expect(result.originalError).toBe(error);
    }
});

runner.test('Authentication errors show appropriate user-friendly messages', async () => {
    const { ErrorHandler, ErrorCategory } = await import('./js/error-handler.js');
    
    const authErrors = [
        'Invalid credentials',
        'Authentication failed',
        'Session expired',
        'Token invalid',
        'Unauthorized access',
        'Email not confirmed',
        'User already registered'
    ];
    
    for (const errorMessage of authErrors) {
        const error = new Error(errorMessage);
        const result = ErrorHandler.handle(error, 'Authentication');
        
        // Assert error is categorized as auth
        expect(result.category).toBe(ErrorCategory.AUTH);
        
        // Assert user message is provided
        if (!result.userMessage) {
            throw new Error('User message is missing');
        }
        if (result.userMessage.length === 0) {
            throw new Error('User message is empty');
        }
        
        // Assert message is user-friendly
        if (result.userMessage.includes('undefined')) {
            throw new Error('User message contains "undefined"');
        }
        if (result.userMessage.includes('null')) {
            throw new Error('User message contains "null"');
        }
    }
});

runner.test('Network errors show appropriate user-friendly messages', async () => {
    const { ErrorHandler, ErrorCategory } = await import('./js/error-handler.js');
    
    const networkErrors = [
        'Network request failed',
        'Fetch error',
        'Connection timeout',
        'Network connection lost',
        'Request timeout'
    ];
    
    for (const errorMessage of networkErrors) {
        const error = new Error(errorMessage);
        const result = ErrorHandler.handle(error, 'Network Operation');
        
        // Assert error is categorized as network
        expect(result.category).toBe(ErrorCategory.NETWORK);
        
        // Assert user message is provided
        if (!result.userMessage) {
            throw new Error('User message is missing');
        }
        if (result.userMessage.length === 0) {
            throw new Error('User message is empty');
        }
        
        // Assert message mentions connection or network
        const lowerMessage = result.userMessage.toLowerCase();
        const hasNetworkTerms = lowerMessage.includes('connection') ||
                               lowerMessage.includes('network') ||
                               lowerMessage.includes('offline') ||
                               lowerMessage.includes('internet');
        
        if (!hasNetworkTerms) {
            throw new Error('Network error message does not mention connection/network/offline/internet');
        }
    }
});

runner.test('Validation errors show appropriate user-friendly messages', async () => {
    const { ErrorHandler, ErrorCategory } = await import('./js/error-handler.js');
    
    const validationErrors = [
        'Validation failed',
        'Invalid input',
        'Required field missing',
        'Value must be positive'
    ];
    
    for (const errorMessage of validationErrors) {
        const error = new Error(errorMessage);
        const result = ErrorHandler.handle(error, 'Form Validation');
        
        // Assert error is categorized as validation
        expect(result.category).toBe(ErrorCategory.VALIDATION);
        
        // Assert user message is provided
        if (!result.userMessage) {
            throw new Error('User message is missing');
        }
        if (result.userMessage.length === 0) {
            throw new Error('User message is empty');
        }
    }
});

runner.test('PostgreSQL unique constraint violation (23505) shows user-friendly message', async () => {
    const { ErrorHandler } = await import('./js/error-handler.js');
    
    const error = new Error('duplicate key value violates unique constraint');
    error.code = '23505';
    
    const result = ErrorHandler.handle(error, 'Create Record');
    
    expect(result.userMessage).toBe('This item already exists. Please use a different value.');
    if (result.userMessage.includes('23505')) {
        throw new Error('User message contains technical code 23505');
    }
    if (result.userMessage.includes('duplicate key')) {
        throw new Error('User message contains technical term "duplicate key"');
    }
});

runner.test('PostgreSQL foreign key violation (23503) shows user-friendly message', async () => {
    const { ErrorHandler } = await import('./js/error-handler.js');
    
    const error = new Error('foreign key constraint violation');
    error.code = '23503';
    
    const result = ErrorHandler.handle(error, 'Delete Record');
    
    expect(result.userMessage).toBe('Cannot complete operation due to related data.');
    if (result.userMessage.includes('23503')) {
        throw new Error('User message contains technical code 23503');
    }
    if (result.userMessage.includes('foreign key')) {
        throw new Error('User message contains technical term "foreign key"');
    }
});

runner.test('Session expired error provides appropriate message', async () => {
    const { ErrorHandler } = await import('./js/error-handler.js');
    
    const error = new Error('Session expired');
    const result = ErrorHandler.handleAuthError(error, 'Data Load');
    
    if (!result.userMessage.toLowerCase().includes('session')) {
        throw new Error('User message does not mention session');
    }
    if (!result.userMessage.toLowerCase().includes('sign in')) {
        throw new Error('User message does not mention sign in');
    }
});

runner.test('Null error is handled gracefully', async () => {
    const { ErrorHandler } = await import('./js/error-handler.js');
    
    const result = ErrorHandler.handle(null, 'Test Operation');
    
    if (!result.category) {
        throw new Error('Category is missing');
    }
    if (!result.userMessage) {
        throw new Error('User message is missing');
    }
    if (result.userMessage.length === 0) {
        throw new Error('User message is empty');
    }
});

runner.test('Undefined error is handled gracefully', async () => {
    const { ErrorHandler } = await import('./js/error-handler.js');
    
    const result = ErrorHandler.handle(undefined, 'Test Operation');
    
    if (!result.category) {
        throw new Error('Category is missing');
    }
    if (!result.userMessage) {
        throw new Error('User message is missing');
    }
    if (result.userMessage.length === 0) {
        throw new Error('User message is empty');
    }
});

runner.test('Error without message is handled gracefully', async () => {
    const { ErrorHandler } = await import('./js/error-handler.js');
    
    const error = new Error();
    const result = ErrorHandler.handle(error, 'Test Operation');
    
    if (!result.category) {
        throw new Error('Category is missing');
    }
    if (!result.userMessage) {
        throw new Error('User message is missing');
    }
    if (result.userMessage.length === 0) {
        throw new Error('User message is empty');
    }
});

runner.test('All error categories produce non-empty user messages', async () => {
    const { ErrorHandler, ErrorCategory } = await import('./js/error-handler.js');
    
    const errorTypes = [
        { message: 'auth failed', expectedCategory: ErrorCategory.AUTH },
        { message: 'network error', expectedCategory: ErrorCategory.NETWORK },
        { message: 'database error', expectedCategory: ErrorCategory.DATABASE },
        { message: 'validation failed', expectedCategory: ErrorCategory.VALIDATION },
        { message: 'unknown error', expectedCategory: ErrorCategory.GENERIC }
    ];
    
    for (const errorType of errorTypes) {
        const error = new Error(errorType.message);
        const result = ErrorHandler.handle(error, 'Test');
        
        expect(result.category).toBe(errorType.expectedCategory);
        
        if (typeof result.userMessage !== 'string') {
            throw new Error(`User message is not a string, got ${typeof result.userMessage}`);
        }
        if (result.userMessage.length === 0) {
            throw new Error('User message is empty');
        }
        if (result.userMessage.trim() !== result.userMessage) {
            throw new Error('User message has leading/trailing whitespace');
        }
    }
});
