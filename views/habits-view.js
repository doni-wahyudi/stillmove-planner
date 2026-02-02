/**
 * Habits View Controller
 * Handles daily habits, weekly habits, and wellness tracking
 */

import dataService from '../js/data-service.js';
import integrationService from '../js/integration-service.js';
import kanbanService from '../js/kanban-service.js';
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
        this.annualGoals = []; // For linking habits to goals

        this.selectedMoodDate = null;
        this.draggedHabitId = null; // For drag and drop reordering
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
        document.getElementById('habits-today-btn')?.addEventListener('click', () => this.goToToday());

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

        // Habit bundles button
        document.getElementById('habit-bundles-btn')?.addEventListener('click', () => this.openHabitBundlesModal());

        // Habit filter
        document.getElementById('daily-habits-filter')?.addEventListener('change', (e) => this.filterHabits(e.target.value));



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
     * Go to current month (Today button)
     */
    async goToToday() {
        const today = new Date();
        this.currentYear = today.getFullYear();
        this.currentMonth = today.getMonth() + 1;
        this.updateMonthYearDisplay();
        await this.loadData();
    }

    /**
     * Go to a specific date
     */
    async goToDate(date) {
        const d = new Date(date);
        this.currentYear = d.getFullYear();
        this.currentMonth = d.getMonth() + 1;
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

        // Update breadcrumb context
        const breadcrumbContext = document.getElementById('breadcrumb-context');
        if (breadcrumbContext) {
            breadcrumbContext.textContent = display;
        }
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

            // Load annual goals for linking
            this.annualGoals = await dataService.getAnnualGoals(this.currentYear);

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

        if (this.dailyHabits.length === 0) {
            // Show empty state
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.style.padding = '1.5rem';
            emptyState.innerHTML = `
                <div class="empty-state-icon">✨</div>
                <div class="empty-state-title">Start building habits</div>
                <div class="empty-state-description">Add your first daily habit to begin tracking your progress.</div>
            `;
            listContainer.appendChild(emptyState);
        } else {
            this.dailyHabits.slice(0, 30).forEach(habit => {
                const habitItem = this.createHabitItem(habit, 'daily');
                listContainer.appendChild(habitItem);
            });
        }

        // Render grid
        this.renderDailyHabitsGrid();

        // Calculate and display progress
        this.calculateDailyProgress();

        // Initialize habit tracking chart
        this.initHabitChart();
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

        const createCardBtn = item.querySelector('.create-card-btn');
        if (createCardBtn) {
            createCardBtn.addEventListener('click', () => {
                integrationService.createCardFromHabit(habit.id, habit.habit_name);
            });
        }

        // Goal linking (only for daily habits)
        if (type === 'daily') {
            this.setupGoalLinking(item, habit);

            // Drag and drop support
            const dragHandle = item.querySelector('.drag-handle');
            if (dragHandle) {
                // Drag start
                dragHandle.addEventListener('dragstart', (e) => {
                    this.draggedHabitId = habit.id;
                    item.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    // We need to set data for Firefox to allow drag
                    e.dataTransfer.setData('text/plain', habit.id);

                    // Set drag image to the row item (not just the handle) if possible
                    // setTimeout(() => item.classList.add('ghost'), 0);
                });

                // Drag end
                dragHandle.addEventListener('dragend', () => {
                    this.draggedHabitId = null;
                    item.classList.remove('dragging');
                    document.querySelectorAll('.habit-item').forEach(el => {
                        el.classList.remove('drag-over-top', 'drag-over-bottom');
                    });
                });
            }

            // Allow dropping on the item itself
            item.addEventListener('dragover', (e) => {
                if (this.draggedHabitId && this.draggedHabitId !== habit.id) {
                    e.preventDefault(); // Necessary to allow dropping
                    e.dataTransfer.dropEffect = 'move';

                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;

                    item.classList.remove('drag-over-top', 'drag-over-bottom');
                    if (e.clientY < midY) {
                        item.classList.add('drag-over-top');
                    } else {
                        item.classList.add('drag-over-bottom');
                    }
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            item.addEventListener('drop', async (e) => {
                e.preventDefault();
                item.classList.remove('drag-over-top', 'drag-over-bottom');

                if (this.draggedHabitId && this.draggedHabitId !== habit.id) {
                    // Calculate drop position again to be sure
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    const position = e.clientY < midY ? 'before' : 'after';

                    await this.reorderHabits(this.draggedHabitId, habit.id, position);
                }
            });

            // Linked Kanban Cards
            this.renderHabitLinkedCards(item, habit.id);
        }

        return item;
    }

    /**
     * Render Kanban cards linked to a habit
     */
    async renderHabitLinkedCards(item, habitId) {
        const container = item.querySelector('.linked-cards-display');
        const list = item.querySelector('.linked-cards-list');
        if (!container || !list) return;

        try {
            const linkedCards = await kanbanService.getCardsByHabit(habitId);

            if (linkedCards.length > 0) {
                container.style.display = 'block';
                list.innerHTML = '';

                linkedCards.forEach(card => {
                    const cardEl = document.createElement('div');
                    cardEl.className = 'linked-card-badge';
                    cardEl.innerHTML = `
                        <span class="card-icon">📋</span>
                        <span class="card-title">${card.title}</span>
                    `;
                    cardEl.title = `View in Board: ${card.boardTitle}`;

                    cardEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        integrationService.navigateToCard(card.boardId, card.id);
                    });

                    list.appendChild(cardEl);
                });
            }
        } catch (error) {
            console.error('Failed to render linked cards for habit:', error);
        }
    }

    /**
     * Reorder habits
     * @param {string} draggedId - ID of habit being dragged
     * @param {string} targetId - ID of habit being dropped onto
     * @param {string} position - 'before' or 'after'
     */
    async reorderHabits(draggedId, targetId, position) {
        // Create a copy of the current array
        const habits = [...this.dailyHabits];
        const draggedIndex = habits.findIndex(h => h.id === draggedId);
        if (draggedIndex === -1) return;

        // Remove dragged item
        const [movedHabit] = habits.splice(draggedIndex, 1);

        // Find target index in the modified array
        let targetIndex = habits.findIndex(h => h.id === targetId);
        if (targetIndex === -1) {
            // Should not happen, but safe fallback
            habits.push(movedHabit);
        } else {
            if (position === 'after') {
                targetIndex++;
            }
            habits.splice(targetIndex, 0, movedHabit);
        }

        // Optimistic update
        this.dailyHabits = habits;
        this.renderDailyHabits();

        // Persist changes
        try {
            const updates = [];
            this.dailyHabits.forEach((habit, index) => {
                // If order changed, update it
                if (habit.order_index !== index) {
                    habit.order_index = index; // Update local object
                    updates.push(dataService.updateDailyHabit(habit.id, { order_index: index }));
                }
            });

            if (updates.length > 0) {
                await Promise.all(updates);
            }
        } catch (error) {
            console.error('Failed to save habit order:', error);
            this.showError('Failed to save habit order');
            await this.loadData(); // Revert
        }
    }

    /**
     * Setup goal linking for a habit item
     */
    setupGoalLinking(item, habit) {
        const linkBtn = item.querySelector('.link-goal-btn');
        const goalLinkContainer = item.querySelector('.habit-goal-link');
        const goalSelect = item.querySelector('.habit-goal-select');
        const linkedDisplay = item.querySelector('.linked-goal-display');
        const goalNameSpan = item.querySelector('.goal-name');
        const unlinkBtn = item.querySelector('.unlink-goal-btn');

        if (!linkBtn || !goalSelect) return;

        // Populate goal select
        goalSelect.innerHTML = '<option value="">-- Select a goal --</option>';
        this.annualGoals.forEach(goal => {
            const option = document.createElement('option');
            option.value = goal.id;
            option.textContent = goal.title || 'Unnamed Goal';
            goalSelect.appendChild(option);
        });

        // Show linked goal if exists
        if (habit.linked_goal_id) {
            const linkedGoal = this.annualGoals.find(g => g.id === habit.linked_goal_id);
            if (linkedGoal) {
                goalNameSpan.textContent = linkedGoal.title || 'Unnamed Goal';
                linkedDisplay.style.display = 'block';
                linkBtn.style.opacity = '0.5';
            }
        }

        // Toggle goal selector
        linkBtn.addEventListener('click', () => {
            const isVisible = goalLinkContainer.style.display === 'block';
            goalLinkContainer.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                goalSelect.value = habit.linked_goal_id || '';
            }
        });

        // Handle goal selection
        goalSelect.addEventListener('change', async () => {
            const goalId = goalSelect.value || null;
            await this.linkHabitToGoal(habit.id, goalId);

            // Update display
            if (goalId) {
                const linkedGoal = this.annualGoals.find(g => g.id === goalId);
                goalNameSpan.textContent = linkedGoal?.title || 'Unnamed Goal';
                linkedDisplay.style.display = 'block';
                linkBtn.style.opacity = '0.5';
            } else {
                linkedDisplay.style.display = 'none';
                linkBtn.style.opacity = '1';
            }

            goalLinkContainer.style.display = 'none';
        });

        // Unlink goal
        unlinkBtn?.addEventListener('click', async () => {
            await this.linkHabitToGoal(habit.id, null);
            linkedDisplay.style.display = 'none';
            linkBtn.style.opacity = '1';
        });
    }

    /**
     * Link a habit to an annual goal
     */
    async linkHabitToGoal(habitId, goalId) {
        try {
            await dataService.updateDailyHabit(habitId, { linked_goal_id: goalId });

            // Update local state
            const habit = this.dailyHabits.find(h => h.id === habitId);
            if (habit) {
                habit.linked_goal_id = goalId;
            }

            if (window.showToast) {
                window.showToast(goalId ? 'Habit linked to goal' : 'Habit unlinked from goal', 'success');
            }
        } catch (error) {
            console.error('Failed to link habit to goal:', error);
            this.showError('Failed to link habit. Please try again.');
        }
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
                if (completion?.notes) {
                    cell.classList.add('has-note');
                    cell.title = completion.notes;
                }

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = completion?.completed || false;
                checkbox.addEventListener('change', () => {
                    this.toggleDailyHabitCompletion(habit.id, date, checkbox.checked, cell);
                });

                // Double-click to add/edit note
                cell.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    this.showHabitNoteModal(habit, date, completion?.notes || '');
                });

                cell.appendChild(checkbox);
                row.appendChild(cell);
            }

            gridContainer.appendChild(row);
        });
    }

    /**
     * Calculate daily progress - show each habit's monthly completion percentage and streak
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

            // Calculate current streak
            const streak = this.calculateStreak(habit.id);
            const streakBadge = this.getStreakBadge(streak);

            // Generate chain visualization (last 7 days)
            const chainHtml = this.generateChainVisualization(habit.id);

            const progressItem = document.createElement('div');
            progressItem.className = 'progress-item';
            progressItem.innerHTML = `
                <div class="progress-item-header">
                    <span class="progress-item-name">${habit.habit_name || `Habit ${index + 1}`}</span>
                    <div class="progress-item-stats">
                        ${streakBadge}
                        <span class="progress-value">${percentage}%</span>
                    </div>
                </div>
                <div class="chain-visualization" title="Last 7 days - Don't break the chain!">
                    ${chainHtml}
                </div>
            `;
            progressList.appendChild(progressItem);
        });

        // Render heatmap
        this.renderHeatmap();

        // Render achievement badges
        this.renderAchievements();

        // Render daily challenge
        this.renderDailyChallenge();

        // Update points display
        this.updatePointsDisplay();

        // Check for milestone celebrations
        const overallProgress = this.calculateOverallProgress();
        this.showMilestoneCelebration(overallProgress);
    }

    /**
     * Calculate and display total points
     */
    updatePointsDisplay() {
        const pointsEl = document.getElementById('total-points');
        if (!pointsEl) return;

        const points = this.calculateTotalPoints();
        pointsEl.textContent = points.toLocaleString();

        // Add animation if points changed
        pointsEl.classList.add('points-updated');
        setTimeout(() => pointsEl.classList.remove('points-updated'), 500);
    }

    /**
     * Calculate total points based on habits and achievements
     */
    calculateTotalPoints() {
        let points = 0;

        // Points for each habit completion (10 XP each)
        const completedHabits = this.dailyHabitCompletions.filter(c => c.completed).length;
        points += completedHabits * 10;

        // Bonus points for streaks
        this.dailyHabits.forEach(habit => {
            const streak = this.calculateStreak(habit.id);
            if (streak >= 7) points += 50;   // Week streak bonus
            if (streak >= 14) points += 100; // 2-week bonus
            if (streak >= 30) points += 250; // Month bonus
            if (streak >= 100) points += 1000; // Century bonus
        });

        // Points for achievements
        const achievements = this.calculateAchievements();
        const earnedCount = achievements.filter(a => a.earned).length;
        points += earnedCount * 100; // 100 XP per achievement

        // Bonus for perfect days
        if (this.hasPerfectDay()) points += 50;

        // Challenge completion bonus
        const challenge = this.getDailyChallenge();
        const progress = this.getChallengeProgress(challenge);
        if (progress >= challenge.target) points += 25;

        return points;
    }

    /**
     * Render achievement badges
     */
    renderAchievements() {
        const container = document.getElementById('achievements-grid');
        if (!container) return;

        // Calculate achievements
        const achievements = this.calculateAchievements();

        container.innerHTML = achievements.map(badge => `
            <div class="achievement-badge ${badge.earned ? 'earned' : 'locked'}" title="${badge.description}">
                <span class="badge-icon">${badge.icon}</span>
                <span class="badge-name">${badge.name}</span>
                ${badge.earned ? `<span class="badge-date">${badge.earnedDate || ''}</span>` : '<span class="badge-lock">🔒</span>'}
            </div>
        `).join('');
    }

    /**
     * Calculate which achievements have been earned
     */
    calculateAchievements() {
        const achievements = [
            { id: 'first-habit', name: 'First Step', icon: '👣', description: 'Complete your first habit', check: () => this.dailyHabitCompletions.some(c => c.completed) },
            { id: 'streak-3', name: 'Getting Started', icon: '🌱', description: '3-day streak on any habit', check: () => this.getMaxStreak() >= 3 },
            { id: 'streak-7', name: 'Week Warrior', icon: '⚔️', description: '7-day streak on any habit', check: () => this.getMaxStreak() >= 7 },
            { id: 'streak-14', name: 'Fortnight Fighter', icon: '🛡️', description: '14-day streak on any habit', check: () => this.getMaxStreak() >= 14 },
            { id: 'streak-30', name: 'Monthly Master', icon: '👑', description: '30-day streak on any habit', check: () => this.getMaxStreak() >= 30 },
            { id: 'streak-100', name: 'Century Club', icon: '💯', description: '100-day streak on any habit', check: () => this.getMaxStreak() >= 100 },
            { id: 'perfect-day', name: 'Perfect Day', icon: '⭐', description: 'Complete all habits in one day', check: () => this.hasPerfectDay() },
            { id: 'perfect-week', name: 'Perfect Week', icon: '🌟', description: '7 perfect days in a row', check: () => this.getPerfectDayStreak() >= 7 },
            { id: 'five-habits', name: 'Habit Builder', icon: '🏗️', description: 'Track 5 or more habits', check: () => this.dailyHabits.length >= 5 },
            { id: 'ten-habits', name: 'Habit Master', icon: '🎓', description: 'Track 10 or more habits', check: () => this.dailyHabits.length >= 10 },
            { id: 'early-bird', name: 'Early Bird', icon: '🐦', description: 'Complete a habit before 8 AM', check: () => false }, // Would need timestamp tracking
            { id: 'consistency', name: 'Consistent', icon: '📈', description: '80%+ completion rate this month', check: () => this.calculateOverallProgress() >= 80 },
        ];

        return achievements.map(badge => ({
            ...badge,
            earned: badge.check()
        }));
    }

    /**
     * Get the maximum streak across all habits
     */
    getMaxStreak() {
        let maxStreak = 0;
        this.dailyHabits.forEach(habit => {
            const streak = this.calculateStreak(habit.id);
            if (streak > maxStreak) maxStreak = streak;
        });
        return maxStreak;
    }

    /**
     * Check if there's been a perfect day (all habits completed)
     */
    hasPerfectDay() {
        if (this.dailyHabits.length === 0) return false;

        const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            let allCompleted = true;

            for (const habit of this.dailyHabits) {
                const completion = this.dailyHabitCompletions.find(
                    c => c.habit_id === habit.id && c.date === dateStr && c.completed
                );
                if (!completion) {
                    allCompleted = false;
                    break;
                }
            }

            if (allCompleted) return true;
        }
        return false;
    }

    /**
     * Get the streak of perfect days
     */
    getPerfectDayStreak() {
        if (this.dailyHabits.length === 0) return 0;

        let streak = 0;
        let currentDate = new Date();

        while (true) {
            const dateStr = formatDate(currentDate);
            let allCompleted = true;

            for (const habit of this.dailyHabits) {
                const completion = this.dailyHabitCompletions.find(
                    c => c.habit_id === habit.id && c.date === dateStr && c.completed
                );
                if (!completion) {
                    allCompleted = false;
                    break;
                }
            }

            if (allCompleted) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }

            // Safety limit
            if (streak > 365) break;
        }

        return streak;
    }

    /**
     * Render daily challenge
     */
    renderDailyChallenge() {
        const container = document.getElementById('daily-challenge');
        if (!container) return;

        const challenge = this.getDailyChallenge();
        const progress = this.getChallengeProgress(challenge);
        const isComplete = progress >= challenge.target;

        container.innerHTML = `
            <div class="challenge-card ${isComplete ? 'complete' : ''}">
                <div class="challenge-header">
                    <span class="challenge-icon">${challenge.icon}</span>
                    <span class="challenge-type">${challenge.type}</span>
                </div>
                <p class="challenge-text">${challenge.text}</p>
                <div class="challenge-progress">
                    <div class="challenge-progress-bar">
                        <div class="challenge-progress-fill" style="width: ${Math.min(100, (progress / challenge.target) * 100)}%"></div>
                    </div>
                    <span class="challenge-progress-text">${progress}/${challenge.target}</span>
                </div>
                ${isComplete ? '<div class="challenge-complete">✅ Challenge Complete!</div>' : ''}
            </div>
        `;
    }

    /**
     * Get today's challenge based on the date (deterministic)
     */
    getDailyChallenge() {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));

        const challenges = [
            { type: 'Streak', icon: '🔥', text: 'Maintain or extend a streak today', target: 1, check: 'streak' },
            { type: 'Perfect Day', icon: '⭐', text: 'Complete all your habits today', target: this.dailyHabits.length || 1, check: 'all' },
            { type: 'Early Start', icon: '🌅', text: 'Complete at least 3 habits today', target: 3, check: 'count' },
            { type: 'Halfway', icon: '🎯', text: 'Complete at least half your habits', target: Math.ceil((this.dailyHabits.length || 2) / 2), check: 'count' },
            { type: 'Consistency', icon: '📈', text: 'Complete the same habits as yesterday', target: 1, check: 'consistency' },
            { type: 'Push Yourself', icon: '💪', text: 'Complete one more habit than yesterday', target: 1, check: 'improvement' },
            { type: 'Focus', icon: '🎯', text: 'Complete your first 3 habits', target: 3, check: 'first3' },
        ];

        // Use day of year to pick a challenge (deterministic per day)
        const challengeIndex = dayOfYear % challenges.length;
        return challenges[challengeIndex];
    }

    /**
     * Get progress towards today's challenge
     */
    getChallengeProgress(challenge) {
        const today = formatDate(new Date());
        let todayCompletions = 0;

        this.dailyHabits.forEach(habit => {
            const completion = this.dailyHabitCompletions.find(
                c => c.habit_id === habit.id && c.date === today && c.completed
            );
            if (completion) todayCompletions++;
        });

        switch (challenge.check) {
            case 'all':
            case 'count':
            case 'first3':
                return todayCompletions;
            case 'streak':
                return this.getMaxStreak() > 0 ? 1 : 0;
            case 'consistency':
            case 'improvement':
                return todayCompletions > 0 ? 1 : 0;
            default:
                return todayCompletions;
        }
    }

    /**
     * Calculate current streak for a habit
     */
    calculateStreak(habitId) {
        const today = new Date();
        let streak = 0;
        let currentDate = new Date(today);

        // Check backwards from today
        while (true) {
            const dateStr = formatDate(currentDate);
            const completion = this.dailyHabitCompletions.find(
                c => c.habit_id === habitId && c.date === dateStr && c.completed
            );

            if (completion) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                // If today is not completed, check if yesterday was (allow for not yet completing today)
                if (streak === 0) {
                    currentDate.setDate(currentDate.getDate() - 1);
                    const yesterdayStr = formatDate(currentDate);
                    const yesterdayCompletion = this.dailyHabitCompletions.find(
                        c => c.habit_id === habitId && c.date === yesterdayStr && c.completed
                    );
                    if (yesterdayCompletion) {
                        streak++;
                        currentDate.setDate(currentDate.getDate() - 1);
                        continue;
                    }
                }
                break;
            }
        }

        return streak;
    }

    /**
     * Generate chain visualization for last 7 days
     */
    generateChainVisualization(habitId) {
        const today = new Date();
        const days = [];

        // Get last 7 days (including today)
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = formatDate(date);

            const completion = this.dailyHabitCompletions.find(
                c => c.habit_id === habitId && c.date === dateStr && c.completed
            );

            const isToday = i === 0;
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);

            days.push({
                completed: !!completion,
                isToday,
                dayName
            });
        }

        // Generate HTML
        return days.map((day, index) => {
            const linkClass = index > 0 ? (days[index - 1].completed && day.completed ? 'chain-link connected' : 'chain-link broken') : '';
            const circleClass = `chain-circle ${day.completed ? 'completed' : ''} ${day.isToday ? 'today' : ''}`;

            return `
                ${index > 0 ? `<span class="${linkClass}"></span>` : ''}
                <span class="${circleClass}" title="${day.dayName}">
                    ${day.completed ? '✓' : ''}
                </span>
            `;
        }).join('');
    }

    /**
     * Get streak badge HTML based on streak count
     */
    getStreakBadge(streak) {
        if (streak === 0) {
            return '<span class="streak-badge inactive"><span class="streak-icon">🔥</span><span class="streak-count">0</span></span>';
        }

        let milestoneClass = '';
        if (streak >= 100) {
            milestoneClass = 'milestone-100';
        } else if (streak >= 30) {
            milestoneClass = 'milestone-30';
        } else if (streak >= 7) {
            milestoneClass = 'milestone-7';
        }

        return `<span class="streak-badge ${milestoneClass}"><span class="streak-icon">🔥</span><span class="streak-count">${streak}</span></span>`;
    }

    /**
     * Render habit heatmap showing completion intensity over the month
     */
    renderHeatmap() {
        const progressContainer = document.getElementById('daily-progress-list');
        if (!progressContainer || this.dailyHabits.length === 0) return;

        // Check if heatmap already exists
        let heatmapContainer = progressContainer.parentElement.querySelector('.habit-heatmap');
        if (!heatmapContainer) {
            heatmapContainer = document.createElement('div');
            heatmapContainer.className = 'habit-heatmap';
            progressContainer.parentElement.appendChild(heatmapContainer);
        }

        const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
        const totalHabits = this.dailyHabits.length;
        const today = new Date();
        const todayStr = formatDate(today);

        // Calculate completion percentage for each day
        const dayCompletions = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            let completed = 0;

            this.dailyHabits.forEach(habit => {
                const completion = this.dailyHabitCompletions.find(
                    c => c.habit_id === habit.id && c.date === dateStr && c.completed
                );
                if (completion) completed++;
            });

            const percentage = totalHabits > 0 ? (completed / totalHabits) * 100 : 0;
            dayCompletions.push({ day, dateStr, percentage, isToday: dateStr === todayStr });
        }

        // Build heatmap HTML
        let heatmapHTML = `
            <h4>Monthly Activity</h4>
            <div class="heatmap-grid">
        `;

        dayCompletions.forEach(({ day, percentage, isToday }) => {
            let level = 0;
            if (percentage > 0 && percentage <= 25) level = 1;
            else if (percentage > 25 && percentage <= 50) level = 2;
            else if (percentage > 50 && percentage <= 75) level = 3;
            else if (percentage > 75) level = 4;

            const todayClass = isToday ? ' today' : '';
            heatmapHTML += `<div class="heatmap-cell level-${level}${todayClass}" title="Day ${day}: ${percentage.toFixed(0)}% complete"></div>`;
        });

        heatmapHTML += `
            </div>
            <div class="heatmap-legend">
                <span class="heatmap-legend-label">Less</span>
                <div class="heatmap-legend-cells">
                    <div class="heatmap-legend-cell level-0"></div>
                    <div class="heatmap-legend-cell level-1"></div>
                    <div class="heatmap-legend-cell level-2"></div>
                    <div class="heatmap-legend-cell level-3"></div>
                    <div class="heatmap-legend-cell level-4"></div>
                </div>
                <span class="heatmap-legend-label">More</span>
            </div>
        `;

        heatmapContainer.innerHTML = heatmapHTML;

        // Render streak trend chart
        this.renderStreakChart();
    }

    /**
     * Render streak trend chart showing daily completion rates over last 30 days
     */
    renderStreakChart() {
        const chartContainer = document.getElementById('streak-chart');
        if (!chartContainer || this.dailyHabits.length === 0) return;

        const today = new Date();
        const totalHabits = this.dailyHabits.length;
        const days = 30;
        const data = [];

        // Calculate completion percentage for each of the last 30 days
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = formatDate(date);

            let completed = 0;
            this.dailyHabits.forEach(habit => {
                const completion = this.dailyHabitCompletions.find(
                    c => c.habit_id === habit.id && c.date === dateStr && c.completed
                );
                if (completion) completed++;
            });

            const percentage = totalHabits > 0 ? (completed / totalHabits) * 100 : 0;
            data.push({
                date: dateStr,
                day: date.getDate(),
                percentage,
                isToday: i === 0
            });
        }

        // Build chart HTML - simple bar chart
        const maxHeight = 60; // pixels
        let chartHTML = '<div class="streak-bars">';

        data.forEach(({ day, percentage, isToday, date }) => {
            const height = (percentage / 100) * maxHeight;
            let levelClass = 'low';
            if (percentage >= 80) levelClass = 'high';
            else if (percentage >= 50) levelClass = 'medium';

            const todayClass = isToday ? ' today' : '';
            chartHTML += `
                <div class="streak-bar-container${todayClass}" title="${date}: ${percentage.toFixed(0)}%">
                    <div class="streak-bar ${levelClass}" style="height: ${height}px;"></div>
                    <span class="streak-bar-label">${day}</span>
                </div>
            `;
        });

        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }

    /**
     * Calculate and show overall monthly progress with milestone celebration
     */
    calculateOverallProgress() {
        if (this.dailyHabits.length === 0) return 0;

        const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
        const totalPossible = this.dailyHabits.length * daysInMonth;
        let totalCompleted = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            this.dailyHabits.forEach(habit => {
                const completion = this.dailyHabitCompletions.find(
                    c => c.habit_id === habit.id && c.date === dateStr && c.completed
                );
                if (completion) totalCompleted++;
            });
        }

        return totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0;
    }

    /**
     * Show milestone celebration banner
     */
    showMilestoneCelebration(percentage) {
        // Only show for significant milestones
        const milestones = [25, 50, 75, 100];
        const milestone = milestones.find(m => percentage >= m && percentage < m + 5);

        if (!milestone) return;

        // Check if we've already shown this milestone this month
        const storageKey = `milestone_${this.currentYear}_${this.currentMonth}_${milestone}`;
        if (localStorage.getItem(storageKey)) return;

        const messages = {
            25: { icon: '🌱', title: 'Great Start!', desc: "You've completed 25% of your habits this month!" },
            50: { icon: '🔥', title: 'Halfway There!', desc: "50% complete! You're building momentum!" },
            75: { icon: '⭐', title: 'Almost There!', desc: "75% done! Keep pushing to the finish!" },
            100: { icon: '🏆', title: 'Perfect Month!', desc: "100% completion! You're unstoppable!" }
        };

        const msg = messages[milestone];
        if (!msg) return;

        // Create banner
        const banner = document.createElement('div');
        banner.className = 'milestone-banner';
        banner.innerHTML = `
            <div class="milestone-icon">${msg.icon}</div>
            <div class="milestone-content">
                <div class="milestone-title">${msg.title}</div>
                <div class="milestone-description">${msg.desc}</div>
            </div>
            <button class="milestone-dismiss" aria-label="Dismiss">×</button>
        `;

        // Insert at top of habits container
        const container = document.querySelector('.habits-container');
        if (container) {
            container.insertBefore(banner, container.firstChild);

            // Mark as shown
            localStorage.setItem(storageKey, 'true');

            // Dismiss handler
            banner.querySelector('.milestone-dismiss').addEventListener('click', () => {
                banner.remove();
            });

            // Auto-dismiss after 10 seconds
            setTimeout(() => {
                if (banner.parentElement) {
                    banner.style.opacity = '0';
                    banner.style.transform = 'translateY(-10px)';
                    setTimeout(() => banner.remove(), 300);
                }
            }, 10000);
        }
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
     * Open habit bundles modal
     */
    openHabitBundlesModal() {
        const modal = document.getElementById('habit-bundles-modal');
        if (!modal) return;

        modal.style.display = 'flex';

        // Setup event listeners
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeHabitBundlesModal());
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeHabitBundlesModal();
        });

        // Bundle card click handlers
        modal.querySelectorAll('.habit-bundle-card button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.habit-bundle-card');
                const bundleName = card.dataset.bundle;
                this.addHabitBundle(bundleName);
            });
        });
    }

    /**
     * Close habit bundles modal
     */
    closeHabitBundlesModal() {
        const modal = document.getElementById('habit-bundles-modal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Get habit bundle definitions
     */
    getHabitBundles() {
        return {
            morning: [
                'Wake up early (6 AM)',
                'Morning meditation',
                'Exercise 30 min',
                'Healthy breakfast',
                'Plan the day'
            ],
            fitness: [
                'Workout session',
                'Walk 10,000 steps',
                'Stretch/Yoga',
                'Drink 8 glasses water',
                'Track calories'
            ],
            productivity: [
                'Deep work (2+ hours)',
                'No social media',
                'Review daily goals',
                'Learn something new',
                'Evening journal'
            ],
            wellness: [
                'Meditate 10 min',
                'Write 3 gratitudes',
                'Sleep 8 hours',
                'No screens 1hr before bed',
                'Self-care activity'
            ],
            learning: [
                'Read 30 minutes',
                'Practice a skill',
                'Take notes',
                'Review flashcards',
                'Teach/share knowledge'
            ],
            mindfulness: [
                'Morning meditation',
                'Breathing exercises',
                'Mindful eating',
                'Evening reflection',
                'Digital detox hour'
            ]
        };
    }

    /**
     * Add a habit bundle
     */
    async addHabitBundle(bundleName) {
        const bundles = this.getHabitBundles();
        const habits = bundles[bundleName];

        if (!habits) {
            this.showError('Bundle not found');
            return;
        }

        // Check if we have room
        const availableSlots = 30 - this.dailyHabits.length;
        if (availableSlots < habits.length) {
            this.showError(`Not enough slots. You have ${availableSlots} available, bundle needs ${habits.length}.`);
            return;
        }

        try {
            let addedCount = 0;
            for (const habitName of habits) {
                // Check if habit already exists
                const exists = this.dailyHabits.some(h =>
                    h.habit_name.toLowerCase() === habitName.toLowerCase()
                );

                if (!exists) {
                    const newHabit = {
                        habit_name: habitName,
                        order_index: this.dailyHabits.length
                    };
                    const created = await dataService.createDailyHabit(newHabit);
                    this.dailyHabits.push(created);
                    addedCount++;
                }
            }

            this.renderDailyHabits();
            this.closeHabitBundlesModal();

            if (addedCount > 0) {
                this.showSuccess(`Added ${addedCount} habits from ${bundleName} bundle!`);
            } else {
                this.showSuccess('All habits from this bundle already exist.');
            }
        } catch (error) {
            console.error('Failed to add habit bundle:', error);
            this.showError('Failed to add habits. Please try again.');
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
    async toggleDailyHabitCompletion(habitId, date, completed, checkboxCell = null) {
        try {
            await dataService.toggleDailyHabitCompletion(habitId, date, completed);

            // Update local state
            const existingIndex = this.dailyHabitCompletions.findIndex(c => c.habit_id === habitId && c.date === date);
            if (existingIndex >= 0) {
                this.dailyHabitCompletions[existingIndex].completed = completed;
            } else {
                this.dailyHabitCompletions.push({ habit_id: habitId, date, completed });
            }

            // Add celebration animation if completing
            if (completed && checkboxCell) {
                this.celebrateCompletion(checkboxCell);
            }

            // Recalculate progress
            this.calculateDailyProgress();
        } catch (error) {
            console.error('Failed to toggle habit completion:', error);
            this.showError('Failed to update completion. Please try again.');
        }
    }

    /**
     * Show celebration animation when completing a habit
     */
    celebrateCompletion(cell) {
        cell.classList.add('just-completed');

        // Get user preferences
        const prefs = this.getPreferences();

        // Play completion sound (if enabled)
        if (prefs.soundEnabled !== false) {
            this.playCompletionSound();
        }

        // Haptic feedback on mobile (if enabled)
        if (prefs.hapticEnabled !== false && navigator.vibrate) {
            navigator.vibrate(50);
        }

        // Remove the class after animation completes
        setTimeout(() => {
            cell.classList.remove('just-completed');
        }, 500);
    }

    /**
     * Get user preferences from localStorage
     */
    getPreferences() {
        try {
            const stored = localStorage.getItem('stillmove_preferences');
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    }

    /**
     * Filter habits by completion status
     */
    filterHabits(filterValue) {
        const today = formatDate(new Date());
        const habitItems = document.querySelectorAll('#daily-habits-list .habit-item');

        habitItems.forEach(item => {
            const habitId = item.dataset.habitId;
            const habit = this.dailyHabits.find(h => h.id == habitId);
            if (!habit) return;

            // Check if completed today
            const completedToday = this.dailyHabitCompletions.some(
                c => c.habit_id == habitId && c.date === today && c.completed
            );

            // Calculate streak
            const streak = this.calculateStreak(habitId);

            let show = true;
            switch (filterValue) {
                case 'completed':
                    show = completedToday;
                    break;
                case 'incomplete':
                    show = !completedToday;
                    break;
                case 'streak':
                    show = streak > 0;
                    break;
                default:
                    show = true;
            }

            item.classList.toggle('filtered-out', !show);
        });
    }

    /**
     * Play a subtle completion sound
     */
    playCompletionSound() {
        try {
            // Create a simple audio context for a subtle "pop" sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // Audio not supported or blocked, silently fail
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
     * Show habit note modal for adding/editing notes
     */
    showHabitNoteModal(habit, date, existingNote) {
        // Remove existing modal if any
        const existingModal = document.getElementById('habit-note-modal');
        if (existingModal) existingModal.remove();

        const formattedDate = new Date(date).toLocaleDateString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric'
        });

        const modal = document.createElement('div');
        modal.id = 'habit-note-modal';
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>📝 Habit Note</h3>
                    <button class="modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-secondary); margin-bottom: 0.5rem; font-size: 0.85rem;">
                        <strong>${habit.habit_name}</strong> • ${formattedDate}
                    </p>
                    <textarea id="habit-note-input" 
                              placeholder="Add a note about this habit completion..."
                              rows="4"
                              style="width: 100%; resize: vertical;">${existingNote}</textarea>
                    <p style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.5rem;">
                        💡 Tip: Double-click any habit cell to add a note
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-close">Cancel</button>
                    <button class="btn-primary" id="save-habit-note-btn">Save Note</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Focus textarea
        modal.querySelector('#habit-note-input').focus();

        // Close handlers
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Save handler
        modal.querySelector('#save-habit-note-btn').addEventListener('click', async () => {
            const note = modal.querySelector('#habit-note-input').value.trim();
            await this.saveHabitNote(habit.id, date, note);
            modal.remove();
        });

        // Enter key to save (Ctrl+Enter)
        modal.querySelector('#habit-note-input').addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                const note = e.target.value.trim();
                await this.saveHabitNote(habit.id, date, note);
                modal.remove();
            }
        });
    }

    /**
     * Save habit note
     */
    async saveHabitNote(habitId, date, note) {
        try {
            // Update the completion with the note
            await dataService.updateHabitNote(habitId, date, note);

            // Update local state
            const completion = this.dailyHabitCompletions.find(
                c => c.habit_id === habitId && c.date === date
            );
            if (completion) {
                completion.notes = note;
            } else {
                this.dailyHabitCompletions.push({
                    habit_id: habitId,
                    date,
                    completed: false,
                    notes: note
                });
            }

            // Re-render grid to show note indicator
            this.renderDailyHabitsGrid();

            if (window.showToast) {
                window.showToast(note ? 'Note saved!' : 'Note removed', 'success');
            }
        } catch (error) {
            console.error('Failed to save habit note:', error);
            this.showError('Failed to save note. Please try again.');
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            console.log(message);
        }
    }

    /**
     * Initialize habit tracking chart
     */
    initHabitChart() {
        const select = document.getElementById('habit-chart-select');
        if (!select) return;

        // Populate select dropdown with daily habits
        select.innerHTML = '<option value="">Select a habit...</option>';
        this.dailyHabits.forEach(habit => {
            const option = document.createElement('option');
            option.value = habit.id;
            option.textContent = habit.habit_name || 'Unnamed Habit';
            select.appendChild(option);
        });

        // Add change listener
        select.addEventListener('change', () => {
            const habitId = select.value;
            if (habitId) {
                // Save preference
                localStorage.setItem('default_chart_habit_id', habitId);
                this.renderHabitChart(habitId);
            } else {
                // Clear preference
                localStorage.removeItem('default_chart_habit_id');
                this.clearHabitChart();
            }
        });

        // Auto-select habit: use saved preference if available and valid, otherwise default to first habit
        if (this.dailyHabits.length > 0) {
            const savedHabitId = localStorage.getItem('default_chart_habit_id');
            const hasSavedRaw = savedHabitId && this.dailyHabits.some(h => h.id === savedHabitId);

            // If saved habit exists in current list, select it. Otherwise select first one.
            const habitToSelect = hasSavedRaw ? savedHabitId : this.dailyHabits[0].id;

            select.value = habitToSelect;
            this.renderHabitChart(habitToSelect);
        }
    }

    /**
     * Get habit count value from completion
     * If notes contain a number, use that; otherwise 1 if completed, 0 if not
     */
    getHabitCountValue(completion) {
        if (!completion || !completion.completed) {
            return 0;
        }

        // Check if notes contain a number
        if (completion.notes) {
            const noteValue = parseFloat(completion.notes);
            if (!isNaN(noteValue) && noteValue > 0) {
                return noteValue;
            }
        }

        // Default to 1 if completed but no numeric note
        return 1;
    }

    /**
     * Render habit line chart for selected habit
     */
    renderHabitChart(habitId) {
        const chartLine = document.getElementById('chart-line');
        const chartArea = document.getElementById('chart-area');
        const chartPoints = document.getElementById('chart-points');
        const chartGrid = document.getElementById('chart-grid');
        const xAxis = document.getElementById('chart-x-axis');
        const yAxis = document.getElementById('chart-y-axis');

        if (!chartLine || !chartArea) return;

        const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
        const dailyValues = [];

        // Calculate values for each day
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const completion = this.dailyHabitCompletions.find(
                c => c.habit_id === habitId && c.date === dateStr
            );
            const value = this.getHabitCountValue(completion);
            dailyValues.push({ day, date: dateStr, value, completion });
        }

        // Calculate stats
        const total = dailyValues.reduce((sum, d) => sum + d.value, 0);
        const daysWithData = dailyValues.filter(d => d.value > 0).length;
        const avg = daysWithData > 0 ? (total / daysWithData).toFixed(1) : 0;
        const maxValue = Math.max(...dailyValues.map(d => d.value));
        const max = Math.max(maxValue, 1);

        // Update stats display
        const totalEl = document.getElementById('habit-stat-total');
        const avgEl = document.getElementById('habit-stat-avg');
        const maxEl = document.getElementById('habit-stat-max');
        const daysEl = document.getElementById('habit-stat-days');

        if (totalEl) totalEl.textContent = total;
        if (avgEl) avgEl.textContent = avg;
        if (maxEl) maxEl.textContent = maxValue;
        if (daysEl) daysEl.textContent = daysWithData;

        // SVG dimensions
        const width = 600;
        const height = 150;
        const padding = { top: 10, right: 10, bottom: 5, left: 5 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Generate points
        const points = dailyValues.map((d, i) => {
            const x = padding.left + (i / (daysInMonth - 1)) * chartWidth;
            const y = padding.top + chartHeight - (d.value / max) * chartHeight;
            return { x, y, ...d };
        });

        // Create line path
        const linePath = points.map((p, i) =>
            `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ');

        // Create area path (closed shape for fill)
        const areaPath = linePath +
            ` L ${points[points.length - 1].x} ${padding.top + chartHeight}` +
            ` L ${padding.left} ${padding.top + chartHeight} Z`;

        // Set paths
        chartLine.setAttribute('d', linePath);
        chartArea.setAttribute('d', areaPath);

        // Render grid lines
        if (chartGrid) {
            chartGrid.innerHTML = '';
            // Horizontal grid lines (4 lines)
            for (let i = 0; i <= 4; i++) {
                const y = padding.top + (i / 4) * chartHeight;
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', padding.left);
                line.setAttribute('y1', y);
                line.setAttribute('x2', width - padding.right);
                line.setAttribute('y2', y);
                line.setAttribute('class', 'grid-line');
                chartGrid.appendChild(line);
            }
        }

        // Render data points
        if (chartPoints) {
            chartPoints.innerHTML = '';
            const habit = this.dailyHabits.find(h => h.id === habitId);

            points.forEach((p) => {
                if (p.value > 0) {
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', p.x);
                    circle.setAttribute('cy', p.y);
                    circle.setAttribute('r', 4);
                    circle.setAttribute('class', 'data-point');

                    // Tooltip
                    const noteText = p.completion?.notes ? ` (${p.completion.notes})` : '';
                    circle.setAttribute('data-tooltip', `Day ${p.day}: ${p.value}${noteText}`);

                    // Click handler
                    circle.style.cursor = 'pointer';
                    circle.addEventListener('click', () => {
                        if (habit) {
                            this.showHabitNoteModal(habit, p.date, p.completion?.notes || '');
                        }
                    });

                    chartPoints.appendChild(circle);
                }
            });
        }

        // Render X axis labels
        if (xAxis) {
            xAxis.innerHTML = '';
            [1, Math.ceil(daysInMonth / 4), Math.ceil(daysInMonth / 2), Math.ceil(3 * daysInMonth / 4), daysInMonth].forEach(day => {
                const label = document.createElement('span');
                label.className = 'axis-label';
                label.textContent = day;
                const percent = ((day - 1) / (daysInMonth - 1)) * 100;
                label.style.left = `${percent}%`;
                xAxis.appendChild(label);
            });
        }

        // Render Y axis labels
        if (yAxis) {
            yAxis.innerHTML = '';
            [0, Math.round(max / 2), max].forEach((val, i) => {
                const label = document.createElement('span');
                label.className = 'axis-label';
                label.textContent = val;
                label.style.bottom = `${(i / 2) * 100}%`;
                yAxis.appendChild(label);
            });
        }
    }

    /**
     * Clear habit chart
     */
    clearHabitChart() {
        const chartLine = document.getElementById('chart-line');
        const chartArea = document.getElementById('chart-area');
        const chartPoints = document.getElementById('chart-points');
        const chartGrid = document.getElementById('chart-grid');
        const xAxis = document.getElementById('chart-x-axis');
        const yAxis = document.getElementById('chart-y-axis');

        if (chartLine) chartLine.setAttribute('d', '');
        if (chartArea) chartArea.setAttribute('d', '');
        if (chartPoints) chartPoints.innerHTML = '';
        if (chartGrid) chartGrid.innerHTML = '';
        if (xAxis) xAxis.innerHTML = '';
        if (yAxis) yAxis.innerHTML = '';

        const totalEl = document.getElementById('habit-stat-total');
        const avgEl = document.getElementById('habit-stat-avg');
        const maxEl = document.getElementById('habit-stat-max');
        const daysEl = document.getElementById('habit-stat-days');

        if (totalEl) totalEl.textContent = '0';
        if (avgEl) avgEl.textContent = '0';
        if (maxEl) maxEl.textContent = '0';
        if (daysEl) daysEl.textContent = '0';
    }
}

export default HabitsView;
