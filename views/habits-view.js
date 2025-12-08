/**
 * Habits View Controller
 * Handles daily habits, weekly habits, and wellness tracking
 */

import dataService from '../js/data-service.js';
import { formatDate, getDaysInMonth, calculateSleepDuration, calculateWaterIntakePercentage } from '../js/utils.js';

class HabitsView {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth() + 1;
        this.currentTab = 'daily-habits';
        
        this.dailyHabits = [];
        this.dailyHabitCompletions = [];
        this.weeklyHabits = [];
        this.weeklyHabitCompletions = [];
        this.moodEntries = [];
        this.sleepEntries = [];
        this.waterEntries = [];
        
        this.selectedMoodDate = null;
    }

    /**
     * Initialize the habits view
     */
    async init(container) {
        this.container = container;
        
        // Load the HTML template
        const response = await fetch('views/habits-view.html');
        const html = await response.text();
        this.container.innerHTML = html;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update display with current month/year
        this.updateMonthYearDisplay();
        
        // Load data
        await this.loadData();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Month navigation
        document.getElementById('habits-prev-month-btn')?.addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('habits-next-month-btn')?.addEventListener('click', () => this.changeMonth(1));
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // Add habit buttons
        document.getElementById('add-daily-habit-btn')?.addEventListener('click', () => this.addDailyHabit());
        document.getElementById('add-weekly-habit-btn')?.addEventListener('click', () => this.addWeeklyHabit());
        

        
        // Mood selector
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mood = e.target.dataset.mood;
                if (this.selectedMoodDate) {
                    this.setMood(this.selectedMoodDate, mood);
                }
            });
        });
        
        // Sleep tracker
        document.getElementById('save-sleep-btn')?.addEventListener('click', () => this.saveSleepData());
        document.getElementById('sleep-bedtime')?.addEventListener('change', () => this.calculateSleepDurationDisplay());
        document.getElementById('sleep-wake-time')?.addEventListener('change', () => this.calculateSleepDurationDisplay());
        
        // Water tracker
        document.getElementById('water-increase-btn')?.addEventListener('click', () => this.changeWaterIntake(1));
        document.getElementById('water-decrease-btn')?.addEventListener('click', () => this.changeWaterIntake(-1));
        document.getElementById('water-date')?.addEventListener('change', () => this.loadWaterForDate());
        document.getElementById('water-goal')?.addEventListener('change', () => this.updateWaterGoal());
        
        // Set default dates
        const today = formatDate(new Date());
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDate(yesterday);
        
        const sleepDateInput = document.getElementById('sleep-date');
        const waterDateInput = document.getElementById('water-date');
        if (sleepDateInput) sleepDateInput.value = yesterdayStr;
        if (waterDateInput) waterDateInput.value = today;
    }

    /**
     * Change month
     */
    async changeMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth > 12) {
            this.currentMonth = 1;
            this.currentYear++;
        } else if (this.currentMonth < 1) {
            this.currentMonth = 12;
            this.currentYear--;
        }
        
        this.updateMonthYearDisplay();
        await this.loadData();
    }

    /**
     * Update month/year display
     */
    updateMonthYearDisplay() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const display = `${monthNames[this.currentMonth - 1]} ${this.currentYear}`;
        const el = document.getElementById('habits-current-month-year');
        if (el) el.textContent = display;
    }

    /**
     * Switch tab
     */
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`)?.classList.add('active');
        
        // Render the content for the new tab
        this.renderCurrentTab();
    }

    /**
     * Load data for the current month
     */
    async loadData() {
        try {
            // Load habits
            this.dailyHabits = await dataService.getDailyHabits();
            this.weeklyHabits = await dataService.getWeeklyHabits();
            
            // Get date range for the month
            const startDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-01`;
            const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
            const endDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
            
            // Load completions
            this.dailyHabitCompletions = await dataService.getDailyHabitCompletions(startDate, endDate);
            this.weeklyHabitCompletions = await dataService.getWeeklyHabitCompletions(startDate, endDate);
            
            // Load wellness data
            this.moodEntries = await dataService.getMoodEntries(startDate, endDate);
            this.sleepEntries = await dataService.getSleepEntries(startDate, endDate);
            this.waterEntries = await dataService.getWaterEntries(startDate, endDate);
            
            // Render based on current tab
            this.renderCurrentTab();
        } catch (error) {
            console.error('Failed to load habits data:', error);
            this.showError('Failed to load data. Please try again.');
        }
    }

    /**
     * Render current tab
     */
    renderCurrentTab() {
        if (this.currentTab === 'daily-habits') {
            this.renderDailyHabits();
        } else if (this.currentTab === 'weekly-habits') {
            this.renderWeeklyHabits();
        } else if (this.currentTab === 'wellness') {
            this.renderWellness();
        }
    }

    /**
     * Render daily habits
     */
    renderDailyHabits() {
        // Render habit list
        const listContainer = document.getElementById('daily-habits-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        this.dailyHabits.slice(0, 30).forEach(habit => {
            const habitItem = this.createHabitItem(habit, 'daily');
            listContainer.appendChild(habitItem);
        });
        
        // Render grid
        this.renderDailyHabitsGrid();
        
        // Calculate and display progress
        this.calculateDailyProgress();
    }

    /**
     * Create habit item element
     */
    createHabitItem(habit, type) {
        const templateId = type === 'daily' ? 'habit-item-template' : 'weekly-habit-item-template';
        const template = document.getElementById(templateId);
        const item = template.content.cloneNode(true).querySelector('.habit-item');
        
        item.dataset.habitId = habit.id;
        
        const nameInput = item.querySelector('.habit-name');
        nameInput.value = habit.habit_name || '';
        
        nameInput.addEventListener('blur', () => {
            if (type === 'daily') {
                this.updateDailyHabit(habit.id, { habit_name: nameInput.value });
            } else {
                this.updateWeeklyHabit(habit.id, { habit_name: nameInput.value });
            }
        });
        
        if (type === 'weekly') {
            const targetInput = item.querySelector('.habit-target');
            targetInput.value = habit.target_days_per_week || 7;
            
            targetInput.addEventListener('change', () => {
                this.updateWeeklyHabit(habit.id, { target_days_per_week: parseInt(targetInput.value) });
            });
        }
        
        item.querySelector('.delete-habit-btn').addEventListener('click', () => {
            if (type === 'daily') {
                this.deleteDailyHabit(habit.id);
            } else {
                this.deleteWeeklyHabit(habit.id);
            }
        });
        
        return item;
    }

    /**
     * Render daily habits grid
     */
    renderDailyHabitsGrid() {
        const gridContainer = document.getElementById('daily-habits-grid');
        if (!gridContainer) return;
        
        gridContainer.innerHTML = '';
        
        const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
        
        // Create header row with dates
        const headerRow = document.createElement('div');
        headerRow.className = 'habits-grid-row header';
        headerRow.innerHTML = '<div class="grid-cell">Habit</div>';
        
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.textContent = day;
            headerRow.appendChild(cell);
        }
        gridContainer.appendChild(headerRow);
        
        // Create rows for each habit
        this.dailyHabits.slice(0, 30).forEach(habit => {
            const row = document.createElement('div');
            row.className = 'habits-grid-row';
            
            const nameCell = document.createElement('div');
            nameCell.className = 'grid-cell habit-name-cell';
            nameCell.textContent = habit.habit_name || 'Unnamed';
            row.appendChild(nameCell);
            
            for (let day = 1; day <= daysInMonth; day++) {
                const date = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const completion = this.dailyHabitCompletions.find(c => c.habit_id === habit.id && c.date === date);
                
                const cell = document.createElement('div');
                cell.className = 'grid-cell checkbox-cell';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = completion?.completed || false;
                checkbox.addEventListener('change', () => {
                    this.toggleDailyHabitCompletion(habit.id, date, checkbox.checked);
                });
                
                cell.appendChild(checkbox);
                row.appendChild(cell);
            }
            
            gridContainer.appendChild(row);
        });
    }

    /**
     * Calculate daily progress - show each habit's monthly completion percentage
     */
    calculateDailyProgress() {
        const progressList = document.getElementById('daily-progress-list');
        if (!progressList) return;
        
        progressList.innerHTML = '';
        
        const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
        
        this.dailyHabits.forEach((habit, index) => {
            let completed = 0;
            
            // Count completions for this habit in the current month
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const completion = this.dailyHabitCompletions.find(c => c.habit_id === habit.id && c.date === dateStr);
                if (completion && completion.completed) {
                    completed++;
                }
            }
            
            const percentage = ((completed / daysInMonth) * 100).toFixed(1);
            
            const progressItem = document.createElement('div');
            progressItem.className = 'progress-item';
            progressItem.innerHTML = `
                <span>${habit.habit_name || `Habit ${index + 1}`}:</span>
                <span class="progress-value">${percentage}%</span>
            `;
            progressList.appendChild(progressItem);
        });
    }

    /**
     * Calculate habit progress for a period
     */
    calculateHabitProgressForPeriod(completions, days) {
        if (this.dailyHabits.length === 0 || days === 0) return 0;
        
        // Get the last N days
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - days + 1);
        
        let totalPossible = 0;
        let totalCompleted = 0;
        
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateStr = formatDate(date);
            
            this.dailyHabits.forEach(habit => {
                totalPossible++;
                const completion = completions.find(c => c.habit_id === habit.id && c.date === dateStr);
                if (completion?.completed) {
                    totalCompleted++;
                }
            });
        }
        
        return totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0;
    }

    /**
     * Add daily habit
     */
    async addDailyHabit() {
        if (this.dailyHabits.length >= 30) {
            this.showError('Maximum 30 daily habits allowed');
            return;
        }
        
        try {
            const newHabit = {
                habit_name: 'New Habit',
                order_index: this.dailyHabits.length
            };
            
            const created = await dataService.createDailyHabit(newHabit);
            this.dailyHabits.push(created);
            this.renderDailyHabits();
        } catch (error) {
            console.error('Failed to add daily habit:', error);
            this.showError('Failed to add habit. Please try again.');
        }
    }

    /**
     * Update daily habit
     */
    async updateDailyHabit(habitId, updates) {
        try {
            await dataService.updateDailyHabit(habitId, updates);
            const habit = this.dailyHabits.find(h => h.id === habitId);
            if (habit) {
                Object.assign(habit, updates);
            }
            // Re-render the grid to show updated habit name
            if (updates.habit_name !== undefined) {
                this.renderDailyHabitsGrid();
            }
        } catch (error) {
            console.error('Failed to update daily habit:', error);
            this.showError('Failed to update habit. Please try again.');
        }
    }

    /**
     * Delete daily habit
     */
    async deleteDailyHabit(habitId) {
        if (!confirm('Are you sure you want to delete this habit?')) return;
        
        try {
            await dataService.deleteDailyHabit(habitId);
            this.dailyHabits = this.dailyHabits.filter(h => h.id !== habitId);
            this.renderDailyHabits();
        } catch (error) {
            console.error('Failed to delete daily habit:', error);
            this.showError('Failed to delete habit. Please try again.');
        }
    }

    /**
     * Toggle daily habit completion
     */
    async toggleDailyHabitCompletion(habitId, date, completed) {
        try {
            await dataService.toggleDailyHabitCompletion(habitId, date, completed);
            
            // Update local state
            const existingIndex = this.dailyHabitCompletions.findIndex(c => c.habit_id === habitId && c.date === date);
            if (existingIndex >= 0) {
                this.dailyHabitCompletions[existingIndex].completed = completed;
            } else {
                this.dailyHabitCompletions.push({ habit_id: habitId, date, completed });
            }
            
            // Recalculate progress
            this.calculateDailyProgress();
        } catch (error) {
            console.error('Failed to toggle habit completion:', error);
            this.showError('Failed to update completion. Please try again.');
        }
    }

    /**
     * Render weekly habits
     */
    renderWeeklyHabits() {
        console.log('renderWeeklyHabits called', { 
            weeklyHabitsCount: this.weeklyHabits.length,
            weeklyHabits: this.weeklyHabits 
        });
        
        // Render habit list
        const listContainer = document.getElementById('weekly-habits-list');
        console.log('weekly-habits-list container:', listContainer);
        
        if (!listContainer) {
            console.error('weekly-habits-list container not found!');
            return;
        }
        
        listContainer.innerHTML = '';
        this.weeklyHabits.slice(0, 10).forEach(habit => {
            const habitItem = this.createHabitItem(habit, 'weekly');
            listContainer.appendChild(habitItem);
        });
        
        // Render grid
        this.renderWeeklyHabitsGrid();
        
        // Calculate and display progress
        this.calculateWeeklyProgress();
    }

    /**
     * Render weekly habits grid
     */
    renderWeeklyHabitsGrid() {
        const gridContainer = document.getElementById('weekly-habits-grid');
        if (!gridContainer) return;
        
        gridContainer.innerHTML = '';
        
        const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
        
        // Create header row with dates
        const headerRow = document.createElement('div');
        headerRow.className = 'habits-grid-row header';
        headerRow.innerHTML = '<div class="grid-cell">Habit</div>';
        
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.textContent = day;
            headerRow.appendChild(cell);
        }
        gridContainer.appendChild(headerRow);
        
        // Create rows for each habit
        this.weeklyHabits.slice(0, 10).forEach(habit => {
            const row = document.createElement('div');
            row.className = 'habits-grid-row';
            
            const nameCell = document.createElement('div');
            nameCell.className = 'grid-cell habit-name-cell';
            nameCell.textContent = `${habit.habit_name || 'Unnamed'} (${habit.target_days_per_week}/week)`;
            row.appendChild(nameCell);
            
            for (let day = 1; day <= daysInMonth; day++) {
                const date = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const completion = this.weeklyHabitCompletions.find(c => c.habit_id === habit.id && c.date === date);
                
                const cell = document.createElement('div');
                cell.className = 'grid-cell checkbox-cell';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = completion?.completed || false;
                checkbox.addEventListener('change', () => {
                    this.toggleWeeklyHabitCompletion(habit.id, date, checkbox.checked);
                });
                
                cell.appendChild(checkbox);
                row.appendChild(cell);
            }
            
            gridContainer.appendChild(row);
        });
    }

    /**
     * Calculate weekly progress - show each habit's monthly completion percentage
     */
    calculateWeeklyProgress() {
        const progressList = document.getElementById('weekly-progress-list');
        if (!progressList) return;
        
        progressList.innerHTML = '';
        
        const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
        
        this.weeklyHabits.forEach((habit, index) => {
            let completed = 0;
            
            // Count completions for this habit in the current month
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const completion = this.weeklyHabitCompletions.find(c => c.habit_id === habit.id && c.date === dateStr);
                if (completion && completion.completed) {
                    completed++;
                }
            }
            
            const percentage = ((completed / daysInMonth) * 100).toFixed(1);
            
            const progressItem = document.createElement('div');
            progressItem.className = 'progress-item';
            progressItem.innerHTML = `
                <span>${habit.habit_name || `Habit ${index + 1}`}:</span>
                <span class="progress-value">${percentage}%</span>
            `;
            progressList.appendChild(progressItem);
        });
    }

    /**
     * Add weekly habit
     */
    async addWeeklyHabit() {
        if (this.weeklyHabits.length >= 10) {
            this.showError('Maximum 10 weekly habits allowed');
            return;
        }
        
        try {
            const newHabit = {
                habit_name: 'New Habit',
                target_days_per_week: 7,
                order_index: this.weeklyHabits.length
            };
            
            const created = await dataService.createWeeklyHabit(newHabit);
            this.weeklyHabits.push(created);
            this.renderWeeklyHabits();
        } catch (error) {
            console.error('Failed to add weekly habit:', error);
            this.showError('Failed to add habit. Please try again.');
        }
    }

    /**
     * Update weekly habit
     */
    async updateWeeklyHabit(habitId, updates) {
        try {
            await dataService.updateWeeklyHabit(habitId, updates);
            const habit = this.weeklyHabits.find(h => h.id === habitId);
            if (habit) {
                Object.assign(habit, updates);
            }
            // Re-render the grid to show updated habit name
            if (updates.habit_name !== undefined) {
                this.renderWeeklyHabitsGrid();
            }
        } catch (error) {
            console.error('Failed to update weekly habit:', error);
            this.showError('Failed to update habit. Please try again.');
        }
    }

    /**
     * Delete weekly habit
     */
    async deleteWeeklyHabit(habitId) {
        if (!confirm('Are you sure you want to delete this habit?')) return;
        
        try {
            await dataService.deleteWeeklyHabit(habitId);
            this.weeklyHabits = this.weeklyHabits.filter(h => h.id !== habitId);
            this.renderWeeklyHabits();
        } catch (error) {
            console.error('Failed to delete weekly habit:', error);
            this.showError('Failed to delete habit. Please try again.');
        }
    }

    /**
     * Toggle weekly habit completion
     */
    async toggleWeeklyHabitCompletion(habitId, date, completed) {
        try {
            await dataService.toggleWeeklyHabitCompletion(habitId, date, completed);
            
            // Update local state
            const existingIndex = this.weeklyHabitCompletions.findIndex(c => c.habit_id === habitId && c.date === date);
            if (existingIndex >= 0) {
                this.weeklyHabitCompletions[existingIndex].completed = completed;
            } else {
                this.weeklyHabitCompletions.push({ habit_id: habitId, date, completed });
            }
            
            // Recalculate progress
            this.calculateWeeklyProgress();
        } catch (error) {
            console.error('Failed to toggle habit completion:', error);
            this.showError('Failed to update completion. Please try again.');
        }
    }

    /**
     * Render wellness trackers
     */
    renderWellness() {
        this.renderMoodGrid();
        this.renderSleepList();
        this.renderWaterList();
        this.loadWaterForDate();
    }

    /**
     * Render mood grid
     */
    renderMoodGrid() {
        const gridContainer = document.getElementById('mood-grid');
        if (!gridContainer) return;
        
        gridContainer.innerHTML = '';
        
        const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const moodEntry = this.moodEntries.find(m => m.date === date);
            
            const cell = document.createElement('div');
            cell.className = 'mood-cell';
            cell.textContent = moodEntry?.mood_emoji || '😶';
            cell.title = `Day ${day} - ${date}`;
            cell.dataset.date = date;
            
            cell.addEventListener('click', () => {
                this.selectedMoodDate = date;
                document.querySelectorAll('.mood-cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                
                // Show selected date info
                const infoEl = document.getElementById('mood-selected-date');
                if (infoEl) {
                    infoEl.textContent = `Selected: Day ${day}`;
                }
            });
            
            gridContainer.appendChild(cell);
        }
        
        // Update mood distribution
        this.updateMoodDistribution();
        
        // Auto-select today's date if in current month
        const today = new Date();
        if (this.currentYear === today.getFullYear() && this.currentMonth === today.getMonth() + 1) {
            const todayDate = formatDate(today);
            this.selectedMoodDate = todayDate;
            const todayCell = gridContainer.querySelector(`[data-date="${todayDate}"]`);
            if (todayCell) {
                todayCell.classList.add('selected');
                const infoEl = document.getElementById('mood-selected-date');
                if (infoEl) {
                    infoEl.textContent = `Selected: Day ${today.getDate()} (Today)`;
                }
            }
        }
    }

    /**
     * Update mood distribution
     */
    updateMoodDistribution() {
        const distribution = {};
        const moods = ['🥰', '😁', '😶', '😵', '😩'];
        
        moods.forEach(mood => {
            distribution[mood] = this.moodEntries.filter(m => m.mood_emoji === mood).length;
        });
        
        const container = document.getElementById('mood-distribution');
        if (!container) return;
        
        container.innerHTML = '';
        moods.forEach(mood => {
            const item = document.createElement('div');
            item.className = 'mood-dist-item';
            item.innerHTML = `<span class="mood-emoji">${mood}</span> <span class="mood-count">${distribution[mood]}</span>`;
            container.appendChild(item);
        });
    }

    /**
     * Set mood for a date
     */
    async setMood(date, moodEmoji) {
        try {
            await dataService.setMood(date, moodEmoji);
            
            // Update local state
            const existingIndex = this.moodEntries.findIndex(m => m.date === date);
            if (existingIndex >= 0) {
                this.moodEntries[existingIndex].mood_emoji = moodEmoji;
            } else {
                this.moodEntries.push({ date, mood_emoji: moodEmoji });
            }
            
            this.renderMoodGrid();
        } catch (error) {
            console.error('Failed to set mood:', error);
            this.showError('Failed to save mood. Please try again.');
        }
    }

    /**
     * Calculate sleep duration display
     */
    calculateSleepDurationDisplay() {
        const bedtime = document.getElementById('sleep-bedtime')?.value;
        const wakeTime = document.getElementById('sleep-wake-time')?.value;
        
        if (bedtime && wakeTime) {
            const duration = calculateSleepDuration(bedtime, wakeTime);
            const el = document.getElementById('sleep-hours');
            if (el) el.textContent = duration.toFixed(1);
        }
    }

    /**
     * Save sleep data
     */
    async saveSleepData() {
        const date = document.getElementById('sleep-date')?.value;
        const bedtime = document.getElementById('sleep-bedtime')?.value;
        const wakeTime = document.getElementById('sleep-wake-time')?.value;
        
        if (!date || !bedtime || !wakeTime) {
            this.showError('Please fill in all sleep fields');
            return;
        }
        
        try {
            const hoursSlept = calculateSleepDuration(bedtime, wakeTime);
            await dataService.setSleepData(date, bedtime, wakeTime, hoursSlept);
            
            // Update local state
            const existingIndex = this.sleepEntries.findIndex(s => s.date === date);
            if (existingIndex >= 0) {
                this.sleepEntries[existingIndex] = { date, bedtime, wake_time: wakeTime, hours_slept: hoursSlept };
            } else {
                this.sleepEntries.push({ date, bedtime, wake_time: wakeTime, hours_slept: hoursSlept });
            }
            
            this.renderSleepList();
            this.showSuccess('Sleep data saved');
        } catch (error) {
            console.error('Failed to save sleep data:', error);
            this.showError('Failed to save sleep data. Please try again.');
        }
    }

    /**
     * Render sleep list
     */
    renderSleepList() {
        const listContainer = document.getElementById('sleep-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        
        // Sort by date descending
        const sortedEntries = [...this.sleepEntries].sort((a, b) => b.date.localeCompare(a.date));
        
        sortedEntries.slice(0, 10).forEach(entry => {
            const item = document.createElement('div');
            item.className = 'sleep-item';
            item.innerHTML = `
                <span class="sleep-date">${entry.date}</span>
                <span class="sleep-time">${entry.bedtime} - ${entry.wake_time}</span>
                <span class="sleep-duration">${entry.hours_slept}h</span>
            `;
            listContainer.appendChild(item);
        });
    }

    /**
     * Load water data for selected date
     */
    async loadWaterForDate() {
        const date = document.getElementById('water-date')?.value;
        if (!date) return;
        
        const entry = this.waterEntries.find(w => w.date === date);
        
        const glassesEl = document.getElementById('water-glasses');
        const goalEl = document.getElementById('water-goal');
        const goalDisplayEl = document.getElementById('water-goal-display');
        
        if (glassesEl) glassesEl.textContent = entry?.glasses_consumed || 0;
        if (goalEl) goalEl.value = entry?.goal_glasses || 8;
        if (goalDisplayEl) goalDisplayEl.textContent = entry?.goal_glasses || 8;
        
        this.updateWaterProgress();
    }

    /**
     * Change water intake
     */
    async changeWaterIntake(delta) {
        const date = document.getElementById('water-date')?.value;
        if (!date) return;
        
        const entry = this.waterEntries.find(w => w.date === date);
        const currentGlasses = entry?.glasses_consumed || 0;
        const goal = entry?.goal_glasses || 8;
        
        const newGlasses = Math.max(0, currentGlasses + delta);
        
        try {
            await dataService.setWaterIntake(date, newGlasses, goal);
            
            // Update local state
            const existingIndex = this.waterEntries.findIndex(w => w.date === date);
            if (existingIndex >= 0) {
                this.waterEntries[existingIndex].glasses_consumed = newGlasses;
            } else {
                this.waterEntries.push({ date, glasses_consumed: newGlasses, goal_glasses: goal });
            }
            
            const glassesEl = document.getElementById('water-glasses');
            if (glassesEl) glassesEl.textContent = newGlasses;
            
            this.updateWaterProgress();
            this.renderWaterList();
        } catch (error) {
            console.error('Failed to update water intake:', error);
            this.showError('Failed to update water intake. Please try again.');
        }
    }

    /**
     * Update water goal
     */
    async updateWaterGoal() {
        const date = document.getElementById('water-date')?.value;
        const goalInput = document.getElementById('water-goal');
        if (!date || !goalInput) return;
        
        const goal = parseInt(goalInput.value);
        const entry = this.waterEntries.find(w => w.date === date);
        const glasses = entry?.glasses_consumed || 0;
        
        try {
            await dataService.setWaterIntake(date, glasses, goal);
            
            // Update local state
            const existingIndex = this.waterEntries.findIndex(w => w.date === date);
            if (existingIndex >= 0) {
                this.waterEntries[existingIndex].goal_glasses = goal;
            } else {
                this.waterEntries.push({ date, glasses_consumed: glasses, goal_glasses: goal });
            }
            
            const goalDisplayEl = document.getElementById('water-goal-display');
            if (goalDisplayEl) goalDisplayEl.textContent = goal;
            
            this.updateWaterProgress();
        } catch (error) {
            console.error('Failed to update water goal:', error);
            this.showError('Failed to update water goal. Please try again.');
        }
    }

    /**
     * Update water progress display
     */
    updateWaterProgress() {
        const date = document.getElementById('water-date')?.value;
        if (!date) return;
        
        const entry = this.waterEntries.find(w => w.date === date);
        const glasses = entry?.glasses_consumed || 0;
        const goal = entry?.goal_glasses || 8;
        
        const percentage = calculateWaterIntakePercentage(glasses, goal);
        
        const progressEl = document.getElementById('water-progress');
        if (progressEl) progressEl.textContent = percentage.toFixed(0);
    }

    /**
     * Render water list
     */
    renderWaterList() {
        const listContainer = document.getElementById('water-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        
        // Sort by date descending
        const sortedEntries = [...this.waterEntries].sort((a, b) => b.date.localeCompare(a.date));
        
        sortedEntries.slice(0, 10).forEach(entry => {
            const percentage = calculateWaterIntakePercentage(entry.glasses_consumed, entry.goal_glasses);
            const item = document.createElement('div');
            item.className = 'water-item';
            item.innerHTML = `
                <span class="water-date">${entry.date}</span>
                <span class="water-amount">${entry.glasses_consumed}/${entry.goal_glasses} glasses</span>
                <span class="water-percent">${percentage.toFixed(0)}%</span>
            `;
            listContainer.appendChild(item);
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        // TODO: Implement toast notification
        alert(message);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // TODO: Implement toast notification
        console.log(message);
    }
}

export default HabitsView;
