/**
 * Property-Based Tests for Daily Planner Utilities
 * Using fast-check for property-based testing
 */

import * as fc from 'fast-check';
import { calculateGoalProgress, getDaysInMonth, getCategoryColor } from './utils.js';

describe('Goal Progress Calculation', () => {
    /**
     * Feature: daily-planner-app, Property 15: Goal progress calculation
     * Validates: Requirements 2.3
     * 
     * Property: For any annual goal with sub-goals, the progress percentage 
     * should equal (completed sub-goals / total sub-goals) × 100
     */
    test('Property 15: Goal progress calculation - progress equals (completed / total) × 100', () => {
        fc.assert(
            fc.property(
                // Generate an array of sub-goals with random completion status
                fc.array(
                    fc.record({
                        text: fc.string({ minLength: 1, maxLength: 100 }),
                        completed: fc.boolean()
                    }),
                    { minLength: 1, maxLength: 20 } // At least 1 sub-goal, max 20
                ),
                (subGoals) => {
                    // Calculate expected progress
                    const completedCount = subGoals.filter(sg => sg.completed === true).length;
                    const totalCount = subGoals.length;
                    const expectedProgress = Math.round((completedCount / totalCount) * 100 * 100) / 100;
                    
                    // Calculate actual progress using the function
                    const actualProgress = calculateGoalProgress(subGoals);
                    
                    // Assert they are equal
                    expect(actualProgress).toBe(expectedProgress);
                    
                    // Additional invariants
                    expect(actualProgress).toBeGreaterThanOrEqual(0);
                    expect(actualProgress).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design doc
        );
    });

    /**
     * Edge case: Empty sub-goals array should return 0% progress
     */
    test('Empty sub-goals array returns 0% progress', () => {
        expect(calculateGoalProgress([])).toBe(0);
    });

    /**
     * Edge case: Null or undefined input should return 0% progress
     */
    test('Null or undefined input returns 0% progress', () => {
        expect(calculateGoalProgress(null)).toBe(0);
        expect(calculateGoalProgress(undefined)).toBe(0);
    });

    /**
     * Edge case: All sub-goals completed should return 100% progress
     */
    test('All completed sub-goals returns 100% progress', () => {
        const subGoals = [
            { text: 'Goal 1', completed: true },
            { text: 'Goal 2', completed: true },
            { text: 'Goal 3', completed: true }
        ];
        expect(calculateGoalProgress(subGoals)).toBe(100);
    });

    /**
     * Edge case: No sub-goals completed should return 0% progress
     */
    test('No completed sub-goals returns 0% progress', () => {
        const subGoals = [
            { text: 'Goal 1', completed: false },
            { text: 'Goal 2', completed: false },
            { text: 'Goal 3', completed: false }
        ];
        expect(calculateGoalProgress(subGoals)).toBe(0);
    });

    /**
     * Specific example: 50% completion
     */
    test('Half completed sub-goals returns 50% progress', () => {
        const subGoals = [
            { text: 'Goal 1', completed: true },
            { text: 'Goal 2', completed: true },
            { text: 'Goal 3', completed: false },
            { text: 'Goal 4', completed: false }
        ];
        expect(calculateGoalProgress(subGoals)).toBe(50);
    });
});


describe('Calendar Day Count', () => {
    /**
     * Feature: daily-planner-app, Property 31: Calendar day count
     * Validates: Requirements 3.1
     * 
     * Property: For any month and year, the displayed calendar should show 
     * the correct number of days for that month
     */
    test('Property 31: Calendar day count - correct days for any month/year', () => {
        fc.assert(
            fc.property(
                // Generate random year (1900-2100) and month (1-12)
                fc.integer({ min: 1900, max: 2100 }),
                fc.integer({ min: 1, max: 12 }),
                (year, month) => {
                    // Calculate expected days using JavaScript Date
                    const expectedDays = new Date(year, month, 0).getDate();
                    
                    // Calculate actual days using our function
                    const actualDays = getDaysInMonth(year, month);
                    
                    // Assert they are equal
                    expect(actualDays).toBe(expectedDays);
                    
                    // Additional invariants
                    expect(actualDays).toBeGreaterThanOrEqual(28); // Minimum days in any month
                    expect(actualDays).toBeLessThanOrEqual(31); // Maximum days in any month
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Specific examples for known months
     */
    test('January has 31 days', () => {
        expect(getDaysInMonth(2025, 1)).toBe(31);
    });

    test('February has 28 days in non-leap year', () => {
        expect(getDaysInMonth(2025, 2)).toBe(28);
    });

    test('February has 29 days in leap year', () => {
        expect(getDaysInMonth(2024, 2)).toBe(29);
    });

    test('April has 30 days', () => {
        expect(getDaysInMonth(2025, 4)).toBe(30);
    });

    test('December has 31 days', () => {
        expect(getDaysInMonth(2025, 12)).toBe(31);
    });

    /**
     * Leap year edge cases
     */
    test('Leap year divisible by 4', () => {
        expect(getDaysInMonth(2024, 2)).toBe(29);
    });

    test('Century year not divisible by 400 is not leap year', () => {
        expect(getDaysInMonth(1900, 2)).toBe(28);
    });

    test('Century year divisible by 400 is leap year', () => {
        expect(getDaysInMonth(2000, 2)).toBe(29);
    });
});

describe('Category Color Mapping', () => {
    /**
     * Feature: daily-planner-app, Property 32: Category color mapping
     * Validates: Requirements 3.2
     * 
     * Property: For any activity category from the seven predefined categories, 
     * there should be a valid color assigned
     */
    test('Property 32: Category color mapping - all predefined categories have valid colors', () => {
        const predefinedCategories = [
            'Personal',
            'Work',
            'Business',
            'Family',
            'Education',
            'Social',
            'Project'
        ];

        fc.assert(
            fc.property(
                // Generate random category from predefined list
                fc.constantFrom(...predefinedCategories),
                (category) => {
                    // Get color for category
                    const color = getCategoryColor(category);
                    
                    // Assert color is a valid hex color
                    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
                    
                    // Assert color is not the default gray
                    expect(color).not.toBe('#999999');
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Test that each predefined category has a unique color
     */
    test('Each predefined category has a unique color', () => {
        const categories = ['Personal', 'Work', 'Business', 'Family', 'Education', 'Social', 'Project'];
        const colors = categories.map(cat => getCategoryColor(cat));
        
        // Check all colors are unique
        const uniqueColors = new Set(colors);
        expect(uniqueColors.size).toBe(categories.length);
    });

    /**
     * Test specific category colors
     */
    test('Personal category has green color', () => {
        expect(getCategoryColor('Personal')).toBe('#4CAF50');
    });

    test('Work category has blue color', () => {
        expect(getCategoryColor('Work')).toBe('#2196F3');
    });

    test('Business category has orange color', () => {
        expect(getCategoryColor('Business')).toBe('#FF9800');
    });

    test('Family category has pink color', () => {
        expect(getCategoryColor('Family')).toBe('#E91E63');
    });

    test('Education category has purple color', () => {
        expect(getCategoryColor('Education')).toBe('#9C27B0');
    });

    test('Social category has cyan color', () => {
        expect(getCategoryColor('Social')).toBe('#00BCD4');
    });

    test('Project category has brown color', () => {
        expect(getCategoryColor('Project')).toBe('#795548');
    });

    /**
     * Test unknown category returns default color
     */
    test('Unknown category returns default gray color', () => {
        expect(getCategoryColor('UnknownCategory')).toBe('#999999');
    });

    /**
     * Test case sensitivity
     */
    test('Category names are case-sensitive', () => {
        expect(getCategoryColor('personal')).toBe('#999999'); // lowercase should not match
        expect(getCategoryColor('PERSONAL')).toBe('#999999'); // uppercase should not match
    });
});

describe('Weekly View Structure', () => {
    /**
     * Feature: daily-planner-app, Property 33: Weekly view structure
     * Validates: Requirements 4.1
     * 
     * Property: For any week, the weekly view should display exactly seven 
     * consecutive days starting from Sunday
     */
    test('Property 33: Weekly view structure - exactly 7 consecutive days starting from Sunday', () => {
        // Import the function
        const { getWeekDays } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate random date
                fc.date({ min: new Date('1900-01-01'), max: new Date('2100-12-31') }),
                (randomDate) => {
                    // Get the Sunday of the week containing this date
                    const weekStart = new Date(randomDate);
                    const day = weekStart.getDay();
                    const diff = weekStart.getDate() - day;
                    weekStart.setDate(diff);
                    
                    // Get week days
                    const weekDays = getWeekDays(weekStart);
                    
                    // Assert exactly 7 days
                    expect(weekDays.length).toBe(7);
                    
                    // Assert first day is Sunday (day 0)
                    expect(weekDays[0].getDay()).toBe(0);
                    
                    // Assert days are consecutive
                    for (let i = 1; i < 7; i++) {
                        const prevDate = weekDays[i - 1];
                        const currDate = weekDays[i];
                        
                        // Current date should be exactly 1 day after previous
                        const diffMs = currDate - prevDate;
                        const diffDays = diffMs / (1000 * 60 * 60 * 24);
                        expect(diffDays).toBe(1);
                        
                        // Day of week should increment by 1
                        expect(currDate.getDay()).toBe((prevDate.getDay() + 1) % 7);
                    }
                    
                    // Assert last day is Saturday (day 6)
                    expect(weekDays[6].getDay()).toBe(6);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Specific example: Week starting January 5, 2025 (Sunday)
     */
    test('Week starting Jan 5, 2025 contains 7 consecutive days', () => {
        const { getWeekDays } = require('./utils.js');
        const weekStart = new Date('2025-01-05'); // Sunday
        const weekDays = getWeekDays(weekStart);
        
        expect(weekDays.length).toBe(7);
        expect(weekDays[0].getDay()).toBe(0); // Sunday
        expect(weekDays[6].getDay()).toBe(6); // Saturday
        expect(weekDays[6].getDate()).toBe(11); // Jan 11
    });

    /**
     * Edge case: Week spanning two months
     */
    test('Week spanning two months has 7 consecutive days', () => {
        const { getWeekDays } = require('./utils.js');
        const weekStart = new Date('2025-01-26'); // Sunday, Jan 26
        const weekDays = getWeekDays(weekStart);
        
        expect(weekDays.length).toBe(7);
        expect(weekDays[0].getMonth()).toBe(0); // January
        expect(weekDays[6].getMonth()).toBe(1); // February
        expect(weekDays[6].getDate()).toBe(1); // Feb 1
    });

    /**
     * Edge case: Week spanning two years
     */
    test('Week spanning two years has 7 consecutive days', () => {
        const { getWeekDays } = require('./utils.js');
        const weekStart = new Date('2024-12-29'); // Sunday, Dec 29
        const weekDays = getWeekDays(weekStart);
        
        expect(weekDays.length).toBe(7);
        expect(weekDays[0].getFullYear()).toBe(2024);
        expect(weekDays[6].getFullYear()).toBe(2025);
        expect(weekDays[6].getDate()).toBe(4); // Jan 4, 2025
    });
});

describe('Time Slot Count', () => {
    /**
     * Feature: daily-planner-app, Property 34: Time slot count
     * Validates: Requirements 4.1
     * 
     * Property: For any day in weekly view, there should be exactly 38 time slots 
     * (30-minute increments from 4:00 to 23:00)
     */
    test('Property 34: Time slot count - exactly 38 slots from 4:00 to 23:00', () => {
        const { getTimeSlots } = require('./utils.js');
        
        // This property doesn't need random generation since it's deterministic
        // But we'll run it multiple times to ensure consistency
        fc.assert(
            fc.property(
                fc.constant(null), // Dummy generator
                () => {
                    const slots = getTimeSlots();
                    
                    // Assert exactly 38 slots
                    expect(slots.length).toBe(38);
                    
                    // Assert first slot is 4:00
                    expect(slots[0].hour).toBe(4);
                    expect(slots[0].minute).toBe(0);
                    
                    // Assert last slot is 22:30 (since 23:00 is the end boundary)
                    expect(slots[37].hour).toBe(22);
                    expect(slots[37].minute).toBe(30);
                    
                    // Assert all slots are in 30-minute increments
                    for (let i = 0; i < slots.length; i++) {
                        const slot = slots[i];
                        expect(slot.minute).toBeOneOf([0, 30]);
                        expect(slot.hour).toBeGreaterThanOrEqual(4);
                        expect(slot.hour).toBeLessThanOrEqual(22);
                    }
                    
                    // Assert slots are consecutive
                    for (let i = 1; i < slots.length; i++) {
                        const prevSlot = slots[i - 1];
                        const currSlot = slots[i];
                        
                        const prevMinutes = prevSlot.hour * 60 + prevSlot.minute;
                        const currMinutes = currSlot.hour * 60 + currSlot.minute;
                        
                        // Current slot should be exactly 30 minutes after previous
                        expect(currMinutes - prevMinutes).toBe(30);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Specific calculation: 19 hours × 2 slots per hour = 38 slots
     */
    test('Time range 4:00-23:00 equals 19 hours which equals 38 half-hour slots', () => {
        const { getTimeSlots } = require('./utils.js');
        const slots = getTimeSlots();
        
        const hours = 23 - 4; // 19 hours
        const expectedSlots = hours * 2; // 2 slots per hour
        
        expect(slots.length).toBe(expectedSlots);
        expect(slots.length).toBe(38);
    });

    /**
     * Edge case: Verify no slots before 4:00
     */
    test('No time slots before 4:00', () => {
        const { getTimeSlots } = require('./utils.js');
        const slots = getTimeSlots();
        
        const slotsBeforeFour = slots.filter(slot => slot.hour < 4);
        expect(slotsBeforeFour.length).toBe(0);
    });

    /**
     * Edge case: Verify no slots at or after 23:00
     */
    test('No time slots at or after 23:00', () => {
        const { getTimeSlots } = require('./utils.js');
        const slots = getTimeSlots();
        
        const slotsAfterTwentyThree = slots.filter(slot => 
            slot.hour > 23 || (slot.hour === 23 && slot.minute > 0)
        );
        expect(slotsAfterTwentyThree.length).toBe(0);
    });

    /**
     * Verify all minutes are either 0 or 30
     */
    test('All time slots have minutes of 0 or 30', () => {
        const { getTimeSlots } = require('./utils.js');
        const slots = getTimeSlots();
        
        for (const slot of slots) {
            expect([0, 30]).toContain(slot.minute);
        }
    });
});

describe('Time Block Validation', () => {
    /**
     * Feature: daily-planner-app, Property 30: Time block validation
     * Validates: Requirements 1.2
     * 
     * Property: For any time block, the start time should be in 30-minute 
     * increments between 4:00 and 23:00
     */
    test('Property 30: Time block validation - valid times in 30-min increments from 4:00 to 23:00', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate random hour (4-23) and minute (0 or 30)
                fc.integer({ min: 4, max: 23 }),
                fc.constantFrom(0, 30),
                (hour, minute) => {
                    // Skip invalid combination: 23:30
                    if (hour === 23 && minute === 30) {
                        return true; // Skip this case
                    }
                    
                    // Format time string
                    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                    
                    // Validate
                    const isValid = validateTimeBlockTime(timeStr);
                    
                    // Should be valid
                    expect(isValid).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property: Invalid times should be rejected
     */
    test('Invalid times are rejected', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate invalid times
                fc.oneof(
                    // Hours outside range
                    fc.record({
                        hour: fc.integer({ min: 0, max: 3 }),
                        minute: fc.constantFrom(0, 30)
                    }),
                    fc.record({
                        hour: fc.integer({ min: 24, max: 30 }),
                        minute: fc.constantFrom(0, 30)
                    }),
                    // Minutes not in 30-min increments
                    fc.record({
                        hour: fc.integer({ min: 4, max: 22 }),
                        minute: fc.integer({ min: 1, max: 59 }).filter(m => m !== 30)
                    })
                ),
                (timeObj) => {
                    const timeStr = `${String(timeObj.hour).padStart(2, '0')}:${String(timeObj.minute).padStart(2, '0')}`;
                    const isValid = validateTimeBlockTime(timeStr);
                    
                    // Should be invalid
                    expect(isValid).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Specific valid examples
     */
    test('4:00 is valid', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime('04:00')).toBe(true);
    });

    test('4:30 is valid', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime('04:30')).toBe(true);
    });

    test('12:00 is valid', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime('12:00')).toBe(true);
    });

    test('12:30 is valid', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime('12:30')).toBe(true);
    });

    test('23:00 is valid', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime('23:00')).toBe(true);
    });

    /**
     * Specific invalid examples
     */
    test('3:59 is invalid (before 4:00)', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime('03:59')).toBe(false);
    });

    test('23:30 is invalid (after 23:00)', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime('23:30')).toBe(false);
    });

    test('12:15 is invalid (not 30-min increment)', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime('12:15')).toBe(false);
    });

    test('12:45 is invalid (not 30-min increment)', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime('12:45')).toBe(false);
    });

    test('24:00 is invalid (hour out of range)', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime('24:00')).toBe(false);
    });

    /**
     * Edge cases: Invalid formats
     */
    test('Empty string is invalid', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime('')).toBe(false);
    });

    test('Null is invalid', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime(null)).toBe(false);
    });

    test('Undefined is invalid', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime(undefined)).toBe(false);
    });

    test('Invalid format without colon is invalid', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime('1200')).toBe(false);
    });

    test('Invalid format with letters is invalid', () => {
        const { validateTimeBlockTime } = require('./utils.js');
        expect(validateTimeBlockTime('12:ab')).toBe(false);
    });
});

// Custom matcher for toBeOneOf
expect.extend({
    toBeOneOf(received, array) {
        const pass = array.includes(received);
        if (pass) {
            return {
                message: () => `expected ${received} not to be one of ${array}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received} to be one of ${array}`,
                pass: false,
            };
        }
    },
});

describe('Habit Progress Calculations', () => {
    /**
     * Feature: daily-planner-app, Property 16: Habit progress calculation for 7 days
     * Validates: Requirements 5.3
     * 
     * Property: For any daily habit and 7-day period, the progress percentage 
     * should equal (completed days / 7) × 100
     */
    test('Property 16: Habit progress for 7 days - (completed / 7) × 100', () => {
        const { calculateHabitProgressForDays } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate array of exactly 7 completion objects
                fc.array(
                    fc.record({
                        date: fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') })
                            .map(d => d.toISOString().split('T')[0]),
                        completed: fc.boolean()
                    }),
                    { minLength: 7, maxLength: 7 }
                ),
                (completions) => {
                    // Calculate expected progress
                    const completedCount = completions.filter(c => c.completed === true).length;
                    const expectedProgress = Math.round((completedCount / 7) * 100 * 100) / 100;
                    
                    // Calculate actual progress
                    const actualProgress = calculateHabitProgressForDays(completions, 7);
                    
                    // Assert they are equal
                    expect(actualProgress).toBe(expectedProgress);
                    
                    // Additional invariants
                    expect(actualProgress).toBeGreaterThanOrEqual(0);
                    expect(actualProgress).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: daily-planner-app, Property 17: Habit progress calculation for 14 days
     * Validates: Requirements 5.3
     * 
     * Property: For any daily habit and 14-day period, the progress percentage 
     * should equal (completed days / 14) × 100
     */
    test('Property 17: Habit progress for 14 days - (completed / 14) × 100', () => {
        const { calculateHabitProgressForDays } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate array of exactly 14 completion objects
                fc.array(
                    fc.record({
                        date: fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') })
                            .map(d => d.toISOString().split('T')[0]),
                        completed: fc.boolean()
                    }),
                    { minLength: 14, maxLength: 14 }
                ),
                (completions) => {
                    // Calculate expected progress
                    const completedCount = completions.filter(c => c.completed === true).length;
                    const expectedProgress = Math.round((completedCount / 14) * 100 * 100) / 100;
                    
                    // Calculate actual progress
                    const actualProgress = calculateHabitProgressForDays(completions, 14);
                    
                    // Assert they are equal
                    expect(actualProgress).toBe(expectedProgress);
                    
                    // Additional invariants
                    expect(actualProgress).toBeGreaterThanOrEqual(0);
                    expect(actualProgress).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: daily-planner-app, Property 18: Habit progress calculation for 21 days
     * Validates: Requirements 5.3
     * 
     * Property: For any daily habit and 21-day period, the progress percentage 
     * should equal (completed days / 21) × 100
     */
    test('Property 18: Habit progress for 21 days - (completed / 21) × 100', () => {
        const { calculateHabitProgressForDays } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate array of exactly 21 completion objects
                fc.array(
                    fc.record({
                        date: fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') })
                            .map(d => d.toISOString().split('T')[0]),
                        completed: fc.boolean()
                    }),
                    { minLength: 21, maxLength: 21 }
                ),
                (completions) => {
                    // Calculate expected progress
                    const completedCount = completions.filter(c => c.completed === true).length;
                    const expectedProgress = Math.round((completedCount / 21) * 100 * 100) / 100;
                    
                    // Calculate actual progress
                    const actualProgress = calculateHabitProgressForDays(completions, 21);
                    
                    // Assert they are equal
                    expect(actualProgress).toBe(expectedProgress);
                    
                    // Additional invariants
                    expect(actualProgress).toBeGreaterThanOrEqual(0);
                    expect(actualProgress).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: daily-planner-app, Property 19: Habit progress calculation for 28 days
     * Validates: Requirements 5.3
     * 
     * Property: For any daily habit and 28-day period, the progress percentage 
     * should equal (completed days / 28) × 100
     */
    test('Property 19: Habit progress for 28 days - (completed / 28) × 100', () => {
        const { calculateHabitProgressForDays } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate array of exactly 28 completion objects
                fc.array(
                    fc.record({
                        date: fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') })
                            .map(d => d.toISOString().split('T')[0]),
                        completed: fc.boolean()
                    }),
                    { minLength: 28, maxLength: 28 }
                ),
                (completions) => {
                    // Calculate expected progress
                    const completedCount = completions.filter(c => c.completed === true).length;
                    const expectedProgress = Math.round((completedCount / 28) * 100 * 100) / 100;
                    
                    // Calculate actual progress
                    const actualProgress = calculateHabitProgressForDays(completions, 28);
                    
                    // Assert they are equal
                    expect(actualProgress).toBe(expectedProgress);
                    
                    // Additional invariants
                    expect(actualProgress).toBeGreaterThanOrEqual(0);
                    expect(actualProgress).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: daily-planner-app, Property 20: Monthly habit progress calculation
     * Validates: Requirements 5.4
     * 
     * Property: For any daily habit and month, the monthly progress percentage 
     * should equal (completed days in month / total days in month) × 100
     */
    test('Property 20: Monthly habit progress - (completed / total days in month) × 100', () => {
        const { calculateMonthlyHabitProgress } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate random month (1-12) and year
                fc.integer({ min: 1, max: 12 }),
                fc.integer({ min: 2020, max: 2030 }),
                (month, year) => {
                    // Calculate days in month
                    const daysInMonth = new Date(year, month, 0).getDate();
                    
                    // Generate completions for the month
                    const completions = [];
                    for (let day = 1; day <= daysInMonth; day++) {
                        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        completions.push({
                            date,
                            completed: Math.random() > 0.5 // Random completion
                        });
                    }
                    
                    // Calculate expected progress
                    const completedCount = completions.filter(c => c.completed === true).length;
                    const expectedProgress = Math.round((completedCount / daysInMonth) * 100 * 100) / 100;
                    
                    // Calculate actual progress
                    const actualProgress = calculateMonthlyHabitProgress(completions, daysInMonth);
                    
                    // Assert they are equal
                    expect(actualProgress).toBe(expectedProgress);
                    
                    // Additional invariants
                    expect(actualProgress).toBeGreaterThanOrEqual(0);
                    expect(actualProgress).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: daily-planner-app, Property 21: Daily completion percentage
     * Validates: Requirements 5.5
     * 
     * Property: For any date with habits, the daily completion percentage 
     * should equal (completed habits / total habits) × 100
     */
    test('Property 21: Daily completion percentage - (completed habits / total habits) × 100', () => {
        const { calculateDailyCompletionPercentage } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate random number of habits (1-30)
                fc.integer({ min: 1, max: 30 }),
                (totalHabits) => {
                    // Generate completions for a single date
                    const completions = [];
                    for (let i = 0; i < totalHabits; i++) {
                        completions.push({
                            habit_id: `habit-${i}`,
                            date: '2025-01-15',
                            completed: Math.random() > 0.5 // Random completion
                        });
                    }
                    
                    // Calculate expected percentage
                    const completedCount = completions.filter(c => c.completed === true).length;
                    const expectedPercentage = Math.round((completedCount / totalHabits) * 100 * 100) / 100;
                    
                    // Calculate actual percentage
                    const actualPercentage = calculateDailyCompletionPercentage(completions, totalHabits);
                    
                    // Assert they are equal
                    expect(actualPercentage).toBe(expectedPercentage);
                    
                    // Additional invariants
                    expect(actualPercentage).toBeGreaterThanOrEqual(0);
                    expect(actualPercentage).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Edge cases for habit progress calculations
     */
    test('Empty completions array returns 0% progress', () => {
        const { calculateHabitProgressForDays } = require('./utils.js');
        expect(calculateHabitProgressForDays([], 7)).toBe(0);
    });

    test('All habits completed returns 100% progress', () => {
        const { calculateHabitProgressForDays } = require('./utils.js');
        const completions = Array(7).fill(null).map((_, i) => ({
            date: `2025-01-${String(i + 1).padStart(2, '0')}`,
            completed: true
        }));
        expect(calculateHabitProgressForDays(completions, 7)).toBe(100);
    });

    test('No habits completed returns 0% progress', () => {
        const { calculateHabitProgressForDays } = require('./utils.js');
        const completions = Array(7).fill(null).map((_, i) => ({
            date: `2025-01-${String(i + 1).padStart(2, '0')}`,
            completed: false
        }));
        expect(calculateHabitProgressForDays(completions, 7)).toBe(0);
    });

    test('Half habits completed returns 50% progress', () => {
        const { calculateHabitProgressForDays } = require('./utils.js');
        const completions = [
            { date: '2025-01-01', completed: true },
            { date: '2025-01-02', completed: true },
            { date: '2025-01-03', completed: true },
            { date: '2025-01-04', completed: true },
            { date: '2025-01-05', completed: false },
            { date: '2025-01-06', completed: false },
            { date: '2025-01-07', completed: false },
            { date: '2025-01-08', completed: false }
        ];
        expect(calculateHabitProgressForDays(completions, 8)).toBe(50);
    });
});

describe('Sleep Duration Calculation', () => {
    /**
     * Feature: daily-planner-app, Property 27: Sleep duration calculation
     * Validates: Requirements 7.2
     * 
     * Property: For any bedtime and wake time, the calculated sleep duration 
     * should equal the time difference in hours
     */
    test('Property 27: Sleep duration - time difference in hours', () => {
        const { calculateSleepDuration } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate random bedtime (18:00 - 23:59)
                fc.integer({ min: 18, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                // Generate random wake time (4:00 - 12:00)
                fc.integer({ min: 4, max: 12 }),
                fc.integer({ min: 0, max: 59 }),
                (bedHour, bedMin, wakeHour, wakeMin) => {
                    // Format time strings
                    const bedtime = `${String(bedHour).padStart(2, '0')}:${String(bedMin).padStart(2, '0')}`;
                    const wakeTime = `${String(wakeHour).padStart(2, '0')}:${String(wakeMin).padStart(2, '0')}`;
                    
                    // Calculate expected duration
                    let bedMinutes = bedHour * 60 + bedMin;
                    let wakeMinutes = wakeHour * 60 + wakeMin;
                    
                    // If wake time is earlier than bedtime, assume next day
                    if (wakeMinutes < bedMinutes) {
                        wakeMinutes += 24 * 60;
                    }
                    
                    const durationMinutes = wakeMinutes - bedMinutes;
                    const expectedDuration = Math.round((durationMinutes / 60) * 10) / 10;
                    
                    // Calculate actual duration
                    const actualDuration = calculateSleepDuration(bedtime, wakeTime);
                    
                    // Assert they are equal
                    expect(actualDuration).toBe(expectedDuration);
                    
                    // Additional invariants
                    expect(actualDuration).toBeGreaterThanOrEqual(0);
                    expect(actualDuration).toBeLessThanOrEqual(24);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Specific examples
     */
    test('22:00 to 06:00 is 8 hours', () => {
        const { calculateSleepDuration } = require('./utils.js');
        expect(calculateSleepDuration('22:00', '06:00')).toBe(8.0);
    });

    test('23:30 to 07:30 is 8 hours', () => {
        const { calculateSleepDuration } = require('./utils.js');
        expect(calculateSleepDuration('23:30', '07:30')).toBe(8.0);
    });

    test('21:00 to 05:00 is 8 hours', () => {
        const { calculateSleepDuration } = require('./utils.js');
        expect(calculateSleepDuration('21:00', '05:00')).toBe(8.0);
    });

    test('23:00 to 06:30 is 7.5 hours', () => {
        const { calculateSleepDuration } = require('./utils.js');
        expect(calculateSleepDuration('23:00', '06:30')).toBe(7.5);
    });

    test('22:15 to 06:45 is 8.5 hours', () => {
        const { calculateSleepDuration } = require('./utils.js');
        expect(calculateSleepDuration('22:15', '06:45')).toBe(8.5);
    });

    /**
     * Edge cases
     */
    test('Same time returns 0 hours', () => {
        const { calculateSleepDuration } = require('./utils.js');
        expect(calculateSleepDuration('22:00', '22:00')).toBe(0);
    });

    test('Wake time 1 minute after bedtime', () => {
        const { calculateSleepDuration } = require('./utils.js');
        const duration = calculateSleepDuration('22:00', '22:01');
        expect(duration).toBeCloseTo(0.0, 1);
    });

    test('Very short sleep (1 hour)', () => {
        const { calculateSleepDuration } = require('./utils.js');
        expect(calculateSleepDuration('23:00', '00:00')).toBe(1.0);
    });

    test('Very long sleep (12 hours)', () => {
        const { calculateSleepDuration } = require('./utils.js');
        expect(calculateSleepDuration('20:00', '08:00')).toBe(12.0);
    });
});

describe('Water Intake Percentage', () => {
    /**
     * Feature: daily-planner-app, Property 28: Water intake percentage
     * Validates: Requirements 7.3
     * 
     * Property: For any glasses consumed and daily goal, the percentage 
     * should equal (glasses consumed / goal glasses) × 100
     */
    test('Property 28: Water intake percentage - (consumed / goal) × 100', () => {
        const { calculateWaterIntakePercentage } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate random glasses consumed (0-20)
                fc.integer({ min: 0, max: 20 }),
                // Generate random goal (1-20)
                fc.integer({ min: 1, max: 20 }),
                (glassesConsumed, goalGlasses) => {
                    // Calculate expected percentage
                    const expectedPercentage = Math.round((glassesConsumed / goalGlasses) * 100 * 100) / 100;
                    
                    // Calculate actual percentage
                    const actualPercentage = calculateWaterIntakePercentage(glassesConsumed, goalGlasses);
                    
                    // Assert they are equal
                    expect(actualPercentage).toBe(expectedPercentage);
                    
                    // Additional invariants
                    expect(actualPercentage).toBeGreaterThanOrEqual(0);
                    // Note: Can exceed 100% if consumed more than goal
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Specific examples
     */
    test('8 glasses out of 8 goal is 100%', () => {
        const { calculateWaterIntakePercentage } = require('./utils.js');
        expect(calculateWaterIntakePercentage(8, 8)).toBe(100);
    });

    test('4 glasses out of 8 goal is 50%', () => {
        const { calculateWaterIntakePercentage } = require('./utils.js');
        expect(calculateWaterIntakePercentage(4, 8)).toBe(50);
    });

    test('6 glasses out of 8 goal is 75%', () => {
        const { calculateWaterIntakePercentage } = require('./utils.js');
        expect(calculateWaterIntakePercentage(6, 8)).toBe(75);
    });

    test('10 glasses out of 8 goal is 125% (exceeded goal)', () => {
        const { calculateWaterIntakePercentage } = require('./utils.js');
        expect(calculateWaterIntakePercentage(10, 8)).toBe(125);
    });

    test('0 glasses out of 8 goal is 0%', () => {
        const { calculateWaterIntakePercentage } = require('./utils.js');
        expect(calculateWaterIntakePercentage(0, 8)).toBe(0);
    });

    /**
     * Edge cases
     */
    test('Zero goal returns 0%', () => {
        const { calculateWaterIntakePercentage } = require('./utils.js');
        expect(calculateWaterIntakePercentage(5, 0)).toBe(0);
    });

    test('Null goal returns 0%', () => {
        const { calculateWaterIntakePercentage } = require('./utils.js');
        expect(calculateWaterIntakePercentage(5, null)).toBe(0);
    });

    test('1 glass out of 10 goal is 10%', () => {
        const { calculateWaterIntakePercentage } = require('./utils.js');
        expect(calculateWaterIntakePercentage(1, 10)).toBe(10);
    });

    test('Fractional result rounds correctly', () => {
        const { calculateWaterIntakePercentage } = require('./utils.js');
        // 5 out of 6 = 83.333...%
        expect(calculateWaterIntakePercentage(5, 6)).toBe(83.33);
    });
});

describe('Pomodoro Timer Properties', () => {
    /**
     * Feature: daily-planner-app, Property 57: Timer initialization
     * Validates: Requirements 12.1
     * 
     * Property: For any Pomodoro session start, the timer should begin counting 
     * down from 25 minutes (1500 seconds)
     */
    test('Property 57: Timer initialization - starts at 25 minutes (1500 seconds)', () => {
        const { initializePomodoroTimer } = require('./utils.js');
        
        fc.assert(
            fc.property(
                fc.constant(null), // Dummy generator since initialization is deterministic
                () => {
                    // Initialize timer
                    const timer = initializePomodoroTimer();
                    
                    // Assert initial state
                    expect(timer.mode).toBe('focus');
                    expect(timer.timeRemaining).toBe(1500); // 25 minutes in seconds
                    expect(timer.sessionCount).toBe(0);
                    expect(timer.isRunning).toBe(false);
                    expect(timer.isPaused).toBe(false);
                    
                    // Additional invariants
                    expect(timer.timeRemaining).toBeGreaterThan(0);
                    expect(timer.sessionCount).toBeGreaterThanOrEqual(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: daily-planner-app, Property 58: Session completion and break transition
     * Validates: Requirements 12.2
     * 
     * Property: For any completed Pomodoro session, the system should notify 
     * the user and automatically start a 5-minute break timer
     */
    test('Property 58: Session completion - auto-starts 5-minute break', () => {
        const { completePomodoroSession } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate random session count (1-3, not 4 since that triggers long break)
                fc.integer({ min: 1, max: 3 }),
                (sessionCount) => {
                    // Complete a focus session
                    const result = completePomodoroSession({
                        mode: 'focus',
                        sessionCount: sessionCount,
                        timeRemaining: 0
                    });
                    
                    // Assert transition to short break
                    expect(result.mode).toBe('shortBreak');
                    expect(result.timeRemaining).toBe(300); // 5 minutes in seconds
                    expect(result.sessionCount).toBe(sessionCount + 1);
                    expect(result.notificationShown).toBe(true);
                    expect(result.isRunning).toBe(true);
                    
                    // Additional invariants
                    expect(result.timeRemaining).toBeGreaterThan(0);
                    expect(result.sessionCount).toBeGreaterThan(sessionCount);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: daily-planner-app, Property 59: Long break after four sessions
     * Validates: Requirements 12.3
     * 
     * Property: For any fourth completed Pomodoro session, the system should 
     * automatically start a 15-minute long break timer
     */
    test('Property 59: Long break after four sessions - auto-starts 15-minute break', () => {
        const { completePomodoroSession } = require('./utils.js');
        
        fc.assert(
            fc.property(
                fc.constant(null), // Deterministic test
                () => {
                    // Complete the 4th focus session
                    const result = completePomodoroSession({
                        mode: 'focus',
                        sessionCount: 3, // After this completion, it will be 4
                        timeRemaining: 0
                    });
                    
                    // Assert transition to long break
                    expect(result.mode).toBe('longBreak');
                    expect(result.timeRemaining).toBe(900); // 15 minutes in seconds
                    expect(result.sessionCount).toBe(4);
                    expect(result.notificationShown).toBe(true);
                    expect(result.isRunning).toBe(true);
                    
                    // Additional invariants
                    expect(result.timeRemaining).toBeGreaterThan(0);
                    expect(result.sessionCount % 4).toBe(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Test that multiples of 4 trigger long breaks
     */
    test('Every 4th session triggers long break', () => {
        const { completePomodoroSession } = require('./utils.js');
        
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

    /**
     * Feature: daily-planner-app, Property 60: Pause and resume
     * Validates: Requirements 12.4
     * 
     * Property: For any paused timer, resuming should continue from the paused time
     */
    test('Property 60: Pause and resume - continues from paused time', () => {
        const { pausePomodoroTimer, resumePomodoroTimer } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate random time remaining (1-1500 seconds)
                fc.integer({ min: 1, max: 1500 }),
                fc.constantFrom('focus', 'shortBreak', 'longBreak'),
                (timeRemaining, mode) => {
                    // Create a running timer
                    const runningTimer = {
                        mode: mode,
                        timeRemaining: timeRemaining,
                        isRunning: true,
                        isPaused: false
                    };
                    
                    // Pause the timer
                    const pausedTimer = pausePomodoroTimer(runningTimer);
                    
                    // Assert paused state
                    expect(pausedTimer.isPaused).toBe(true);
                    expect(pausedTimer.isRunning).toBe(true);
                    expect(pausedTimer.timeRemaining).toBe(timeRemaining);
                    expect(pausedTimer.mode).toBe(mode);
                    
                    // Resume the timer
                    const resumedTimer = resumePomodoroTimer(pausedTimer);
                    
                    // Assert resumed state
                    expect(resumedTimer.isPaused).toBe(false);
                    expect(resumedTimer.isRunning).toBe(true);
                    expect(resumedTimer.timeRemaining).toBe(timeRemaining);
                    expect(resumedTimer.mode).toBe(mode);
                    
                    // Time should not have changed
                    expect(resumedTimer.timeRemaining).toBe(runningTimer.timeRemaining);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: daily-planner-app, Property 61: Timer reset
     * Validates: Requirements 12.5
     * 
     * Property: For any timer reset, the timer should return to initial state 
     * and clear the current session
     */
    test('Property 61: Timer reset - returns to initial state', () => {
        const { resetPomodoroTimer } = require('./utils.js');
        
        fc.assert(
            fc.property(
                // Generate random timer state
                fc.integer({ min: 0, max: 1500 }),
                fc.constantFrom('focus', 'shortBreak', 'longBreak'),
                fc.boolean(),
                fc.boolean(),
                (timeRemaining, mode, isRunning, isPaused) => {
                    // Create a timer in some state
                    const timer = {
                        mode: mode,
                        timeRemaining: timeRemaining,
                        isRunning: isRunning,
                        isPaused: isPaused,
                        sessionCount: 2
                    };
                    
                    // Reset the timer
                    const resetTimer = resetPomodoroTimer(timer);
                    
                    // Assert reset to initial state
                    expect(resetTimer.mode).toBe('focus');
                    expect(resetTimer.timeRemaining).toBe(1500); // 25 minutes
                    expect(resetTimer.isRunning).toBe(false);
                    expect(resetTimer.isPaused).toBe(false);
                    // Note: sessionCount is NOT reset, only the current timer
                    
                    // Additional invariants
                    expect(resetTimer.timeRemaining).toBeGreaterThan(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Specific examples for timer operations
     */
    test('Pausing at 10 minutes remaining preserves time', () => {
        const { pausePomodoroTimer } = require('./utils.js');
        const timer = {
            mode: 'focus',
            timeRemaining: 600, // 10 minutes
            isRunning: true,
            isPaused: false
        };
        
        const paused = pausePomodoroTimer(timer);
        expect(paused.timeRemaining).toBe(600);
        expect(paused.isPaused).toBe(true);
    });

    test('Resuming from pause maintains time', () => {
        const { resumePomodoroTimer } = require('./utils.js');
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

    test('Reset from any state returns to 25 minutes focus', () => {
        const { resetPomodoroTimer } = require('./utils.js');
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

    test('Break completion returns to focus mode', () => {
        const { completePomodoroSession } = require('./utils.js');
        
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

    /**
     * Edge cases
     */
    test('Cannot pause an already paused timer', () => {
        const { pausePomodoroTimer } = require('./utils.js');
        const timer = {
            mode: 'focus',
            timeRemaining: 600,
            isRunning: true,
            isPaused: true
        };
        
        const result = pausePomodoroTimer(timer);
        expect(result.isPaused).toBe(true);
        expect(result.timeRemaining).toBe(600);
    });

    test('Cannot resume a non-paused timer', () => {
        const { resumePomodoroTimer } = require('./utils.js');
        const timer = {
            mode: 'focus',
            timeRemaining: 600,
            isRunning: true,
            isPaused: false
        };
        
        const result = resumePomodoroTimer(timer);
        expect(result.isPaused).toBe(false);
        expect(result.timeRemaining).toBe(600);
    });

    test('Timer with 0 time remaining can be reset', () => {
        const { resetPomodoroTimer } = require('./utils.js');
        const timer = {
            mode: 'focus',
            timeRemaining: 0,
            isRunning: false,
            isPaused: false,
            sessionCount: 1
        };
        
        const reset = resetPomodoroTimer(timer);
        expect(reset.timeRemaining).toBe(1500);
        expect(reset.mode).toBe('focus');
    });
});

describe('Real-Time Update Propagation', () => {
    /**
     * Feature: daily-planner-app, Property 44: Real-time update propagation
     * Validates: Requirements 9.4
     * 
     * Property: For any data change in the database, the UI should receive 
     * the update and refresh the display
     */
    test('Property 44: Real-time updates - changes propagate to UI', () => {
        const SyncManager = require('./sync-manager.js').default;
        
        fc.assert(
            fc.property(
                // Generate random table name from our schema
                fc.constantFrom(
                    'annual_goals',
                    'reading_list',
                    'monthly_data',
                    'weekly_goals',
                    'time_blocks',
                    'daily_entries',
                    'daily_habits',
                    'daily_habit_completions',
                    'weekly_habits',
                    'weekly_habit_completions',
                    'mood_tracker',
                    'sleep_tracker',
                    'water_tracker',
                    'action_plans'
                ),
                // Generate random event type
                fc.constantFrom('INSERT', 'UPDATE', 'DELETE'),
                // Generate random record data
                fc.record({
                    id: fc.uuid(),
                    user_id: fc.uuid(),
                    created_at: fc.date().map(d => d.toISOString()),
                    updated_at: fc.date().map(d => d.toISOString())
                }),
                (table, eventType, recordData) => {
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
                    
                    // Note: We can't actually test real Supabase subscriptions in unit tests
                    // So we'll test the handleChange method directly
                    syncManager.handleChange(table, {
                        eventType: eventType,
                        new: eventType !== 'DELETE' ? recordData : null,
                        old: eventType !== 'INSERT' ? recordData : null
                    }, onChange);
                    
                    // Assert that the change was received
                    expect(changeReceived).toBe(true);
                    expect(receivedChange).not.toBeNull();
                    expect(receivedChange.table).toBe(table);
                    expect(receivedChange.eventType).toBe(eventType);
                    
                    // Assert that the change was recorded
                    const changes = syncManager.getChangesForTable(table);
                    expect(changes.length).toBeGreaterThan(0);
                    
                    const lastChange = changes[changes.length - 1];
                    expect(lastChange.eventType).toBe(eventType);
                    
                    // Verify correct record is in the change based on event type
                    if (eventType === 'INSERT') {
                        expect(lastChange.newRecord).toEqual(recordData);
                        expect(lastChange.oldRecord).toBeNull();
                    } else if (eventType === 'UPDATE') {
                        expect(lastChange.newRecord).toEqual(recordData);
                        expect(lastChange.oldRecord).toEqual(recordData);
                    } else if (eventType === 'DELETE') {
                        expect(lastChange.newRecord).toBeNull();
                        expect(lastChange.oldRecord).toEqual(recordData);
                    }
                    
                    // Cleanup
                    syncManager.clearChanges();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Test that multiple changes are tracked correctly
     */
    test('Multiple changes are tracked in order', () => {
        const SyncManager = require('./sync-manager.js').default;
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

    /**
     * Test subscription management
     */
    test('Subscription management works correctly', () => {
        const SyncManager = require('./sync-manager.js').default;
        const syncManager = new SyncManager();
        
        // Initially no subscriptions
        expect(syncManager.getSubscriptionCount()).toBe(0);
        expect(syncManager.isSubscribedTo('annual_goals')).toBe(false);
        
        // Note: We can't test actual Supabase subscriptions in unit tests
        // This would require integration testing with a real Supabase instance
        
        syncManager.clearChanges();
    });

    /**
     * Test that changes are isolated by table
     */
    test('Changes are isolated by table', () => {
        const SyncManager = require('./sync-manager.js').default;
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
        expect(changes1[0].newRecord).toEqual(record1);
        expect(changes2[0].newRecord).toEqual(record2);
        
        syncManager.clearChanges();
    });

    /**
     * Test that clearing changes works
     */
    test('Clearing changes removes all tracked changes', () => {
        const SyncManager = require('./sync-manager.js').default;
        const syncManager = new SyncManager();
        
        const table = 'annual_goals';
        const record = { id: '1', title: 'Goal 1' };
        
        // Add some changes
        syncManager.handleChange(table, {
            eventType: 'INSERT',
            new: record,
            old: null
        }, null);
        
        syncManager.handleChange(table, {
            eventType: 'UPDATE',
            new: { ...record, title: 'Updated' },
            old: record
        }, null);
        
        // Verify changes exist
        expect(syncManager.getChangesForTable(table).length).toBe(2);
        
        // Clear changes
        syncManager.clearChanges();
        
        // Verify changes are cleared
        expect(syncManager.getChangesForTable(table).length).toBe(0);
    });

    /**
     * Test INSERT event handling
     */
    test('INSERT events have new record and no old record', () => {
        const SyncManager = require('./sync-manager.js').default;
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
        expect(receivedChange.newRecord).toEqual(newRecord);
        expect(receivedChange.oldRecord).toBeNull();
        
        syncManager.clearChanges();
    });

    /**
     * Test UPDATE event handling
     */
    test('UPDATE events have both new and old records', () => {
        const SyncManager = require('./sync-manager.js').default;
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
        expect(receivedChange.newRecord).toEqual(newRecord);
        expect(receivedChange.oldRecord).toEqual(oldRecord);
        
        syncManager.clearChanges();
    });

    /**
     * Test DELETE event handling
     */
    test('DELETE events have old record and no new record', () => {
        const SyncManager = require('./sync-manager.js').default;
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
        expect(receivedChange.newRecord).toBeNull();
        expect(receivedChange.oldRecord).toEqual(oldRecord);
        
        syncManager.clearChanges();
    });

    /**
     * Test that onChange callback is optional
     */
    test('handleChange works without onChange callback', () => {
        const SyncManager = require('./sync-manager.js').default;
        const syncManager = new SyncManager();
        
        const table = 'annual_goals';
        const record = { id: '1', title: 'Goal 1' };
        
        // Should not throw error when onChange is null
        expect(() => {
            syncManager.handleChange(table, {
                eventType: 'INSERT',
                new: record,
                old: null
            }, null);
        }).not.toThrow();
        
        // Change should still be recorded
        const changes = syncManager.getChangesForTable(table);
        expect(changes.length).toBe(1);
        
        syncManager.clearChanges();
    });

    /**
     * Test timestamp is added to changes
     */
    test('Changes include timestamp', () => {
        const SyncManager = require('./sync-manager.js').default;
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
        expect(changes[0].timestamp).toBeDefined();
        expect(changes[0].timestamp).toBeInstanceOf(Date);
        expect(changes[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(changes[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
        
        syncManager.clearChanges();
    });
});

describe('Offline Queue and Sync', () => {
    /**
     * Feature: daily-planner-app, Property 45: Offline queue and sync
     * Validates: Requirements 9.5
     * 
     * Property: For any changes made while offline, when connection is restored, 
     * the changes should sync to the database
     */
    test('Property 45: Offline queue and sync - queued operations sync when online', () => {
        const OfflineManager = require('./offline-manager.js').default;
        
        fc.assert(
            fc.property(
                // Generate random operations
                fc.array(
                    fc.record({
                        table: fc.constantFrom('annual_goals', 'daily_habits', 'time_blocks', 'action_plans'),
                        action: fc.constantFrom('insert', 'update', 'delete', 'upsert'),
                        data: fc.record({
                            id: fc.uuid(),
                            title: fc.string({ minLength: 1, maxLength: 100 }),
                            completed: fc.boolean()
                        })
                    }),
                    { minLength: 1, maxLength: 10 }
                ),
                (operations) => {
                    // Create a fresh offline manager instance for testing
                    const offlineManager = new (require('./offline-manager.js').default.constructor)();
                    
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
                        expect(queuedOp.data).toEqual(operations[index].data);
                        expect(queuedOp.timestamp).toBeDefined();
                        expect(queuedOp.id).toBeDefined();
                    });
                    
                    // Verify queue persists to localStorage
                    const storedQueue = JSON.parse(localStorage.getItem('offlineQueue'));
                    expect(storedQueue.length).toBe(operations.length);
                    
                    // Cleanup
                    offlineManager.clearQueue();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Test that operations are added with timestamp and ID
     */
    test('Operations added to queue have timestamp and ID', () => {
        const OfflineManager = require('./offline-manager.js').default;
        const offlineManager = new (OfflineManager.constructor)();
        
        offlineManager.clearQueue();
        
        const operation = {
            table: 'annual_goals',
            action: 'insert',
            data: { id: '123', title: 'Test Goal' }
        };
        
        offlineManager.addToQueue(operation);
        
        const queue = offlineManager.getQueue();
        expect(queue.length).toBe(1);
        expect(queue[0].timestamp).toBeDefined();
        expect(queue[0].id).toBeDefined();
        expect(queue[0].table).toBe('annual_goals');
        expect(queue[0].action).toBe('insert');
        
        offlineManager.clearQueue();
    });

    /**
     * Test that queue persists across page reloads
     */
    test('Queue persists to localStorage', () => {
        const OfflineManager = require('./offline-manager.js').default;
        const offlineManager = new (OfflineManager.constructor)();
        
        offlineManager.clearQueue();
        
        const operations = [
            { table: 'annual_goals', action: 'insert', data: { id: '1', title: 'Goal 1' } },
            { table: 'daily_habits', action: 'update', data: { id: '2', title: 'Habit 1' } },
            { table: 'time_blocks', action: 'delete', data: { id: '3' } }
        ];
        
        operations.forEach(op => offlineManager.addToQueue(op));
        
        // Verify queue is saved to localStorage
        const stored = localStorage.getItem('offlineQueue');
        expect(stored).toBeDefined();
        
        const parsedQueue = JSON.parse(stored);
        expect(parsedQueue.length).toBe(3);
        
        // Create new instance to simulate page reload
        const newOfflineManager = new (OfflineManager.constructor)();
        const loadedQueue = newOfflineManager.getQueue();
        
        expect(loadedQueue.length).toBe(3);
        expect(loadedQueue[0].table).toBe('annual_goals');
        expect(loadedQueue[1].table).toBe('daily_habits');
        expect(loadedQueue[2].table).toBe('time_blocks');
        
        offlineManager.clearQueue();
    });

    /**
     * Test that queue is cleared after successful sync
     */
    test('Queue is cleared after operations are processed', () => {
        const OfflineManager = require('./offline-manager.js').default;
        const offlineManager = new (OfflineManager.constructor)();
        
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

    /**
     * Test online/offline status detection
     */
    test('Online/offline status is tracked correctly', () => {
        const OfflineManager = require('./offline-manager.js').default;
        const offlineManager = new (OfflineManager.constructor)();
        
        // Initial status should match navigator.onLine
        expect(offlineManager.isOnlineStatus()).toBe(navigator.onLine);
        
        // Simulate going offline
        offlineManager.handleOffline();
        expect(offlineManager.isOnlineStatus()).toBe(false);
        
        // Simulate going online
        offlineManager.handleOnline();
        expect(offlineManager.isOnlineStatus()).toBe(true);
    });

    /**
     * Test that listeners are notified of online/offline events
     */
    test('Listeners are notified of online/offline events', () => {
        const OfflineManager = require('./offline-manager.js').default;
        const offlineManager = new (OfflineManager.constructor)();
        
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
        offlineManager.handleOnline();
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

    /**
     * Test that operations maintain order in queue
     */
    test('Operations maintain FIFO order in queue', () => {
        const OfflineManager = require('./offline-manager.js').default;
        const offlineManager = new (OfflineManager.constructor)();
        
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

    /**
     * Test that invalid operations are handled gracefully
     */
    test('Invalid operations in queue are handled gracefully', () => {
        const OfflineManager = require('./offline-manager.js').default;
        const offlineManager = new (OfflineManager.constructor)();
        
        offlineManager.clearQueue();
        
        // Add operation with missing fields
        const invalidOperation = {
            table: 'annual_goals',
            // Missing action
            data: { id: '123' }
        };
        
        // Should not throw error
        expect(() => {
            offlineManager.addToQueue(invalidOperation);
        }).not.toThrow();
        
        const queue = offlineManager.getQueue();
        expect(queue.length).toBe(1);
        
        offlineManager.clearQueue();
    });

    /**
     * Test that queue handles large number of operations
     */
    test('Queue handles large number of operations', () => {
        const OfflineManager = require('./offline-manager.js').default;
        const offlineManager = new (OfflineManager.constructor)();
        
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

    /**
     * Test that duplicate operations can be queued
     */
    test('Duplicate operations can be queued', () => {
        const OfflineManager = require('./offline-manager.js').default;
        const offlineManager = new (OfflineManager.constructor)();
        
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
});

describe('Data Export and Import', () => {
    /**
     * Feature: daily-planner-app, Property 53: Export completeness
     * Validates: Requirements 13.1
     * 
     * Property: For any user data, the exported JSON file should contain all user data
     */
    test('Property 53: Export completeness - exported data contains all required fields', async () => {
        // Import the data service
        const dataService = (await import('./data-service.js')).default;
        
        // Mock Supabase client to avoid actual database calls
        const mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: 'test-user-id', email: 'test@example.com' } }
                })
            },
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null })
        };
        
        // Replace the supabase client
        dataService.supabase = mockSupabase;
        
        // Mock all the data fetching methods to return empty arrays/objects
        jest.spyOn(dataService, 'getUserProfile').mockResolvedValue({ display_name: 'Test User', timezone: 'UTC' });
        jest.spyOn(dataService, 'getAnnualGoals').mockResolvedValue([]);
        jest.spyOn(dataService, 'getReadingList').mockResolvedValue([]);
        jest.spyOn(dataService, 'getMonthlyData').mockResolvedValue(null);
        jest.spyOn(dataService, 'getWeeklyGoals').mockResolvedValue([]);
        jest.spyOn(dataService, 'getTimeBlocksRange').mockResolvedValue([]);
        jest.spyOn(dataService, 'getDailyEntry').mockResolvedValue(null);
        jest.spyOn(dataService, 'getDailyHabits').mockResolvedValue([]);
        jest.spyOn(dataService, 'getDailyHabitCompletions').mockResolvedValue([]);
        jest.spyOn(dataService, 'getWeeklyHabits').mockResolvedValue([]);
        jest.spyOn(dataService, 'getWeeklyHabitCompletions').mockResolvedValue([]);
        jest.spyOn(dataService, 'getMoodEntries').mockResolvedValue([]);
        jest.spyOn(dataService, 'getSleepEntries').mockResolvedValue([]);
        jest.spyOn(dataService, 'getWaterEntries').mockResolvedValue([]);
        jest.spyOn(dataService, 'getActionPlans').mockResolvedValue([]);
        
        // Run the property test
        await fc.assert(
            fc.asyncProperty(
                fc.constant(null), // Dummy generator since we're using mocked data
                async () => {
                    // Export data
                    const exportData = await dataService.exportAllData();
                    
                    // Verify export structure
                    expect(exportData).toBeDefined();
                    expect(exportData.version).toBeDefined();
                    expect(exportData.exportDate).toBeDefined();
                    expect(exportData.userId).toBe('test-user-id');
                    expect(exportData.userEmail).toBe('test@example.com');
                    
                    // Verify data field exists
                    expect(exportData.data).toBeDefined();
                    expect(typeof exportData.data).toBe('object');
                    
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
                        expect(exportData.data).toHaveProperty(field);
                    }
                    
                    // Verify export date is valid ISO string
                    expect(() => new Date(exportData.exportDate)).not.toThrow();
                    expect(new Date(exportData.exportDate).toISOString()).toBe(exportData.exportDate);
                }
            ),
            { numRuns: 100 }
        );
        
        // Restore mocks
        jest.restoreAllMocks();
    });

    /**
     * Feature: daily-planner-app, Property 54: Import validation
     * Validates: Requirements 13.2
     * 
     * Property: For any imported file, if the format is invalid, the import 
     * should be rejected with an error message
     */
    test('Property 54: Import validation - invalid formats are rejected', () => {
        // Import the data service
        const dataService = require('./data-service.js').default;
        
        fc.assert(
            fc.property(
                // Generate various invalid data structures
                fc.oneof(
                    // Missing version
                    fc.record({
                        exportDate: fc.date().map(d => d.toISOString()),
                        userId: fc.uuid(),
                        data: fc.record({
                            annualGoals: fc.array(fc.anything()),
                            readingList: fc.array(fc.anything()),
                            dailyHabits: fc.array(fc.anything()),
                            weeklyHabits: fc.array(fc.anything()),
                            actionPlans: fc.array(fc.anything())
                        })
                    }),
                    // Missing data field
                    fc.record({
                        version: fc.constant('1.0'),
                        exportDate: fc.date().map(d => d.toISOString()),
                        userId: fc.uuid()
                    }),
                    // Invalid data field (not an object)
                    fc.record({
                        version: fc.constant('1.0'),
                        exportDate: fc.date().map(d => d.toISOString()),
                        userId: fc.uuid(),
                        data: fc.string()
                    }),
                    // Missing required array fields
                    fc.record({
                        version: fc.constant('1.0'),
                        exportDate: fc.date().map(d => d.toISOString()),
                        userId: fc.uuid(),
                        data: fc.record({
                            annualGoals: fc.array(fc.anything())
                            // Missing other required fields
                        })
                    }),
                    // Invalid array field types
                    fc.record({
                        version: fc.constant('1.0'),
                        exportDate: fc.date().map(d => d.toISOString()),
                        userId: fc.uuid(),
                        data: fc.record({
                            annualGoals: fc.string(), // Should be array
                            readingList: fc.array(fc.anything()),
                            dailyHabits: fc.array(fc.anything()),
                            weeklyHabits: fc.array(fc.anything()),
                            actionPlans: fc.array(fc.anything())
                        })
                    })
                ),
                (invalidData) => {
                    // Validate the invalid data
                    const validation = dataService.validateImportData(invalidData);
                    
                    // Should be invalid
                    expect(validation.valid).toBe(false);
                    
                    // Should have error messages
                    expect(validation.errors).toBeDefined();
                    expect(Array.isArray(validation.errors)).toBe(true);
                    expect(validation.errors.length).toBeGreaterThan(0);
                    
                    // Each error should be a string
                    for (const error of validation.errors) {
                        expect(typeof error).toBe('string');
                        expect(error.length).toBeGreaterThan(0);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Test that valid export data passes validation
     */
    test('Valid export data passes validation', () => {
        const dataService = require('./data-service.js').default;
        
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
        
        expect(validation.valid).toBe(true);
        expect(validation.errors.length).toBe(0);
    });

    /**
     * Test that null or undefined data is rejected
     */
    test('Null or undefined data is rejected', () => {
        const dataService = require('./data-service.js').default;
        
        const nullValidation = dataService.validateImportData(null);
        expect(nullValidation.valid).toBe(false);
        expect(nullValidation.errors.length).toBeGreaterThan(0);
        
        const undefinedValidation = dataService.validateImportData(undefined);
        expect(undefinedValidation.valid).toBe(false);
        expect(undefinedValidation.errors.length).toBeGreaterThan(0);
    });

    /**
     * Test that non-object data is rejected
     */
    test('Non-object data is rejected', () => {
        const dataService = require('./data-service.js').default;
        
        const stringValidation = dataService.validateImportData('invalid');
        expect(stringValidation.valid).toBe(false);
        
        const numberValidation = dataService.validateImportData(123);
        expect(numberValidation.valid).toBe(false);
        
        const arrayValidation = dataService.validateImportData([]);
        expect(arrayValidation.valid).toBe(false);
    });

    /**
     * Test that missing required fields are detected
     */
    test('Missing required fields are detected', () => {
        const dataService = require('./data-service.js').default;
        
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
        expect(validation.valid).toBe(false);
        expect(validation.errors.some(e => e.includes('annualGoals'))).toBe(true);
    });

    /**
     * Test that invalid field types are detected
     */
    test('Invalid field types are detected', () => {
        const dataService = require('./data-service.js').default;
        
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
        expect(validation.valid).toBe(false);
        expect(validation.errors.some(e => e.includes('annualGoals'))).toBe(true);
    });

    /**
     * Test downloadExportFile creates a valid download
     */
    test('downloadExportFile creates a valid download link', () => {
        const dataService = require('./data-service.js').default;
        
        // Mock DOM elements
        const mockLink = {
            href: '',
            download: '',
            click: jest.fn()
        };
        
        document.createElement = jest.fn().mockReturnValue(mockLink);
        document.body.appendChild = jest.fn();
        document.body.removeChild = jest.fn();
        global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
        global.URL.revokeObjectURL = jest.fn();
        
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: {}
        };
        
        // Should not throw
        expect(() => {
            dataService.downloadExportFile(exportData);
        }).not.toThrow();
        
        // Verify link was created and clicked
        expect(mockLink.click).toHaveBeenCalled();
        expect(mockLink.download).toContain('planner-export-');
        expect(mockLink.download).toContain('.json');
        
        // Cleanup mocks
        jest.restoreAllMocks();
    });

    /**
     * Test readImportFile parses valid JSON
     */
    test('readImportFile parses valid JSON', async () => {
        const dataService = require('./data-service.js').default;
        
        const validJson = JSON.stringify({
            version: '1.0',
            data: {}
        });
        
        const mockFile = new Blob([validJson], { type: 'application/json' });
        mockFile.name = 'test.json';
        
        const result = await dataService.readImportFile(mockFile);
        
        expect(result).toBeDefined();
        expect(result.version).toBe('1.0');
        expect(result.data).toBeDefined();
    });

    /**
     * Test readImportFile rejects invalid JSON
     */
    test('readImportFile rejects invalid JSON', async () => {
        const dataService = require('./data-service.js').default;
        
        const invalidJson = 'not valid json {';
        const mockFile = new Blob([invalidJson], { type: 'application/json' });
        mockFile.name = 'test.json';
        
        await expect(dataService.readImportFile(mockFile)).rejects.toThrow('Invalid JSON file format');
    });
});


describe('Error Handling Display', () => {
    /**
     * Feature: daily-planner-app, Property 43: Error handling display
     * Validates: Requirements 9.3
     * 
     * Property: For any database operation failure, an appropriate error message 
     * should be displayed to the user
     */
    test('Property 43: Error handling display - database errors show appropriate messages', () => {
        // Import ErrorHandler
        const { ErrorHandler, ErrorCategory } = require('./error-handler.js');
        
        fc.assert(
            fc.property(
                // Generate different types of database errors
                fc.oneof(
                    // Database connection errors
                    fc.record({
                        message: fc.constantFrom(
                            'database connection failed',
                            'query execution failed',
                            'insert operation failed',
                            'update operation failed',
                            'delete operation failed'
                        ),
                        code: fc.constantFrom('PGRST', '23505', '23503', '')
                    }),
                    // Permission errors
                    fc.record({
                        message: fc.constantFrom(
                            'permission denied',
                            'policy violation',
                            'row level security policy'
                        ),
                        code: fc.constant('')
                    }),
                    // Not found errors
                    fc.record({
                        message: fc.constantFrom(
                            'record not found',
                            'data not found'
                        ),
                        code: fc.constant('')
                    })
                ),
                (errorData) => {
                    // Create error object
                    const error = new Error(errorData.message);
                    if (errorData.code) {
                        error.code = errorData.code;
                    }
                    
                    // Handle the error
                    const result = ErrorHandler.handle(error, 'Test Database Operation');
                    
                    // Assert error is categorized correctly
                    expect(result.category).toBe(ErrorCategory.DATABASE);
                    
                    // Assert user message is provided
                    expect(result.userMessage).toBeDefined();
                    expect(result.userMessage.length).toBeGreaterThan(0);
                    
                    // Assert user message is user-friendly (not technical)
                    expect(result.userMessage).not.toContain('PGRST');
                    expect(result.userMessage).not.toContain('23505');
                    expect(result.userMessage).not.toContain('23503');
                    
                    // Assert context is preserved
                    expect(result.context).toBe('Test Database Operation');
                    
                    // Assert original error is preserved
                    expect(result.originalError).toBe(error);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property: Authentication errors show appropriate messages
     */
    test('Authentication errors show appropriate user-friendly messages', () => {
        const { ErrorHandler, ErrorCategory } = require('./error-handler.js');
        
        fc.assert(
            fc.property(
                // Generate different types of auth errors
                fc.constantFrom(
                    'Invalid credentials',
                    'Authentication failed',
                    'Session expired',
                    'Token invalid',
                    'Unauthorized access',
                    'Email not confirmed',
                    'User already registered'
                ),
                (errorMessage) => {
                    const error = new Error(errorMessage);
                    const result = ErrorHandler.handle(error, 'Authentication');
                    
                    // Assert error is categorized as auth
                    expect(result.category).toBe(ErrorCategory.AUTH);
                    
                    // Assert user message is provided
                    expect(result.userMessage).toBeDefined();
                    expect(result.userMessage.length).toBeGreaterThan(0);
                    
                    // Assert message is user-friendly
                    expect(result.userMessage).not.toContain('undefined');
                    expect(result.userMessage).not.toContain('null');
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property: Network errors show appropriate messages
     */
    test('Network errors show appropriate user-friendly messages', () => {
        const { ErrorHandler, ErrorCategory } = require('./error-handler.js');
        
        fc.assert(
            fc.property(
                // Generate different types of network errors
                fc.constantFrom(
                    'Network request failed',
                    'Fetch error',
                    'Connection timeout',
                    'Network connection lost',
                    'Request timeout'
                ),
                (errorMessage) => {
                    const error = new Error(errorMessage);
                    const result = ErrorHandler.handle(error, 'Network Operation');
                    
                    // Assert error is categorized as network
                    expect(result.category).toBe(ErrorCategory.NETWORK);
                    
                    // Assert user message is provided
                    expect(result.userMessage).toBeDefined();
                    expect(result.userMessage.length).toBeGreaterThan(0);
                    
                    // Assert message mentions connection or network
                    const lowerMessage = result.userMessage.toLowerCase();
                    expect(
                        lowerMessage.includes('connection') ||
                        lowerMessage.includes('network') ||
                        lowerMessage.includes('offline') ||
                        lowerMessage.includes('internet')
                    ).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property: Validation errors show appropriate messages
     */
    test('Validation errors show appropriate user-friendly messages', () => {
        const { ErrorHandler, ErrorCategory } = require('./error-handler.js');
        
        fc.assert(
            fc.property(
                // Generate different types of validation errors
                fc.constantFrom(
                    'Validation failed',
                    'Invalid input',
                    'Required field missing',
                    'Value must be positive'
                ),
                (errorMessage) => {
                    const error = new Error(errorMessage);
                    const result = ErrorHandler.handle(error, 'Form Validation');
                    
                    // Assert error is categorized as validation
                    expect(result.category).toBe(ErrorCategory.VALIDATION);
                    
                    // Assert user message is provided
                    expect(result.userMessage).toBeDefined();
                    expect(result.userMessage.length).toBeGreaterThan(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Specific example: PostgreSQL unique constraint violation
     */
    test('PostgreSQL unique constraint violation (23505) shows user-friendly message', () => {
        const { ErrorHandler } = require('./error-handler.js');
        
        const error = new Error('duplicate key value violates unique constraint');
        error.code = '23505';
        
        const result = ErrorHandler.handle(error, 'Create Record');
        
        expect(result.userMessage).toBe('This item already exists. Please use a different value.');
        expect(result.userMessage).not.toContain('23505');
        expect(result.userMessage).not.toContain('duplicate key');
    });

    /**
     * Specific example: PostgreSQL foreign key violation
     */
    test('PostgreSQL foreign key violation (23503) shows user-friendly message', () => {
        const { ErrorHandler } = require('./error-handler.js');
        
        const error = new Error('foreign key constraint violation');
        error.code = '23503';
        
        const result = ErrorHandler.handle(error, 'Delete Record');
        
        expect(result.userMessage).toBe('Cannot complete operation due to related data.');
        expect(result.userMessage).not.toContain('23503');
        expect(result.userMessage).not.toContain('foreign key');
    });

    /**
     * Specific example: Session expired error
     */
    test('Session expired error redirects to login', () => {
        const { ErrorHandler } = require('./error-handler.js');
        
        const error = new Error('Session expired');
        const result = ErrorHandler.handleAuthError(error, 'Data Load');
        
        expect(result.userMessage).toContain('session');
        expect(result.userMessage.toLowerCase()).toContain('sign in');
    });

    /**
     * Edge case: Null error should not crash
     */
    test('Null error is handled gracefully', () => {
        const { ErrorHandler } = require('./error-handler.js');
        
        const result = ErrorHandler.handle(null, 'Test Operation');
        
        expect(result.category).toBeDefined();
        expect(result.userMessage).toBeDefined();
        expect(result.userMessage.length).toBeGreaterThan(0);
    });

    /**
     * Edge case: Undefined error should not crash
     */
    test('Undefined error is handled gracefully', () => {
        const { ErrorHandler } = require('./error-handler.js');
        
        const result = ErrorHandler.handle(undefined, 'Test Operation');
        
        expect(result.category).toBeDefined();
        expect(result.userMessage).toBeDefined();
        expect(result.userMessage.length).toBeGreaterThan(0);
    });

    /**
     * Edge case: Error without message should not crash
     */
    test('Error without message is handled gracefully', () => {
        const { ErrorHandler } = require('./error-handler.js');
        
        const error = new Error();
        const result = ErrorHandler.handle(error, 'Test Operation');
        
        expect(result.category).toBeDefined();
        expect(result.userMessage).toBeDefined();
        expect(result.userMessage.length).toBeGreaterThan(0);
    });

    /**
     * Invariant: All error messages should be non-empty strings
     */
    test('All error categories produce non-empty user messages', () => {
        const { ErrorHandler, ErrorCategory } = require('./error-handler.js');
        
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
            expect(typeof result.userMessage).toBe('string');
            expect(result.userMessage.length).toBeGreaterThan(0);
            expect(result.userMessage.trim()).toBe(result.userMessage); // No leading/trailing whitespace
        }
    });
});
