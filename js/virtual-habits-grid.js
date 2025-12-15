/**
 * Virtual Habits Grid
 * Optimized rendering for large habit grids using virtualization
 * Only renders visible rows for better performance with many habits
 */

import { throttle } from './performance.js';

export class VirtualHabitsGrid {
    constructor(container, options = {}) {
        this.container = container;
        this.habits = [];
        this.completions = [];
        this.daysInMonth = 31;
        this.year = new Date().getFullYear();
        this.month = new Date().getMonth() + 1;
        
        // Configuration
        this.rowHeight = options.rowHeight || 36;
        this.headerHeight = options.headerHeight || 40;
        this.bufferRows = options.bufferRows || 3;
        this.onToggleCompletion = options.onToggleCompletion || (() => {});
        this.onShowNote = options.onShowNote || (() => {});
        
        // State
        this.scrollTop = 0;
        this.visibleStart = 0;
        this.visibleEnd = 0;
        
        this.init();
    }

    init() {
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        this.container.style.willChange = 'transform';
        
        // Create structure
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'virtual-grid-wrapper';
        this.wrapper.style.position = 'relative';
        
        // Header (always visible)
        this.headerEl = document.createElement('div');
        this.headerEl.className = 'habits-grid-row header virtual-header';
        this.headerEl.style.position = 'sticky';
        this.headerEl.style.top = '0';
        this.headerEl.style.zIndex = '10';
        this.headerEl.style.background = 'var(--bg-surface)';
        
        // Spacer for total height
        this.spacer = document.createElement('div');
        this.spacer.className = 'virtual-spacer';
        this.spacer.style.position = 'relative';
        
        // Content container for visible rows
        this.content = document.createElement('div');
        this.content.className = 'virtual-content';
        this.content.style.position = 'absolute';
        this.content.style.left = '0';
        this.content.style.right = '0';
        this.content.style.willChange = 'transform';
        
        this.spacer.appendChild(this.content);
        this.wrapper.appendChild(this.headerEl);
        this.wrapper.appendChild(this.spacer);
        this.container.appendChild(this.wrapper);
        
        // Attach scroll listener
        this.attachScrollListener();
    }

    attachScrollListener() {
        const handleScroll = throttle(() => {
            this.scrollTop = this.container.scrollTop;
            this.render();
        }, 16); // ~60fps
        
        this.container.addEventListener('scroll', handleScroll, { passive: true });
    }

    /**
     * Set data and render
     */
    setData(habits, completions, year, month, daysInMonth) {
        this.habits = habits || [];
        this.completions = completions || [];
        this.year = year;
        this.month = month;
        this.daysInMonth = daysInMonth;
        
        // Update spacer height
        const totalHeight = this.habits.length * this.rowHeight;
        this.spacer.style.height = `${totalHeight}px`;
        
        // Render header
        this.renderHeader();
        
        // Render visible rows
        this.render();
    }

    /**
     * Render header row with day numbers
     */
    renderHeader() {
        this.headerEl.innerHTML = '<div class="grid-cell habit-header-cell">Habit</div>';
        
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === this.year && 
                               (today.getMonth() + 1) === this.month;
        const todayDay = today.getDate();
        
        for (let day = 1; day <= this.daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell day-header-cell';
            if (isCurrentMonth && day === todayDay) {
                cell.classList.add('today');
            }
            cell.textContent = day;
            this.headerEl.appendChild(cell);
        }
    }

    /**
     * Calculate visible range based on scroll position
     */
    calculateVisibleRange() {
        const containerHeight = this.container.clientHeight - this.headerHeight;
        const start = Math.floor(this.scrollTop / this.rowHeight);
        const visibleCount = Math.ceil(containerHeight / this.rowHeight);
        
        this.visibleStart = Math.max(0, start - this.bufferRows);
        this.visibleEnd = Math.min(this.habits.length, start + visibleCount + this.bufferRows);
    }

    /**
     * Render visible rows only
     */
    render() {
        this.calculateVisibleRange();
        
        // Clear content
        this.content.innerHTML = '';
        
        // Position content
        const offsetY = this.visibleStart * this.rowHeight;
        this.content.style.transform = `translateY(${offsetY}px)`;
        
        // Render visible rows
        for (let i = this.visibleStart; i < this.visibleEnd; i++) {
            const habit = this.habits[i];
            const row = this.createRow(habit, i);
            this.content.appendChild(row);
        }
    }

    /**
     * Create a habit row
     */
    createRow(habit, index) {
        const row = document.createElement('div');
        row.className = 'habits-grid-row';
        row.style.height = `${this.rowHeight}px`;
        row.dataset.habitId = habit.id;
        row.dataset.index = index;
        
        // Habit name cell
        const nameCell = document.createElement('div');
        nameCell.className = 'grid-cell habit-name-cell';
        nameCell.textContent = habit.habit_name || 'Unnamed';
        nameCell.title = habit.habit_name || 'Unnamed';
        row.appendChild(nameCell);
        
        // Day cells
        for (let day = 1; day <= this.daysInMonth; day++) {
            const date = `${this.year}-${String(this.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const completion = this.completions.find(
                c => c.habit_id === habit.id && c.date === date
            );
            
            const cell = document.createElement('div');
            cell.className = 'grid-cell checkbox-cell';
            cell.dataset.date = date;
            cell.dataset.habitId = habit.id;
            
            if (completion?.notes) {
                cell.classList.add('has-note');
                cell.title = completion.notes;
            }
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = completion?.completed || false;
            checkbox.setAttribute('aria-label', `${habit.habit_name} - Day ${day}`);
            
            checkbox.addEventListener('change', () => {
                this.onToggleCompletion(habit.id, date, checkbox.checked, cell);
            });
            
            // Double-click for notes
            cell.addEventListener('dblclick', (e) => {
                e.preventDefault();
                this.onShowNote(habit, date, completion?.notes || '');
            });
            
            cell.appendChild(checkbox);
            row.appendChild(cell);
        }
        
        return row;
    }

    /**
     * Update a single cell without full re-render
     */
    updateCell(habitId, date, completed, notes) {
        const cell = this.content.querySelector(
            `.checkbox-cell[data-habit-id="${habitId}"][data-date="${date}"]`
        );
        
        if (cell) {
            const checkbox = cell.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = completed;
            }
            
            if (notes) {
                cell.classList.add('has-note');
                cell.title = notes;
            } else {
                cell.classList.remove('has-note');
                cell.title = '';
            }
        }
        
        // Update completions array
        const existingIndex = this.completions.findIndex(
            c => c.habit_id === habitId && c.date === date
        );
        
        if (existingIndex >= 0) {
            this.completions[existingIndex].completed = completed;
            if (notes !== undefined) {
                this.completions[existingIndex].notes = notes;
            }
        } else {
            this.completions.push({ habit_id: habitId, date, completed, notes });
        }
    }

    /**
     * Scroll to a specific habit row
     */
    scrollToHabit(habitId) {
        const index = this.habits.findIndex(h => h.id === habitId);
        if (index >= 0) {
            const targetScroll = index * this.rowHeight;
            this.container.scrollTop = targetScroll;
        }
    }

    /**
     * Get visible habits count
     */
    getVisibleCount() {
        return this.visibleEnd - this.visibleStart;
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.container.innerHTML = '';
        this.habits = [];
        this.completions = [];
    }
}

export default VirtualHabitsGrid;
