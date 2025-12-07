/**
 * Cached Data Service Wrapper
 * Wraps the DataService with caching capabilities for improved performance
 */

import dataService from './data-service.js';
import { cacheManager, performanceMonitor } from './performance.js';

class CachedDataService {
    constructor() {
        this.dataService = dataService;
        this.cacheManager = cacheManager;
        this.performanceMonitor = performanceMonitor;
    }

    /**
     * Wrap a data service method with caching
     */
    async cachedCall(cacheKey, fetchFn, ttl = 5 * 60 * 1000) {
        // Try to get from cache first
        const cached = this.cacheManager.get(cacheKey);
        if (cached !== null) {
            return cached;
        }

        // Fetch from database with performance monitoring
        const timer = this.performanceMonitor.startTimer(cacheKey);
        try {
            const data = await fetchFn();
            this.performanceMonitor.endTimer(timer, 'apiCall');
            
            // Store in cache
            this.cacheManager.set(cacheKey, data, ttl);
            return data;
        } catch (error) {
            this.performanceMonitor.endTimer(timer, 'apiCall');
            throw error;
        }
    }

    // ==================== ANNUAL GOALS ====================

    async getAnnualGoals(year) {
        const key = this.cacheManager.generateKey('annualGoals', year);
        return this.cachedCall(key, () => this.dataService.getAnnualGoals(year));
    }

    async createAnnualGoal(goal) {
        const result = await this.dataService.createAnnualGoal(goal);
        this.cacheManager.invalidate('annualGoals');
        return result;
    }

    async updateAnnualGoal(id, updates) {
        const result = await this.dataService.updateAnnualGoal(id, updates);
        this.cacheManager.invalidate('annualGoals');
        return result;
    }

    async deleteAnnualGoal(id) {
        const result = await this.dataService.deleteAnnualGoal(id);
        this.cacheManager.invalidate('annualGoals');
        return result;
    }

    // ==================== READING LIST ====================

    async getReadingList(year) {
        const key = this.cacheManager.generateKey('readingList', year);
        return this.cachedCall(key, () => this.dataService.getReadingList(year));
    }

    async createReadingListEntry(book) {
        const result = await this.dataService.createReadingListEntry(book);
        this.cacheManager.invalidate('readingList');
        return result;
    }

    async updateReadingListEntry(id, updates) {
        const result = await this.dataService.updateReadingListEntry(id, updates);
        this.cacheManager.invalidate('readingList');
        return result;
    }

    async deleteReadingListEntry(id) {
        const result = await this.dataService.deleteReadingListEntry(id);
        this.cacheManager.invalidate('readingList');
        return result;
    }

    // ==================== MONTHLY DATA ====================

    async getMonthlyData(year, month) {
        const key = this.cacheManager.generateKey('monthlyData', year, month);
        return this.cachedCall(key, () => this.dataService.getMonthlyData(year, month));
    }

    async upsertMonthlyData(monthlyData) {
        const result = await this.dataService.upsertMonthlyData(monthlyData);
        this.cacheManager.invalidate('monthlyData');
        return result;
    }

    // ==================== WEEKLY GOALS ====================

    async getWeeklyGoals(year, weekNumber) {
        const key = this.cacheManager.generateKey('weeklyGoals', year, weekNumber);
        return this.cachedCall(key, () => this.dataService.getWeeklyGoals(year, weekNumber));
    }

    async createWeeklyGoal(goal) {
        const result = await this.dataService.createWeeklyGoal(goal);
        this.cacheManager.invalidate('weeklyGoals');
        return result;
    }

    async updateWeeklyGoal(id, updates) {
        const result = await this.dataService.updateWeeklyGoal(id, updates);
        this.cacheManager.invalidate('weeklyGoals');
        return result;
    }

    async deleteWeeklyGoal(id) {
        const result = await this.dataService.deleteWeeklyGoal(id);
        this.cacheManager.invalidate('weeklyGoals');
        return result;
    }

    // ==================== TIME BLOCKS ====================

    async getTimeBlocks(date) {
        const key = this.cacheManager.generateKey('timeBlocks', date);
        return this.cachedCall(key, () => this.dataService.getTimeBlocks(date));
    }

    async getTimeBlocksRange(startDate, endDate) {
        const key = this.cacheManager.generateKey('timeBlocksRange', startDate, endDate);
        return this.cachedCall(key, () => this.dataService.getTimeBlocksRange(startDate, endDate));
    }

    async createTimeBlock(timeBlock) {
        const result = await this.dataService.createTimeBlock(timeBlock);
        this.cacheManager.invalidate('timeBlocks');
        return result;
    }

    async updateTimeBlock(id, updates) {
        const result = await this.dataService.updateTimeBlock(id, updates);
        this.cacheManager.invalidate('timeBlocks');
        return result;
    }

    async deleteTimeBlock(id) {
        const result = await this.dataService.deleteTimeBlock(id);
        this.cacheManager.invalidate('timeBlocks');
        return result;
    }

    // ==================== DAILY ENTRIES ====================

    async getDailyEntry(date) {
        const key = this.cacheManager.generateKey('dailyEntry', date);
        return this.cachedCall(key, () => this.dataService.getDailyEntry(date));
    }

    async upsertDailyEntry(entry) {
        const result = await this.dataService.upsertDailyEntry(entry);
        this.cacheManager.invalidate('dailyEntry');
        return result;
    }

    // ==================== DAILY HABITS ====================

    async getDailyHabits() {
        const key = this.cacheManager.generateKey('dailyHabits');
        return this.cachedCall(key, () => this.dataService.getDailyHabits());
    }

    async createDailyHabit(habit) {
        const result = await this.dataService.createDailyHabit(habit);
        this.cacheManager.invalidate('dailyHabits');
        return result;
    }

    async updateDailyHabit(id, updates) {
        const result = await this.dataService.updateDailyHabit(id, updates);
        this.cacheManager.invalidate('dailyHabits');
        return result;
    }

    async deleteDailyHabit(id) {
        const result = await this.dataService.deleteDailyHabit(id);
        this.cacheManager.invalidate('dailyHabits');
        return result;
    }

    // ==================== DAILY HABIT COMPLETIONS ====================

    async getDailyHabitCompletions(startDate, endDate) {
        const key = this.cacheManager.generateKey('dailyHabitCompletions', startDate, endDate);
        return this.cachedCall(key, () => this.dataService.getDailyHabitCompletions(startDate, endDate));
    }

    async toggleDailyHabitCompletion(habitId, date, completed) {
        const result = await this.dataService.toggleDailyHabitCompletion(habitId, date, completed);
        this.cacheManager.invalidate('dailyHabitCompletions');
        return result;
    }

    // ==================== WEEKLY HABITS ====================

    async getWeeklyHabits() {
        const key = this.cacheManager.generateKey('weeklyHabits');
        return this.cachedCall(key, () => this.dataService.getWeeklyHabits());
    }

    async createWeeklyHabit(habit) {
        const result = await this.dataService.createWeeklyHabit(habit);
        this.cacheManager.invalidate('weeklyHabits');
        return result;
    }

    async updateWeeklyHabit(id, updates) {
        const result = await this.dataService.updateWeeklyHabit(id, updates);
        this.cacheManager.invalidate('weeklyHabits');
        return result;
    }

    async deleteWeeklyHabit(id) {
        const result = await this.dataService.deleteWeeklyHabit(id);
        this.cacheManager.invalidate('weeklyHabits');
        return result;
    }

    // ==================== WEEKLY HABIT COMPLETIONS ====================

    async getWeeklyHabitCompletions(startDate, endDate) {
        const key = this.cacheManager.generateKey('weeklyHabitCompletions', startDate, endDate);
        return this.cachedCall(key, () => this.dataService.getWeeklyHabitCompletions(startDate, endDate));
    }

    async toggleWeeklyHabitCompletion(habitId, date, completed) {
        const result = await this.dataService.toggleWeeklyHabitCompletion(habitId, date, completed);
        this.cacheManager.invalidate('weeklyHabitCompletions');
        return result;
    }

    // ==================== MOOD TRACKER ====================

    async getMoodEntries(startDate, endDate) {
        const key = this.cacheManager.generateKey('moodEntries', startDate, endDate);
        return this.cachedCall(key, () => this.dataService.getMoodEntries(startDate, endDate));
    }

    async setMood(date, moodEmoji) {
        const result = await this.dataService.setMood(date, moodEmoji);
        this.cacheManager.invalidate('moodEntries');
        return result;
    }

    // ==================== SLEEP TRACKER ====================

    async getSleepEntries(startDate, endDate) {
        const key = this.cacheManager.generateKey('sleepEntries', startDate, endDate);
        return this.cachedCall(key, () => this.dataService.getSleepEntries(startDate, endDate));
    }

    async setSleepData(date, bedtime, wakeTime, hoursSlept) {
        const result = await this.dataService.setSleepData(date, bedtime, wakeTime, hoursSlept);
        this.cacheManager.invalidate('sleepEntries');
        return result;
    }

    // ==================== WATER TRACKER ====================

    async getWaterEntries(startDate, endDate) {
        const key = this.cacheManager.generateKey('waterEntries', startDate, endDate);
        return this.cachedCall(key, () => this.dataService.getWaterEntries(startDate, endDate));
    }

    async setWaterIntake(date, glassesConsumed, goalGlasses = 8) {
        const result = await this.dataService.setWaterIntake(date, glassesConsumed, goalGlasses);
        this.cacheManager.invalidate('waterEntries');
        return result;
    }

    // ==================== ACTION PLANS ====================

    async getActionPlans(year, month) {
        const key = this.cacheManager.generateKey('actionPlans', year, month);
        return this.cachedCall(key, () => this.dataService.getActionPlans(year, month));
    }

    async createActionPlan(actionPlan) {
        const result = await this.dataService.createActionPlan(actionPlan);
        this.cacheManager.invalidate('actionPlans');
        return result;
    }

    async updateActionPlan(id, updates) {
        const result = await this.dataService.updateActionPlan(id, updates);
        this.cacheManager.invalidate('actionPlans');
        return result;
    }

    async deleteActionPlan(id) {
        const result = await this.dataService.deleteActionPlan(id);
        this.cacheManager.invalidate('actionPlans');
        return result;
    }

    // ==================== USER PROFILE ====================

    async getUserProfile() {
        const key = this.cacheManager.generateKey('userProfile');
        return this.cachedCall(key, () => this.dataService.getUserProfile());
    }

    async upsertUserProfile(profile) {
        const result = await this.dataService.upsertUserProfile(profile);
        this.cacheManager.invalidate('userProfile');
        return result;
    }

    // ==================== DATA EXPORT AND IMPORT ====================

    async exportAllData() {
        return this.dataService.exportAllData();
    }

    downloadExportFile(exportData, filename = null) {
        return this.dataService.downloadExportFile(exportData, filename);
    }

    validateImportData(importData) {
        return this.dataService.validateImportData(importData);
    }

    async importData(importData, mode = 'merge') {
        const result = await this.dataService.importData(importData, mode);
        // Clear all caches after import
        this.cacheManager.clear();
        return result;
    }

    async readImportFile(file) {
        return this.dataService.readImportFile(file);
    }

    // ==================== CACHE MANAGEMENT ====================

    /**
     * Clear all caches
     */
    clearCache() {
        this.cacheManager.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.cacheManager.getStats();
    }

    /**
     * Get performance report
     */
    getPerformanceReport() {
        return this.performanceMonitor.getReport();
    }
}

// Create and export singleton instance
const cachedDataService = new CachedDataService();
export default cachedDataService;
