/**
 * Action Plan View - Manages action plans with goals, progress tracking, and evaluation
 */

import dataService from '../js/data-service.js';
import { formatMonthYear, debounce } from '../js/utils.js';

class ActionPlanView {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth() + 1; // 1-12
        this.actionPlans = [];
        this.editingPlanId = null;
        this.container = null;
    }

    /**
     * Initialize the action plan view
     */
    async init(container) {
        this.container = container;
        
        // Load the HTML template
        const response = await fetch('views/action-plan-view.html');
        const html = await response.text();
        this.container.innerHTML = html;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load data
        await this.loadActionPlans();
        this.updateMonthDisplay();
    }

    /**
     * Setup event listeners for navigation and interactions
     */
    setupEventListeners() {
        // Month navigation
        const prevBtn = document.getElementById('prev-month-btn');
        const nextBtn = document.getElementById('next-month-btn');
        const addBtn = document.getElementById('add-action-plan-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigateMonth(-1));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateMonth(1));
        }

        if (addBtn) {
            addBtn.addEventListener('click', () => this.addNewActionPlan());
        }

        // Modal event listeners
        const modal = document.getElementById('edit-modal');
        const closeBtn = modal?.querySelector('.modal-close');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        const saveBtn = document.getElementById('modal-save-btn');
        const progressSlider = document.getElementById('edit-progress');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveFromModal());
        }

        if (progressSlider) {
            progressSlider.addEventListener('input', (e) => {
                const display = document.getElementById('progress-display');
                if (display) {
                    display.textContent = `${e.target.value}%`;
                }
            });
        }

        // Close modal on outside click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    /**
     * Navigate to previous or next month
     * @param {number} direction - -1 for previous, 1 for next
     */
    async navigateMonth(direction) {
        this.currentMonth += direction;

        if (this.currentMonth > 12) {
            this.currentMonth = 1;
            this.currentYear++;
        } else if (this.currentMonth < 1) {
            this.currentMonth = 12;
            this.currentYear--;
        }

        this.updateMonthDisplay();
        await this.loadActionPlans();
    }

    /**
     * Update the month/year display
     */
    updateMonthDisplay() {
        const monthYearElement = document.getElementById('current-month-year');
        if (monthYearElement) {
            monthYearElement.textContent = formatMonthYear(this.currentYear, this.currentMonth);
        }
    }

    /**
     * Load action plans from database
     */
    async loadActionPlans() {
        try {
            this.actionPlans = await dataService.getActionPlans(this.currentYear, this.currentMonth);
            this.renderActionPlans();
        } catch (error) {
            console.error('Error loading action plans:', error);
            this.showError('Failed to load action plans');
        }
    }

    /**
     * Render action plans in the table
     */
    renderActionPlans() {
        const tbody = document.getElementById('action-plan-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.actionPlans.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-row';
            emptyRow.innerHTML = '<td colspan="7" style="text-align: center; padding: 2rem; color: #999;">No action plans for this month. Click "Add Action Plan" to create one.</td>';
            tbody.appendChild(emptyRow);
            return;
        }

        this.actionPlans.forEach(plan => {
            const row = this.createActionPlanRow(plan);
            tbody.appendChild(row);
        });
    }

    /**
     * Create a table row for an action plan
     * @param {Object} plan - Action plan data
     * @returns {HTMLElement} Table row element
     */
    createActionPlanRow(plan) {
        const row = document.createElement('tr');
        row.className = 'action-plan-row';
        row.dataset.id = plan.id;

        row.innerHTML = `
            <td class="life-area-cell">${this.escapeHtml(plan.life_area || '')}</td>
            <td class="specific-action-cell">${this.escapeHtml(plan.specific_action || '')}</td>
            <td class="frequency-cell">${this.escapeHtml(plan.frequency || '')}</td>
            <td class="success-criteria-cell">${this.escapeHtml(plan.success_criteria || '')}</td>
            <td class="progress-cell">
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${plan.progress || 0}%"></div>
                    </div>
                    <span class="progress-text">${plan.progress || 0}%</span>
                </div>
            </td>
            <td class="evaluation-cell">${this.escapeHtml(plan.evaluation || '')}</td>
            <td class="actions-cell">
                <button class="btn-edit" aria-label="Edit action plan" title="Edit">✏️</button>
                <button class="btn-delete" aria-label="Delete action plan" title="Delete">🗑️</button>
            </td>
        `;

        // Add event listeners
        const editBtn = row.querySelector('.btn-edit');
        const deleteBtn = row.querySelector('.btn-delete');

        if (editBtn) {
            editBtn.addEventListener('click', () => this.editActionPlan(plan));
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteActionPlan(plan.id));
        }

        return row;
    }

    /**
     * Add a new action plan
     */
    addNewActionPlan() {
        this.editingPlanId = null;
        this.openModal({
            life_area: '',
            specific_action: '',
            frequency: '',
            success_criteria: '',
            progress: 0,
            evaluation: ''
        });
    }

    /**
     * Edit an existing action plan
     * @param {Object} plan - Action plan to edit
     */
    editActionPlan(plan) {
        this.editingPlanId = plan.id;
        this.openModal(plan);
    }

    /**
     * Open the edit modal with plan data
     * @param {Object} plan - Action plan data
     */
    openModal(plan) {
        const modal = document.getElementById('edit-modal');
        if (!modal) return;

        // Populate form fields
        document.getElementById('edit-life-area').value = plan.life_area || '';
        document.getElementById('edit-specific-action').value = plan.specific_action || '';
        document.getElementById('edit-frequency').value = plan.frequency || '';
        document.getElementById('edit-success-criteria').value = plan.success_criteria || '';
        document.getElementById('edit-progress').value = plan.progress || 0;
        document.getElementById('edit-evaluation').value = plan.evaluation || '';
        document.getElementById('progress-display').textContent = `${plan.progress || 0}%`;

        modal.style.display = 'flex';
    }

    /**
     * Close the edit modal
     */
    closeModal() {
        const modal = document.getElementById('edit-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.editingPlanId = null;
    }

    /**
     * Save action plan from modal
     */
    async saveFromModal() {
        const planData = {
            year: this.currentYear,
            month: this.currentMonth,
            life_area: document.getElementById('edit-life-area').value.trim(),
            specific_action: document.getElementById('edit-specific-action').value.trim(),
            frequency: document.getElementById('edit-frequency').value.trim(),
            success_criteria: document.getElementById('edit-success-criteria').value.trim(),
            progress: parseInt(document.getElementById('edit-progress').value) || 0,
            evaluation: document.getElementById('edit-evaluation').value.trim()
        };

        // Validation
        if (!planData.life_area || !planData.specific_action) {
            this.showError('Life Area and Specific Action are required');
            return;
        }

        try {
            if (this.editingPlanId) {
                // Update existing plan
                await dataService.updateActionPlan(this.editingPlanId, planData);
            } else {
                // Create new plan
                await dataService.createActionPlan(planData);
            }

            this.closeModal();
            await this.loadActionPlans();
            this.showSuccess(this.editingPlanId ? 'Action plan updated' : 'Action plan created');
        } catch (error) {
            console.error('Error saving action plan:', error);
            this.showError('Failed to save action plan');
        }
    }

    /**
     * Delete an action plan
     * @param {string} id - Action plan ID
     */
    async deleteActionPlan(id) {
        if (!confirm('Are you sure you want to delete this action plan?')) {
            return;
        }

        try {
            await dataService.deleteActionPlan(id);
            await this.loadActionPlans();
            this.showSuccess('Action plan deleted');
        } catch (error) {
            console.error('Error deleting action plan:', error);
            this.showError('Failed to delete action plan');
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        // Simple alert for now - can be replaced with toast notification
        alert(message);
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        // Simple alert for now - can be replaced with toast notification
        console.log(message);
    }

    /**
     * Cleanup when view is destroyed
     */
    destroy() {
        // Cleanup if needed
    }
}

// Export the class
export default ActionPlanView;
