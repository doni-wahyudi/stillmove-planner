/**
 * Monthly View Controller
 * Handles the monthly planning and calendar interface
 */

import dataService from '../js/data-service.js';
import { getDaysInMonth, formatDate } from '../js/utils.js';

// Category color mapping
const CATEGORY_COLORS = {
    'Personal': '#4CAF50',
    'Work': '#2196F3',
    'Business': '#FF9800',
    'Family': '#E91E63',
    'Education': '#9C27B0',
    'Social': '#00BCD4',
    'Project': '#795548'
};

class MonthlyView {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.currentDate = new Date();
        this.currentYear = this.currentDate.getFullYear();
        this.currentMonth = this.currentDate.getMonth() + 1; // 1-12
        this.monthlyData = null;
        this.selectedCategory = null;
        this.categories = [];
        
        // Calendar enhancement data
        this.timeBlocksData = {}; // { 'YYYY-MM-DD': [blocks] }
        this.habitsData = {}; // { 'YYYY-MM-DD': { completed, total } }
        this.deadlinesData = {}; // { 'YYYY-MM-DD': [goals] }
        
        // Multi-day selection state
        this.isDragging = false;
        this.dragStartDate = null;
        this.dragEndDate = null;
        this.selectedDateRange = [];
        
        // Tooltip element
        this.tooltipEl = null;
    }

    /**
     * Calculate number of 30-minute time slots for a time block
     * @param {Object} block - Time block with start_time and end_time
     * @returns {number} Number of 30-minute slots (minimum 1)
     */
    calculateTimeSlots(block) {
        if (!block.start_time || !block.end_time) {
            return 1; // Default to 1 slot if times are missing
        }
        
        const [startH, startM] = block.start_time.split(':').map(Number);
        const [endH, endM] = block.end_time.split(':').map(Number);
        
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const durationMinutes = endMinutes - startMinutes;
        
        if (durationMinutes <= 0) {
            return 1; // Invalid duration, default to 1
        }
        
        // Each slot is 30 minutes, round up
        return Math.ceil(durationMinutes / 30);
    }
    
    /**
     * Calculate total time slots for an array of time blocks
     * @param {Array} blocks - Array of time blocks
     * @returns {number} Total number of 30-minute slots
     */
    calculateTotalTimeSlots(blocks) {
        if (!blocks || blocks.length === 0) return 0;
        return blocks.reduce((total, block) => total + this.calculateTimeSlots(block), 0);
    }

    /**
     * Initialize the monthly view
     */
    async init(container) {
        this.container = container;
        
        // Load the HTML template
        const response = await fetch('views/monthly-view.html');
        const html = await response.text();
        this.container.innerHTML = html;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load categories first
        await this.loadCategories();
        
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
        document.getElementById('prev-month-btn')?.addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('next-month-btn')?.addEventListener('click', () => this.changeMonth(1));
        document.getElementById('today-month-btn')?.addEventListener('click', () => this.goToToday());
        
        // Add checklist item button
        document.getElementById('add-checklist-item-btn')?.addEventListener('click', () => this.addChecklistItem());
        
        // Add action plan button
        document.getElementById('add-action-plan-btn')?.addEventListener('click', () => this.addActionPlan());
        
        // Save notes on blur
        document.getElementById('monthly-notes-text')?.addEventListener('blur', (e) => {
            this.saveNotes(e.target.value);
        });
        
        // Manage categories button
        document.getElementById('manage-categories-btn')?.addEventListener('click', () => this.openCategoryManager());
        
        // Sidebar toggle (mobile)
        this.setupSidebarToggle();
    }
    
    /**
     * Setup sidebar toggle for mobile
     */
    setupSidebarToggle() {
        const toggleBtn = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.categories-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (!toggleBtn || !sidebar) return;
        
        // Add close button to sidebar
        if (!sidebar.querySelector('.sidebar-close')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'sidebar-close';
            closeBtn.innerHTML = '×';
            closeBtn.setAttribute('aria-label', 'Close sidebar');
            closeBtn.addEventListener('click', () => this.closeSidebar());
            sidebar.insertBefore(closeBtn, sidebar.firstChild);
        }
        
        toggleBtn.addEventListener('click', () => {
            const isOpen = sidebar.classList.contains('open');
            if (isOpen) {
                this.closeSidebar();
            } else {
                this.openSidebar();
            }
        });
        
        overlay?.addEventListener('click', () => this.closeSidebar());
    }
    
    /**
     * Open sidebar
     */
    openSidebar() {
        const sidebar = document.querySelector('.categories-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const toggleBtn = document.getElementById('sidebar-toggle');
        
        sidebar?.classList.add('open');
        overlay?.classList.add('visible');
        toggleBtn?.classList.add('active');
    }
    
    /**
     * Close sidebar
     */
    closeSidebar() {
        const sidebar = document.querySelector('.categories-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const toggleBtn = document.getElementById('sidebar-toggle');
        
        sidebar?.classList.remove('open');
        overlay?.classList.remove('visible');
        toggleBtn?.classList.remove('active');
    }

    /**
     * Change month
     */
    async changeMonth(delta) {
        this.currentMonth += delta;
        
        // Handle year boundaries
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
        const displayText = `${monthNames[this.currentMonth - 1]} ${this.currentYear}`;
        document.getElementById('current-month-year').textContent = displayText;
        
        // Update breadcrumb context
        const breadcrumbContext = document.getElementById('breadcrumb-context');
        if (breadcrumbContext) {
            breadcrumbContext.textContent = displayText;
        }
    }

    /**
     * Load data for the current month
     */
    async loadData() {
        try {
            // Load monthly data
            this.monthlyData = await dataService.getMonthlyData(this.currentYear, this.currentMonth);
            
            // If no data exists, create empty structure
            if (!this.monthlyData) {
                this.monthlyData = {
                    year: this.currentYear,
                    month: this.currentMonth,
                    notes: '',
                    checklist: [],
                    action_plan: []
                };
            }
            
            // Load calendar enhancement data
            await this.loadCalendarData();
            
            // Render all components
            this.renderCalendar();
            this.renderChecklist();
            this.renderNotes();
            this.renderActionPlan();
            
            // Update summary dashboard
            await this.updateSummaryDashboard();
            
        } catch (error) {
            console.error('Failed to load monthly data:', error);
            this.showError('Failed to load data. Please try again.');
        }
    }
    
    /**
     * Load calendar enhancement data (time blocks, habits, deadlines)
     */
    async loadCalendarData() {
        const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
        const startDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-01`;
        const endDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        
        // Reset data
        this.timeBlocksData = {};
        this.habitsData = {};
        this.deadlinesData = {};
        
        try {
            // Load time blocks for the entire month
            const timeBlocks = await dataService.getTimeBlocksRange(startDate, endDate);
            timeBlocks.forEach(block => {
                if (!this.timeBlocksData[block.date]) {
                    this.timeBlocksData[block.date] = [];
                }
                this.timeBlocksData[block.date].push(block);
            });
            
            // Load daily habits and completions
            const dailyHabits = await dataService.getDailyHabits();
            const habitCompletions = await dataService.getDailyHabitCompletions(startDate, endDate);
            
            // Calculate habit completion per day
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayCompletions = habitCompletions.filter(c => c.date === dateStr && c.completed);
                this.habitsData[dateStr] = {
                    completed: dayCompletions.length,
                    total: dailyHabits.length
                };
            }
            
            // Load goal deadlines
            const annualGoals = await dataService.getAnnualGoals(this.currentYear);
            annualGoals.forEach(goal => {
                if (goal.deadline) {
                    const deadlineDate = goal.deadline.split('T')[0]; // Handle ISO format
                    if (deadlineDate >= startDate && deadlineDate <= endDate) {
                        if (!this.deadlinesData[deadlineDate]) {
                            this.deadlinesData[deadlineDate] = [];
                        }
                        this.deadlinesData[deadlineDate].push(goal);
                    }
                }
            });
        } catch (error) {
            console.error('Error loading calendar data:', error);
        }
    }
    
    /**
     * Update the monthly summary dashboard
     */
    async updateSummaryDashboard() {
        try {
            // Get all time blocks for the month
            const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
            let totalTimeSlots = 0; // Count 30-min slots, not activities
            let totalMinutes = 0;
            const weeklyData = [0, 0, 0, 0, 0]; // 5 weeks max
            
            // Fetch time blocks for each day
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(this.currentYear, this.currentMonth - 1, day);
                const dateStr = formatDate(date);
                const weekIndex = Math.floor((day - 1) / 7);
                
                try {
                    const timeBlocks = await dataService.getTimeBlocks(dateStr);
                    if (timeBlocks && timeBlocks.length > 0) {
                        // Calculate slots for each time block based on duration
                        timeBlocks.forEach(block => {
                            const slots = this.calculateTimeSlots(block);
                            totalTimeSlots += slots;
                            weeklyData[weekIndex] += slots;
                            
                            // Calculate total minutes
                            if (block.start_time && block.end_time) {
                                const [startH, startM] = block.start_time.split(':').map(Number);
                                const [endH, endM] = block.end_time.split(':').map(Number);
                                const minutes = (endH * 60 + endM) - (startH * 60 + startM);
                                if (minutes > 0) totalMinutes += minutes;
                            }
                        });
                    }
                } catch (e) {
                    // Ignore errors for individual days
                }
            }
            
            // Calculate checklist completion
            const checklist = this.monthlyData.checklist || [];
            const checklistTotal = checklist.length;
            const checklistDone = checklist.filter(item => item.completed).length;
            const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
            
            // Calculate action plan progress
            const actionPlans = (this.monthlyData.action_plan || []).filter(item => item.type !== 'day_categories');
            const actionPlanTotal = actionPlans.length;
            const actionPlanProgress = actionPlanTotal > 0 
                ? Math.round(actionPlans.reduce((sum, p) => sum + (p.progress || 0), 0) / actionPlanTotal)
                : 0;
            
            // Get habits completion rate for the month
            let habitsRate = 0;
            try {
                const habits = await dataService.getHabits();
                if (habits && habits.length > 0) {
                    let totalChecks = 0;
                    let completedChecks = 0;
                    
                    for (let day = 1; day <= daysInMonth; day++) {
                        const date = new Date(this.currentYear, this.currentMonth - 1, day);
                        if (date > new Date()) break; // Don't count future days
                        
                        const dateStr = formatDate(date);
                        const habitData = await dataService.getHabitData(dateStr);
                        
                        habits.forEach(habit => {
                            totalChecks++;
                            if (habitData && habitData[habit.id]) {
                                completedChecks++;
                            }
                        });
                    }
                    
                    habitsRate = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;
                }
            } catch (e) {
                console.error('Error calculating habits rate:', e);
            }
            
            // Update UI
            const timeBlocksEl = document.getElementById('summary-time-blocks');
            const hoursEl = document.getElementById('summary-hours');
            const checklistEl = document.getElementById('summary-checklist');
            const actionPlansEl = document.getElementById('summary-action-plans');
            const habitsEl = document.getElementById('summary-habits');
            
            if (timeBlocksEl) timeBlocksEl.textContent = totalTimeSlots;
            if (hoursEl) hoursEl.textContent = `${Math.round(totalMinutes / 60)}h`;
            if (checklistEl) checklistEl.textContent = `${checklistPercent}%`;
            if (actionPlansEl) actionPlansEl.textContent = `${actionPlanProgress}%`;
            if (habitsEl) habitsEl.textContent = `${habitsRate}%`;
            
            // Render weekly trend chart
            this.renderWeeklyTrendChart(weeklyData);
            
        } catch (error) {
            console.error('Error updating summary dashboard:', error);
        }
    }
    
    /**
     * Render weekly trend chart
     */
    renderWeeklyTrendChart(weeklyData) {
        const container = document.getElementById('weekly-trend-chart');
        if (!container) return;
        
        container.innerHTML = '';
        
        const maxValue = Math.max(...weeklyData, 1);
        const currentWeek = Math.floor((new Date().getDate() - 1) / 7);
        const isCurrentMonth = this.currentYear === new Date().getFullYear() && 
                               this.currentMonth === new Date().getMonth() + 1;
        
        weeklyData.forEach((value, index) => {
            const bar = document.createElement('div');
            bar.className = 'trend-bar';
            if (isCurrentMonth && index === currentWeek) {
                bar.classList.add('current-week');
            }
            
            const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
            bar.style.height = `${Math.max(height, 5)}%`;
            bar.dataset.value = value;
            bar.title = `Week ${index + 1}: ${value} blocks`;
            
            container.appendChild(bar);
        });
    }

    /**
     * Render calendar grid
     */
    renderCalendar() {
        const container = document.getElementById('calendar-days');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Get the number of days in the month
        const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
        
        // Get the first day of the month (0 = Sunday, 6 = Saturday)
        const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1).getDay();
        
        // Calculate week rows needed
        const totalCells = firstDay + daysInMonth;
        const weeksNeeded = Math.ceil(totalCells / 7);
        
        let dayCounter = 1;
        
        for (let week = 0; week < weeksNeeded; week++) {
            const weekRow = document.createElement('div');
            weekRow.className = 'calendar-week-row';
            weekRow.setAttribute('role', 'row');
            
            // Add week number cell
            const weekNumCell = document.createElement('div');
            weekNumCell.className = 'week-number-cell';
            const weekNumber = this.getWeekNumber(new Date(this.currentYear, this.currentMonth - 1, dayCounter > daysInMonth ? daysInMonth : Math.max(1, dayCounter - firstDay + week * 7)));
            weekNumCell.textContent = weekNumber;
            weekNumCell.title = `Week ${weekNumber}`;
            weekRow.appendChild(weekNumCell);
            
            // Add day cells for this week
            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                const cellIndex = week * 7 + dayOfWeek;
                
                if (cellIndex < firstDay || dayCounter > daysInMonth) {
                    // Empty cell
                    const emptyCell = document.createElement('div');
                    emptyCell.className = 'calendar-day empty';
                    emptyCell.setAttribute('role', 'gridcell');
                    weekRow.appendChild(emptyCell);
                } else {
                    // Day cell
                    const dayCell = this.createDayCell(dayCounter);
                    weekRow.appendChild(dayCell);
                    dayCounter++;
                }
            }
            
            container.appendChild(weekRow);
        }
        
        // Create tooltip element if not exists
        this.createTooltip();
        
        // Setup drag selection for multi-day events
        this.setupDragSelection();
    }
    
    /**
     * Get ISO week number
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Create a calendar day cell with indicators
     */
    createDayCell(day) {
        const template = document.getElementById('calendar-day-template');
        const cell = template.content.cloneNode(true).querySelector('.calendar-day');
        
        const date = new Date(this.currentYear, this.currentMonth - 1, day);
        const dateStr = formatDate(date);
        
        cell.dataset.date = dateStr;
        cell.querySelector('.day-number').textContent = day;
        
        // Highlight today
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            cell.classList.add('today');
        }
        
        // Check if date is in the past
        if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
            cell.classList.add('past');
        }
        
        // Add activity indicators
        this.addDayIndicators(cell, dateStr);
        
        // Add deadline indicator
        this.addDeadlineIndicator(cell, dateStr);
        
        // Click handler - open add event modal
        cell.addEventListener('click', (e) => {
            if (!this.isDragging && !e.shiftKey) {
                this.showAddEventModal(dateStr);
            }
        });
        
        // Hover handlers for tooltip
        cell.addEventListener('mouseenter', (e) => this.showDayPreview(e, dateStr));
        cell.addEventListener('mouseleave', () => this.hideDayPreview());
        cell.addEventListener('focus', (e) => this.showDayPreview(e, dateStr));
        cell.addEventListener('blur', () => this.hideDayPreview());
        
        // Keyboard navigation
        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.showAddEventModal(dateStr);
            }
        });
        
        return cell;
    }
    
    /**
     * Add activity indicators to day cell
     */
    addDayIndicators(cell, dateStr) {
        const indicatorsContainer = cell.querySelector('.day-indicators');
        if (!indicatorsContainer) return;
        
        // Time blocks indicator - count by 30-min slots, not activities
        const timeBlocks = this.timeBlocksData[dateStr] || [];
        const timeBlocksIndicator = indicatorsContainer.querySelector('.indicator-dot.time-blocks');
        if (timeBlocksIndicator) {
            const totalSlots = this.calculateTotalTimeSlots(timeBlocks);
            if (totalSlots > 0) {
                timeBlocksIndicator.classList.add('active');
                timeBlocksIndicator.dataset.count = totalSlots;
                timeBlocksIndicator.title = `${totalSlots} time slots (${timeBlocks.length} activities)`;
                // Intensity based on slot count (more slots = busier day)
                if (totalSlots >= 10) {
                    timeBlocksIndicator.classList.add('high');
                } else if (totalSlots >= 5) {
                    timeBlocksIndicator.classList.add('medium');
                }
            }
        }
        
        // Habits indicator
        const habitsData = this.habitsData[dateStr];
        const habitsIndicator = indicatorsContainer.querySelector('.indicator-dot.habits');
        if (habitsIndicator && habitsData && habitsData.total > 0) {
            const percentage = (habitsData.completed / habitsData.total) * 100;
            if (percentage > 0) {
                habitsIndicator.classList.add('active');
                habitsIndicator.dataset.percentage = Math.round(percentage);
                if (percentage >= 80) {
                    habitsIndicator.classList.add('high');
                } else if (percentage >= 50) {
                    habitsIndicator.classList.add('medium');
                }
            }
        }
    }
    
    /**
     * Add deadline indicator to day cell
     */
    addDeadlineIndicator(cell, dateStr) {
        const deadlines = this.deadlinesData[dateStr] || [];
        const indicator = cell.querySelector('.day-deadline-indicator');
        
        if (indicator && deadlines.length > 0) {
            indicator.classList.add('active');
            indicator.textContent = '🎯';
            indicator.title = `${deadlines.length} goal${deadlines.length > 1 ? 's' : ''} due`;
            
            // Check if any deadline is overdue
            const today = new Date();
            const cellDate = new Date(dateStr);
            if (cellDate < today) {
                indicator.classList.add('overdue');
                cell.classList.add('has-overdue');
            }
        }
    }
    
    /**
     * Show add event modal for a specific day
     */
    showAddEventModal(dateStr) {
        const date = new Date(dateStr);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        const formattedDate = `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        
        // Build category options
        const categoryOptions = this.categories.map(c => 
            `<option value="${c.name}">${c.name}</option>`
        ).join('');
        
        if (window.Modal) {
            window.Modal.show({
                title: `Add Event - ${formattedDate}`,
                content: `
                    <div class="form-group">
                        <label for="event-title">Event Title *</label>
                        <input type="text" id="event-title" placeholder="What's happening?" autofocus />
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="event-start-time">Start Time</label>
                            <input type="time" id="event-start-time" value="09:00" />
                        </div>
                        <div class="form-group">
                            <label for="event-end-time">End Time</label>
                            <input type="time" id="event-end-time" value="10:00" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="event-category">Category</label>
                        <select id="event-category">
                            ${categoryOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="event-notes">Notes (optional)</label>
                        <textarea id="event-notes" rows="2" placeholder="Additional details..."></textarea>
                    </div>
                    <div class="form-actions-hint">
                        <span class="hint-text">💡 This will create a time block in your weekly schedule</span>
                    </div>
                `,
                buttons: [
                    { text: 'Cancel', className: 'btn-secondary', action: 'cancel' },
                    { 
                        text: 'Add Event', 
                        className: 'btn-primary', 
                        action: 'add',
                        primary: true,
                        onClick: () => this.createEventFromModal(dateStr),
                        closeOnClick: false
                    }
                ]
            });
            
            // Focus title input after modal opens
            setTimeout(() => {
                document.getElementById('event-title')?.focus();
            }, 100);
        } else {
            // Fallback to simple prompt
            const title = prompt(`Add event for ${formattedDate}:`);
            if (title) {
                this.createQuickEvent(dateStr, title);
            }
        }
    }
    
    /**
     * Create event from modal form
     */
    async createEventFromModal(dateStr) {
        const title = document.getElementById('event-title')?.value?.trim();
        const startTime = document.getElementById('event-start-time')?.value;
        const endTime = document.getElementById('event-end-time')?.value;
        const category = document.getElementById('event-category')?.value;
        const notes = document.getElementById('event-notes')?.value?.trim();
        
        if (!title) {
            if (window.showToast) {
                window.showToast('Please enter an event title', 'error');
            }
            return;
        }
        
        // Validate times
        if (startTime >= endTime) {
            if (window.showToast) {
                window.showToast('End time must be after start time', 'error');
            }
            return;
        }
        
        try {
            // Create time block
            await dataService.createTimeBlock({
                date: dateStr,
                start_time: startTime,
                end_time: endTime,
                activity: title,
                category: category,
                notes: notes || null
            });
            
            // Close modal
            if (window.Modal) {
                window.Modal.close();
            }
            
            // Update local data
            if (!this.timeBlocksData[dateStr]) {
                this.timeBlocksData[dateStr] = [];
            }
            this.timeBlocksData[dateStr].push({
                date: dateStr,
                start_time: startTime,
                end_time: endTime,
                activity: title,
                category: category
            });
            
            // Re-render calendar to show updated indicators
            this.renderCalendar();
            
            // Update summary
            await this.updateSummaryDashboard();
            
            if (window.showToast) {
                window.showToast(`Event "${title}" added to ${dateStr}`, 'success');
            }
        } catch (error) {
            console.error('Failed to create event:', error);
            if (window.showToast) {
                window.showToast('Failed to create event. Please try again.', 'error');
            }
        }
    }
    
    /**
     * Create quick event (fallback without modal)
     */
    async createQuickEvent(dateStr, title) {
        try {
            await dataService.createTimeBlock({
                date: dateStr,
                start_time: '09:00',
                end_time: '10:00',
                activity: title,
                category: this.categories[0]?.name || 'Personal'
            });
            
            // Update local data and re-render
            if (!this.timeBlocksData[dateStr]) {
                this.timeBlocksData[dateStr] = [];
            }
            this.timeBlocksData[dateStr].push({
                date: dateStr,
                start_time: '09:00',
                end_time: '10:00',
                activity: title
            });
            
            this.renderCalendar();
            await this.updateSummaryDashboard();
            
            if (window.showToast) {
                window.showToast(`Event "${title}" added`, 'success');
            }
        } catch (error) {
            console.error('Failed to create quick event:', error);
        }
    }
    
    /**
     * Create tooltip element
     */
    createTooltip() {
        if (this.tooltipEl) return;
        
        this.tooltipEl = document.createElement('div');
        this.tooltipEl.className = 'day-preview-tooltip';
        this.tooltipEl.style.display = 'none';
        document.body.appendChild(this.tooltipEl);
    }
    
    /**
     * Show day preview tooltip on hover
     */
    showDayPreview(event, dateStr) {
        if (!this.tooltipEl) return;
        
        const date = new Date(dateStr);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const timeBlocks = this.timeBlocksData[dateStr] || [];
        const habitsData = this.habitsData[dateStr] || { completed: 0, total: 0 };
        const deadlines = this.deadlinesData[dateStr] || [];
        
        // Calculate total time slots (30-min each)
        const totalSlots = this.calculateTotalTimeSlots(timeBlocks);
        
        const habitsPercent = habitsData.total > 0 
            ? Math.round((habitsData.completed / habitsData.total) * 100) 
            : 0;
        
        // Build activities list (max 4) with duration
        const activitiesList = timeBlocks.slice(0, 4).map(block => {
            const slots = this.calculateTimeSlots(block);
            const duration = slots * 30; // minutes
            const durationStr = duration >= 60 ? `${duration / 60}h` : `${duration}m`;
            return `<li>${block.start_time?.slice(0, 5) || ''} - ${block.activity || 'Untitled'} (${durationStr})</li>`;
        }).join('');
        
        const moreCount = timeBlocks.length > 4 ? timeBlocks.length - 4 : 0;
        
        // Build deadlines list
        const deadlinesList = deadlines.map(goal => 
            `<li>${goal.title || 'Untitled goal'}</li>`
        ).join('');
        
        this.tooltipEl.innerHTML = `
            <div class="preview-header">
                <span class="preview-date">${monthNames[date.getMonth()]} ${date.getDate()}</span>
                <span class="preview-day-name">${dayNames[date.getDay()]}</span>
            </div>
            <div class="preview-content">
                <div class="preview-section">
                    <span class="preview-icon">📅</span>
                    <span class="preview-label">Scheduled:</span>
                    <span class="preview-value">${totalSlots} slots (${timeBlocks.length} activities)</span>
                </div>
                <div class="preview-section">
                    <span class="preview-icon">✅</span>
                    <span class="preview-label">Habits:</span>
                    <span class="preview-value">${habitsData.completed}/${habitsData.total} (${habitsPercent}%)</span>
                </div>
                ${deadlines.length > 0 ? `
                    <div class="preview-section deadlines">
                        <span class="preview-icon">🎯</span>
                        <span class="preview-label">Deadlines:</span>
                        <ul class="preview-deadlines-list">${deadlinesList}</ul>
                    </div>
                ` : ''}
                ${timeBlocks.length > 0 ? `
                    <div class="preview-activities">
                        <div class="preview-activities-title">Activities:</div>
                        <ul class="preview-activities-list">
                            ${activitiesList}
                            ${moreCount > 0 ? `<li class="more">+${moreCount} more...</li>` : ''}
                        </ul>
                    </div>
                ` : '<div class="preview-empty">No activities scheduled</div>'}
            </div>
            <div class="preview-footer">
                <span class="preview-hint">Click to add event</span>
            </div>
        `;
        
        // Position tooltip
        const rect = event.target.closest('.calendar-day').getBoundingClientRect();
        const tooltipRect = this.tooltipEl.getBoundingClientRect();
        
        let left = rect.right + 10;
        let top = rect.top;
        
        // Adjust if tooltip would go off screen
        if (left + 250 > window.innerWidth) {
            left = rect.left - 260;
        }
        if (top + 200 > window.innerHeight) {
            top = window.innerHeight - 210;
        }
        
        this.tooltipEl.style.left = `${left}px`;
        this.tooltipEl.style.top = `${top}px`;
        this.tooltipEl.style.display = 'block';
    }
    
    /**
     * Hide day preview tooltip
     */
    hideDayPreview() {
        if (this.tooltipEl) {
            this.tooltipEl.style.display = 'none';
        }
    }
    
    /**
     * Setup drag selection for multi-day events
     */
    setupDragSelection() {
        const container = document.getElementById('calendar-days');
        if (!container) return;
        
        container.addEventListener('mousedown', (e) => {
            const dayCell = e.target.closest('.calendar-day:not(.empty)');
            if (!dayCell || e.button !== 0) return;
            
            // Only start drag if shift is held or after a small delay
            if (e.shiftKey) {
                e.preventDefault();
                this.startDragSelection(dayCell.dataset.date);
            }
        });
        
        container.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const dayCell = e.target.closest('.calendar-day:not(.empty)');
            if (dayCell) {
                this.updateDragSelection(dayCell.dataset.date);
            }
        });
        
        container.addEventListener('mouseup', (e) => {
            if (this.isDragging) {
                this.endDragSelection();
            }
        });
        
        // Cancel drag if mouse leaves calendar
        container.addEventListener('mouseleave', () => {
            if (this.isDragging) {
                this.cancelDragSelection();
            }
        });
    }
    
    /**
     * Start drag selection
     */
    startDragSelection(dateStr) {
        this.isDragging = true;
        this.dragStartDate = dateStr;
        this.dragEndDate = dateStr;
        this.updateSelectedRange();
    }
    
    /**
     * Update drag selection
     */
    updateDragSelection(dateStr) {
        this.dragEndDate = dateStr;
        this.updateSelectedRange();
    }
    
    /**
     * End drag selection
     */
    endDragSelection() {
        this.isDragging = false;
        
        if (this.selectedDateRange.length > 1) {
            this.showMultiDayEventModal();
        }
        
        // Clear visual selection after a delay
        setTimeout(() => {
            this.clearSelectedRange();
        }, 100);
    }
    
    /**
     * Cancel drag selection
     */
    cancelDragSelection() {
        this.isDragging = false;
        this.clearSelectedRange();
    }
    
    /**
     * Update selected date range visual
     */
    updateSelectedRange() {
        // Clear previous selection
        document.querySelectorAll('.calendar-day.in-range').forEach(cell => {
            cell.classList.remove('in-range', 'range-start', 'range-end');
        });
        
        if (!this.dragStartDate || !this.dragEndDate) return;
        
        const start = new Date(this.dragStartDate);
        const end = new Date(this.dragEndDate);
        
        // Ensure start is before end
        const [rangeStart, rangeEnd] = start <= end ? [start, end] : [end, start];
        
        this.selectedDateRange = [];
        
        // Highlight all days in range
        const current = new Date(rangeStart);
        while (current <= rangeEnd) {
            const dateStr = formatDate(current);
            this.selectedDateRange.push(dateStr);
            
            const cell = document.querySelector(`.calendar-day[data-date="${dateStr}"]`);
            if (cell) {
                cell.classList.add('in-range');
                if (dateStr === formatDate(rangeStart)) cell.classList.add('range-start');
                if (dateStr === formatDate(rangeEnd)) cell.classList.add('range-end');
            }
            
            current.setDate(current.getDate() + 1);
        }
    }
    
    /**
     * Clear selected range visual
     */
    clearSelectedRange() {
        document.querySelectorAll('.calendar-day.in-range').forEach(cell => {
            cell.classList.remove('in-range', 'range-start', 'range-end');
        });
        this.selectedDateRange = [];
        this.dragStartDate = null;
        this.dragEndDate = null;
    }
    
    /**
     * Show modal for creating multi-day event
     */
    showMultiDayEventModal() {
        const startDate = this.selectedDateRange[0];
        const endDate = this.selectedDateRange[this.selectedDateRange.length - 1];
        const dayCount = this.selectedDateRange.length;
        
        // Use the modal component if available
        if (window.Modal) {
            window.Modal.show({
                title: 'Create Multi-Day Event',
                content: `
                    <div class="form-group">
                        <label>Date Range</label>
                        <p class="date-range-display">${startDate} to ${endDate} (${dayCount} days)</p>
                    </div>
                    <div class="form-group">
                        <label for="multiday-event-name">Event Name</label>
                        <input type="text" id="multiday-event-name" placeholder="e.g., Vacation, Project Sprint" />
                    </div>
                    <div class="form-group">
                        <label for="multiday-event-category">Category</label>
                        <select id="multiday-event-category">
                            ${this.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="multiday-event-notes">Notes</label>
                        <textarea id="multiday-event-notes" rows="3" placeholder="Optional notes..."></textarea>
                    </div>
                `,
                buttons: [
                    { text: 'Cancel', className: 'btn-secondary', action: 'cancel' },
                    { 
                        text: 'Create Event', 
                        className: 'btn-primary', 
                        action: 'create',
                        primary: true,
                        onClick: () => this.createMultiDayEvent(),
                        closeOnClick: false
                    }
                ]
            });
            
            // Focus the name input
            setTimeout(() => {
                document.getElementById('multiday-event-name')?.focus();
            }, 100);
        } else {
            // Fallback to simple prompt
            const eventName = prompt(`Create event for ${dayCount} days (${startDate} to ${endDate}):`);
            if (eventName) {
                this.applyMultiDayEvent(eventName, this.categories[0]?.name || 'Personal');
            }
        }
    }
    
    /**
     * Create multi-day event from modal
     */
    createMultiDayEvent() {
        const name = document.getElementById('multiday-event-name')?.value;
        const category = document.getElementById('multiday-event-category')?.value;
        const notes = document.getElementById('multiday-event-notes')?.value;
        
        if (!name) {
            if (window.showToast) {
                window.showToast('Please enter an event name', 'error');
            }
            return;
        }
        
        this.applyMultiDayEvent(name, category, notes);
        
        if (window.Modal) {
            window.Modal.close();
        }
    }
    
    /**
     * Apply multi-day event to calendar
     */
    applyMultiDayEvent(name, category, notes = '') {
        // Store in monthly data
        if (!this.monthlyData.multi_day_events) {
            this.monthlyData.multi_day_events = [];
        }
        
        this.monthlyData.multi_day_events.push({
            name,
            category,
            notes,
            start_date: this.selectedDateRange[0],
            end_date: this.selectedDateRange[this.selectedDateRange.length - 1],
            dates: [...this.selectedDateRange]
        });
        
        // Apply visual styling to days
        const categoryObj = this.getCategoryByName(category);
        this.selectedDateRange.forEach(dateStr => {
            const cell = document.querySelector(`.calendar-day[data-date="${dateStr}"]`);
            if (cell && categoryObj) {
                cell.style.background = `linear-gradient(135deg, ${categoryObj.color_start}40 0%, ${categoryObj.color_end}40 100%)`;
                cell.classList.add('has-event');
                
                // Add event label to first day
                if (dateStr === this.selectedDateRange[0]) {
                    const eventLabel = document.createElement('div');
                    eventLabel.className = 'multi-day-event-label';
                    eventLabel.textContent = name;
                    eventLabel.style.background = `linear-gradient(135deg, ${categoryObj.color_start} 0%, ${categoryObj.color_end} 100%)`;
                    cell.appendChild(eventLabel);
                }
            }
        });
        
        // Save to database
        this.saveMonthlyData();
        
        if (window.showToast) {
            window.showToast(`Created "${name}" event`, 'success');
        }
    }

    /**
     * Select a category
     */
    selectCategory(category) {
        // Toggle selection
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
     * Assign category to a day
     */
    assignCategoryToDay(dateStr, category) {
        const dayCell = document.querySelector(`[data-date="${dateStr}"]`);
        if (!dayCell) return;
        
        const color = CATEGORY_COLORS[category];
        dayCell.style.backgroundColor = color;
        dayCell.style.opacity = '0.3';
        
        // Store this assignment (could be in monthly_data or a separate structure)
        // For now, we'll store it in the monthly data's action_plan as metadata
        if (!this.monthlyData.action_plan) {
            this.monthlyData.action_plan = [];
        }
        
        // Find or create day category mapping
        let dayCategories = this.monthlyData.action_plan.find(item => item.type === 'day_categories');
        if (!dayCategories) {
            dayCategories = { type: 'day_categories', data: {} };
            this.monthlyData.action_plan.push(dayCategories);
        }
        
        dayCategories.data[dateStr] = category;
        
        // Save to database
        this.saveMonthlyData();
    }

    /**
     * Render checklist
     */
    renderChecklist() {
        const container = document.getElementById('checklist-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        const checklist = this.monthlyData.checklist || [];
        
        checklist.forEach((item, index) => {
            const checklistItem = this.createChecklistItem(item, index);
            container.appendChild(checklistItem);
        });
    }

    /**
     * Create a checklist item element
     */
    createChecklistItem(item, index) {
        const template = document.getElementById('checklist-item-template');
        const element = template.content.cloneNode(true).querySelector('.checklist-item');
        
        const checkbox = element.querySelector('.checklist-checkbox');
        const textInput = element.querySelector('.checklist-text');
        
        checkbox.checked = item.completed || false;
        textInput.value = item.text || '';
        
        // Event listeners
        checkbox.addEventListener('change', (e) => {
            this.toggleChecklistItem(index, e.target.checked);
        });
        
        textInput.addEventListener('blur', (e) => {
            this.updateChecklistItemText(index, e.target.value);
        });
        
        element.querySelector('.delete-checklist-btn').addEventListener('click', () => {
            this.deleteChecklistItem(index);
        });
        
        return element;
    }

    /**
     * Add a new checklist item
     */
    addChecklistItem() {
        if (!this.monthlyData.checklist) {
            this.monthlyData.checklist = [];
        }
        
        this.monthlyData.checklist.push({ text: '', completed: false });
        this.renderChecklist();
    }

    /**
     * Toggle checklist item completion
     */
    async toggleChecklistItem(index, completed) {
        if (this.monthlyData.checklist && this.monthlyData.checklist[index]) {
            this.monthlyData.checklist[index].completed = completed;
            await this.saveMonthlyData();
        }
    }

    /**
     * Update checklist item text
     */
    async updateChecklistItemText(index, text) {
        if (this.monthlyData.checklist && this.monthlyData.checklist[index]) {
            this.monthlyData.checklist[index].text = text;
            await this.saveMonthlyData();
        }
    }

    /**
     * Delete a checklist item
     */
    async deleteChecklistItem(index) {
        if (this.monthlyData.checklist) {
            this.monthlyData.checklist.splice(index, 1);
            await this.saveMonthlyData();
            this.renderChecklist();
        }
    }

    /**
     * Render notes
     */
    renderNotes() {
        const notesTextarea = document.getElementById('monthly-notes-text');
        if (notesTextarea) {
            notesTextarea.value = this.monthlyData.notes || '';
        }
    }

    /**
     * Save notes
     */
    async saveNotes(text) {
        this.monthlyData.notes = text;
        await this.saveMonthlyData();
    }

    /**
     * Render action plan
     */
    renderActionPlan() {
        const container = document.getElementById('action-plan-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Filter out metadata items (like day_categories)
        const actionPlans = (this.monthlyData.action_plan || []).filter(item => item.type !== 'day_categories');
        
        actionPlans.forEach((item, index) => {
            const actionPlanItem = this.createActionPlanItem(item, index);
            container.appendChild(actionPlanItem);
        });
    }

    /**
     * Create an action plan item element
     */
    createActionPlanItem(item, index) {
        const template = document.getElementById('action-plan-item-template');
        const element = template.content.cloneNode(true).querySelector('.action-plan-item');
        
        const goalInput = element.querySelector('.action-goal');
        const progressSlider = element.querySelector('.action-progress');
        const progressValue = element.querySelector('.progress-value');
        const evaluationTextarea = element.querySelector('.action-evaluation');
        
        goalInput.value = item.goal || '';
        progressSlider.value = item.progress || 0;
        progressValue.textContent = `${item.progress || 0}%`;
        evaluationTextarea.value = item.evaluation || '';
        
        // Event listeners
        goalInput.addEventListener('blur', (e) => {
            this.updateActionPlanGoal(index, e.target.value);
        });
        
        progressSlider.addEventListener('input', (e) => {
            progressValue.textContent = `${e.target.value}%`;
        });
        
        progressSlider.addEventListener('change', (e) => {
            this.updateActionPlanProgress(index, parseInt(e.target.value));
        });
        
        evaluationTextarea.addEventListener('blur', (e) => {
            this.updateActionPlanEvaluation(index, e.target.value);
        });
        
        element.querySelector('.delete-action-plan-btn').addEventListener('click', () => {
            this.deleteActionPlan(index);
        });
        
        return element;
    }

    /**
     * Add a new action plan
     */
    addActionPlan() {
        if (!this.monthlyData.action_plan) {
            this.monthlyData.action_plan = [];
        }
        
        this.monthlyData.action_plan.push({
            goal: '',
            progress: 0,
            evaluation: ''
        });
        
        this.renderActionPlan();
    }

    /**
     * Update action plan goal
     */
    async updateActionPlanGoal(index, goal) {
        const actionPlans = this.monthlyData.action_plan.filter(item => item.type !== 'day_categories');
        if (actionPlans[index]) {
            actionPlans[index].goal = goal;
            await this.saveMonthlyData();
        }
    }

    /**
     * Update action plan progress
     */
    async updateActionPlanProgress(index, progress) {
        const actionPlans = this.monthlyData.action_plan.filter(item => item.type !== 'day_categories');
        if (actionPlans[index]) {
            actionPlans[index].progress = progress;
            await this.saveMonthlyData();
        }
    }

    /**
     * Update action plan evaluation
     */
    async updateActionPlanEvaluation(index, evaluation) {
        const actionPlans = this.monthlyData.action_plan.filter(item => item.type !== 'day_categories');
        if (actionPlans[index]) {
            actionPlans[index].evaluation = evaluation;
            await this.saveMonthlyData();
        }
    }

    /**
     * Delete an action plan
     */
    async deleteActionPlan(index) {
        const actionPlans = this.monthlyData.action_plan.filter(item => item.type !== 'day_categories');
        const itemToDelete = actionPlans[index];
        
        // Find the actual index in the full array
        const actualIndex = this.monthlyData.action_plan.indexOf(itemToDelete);
        
        if (actualIndex !== -1) {
            this.monthlyData.action_plan.splice(actualIndex, 1);
            await this.saveMonthlyData();
            this.renderActionPlan();
        }
    }

    /**
     * Save monthly data to database
     */
    async saveMonthlyData() {
        try {
            await dataService.upsertMonthlyData(this.monthlyData);
        } catch (error) {
            console.error('Failed to save monthly data:', error);
            this.showError('Failed to save data. Please try again.');
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
            item.setAttribute('role', 'listitem');
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
        } catch (error) {
            console.error('Failed to update category colors:', error);
            this.showError('Failed to update colors. Please try again.');
        }
    }

    /**
     * Delete a category
     */
    async deleteCategory(categoryId) {
        if (!confirm('Are you sure you want to delete this category?')) {
            return;
        }
        
        try {
            await dataService.deleteCustomCategory(categoryId);
            this.categories = this.categories.filter(c => c.id !== categoryId);
            
            this.renderCategoryManager();
            this.renderCategories();
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

export default MonthlyView;
