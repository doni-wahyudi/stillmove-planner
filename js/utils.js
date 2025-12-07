/**
 * Utility functions for the Daily Planner Application
 */

/**
 * Calculate progress percentage from completed sub-goals
 * Property 15: Goal progress calculation
 * For any annual goal with sub-goals, the progress percentage should equal (completed sub-goals / total sub-goals) × 100
 * 
 * @param {Array} subGoals - Array of sub-goal objects with {text, completed} properties
 * @returns {number} Progress percentage (0-100)
 */
export function calculateGoalProgress(subGoals) {
    // Handle empty or invalid input
    if (!subGoals || !Array.isArray(subGoals) || subGoals.length === 0) {
        return 0;
    }
    
    // Count completed sub-goals
    const completedCount = subGoals.filter(subGoal => subGoal.completed === true).length;
    
    // Calculate percentage
    const progress = (completedCount / subGoals.length) * 100;
    
    // Round to 2 decimal places
    return Math.round(progress * 100) / 100;
}

/**
 * Format date to YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get the number of days in a month
 * Property 31: Calendar day count
 * For any month and year, the displayed calendar should show the correct number of days for that month
 * 
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {number} Number of days in the month
 */
export function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

/**
 * Get category color mapping
 * Property 32: Category color mapping
 * For any activity category from the seven predefined categories, there should be a valid color assigned
 * 
 * @param {string} category - Category name
 * @returns {string} Color code (gradient or hex)
 */
export function getCategoryColor(category) {
    const CATEGORY_COLORS = {
        'Personal': '#f093fb',
        'Work': '#4facfe',
        'Business': '#fa709a',
        'Family': '#feca57',
        'Education': '#a29bfe',
        'Social': '#00d2ff',
        'Project': '#ff6b6b'
    };
    
    return CATEGORY_COLORS[category] || '#999999'; // Default gray for unknown categories
}

/**
 * Get category gradient for visual elements
 * @param {string} category - Category name
 * @returns {string} CSS gradient string
 */
export function getCategoryGradient(category) {
    const CATEGORY_GRADIENTS = {
        'Personal': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'Work': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'Business': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'Family': 'linear-gradient(135deg, #feca57 0%, #ff9ff3 100%)',
        'Education': 'linear-gradient(135deg, #a29bfe 0%, #fbc2eb 100%)',
        'Social': 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
        'Project': 'linear-gradient(135deg, #ff6b6b 0%, #ffa502 100%)'
    };
    
    return CATEGORY_GRADIENTS[category] || 'linear-gradient(135deg, #999999 0%, #666666 100%)';
}

/**
 * Calculate sleep duration in hours
 * @param {string} bedtime - Bedtime in HH:MM format
 * @param {string} wakeTime - Wake time in HH:MM format
 * @returns {number} Sleep duration in hours
 */
export function calculateSleepDuration(bedtime, wakeTime) {
    const [bedHour, bedMin] = bedtime.split(':').map(Number);
    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    
    let bedMinutes = bedHour * 60 + bedMin;
    let wakeMinutes = wakeHour * 60 + wakeMin;
    
    // If wake time is earlier than bedtime, assume it's the next day
    if (wakeMinutes < bedMinutes) {
        wakeMinutes += 24 * 60;
    }
    
    const durationMinutes = wakeMinutes - bedMinutes;
    return Math.round((durationMinutes / 60) * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate water intake percentage
 * @param {number} glassesConsumed - Number of glasses consumed
 * @param {number} goalGlasses - Daily goal
 * @returns {number} Percentage (0-100+)
 */
export function calculateWaterIntakePercentage(glassesConsumed, goalGlasses) {
    if (!goalGlasses || goalGlasses === 0) {
        return 0;
    }
    return Math.round((glassesConsumed / goalGlasses) * 100 * 100) / 100;
}

/**
 * Calculate habit progress for a period
 * @param {Array} completions - Array of completion objects with {date, completed} properties
 * @param {number} days - Number of days in the period
 * @returns {number} Progress percentage (0-100)
 */
export function calculateHabitProgress(completions, days) {
    if (!completions || !Array.isArray(completions) || days === 0) {
        return 0;
    }
    
    const completedCount = completions.filter(c => c.completed === true).length;
    return Math.round((completedCount / days) * 100 * 100) / 100;
}

/**
 * Get the days of the week starting from Sunday
 * Property 33: Weekly view structure
 * For any week, the weekly view should display exactly seven consecutive days starting from Sunday
 * 
 * @param {Date} weekStart - The start date of the week (should be a Sunday)
 * @returns {Array<Date>} Array of 7 consecutive dates starting from Sunday
 */
export function getWeekDays(weekStart) {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        days.push(date);
    }
    return days;
}

/**
 * Get time slots for a day
 * Property 34: Time slot count
 * For any day in weekly view, there should be exactly 38 time slots (30-minute increments from 4:00 to 23:00)
 * 
 * @returns {Array<Object>} Array of time slot objects with {hour, minute} properties
 */
export function getTimeSlots() {
    const START_HOUR = 4;
    const END_HOUR = 23;
    const SLOT_MINUTES = 30;
    
    const slots = [];
    const totalHours = END_HOUR - START_HOUR;
    const slotsPerHour = 60 / SLOT_MINUTES;
    const totalSlots = totalHours * slotsPerHour;
    
    for (let slot = 0; slot < totalSlots; slot++) {
        const hour = START_HOUR + Math.floor(slot / slotsPerHour);
        const minute = (slot % slotsPerHour) * SLOT_MINUTES;
        slots.push({ hour, minute });
    }
    
    return slots;
}

/**
 * Validate time block start time
 * Property 30: Time block validation
 * For any time block, the start time should be in 30-minute increments between 4:00 and 23:00
 * 
 * @param {string} timeStr - Time string in HH:MM format
 * @returns {boolean} True if valid, false otherwise
 */
export function validateTimeBlockTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') {
        return false;
    }
    
    const parts = timeStr.split(':');
    if (parts.length !== 2) {
        return false;
    }
    
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    
    // Check if hour is between 4 and 23
    if (hour < 4 || hour > 23) {
        return false;
    }
    
    // Check if minute is in 30-minute increments (0 or 30)
    if (minute !== 0 && minute !== 30) {
        return false;
    }
    
    // Special case: 23:00 is valid, but 23:30 would be outside range
    if (hour === 23 && minute === 30) {
        return false;
    }
    
    return true;
}


/**
 * Calculate habit progress for a specific period
 * Properties 16-19: Habit progress calculation for 7, 14, 21, 28 days
 * For any daily habit and N-day period, the progress percentage should equal (completed days / N) × 100
 * 
 * @param {Array} completions - Array of completion objects with {date, completed} properties
 * @param {number} days - Number of days in the period (7, 14, 21, or 28)
 * @returns {number} Progress percentage (0-100)
 */
export function calculateHabitProgressForDays(completions, days) {
    if (!completions || !Array.isArray(completions) || days === 0) {
        return 0;
    }
    
    // Filter completions that are marked as completed
    const completedCount = completions.filter(c => c.completed === true).length;
    
    // Calculate percentage
    const progress = (completedCount / days) * 100;
    
    // Round to 2 decimal places
    return Math.round(progress * 100) / 100;
}

/**
 * Calculate monthly habit progress
 * Property 20: Monthly habit progress calculation
 * For any daily habit and month, the monthly progress percentage should equal (completed days in month / total days in month) × 100
 * 
 * @param {Array} completions - Array of completion objects with {date, completed} properties
 * @param {number} totalDaysInMonth - Total days in the month
 * @returns {number} Progress percentage (0-100)
 */
export function calculateMonthlyHabitProgress(completions, totalDaysInMonth) {
    if (!completions || !Array.isArray(completions) || totalDaysInMonth === 0) {
        return 0;
    }
    
    // Filter completions that are marked as completed
    const completedCount = completions.filter(c => c.completed === true).length;
    
    // Calculate percentage
    const progress = (completedCount / totalDaysInMonth) * 100;
    
    // Round to 2 decimal places
    return Math.round(progress * 100) / 100;
}

/**
 * Calculate daily completion percentage
 * Property 21: Daily completion percentage
 * For any date with habits, the daily completion percentage should equal (completed habits / total habits) × 100
 * 
 * @param {Array} completions - Array of completion objects for a specific date
 * @param {number} totalHabits - Total number of habits
 * @returns {number} Completion percentage (0-100)
 */
export function calculateDailyCompletionPercentage(completions, totalHabits) {
    if (!completions || !Array.isArray(completions) || totalHabits === 0) {
        return 0;
    }
    
    // Filter completions that are marked as completed
    const completedCount = completions.filter(c => c.completed === true).length;
    
    // Calculate percentage
    const percentage = (completedCount / totalHabits) * 100;
    
    // Round to 2 decimal places
    return Math.round(percentage * 100) / 100;
}

/**
 * Format month and year for display
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {string} Formatted month and year (e.g., "January 2025")
 */
export function formatMonthYear(year, month) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return `${monthNames[month - 1]} ${year}`;
}

/**
 * Debounce function to limit the rate at which a function can fire
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Pomodoro Timer Utility Functions
 */

/**
 * Initialize a Pomodoro timer
 * Property 57: Timer initialization
 * For any Pomodoro session start, the timer should begin counting down from 25 minutes (1500 seconds)
 * 
 * @returns {Object} Initial timer state
 */
export function initializePomodoroTimer() {
    return {
        mode: 'focus',
        timeRemaining: 1500, // 25 minutes in seconds
        sessionCount: 0,
        isRunning: false,
        isPaused: false
    };
}

/**
 * Complete a Pomodoro session and transition to next mode
 * Property 58: Session completion and break transition
 * Property 59: Long break after four sessions
 * For any completed Pomodoro session, the system should notify the user and automatically start a break timer
 * 
 * @param {Object} timer - Current timer state
 * @returns {Object} Updated timer state
 */
export function completePomodoroSession(timer) {
    if (timer.mode === 'focus') {
        // Focus session completed
        const newSessionCount = timer.sessionCount + 1;
        
        // Determine next break type
        let nextMode, nextDuration;
        if (newSessionCount % 4 === 0) {
            // Long break after 4 sessions
            nextMode = 'longBreak';
            nextDuration = 900; // 15 minutes in seconds
        } else {
            // Short break
            nextMode = 'shortBreak';
            nextDuration = 300; // 5 minutes in seconds
        }
        
        return {
            mode: nextMode,
            timeRemaining: nextDuration,
            sessionCount: newSessionCount,
            isRunning: true,
            isPaused: false,
            notificationShown: true
        };
    } else {
        // Break completed, return to focus mode
        return {
            mode: 'focus',
            timeRemaining: 1500, // 25 minutes
            sessionCount: timer.sessionCount,
            isRunning: false,
            isPaused: false,
            notificationShown: true
        };
    }
}

/**
 * Pause a Pomodoro timer
 * Property 60: Pause and resume
 * For any paused timer, resuming should continue from the paused time
 * 
 * @param {Object} timer - Current timer state
 * @returns {Object} Updated timer state
 */
export function pausePomodoroTimer(timer) {
    return {
        ...timer,
        isPaused: true,
        isRunning: true
    };
}

/**
 * Resume a paused Pomodoro timer
 * Property 60: Pause and resume
 * For any paused timer, resuming should continue from the paused time
 * 
 * @param {Object} timer - Current timer state
 * @returns {Object} Updated timer state
 */
export function resumePomodoroTimer(timer) {
    return {
        ...timer,
        isPaused: false,
        isRunning: true
    };
}

/**
 * Reset a Pomodoro timer to initial state
 * Property 61: Timer reset
 * For any timer reset, the timer should return to initial state and clear the current session
 * 
 * @param {Object} timer - Current timer state
 * @returns {Object} Reset timer state
 */
export function resetPomodoroTimer(timer) {
    return {
        mode: 'focus',
        timeRemaining: 1500, // 25 minutes
        isRunning: false,
        isPaused: false,
        sessionCount: timer.sessionCount // Preserve session count
    };
}
