/**
 * Weekly View Controller
 * Handles the weekly planning and time block interface
 */

import dataService from '../js/data-service.js';
import { formatDate, getCategoryColor, getCategoryGradient } from '../js/utils.js';

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
        
        // Add weekly goal button
        document.getElementById('add-weekly-goal-btn')?.addEventListener('click', () => this.addWeeklyGoal());
        
        // Manage categories button
        document.getElementById('manage-categories-btn')?.addEventListener('click', () => this.openCategoryManager());
        
        // Time block modal
        this.setupModalListeners();
    }

    /**
     * Setup modal event listeners
     */
    setupModalListeners() {
        const modal = document.getElementById('time-block-modal');
        const closeButtons = modal.querySelectorAll('.modal-close');
        const saveButton = document.getElementById('save-time-block-btn');
        const deleteButton = document.getElementById('delete-time-block-btn');
        
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
        
        saveButton?.addEventListener('click', () => this.saveTimeBlock());
        deleteButton?.addEventListener('click', () => this.deleteTimeBlock());
        
        // Close modal on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
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
            
        } catch (error) {
            console.error('Failed to load weekly data:', error);
            this.showError('Failed to load data. Please try again.');
        }
    }

    /**
     * Render weekly goals
     */
    renderWeeklyGoals() {
        const container = document.getElementById('weekly-goals-container');
        if (!container) return;
        
        container.innerHTML = '';
        
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
     * Delete a weekly goal
     */
    async deleteWeeklyGoal(goalId) {
        if (!confirm('Are you sure you want to delete this goal?')) return;
        
        try {
            await dataService.deleteWeeklyGoal(goalId);
            this.weeklyGoals = this.weeklyGoals.filter(g => g.id !== goalId);
            this.renderWeeklyGoals();
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
                
                // Only show activity text in the first slot
                if (i === 0) {
                    slot.style.borderRadius = '8px 8px 0 0';
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'time-block-content';
                    // Use theme-aware text color instead of hardcoded white
                    contentDiv.style.color = 'inherit';
                    contentDiv.style.fontSize = '0.85rem';
                    contentDiv.style.fontWeight = '600';
                    contentDiv.style.padding = '0.25rem';
                    contentDiv.style.whiteSpace = 'normal';
                    contentDiv.style.wordWrap = 'break-word';
                    contentDiv.style.lineHeight = '1.3';
                    contentDiv.textContent = block.activity;
                    
                    slot.innerHTML = '';
                    slot.appendChild(contentDiv);
                } else if (i === slotsToFill - 1) {
                    // Last slot - round bottom corners
                    slot.style.borderRadius = '0 0 8px 8px';
                    slot.innerHTML = '';
                } else {
                    // Middle slots - no rounded corners
                    slot.style.borderRadius = '0';
                    slot.innerHTML = '';
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
     * Select a category
     */
    selectCategory(category) {
        if (this.selectedCategory === category) {
            this.selectedCategory = null;
            document.querySelectorAll('.category-item').forEach(item => {
                item.classList.remove('selected');
            });
        } else {
            this.selectedCategory = category;
            document.querySelectorAll('.category-item').forEach(item => {
                item.classList.toggle('selected', item.dataset.category === category);
            });
        }
    }

    /**
     * Open time block modal for creating a new block
     */
    openTimeBlockModal(day, hour, minute) {
        this.editingBlock = null;
        
        const modal = document.getElementById('time-block-modal');
        const title = document.getElementById('modal-title');
        const deleteBtn = document.getElementById('delete-time-block-btn');
        
        title.textContent = 'Add Time Block';
        deleteBtn.style.display = 'none';
        
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
        
        title.textContent = 'Edit Time Block';
        deleteBtn.style.display = 'block';
        
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
     * Delete time block
     */
    async deleteTimeBlock() {
        if (!this.editingBlock) return;
        if (!confirm('Are you sure you want to delete this time block?')) return;
        
        try {
            await dataService.deleteTimeBlock(this.editingBlock.id);
            this.timeBlocks = this.timeBlocks.filter(b => b.id !== this.editingBlock.id);
            this.renderTimeBlocks();
            this.closeModal();
        } catch (error) {
            console.error('Failed to delete time block:', error);
            this.showError('Failed to delete time block. Please try again.');
        }
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
     * Render categories in the legend
     */
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
            
            item.innerHTML = `
                <span class="category-color" style="background: ${gradient};" aria-hidden="true"></span>
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
        const select = document.getElementById('block-category');
        if (!select) return;
        
        select.innerHTML = '';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            select.appendChild(option);
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
}

export default WeeklyView;
