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
     * Update month/year display
     */
    updateMonthYearDisplay() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const displayText = `${monthNames[this.currentMonth - 1]} ${this.currentYear}`;
        document.getElementById('current-month-year').textContent = displayText;
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
            
            // Render all components
            this.renderCalendar();
            this.renderChecklist();
            this.renderNotes();
            this.renderActionPlan();
            
        } catch (error) {
            console.error('Failed to load monthly data:', error);
            this.showError('Failed to load data. Please try again.');
        }
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
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            container.appendChild(emptyCell);
        }
        
        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = this.createDayCell(day);
            container.appendChild(dayCell);
        }
    }

    /**
     * Create a calendar day cell
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
        
        // Add click handler for category assignment
        cell.addEventListener('click', (e) => {
            if (this.selectedCategory) {
                this.assignCategoryToDay(dateStr, this.selectedCategory);
            }
        });
        
        // Load and display category color if assigned
        // (This would be stored in a separate data structure or as part of monthly data)
        
        return cell;
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
