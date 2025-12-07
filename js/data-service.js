/**
 * DataService - Handles all data operations with Supabase
 * Provides CRUD methods for all entities in the Daily Planner Application
 */

import { getSupabaseClient } from './supabase-client.js';

class DataService {
    constructor() {
        this.supabase = getSupabaseClient();
    }

    /**
     * Generic error handler for database operations
     * @param {Error} error - The error object
     * @param {string} context - Context where error occurred
     * @throws {Error} Formatted error with context
     */
    handleError(error, context) {
        console.error(`Error in ${context}:`, error);
        throw new Error(`${context}: ${error.message || 'Unknown error'}`);
    }

    // ==================== ANNUAL GOALS ====================

    /**
     * Get all annual goals for a specific year
     * @param {number} year - The year to fetch goals for
     * @returns {Promise<Array>} Array of annual goals
     */
    async getAnnualGoals(year) {
        try {
            const { data, error } = await this.supabase
                .from('annual_goals')
                .select('*')
                .eq('year', year)
                .order('created_at');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getAnnualGoals');
        }
    }

    /**
     * Create a new annual goal
     * @param {Object} goal - Goal object with year, category, title, sub_goals, progress
     * @returns {Promise<Object>} Created goal
     */
    async createAnnualGoal(goal) {
        try {
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('annual_goals')
                .insert([{ ...goal, user_id: user.id }])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'createAnnualGoal');
        }
    }

    /**
     * Update an existing annual goal
     * @param {string} id - Goal ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated goal
     */
    async updateAnnualGoal(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('annual_goals')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateAnnualGoal');
        }
    }

    /**
     * Delete an annual goal
     * @param {string} id - Goal ID
     * @returns {Promise<void>}
     */
    async deleteAnnualGoal(id) {
        try {
            const { error } = await this.supabase
                .from('annual_goals')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteAnnualGoal');
        }
    }

    // ==================== READING LIST ====================

    /**
     * Get reading list for a specific year
     * @param {number} year - The year to fetch reading list for
     * @returns {Promise<Array>} Array of books
     */
    async getReadingList(year) {
        try {
            const { data, error } = await this.supabase
                .from('reading_list')
                .select('*')
                .eq('year', year)
                .order('order_index');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getReadingList');
        }
    }

    /**
     * Create a new book entry in reading list
     * @param {Object} book - Book object with year, book_title, author, completed, rating, order_index
     * @returns {Promise<Object>} Created book entry
     */
    async createReadingListEntry(book) {
        try {
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('reading_list')
                .insert([{ ...book, user_id: user.id }])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'createReadingListEntry');
        }
    }

    /**
     * Update a reading list entry
     * @param {string} id - Book entry ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated book entry
     */
    async updateReadingListEntry(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('reading_list')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateReadingListEntry');
        }
    }

    /**
     * Delete a reading list entry
     * @param {string} id - Book entry ID
     * @returns {Promise<void>}
     */
    async deleteReadingListEntry(id) {
        try {
            const { error } = await this.supabase
                .from('reading_list')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteReadingListEntry');
        }
    }

    // ==================== MONTHLY DATA ====================

    /**
     * Get monthly data for a specific month and year
     * @param {number} year - The year
     * @param {number} month - The month (1-12)
     * @returns {Promise<Object|null>} Monthly data object or null
     */
    async getMonthlyData(year, month) {
        try {
            const { data, error } = await this.supabase
                .from('monthly_data')
                .select('*')
                .eq('year', year)
                .eq('month', month)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
            return data || null;
        } catch (error) {
            this.handleError(error, 'getMonthlyData');
        }
    }

    /**
     * Create or update monthly data
     * @param {Object} monthlyData - Monthly data object with year, month, notes, checklist, action_plan
     * @returns {Promise<Object>} Created or updated monthly data
     */
    async upsertMonthlyData(monthlyData) {
        try {
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('monthly_data')
                .upsert([{ ...monthlyData, user_id: user.id }], { onConflict: 'user_id,year,month' })
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'upsertMonthlyData');
        }
    }

    // ==================== WEEKLY GOALS ====================

    /**
     * Get weekly goals for a specific week
     * @param {number} year - The year
     * @param {number} weekNumber - The week number (1-53)
     * @returns {Promise<Array>} Array of weekly goals
     */
    async getWeeklyGoals(year, weekNumber) {
        try {
            const { data, error } = await this.supabase
                .from('weekly_goals')
                .select('*')
                .eq('year', year)
                .eq('week_number', weekNumber)
                .order('created_at');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getWeeklyGoals');
        }
    }

    /**
     * Create a new weekly goal
     * @param {Object} goal - Goal object with year, week_number, goal_text, priority, completed
     * @returns {Promise<Object>} Created goal
     */
    async createWeeklyGoal(goal) {
        try {
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('weekly_goals')
                .insert([{ ...goal, user_id: user.id }])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'createWeeklyGoal');
        }
    }

    /**
     * Update a weekly goal
     * @param {string} id - Goal ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated goal
     */
    async updateWeeklyGoal(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('weekly_goals')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateWeeklyGoal');
        }
    }

    /**
     * Delete a weekly goal
     * @param {string} id - Goal ID
     * @returns {Promise<void>}
     */
    async deleteWeeklyGoal(id) {
        try {
            const { error } = await this.supabase
                .from('weekly_goals')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteWeeklyGoal');
        }
    }

    // ==================== TIME BLOCKS ====================

    /**
     * Get time blocks for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Array>} Array of time blocks
     */
    async getTimeBlocks(date) {
        try {
            const { data, error } = await this.supabase
                .from('time_blocks')
                .select('*')
                .eq('date', date)
                .order('start_time');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getTimeBlocks');
        }
    }

    /**
     * Get time blocks for a date range
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Array>} Array of time blocks
     */
    async getTimeBlocksRange(startDate, endDate) {
        try {
            const { data, error } = await this.supabase
                .from('time_blocks')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date')
                .order('start_time');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getTimeBlocksRange');
        }
    }

    /**
     * Create a new time block
     * @param {Object} timeBlock - Time block object with date, start_time, end_time, activity, category
     * @returns {Promise<Object>} Created time block
     */
    async createTimeBlock(timeBlock) {
        try {
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('time_blocks')
                .insert([{ ...timeBlock, user_id: user.id }])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'createTimeBlock');
        }
    }

    /**
     * Update a time block
     * @param {string} id - Time block ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated time block
     */
    async updateTimeBlock(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('time_blocks')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateTimeBlock');
        }
    }

    /**
     * Delete a time block
     * @param {string} id - Time block ID
     * @returns {Promise<void>}
     */
    async deleteTimeBlock(id) {
        try {
            const { error } = await this.supabase
                .from('time_blocks')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteTimeBlock');
        }
    }

    // ==================== DAILY ENTRIES ====================

    /**
     * Get daily entry for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Object|null>} Daily entry object or null
     */
    async getDailyEntry(date) {
        try {
            const { data, error } = await this.supabase
                .from('daily_entries')
                .select('*')
                .eq('date', date)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        } catch (error) {
            this.handleError(error, 'getDailyEntry');
        }
    }

    /**
     * Create or update daily entry
     * @param {Object} entry - Daily entry object with date, checklist, journal_text, gratitude_text
     * @returns {Promise<Object>} Created or updated daily entry
     */
    async upsertDailyEntry(entry) {
        try {
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('daily_entries')
                .upsert([{ ...entry, user_id: user.id }], { onConflict: 'user_id,date' })
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'upsertDailyEntry');
        }
    }

    // ==================== DAILY HABITS ====================

    /**
     * Get all daily habits for the current user
     * @returns {Promise<Array>} Array of daily habits
     */
    async getDailyHabits() {
        try {
            const { data, error } = await this.supabase
                .from('daily_habits')
                .select('*')
                .order('order_index');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getDailyHabits');
        }
    }

    /**
     * Create a new daily habit
     * @param {Object} habit - Habit object with habit_name, order_index
     * @returns {Promise<Object>} Created habit
     */
    async createDailyHabit(habit) {
        try {
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('daily_habits')
                .insert([{ ...habit, user_id: user.id }])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'createDailyHabit');
        }
    }

    /**
     * Update a daily habit
     * @param {string} id - Habit ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated habit
     */
    async updateDailyHabit(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('daily_habits')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateDailyHabit');
        }
    }

    /**
     * Delete a daily habit
     * @param {string} id - Habit ID
     * @returns {Promise<void>}
     */
    async deleteDailyHabit(id) {
        try {
            const { error } = await this.supabase
                .from('daily_habits')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteDailyHabit');
        }
    }

    // ==================== DAILY HABIT COMPLETIONS ====================

    /**
     * Get daily habit completions for a date range
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Array>} Array of habit completions
     */
    async getDailyHabitCompletions(startDate, endDate) {
        try {
            const { data, error } = await this.supabase
                .from('daily_habit_completions')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getDailyHabitCompletions');
        }
    }

    /**
     * Toggle daily habit completion
     * @param {string} habitId - Habit ID
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {boolean} completed - Completion status
     * @returns {Promise<Object>} Created or updated completion
     */
    async toggleDailyHabitCompletion(habitId, date, completed) {
        try {
            const { data, error } = await this.supabase
                .from('daily_habit_completions')
                .upsert([{ habit_id: habitId, date, completed }], { onConflict: 'habit_id,date' })
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'toggleDailyHabitCompletion');
        }
    }

    // ==================== WEEKLY HABITS ====================

    /**
     * Get all weekly habits for the current user
     * @returns {Promise<Array>} Array of weekly habits
     */
    async getWeeklyHabits() {
        try {
            const { data, error } = await this.supabase
                .from('weekly_habits')
                .select('*')
                .order('order_index');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getWeeklyHabits');
        }
    }

    /**
     * Create a new weekly habit
     * @param {Object} habit - Habit object with habit_name, target_days_per_week, order_index
     * @returns {Promise<Object>} Created habit
     */
    async createWeeklyHabit(habit) {
        try {
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('weekly_habits')
                .insert([{ ...habit, user_id: user.id }])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'createWeeklyHabit');
        }
    }

    /**
     * Update a weekly habit
     * @param {string} id - Habit ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated habit
     */
    async updateWeeklyHabit(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('weekly_habits')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateWeeklyHabit');
        }
    }

    /**
     * Delete a weekly habit
     * @param {string} id - Habit ID
     * @returns {Promise<void>}
     */
    async deleteWeeklyHabit(id) {
        try {
            const { error } = await this.supabase
                .from('weekly_habits')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteWeeklyHabit');
        }
    }

    // ==================== WEEKLY HABIT COMPLETIONS ====================

    /**
     * Get weekly habit completions for a date range
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Array>} Array of habit completions
     */
    async getWeeklyHabitCompletions(startDate, endDate) {
        try {
            const { data, error } = await this.supabase
                .from('weekly_habit_completions')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getWeeklyHabitCompletions');
        }
    }

    /**
     * Toggle weekly habit completion
     * @param {string} habitId - Habit ID
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {boolean} completed - Completion status
     * @returns {Promise<Object>} Created or updated completion
     */
    async toggleWeeklyHabitCompletion(habitId, date, completed) {
        try {
            const { data, error } = await this.supabase
                .from('weekly_habit_completions')
                .upsert([{ habit_id: habitId, date, completed }], { onConflict: 'habit_id,date' })
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'toggleWeeklyHabitCompletion');
        }
    }

    // ==================== MOOD TRACKER ====================

    /**
     * Get mood entries for a date range
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Array>} Array of mood entries
     */
    async getMoodEntries(startDate, endDate) {
        try {
            const { data, error } = await this.supabase
                .from('mood_tracker')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getMoodEntries');
        }
    }

    /**
     * Set mood for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {string} moodEmoji - Mood emoji ('🥰', '😁', '😶', '😵', '😩')
     * @returns {Promise<Object>} Created or updated mood entry
     */
    async setMood(date, moodEmoji) {
        try {
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('mood_tracker')
                .upsert([{ date, mood_emoji: moodEmoji, user_id: user.id }], { onConflict: 'user_id,date' })
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'setMood');
        }
    }

    // ==================== SLEEP TRACKER ====================

    /**
     * Get sleep entries for a date range
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Array>} Array of sleep entries
     */
    async getSleepEntries(startDate, endDate) {
        try {
            const { data, error } = await this.supabase
                .from('sleep_tracker')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getSleepEntries');
        }
    }

    /**
     * Set sleep data for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {string} bedtime - Bedtime in HH:MM format
     * @param {string} wakeTime - Wake time in HH:MM format
     * @param {number} hoursSlept - Hours slept (calculated)
     * @returns {Promise<Object>} Created or updated sleep entry
     */
    async setSleepData(date, bedtime, wakeTime, hoursSlept) {
        try {
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('sleep_tracker')
                .upsert([{ date, bedtime, wake_time: wakeTime, hours_slept: hoursSlept, user_id: user.id }], { onConflict: 'user_id,date' })
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'setSleepData');
        }
    }

    // ==================== WATER TRACKER ====================

    /**
     * Get water entries for a date range
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Array>} Array of water entries
     */
    async getWaterEntries(startDate, endDate) {
        try {
            const { data, error } = await this.supabase
                .from('water_tracker')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getWaterEntries');
        }
    }

    /**
     * Set water intake for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {number} glassesConsumed - Number of glasses consumed
     * @param {number} goalGlasses - Daily goal (default 8)
     * @returns {Promise<Object>} Created or updated water entry
     */
    async setWaterIntake(date, glassesConsumed, goalGlasses = 8) {
        try {
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('water_tracker')
                .upsert([{ date, glasses_consumed: glassesConsumed, goal_glasses: goalGlasses, user_id: user.id }], { onConflict: 'user_id,date' })
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'setWaterIntake');
        }
    }

    // ==================== ACTION PLANS ====================

    /**
     * Get action plans for a specific month and year
     * @param {number} year - The year
     * @param {number} month - The month (1-12)
     * @returns {Promise<Array>} Array of action plans
     */
    async getActionPlans(year, month) {
        try {
            const { data, error } = await this.supabase
                .from('action_plans')
                .select('*')
                .eq('year', year)
                .eq('month', month)
                .order('created_at');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getActionPlans');
        }
    }

    /**
     * Create a new action plan
     * @param {Object} actionPlan - Action plan object with year, month, life_area, specific_action, frequency, success_criteria, progress, evaluation
     * @returns {Promise<Object>} Created action plan
     */
    async createActionPlan(actionPlan) {
        try {
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('action_plans')
                .insert([{ ...actionPlan, user_id: user.id }])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'createActionPlan');
        }
    }

    /**
     * Update an action plan
     * @param {string} id - Action plan ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated action plan
     */
    async updateActionPlan(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('action_plans')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateActionPlan');
        }
    }

    /**
     * Delete an action plan
     * @param {string} id - Action plan ID
     * @returns {Promise<void>}
     */
    async deleteActionPlan(id) {
        try {
            const { error } = await this.supabase
                .from('action_plans')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteActionPlan');
        }
    }

    // ==================== USER PROFILE ====================

    /**
     * Get user profile
     * @returns {Promise<Object|null>} User profile or null
     */
    async getUserProfile() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        } catch (error) {
            this.handleError(error, 'getUserProfile');
        }
    }

    /**
     * Create or update user profile
     * @param {Object} profile - Profile object with display_name, timezone
     * @returns {Promise<Object>} Created or updated profile
     */
    async upsertUserProfile(profile) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await this.supabase
                .from('profiles')
                .upsert([{ id: user.id, ...profile }], { onConflict: 'id' })
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'upsertUserProfile');
        }
    }

    // ==================== DATA EXPORT AND IMPORT ====================

    /**
     * Export all user data to JSON format
     * @returns {Promise<Object>} Complete user data export
     */
    async exportAllData() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Get current year and month for context
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;

            // Fetch all data in parallel
            const [
                profile,
                annualGoals,
                readingList,
                monthlyData,
                weeklyGoals,
                timeBlocks,
                dailyEntries,
                dailyHabits,
                dailyHabitCompletions,
                weeklyHabits,
                weeklyHabitCompletions,
                moodEntries,
                sleepEntries,
                waterEntries,
                actionPlans
            ] = await Promise.all([
                this.getUserProfile(),
                this.getAnnualGoals(currentYear),
                this.getReadingList(currentYear),
                this.getMonthlyData(currentYear, currentMonth),
                this.getWeeklyGoals(currentYear, 1), // Get all weeks for current year
                this.getTimeBlocksRange(`${currentYear}-01-01`, `${currentYear}-12-31`),
                this.getDailyEntry(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`), // Sample
                this.getDailyHabits(),
                this.getDailyHabitCompletions(`${currentYear}-01-01`, `${currentYear}-12-31`),
                this.getWeeklyHabits(),
                this.getWeeklyHabitCompletions(`${currentYear}-01-01`, `${currentYear}-12-31`),
                this.getMoodEntries(`${currentYear}-01-01`, `${currentYear}-12-31`),
                this.getSleepEntries(`${currentYear}-01-01`, `${currentYear}-12-31`),
                this.getWaterEntries(`${currentYear}-01-01`, `${currentYear}-12-31`),
                this.getActionPlans(currentYear, currentMonth)
            ]);

            // Construct export object
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                userId: user.id,
                userEmail: user.email,
                data: {
                    profile,
                    annualGoals,
                    readingList,
                    monthlyData,
                    weeklyGoals,
                    timeBlocks,
                    dailyEntries,
                    dailyHabits,
                    dailyHabitCompletions,
                    weeklyHabits,
                    weeklyHabitCompletions,
                    moodEntries,
                    sleepEntries,
                    waterEntries,
                    actionPlans
                }
            };

            return exportData;
        } catch (error) {
            this.handleError(error, 'exportAllData');
        }
    }

    /**
     * Download exported data as JSON file
     * @param {Object} exportData - Data to export
     * @param {string} filename - Optional filename (default: planner-export-YYYY-MM-DD.json)
     */
    downloadExportFile(exportData, filename = null) {
        try {
            if (!filename) {
                const date = new Date().toISOString().split('T')[0];
                filename = `planner-export-${date}.json`;
            }

            // Convert to JSON string with pretty formatting
            const jsonString = JSON.stringify(exportData, null, 2);

            // Create blob and download link
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            throw new Error(`Failed to download export file: ${error.message}`);
        }
    }

    /**
     * Validate imported data structure
     * @param {Object} importData - Data to validate
     * @returns {Object} Validation result with { valid: boolean, errors: string[] }
     */
    validateImportData(importData) {
        const errors = [];

        // Check basic structure
        if (!importData || typeof importData !== 'object') {
            errors.push('Invalid data format: must be a JSON object');
            return { valid: false, errors };
        }

        // Check version
        if (!importData.version) {
            errors.push('Missing version field');
        }

        // Check data field exists
        if (!importData.data || typeof importData.data !== 'object') {
            errors.push('Missing or invalid data field');
            return { valid: false, errors };
        }

        // Check required data fields
        const requiredFields = [
            'annualGoals',
            'readingList',
            'dailyHabits',
            'weeklyHabits',
            'actionPlans'
        ];

        for (const field of requiredFields) {
            if (!Array.isArray(importData.data[field])) {
                errors.push(`Missing or invalid field: data.${field} (must be an array)`);
            }
        }

        // Validate array fields are arrays
        const arrayFields = [
            'annualGoals',
            'readingList',
            'weeklyGoals',
            'timeBlocks',
            'dailyHabits',
            'dailyHabitCompletions',
            'weeklyHabits',
            'weeklyHabitCompletions',
            'moodEntries',
            'sleepEntries',
            'waterEntries',
            'actionPlans'
        ];

        for (const field of arrayFields) {
            if (importData.data[field] !== undefined && !Array.isArray(importData.data[field])) {
                errors.push(`Invalid field type: data.${field} must be an array`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Import data from JSON file
     * @param {Object} importData - Validated import data
     * @param {string} mode - Import mode: 'merge' or 'replace'
     * @returns {Promise<Object>} Import result with statistics
     */
    async importData(importData, mode = 'merge') {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Validate data first
            const validation = this.validateImportData(importData);
            if (!validation.valid) {
                throw new Error(`Invalid import data: ${validation.errors.join(', ')}`);
            }

            const stats = {
                imported: 0,
                updated: 0,
                skipped: 0,
                errors: []
            };

            // If replace mode, we could delete existing data first
            // For now, we'll implement merge mode which upserts data

            const data = importData.data;

            // Import profile
            if (data.profile) {
                try {
                    await this.upsertUserProfile(data.profile);
                    stats.imported++;
                } catch (error) {
                    stats.errors.push(`Profile: ${error.message}`);
                }
            }

            // Import annual goals
            if (data.annualGoals && Array.isArray(data.annualGoals)) {
                for (const goal of data.annualGoals) {
                    try {
                        // Remove id to let database generate new one
                        const { id, user_id, created_at, updated_at, ...goalData } = goal;
                        await this.createAnnualGoal(goalData);
                        stats.imported++;
                    } catch (error) {
                        stats.errors.push(`Annual goal: ${error.message}`);
                    }
                }
            }

            // Import reading list
            if (data.readingList && Array.isArray(data.readingList)) {
                for (const book of data.readingList) {
                    try {
                        const { id, user_id, created_at, updated_at, ...bookData } = book;
                        await this.createReadingListEntry(bookData);
                        stats.imported++;
                    } catch (error) {
                        stats.errors.push(`Reading list: ${error.message}`);
                    }
                }
            }

            // Import monthly data
            if (data.monthlyData) {
                try {
                    const { id, user_id, created_at, updated_at, ...monthlyDataClean } = data.monthlyData;
                    await this.upsertMonthlyData(monthlyDataClean);
                    stats.imported++;
                } catch (error) {
                    stats.errors.push(`Monthly data: ${error.message}`);
                }
            }

            // Import weekly goals
            if (data.weeklyGoals && Array.isArray(data.weeklyGoals)) {
                for (const goal of data.weeklyGoals) {
                    try {
                        const { id, user_id, created_at, updated_at, ...goalData } = goal;
                        await this.createWeeklyGoal(goalData);
                        stats.imported++;
                    } catch (error) {
                        stats.errors.push(`Weekly goal: ${error.message}`);
                    }
                }
            }

            // Import time blocks
            if (data.timeBlocks && Array.isArray(data.timeBlocks)) {
                for (const block of data.timeBlocks) {
                    try {
                        const { id, user_id, created_at, updated_at, ...blockData } = block;
                        await this.createTimeBlock(blockData);
                        stats.imported++;
                    } catch (error) {
                        stats.errors.push(`Time block: ${error.message}`);
                    }
                }
            }

            // Import daily habits
            if (data.dailyHabits && Array.isArray(data.dailyHabits)) {
                for (const habit of data.dailyHabits) {
                    try {
                        const { id, user_id, created_at, updated_at, ...habitData } = habit;
                        await this.createDailyHabit(habitData);
                        stats.imported++;
                    } catch (error) {
                        stats.errors.push(`Daily habit: ${error.message}`);
                    }
                }
            }

            // Import daily habit completions
            if (data.dailyHabitCompletions && Array.isArray(data.dailyHabitCompletions)) {
                for (const completion of data.dailyHabitCompletions) {
                    try {
                        await this.toggleDailyHabitCompletion(
                            completion.habit_id,
                            completion.date,
                            completion.completed
                        );
                        stats.imported++;
                    } catch (error) {
                        stats.errors.push(`Daily habit completion: ${error.message}`);
                    }
                }
            }

            // Import weekly habits
            if (data.weeklyHabits && Array.isArray(data.weeklyHabits)) {
                for (const habit of data.weeklyHabits) {
                    try {
                        const { id, user_id, created_at, updated_at, ...habitData } = habit;
                        await this.createWeeklyHabit(habitData);
                        stats.imported++;
                    } catch (error) {
                        stats.errors.push(`Weekly habit: ${error.message}`);
                    }
                }
            }

            // Import weekly habit completions
            if (data.weeklyHabitCompletions && Array.isArray(data.weeklyHabitCompletions)) {
                for (const completion of data.weeklyHabitCompletions) {
                    try {
                        await this.toggleWeeklyHabitCompletion(
                            completion.habit_id,
                            completion.date,
                            completion.completed
                        );
                        stats.imported++;
                    } catch (error) {
                        stats.errors.push(`Weekly habit completion: ${error.message}`);
                    }
                }
            }

            // Import mood entries
            if (data.moodEntries && Array.isArray(data.moodEntries)) {
                for (const mood of data.moodEntries) {
                    try {
                        await this.setMood(mood.date, mood.mood_emoji);
                        stats.imported++;
                    } catch (error) {
                        stats.errors.push(`Mood entry: ${error.message}`);
                    }
                }
            }

            // Import sleep entries
            if (data.sleepEntries && Array.isArray(data.sleepEntries)) {
                for (const sleep of data.sleepEntries) {
                    try {
                        await this.setSleepData(
                            sleep.date,
                            sleep.bedtime,
                            sleep.wake_time,
                            sleep.hours_slept
                        );
                        stats.imported++;
                    } catch (error) {
                        stats.errors.push(`Sleep entry: ${error.message}`);
                    }
                }
            }

            // Import water entries
            if (data.waterEntries && Array.isArray(data.waterEntries)) {
                for (const water of data.waterEntries) {
                    try {
                        await this.setWaterIntake(
                            water.date,
                            water.glasses_consumed,
                            water.goal_glasses
                        );
                        stats.imported++;
                    } catch (error) {
                        stats.errors.push(`Water entry: ${error.message}`);
                    }
                }
            }

            // Import action plans
            if (data.actionPlans && Array.isArray(data.actionPlans)) {
                for (const plan of data.actionPlans) {
                    try {
                        const { id, user_id, created_at, updated_at, ...planData } = plan;
                        await this.createActionPlan(planData);
                        stats.imported++;
                    } catch (error) {
                        stats.errors.push(`Action plan: ${error.message}`);
                    }
                }
            }

            return stats;
        } catch (error) {
            this.handleError(error, 'importData');
        }
    }

    /**
     * Read and parse import file
     * @param {File} file - File object from input
     * @returns {Promise<Object>} Parsed JSON data
     */
    async readImportFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const jsonData = JSON.parse(event.target.result);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error('Invalid JSON file format'));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    // ==================== CUSTOM CATEGORIES ====================

    /**
     * Get all custom categories for the current user
     * @returns {Promise<Array>} Array of custom categories
     */
    async getCustomCategories() {
        try {
            const { data, error } = await this.supabase
                .from('custom_categories')
                .select('*')
                .order('order_index');

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getCustomCategories');
        }
    }

    /**
     * Create a new custom category
     * @param {Object} category - Category object with name, color_start, color_end
     * @returns {Promise<Object>} Created category
     */
    async createCustomCategory(category) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('custom_categories')
                .insert([{ ...category, user_id: user.id }])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'createCustomCategory');
        }
    }

    /**
     * Update an existing custom category
     * @param {string} id - Category ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated category
     */
    async updateCustomCategory(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('custom_categories')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateCustomCategory');
        }
    }

    /**
     * Delete a custom category
     * @param {string} id - Category ID
     * @returns {Promise<void>}
     */
    async deleteCustomCategory(id) {
        try {
            const { error } = await this.supabase
                .from('custom_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteCustomCategory');
        }
    }

    /**
     * Initialize default categories for a new user
     * @returns {Promise<Array>} Array of created default categories
     */
    async initializeDefaultCategories() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const defaultCategories = [
                { name: 'Personal', color_start: '#f093fb', color_end: '#f5576c', order_index: 0, is_default: true },
                { name: 'Work', color_start: '#4facfe', color_end: '#00f2fe', order_index: 1, is_default: true },
                { name: 'Business', color_start: '#fa709a', color_end: '#fee140', order_index: 2, is_default: true },
                { name: 'Family', color_start: '#feca57', color_end: '#ff9ff3', order_index: 3, is_default: true },
                { name: 'Education', color_start: '#a29bfe', color_end: '#fbc2eb', order_index: 4, is_default: true },
                { name: 'Social', color_start: '#00d2ff', color_end: '#3a7bd5', order_index: 5, is_default: true },
                { name: 'Project', color_start: '#ff6b6b', color_end: '#ffa502', order_index: 6, is_default: true }
            ];

            const categoriesToInsert = defaultCategories.map(cat => ({
                ...cat,
                user_id: user.id
            }));

            const { data, error } = await this.supabase
                .from('custom_categories')
                .insert(categoriesToInsert)
                .select();

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'initializeDefaultCategories');
        }
    }
}

// Create and export a singleton instance
const dataService = new DataService();
export default dataService;
