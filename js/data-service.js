/**
 * DataService - Handles all data operations with Supabase
 * Provides CRUD methods for all entities in the Daily Planner Application
 * Now with cache-first strategy for offline support and reduced API calls
 */

import { getSupabaseClient } from './supabase-client.js';
import cacheService, { STORES } from './cache-service.js';

// Map table names to cache store names
const TABLE_TO_STORE = {
    'annual_goals': STORES.goals,
    'habits': STORES.habits,
    'habit_logs': STORES.habitLogs,
    'time_blocks': STORES.timeBlocks,
    'categories': STORES.categories,
    'reading_list': STORES.readingList,
    'user_profiles': STORES.userProfile
};

class DataService {
    constructor() {
        this.supabase = getSupabaseClient();
        this.cacheEnabled = true;
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

    /**
     * Get data with cache-first strategy
     * Returns cached data immediately, then syncs with server in background
     */
    async getCachedOrFetch(storeName, fetchFn, cacheKey = null) {
        try {
            // Try to get from cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(storeName);
                if (cached && cached.length > 0) {
                    console.log(`[Cache] Returning ${cached.length} items from ${storeName}`);
                    
                    // Sync in background if online
                    if (cacheService.online) {
                        this.syncInBackground(storeName, fetchFn);
                    }
                    
                    return cached;
                }
            }
        } catch (e) {
            console.warn('[Cache] Failed to read cache:', e);
        }

        // Fetch from server
        const data = await fetchFn();
        
        // Update cache
        if (this.cacheEnabled && data) {
            try {
                await cacheService.putAll(storeName, data);
            } catch (e) {
                console.warn('[Cache] Failed to update cache:', e);
            }
        }
        
        return data;
    }

    /**
     * Sync data in background without blocking
     */
    async syncInBackground(storeName, fetchFn) {
        setTimeout(async () => {
            try {
                const freshData = await fetchFn();
                if (freshData) {
                    await cacheService.putAll(storeName, freshData);
                    console.log(`[Cache] Background sync complete for ${storeName}`);
                }
            } catch (e) {
                console.warn('[Cache] Background sync failed:', e);
            }
        }, 100);
    }

    /**
     * Save data with write-through cache
     * Writes to cache immediately, then syncs to server
     */
    async saveWithCache(storeName, item, serverFn) {
        // Save to cache immediately for instant UI update
        if (this.cacheEnabled && item) {
            try {
                await cacheService.put(storeName, item);
            } catch (e) {
                console.warn('[Cache] Failed to cache item:', e);
            }
        }

        // If offline, queue for later sync
        if (!cacheService.online) {
            console.log('[Cache] Offline - queuing operation');
            return item;
        }

        // Sync to server
        return await serverFn();
    }

    /**
     * Direct database operations (used by cache sync)
     */
    async createDirect(table, data) {
        const { data: result, error } = await this.supabase
            .from(table)
            .insert([data])
            .select();
        if (error) throw error;
        return result[0];
    }

    async updateDirect(table, id, data) {
        const { data: result, error } = await this.supabase
            .from(table)
            .update(data)
            .eq('id', id)
            .select();
        if (error) throw error;
        return result[0];
    }

    async deleteDirect(table, id) {
        const { error } = await this.supabase
            .from(table)
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    // ==================== ANNUAL GOALS ====================

    /**
     * Get all annual goals for a specific year
     * @param {number} year - The year to fetch goals for
     * @returns {Promise<Array>} Array of annual goals
     */
    async getAnnualGoals(year) {
        const fetchFn = async () => {
            const { data, error } = await this.supabase
                .from('annual_goals')
                .select('*')
                .eq('year', year)
                .order('created_at');

            if (error) throw error;
            return data || [];
        };

        try {
            // For year-specific queries, filter cached data
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.goals);
                const yearData = cached.filter(g => g.year === year);
                if (yearData.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.goals, async () => {
                            const { data } = await this.supabase.from('annual_goals').select('*');
                            return data;
                        });
                    }
                    return yearData;
                }
            }
            
            const data = await fetchFn();
            if (this.cacheEnabled && data) {
                await cacheService.putAll(STORES.goals, data);
            }
            return data;
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
            
            const goalWithUser = { ...goal, user_id: user.id };
            
            // If offline, create with temp ID and queue
            if (!cacheService.online) {
                const tempGoal = { 
                    ...goalWithUser, 
                    id: `temp_${Date.now()}`,
                    created_at: new Date().toISOString()
                };
                await cacheService.put(STORES.goals, tempGoal);
                await cacheService.addPendingSync({
                    type: 'create',
                    store: 'annual_goals',
                    data: goalWithUser
                });
                return tempGoal;
            }
            
            const { data, error } = await this.supabase
                .from('annual_goals')
                .insert([goalWithUser])
                .select();

            if (error) throw error;
            
            // Update cache
            if (this.cacheEnabled && data[0]) {
                await cacheService.put(STORES.goals, data[0]);
            }
            
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
            // Update cache immediately
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.goals, id);
                if (cached) {
                    await cacheService.put(STORES.goals, { ...cached, ...updates });
                }
            }
            
            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'update',
                    store: 'annual_goals',
                    itemId: id,
                    data: updates
                });
                const cached = await cacheService.get(STORES.goals, id);
                return cached;
            }
            
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
            // Delete from cache immediately
            if (this.cacheEnabled) {
                await cacheService.delete(STORES.goals, id);
            }
            
            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'delete',
                    store: 'annual_goals',
                    itemId: id
                });
                return;
            }
            
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
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.readingList);
                const yearData = cached.filter(b => b.year === year);
                if (yearData.length > 0 || cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.readingList, async () => {
                            const { data } = await this.supabase.from('reading_list').select('*');
                            return data;
                        });
                    }
                    return yearData.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
                }
            }
            
            const { data, error } = await this.supabase
                .from('reading_list')
                .select('*')
                .eq('year', year)
                .order('order_index');

            if (error) throw error;
            
            if (this.cacheEnabled && data) {
                await cacheService.putAll(STORES.readingList, data);
            }
            
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
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const bookWithUser = { ...book, user_id: user.id };
            
            if (!cacheService.online) {
                const tempBook = { ...bookWithUser, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await cacheService.put(STORES.readingList, tempBook);
                await cacheService.addPendingSync({ type: 'create', store: 'reading_list', data: bookWithUser });
                return tempBook;
            }
            
            const { data, error } = await this.supabase
                .from('reading_list')
                .insert([bookWithUser])
                .select();

            if (error) throw error;
            if (this.cacheEnabled && data[0]) await cacheService.put(STORES.readingList, data[0]);
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
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.readingList, id);
                if (cached) await cacheService.put(STORES.readingList, { ...cached, ...updates });
            }
            
            if (!cacheService.online) {
                await cacheService.addPendingSync({ type: 'update', store: 'reading_list', itemId: id, data: updates });
                return await cacheService.get(STORES.readingList, id);
            }
            
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
            if (this.cacheEnabled) await cacheService.delete(STORES.readingList, id);
            
            if (!cacheService.online) {
                await cacheService.addPendingSync({ type: 'delete', store: 'reading_list', itemId: id });
                return;
            }
            
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
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.monthlyData);
                const found = cached.find(d => d.year === year && d.month === month);
                if (found) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.monthlyData, async () => {
                            const { data } = await this.supabase.from('monthly_data').select('*');
                            return data;
                        });
                    }
                    return found;
                }
            }
            
            const { data, error } = await this.supabase
                .from('monthly_data')
                .select('*')
                .eq('year', year)
                .eq('month', month)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (this.cacheEnabled && data) await cacheService.put(STORES.monthlyData, data);
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
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const dataWithUser = { ...monthlyData, user_id: user.id };
            
            if (!cacheService.online) {
                const tempData = { ...dataWithUser, id: dataWithUser.id || `temp_${Date.now()}` };
                await cacheService.put(STORES.monthlyData, tempData);
                await cacheService.addPendingSync({ type: 'create', store: 'monthly_data', data: dataWithUser });
                return tempData;
            }
            
            const { data, error } = await this.supabase
                .from('monthly_data')
                .upsert([dataWithUser], { onConflict: 'user_id,year,month' })
                .select();

            if (error) throw error;
            if (this.cacheEnabled && data[0]) await cacheService.put(STORES.monthlyData, data[0]);
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
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.weeklyGoals);
                const weekData = cached.filter(g => g.year === year && g.week_number === weekNumber);
                if (weekData.length > 0 || cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.weeklyGoals, async () => {
                            const { data } = await this.supabase.from('weekly_goals').select('*');
                            return data;
                        });
                    }
                    return weekData;
                }
            }
            
            const { data, error } = await this.supabase
                .from('weekly_goals')
                .select('*')
                .eq('year', year)
                .eq('week_number', weekNumber)
                .order('created_at');

            if (error) throw error;
            if (this.cacheEnabled && data) await cacheService.putAll(STORES.weeklyGoals, data);
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
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const goalWithUser = { ...goal, user_id: user.id };
            
            if (!cacheService.online) {
                const tempGoal = { ...goalWithUser, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await cacheService.put(STORES.weeklyGoals, tempGoal);
                await cacheService.addPendingSync({ type: 'create', store: 'weekly_goals', data: goalWithUser });
                return tempGoal;
            }
            
            const { data, error } = await this.supabase
                .from('weekly_goals')
                .insert([goalWithUser])
                .select();

            if (error) throw error;
            if (this.cacheEnabled && data[0]) await cacheService.put(STORES.weeklyGoals, data[0]);
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
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.weeklyGoals, id);
                if (cached) await cacheService.put(STORES.weeklyGoals, { ...cached, ...updates });
            }
            
            if (!cacheService.online) {
                await cacheService.addPendingSync({ type: 'update', store: 'weekly_goals', itemId: id, data: updates });
                return await cacheService.get(STORES.weeklyGoals, id);
            }
            
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
            if (this.cacheEnabled) await cacheService.delete(STORES.weeklyGoals, id);
            
            if (!cacheService.online) {
                await cacheService.addPendingSync({ type: 'delete', store: 'weekly_goals', itemId: id });
                return;
            }
            
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
            // Try cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.timeBlocks);
                const dateBlocks = cached.filter(b => b.date === date);
                if (dateBlocks.length > 0 || cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.timeBlocks, async () => {
                            const { data } = await this.supabase.from('time_blocks').select('*').eq('date', date);
                            return data;
                        });
                    }
                    return dateBlocks.sort((a, b) => a.start_time.localeCompare(b.start_time));
                }
            }
            
            const { data, error } = await this.supabase
                .from('time_blocks')
                .select('*')
                .eq('date', date)
                .order('start_time');

            if (error) throw error;
            
            if (this.cacheEnabled && data) {
                await cacheService.putAll(STORES.timeBlocks, data);
            }
            
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
            // Try cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.timeBlocks);
                const rangeBlocks = cached.filter(b => b.date >= startDate && b.date <= endDate);
                if (rangeBlocks.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.timeBlocks, async () => {
                            const { data } = await this.supabase
                                .from('time_blocks')
                                .select('*')
                                .gte('date', startDate)
                                .lte('date', endDate);
                            return data;
                        });
                    }
                    return rangeBlocks.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
                }
            }
            
            const { data, error } = await this.supabase
                .from('time_blocks')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date')
                .order('start_time');

            if (error) throw error;
            
            if (this.cacheEnabled && data) {
                await cacheService.putAll(STORES.timeBlocks, data);
            }
            
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
            
            const blockWithUser = { ...timeBlock, user_id: user.id };
            
            if (!cacheService.online) {
                const tempBlock = {
                    ...blockWithUser,
                    id: `temp_${Date.now()}`,
                    created_at: new Date().toISOString()
                };
                await cacheService.put(STORES.timeBlocks, tempBlock);
                await cacheService.addPendingSync({
                    type: 'create',
                    store: 'time_blocks',
                    data: blockWithUser
                });
                return tempBlock;
            }
            
            const { data, error } = await this.supabase
                .from('time_blocks')
                .insert([blockWithUser])
                .select();

            if (error) throw error;
            
            if (this.cacheEnabled && data[0]) {
                await cacheService.put(STORES.timeBlocks, data[0]);
            }
            
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
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.timeBlocks, id);
                if (cached) {
                    await cacheService.put(STORES.timeBlocks, { ...cached, ...updates });
                }
            }
            
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'update',
                    store: 'time_blocks',
                    itemId: id,
                    data: updates
                });
                return await cacheService.get(STORES.timeBlocks, id);
            }
            
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
            if (this.cacheEnabled) {
                await cacheService.delete(STORES.timeBlocks, id);
            }
            
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'delete',
                    store: 'time_blocks',
                    itemId: id
                });
                return;
            }
            
            const { error } = await this.supabase
                .from('time_blocks')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteTimeBlock');
        }
    }

    // ==================== CALENDAR EVENTS ====================
    // For unscheduled events, full-day events, and events without specific times

    /**
     * Get calendar events for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Array>} Array of calendar events
     */
    async getCalendarEvents(date) {
        try {
            const { data, error } = await this.supabase
                .from('calendar_events')
                .select('*')
                .eq('date', date)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getCalendarEvents');
        }
    }

    /**
     * Get calendar events for a date range
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Array>} Array of calendar events
     */
    async getCalendarEventsRange(startDate, endDate) {
        try {
            const { data, error } = await this.supabase
                .from('calendar_events')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getCalendarEventsRange');
        }
    }

    /**
     * Create a new calendar event
     * @param {Object} event - Event object with date, title, description, category, is_all_day
     * @returns {Promise<Object>} Created calendar event
     */
    async createCalendarEvent(event) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const eventWithUser = { ...event, user_id: user.id };

            const { data, error } = await this.supabase
                .from('calendar_events')
                .insert([eventWithUser])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'createCalendarEvent');
        }
    }

    /**
     * Update a calendar event
     * @param {string} id - Event ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated calendar event
     */
    async updateCalendarEvent(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('calendar_events')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateCalendarEvent');
        }
    }

    /**
     * Delete a calendar event
     * @param {string} id - Event ID
     * @returns {Promise<void>}
     */
    async deleteCalendarEvent(id) {
        try {
            const { error } = await this.supabase
                .from('calendar_events')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteCalendarEvent');
        }
    }

    // ==================== POMODORO SESSIONS ====================

    /**
     * Get Pomodoro sessions for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Array>} Array of Pomodoro sessions
     */
    async getPomodoroSessions(date) {
        try {
            const { data, error } = await this.supabase
                .from('pomodoro_sessions')
                .select('*')
                .eq('date', date)
                .order('started_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getPomodoroSessions');
        }
    }

    /**
     * Get Pomodoro sessions for a date range
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Array>} Array of Pomodoro sessions
     */
    async getPomodoroSessionsRange(startDate, endDate) {
        try {
            const { data, error } = await this.supabase
                .from('pomodoro_sessions')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('started_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getPomodoroSessionsRange');
        }
    }

    /**
     * Get Pomodoro statistics for a user
     * @param {string} startDate - Start date for stats
     * @param {string} endDate - End date for stats
     * @returns {Promise<Object>} Statistics object
     */
    async getPomodoroStats(startDate, endDate) {
        try {
            const sessions = await this.getPomodoroSessionsRange(startDate, endDate);
            const focusSessions = sessions.filter(s => s.session_type === 'focus' && s.was_completed);
            
            return {
                totalSessions: focusSessions.length,
                totalMinutes: focusSessions.reduce((sum, s) => sum + s.duration_minutes, 0),
                averagePerDay: focusSessions.length / Math.max(1, this.daysBetween(startDate, endDate)),
                sessionsPerDay: this.groupByDate(focusSessions)
            };
        } catch (error) {
            this.handleError(error, 'getPomodoroStats');
        }
    }

    /**
     * Helper: Calculate days between two dates
     */
    daysBetween(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    }

    /**
     * Helper: Group sessions by date
     */
    groupByDate(sessions) {
        return sessions.reduce((acc, session) => {
            const date = session.date;
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});
    }

    /**
     * Create a new Pomodoro session
     * @param {Object} session - Session object
     * @returns {Promise<Object>} Created session
     */
    async createPomodoroSession(session) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const sessionWithUser = { ...session, user_id: user.id };

            const { data, error } = await this.supabase
                .from('pomodoro_sessions')
                .insert([sessionWithUser])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'createPomodoroSession');
        }
    }

    /**
     * Update a Pomodoro session
     * @param {string} id - Session ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated session
     */
    async updatePomodoroSession(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('pomodoro_sessions')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updatePomodoroSession');
        }
    }

    /**
     * Delete a Pomodoro session
     * @param {string} id - Session ID
     * @returns {Promise<void>}
     */
    async deletePomodoroSession(id) {
        try {
            const { error } = await this.supabase
                .from('pomodoro_sessions')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deletePomodoroSession');
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
            // Try cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.habits);
                if (cached && cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.habits, async () => {
                            const { data } = await this.supabase.from('daily_habits').select('*').order('order_index');
                            return data;
                        });
                    }
                    return cached.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
                }
            }
            
            const { data, error } = await this.supabase
                .from('daily_habits')
                .select('*')
                .order('order_index');

            if (error) throw error;
            
            // Update cache
            if (this.cacheEnabled && data) {
                await cacheService.putAll(STORES.habits, data);
            }
            
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
            
            const habitWithUser = { ...habit, user_id: user.id };
            
            // If offline, create with temp ID
            if (!cacheService.online) {
                const tempHabit = {
                    ...habitWithUser,
                    id: `temp_${Date.now()}`,
                    created_at: new Date().toISOString()
                };
                await cacheService.put(STORES.habits, tempHabit);
                await cacheService.addPendingSync({
                    type: 'create',
                    store: 'daily_habits',
                    data: habitWithUser
                });
                return tempHabit;
            }
            
            const { data, error } = await this.supabase
                .from('daily_habits')
                .insert([habitWithUser])
                .select();

            if (error) throw error;
            
            if (this.cacheEnabled && data[0]) {
                await cacheService.put(STORES.habits, data[0]);
            }
            
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
            // Update cache immediately
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.habits, id);
                if (cached) {
                    await cacheService.put(STORES.habits, { ...cached, ...updates });
                }
            }
            
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'update',
                    store: 'daily_habits',
                    itemId: id,
                    data: updates
                });
                return await cacheService.get(STORES.habits, id);
            }
            
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
            if (this.cacheEnabled) {
                await cacheService.delete(STORES.habits, id);
            }
            
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'delete',
                    store: 'daily_habits',
                    itemId: id
                });
                return;
            }
            
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
            // For habit logs, we filter by date range from cache
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.habitLogs);
                const filtered = cached.filter(log => log.date >= startDate && log.date <= endDate);
                if (filtered.length > 0 || cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.habitLogs, async () => {
                            const { data } = await this.supabase
                                .from('daily_habit_completions')
                                .select('*')
                                .gte('date', startDate)
                                .lte('date', endDate);
                            return data;
                        });
                    }
                    return filtered;
                }
            }
            
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
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('daily_habit_completions')
                .upsert([{ habit_id: habitId, date, completed, user_id: user.id }], { onConflict: 'habit_id,date' })
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'toggleDailyHabitCompletion');
        }
    }
    
    /**
     * Update habit note for a specific date
     * @param {string} habitId - Habit ID
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {string} notes - Note text
     * @returns {Promise<Object>} Updated completion
     */
    async updateHabitNote(habitId, date, notes) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('daily_habit_completions')
                .upsert([{ habit_id: habitId, date, notes, user_id: user.id }], { onConflict: 'habit_id,date' })
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateHabitNote');
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
            // Get current user ID
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data, error } = await this.supabase
                .from('weekly_habit_completions')
                .upsert([{ habit_id: habitId, date, completed, user_id: user.id }], { onConflict: 'habit_id,date' })
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
     * Export time blocks as iCal file
     * @param {Array} timeBlocks - Array of time blocks to export
     * @param {string} filename - Optional filename
     */
    exportToICal(timeBlocks, filename = null) {
        try {
            if (!filename) {
                const date = new Date().toISOString().split('T')[0];
                filename = `planner-schedule-${date}.ics`;
            }
            
            // Generate iCal content
            let icalContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Stillmove Planner//EN',
                'CALSCALE:GREGORIAN',
                'METHOD:PUBLISH',
                'X-WR-CALNAME:Stillmove Planner Schedule'
            ];
            
            timeBlocks.forEach(block => {
                if (!block.date || !block.start_time) return;
                
                // Parse date and time
                const dateStr = block.date.replace(/-/g, '');
                const startTime = block.start_time.replace(/:/g, '').substring(0, 4) + '00';
                const endTime = block.end_time 
                    ? block.end_time.replace(/:/g, '').substring(0, 4) + '00'
                    : this.addMinutesToTime(block.start_time, 30).replace(/:/g, '') + '00';
                
                const uid = `${block.id}@stillmove-planner`;
                const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                
                icalContent.push(
                    'BEGIN:VEVENT',
                    `UID:${uid}`,
                    `DTSTAMP:${now}`,
                    `DTSTART:${dateStr}T${startTime}`,
                    `DTEND:${dateStr}T${endTime}`,
                    `SUMMARY:${this.escapeICalText(block.activity || 'Time Block')}`,
                    `CATEGORIES:${block.category || 'Personal'}`,
                    'END:VEVENT'
                );
            });
            
            icalContent.push('END:VCALENDAR');
            
            // Create and download file
            const blob = new Blob([icalContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            throw new Error(`Failed to export iCal: ${error.message}`);
        }
    }
    
    /**
     * Helper to add minutes to a time string
     */
    addMinutesToTime(timeStr, minutes) {
        const [hours, mins] = timeStr.split(':').map(Number);
        const totalMins = hours * 60 + mins + minutes;
        const newHours = Math.floor(totalMins / 60) % 24;
        const newMins = totalMins % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
    }
    
    /**
     * Escape special characters for iCal format
     */
    escapeICalText(text) {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    }

    /**
     * Validate imported data structure
     * @param {Object} importData - Data to validate
     * @returns {Object} Validation result with { valid: boolean, errors: string[] }
     */
    validateImportData(importData) {
        const errors = [];
        const warnings = [];

        // Check basic structure
        if (!importData || typeof importData !== 'object') {
            errors.push('Invalid data format: must be a JSON object');
            return { valid: false, errors, warnings };
        }

        // Check version
        if (!importData.version) {
            errors.push('Missing version field');
        }

        // Check data field exists
        if (!importData.data || typeof importData.data !== 'object') {
            errors.push('Missing or invalid data field');
            return { valid: false, errors, warnings };
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
        
        // Enhanced validation: Check data integrity
        if (errors.length === 0) {
            // Validate annual goals structure
            if (importData.data.annualGoals) {
                importData.data.annualGoals.forEach((goal, i) => {
                    if (goal && typeof goal !== 'object') {
                        errors.push(`annualGoals[${i}] must be an object`);
                    }
                    if (goal && goal.year && (typeof goal.year !== 'number' || goal.year < 2000 || goal.year > 2100)) {
                        warnings.push(`annualGoals[${i}] has invalid year: ${goal.year}`);
                    }
                });
            }
            
            // Validate daily habits structure
            if (importData.data.dailyHabits) {
                importData.data.dailyHabits.forEach((habit, i) => {
                    if (habit && typeof habit !== 'object') {
                        errors.push(`dailyHabits[${i}] must be an object`);
                    }
                    if (habit && habit.habit_name && typeof habit.habit_name !== 'string') {
                        warnings.push(`dailyHabits[${i}] has invalid habit_name`);
                    }
                });
            }
            
            // Validate time blocks structure
            if (importData.data.timeBlocks) {
                importData.data.timeBlocks.forEach((block, i) => {
                    if (block && typeof block !== 'object') {
                        errors.push(`timeBlocks[${i}] must be an object`);
                    }
                    if (block && block.date && !/^\d{4}-\d{2}-\d{2}$/.test(block.date)) {
                        warnings.push(`timeBlocks[${i}] has invalid date format: ${block.date}`);
                    }
                });
            }
            
            // Validate reading list structure
            if (importData.data.readingList) {
                importData.data.readingList.forEach((book, i) => {
                    if (book && typeof book !== 'object') {
                        errors.push(`readingList[${i}] must be an object`);
                    }
                    if (book && book.rating !== undefined && (typeof book.rating !== 'number' || book.rating < 0 || book.rating > 5)) {
                        warnings.push(`readingList[${i}] has invalid rating: ${book.rating}`);
                    }
                });
            }
            
            // Check for suspiciously large data
            const totalItems = Object.values(importData.data).reduce((sum, arr) => 
                sum + (Array.isArray(arr) ? arr.length : 0), 0);
            if (totalItems > 10000) {
                warnings.push(`Large import detected: ${totalItems} total items`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
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
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.categories);
                if (cached && cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.categories, async () => {
                            const { data } = await this.supabase.from('custom_categories').select('*');
                            return data;
                        });
                    }
                    return cached.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
                }
            }
            
            const { data, error } = await this.supabase
                .from('custom_categories')
                .select('*')
                .order('order_index');

            if (error) throw error;
            if (this.cacheEnabled && data) await cacheService.putAll(STORES.categories, data);
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
            
            const catWithUser = { ...category, user_id: user.id };
            
            if (!cacheService.online) {
                const tempCat = { ...catWithUser, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await cacheService.put(STORES.categories, tempCat);
                await cacheService.addPendingSync({ type: 'create', store: 'custom_categories', data: catWithUser });
                return tempCat;
            }
            
            const { data, error } = await this.supabase
                .from('custom_categories')
                .insert([catWithUser])
                .select();

            if (error) throw error;
            if (this.cacheEnabled && data[0]) await cacheService.put(STORES.categories, data[0]);
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
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.categories, id);
                if (cached) await cacheService.put(STORES.categories, { ...cached, ...updates });
            }
            
            if (!cacheService.online) {
                await cacheService.addPendingSync({ type: 'update', store: 'custom_categories', itemId: id, data: updates });
                return await cacheService.get(STORES.categories, id);
            }
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
            if (this.cacheEnabled) await cacheService.delete(STORES.categories, id);
            
            if (!cacheService.online) {
                await cacheService.addPendingSync({ type: 'delete', store: 'custom_categories', itemId: id });
                return;
            }
            
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

    // ==================== CANVAS DOCUMENTS ====================

    /**
     * Get all canvas documents for the current user
     * @returns {Promise<Array>} Array of canvas documents sorted by updated_at descending
     */
    async getCanvasDocuments() {
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.canvasDocuments);
                if (cached && cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.canvasDocuments, async () => {
                            const { data } = await this.supabase
                                .from('canvas_documents')
                                .select('*')
                                .order('updated_at', { ascending: false });
                            return data;
                        });
                    }
                    return cached.sort((a, b) => 
                        new Date(b.updated_at) - new Date(a.updated_at)
                    );
                }
            }

            const { data, error } = await this.supabase
                .from('canvas_documents')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data) {
                await cacheService.putAll(STORES.canvasDocuments, data);
            }

            return data || [];
        } catch (error) {
            this.handleError(error, 'getCanvasDocuments');
        }
    }

    /**
     * Get a single canvas document by ID
     * @param {string} id - Canvas document ID
     * @returns {Promise<Object|null>} Canvas document or null if not found
     */
    async getCanvasDocument(id) {
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.canvasDocuments, id);
                if (cached) {
                    if (cacheService.online) {
                        // Sync this specific document in background
                        setTimeout(async () => {
                            try {
                                const { data } = await this.supabase
                                    .from('canvas_documents')
                                    .select('*')
                                    .eq('id', id)
                                    .single();
                                if (data) {
                                    await cacheService.put(STORES.canvasDocuments, data);
                                }
                            } catch (e) {
                                console.warn('[Cache] Background sync failed for canvas document:', e);
                            }
                        }, 100);
                    }
                    return cached;
                }
            }

            const { data, error } = await this.supabase
                .from('canvas_documents')
                .select('*')
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            // Update cache
            if (this.cacheEnabled && data) {
                await cacheService.put(STORES.canvasDocuments, data);
            }

            return data || null;
        } catch (error) {
            this.handleError(error, 'getCanvasDocument');
        }
    }

    /**
     * Create a new canvas document
     * @param {Object} document - Canvas document object with title, stroke_data, thumbnail_url
     * @returns {Promise<Object>} Created canvas document
     */
    async createCanvasDocument(document) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const now = new Date().toISOString();
            const docWithUser = {
                ...document,
                user_id: user.id,
                stroke_data: document.stroke_data || { version: 1, strokes: [] },
                title: document.title || 'Untitled Canvas',
                created_at: now,
                updated_at: now
            };

            // If offline, create with temp ID and queue for sync
            if (!cacheService.online) {
                const tempDoc = {
                    ...docWithUser,
                    id: `temp_${Date.now()}`
                };
                await cacheService.put(STORES.canvasDocuments, tempDoc);
                await cacheService.addPendingSync({
                    type: 'create',
                    store: 'canvas_documents',
                    data: docWithUser
                });
                return tempDoc;
            }

            const { data, error } = await this.supabase
                .from('canvas_documents')
                .insert([docWithUser])
                .select();

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data[0]) {
                await cacheService.put(STORES.canvasDocuments, data[0]);
            }

            return data[0];
        } catch (error) {
            this.handleError(error, 'createCanvasDocument');
        }
    }

    /**
     * Update an existing canvas document
     * @param {string} id - Canvas document ID
     * @param {Object} updates - Fields to update (title, stroke_data, thumbnail_url)
     * @returns {Promise<Object>} Updated canvas document
     */
    async updateCanvasDocument(id, updates) {
        try {
            // Add updated_at timestamp
            const updatesWithTimestamp = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            // Update cache immediately for instant UI feedback
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.canvasDocuments, id);
                if (cached) {
                    await cacheService.put(STORES.canvasDocuments, { 
                        ...cached, 
                        ...updatesWithTimestamp 
                    });
                }
            }

            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'update',
                    store: 'canvas_documents',
                    itemId: id,
                    data: updatesWithTimestamp
                });
                return await cacheService.get(STORES.canvasDocuments, id);
            }

            const { data, error } = await this.supabase
                .from('canvas_documents')
                .update(updatesWithTimestamp)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateCanvasDocument');
        }
    }

    /**
     * Delete a canvas document
     * @param {string} id - Canvas document ID
     * @returns {Promise<void>}
     */
    async deleteCanvasDocument(id) {
        try {
            // Delete from cache immediately
            if (this.cacheEnabled) {
                await cacheService.delete(STORES.canvasDocuments, id);
            }

            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'delete',
                    store: 'canvas_documents',
                    itemId: id
                });
                return;
            }

            const { error } = await this.supabase
                .from('canvas_documents')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteCanvasDocument');
        }
    }

    // ==================== KANBAN BOARDS ====================

    /**
     * Get all Kanban boards for the current user
     * @returns {Promise<Array>} Array of Kanban boards sorted by updated_at descending
     */
    async getKanbanBoards() {
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.kanbanBoards);
                if (cached && cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.kanbanBoards, async () => {
                            const { data } = await this.supabase
                                .from('kanban_boards')
                                .select('*')
                                .order('updated_at', { ascending: false });
                            return data;
                        });
                    }
                    // Sort by updated_at descending (most recent first)
                    return cached.sort((a, b) => 
                        new Date(b.updated_at) - new Date(a.updated_at)
                    );
                }
            }

            const { data, error } = await this.supabase
                .from('kanban_boards')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data) {
                await cacheService.putAll(STORES.kanbanBoards, data);
            }

            return data || [];
        } catch (error) {
            this.handleError(error, 'getKanbanBoards');
        }
    }

    /**
     * Get a single Kanban board by ID
     * @param {string} id - Board ID
     * @returns {Promise<Object|null>} Board object or null
     */
    async getKanbanBoard(id) {
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.kanbanBoards, id);
                if (cached) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.kanbanBoards, async () => {
                            const { data } = await this.supabase
                                .from('kanban_boards')
                                .select('*');
                            return data;
                        });
                    }
                    return cached;
                }
            }

            const { data, error } = await this.supabase
                .from('kanban_boards')
                .select('*')
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            // Update cache
            if (this.cacheEnabled && data) {
                await cacheService.put(STORES.kanbanBoards, data);
            }

            return data || null;
        } catch (error) {
            this.handleError(error, 'getKanbanBoard');
        }
    }

    /**
     * Create a new Kanban board
     * @param {Object} board - Board object with title, description, category_id, settings
     * @returns {Promise<Object>} Created board
     */
    async createKanbanBoard(board) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const boardWithUser = { 
                ...board, 
                user_id: user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // If offline, create with temp ID and queue
            if (!cacheService.online) {
                const tempBoard = {
                    ...boardWithUser,
                    id: `temp_${Date.now()}`
                };
                await cacheService.put(STORES.kanbanBoards, tempBoard);
                await cacheService.addPendingSync({
                    type: 'create',
                    store: 'kanban_boards',
                    data: boardWithUser
                });
                return tempBoard;
            }

            const { data, error } = await this.supabase
                .from('kanban_boards')
                .insert([boardWithUser])
                .select();

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data[0]) {
                await cacheService.put(STORES.kanbanBoards, data[0]);
            }

            return data[0];
        } catch (error) {
            this.handleError(error, 'createKanbanBoard');
        }
    }

    /**
     * Update a Kanban board
     * @param {string} id - Board ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated board
     */
    async updateKanbanBoard(id, updates) {
        try {
            const updatesWithTimestamp = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            // Update cache immediately
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.kanbanBoards, id);
                if (cached) {
                    await cacheService.put(STORES.kanbanBoards, { 
                        ...cached, 
                        ...updatesWithTimestamp 
                    });
                }
            }

            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'update',
                    store: 'kanban_boards',
                    itemId: id,
                    data: updatesWithTimestamp
                });
                return await cacheService.get(STORES.kanbanBoards, id);
            }

            const { data, error } = await this.supabase
                .from('kanban_boards')
                .update(updatesWithTimestamp)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateKanbanBoard');
        }
    }

    /**
     * Delete a Kanban board (cascades to columns and cards)
     * @param {string} id - Board ID
     * @returns {Promise<void>}
     */
    async deleteKanbanBoard(id) {
        try {
            // Delete from cache immediately (board, columns, and cards)
            if (this.cacheEnabled) {
                await cacheService.delete(STORES.kanbanBoards, id);
                
                // Also delete associated columns and cards from cache
                const columns = await cacheService.getAll(STORES.kanbanColumns);
                const boardColumns = columns.filter(c => c.board_id === id);
                for (const col of boardColumns) {
                    await cacheService.delete(STORES.kanbanColumns, col.id);
                }
                
                const cards = await cacheService.getAll(STORES.kanbanCards);
                const boardCards = cards.filter(c => c.board_id === id);
                for (const card of boardCards) {
                    await cacheService.delete(STORES.kanbanCards, card.id);
                }
            }

            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'delete',
                    store: 'kanban_boards',
                    itemId: id
                });
                return;
            }

            const { error } = await this.supabase
                .from('kanban_boards')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteKanbanBoard');
        }
    }

    // ==================== KANBAN COLUMNS ====================

    /**
     * Get all columns for a specific board
     * @param {string} boardId - Board ID
     * @returns {Promise<Array>} Array of columns sorted by order_index
     */
    async getKanbanColumns(boardId) {
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.kanbanColumns);
                const boardColumns = cached.filter(c => c.board_id === boardId);
                if (boardColumns.length > 0 || cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.kanbanColumns, async () => {
                            const { data } = await this.supabase
                                .from('kanban_columns')
                                .select('*')
                                .eq('board_id', boardId);
                            return data;
                        });
                    }
                    return boardColumns.sort((a, b) => a.order_index - b.order_index);
                }
            }

            const { data, error } = await this.supabase
                .from('kanban_columns')
                .select('*')
                .eq('board_id', boardId)
                .order('order_index');

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data) {
                await cacheService.putAll(STORES.kanbanColumns, data);
            }

            return data || [];
        } catch (error) {
            this.handleError(error, 'getKanbanColumns');
        }
    }

    /**
     * Create a new Kanban column
     * @param {Object} column - Column object with board_id, title, order_index, wip_limit, color
     * @returns {Promise<Object>} Created column
     */
    async createKanbanColumn(column) {
        try {
            const columnWithTimestamp = {
                ...column,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // If offline, create with temp ID and queue
            if (!cacheService.online) {
                const tempColumn = {
                    ...columnWithTimestamp,
                    id: `temp_${Date.now()}`
                };
                await cacheService.put(STORES.kanbanColumns, tempColumn);
                await cacheService.addPendingSync({
                    type: 'create',
                    store: 'kanban_columns',
                    data: columnWithTimestamp
                });
                return tempColumn;
            }

            const { data, error } = await this.supabase
                .from('kanban_columns')
                .insert([columnWithTimestamp])
                .select();

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data[0]) {
                await cacheService.put(STORES.kanbanColumns, data[0]);
            }

            return data[0];
        } catch (error) {
            this.handleError(error, 'createKanbanColumn');
        }
    }

    /**
     * Update a Kanban column
     * @param {string} id - Column ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated column
     */
    async updateKanbanColumn(id, updates) {
        try {
            const updatesWithTimestamp = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            // Update cache immediately
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.kanbanColumns, id);
                if (cached) {
                    await cacheService.put(STORES.kanbanColumns, { 
                        ...cached, 
                        ...updatesWithTimestamp 
                    });
                }
            }

            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'update',
                    store: 'kanban_columns',
                    itemId: id,
                    data: updatesWithTimestamp
                });
                return await cacheService.get(STORES.kanbanColumns, id);
            }

            const { data, error } = await this.supabase
                .from('kanban_columns')
                .update(updatesWithTimestamp)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateKanbanColumn');
        }
    }

    /**
     * Delete a Kanban column
     * @param {string} id - Column ID
     * @returns {Promise<void>}
     */
    async deleteKanbanColumn(id) {
        try {
            // Delete from cache immediately
            if (this.cacheEnabled) {
                await cacheService.delete(STORES.kanbanColumns, id);
                
                // Also update cards that were in this column (set column_id to null)
                const cards = await cacheService.getAll(STORES.kanbanCards);
                const columnCards = cards.filter(c => c.column_id === id);
                for (const card of columnCards) {
                    await cacheService.put(STORES.kanbanCards, { 
                        ...card, 
                        column_id: null 
                    });
                }
            }

            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'delete',
                    store: 'kanban_columns',
                    itemId: id
                });
                return;
            }

            const { error } = await this.supabase
                .from('kanban_columns')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteKanbanColumn');
        }
    }

    // ==================== KANBAN CARDS ====================

    /**
     * Get all cards for a specific board
     * @param {string} boardId - Board ID
     * @returns {Promise<Array>} Array of cards sorted by order_index
     */
    async getKanbanCards(boardId) {
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.kanbanCards);
                const boardCards = cached.filter(c => c.board_id === boardId);
                if (boardCards.length > 0 || cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.kanbanCards, async () => {
                            const { data } = await this.supabase
                                .from('kanban_cards')
                                .select('*')
                                .eq('board_id', boardId);
                            return data;
                        });
                    }
                    return boardCards.sort((a, b) => a.order_index - b.order_index);
                }
            }

            const { data, error } = await this.supabase
                .from('kanban_cards')
                .select('*')
                .eq('board_id', boardId)
                .order('order_index');

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data) {
                await cacheService.putAll(STORES.kanbanCards, data);
            }

            return data || [];
        } catch (error) {
            this.handleError(error, 'getKanbanCards');
        }
    }

    /**
     * Get a single Kanban card by ID
     * @param {string} id - Card ID
     * @returns {Promise<Object|null>} Card object or null
     */
    async getKanbanCard(id) {
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.kanbanCards, id);
                if (cached) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.kanbanCards, async () => {
                            const { data } = await this.supabase
                                .from('kanban_cards')
                                .select('*');
                            return data;
                        });
                    }
                    return cached;
                }
            }

            const { data, error } = await this.supabase
                .from('kanban_cards')
                .select('*')
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            // Update cache
            if (this.cacheEnabled && data) {
                await cacheService.put(STORES.kanbanCards, data);
            }

            return data || null;
        } catch (error) {
            this.handleError(error, 'getKanbanCard');
        }
    }

    /**
     * Create a new Kanban card
     * @param {Object} card - Card object with board_id, column_id, title, description, order_index, priority, due_date, labels, is_backlog, linked_goal_id
     * @returns {Promise<Object>} Created card
     */
    async createKanbanCard(card) {
        try {
            const cardWithTimestamp = {
                ...card,
                pomodoro_count: card.pomodoro_count || 0,
                labels: card.labels || [],
                is_backlog: card.is_backlog || false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // If offline, create with temp ID and queue
            if (!cacheService.online) {
                const tempCard = {
                    ...cardWithTimestamp,
                    id: `temp_${Date.now()}`
                };
                await cacheService.put(STORES.kanbanCards, tempCard);
                await cacheService.addPendingSync({
                    type: 'create',
                    store: 'kanban_cards',
                    data: cardWithTimestamp
                });
                return tempCard;
            }

            const { data, error } = await this.supabase
                .from('kanban_cards')
                .insert([cardWithTimestamp])
                .select();

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data[0]) {
                await cacheService.put(STORES.kanbanCards, data[0]);
            }

            return data[0];
        } catch (error) {
            this.handleError(error, 'createKanbanCard');
        }
    }

    /**
     * Update a Kanban card
     * @param {string} id - Card ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated card
     */
    async updateKanbanCard(id, updates) {
        try {
            const updatesWithTimestamp = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            // Update cache immediately
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.kanbanCards, id);
                if (cached) {
                    await cacheService.put(STORES.kanbanCards, { 
                        ...cached, 
                        ...updatesWithTimestamp 
                    });
                }
            }

            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'update',
                    store: 'kanban_cards',
                    itemId: id,
                    data: updatesWithTimestamp
                });
                return await cacheService.get(STORES.kanbanCards, id);
            }

            const { data, error } = await this.supabase
                .from('kanban_cards')
                .update(updatesWithTimestamp)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateKanbanCard');
        }
    }

    /**
     * Delete a Kanban card
     * @param {string} id - Card ID
     * @returns {Promise<void>}
     */
    async deleteKanbanCard(id) {
        try {
            // Delete from cache immediately
            if (this.cacheEnabled) {
                await cacheService.delete(STORES.kanbanCards, id);
            }

            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'delete',
                    store: 'kanban_cards',
                    itemId: id
                });
                return;
            }

            const { error } = await this.supabase
                .from('kanban_cards')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteKanbanCard');
        }
    }

    // ==================== KANBAN CHECKLIST ITEMS ====================

    /**
     * Get all checklist items for a specific card
     * @param {string} cardId - Card ID
     * @returns {Promise<Array>} Array of checklist items sorted by order_index
     */
    async getChecklistItems(cardId) {
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.checklistItems);
                const cardItems = cached.filter(item => item.card_id === cardId);
                if (cardItems.length > 0 || cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.checklistItems, async () => {
                            const { data } = await this.supabase
                                .from('kanban_checklist_items')
                                .select('*')
                                .eq('card_id', cardId);
                            return data;
                        });
                    }
                    return cardItems.sort((a, b) => a.order_index - b.order_index);
                }
            }

            const { data, error } = await this.supabase
                .from('kanban_checklist_items')
                .select('*')
                .eq('card_id', cardId)
                .order('order_index');

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data) {
                await cacheService.putAll(STORES.checklistItems, data);
            }

            return data || [];
        } catch (error) {
            this.handleError(error, 'getChecklistItems');
        }
    }

    /**
     * Create a new checklist item
     * @param {Object} item - Checklist item object with card_id, text, order_index
     * @returns {Promise<Object>} Created checklist item
     */
    async createChecklistItem(item) {
        try {
            const itemWithDefaults = {
                ...item,
                is_completed: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // If offline, create with temp ID and queue
            if (!cacheService.online) {
                const tempItem = {
                    ...itemWithDefaults,
                    id: `temp_${Date.now()}`
                };
                await cacheService.put(STORES.checklistItems, tempItem);
                await cacheService.addPendingSync({
                    type: 'create',
                    store: 'kanban_checklist_items',
                    data: itemWithDefaults
                });
                return tempItem;
            }

            const { data, error } = await this.supabase
                .from('kanban_checklist_items')
                .insert([itemWithDefaults])
                .select();

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data[0]) {
                await cacheService.put(STORES.checklistItems, data[0]);
            }

            return data[0];
        } catch (error) {
            this.handleError(error, 'createChecklistItem');
        }
    }

    /**
     * Update a checklist item
     * @param {string} id - Checklist item ID
     * @param {Object} updates - Fields to update (text, is_completed, order_index)
     * @returns {Promise<Object>} Updated checklist item
     */
    async updateChecklistItem(id, updates) {
        try {
            const updatesWithTimestamp = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            // Update cache immediately
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.checklistItems, id);
                if (cached) {
                    await cacheService.put(STORES.checklistItems, { 
                        ...cached, 
                        ...updatesWithTimestamp 
                    });
                }
            }

            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'update',
                    store: 'kanban_checklist_items',
                    itemId: id,
                    data: updatesWithTimestamp
                });
                return await cacheService.get(STORES.checklistItems, id);
            }

            const { data, error } = await this.supabase
                .from('kanban_checklist_items')
                .update(updatesWithTimestamp)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateChecklistItem');
        }
    }

    /**
     * Delete a checklist item
     * @param {string} id - Checklist item ID
     * @returns {Promise<void>}
     */
    async deleteChecklistItem(id) {
        try {
            // Delete from cache immediately
            if (this.cacheEnabled) {
                await cacheService.delete(STORES.checklistItems, id);
            }

            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'delete',
                    store: 'kanban_checklist_items',
                    itemId: id
                });
                return;
            }

            const { error } = await this.supabase
                .from('kanban_checklist_items')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteChecklistItem');
        }
    }

    // ==================== KANBAN ATTACHMENTS ====================
    // Note: Attachments require online connectivity - no offline queueing
    // Only metadata is cached, not file contents
    // File upload/download is handled by StorageService

    /**
     * Get all attachments for a specific card
     * @param {string} cardId - Card ID
     * @returns {Promise<Array>} Array of attachments sorted by created_at
     */
    async getAttachments(cardId) {
        try {
            // Try cache first (metadata only)
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.attachments);
                const cardAttachments = cached.filter(att => att.card_id === cardId);
                if (cardAttachments.length > 0 || cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.attachments, async () => {
                            const { data } = await this.supabase
                                .from('kanban_attachments')
                                .select('*')
                                .eq('card_id', cardId);
                            return data;
                        });
                    }
                    return cardAttachments.sort((a, b) => 
                        new Date(a.created_at) - new Date(b.created_at)
                    );
                }
            }

            const { data, error } = await this.supabase
                .from('kanban_attachments')
                .select('*')
                .eq('card_id', cardId)
                .order('created_at');

            if (error) throw error;

            // Update cache with metadata only
            if (this.cacheEnabled && data) {
                await cacheService.putAll(STORES.attachments, data);
            }

            return data || [];
        } catch (error) {
            this.handleError(error, 'getAttachments');
        }
    }

    /**
     * Create a new attachment record
     * Note: File upload is handled by StorageService - this only creates the metadata record
     * Requires online connectivity - no offline queueing
     * @param {Object} attachment - Attachment object with card_id, file_name, file_path, file_type, file_size, uploaded_by
     * @returns {Promise<Object>} Created attachment record
     */
    async createAttachment(attachment) {
        try {
            // Attachments require online connectivity
            if (!cacheService.online) {
                throw new Error('Attachment operations require an internet connection');
            }

            const attachmentWithTimestamp = {
                ...attachment,
                created_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('kanban_attachments')
                .insert([attachmentWithTimestamp])
                .select();

            if (error) throw error;

            // Update cache with metadata
            if (this.cacheEnabled && data[0]) {
                await cacheService.put(STORES.attachments, data[0]);
            }

            return data[0];
        } catch (error) {
            this.handleError(error, 'createAttachment');
        }
    }

    /**
     * Delete an attachment record
     * Note: File deletion from storage is handled by StorageService - this only deletes the metadata record
     * Requires online connectivity - no offline queueing
     * @param {string} id - Attachment ID
     * @returns {Promise<void>}
     */
    async deleteAttachment(id) {
        try {
            // Attachments require online connectivity
            if (!cacheService.online) {
                throw new Error('Attachment operations require an internet connection');
            }

            // Delete from cache
            if (this.cacheEnabled) {
                await cacheService.delete(STORES.attachments, id);
            }

            const { error } = await this.supabase
                .from('kanban_attachments')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteAttachment');
        }
    }

    // ==================== KANBAN COMMENTS ====================
    // Comments support offline queueing (unlike attachments)

    /**
     * Get all comments for a specific card
     * @param {string} cardId - Card ID
     * @returns {Promise<Array>} Array of comments sorted by created_at descending (newest first)
     */
    async getComments(cardId) {
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.comments);
                const cardComments = cached.filter(comment => comment.card_id === cardId);
                if (cardComments.length > 0 || cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.comments, async () => {
                            const { data } = await this.supabase
                                .from('kanban_comments')
                                .select('*')
                                .eq('card_id', cardId);
                            return data;
                        });
                    }
                    // Sort by created_at descending (newest first)
                    return cardComments.sort((a, b) => 
                        new Date(b.created_at) - new Date(a.created_at)
                    );
                }
            }

            const { data, error } = await this.supabase
                .from('kanban_comments')
                .select('*')
                .eq('card_id', cardId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data) {
                await cacheService.putAll(STORES.comments, data);
            }

            return data || [];
        } catch (error) {
            this.handleError(error, 'getComments');
        }
    }

    /**
     * Create a new comment
     * @param {Object} comment - Comment object with card_id, user_id, text
     * @returns {Promise<Object>} Created comment
     */
    async createComment(comment) {
        try {
            const commentWithTimestamps = {
                ...comment,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // If offline, create with temp ID and queue
            if (!cacheService.online) {
                const tempComment = {
                    ...commentWithTimestamps,
                    id: `temp_${Date.now()}`
                };
                await cacheService.put(STORES.comments, tempComment);
                await cacheService.addPendingSync({
                    type: 'create',
                    store: 'kanban_comments',
                    data: commentWithTimestamps
                });
                return tempComment;
            }

            const { data, error } = await this.supabase
                .from('kanban_comments')
                .insert([commentWithTimestamps])
                .select();

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data[0]) {
                await cacheService.put(STORES.comments, data[0]);
            }

            return data[0];
        } catch (error) {
            this.handleError(error, 'createComment');
        }
    }

    /**
     * Update a comment
     * When updating a comment, sets edited_at to current timestamp
     * @param {string} id - Comment ID
     * @param {Object} updates - Fields to update (text)
     * @returns {Promise<Object>} Updated comment with edited_at timestamp
     */
    async updateComment(id, updates) {
        try {
            const updatesWithTimestamps = {
                ...updates,
                edited_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Update cache immediately
            if (this.cacheEnabled) {
                const cached = await cacheService.get(STORES.comments, id);
                if (cached) {
                    await cacheService.put(STORES.comments, {
                        ...cached,
                        ...updatesWithTimestamps
                    });
                }
            }

            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'update',
                    store: 'kanban_comments',
                    itemId: id,
                    data: updatesWithTimestamps
                });
                return await cacheService.get(STORES.comments, id);
            }

            const { data, error } = await this.supabase
                .from('kanban_comments')
                .update(updatesWithTimestamps)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            this.handleError(error, 'updateComment');
        }
    }

    /**
     * Delete a comment
     * @param {string} id - Comment ID
     * @returns {Promise<void>}
     */
    async deleteComment(id) {
        try {
            // Delete from cache immediately
            if (this.cacheEnabled) {
                await cacheService.delete(STORES.comments, id);
            }

            // If offline, queue for sync
            if (!cacheService.online) {
                await cacheService.addPendingSync({
                    type: 'delete',
                    store: 'kanban_comments',
                    itemId: id
                });
                return;
            }

            const { error } = await this.supabase
                .from('kanban_comments')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            this.handleError(error, 'deleteComment');
        }
    }

    // ==================== KANBAN ACTIVITY LOG ====================
    // Activity log supports offline queueing
    // Activity entries are read-only after creation (no update/delete methods needed)

    /**
     * Get all activity log entries for a specific card
     * @param {string} cardId - Card ID
     * @returns {Promise<Array>} Array of activity entries sorted by created_at descending (newest first)
     */
    async getActivityLog(cardId) {
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = await cacheService.getAll(STORES.activityLog);
                const cardActivities = cached.filter(entry => entry.card_id === cardId);
                if (cardActivities.length > 0 || cached.length > 0) {
                    if (cacheService.online) {
                        this.syncInBackground(STORES.activityLog, async () => {
                            const { data } = await this.supabase
                                .from('kanban_activity_log')
                                .select('*')
                                .eq('card_id', cardId);
                            return data;
                        });
                    }
                    // Sort by created_at descending (newest first)
                    return cardActivities.sort((a, b) => 
                        new Date(b.created_at) - new Date(a.created_at)
                    );
                }
            }

            const { data, error } = await this.supabase
                .from('kanban_activity_log')
                .select('*')
                .eq('card_id', cardId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data) {
                await cacheService.putAll(STORES.activityLog, data);
            }

            return data || [];
        } catch (error) {
            this.handleError(error, 'getActivityLog');
        }
    }

    /**
     * Create a new activity log entry
     * Activity entries are immutable - they cannot be updated or deleted after creation
     * @param {Object} entry - Activity entry object with card_id, user_id, action_type, action_data
     * @returns {Promise<Object>} Created activity entry
     */
    async createActivityEntry(entry) {
        try {
            const entryWithTimestamp = {
                ...entry,
                action_data: entry.action_data || {},
                created_at: new Date().toISOString()
            };

            // If offline, create with temp ID and queue
            if (!cacheService.online) {
                const tempEntry = {
                    ...entryWithTimestamp,
                    id: `temp_${Date.now()}`
                };
                await cacheService.put(STORES.activityLog, tempEntry);
                await cacheService.addPendingSync({
                    type: 'create',
                    store: 'kanban_activity_log',
                    data: entryWithTimestamp
                });
                return tempEntry;
            }

            const { data, error } = await this.supabase
                .from('kanban_activity_log')
                .insert([entryWithTimestamp])
                .select();

            if (error) throw error;

            // Update cache
            if (this.cacheEnabled && data[0]) {
                await cacheService.put(STORES.activityLog, data[0]);
            }

            return data[0];
        } catch (error) {
            this.handleError(error, 'createActivityEntry');
        }
    }
}

// Create and export a singleton instance
const dataService = new DataService();
export default dataService;
