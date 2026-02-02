/**
 * Weekly View Controller
 * Handles the weekly planning and time block interface
 */

import dataService from '../js/data-service.js';
import { formatDate, getCategoryColor, getCategoryGradient } from '../js/utils.js';
import aiService from '../js/ai-service.js';

// Time slot configuration (4:00 to 23:00 in 30-minute increments)
const START_HOUR = 4;
const END_HOUR = 23;
const SLOT_MINUTES = 30;

class WeeklyView {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.currentDate = new Date();
        this.weekStart = this.getWeekStart(this.currentDate);
        this.weeklyGoals = [];
        this.timeBlocks = [];
        this.dailyEntries = {};
        this.selectedCategory = null;
        this.editingBlock = null;
        this.categories = [];

        // Drag and drop state
        this.draggedBlock = null;
        this.draggedElement = null;
        this.dragStartSlot = null;
    }

    /**
     * Initialize the weekly view
     */
    async init(container) {
        this.container = container;

        // Load the HTML template
        const response = await fetch('views/weekly-view.html');
        const html = await response.text();
        this.container.innerHTML = html;

        // Setup event listeners
        this.setupEventListeners();

        // Load categories first
        await this.loadCategories();

        // Load data
        await this.loadData();
    }

    /**
     * Get the start of the week (Monday) for a given date
     */
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        // Calculate days to subtract to get to Monday (day 1)
        // If Sunday (0), go back 6 days; otherwise go back (day - 1) days
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return d;
    }

    /**
     * Get week number for a date
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Week navigation
        document.getElementById('prev-week-btn')?.addEventListener('click', () => this.changeWeek(-1));
        document.getElementById('next-week-btn')?.addEventListener('click', () => this.changeWeek(1));
        document.getElementById('today-week-btn')?.addEventListener('click', () => this.goToToday());
        document.getElementById('export-ical-btn')?.addEventListener('click', () => this.exportToICal());

        // Add weekly goal button
        document.getElementById('add-weekly-goal-btn')?.addEventListener('click', () => this.addWeeklyGoal());

        // Manage categories button
        document.getElementById('manage-categories-btn')?.addEventListener('click', () => this.openCategoryManager());

        // Clear filter button
        document.getElementById('clear-filter-btn')?.addEventListener('click', () => {
            this.selectedCategory = null;
            document.querySelectorAll('.category-item').forEach(item => {
                item.classList.remove('selected', 'filter-active');
            });
            document.getElementById('clear-filter-btn').style.display = 'none';
            this.clearTimeBlockFilter();
        });

        // Time block modal
        this.setupModalListeners();

        // Recurring time block button
        document.getElementById('add-recurring-btn')?.addEventListener('click', () => this.openRecurringModal());

        // Template buttons
        document.getElementById('save-template-btn')?.addEventListener('click', () => this.openSaveTemplateModal());
        document.getElementById('load-template-btn')?.addEventListener('click', () => this.openLoadTemplateModal());

        // Recurring modal listeners
        this.setupRecurringModalListeners();

        // Template modal listeners
        this.setupTemplateModalListeners();

        // AI features
        document.getElementById('ai-weekly-insights-btn')?.addEventListener('click', () => this.showAIWeeklyInsights());
        document.getElementById('ai-categorize-btn')?.addEventListener('click', () => this.aiCategorizeActivity());
    }

    /**
     * Setup template modal event listeners
     */
    setupTemplateModalListeners() {
        // Save template modal
        const saveModal = document.getElementById('save-template-modal');
        if (saveModal) {
            saveModal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => this.closeSaveTemplateModal());
            });
            saveModal.addEventListener('click', (e) => {
                if (e.target === saveModal) this.closeSaveTemplateModal();
            });
            document.getElementById('confirm-save-template-btn')?.addEventListener('click', () => this.saveTemplate());
        }

        // Load template modal
        const loadModal = document.getElementById('load-template-modal');
        if (loadModal) {
            loadModal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => this.closeLoadTemplateModal());
            });
            loadModal.addEventListener('click', (e) => {
                if (e.target === loadModal) this.closeLoadTemplateModal();
            });
        }
    }

    /**
     * Setup recurring modal event listeners
     */
    setupRecurringModalListeners() {
        const modal = document.getElementById('recurring-modal');
        if (!modal) return;

        const closeButtons = modal.querySelectorAll('.modal-close');
        const saveButton = document.getElementById('save-recurring-btn');

        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeRecurringModal());
        });

        saveButton?.addEventListener('click', () => this.saveRecurringBlocks());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeRecurringModal();
            }
        });
    }

    /**
     * Setup modal event listeners
     */
    setupModalListeners() {
        const modal = document.getElementById('time-block-modal');
        const closeButtons = modal.querySelectorAll('.modal-close');
        const saveButton = document.getElementById('save-time-block-btn');
        const deleteButton = document.getElementById('delete-time-block-btn');
        const duplicateButton = document.getElementById('duplicate-time-block-btn');

        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        saveButton?.addEventListener('click', () => this.saveTimeBlock());
        deleteButton?.addEventListener('click', () => this.deleteTimeBlock());
        duplicateButton?.addEventListener('click', () => this.duplicateTimeBlock());

        // Close modal on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Minute shortcut buttons
        modal.querySelectorAll('.minute-shortcuts').forEach(container => {
            const targetId = container.dataset.target;
            const timeInput = document.getElementById(targetId);

            container.querySelectorAll('.btn-minute').forEach(btn => {
                btn.addEventListener('click', () => {
                    const minute = btn.dataset.minute;
                    const currentValue = timeInput.value;

                    if (currentValue) {
                        // Update the minute portion of the existing time
                        const [hour] = currentValue.split(':');
                        timeInput.value = `${hour}:${minute}`;
                    } else {
                        // Default to current hour with selected minute
                        const now = new Date();
                        const hour = String(now.getHours()).padStart(2, '0');
                        timeInput.value = `${hour}:${minute}`;
                    }

                    // Trigger change event
                    timeInput.dispatchEvent(new Event('change'));
                });
            });
        });
    }

    /**
     * Duplicate the current time block
     */
    async duplicateTimeBlock() {
        if (!this.editingBlock) return;

        try {
            // Create a copy with the next day's date
            const originalDate = new Date(this.editingBlock.date);
            originalDate.setDate(originalDate.getDate() + 1);

            const newBlock = {
                date: formatDate(originalDate),
                start_time: this.editingBlock.start_time,
                end_time: this.editingBlock.end_time,
                activity: this.editingBlock.activity,
                category: this.editingBlock.category
            };

            const created = await dataService.createTimeBlock(newBlock);
            this.timeBlocks.push(created);
            this.renderTimeBlocks();
            this.closeModal();
            this.showSuccess('Time block duplicated to next day');
        } catch (error) {
            console.error('Failed to duplicate time block:', error);
            this.showError('Failed to duplicate time block');
        }
    }

    /**
     * Change week
     */
    async changeWeek(delta) {
        this.weekStart.setDate(this.weekStart.getDate() + (delta * 7));
        this.updateWeekDisplay();
        await this.loadData();
    }

    /**
     * Go to current week (Today button)
     */
    async goToToday() {
        this.currentDate = new Date();
        this.weekStart = this.getWeekStart(this.currentDate);
        this.updateWeekDisplay();
        await this.loadData();
    }

    /**
     * Go to a specific date
     */
    async goToDate(date) {
        this.currentDate = new Date(date);
        this.weekStart = this.getWeekStart(this.currentDate);
        this.updateWeekDisplay();
        await this.loadData();
    }

    /**
     * Export current week's time blocks to iCal
     */
    exportToICal() {
        if (this.timeBlocks.length === 0) {
            this.showError('No time blocks to export');
            return;
        }

        try {
            dataService.exportToICal(this.timeBlocks);
            this.showSuccess('Schedule exported to iCal');
        } catch (error) {
            console.error('Failed to export iCal:', error);
            this.showError('Failed to export schedule');
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // Use toast if available, otherwise alert
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            const toast = document.createElement('div');
            toast.className = 'toast toast-success';
            toast.innerHTML = `<span class="toast-message">${message}</span>`;
            toastContainer.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }

    /**
     * Update week display
     */
    updateWeekDisplay() {
        const weekEnd = new Date(this.weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const startMonth = monthNames[this.weekStart.getMonth()];
        const endMonth = monthNames[weekEnd.getMonth()];
        const startDay = this.weekStart.getDate();
        const endDay = weekEnd.getDate();
        const year = this.weekStart.getFullYear();

        let displayText;
        if (startMonth === endMonth) {
            displayText = `Week of ${startMonth} ${startDay} - ${endDay}, ${year}`;
        } else {
            displayText = `Week of ${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
        }

        document.getElementById('current-week-range').textContent = displayText;

        // Update breadcrumb context
        const breadcrumbContext = document.getElementById('breadcrumb-context');
        if (breadcrumbContext) {
            if (startMonth === endMonth) {
                breadcrumbContext.textContent = `${startMonth} ${startDay}-${endDay}, ${year}`;
            } else {
                breadcrumbContext.textContent = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
            }
        }

        // Update day headers (Monday = 1, Sunday = 0)
        const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday
        for (let i = 0; i < 7; i++) {
            const date = new Date(this.weekStart);
            date.setDate(date.getDate() + i);

            const dayOfWeek = dayOrder[i];
            const dayHeader = document.querySelector(`.day-header[data-day="${dayOfWeek}"]`);
            if (dayHeader) {
                const dateEl = dayHeader.querySelector('.day-date');
                if (dateEl) {
                    dateEl.textContent = `${monthNames[date.getMonth()]} ${date.getDate()}`;
                }

                // Highlight today
                const today = new Date();
                if (date.toDateString() === today.toDateString()) {
                    dayHeader.classList.add('today');
                } else {
                    dayHeader.classList.remove('today');
                }
            }
        }
    }

    /**
     * Load data for the current week
     */
    async loadData() {
        try {
            const weekEnd = new Date(this.weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            const startDate = formatDate(this.weekStart);
            const endDate = formatDate(weekEnd);

            // Load weekly goals
            const weekNumber = this.getWeekNumber(this.weekStart);
            this.weeklyGoals = await dataService.getWeeklyGoals(this.weekStart.getFullYear(), weekNumber);

            // Load time blocks for the week
            this.timeBlocks = await dataService.getTimeBlocksRange(startDate, endDate);

            // Load daily entries for the week
            this.dailyEntries = {};
            for (let i = 0; i < 7; i++) {
                const date = new Date(this.weekStart);
                date.setDate(date.getDate() + i);
                const dateStr = formatDate(date);
                const entry = await dataService.getDailyEntry(dateStr);
                if (entry) {
                    this.dailyEntries[dateStr] = entry;
                }
            }

            // Render all components
            this.updateWeekDisplay();
            this.renderWeeklyGoals();
            this.renderTimeSlots();
            this.renderTimeBlocks();
            this.renderDailySections();
            this.updateWeeklySummary();

        } catch (error) {
            console.error('Failed to load weekly data:', error);
            this.showError('Failed to load data. Please try again.');
        }
    }

    /**
     * Update weekly summary stats
     */
    updateWeeklySummary() {
        // Goals completed
        const completedGoals = this.weeklyGoals.filter(g => g.completed).length;
        const totalGoals = this.weeklyGoals.length;
        const goalsEl = document.getElementById('goals-completed');
        if (goalsEl) {
            goalsEl.textContent = `${completedGoals}/${totalGoals}`;
        }

        // Time blocks count
        const blocksEl = document.getElementById('time-blocks-count');
        if (blocksEl) {
            blocksEl.textContent = this.timeBlocks.length;
        }

        // Calculate total scheduled hours
        let totalMinutes = 0;
        this.timeBlocks.forEach(block => {
            if (block.start_time && block.end_time) {
                const startParts = block.start_time.split(':');
                const endParts = block.end_time.split(':');
                const startMins = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
                const endMins = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
                totalMinutes += (endMins - startMins);
            } else if (block.start_time) {
                // Default 30 min if no end time
                totalMinutes += 30;
            }
        });

        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const hoursEl = document.getElementById('scheduled-hours');
        if (hoursEl) {
            hoursEl.textContent = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }

        // Load and compare with last week
        this.loadWeekComparison();
    }

    /**
     * Load last week's data for comparison
     */
    async loadWeekComparison() {
        try {
            const lastWeekStart = new Date(this.weekStart);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);

            const startDate = formatDate(lastWeekStart);
            const endDate = formatDate(lastWeekEnd);

            // Get last week's time blocks
            const lastWeekBlocks = await dataService.getTimeBlocksRange(startDate, endDate);

            // Compare
            const currentBlocks = this.timeBlocks.length;
            const lastBlocks = lastWeekBlocks.length;
            const diff = currentBlocks - lastBlocks;

            const comparisonEl = document.getElementById('week-comparison');
            if (comparisonEl) {
                if (diff > 0) {
                    comparisonEl.innerHTML = `<span class="comparison-text"><span class="trend-up">↑ ${diff}</span> more blocks than last week</span>`;
                    comparisonEl.style.display = 'block';
                } else if (diff < 0) {
                    comparisonEl.innerHTML = `<span class="comparison-text"><span class="trend-down">↓ ${Math.abs(diff)}</span> fewer blocks than last week</span>`;
                    comparisonEl.style.display = 'block';
                } else if (lastBlocks > 0) {
                    comparisonEl.innerHTML = `<span class="comparison-text"><span class="trend-same">→</span> Same as last week</span>`;
                    comparisonEl.style.display = 'block';
                } else {
                    comparisonEl.style.display = 'none';
                }
            }

            // Calculate and show productivity score
            this.updateProductivityScore();
        } catch (error) {
            console.log('Could not load week comparison:', error);
        }
    }

    /**
     * Calculate and display productivity score
     * Based on: goals completed, time blocks scheduled, daily entries filled
     */
    updateProductivityScore() {
        // Calculate score components (each worth up to 33.3%)
        let score = 0;

        // 1. Goals completion (33.3%)
        const totalGoals = this.weeklyGoals.length;
        const completedGoals = this.weeklyGoals.filter(g => g.completed).length;
        if (totalGoals > 0) {
            score += (completedGoals / totalGoals) * 33.3;
        } else {
            score += 16.65; // Neutral if no goals set
        }

        // 2. Time blocks scheduled (33.3%) - based on having at least 20 blocks
        const blockScore = Math.min(this.timeBlocks.length / 20, 1) * 33.3;
        score += blockScore;

        // 3. Daily entries filled (33.3%)
        const filledDays = Object.values(this.dailyEntries).filter(entry =>
            entry.journal_text || entry.gratitude_text || (entry.checklist && entry.checklist.length > 0)
        ).length;
        score += (filledDays / 7) * 33.3;

        // Round to nearest integer
        score = Math.round(score);

        // Update UI
        const scoreEl = document.getElementById('productivity-score');
        if (scoreEl) {
            const circle = scoreEl.querySelector('.circle');
            const text = scoreEl.querySelector('.score-text');

            if (circle && text) {
                circle.setAttribute('stroke-dasharray', `${score}, 100`);
                text.textContent = `${score}%`;

                // Set color class based on score
                scoreEl.classList.remove('score-low', 'score-medium', 'score-high');
                if (score < 40) {
                    scoreEl.classList.add('score-low');
                } else if (score < 70) {
                    scoreEl.classList.add('score-medium');
                } else {
                    scoreEl.classList.add('score-high');
                }

                scoreEl.style.display = 'flex';
            }
        }

        // Calculate best performing day
        this.updateBestDayAnalysis();
    }

    /**
     * Calculate and display the best performing day of the week
     */
    updateBestDayAnalysis() {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat

        // Count time blocks per day
        this.timeBlocks.forEach(block => {
            const blockDate = new Date(block.date);
            const dayOfWeek = blockDate.getDay();
            dayCounts[dayOfWeek]++;
        });

        // Find the day with most blocks
        let maxCount = 0;
        let bestDayIndex = -1;

        dayCounts.forEach((count, index) => {
            if (count > maxCount) {
                maxCount = count;
                bestDayIndex = index;
            }
        });

        // Update UI
        const analysisEl = document.getElementById('best-day-analysis');
        const nameEl = document.getElementById('best-day-name');
        const countEl = document.getElementById('best-day-count');

        if (analysisEl && nameEl && countEl) {
            if (maxCount > 0) {
                nameEl.textContent = dayNames[bestDayIndex];
                countEl.textContent = `(${maxCount} blocks)`;
                analysisEl.style.display = 'flex';
            } else {
                analysisEl.style.display = 'none';
            }
        }
    }

    /**
     * Render weekly goals
     */
    renderWeeklyGoals() {
        const container = document.getElementById('weekly-goals-container');
        if (!container) return;

        container.innerHTML = '';

        if (this.weeklyGoals.length === 0) {
            // Show empty state
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div class="empty-state-icon">🎯</div>
                <div class="empty-state-title">No goals yet</div>
                <div class="empty-state-description">Set your weekly goals to stay focused and productive.</div>
            `;
            container.appendChild(emptyState);
            return;
        }

        this.weeklyGoals.forEach(goal => {
            const goalItem = this.createWeeklyGoalItem(goal);
            container.appendChild(goalItem);
        });
    }

    /**
     * Create a weekly goal item element
     */
    createWeeklyGoalItem(goal) {
        const template = document.getElementById('weekly-goal-template');
        const item = template.content.cloneNode(true).querySelector('.weekly-goal-item');

        item.dataset.goalId = goal.id;

        const checkbox = item.querySelector('.goal-checkbox');
        const textInput = item.querySelector('.goal-text');
        const prioritySelect = item.querySelector('.goal-priority');
        const priorityIndicator = item.querySelector('.goal-priority-indicator');

        checkbox.checked = goal.completed || false;
        textInput.value = goal.goal_text || '';
        prioritySelect.value = goal.priority || 'Medium';

        // Set priority indicator color
        const priorityColors = {
            'Urgent': '#f44336',
            'Medium': '#ff9800',
            'Low': '#4caf50'
        };
        priorityIndicator.style.backgroundColor = priorityColors[goal.priority] || priorityColors['Medium'];

        // Event listeners
        checkbox.addEventListener('change', (e) => {
            this.toggleWeeklyGoal(goal.id, e.target.checked);
        });

        textInput.addEventListener('blur', (e) => {
            this.updateWeeklyGoalText(goal.id, e.target.value);
        });

        prioritySelect.addEventListener('change', (e) => {
            this.updateWeeklyGoalPriority(goal.id, e.target.value);
            priorityIndicator.style.backgroundColor = priorityColors[e.target.value];
        });

        item.querySelector('.delete-goal-btn').addEventListener('click', () => {
            this.deleteWeeklyGoal(goal.id);
        });

        return item;
    }

    /**
     * Add a new weekly goal
     */
    async addWeeklyGoal() {
        try {
            const weekNumber = this.getWeekNumber(this.weekStart);
            const newGoal = {
                year: this.weekStart.getFullYear(),
                week_number: weekNumber,
                goal_text: '',
                priority: 'Medium',
                completed: false
            };

            const created = await dataService.createWeeklyGoal(newGoal);
            this.weeklyGoals.push(created);
            this.renderWeeklyGoals();
        } catch (error) {
            console.error('Failed to add weekly goal:', error);
            this.showError('Failed to add goal. Please try again.');
        }
    }

    /**
     * Toggle weekly goal completion
     */
    async toggleWeeklyGoal(goalId, completed) {
        try {
            await dataService.updateWeeklyGoal(goalId, { completed });
            const goal = this.weeklyGoals.find(g => g.id === goalId);
            if (goal) {
                goal.completed = completed;
            }
        } catch (error) {
            console.error('Failed to toggle goal:', error);
            this.showError('Failed to update goal. Please try again.');
        }
    }

    /**
     * Update weekly goal text
     */
    async updateWeeklyGoalText(goalId, text) {
        try {
            await dataService.updateWeeklyGoal(goalId, { goal_text: text });
            const goal = this.weeklyGoals.find(g => g.id === goalId);
            if (goal) {
                goal.goal_text = text;
            }
        } catch (error) {
            console.error('Failed to update goal text:', error);
            this.showError('Failed to update goal. Please try again.');
        }
    }

    /**
     * Update weekly goal priority
     */
    async updateWeeklyGoalPriority(goalId, priority) {
        try {
            await dataService.updateWeeklyGoal(goalId, { priority });
            const goal = this.weeklyGoals.find(g => g.id === goalId);
            if (goal) {
                goal.priority = priority;
            }
        } catch (error) {
            console.error('Failed to update goal priority:', error);
            this.showError('Failed to update goal. Please try again.');
        }
    }

    /**
     * Delete a weekly goal with undo capability
     */
    async deleteWeeklyGoal(goalId) {
        // Find and store the goal for potential undo
        const deletedGoal = this.weeklyGoals.find(g => g.id === goalId);
        if (!deletedGoal) return;

        try {
            await dataService.deleteWeeklyGoal(goalId);
            this.weeklyGoals = this.weeklyGoals.filter(g => g.id !== goalId);
            this.renderWeeklyGoals();

            // Show toast with undo option
            this.showUndoToast('Goal deleted', async () => {
                try {
                    const { id, user_id, created_at, updated_at, ...goalData } = deletedGoal;
                    const restored = await dataService.createWeeklyGoal(goalData);
                    this.weeklyGoals.push(restored);
                    this.renderWeeklyGoals();
                    this.showSuccess('Goal restored');
                } catch (error) {
                    console.error('Failed to restore goal:', error);
                    this.showError('Failed to restore goal');
                }
            });
        } catch (error) {
            console.error('Failed to delete goal:', error);
            this.showError('Failed to delete goal. Please try again.');
        }
    }

    /**
     * Render time slots grid
     */
    renderTimeSlots() {
        const container = document.getElementById('time-slots-grid');
        if (!container) return;

        container.innerHTML = '';

        // Calculate number of slots
        const totalHours = END_HOUR - START_HOUR;
        const slotsPerHour = 60 / SLOT_MINUTES;
        const totalSlots = totalHours * slotsPerHour;

        // Create time slots
        for (let slot = 0; slot <= totalSlots; slot++) {
            const hour = START_HOUR + Math.floor(slot / slotsPerHour);
            const minute = (slot % slotsPerHour) * SLOT_MINUTES;

            // Time label column
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            if (minute === 0) {
                timeLabel.textContent = `${hour}:00`;
            }
            container.appendChild(timeLabel);

            // Day columns
            for (let day = 0; day < 7; day++) {
                const slotCell = document.createElement('div');
                slotCell.className = 'time-slot';
                slotCell.dataset.day = day;
                slotCell.dataset.hour = hour;
                slotCell.dataset.minute = minute;

                // Add click handler to create time block
                slotCell.addEventListener('click', (e) => {
                    if (e.target === slotCell) {
                        this.openTimeBlockModal(day, hour, minute);
                    }
                });

                container.appendChild(slotCell);
            }
        }
    }

    /**
     * Render time blocks on the grid
     */
    renderTimeBlocks() {
        // Clear any existing time block content from slots
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.innerHTML = '';
            slot.classList.remove('has-block');
            slot.style.background = '';
        });

        this.timeBlocks.forEach(block => {
            this.renderTimeBlock(block);
        });
    }

    /**
     * Render a single time block by placing content inside the correct time slots
     */
    renderTimeBlock(block) {
        const blockDate = new Date(block.date);
        let dayOfWeek = blockDate.getDay();

        // Adjust day of week for Monday start (Monday=0, Sunday=6)
        dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        // Parse start time - Supabase returns TIME as "HH:MM:SS" in 24-hour format
        const startParts = block.start_time.split(':');
        const startHour = parseInt(startParts[0], 10);
        const startMinute = parseInt(startParts[1], 10);

        // Check if time is within display range
        if (startHour < START_HOUR || startHour >= END_HOUR) {
            return;
        }

        // Calculate duration in minutes (default to 30 minutes if no end time)
        let durationMinutes = 30;
        if (block.end_time) {
            const endParts = block.end_time.split(':');
            const endHour = parseInt(endParts[0], 10);
            const endMinute = parseInt(endParts[1], 10);
            durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
        }

        // Get category colors
        const color = this.getCategoryColor(block.category);
        const gradient = this.getCategoryGradient(block.category);

        // Calculate how many 30-minute slots this block spans
        const slotsToFill = Math.ceil(durationMinutes / 30);

        // Fill all slots that this block spans
        let currentHour = startHour;
        let currentMinute = startMinute;

        for (let i = 0; i < slotsToFill; i++) {
            // Find the slot for this time
            const slot = document.querySelector(
                `.time-slot[data-day="${dayOfWeek}"][data-hour="${currentHour}"][data-minute="${currentMinute}"]`
            );

            if (slot) {
                // Style the slot with category colors - subtle approach
                slot.classList.add('has-block');

                // Use subtle background tint (15% opacity) instead of full gradient
                const categoryColor = color || '#4CAF50';
                slot.style.background = `linear-gradient(135deg, ${categoryColor}20 0%, ${categoryColor}10 100%)`;
                slot.style.cursor = 'pointer';
                slot.style.borderLeft = `4px solid ${categoryColor}`;

                // Store category color as CSS variable for potential use
                slot.style.setProperty('--category-color', categoryColor);

                // Clear slot content first
                slot.innerHTML = '';

                // Determine slot position and styling
                const isFirstSlot = (i === 0);
                const isLastSlot = (i === slotsToFill - 1);
                const isSingleSlot = (slotsToFill === 1);

                // Set border radius based on position
                if (isSingleSlot) {
                    slot.style.borderRadius = '8px';
                } else if (isFirstSlot) {
                    slot.style.borderRadius = '8px 8px 0 0';
                } else if (isLastSlot) {
                    slot.style.borderRadius = '0 0 8px 8px';
                } else {
                    slot.style.borderRadius = '0';
                }

                // Add activity text to first slot
                if (isFirstSlot) {
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'time-block-content';
                    contentDiv.style.color = 'inherit';
                    contentDiv.style.fontSize = '0.85rem';
                    contentDiv.style.fontWeight = '600';
                    contentDiv.style.padding = '0.25rem';
                    contentDiv.style.whiteSpace = 'normal';
                    contentDiv.style.wordWrap = 'break-word';
                    contentDiv.style.lineHeight = '1.3';

                    // Add category icon
                    const icon = this.getCategoryIcon(block.category);
                    contentDiv.innerHTML = `<span class="block-icon">${icon}</span> ${block.activity}`;
                    slot.appendChild(contentDiv);
                }

                // Add resize handle to last slot (or single slot)
                if (isLastSlot) {
                    const resizeHandle = document.createElement('div');
                    resizeHandle.className = 'time-block-resize-handle';
                    resizeHandle.dataset.blockId = block.id;
                    slot.appendChild(resizeHandle);

                    resizeHandle.addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        this.handleResizeStart(e, block, slot);
                    });
                }

                // Make the first slot draggable
                if (i === 0) {
                    slot.draggable = true;
                    slot.dataset.blockId = block.id;

                    slot.addEventListener('dragstart', (e) => {
                        this.handleDragStart(e, block, slot);
                    });

                    slot.addEventListener('dragend', (e) => {
                        this.handleDragEnd(e);
                    });
                }

                // Store block data and click handler on all slots
                slot.dataset.blockId = block.id;
                slot.onclick = (e) => {
                    e.stopPropagation();
                    this.editTimeBlock(block);
                };
            }

            // Move to next 30-minute slot
            currentMinute += 30;
            if (currentMinute >= 60) {
                currentMinute = 0;
                currentHour++;
            }
        }
    }

    /**
     * Select a category (for filtering and default selection)
     */
    selectCategory(category) {
        const clearBtn = document.getElementById('clear-filter-btn');

        if (this.selectedCategory === category) {
            // Deselect - clear filter
            this.selectedCategory = null;
            document.querySelectorAll('.category-item').forEach(item => {
                item.classList.remove('selected', 'filter-active');
            });
            if (clearBtn) clearBtn.style.display = 'none';
            this.clearTimeBlockFilter();
        } else {
            // Select - apply filter
            this.selectedCategory = category;
            document.querySelectorAll('.category-item').forEach(item => {
                const isSelected = item.dataset.category === category;
                item.classList.toggle('selected', isSelected);
                item.classList.toggle('filter-active', isSelected);
            });
            if (clearBtn) clearBtn.style.display = 'block';
            this.filterTimeBlocksByCategory(category);
        }
    }

    /**
     * Filter time blocks by category
     */
    filterTimeBlocksByCategory(category) {
        document.querySelectorAll('.time-slot').forEach(slot => {
            const blockId = slot.dataset.blockId;
            if (blockId) {
                const block = this.timeBlocks.find(b => b.id == blockId);
                if (block && block.category !== category) {
                    slot.classList.add('filtered-out');
                } else {
                    slot.classList.remove('filtered-out');
                }
            }
        });
    }

    /**
     * Clear time block filter
     */
    clearTimeBlockFilter() {
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('filtered-out');
        });
    }

    /**
     * Open time block modal for creating a new block
     */
    openTimeBlockModal(day, hour, minute) {
        this.editingBlock = null;

        const modal = document.getElementById('time-block-modal');
        const title = document.getElementById('modal-title');
        const deleteBtn = document.getElementById('delete-time-block-btn');
        const duplicateBtn = document.getElementById('duplicate-time-block-btn');

        title.textContent = 'Add Time Block';
        deleteBtn.style.display = 'none';
        if (duplicateBtn) duplicateBtn.style.display = 'none';

        // Set date - day parameter is 0-6 where 0=Monday, 6=Sunday
        // This matches our week start (Monday)
        const date = new Date(this.weekStart);
        date.setDate(date.getDate() + day);
        document.getElementById('block-date').value = formatDate(date);

        // Set start time
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        document.getElementById('block-start-time').value = timeStr;

        // Set end time (30 minutes later)
        const endMinute = minute + 30;
        const endHour = hour + Math.floor(endMinute / 60);
        const endMin = endMinute % 60;
        document.getElementById('block-end-time').value = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

        // Clear other fields
        document.getElementById('block-activity').value = '';
        document.getElementById('block-category').value = this.selectedCategory || 'Personal';

        modal.style.display = 'flex';
    }

    /**
     * Edit an existing time block
     */
    editTimeBlock(block) {
        this.editingBlock = block;

        const modal = document.getElementById('time-block-modal');
        const title = document.getElementById('modal-title');
        const deleteBtn = document.getElementById('delete-time-block-btn');
        const duplicateBtn = document.getElementById('duplicate-time-block-btn');

        title.textContent = 'Edit Time Block';
        deleteBtn.style.display = 'block';
        if (duplicateBtn) duplicateBtn.style.display = 'block';

        // Populate form
        document.getElementById('block-date').value = block.date;
        document.getElementById('block-start-time').value = block.start_time;
        document.getElementById('block-end-time').value = block.end_time || '';
        document.getElementById('block-activity').value = block.activity;
        document.getElementById('block-category').value = block.category || 'Personal';

        modal.style.display = 'flex';
    }

    /**
     * Close time block modal
     */
    closeModal() {
        const modal = document.getElementById('time-block-modal');
        modal.style.display = 'none';
        this.editingBlock = null;
    }

    /**
     * Save time block (create or update)
     */
    async saveTimeBlock() {
        try {
            const date = document.getElementById('block-date').value;
            const startTime = document.getElementById('block-start-time').value;
            const endTime = document.getElementById('block-end-time').value;
            const activity = document.getElementById('block-activity').value;
            const category = document.getElementById('block-category').value;

            if (!date || !startTime || !activity) {
                alert('Please fill in all required fields');
                return;
            }

            const blockData = {
                date,
                start_time: startTime,
                end_time: endTime || null,
                activity,
                category
            };

            if (this.editingBlock) {
                // Update existing block
                await dataService.updateTimeBlock(this.editingBlock.id, blockData);
                Object.assign(this.editingBlock, blockData);
            } else {
                // Create new block
                const created = await dataService.createTimeBlock(blockData);

                // Check if the created block is within the current week
                const blockDate = new Date(created.date);
                blockDate.setHours(0, 0, 0, 0);

                const weekStart = new Date(this.weekStart);
                weekStart.setHours(0, 0, 0, 0);

                const weekEnd = new Date(this.weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);

                if (blockDate >= weekStart && blockDate <= weekEnd) {
                    this.timeBlocks.push(created);
                }
            }

            this.renderTimeBlocks();
            this.closeModal();
        } catch (error) {
            console.error('Failed to save time block:', error);
            this.showError('Failed to save time block. Please try again.');
        }
    }

    /**
     * Delete time block with undo capability
     */
    async deleteTimeBlock() {
        if (!this.editingBlock) return;

        // Store the block for potential undo
        const deletedBlock = { ...this.editingBlock };

        try {
            await dataService.deleteTimeBlock(this.editingBlock.id);
            this.timeBlocks = this.timeBlocks.filter(b => b.id !== this.editingBlock.id);
            this.renderTimeBlocks();
            this.closeModal();

            // Show toast with undo option
            this.showUndoToast('Time block deleted', async () => {
                try {
                    // Recreate the block
                    const { id, user_id, created_at, updated_at, ...blockData } = deletedBlock;
                    const restored = await dataService.createTimeBlock(blockData);
                    this.timeBlocks.push(restored);
                    this.renderTimeBlocks();
                    this.showSuccess('Time block restored');
                } catch (error) {
                    console.error('Failed to restore time block:', error);
                    this.showError('Failed to restore time block');
                }
            });
        } catch (error) {
            console.error('Failed to delete time block:', error);
            this.showError('Failed to delete time block. Please try again.');
        }
    }

    /**
     * Show toast with undo action
     */
    showUndoToast(message, undoCallback) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = 'toast toast-info';
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-action">Undo</button>
        `;
        toastContainer.appendChild(toast);

        const undoBtn = toast.querySelector('.toast-action');
        undoBtn?.addEventListener('click', () => {
            undoCallback();
            toast.remove();
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    /**
     * Render daily sections
     */
    renderDailySections() {
        const container = document.getElementById('daily-sections-container');
        if (!container) return;

        container.innerHTML = '';

        for (let i = 0; i < 7; i++) {
            const date = new Date(this.weekStart);
            date.setDate(date.getDate() + i);
            const dateStr = formatDate(date);

            const dailySection = this.createDailySection(date, dateStr);
            container.appendChild(dailySection);
        }
    }

    /**
     * Create a daily section element
     */
    createDailySection(date, dateStr) {
        const template = document.getElementById('daily-section-template');
        const section = template.content.cloneNode(true).querySelector('.daily-section');

        section.dataset.date = dateStr;

        // Set date header
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dateHeader = section.querySelector('.daily-section-date');
        // Adjust day index for Monday start
        const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
        dateHeader.textContent = `${dayNames[dayIndex]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;

        // Toggle section
        const toggleBtn = section.querySelector('.toggle-daily-section');
        const content = section.querySelector('.daily-section-content');
        toggleBtn.addEventListener('click', () => {
            content.classList.toggle('collapsed');
            toggleBtn.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
        });

        // Load daily entry data
        const entry = this.dailyEntries[dateStr] || { checklist: [], journal_text: '', gratitude_text: '' };

        // Render checklist
        const checklistContainer = section.querySelector('.checklist-items');
        (entry.checklist || []).forEach((item, index) => {
            const checklistItem = this.createChecklistItem(item, dateStr, index);
            checklistContainer.appendChild(checklistItem);
        });

        // Add checklist item button
        section.querySelector('.add-checklist-item-btn').addEventListener('click', () => {
            this.addChecklistItem(dateStr);
        });

        // Journal
        const journalText = section.querySelector('.journal-text');
        journalText.value = entry.journal_text || '';
        journalText.addEventListener('blur', (e) => {
            this.saveDailyEntry(dateStr, { journal_text: e.target.value });
        });

        // Gratitude
        const gratitudeText = section.querySelector('.gratitude-text');
        gratitudeText.value = entry.gratitude_text || '';
        gratitudeText.addEventListener('blur', (e) => {
            this.saveDailyEntry(dateStr, { gratitude_text: e.target.value });
        });

        return section;
    }

    /**
     * Create a checklist item element
     */
    createChecklistItem(item, dateStr, index) {
        const template = document.getElementById('checklist-item-template');
        const element = template.content.cloneNode(true).querySelector('.checklist-item');

        const checkbox = element.querySelector('.checklist-checkbox');
        const textInput = element.querySelector('.checklist-text');

        checkbox.checked = item.completed || false;
        textInput.value = item.text || '';

        checkbox.addEventListener('change', (e) => {
            this.toggleChecklistItem(dateStr, index, e.target.checked);
        });

        textInput.addEventListener('blur', (e) => {
            this.updateChecklistItemText(dateStr, index, e.target.value);
        });

        element.querySelector('.delete-checklist-btn').addEventListener('click', () => {
            this.deleteChecklistItem(dateStr, index);
        });

        return element;
    }

    /**
     * Add a checklist item
     */
    async addChecklistItem(dateStr) {
        const entry = this.dailyEntries[dateStr] || { date: dateStr, checklist: [] };
        if (!entry.checklist) entry.checklist = [];

        entry.checklist.push({ text: '', completed: false });
        this.dailyEntries[dateStr] = entry;

        await this.saveDailyEntry(dateStr, { checklist: entry.checklist });
        this.renderDailySections();
    }

    /**
     * Toggle checklist item
     */
    async toggleChecklistItem(dateStr, index, completed) {
        const entry = this.dailyEntries[dateStr];
        if (entry && entry.checklist && entry.checklist[index]) {
            entry.checklist[index].completed = completed;
            await this.saveDailyEntry(dateStr, { checklist: entry.checklist });
        }
    }

    /**
     * Update checklist item text
     */
    async updateChecklistItemText(dateStr, index, text) {
        const entry = this.dailyEntries[dateStr];
        if (entry && entry.checklist && entry.checklist[index]) {
            entry.checklist[index].text = text;
            await this.saveDailyEntry(dateStr, { checklist: entry.checklist });
        }
    }

    /**
     * Delete checklist item
     */
    async deleteChecklistItem(dateStr, index) {
        const entry = this.dailyEntries[dateStr];
        if (entry && entry.checklist) {
            entry.checklist.splice(index, 1);
            await this.saveDailyEntry(dateStr, { checklist: entry.checklist });
            this.renderDailySections();
        }
    }

    /**
     * Save daily entry
     */
    async saveDailyEntry(dateStr, updates) {
        try {
            const entry = this.dailyEntries[dateStr] || { date: dateStr };
            Object.assign(entry, updates);

            const saved = await dataService.upsertDailyEntry(entry);
            this.dailyEntries[dateStr] = saved;
        } catch (error) {
            console.error('Failed to save daily entry:', error);
            this.showError('Failed to save. Please try again.');
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // TODO: Implement toast notification
        alert(message);
    }

    // ==================== CATEGORY MANAGEMENT ====================

    /**
     * Load categories from database
     */
    async loadCategories() {
        try {
            this.categories = await dataService.getCustomCategories();

            // If no categories exist, initialize defaults
            if (this.categories.length === 0) {
                this.categories = await dataService.initializeDefaultCategories();
            }

            this.renderCategories();
            this.updateCategorySelects();
        } catch (error) {
            console.error('Failed to load categories:', error);
            this.showError('Failed to load categories. Please try again.');
        }
    }

    /**
     * Icon library for categories
     */
    getIconLibrary() {
        return [
            // People & Activities
            '👤', '👨‍👩‍👧‍👦', '👥', '🤝', '💪', '🏃', '🧘', '🚴', '🏋️', '⚽',
            // Work & Business
            '💼', '📊', '💰', '📈', '🏢', '💻', '📱', '🖥️', '⌨️', '🔧',
            // Education & Learning
            '📚', '📖', '✏️', '🎓', '🔬', '🧪', '📝', '🎯', '💡', '🧠',
            // Creative & Entertainment
            '🎨', '🎬', '🎵', '🎮', '🎭', '📷', '🎸', '🎤', '🎧', '🎪',
            // Travel & Places
            '✈️', '🚗', '🚀', '🏠', '🏖️', '⛰️', '🌍', '🗺️', '🧳', '🚢',
            // Food & Lifestyle
            '🍳', '🍕', '☕', '🍷', '🛒', '🛍️', '💅', '💇', '🧹', '🏡',
            // Nature & Weather
            '🌱', '🌸', '🌳', '🌞', '🌙', '⭐', '🔥', '💧', '❄️', '🌈',
            // Communication & Social
            '📧', '📞', '💬', '📣', '🎉', '🎊', '❤️', '💝', '🤗', '😊',
            // Time & Planning
            '📅', '⏰', '⏳', '📌', '🔔', '✅', '📋', '🗓️', '⚡', '🎯',
            // Health & Wellness
            '🏥', '💊', '🩺', '🧘‍♀️', '😴', '🧠', '💆', '🌿', '🍎', '💪'
        ];
    }

    /**
     * Get default icon for a category name
     */
    getDefaultCategoryIcon(categoryName) {
        const defaults = {
            'Personal': '👤',
            'Work': '💼',
            'Business': '📊',
            'Family': '👨‍👩‍👧‍👦',
            'Education': '📚',
            'Social': '🎉',
            'Project': '🚀',
            'Health': '💪',
            'Finance': '💰',
            'Travel': '✈️',
            'Creative': '🎨',
            'Meeting': '🤝',
            'Exercise': '🏃',
            'Meditation': '🧘',
            'Reading': '📖',
            'Cooking': '🍳',
            'Shopping': '🛒',
            'Hobby': '🎮'
        };
        return defaults[categoryName] || '📌';
    }

    /**
     * Get icon for a category (checks custom icons first)
     */
    getCategoryIcon(categoryName) {
        // Check for custom icon in localStorage
        const customIcons = this.getCustomCategoryIcons();
        if (customIcons[categoryName]) {
            return customIcons[categoryName];
        }
        return this.getDefaultCategoryIcon(categoryName);
    }

    /**
     * Get custom category icons from localStorage
     */
    getCustomCategoryIcons() {
        try {
            const stored = localStorage.getItem('stillmove_category_icons');
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    }

    /**
     * Save custom category icon to localStorage
     */
    saveCategoryIcon(categoryName, icon) {
        const customIcons = this.getCustomCategoryIcons();
        customIcons[categoryName] = icon;
        localStorage.setItem('stillmove_category_icons', JSON.stringify(customIcons));
    }

    renderCategories() {
        const container = document.getElementById('category-list');
        if (!container) return;

        container.innerHTML = '';

        this.categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.dataset.category = category.name;
            item.tabIndex = 0;
            item.setAttribute('role', 'button');
            item.setAttribute('aria-label', `${category.name} category`);

            const gradient = `linear-gradient(135deg, ${category.color_start} 0%, ${category.color_end} 100%)`;
            const icon = this.getCategoryIcon(category.name);

            item.innerHTML = `
                <span class="category-color" style="background: ${gradient};" aria-hidden="true"></span>
                <span class="category-icon" aria-hidden="true">${icon}</span>
                <span class="category-name">${category.name}</span>
            `;

            item.addEventListener('click', () => this.selectCategory(category.name));

            container.appendChild(item);
        });
    }

    /**
     * Update category dropdowns in modals
     */
    updateCategorySelects() {
        const selects = [
            document.getElementById('block-category'),
            document.getElementById('recurring-category')
        ];

        selects.forEach(select => {
            if (!select) return;

            select.innerHTML = '';

            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                select.appendChild(option);
            });
        });
    }

    /**
     * Open category manager modal
     */
    openCategoryManager() {
        const modal = document.getElementById('category-manager-modal');
        if (!modal) return;

        this.renderCategoryManager();
        modal.style.display = 'flex';

        // Setup modal listeners
        const closeButtons = modal.querySelectorAll('.modal-close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeCategoryManager());
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeCategoryManager();
            }
        });

        document.getElementById('add-category-btn')?.addEventListener('click', () => this.addNewCategory());
    }

    /**
     * Close category manager modal
     */
    closeCategoryManager() {
        const modal = document.getElementById('category-manager-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Render category manager list
     */
    renderCategoryManager() {
        const container = document.getElementById('category-manager-list');
        if (!container) return;

        container.innerHTML = '';

        this.categories.forEach(category => {
            const item = this.createCategoryManagerItem(category);
            container.appendChild(item);
        });
    }

    /**
     * Create a category manager item element
     */
    createCategoryManagerItem(category) {
        const template = document.getElementById('category-manager-item-template');
        const item = template.content.cloneNode(true).querySelector('.category-manager-item');

        item.dataset.categoryId = category.id;

        const preview = item.querySelector('.category-manager-color-preview');
        const nameInput = item.querySelector('.category-manager-name');
        const colorStartInput = item.querySelector('.category-color-start');
        const colorEndInput = item.querySelector('.category-color-end');
        const deleteBtn = item.querySelector('.delete-category-btn');

        // Set values
        const gradient = `linear-gradient(135deg, ${category.color_start} 0%, ${category.color_end} 100%)`;
        preview.style.background = gradient;
        nameInput.value = category.name;
        colorStartInput.value = category.color_start;
        colorEndInput.value = category.color_end;

        // Add icon picker button before the name input
        const iconBtn = document.createElement('button');
        iconBtn.className = 'category-icon-btn';
        iconBtn.type = 'button';
        iconBtn.title = 'Change icon';
        iconBtn.textContent = this.getCategoryIcon(category.name);
        iconBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openIconPicker(category.name, iconBtn);
        });

        // Insert icon button at the beginning
        item.insertBefore(iconBtn, preview);

        // Disable delete for default categories
        if (category.is_default) {
            deleteBtn.disabled = true;
            deleteBtn.title = 'Cannot delete default category';
        }

        // Event listeners
        nameInput.addEventListener('blur', () => {
            this.updateCategoryName(category.id, nameInput.value);
        });

        colorStartInput.addEventListener('change', () => {
            this.updateCategoryColors(category.id, colorStartInput.value, colorEndInput.value);
            const newGradient = `linear-gradient(135deg, ${colorStartInput.value} 0%, ${colorEndInput.value} 100%)`;
            preview.style.background = newGradient;
        });

        colorEndInput.addEventListener('change', () => {
            this.updateCategoryColors(category.id, colorStartInput.value, colorEndInput.value);
            const newGradient = `linear-gradient(135deg, ${colorStartInput.value} 0%, ${colorEndInput.value} 100%)`;
            preview.style.background = newGradient;
        });

        deleteBtn.addEventListener('click', () => {
            this.deleteCategory(category.id);
        });

        return item;
    }

    /**
     * Open icon picker popup
     */
    openIconPicker(categoryName, buttonEl) {
        // Remove any existing picker
        const existingPicker = document.querySelector('.icon-picker-popup');
        if (existingPicker) {
            existingPicker.remove();
        }

        // Create picker popup
        const picker = document.createElement('div');
        picker.className = 'icon-picker-popup';

        const icons = this.getIconLibrary();
        const currentIcon = this.getCategoryIcon(categoryName);

        picker.innerHTML = `
            <div class="icon-picker-header">
                <span>Choose Icon</span>
                <button class="icon-picker-close" type="button">×</button>
            </div>
            <div class="icon-picker-grid">
                ${icons.map(icon => `
                    <button class="icon-picker-item ${icon === currentIcon ? 'selected' : ''}" 
                            type="button" 
                            data-icon="${icon}">${icon}</button>
                `).join('')}
            </div>
        `;

        // Position near the button
        const rect = buttonEl.getBoundingClientRect();
        picker.style.position = 'fixed';
        picker.style.top = `${rect.bottom + 5}px`;
        picker.style.left = `${rect.left}px`;
        picker.style.zIndex = '10000';

        document.body.appendChild(picker);

        // Event listeners
        picker.querySelector('.icon-picker-close').addEventListener('click', () => {
            picker.remove();
        });

        picker.querySelectorAll('.icon-picker-item').forEach(item => {
            item.addEventListener('click', () => {
                const icon = item.dataset.icon;
                this.saveCategoryIcon(categoryName, icon);
                buttonEl.textContent = icon;
                this.renderCategories();
                this.renderTimeBlocks();
                picker.remove();
            });
        });

        // Close on outside click
        const closeOnOutside = (e) => {
            if (!picker.contains(e.target) && e.target !== buttonEl) {
                picker.remove();
                document.removeEventListener('click', closeOnOutside);
            }
        };
        setTimeout(() => document.addEventListener('click', closeOnOutside), 0);
    }

    /**
     * Add a new category
     */
    async addNewCategory() {
        try {
            const newCategory = {
                name: 'New Category',
                color_start: '#999999',
                color_end: '#666666',
                order_index: this.categories.length,
                is_default: false
            };

            const created = await dataService.createCustomCategory(newCategory);
            this.categories.push(created);

            this.renderCategoryManager();
            this.renderCategories();
            this.updateCategorySelects();
        } catch (error) {
            console.error('Failed to add category:', error);
            this.showError('Failed to add category. Please try again.');
        }
    }

    /**
     * Update category name
     */
    async updateCategoryName(categoryId, newName) {
        try {
            await dataService.updateCustomCategory(categoryId, { name: newName });

            const category = this.categories.find(c => c.id === categoryId);
            if (category) {
                category.name = newName;
            }

            this.renderCategories();
            this.updateCategorySelects();
        } catch (error) {
            console.error('Failed to update category name:', error);
            this.showError('Failed to update category. Please try again.');
        }
    }

    /**
     * Update category colors
     */
    async updateCategoryColors(categoryId, colorStart, colorEnd) {
        try {
            await dataService.updateCustomCategory(categoryId, {
                color_start: colorStart,
                color_end: colorEnd
            });

            const category = this.categories.find(c => c.id === categoryId);
            if (category) {
                category.color_start = colorStart;
                category.color_end = colorEnd;
            }

            this.renderCategories();
            this.renderTimeBlocks(); // Re-render time blocks with new colors
        } catch (error) {
            console.error('Failed to update category colors:', error);
            this.showError('Failed to update colors. Please try again.');
        }
    }

    /**
     * Delete a category
     */
    async deleteCategory(categoryId) {
        if (!confirm('Are you sure you want to delete this category? Time blocks using this category will need to be reassigned.')) {
            return;
        }

        try {
            await dataService.deleteCustomCategory(categoryId);
            this.categories = this.categories.filter(c => c.id !== categoryId);

            this.renderCategoryManager();
            this.renderCategories();
            this.updateCategorySelects();
        } catch (error) {
            console.error('Failed to delete category:', error);
            this.showError('Failed to delete category. Please try again.');
        }
    }

    /**
     * Get category by name
     */
    getCategoryByName(name) {
        return this.categories.find(c => c.name === name);
    }

    /**
     * Get category gradient
     */
    getCategoryGradient(categoryName) {
        const category = this.getCategoryByName(categoryName);
        if (category) {
            return `linear-gradient(135deg, ${category.color_start} 0%, ${category.color_end} 100%)`;
        }
        return 'linear-gradient(135deg, #999999 0%, #666666 100%)';
    }

    /**
     * Get category color
     */
    getCategoryColor(categoryName) {
        const category = this.getCategoryByName(categoryName);
        return category ? category.color_start : '#999999';
    }

    // ==================== DRAG AND DROP ====================

    /**
     * Handle drag start
     */
    handleDragStart(e, block, slot) {
        this.draggedBlock = block;
        this.draggedElement = slot;
        this.dragStartSlot = {
            day: parseInt(slot.dataset.day),
            hour: parseInt(slot.dataset.hour),
            minute: parseInt(slot.dataset.minute)
        };

        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', block.id);

        // Add dragging class
        slot.classList.add('dragging');

        // Setup drop zones
        this.setupDropZones();
    }

    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
        }

        // Remove drop zone highlights
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('drag-over', 'drop-target');
        });

        this.draggedBlock = null;
        this.draggedElement = null;
        this.dragStartSlot = null;
    }

    /**
     * Setup drop zones for drag and drop
     */
    setupDropZones() {
        document.querySelectorAll('.time-slot').forEach(slot => {
            // Skip slots that already have blocks (except the dragged one)
            if (slot.classList.contains('has-block') && slot !== this.draggedElement) {
                return;
            }

            slot.classList.add('drop-target');

            slot.addEventListener('dragover', this.handleDragOver.bind(this));
            slot.addEventListener('dragenter', this.handleDragEnter.bind(this));
            slot.addEventListener('dragleave', this.handleDragLeave.bind(this));
            slot.addEventListener('drop', this.handleDrop.bind(this));
        });
    }

    /**
     * Handle drag over
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    /**
     * Handle drag enter
     */
    handleDragEnter(e) {
        e.preventDefault();
        const slot = e.currentTarget;
        if (slot.classList.contains('drop-target')) {
            slot.classList.add('drag-over');
        }
    }

    /**
     * Handle drag leave
     */
    handleDragLeave(e) {
        const slot = e.currentTarget;
        slot.classList.remove('drag-over');
    }

    /**
     * Handle drop
     */
    async handleDrop(e) {
        e.preventDefault();
        const slot = e.currentTarget;
        slot.classList.remove('drag-over');

        if (!this.draggedBlock) return;

        // Store reference before async operation (dragEnd may clear it)
        const blockToMove = this.draggedBlock;
        const blockId = blockToMove.id;

        const newDay = parseInt(slot.dataset.day);
        const newHour = parseInt(slot.dataset.hour);
        const newMinute = parseInt(slot.dataset.minute);

        // Calculate new date
        const newDate = new Date(this.weekStart);
        newDate.setDate(newDate.getDate() + newDay);

        // Calculate new times
        const newStartTime = `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;

        // Calculate duration from original block
        let durationMinutes = 30;
        if (blockToMove.end_time) {
            const startParts = blockToMove.start_time.split(':');
            const endParts = blockToMove.end_time.split(':');
            const startMins = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
            const endMins = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
            durationMinutes = endMins - startMins;
        }

        // Calculate new end time
        const endTotalMinutes = newHour * 60 + newMinute + durationMinutes;
        const endHour = Math.floor(endTotalMinutes / 60);
        const endMin = endTotalMinutes % 60;
        const newEndTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

        try {
            // Update the block in database
            await dataService.updateTimeBlock(blockId, {
                date: formatDate(newDate),
                start_time: newStartTime,
                end_time: newEndTime
            });

            // Update local data - find the block in the array
            const localBlock = this.timeBlocks.find(b => b.id === blockId);
            if (localBlock) {
                localBlock.date = formatDate(newDate);
                localBlock.start_time = newStartTime;
                localBlock.end_time = newEndTime;
            }

            // Re-render
            this.renderTimeBlocks();
            this.showSuccess('Time block moved');
        } catch (error) {
            console.error('Failed to move time block:', error);
            this.showError('Failed to move time block');
        }
    }

    // ==================== RESIZE TIME BLOCKS ====================

    /**
     * Handle resize start
     */
    handleResizeStart(e, block, slot) {
        e.preventDefault();

        this.resizingBlock = block;
        this.resizeStartY = e.clientY;
        this.resizeStartSlot = slot;

        // Calculate original end time in minutes
        const endParts = block.end_time.split(':');
        this.resizeOriginalEndMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

        // Add resizing class
        slot.classList.add('resizing');

        // Bind move and end handlers
        this.boundResizeMove = this.handleResizeMove.bind(this);
        this.boundResizeEnd = this.handleResizeEnd.bind(this);

        document.addEventListener('mousemove', this.boundResizeMove);
        document.addEventListener('mouseup', this.boundResizeEnd);
    }

    /**
     * Handle resize move
     */
    handleResizeMove(e) {
        if (!this.resizingBlock) return;

        const deltaY = e.clientY - this.resizeStartY;
        // Each 30px of movement = 30 minutes (one slot)
        const slotHeight = 30;
        const deltaSlots = Math.round(deltaY / slotHeight);
        const deltaMinutes = deltaSlots * 30;

        // Calculate new end time
        let newEndMinutes = this.resizeOriginalEndMinutes + deltaMinutes;

        // Minimum duration: 30 minutes
        const startParts = this.resizingBlock.start_time.split(':');
        const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        if (newEndMinutes < startMinutes + 30) {
            newEndMinutes = startMinutes + 30;
        }

        // Maximum: END_HOUR (23:00)
        if (newEndMinutes > END_HOUR * 60) {
            newEndMinutes = END_HOUR * 60;
        }

        // Store preview end time
        this.resizePreviewEndMinutes = newEndMinutes;

        // Show preview by highlighting affected slots
        this.showResizePreview();
    }

    /**
     * Show resize preview
     */
    showResizePreview() {
        // Clear previous preview
        document.querySelectorAll('.resize-preview').forEach(slot => {
            slot.classList.remove('resize-preview');
        });

        if (!this.resizingBlock || !this.resizePreviewEndMinutes) return;

        const blockDate = new Date(this.resizingBlock.date);
        let dayOfWeek = blockDate.getDay();
        dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        const startParts = this.resizingBlock.start_time.split(':');
        const startHour = parseInt(startParts[0]);
        const startMinute = parseInt(startParts[1]);

        const endHour = Math.floor(this.resizePreviewEndMinutes / 60);
        const endMinute = this.resizePreviewEndMinutes % 60;

        // Highlight slots from current end to new end
        const currentEndParts = this.resizingBlock.end_time.split(':');
        const currentEndMinutes = parseInt(currentEndParts[0]) * 60 + parseInt(currentEndParts[1]);

        if (this.resizePreviewEndMinutes > currentEndMinutes) {
            // Extending - highlight new slots
            let hour = Math.floor(currentEndMinutes / 60);
            let minute = currentEndMinutes % 60;

            while (hour * 60 + minute < this.resizePreviewEndMinutes) {
                const slot = document.querySelector(
                    `.time-slot[data-day="${dayOfWeek}"][data-hour="${hour}"][data-minute="${minute}"]`
                );
                if (slot && !slot.classList.contains('has-block')) {
                    slot.classList.add('resize-preview');
                }
                minute += 30;
                if (minute >= 60) {
                    minute = 0;
                    hour++;
                }
            }
        }
    }

    /**
     * Handle resize end
     */
    async handleResizeEnd(e) {
        document.removeEventListener('mousemove', this.boundResizeMove);
        document.removeEventListener('mouseup', this.boundResizeEnd);

        // Clear preview
        document.querySelectorAll('.resize-preview').forEach(slot => {
            slot.classList.remove('resize-preview');
        });

        if (this.resizeStartSlot) {
            this.resizeStartSlot.classList.remove('resizing');
        }

        if (!this.resizingBlock || !this.resizePreviewEndMinutes) {
            this.resizingBlock = null;
            return;
        }

        // Calculate new end time
        const endHour = Math.floor(this.resizePreviewEndMinutes / 60);
        const endMinute = this.resizePreviewEndMinutes % 60;
        const newEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

        // Only update if changed
        if (newEndTime !== this.resizingBlock.end_time) {
            try {
                const blockId = this.resizingBlock.id;
                await dataService.updateTimeBlock(blockId, { end_time: newEndTime });

                // Update local data
                const localBlock = this.timeBlocks.find(b => b.id === blockId);
                if (localBlock) {
                    localBlock.end_time = newEndTime;
                }

                this.renderTimeBlocks();
                this.showSuccess('Time block resized');
            } catch (error) {
                console.error('Failed to resize time block:', error);
                this.showError('Failed to resize time block');
            }
        }

        this.resizingBlock = null;
        this.resizePreviewEndMinutes = null;
    }

    // ==================== RECURRING TIME BLOCKS ====================

    /**
     * Open recurring time block modal
     */
    openRecurringModal() {
        const modal = document.getElementById('recurring-modal');
        if (!modal) return;

        // Reset form
        document.getElementById('recurring-activity').value = '';
        document.getElementById('recurring-category').value = this.selectedCategory || 'Personal';
        document.getElementById('recurring-start-time').value = '09:00';
        document.getElementById('recurring-end-time').value = '10:00';

        // Reset day checkboxes
        document.querySelectorAll('.recurring-day-checkbox').forEach(cb => {
            cb.checked = false;
        });

        modal.style.display = 'flex';
    }

    /**
     * Close recurring modal
     */
    closeRecurringModal() {
        const modal = document.getElementById('recurring-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Save recurring time blocks
     */
    async saveRecurringBlocks() {
        const activity = document.getElementById('recurring-activity').value.trim();
        const category = document.getElementById('recurring-category').value;
        const startTime = document.getElementById('recurring-start-time').value;
        const endTime = document.getElementById('recurring-end-time').value;

        if (!activity || !startTime) {
            this.showError('Please fill in activity and start time');
            return;
        }

        // Get selected days
        const selectedDays = [];
        document.querySelectorAll('.recurring-day-checkbox:checked').forEach(cb => {
            selectedDays.push(parseInt(cb.value));
        });

        if (selectedDays.length === 0) {
            this.showError('Please select at least one day');
            return;
        }

        try {
            const createdBlocks = [];

            for (const dayOffset of selectedDays) {
                const date = new Date(this.weekStart);
                date.setDate(date.getDate() + dayOffset);

                const blockData = {
                    date: formatDate(date),
                    start_time: startTime,
                    end_time: endTime || null,
                    activity,
                    category
                };

                const created = await dataService.createTimeBlock(blockData);
                createdBlocks.push(created);
                this.timeBlocks.push(created);
            }

            this.renderTimeBlocks();
            this.closeRecurringModal();
            this.showSuccess(`Created ${createdBlocks.length} recurring time blocks`);
        } catch (error) {
            console.error('Failed to create recurring blocks:', error);
            this.showError('Failed to create recurring time blocks');
        }
    }

    // ==================== SCHEDULE TEMPLATES ====================

    /**
     * Open save template modal
     */
    openSaveTemplateModal() {
        if (this.timeBlocks.length === 0) {
            this.showError('No time blocks to save as template');
            return;
        }

        const modal = document.getElementById('save-template-modal');
        if (!modal) return;

        document.getElementById('template-name').value = '';
        modal.style.display = 'flex';
    }

    /**
     * Close save template modal
     */
    closeSaveTemplateModal() {
        const modal = document.getElementById('save-template-modal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Save current week as template
     */
    saveTemplate() {
        const name = document.getElementById('template-name').value.trim();
        if (!name) {
            this.showError('Please enter a template name');
            return;
        }

        // Convert time blocks to template format (day of week + time, no specific dates)
        const templateBlocks = this.timeBlocks.map(block => {
            const blockDate = new Date(block.date);
            let dayOfWeek = blockDate.getDay();
            // Convert to Monday=0 format
            dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

            return {
                dayOfWeek,
                start_time: block.start_time,
                end_time: block.end_time,
                activity: block.activity,
                category: block.category
            };
        });

        // Get existing templates from localStorage
        const templates = JSON.parse(localStorage.getItem('weeklyTemplates') || '[]');

        // Check if template with same name exists
        const existingIndex = templates.findIndex(t => t.name === name);
        if (existingIndex >= 0) {
            if (!confirm(`Template "${name}" already exists. Overwrite?`)) {
                return;
            }
            templates[existingIndex] = { name, blocks: templateBlocks, createdAt: new Date().toISOString() };
        } else {
            templates.push({ name, blocks: templateBlocks, createdAt: new Date().toISOString() });
        }

        localStorage.setItem('weeklyTemplates', JSON.stringify(templates));
        this.closeSaveTemplateModal();
        this.showSuccess(`Template "${name}" saved with ${templateBlocks.length} blocks`);
    }

    /**
     * Open load template modal
     */
    openLoadTemplateModal() {
        const modal = document.getElementById('load-template-modal');
        if (!modal) return;

        this.renderTemplateList();
        modal.style.display = 'flex';
    }

    /**
     * Close load template modal
     */
    closeLoadTemplateModal() {
        const modal = document.getElementById('load-template-modal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Render template list in modal
     */
    renderTemplateList() {
        const container = document.getElementById('template-list');
        if (!container) return;

        const templates = JSON.parse(localStorage.getItem('weeklyTemplates') || '[]');

        if (templates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-title">No templates saved</div>
                    <div class="empty-state-description">Save your current week's schedule as a template to reuse it later.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = templates.map((template, index) => `
            <div class="template-item" data-index="${index}">
                <div class="template-info">
                    <span class="template-name">${template.name}</span>
                    <span class="template-blocks">${template.blocks.length} blocks</span>
                </div>
                <div class="template-actions">
                    <button class="btn-small btn-apply-template" data-index="${index}">Apply</button>
                    <button class="btn-small btn-delete-template" data-index="${index}">🗑️</button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.btn-apply-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.applyTemplate(templates[index]);
            });
        });

        container.querySelectorAll('.btn-delete-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.deleteTemplate(index);
            });
        });
    }

    /**
     * Apply a template to the current week
     */
    async applyTemplate(template) {
        const replaceExisting = confirm('Do you want to replace existing time blocks?\n\nClick OK to replace, Cancel to add alongside existing blocks.');

        try {
            // If replacing, delete existing blocks first
            if (replaceExisting) {
                for (const block of this.timeBlocks) {
                    await dataService.deleteTimeBlock(block.id);
                }
                this.timeBlocks = [];
            }

            // Create new blocks from template
            for (const templateBlock of template.blocks) {
                const date = new Date(this.weekStart);
                date.setDate(date.getDate() + templateBlock.dayOfWeek);

                const blockData = {
                    date: formatDate(date),
                    start_time: templateBlock.start_time,
                    end_time: templateBlock.end_time,
                    activity: templateBlock.activity,
                    category: templateBlock.category
                };

                const created = await dataService.createTimeBlock(blockData);
                this.timeBlocks.push(created);
            }

            this.renderTimeBlocks();
            this.closeLoadTemplateModal();
            this.showSuccess(`Applied template "${template.name}" with ${template.blocks.length} blocks`);
        } catch (error) {
            console.error('Failed to apply template:', error);
            this.showError('Failed to apply template');
        }
    }

    /**
     * Delete a template
     */
    deleteTemplate(index) {
        const templates = JSON.parse(localStorage.getItem('weeklyTemplates') || '[]');
        const template = templates[index];

        if (!confirm(`Delete template "${template.name}"?`)) {
            return;
        }

        templates.splice(index, 1);
        localStorage.setItem('weeklyTemplates', JSON.stringify(templates));
        this.renderTemplateList();
        this.showSuccess('Template deleted');
    }

    /**
     * AI: Auto-categorize activity
     */
    async aiCategorizeActivity() {
        const activityInput = document.getElementById('block-activity');
        const categorySelect = document.getElementById('block-category');

        if (!activityInput || !categorySelect) return;

        const activity = activityInput.value.trim();
        if (!activity) {
            if (window.showToast) {
                window.showToast('Please enter an activity first', 'error');
            }
            return;
        }

        if (!aiService.isAvailable()) {
            if (window.Toast) {
                window.Toast.error('AI not configured. Set up your API key in Settings > AI Settings');
            }
            return;
        }

        const btn = document.getElementById('ai-categorize-btn');
        const originalText = btn.textContent;
        btn.textContent = '⏳';
        btn.disabled = true;

        try {
            const categoryNames = this.categories.map(c => c.name);
            const suggestedCategory = await aiService.categorizeActivity(activity, categoryNames);

            // Set the category
            categorySelect.value = suggestedCategory;

            if (window.showToast) {
                window.showToast(`Categorized as "${suggestedCategory}"`, 'success');
            }
        } catch (error) {
            console.error('AI categorization failed:', error);
            if (window.showToast) {
                window.showToast('Failed to categorize. Try again.', 'error');
            }
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    /**
     * AI: Show weekly insights
     */
    async showAIWeeklyInsights() {
        if (!aiService.isAvailable()) {
            if (window.Toast) {
                window.Toast.error('AI not configured. Set up your API key in Settings > AI Settings');
            }
            return;
        }

        // Gather week data
        const weekData = await this.gatherWeekDataForAI();

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal ai-insights-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-medium">
                <div class="modal-header">
                    <h3>✨ AI Weekly Insights</h3>
                    <button class="modal-close-btn" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="ai-loading">
                        <div class="ai-loading-spinner"></div>
                        <p>Analyzing your week...</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close handler
        const closeModal = () => modal.remove();
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close-btn') || e.target.classList.contains('ai-cancel-btn')) {
                closeModal();
            }
        });

        try {
            const insights = await aiService.generateWeeklyInsights(weekData);

            // Check if we got a valid response
            const analysisText = insights && insights.trim()
                ? this.parseMarkdown(insights)
                : 'No insights generated. The AI may have returned an empty response. Please try again.';

            modal.querySelector('.modal-body').innerHTML = `
                <div class="ai-insights-content">
                    <div class="insights-summary">
                        <div class="insight-stat">
                            <span class="insight-value">${weekData.timeBlocks}</span>
                            <span class="insight-label">Time Blocks</span>
                        </div>
                        <div class="insight-stat">
                            <span class="insight-value">${weekData.hours}h</span>
                            <span class="insight-label">Scheduled</span>
                        </div>
                        <div class="insight-stat">
                            <span class="insight-value">${weekData.habitsCompleted}/${weekData.habitsTotal}</span>
                            <span class="insight-label">Habits</span>
                        </div>
                    </div>
                    <div class="insights-text">
                        <h4>📊 Analysis</h4>
                        <div class="markdown-content">${analysisText}</div>
                    </div>
                </div>
                <div class="ai-actions">
                    <button class="btn-secondary ai-cancel-btn">Close</button>
                </div>
            `;
        } catch (error) {
            console.error('AI insights failed:', error);
            modal.querySelector('.modal-body').innerHTML = `
                <div class="ai-error">
                    <p>😕 ${error.message || 'Failed to generate insights. Please try again.'}</p>
                    <button class="btn-secondary ai-cancel-btn">Close</button>
                </div>
            `;
        }
    }

    /**
     * Gather week data for AI analysis
     */
    async gatherWeekDataForAI() {
        // Calculate hours
        let totalMinutes = 0;
        const categoryBreakdown = {};

        this.timeBlocks.forEach(block => {
            if (block.start_time && block.end_time) {
                const [startH, startM] = block.start_time.split(':').map(Number);
                const [endH, endM] = block.end_time.split(':').map(Number);
                const minutes = (endH * 60 + endM) - (startH * 60 + startM);
                if (minutes > 0) {
                    totalMinutes += minutes;
                    const cat = block.category || 'Other';
                    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + minutes;
                }
            }
        });

        // Get goals
        const completedGoals = this.weeklyGoals.filter(g => g.completed).length;

        // Find best day
        const dayBlocks = {};
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        this.timeBlocks.forEach(block => {
            const day = new Date(block.date).getDay();
            dayBlocks[dayNames[day]] = (dayBlocks[dayNames[day]] || 0) + 1;
        });
        const bestDay = Object.entries(dayBlocks).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        // Fetch habits data for the week
        let habitsCompleted = 0;
        let habitsTotal = 0;

        try {
            const dailyHabits = await dataService.getDailyHabits();
            habitsTotal = dailyHabits.length * 7; // Total possible completions for the week

            // Get week date range
            const weekEnd = new Date(this.weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const startDate = formatDate(this.weekStart);
            const endDate = formatDate(weekEnd);

            const completions = await dataService.getDailyHabitCompletions(startDate, endDate);
            habitsCompleted = completions.filter(c => c.completed).length;
        } catch (error) {
            console.error('Failed to fetch habits data:', error);
        }

        return {
            timeBlocks: this.timeBlocks.length,
            hours: Math.round(totalMinutes / 60),
            habitsCompleted: habitsCompleted,
            habitsTotal: habitsTotal,
            goalsProgress: this.weeklyGoals.length > 0 ? Math.round((completedGoals / this.weeklyGoals.length) * 100) : 0,
            bestDay: bestDay,
            categoryBreakdown: Object.fromEntries(
                Object.entries(categoryBreakdown).map(([k, v]) => [k, Math.round(v / 60) + 'h'])
            )
        };
    }

    /**
     * Parse simple markdown to HTML
     */
    parseMarkdown(text) {
        if (!text) return '';

        return text
            // Bold: **text** or __text__
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.+?)__/g, '<strong>$1</strong>')
            // Italic: *text* or _text_
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/_(.+?)_/g, '<em>$1</em>')
            // Numbered lists: 1. item
            .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
            // Bullet lists: - item or * item
            .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
            // Wrap consecutive <li> in <ul> or <ol>
            .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            // Wrap in paragraph if not already
            .replace(/^(?!<)/, '<p>')
            .replace(/(?!>)$/, '</p>');
    }
}

export default WeeklyView;
