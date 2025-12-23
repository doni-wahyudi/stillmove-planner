/**
 * Utility Functions Unit Tests
 * Tests for js/utils.js
 */

import {
    debounce,
    throttle,
    calculateGoalProgress,
    formatDate,
    getDaysInMonth,
    getCategoryColor,
    getCategoryGradient,
    calculateSleepDuration,
    calculateWaterIntakePercentage,
    calculateHabitProgress,
    getWeekDays,
    getTimeSlots,
    validateTimeBlockTime,
    calculateHabitProgressForDays,
    calculateMonthlyHabitProgress,
    calculateDailyCompletionPercentage,
    formatMonthYear,
    initializePomodoroTimer,
    completePomodoroSession,
    pausePomodoroTimer,
    resumePomodoroTimer,
    resetPomodoroTimer
} from '../js/utils.js';

describe('Utility Functions', () => {
    
    describe('calculateGoalProgress', () => {
        test('returns 0 for empty array', () => {
            expect(calculateGoalProgress([])).toBe(0);
        });

        test('returns 0 for null input', () => {
            expect(calculateGoalProgress(null)).toBe(0);
        });

        test('returns 0 for undefined input', () => {
            expect(calculateGoalProgress(undefined)).toBe(0);
        });

        test('returns 100 when all sub-goals completed', () => {
            const subGoals = [
                { text: 'Goal 1', completed: true },
                { text: 'Goal 2', completed: true },
                { text: 'Goal 3', completed: true }
            ];
            expect(calculateGoalProgress(subGoals)).toBe(100);
        });

        test('returns 0 when no sub-goals completed', () => {
            const subGoals = [
                { text: 'Goal 1', completed: false },
                { text: 'Goal 2', completed: false }
            ];
            expect(calculateGoalProgress(subGoals)).toBe(0);
        });

        test('returns correct percentage for partial completion', () => {
            const subGoals = [
                { text: 'Goal 1', completed: true },
                { text: 'Goal 2', completed: false },
                { text: 'Goal 3', completed: true },
                { text: 'Goal 4', completed: false }
            ];
            expect(calculateGoalProgress(subGoals)).toBe(50);
        });

        test('handles single sub-goal', () => {
            expect(calculateGoalProgress([{ text: 'Goal', completed: true }])).toBe(100);
            expect(calculateGoalProgress([{ text: 'Goal', completed: false }])).toBe(0);
        });
    });

    describe('formatDate', () => {
        test('formats date correctly', () => {
            const date = new Date(2024, 0, 15); // January 15, 2024
            expect(formatDate(date)).toBe('2024-01-15');
        });

        test('pads single digit month and day', () => {
            const date = new Date(2024, 0, 5); // January 5, 2024
            expect(formatDate(date)).toBe('2024-01-05');
        });

        test('handles December correctly', () => {
            const date = new Date(2024, 11, 31); // December 31, 2024
            expect(formatDate(date)).toBe('2024-12-31');
        });
    });

    describe('getDaysInMonth', () => {
        test('returns 31 for January', () => {
            expect(getDaysInMonth(2024, 1)).toBe(31);
        });

        test('returns 28 for February in non-leap year', () => {
            expect(getDaysInMonth(2023, 2)).toBe(28);
        });

        test('returns 29 for February in leap year', () => {
            expect(getDaysInMonth(2024, 2)).toBe(29);
        });

        test('returns 30 for April', () => {
            expect(getDaysInMonth(2024, 4)).toBe(30);
        });

        test('returns 31 for December', () => {
            expect(getDaysInMonth(2024, 12)).toBe(31);
        });
    });

    describe('getCategoryColor', () => {
        test('returns correct color for Personal', () => {
            expect(getCategoryColor('Personal')).toBe('#f093fb');
        });

        test('returns correct color for Work', () => {
            expect(getCategoryColor('Work')).toBe('#4facfe');
        });

        test('returns correct color for Business', () => {
            expect(getCategoryColor('Business')).toBe('#fa709a');
        });

        test('returns default gray for unknown category', () => {
            expect(getCategoryColor('Unknown')).toBe('#999999');
        });

        test('returns default gray for empty string', () => {
            expect(getCategoryColor('')).toBe('#999999');
        });
    });

    describe('getCategoryGradient', () => {
        test('returns gradient for Personal', () => {
            const gradient = getCategoryGradient('Personal');
            expect(gradient).toContain('linear-gradient');
            expect(gradient).toContain('#f093fb');
        });

        test('returns default gradient for unknown category', () => {
            const gradient = getCategoryGradient('Unknown');
            expect(gradient).toContain('#999999');
        });
    });

    describe('calculateSleepDuration', () => {
        test('calculates same-day sleep correctly', () => {
            expect(calculateSleepDuration('22:00', '06:00')).toBe(8);
        });

        test('calculates overnight sleep correctly', () => {
            expect(calculateSleepDuration('23:30', '07:30')).toBe(8);
        });

        test('handles midnight bedtime', () => {
            expect(calculateSleepDuration('00:00', '08:00')).toBe(8);
        });

        test('handles short sleep duration', () => {
            expect(calculateSleepDuration('02:00', '06:00')).toBe(4);
        });

        test('rounds to one decimal place', () => {
            expect(calculateSleepDuration('22:30', '06:00')).toBe(7.5);
        });
    });

    describe('calculateWaterIntakePercentage', () => {
        test('returns 100 when goal met', () => {
            expect(calculateWaterIntakePercentage(8, 8)).toBe(100);
        });

        test('returns 50 for half goal', () => {
            expect(calculateWaterIntakePercentage(4, 8)).toBe(50);
        });

        test('returns 0 for zero glasses', () => {
            expect(calculateWaterIntakePercentage(0, 8)).toBe(0);
        });

        test('returns 0 for zero goal', () => {
            expect(calculateWaterIntakePercentage(5, 0)).toBe(0);
        });

        test('can exceed 100%', () => {
            expect(calculateWaterIntakePercentage(10, 8)).toBe(125);
        });
    });

    describe('calculateHabitProgress', () => {
        test('returns 0 for empty completions', () => {
            expect(calculateHabitProgress([], 7)).toBe(0);
        });

        test('returns 100 for all days completed', () => {
            const completions = Array(7).fill({ completed: true });
            expect(calculateHabitProgress(completions, 7)).toBe(100);
        });

        test('returns correct percentage for partial completion', () => {
            const completions = [
                { completed: true },
                { completed: true },
                { completed: false },
                { completed: true },
                { completed: false },
                { completed: false },
                { completed: true }
            ];
            expect(calculateHabitProgress(completions, 7)).toBeCloseTo(57.14, 1);
        });
    });

    describe('getWeekDays', () => {
        test('returns 7 consecutive days', () => {
            const weekStart = new Date(2024, 0, 7); // Sunday, Jan 7, 2024
            const days = getWeekDays(weekStart);
            
            expect(days.length).toBe(7);
        });

        test('first day matches week start', () => {
            const weekStart = new Date(2024, 0, 7);
            const days = getWeekDays(weekStart);
            
            expect(days[0].getDate()).toBe(7);
        });

        test('last day is 6 days after start', () => {
            const weekStart = new Date(2024, 0, 7);
            const days = getWeekDays(weekStart);
            
            expect(days[6].getDate()).toBe(13);
        });
    });

    describe('getTimeSlots', () => {
        test('returns 38 time slots', () => {
            const slots = getTimeSlots();
            expect(slots.length).toBe(38);
        });

        test('first slot starts at 4:00', () => {
            const slots = getTimeSlots();
            expect(slots[0].hour).toBe(4);
            expect(slots[0].minute).toBe(0);
        });

        test('last slot is at 22:30', () => {
            const slots = getTimeSlots();
            const lastSlot = slots[slots.length - 1];
            expect(lastSlot.hour).toBe(22);
            expect(lastSlot.minute).toBe(30);
        });

        test('all slots are in 30-minute increments', () => {
            const slots = getTimeSlots();
            slots.forEach(slot => {
                expect([0, 30]).toContain(slot.minute);
            });
        });
    });

    describe('validateTimeBlockTime', () => {
        test('returns true for valid time 09:00', () => {
            expect(validateTimeBlockTime('09:00')).toBe(true);
        });

        test('returns true for valid time 09:30', () => {
            expect(validateTimeBlockTime('09:30')).toBe(true);
        });

        test('returns true for boundary time 04:00', () => {
            expect(validateTimeBlockTime('04:00')).toBe(true);
        });

        test('returns true for boundary time 23:00', () => {
            expect(validateTimeBlockTime('23:00')).toBe(true);
        });

        test('returns false for time before 04:00', () => {
            expect(validateTimeBlockTime('03:00')).toBe(false);
        });

        test('returns false for 23:30 (outside range)', () => {
            expect(validateTimeBlockTime('23:30')).toBe(false);
        });

        test('returns false for non-30-minute increment', () => {
            expect(validateTimeBlockTime('09:15')).toBe(false);
            expect(validateTimeBlockTime('09:45')).toBe(false);
        });

        test('returns false for null input', () => {
            expect(validateTimeBlockTime(null)).toBe(false);
        });

        test('returns false for invalid format', () => {
            expect(validateTimeBlockTime('9:00')).toBe(false);
            expect(validateTimeBlockTime('invalid')).toBe(false);
        });
    });

    describe('calculateHabitProgressForDays', () => {
        test('returns 0 for empty completions', () => {
            expect(calculateHabitProgressForDays([], 7)).toBe(0);
        });

        test('returns 100 for 7/7 days completed', () => {
            const completions = Array(7).fill({ completed: true });
            expect(calculateHabitProgressForDays(completions, 7)).toBe(100);
        });

        test('returns 50 for 7/14 days completed', () => {
            const completions = Array(7).fill({ completed: true });
            expect(calculateHabitProgressForDays(completions, 14)).toBe(50);
        });

        test('handles 21-day period', () => {
            const completions = Array(14).fill({ completed: true });
            expect(calculateHabitProgressForDays(completions, 21)).toBeCloseTo(66.67, 1);
        });

        test('handles 28-day period', () => {
            const completions = Array(21).fill({ completed: true });
            expect(calculateHabitProgressForDays(completions, 28)).toBe(75);
        });
    });

    describe('calculateMonthlyHabitProgress', () => {
        test('returns 0 for empty completions', () => {
            expect(calculateMonthlyHabitProgress([], 31)).toBe(0);
        });

        test('returns 100 for all days completed', () => {
            const completions = Array(31).fill({ completed: true });
            expect(calculateMonthlyHabitProgress(completions, 31)).toBe(100);
        });

        test('handles February (28 days)', () => {
            const completions = Array(14).fill({ completed: true });
            expect(calculateMonthlyHabitProgress(completions, 28)).toBe(50);
        });

        test('handles leap year February (29 days)', () => {
            const completions = Array(29).fill({ completed: true });
            expect(calculateMonthlyHabitProgress(completions, 29)).toBe(100);
        });
    });

    describe('calculateDailyCompletionPercentage', () => {
        test('returns 0 for no habits', () => {
            expect(calculateDailyCompletionPercentage([], 0)).toBe(0);
        });

        test('returns 100 when all habits completed', () => {
            const completions = [
                { completed: true },
                { completed: true },
                { completed: true }
            ];
            expect(calculateDailyCompletionPercentage(completions, 3)).toBe(100);
        });

        test('returns 0 when no habits completed', () => {
            const completions = [
                { completed: false },
                { completed: false }
            ];
            expect(calculateDailyCompletionPercentage(completions, 2)).toBe(0);
        });

        test('returns correct percentage for partial completion', () => {
            const completions = [
                { completed: true },
                { completed: false },
                { completed: true }
            ];
            expect(calculateDailyCompletionPercentage(completions, 3)).toBeCloseTo(66.67, 1);
        });
    });

    describe('formatMonthYear', () => {
        test('formats January 2024 correctly', () => {
            expect(formatMonthYear(2024, 1)).toBe('January 2024');
        });

        test('formats December 2024 correctly', () => {
            expect(formatMonthYear(2024, 12)).toBe('December 2024');
        });

        test('formats June 2025 correctly', () => {
            expect(formatMonthYear(2025, 6)).toBe('June 2025');
        });
    });

    describe('Pomodoro Timer Functions', () => {
        
        describe('initializePomodoroTimer', () => {
            test('returns initial state with 25 minutes', () => {
                const timer = initializePomodoroTimer();
                
                expect(timer.mode).toBe('focus');
                expect(timer.timeRemaining).toBe(1500); // 25 minutes
                expect(timer.sessionCount).toBe(0);
                expect(timer.isRunning).toBe(false);
                expect(timer.isPaused).toBe(false);
            });
        });

        describe('completePomodoroSession', () => {
            test('transitions from focus to short break', () => {
                const timer = { mode: 'focus', sessionCount: 0 };
                const result = completePomodoroSession(timer);
                
                expect(result.mode).toBe('shortBreak');
                expect(result.timeRemaining).toBe(300); // 5 minutes
                expect(result.sessionCount).toBe(1);
            });

            test('transitions to long break after 4 sessions', () => {
                const timer = { mode: 'focus', sessionCount: 3 };
                const result = completePomodoroSession(timer);
                
                expect(result.mode).toBe('longBreak');
                expect(result.timeRemaining).toBe(900); // 15 minutes
                expect(result.sessionCount).toBe(4);
            });

            test('transitions from break back to focus', () => {
                const timer = { mode: 'shortBreak', sessionCount: 2 };
                const result = completePomodoroSession(timer);
                
                expect(result.mode).toBe('focus');
                expect(result.timeRemaining).toBe(1500); // 25 minutes
                expect(result.isRunning).toBe(false);
            });

            test('preserves session count after break', () => {
                const timer = { mode: 'longBreak', sessionCount: 4 };
                const result = completePomodoroSession(timer);
                
                expect(result.sessionCount).toBe(4);
            });
        });

        describe('pausePomodoroTimer', () => {
            test('sets isPaused to true', () => {
                const timer = { 
                    mode: 'focus', 
                    timeRemaining: 1200, 
                    isRunning: true, 
                    isPaused: false 
                };
                const result = pausePomodoroTimer(timer);
                
                expect(result.isPaused).toBe(true);
                expect(result.isRunning).toBe(true);
                expect(result.timeRemaining).toBe(1200);
            });

            test('preserves time remaining', () => {
                const timer = { timeRemaining: 750, isRunning: true, isPaused: false };
                const result = pausePomodoroTimer(timer);
                
                expect(result.timeRemaining).toBe(750);
            });
        });

        describe('resumePomodoroTimer', () => {
            test('sets isPaused to false', () => {
                const timer = { 
                    mode: 'focus', 
                    timeRemaining: 1200, 
                    isRunning: true, 
                    isPaused: true 
                };
                const result = resumePomodoroTimer(timer);
                
                expect(result.isPaused).toBe(false);
                expect(result.isRunning).toBe(true);
            });

            test('preserves time remaining', () => {
                const timer = { timeRemaining: 750, isPaused: true };
                const result = resumePomodoroTimer(timer);
                
                expect(result.timeRemaining).toBe(750);
            });
        });

        describe('resetPomodoroTimer', () => {
            test('resets to focus mode with 25 minutes', () => {
                const timer = { 
                    mode: 'shortBreak', 
                    timeRemaining: 100, 
                    sessionCount: 3,
                    isRunning: true,
                    isPaused: false
                };
                const result = resetPomodoroTimer(timer);
                
                expect(result.mode).toBe('focus');
                expect(result.timeRemaining).toBe(1500);
                expect(result.isRunning).toBe(false);
                expect(result.isPaused).toBe(false);
            });

            test('preserves session count', () => {
                const timer = { sessionCount: 5 };
                const result = resetPomodoroTimer(timer);
                
                expect(result.sessionCount).toBe(5);
            });
        });
    });

    describe('debounce', () => {
        jest.useFakeTimers();

        test('delays function execution', () => {
            const func = jest.fn();
            const debouncedFunc = debounce(func, 300);
            
            debouncedFunc();
            expect(func).not.toHaveBeenCalled();
            
            jest.advanceTimersByTime(300);
            expect(func).toHaveBeenCalledTimes(1);
        });

        test('only calls function once for rapid calls', () => {
            const func = jest.fn();
            const debouncedFunc = debounce(func, 300);
            
            debouncedFunc();
            debouncedFunc();
            debouncedFunc();
            
            jest.advanceTimersByTime(300);
            expect(func).toHaveBeenCalledTimes(1);
        });

        test('passes arguments to function', () => {
            const func = jest.fn();
            const debouncedFunc = debounce(func, 300);
            
            debouncedFunc('arg1', 'arg2');
            jest.advanceTimersByTime(300);
            
            expect(func).toHaveBeenCalledWith('arg1', 'arg2');
        });
    });

    describe('throttle', () => {
        test('calls function immediately on first call', () => {
            const func = jest.fn();
            const throttledFunc = throttle(func, 100);
            
            throttledFunc();
            expect(func).toHaveBeenCalledTimes(1);
        });

        test('prevents calls within wait period', () => {
            const func = jest.fn();
            const throttledFunc = throttle(func, 1000);
            
            throttledFunc();
            throttledFunc();
            throttledFunc();
            
            expect(func).toHaveBeenCalledTimes(1);
        });
    });
});
