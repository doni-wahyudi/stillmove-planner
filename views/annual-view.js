/**
 * Annual View Controller
 * Handles the annual overview and goal setting interface
 */

import dataService from '../js/data-service.js';
import { calculateGoalProgress } from '../js/utils.js';

class AnnualView {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.currentYear = new Date().getFullYear();
        this.goals = [];
        this.readingList = [];
        this.draggedElement = null;
    }

    /**
     * Initialize the annual view
     */
    async init(container) {
        this.container = container;
        
        // Load the HTML template
        const response = await fetch('views/annual-view.html');
        const html = await response.text();
        this.container.innerHTML = html;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load data
        await this.loadData();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Year navigation
        document.getElementById('prev-year-btn')?.addEventListener('click', () => this.changeYear(-1));
        document.getElementById('next-year-btn')?.addEventListener('click', () => this.changeYear(1));
        document.getElementById('today-year-btn')?.addEventListener('click', () => this.goToCurrentYear());
        
        // Add goal button
        document.getElementById('add-goal-btn')?.addEventListener('click', () => this.addGoal());
        
        // Add book button
        document.getElementById('add-book-btn')?.addEventListener('click', () => this.addBook());
        
        // Save reflection on blur
        document.getElementById('last-year-reflection')?.addEventListener('blur', (e) => {
            this.saveReflection(e.target.value);
        });
        
        // Save vision board on blur
        document.getElementById('vision-text')?.addEventListener('blur', (e) => {
            this.saveVisionBoard(e.target.value);
        });
        
        // Save bucket list on blur
        document.getElementById('bucket-list-text')?.addEventListener('blur', (e) => {
            this.saveBucketList(e.target.value);
        });
    }

    /**
     * Change year
     */
    async changeYear(delta) {
        this.currentYear += delta;
        document.getElementById('current-year').textContent = this.currentYear;
        await this.loadData();
    }

    /**
     * Go to current year (This Year button)
     */
    async goToCurrentYear() {
        this.currentYear = new Date().getFullYear();
        document.getElementById('current-year').textContent = this.currentYear;
        await this.loadData();
    }

    /**
     * Load data for the current year
     */
    async loadData() {
        try {
            // Load annual goals
            this.goals = await dataService.getAnnualGoals(this.currentYear);
            this.renderGoals();
            
            // Load reading list
            this.readingList = await dataService.getReadingList(this.currentYear);
            this.renderReadingList();
            
            // Load reflection, vision board, and bucket list from monthly data (stored in January)
            const januaryData = await dataService.getMonthlyData(this.currentYear, 1);
            
            const reflectionEl = document.getElementById('last-year-reflection');
            const visionEl = document.getElementById('vision-text');
            const bucketEl = document.getElementById('bucket-list-text');
            
            // Always set values (clear if no data)
            if (reflectionEl) {
                reflectionEl.value = (januaryData && januaryData.notes) ? januaryData.notes : '';
            }
            if (visionEl) {
                visionEl.value = (januaryData && januaryData.action_plan && januaryData.action_plan[0]) 
                    ? januaryData.action_plan[0].vision || '' 
                    : '';
            }
            if (bucketEl) {
                bucketEl.value = (januaryData && januaryData.action_plan && januaryData.action_plan[0]) 
                    ? januaryData.action_plan[0].bucket_list || '' 
                    : '';
            }
        } catch (error) {
            console.error('Failed to load annual data:', error);
            this.showError('Failed to load data. Please try again.');
        }
    }

    /**
     * Render goals
     */
    renderGoals() {
        const container = document.getElementById('goals-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.goals.forEach(goal => {
            const goalCard = this.createGoalCard(goal);
            container.appendChild(goalCard);
        });
    }

    /**
     * Create a goal card element
     */
    createGoalCard(goal) {
        const template = document.getElementById('goal-card-template');
        const card = template.content.cloneNode(true).querySelector('.goal-card');
        
        card.dataset.goalId = goal.id;
        
        // Set title and category
        const titleInput = card.querySelector('.goal-title');
        const categorySelect = card.querySelector('.goal-category');
        
        titleInput.value = goal.title || '';
        categorySelect.value = goal.category || 'Personal';
        
        // Set deadline
        const deadlineInput = card.querySelector('.goal-deadline');
        const deadlineCountdown = card.querySelector('.deadline-countdown');
        
        if (deadlineInput) {
            deadlineInput.value = goal.deadline || '';
            deadlineInput.addEventListener('change', () => {
                this.updateGoal(goal.id, { deadline: deadlineInput.value });
                this.updateDeadlineCountdown(deadlineInput.value, deadlineCountdown);
            });
            
            // Update countdown display
            this.updateDeadlineCountdown(goal.deadline, deadlineCountdown);
        }
        
        // Calculate and display progress
        const subGoals = goal.sub_goals || [];
        const progress = calculateGoalProgress(subGoals);
        
        const progressFill = card.querySelector('.progress-fill');
        const progressText = card.querySelector('.progress-text');
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${progress}%`;
        
        // Render sub-goals
        const subGoalsList = card.querySelector('.sub-goals-list');
        subGoals.forEach((subGoal, index) => {
            const subGoalItem = this.createSubGoalItem(subGoal, index);
            subGoalsList.appendChild(subGoalItem);
        });
        
        // Event listeners
        titleInput.addEventListener('blur', () => this.updateGoal(goal.id, { title: titleInput.value }));
        categorySelect.addEventListener('change', () => this.updateGoal(goal.id, { category: categorySelect.value }));
        
        card.querySelector('.delete-goal-btn').addEventListener('click', () => this.deleteGoal(goal.id));
        card.querySelector('.add-sub-goal-btn').addEventListener('click', () => this.addSubGoal(goal.id));
        
        // Setup drag and drop for sub-goals
        this.setupDragAndDrop(subGoalsList, goal.id);
        
        return card;
    }
    
    /**
     * Update deadline countdown display
     */
    updateDeadlineCountdown(deadline, countdownEl) {
        if (!countdownEl) return;
        
        if (!deadline) {
            countdownEl.textContent = '';
            countdownEl.className = 'deadline-countdown';
            return;
        }
        
        const deadlineDate = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        deadlineDate.setHours(0, 0, 0, 0);
        
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            countdownEl.textContent = `${Math.abs(diffDays)} days overdue`;
            countdownEl.className = 'deadline-countdown overdue';
        } else if (diffDays === 0) {
            countdownEl.textContent = 'Due today!';
            countdownEl.className = 'deadline-countdown urgent';
        } else if (diffDays <= 7) {
            countdownEl.textContent = `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
            countdownEl.className = 'deadline-countdown urgent';
        } else if (diffDays <= 30) {
            countdownEl.textContent = `${diffDays} days left`;
            countdownEl.className = 'deadline-countdown upcoming';
        } else {
            const weeks = Math.floor(diffDays / 7);
            countdownEl.textContent = `${weeks} week${weeks === 1 ? '' : 's'} left`;
            countdownEl.className = 'deadline-countdown far';
        }
    }

    /**
     * Create a sub-goal item element
     */
    createSubGoalItem(subGoal, index) {
        const template = document.getElementById('sub-goal-template');
        const item = template.content.cloneNode(true).querySelector('.sub-goal-item');
        
        item.dataset.index = index;
        
        const checkbox = item.querySelector('.sub-goal-checkbox');
        const textInput = item.querySelector('.sub-goal-text');
        
        checkbox.checked = subGoal.completed || false;
        textInput.value = subGoal.text || '';
        
        // Event listeners
        checkbox.addEventListener('change', (e) => {
            const goalId = e.target.closest('.goal-card').dataset.goalId;
            this.toggleSubGoal(goalId, index, e.target.checked);
        });
        
        textInput.addEventListener('blur', (e) => {
            const goalId = e.target.closest('.goal-card').dataset.goalId;
            this.updateSubGoalText(goalId, index, e.target.value);
        });
        
        item.querySelector('.delete-sub-goal-btn').addEventListener('click', (e) => {
            const goalId = e.target.closest('.goal-card').dataset.goalId;
            this.deleteSubGoal(goalId, index);
        });
        
        return item;
    }

    /**
     * Setup drag and drop for sub-goals
     */
    setupDragAndDrop(list, goalId) {
        const items = list.querySelectorAll('.sub-goal-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.draggedElement = item;
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                this.draggedElement = null;
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const afterElement = this.getDragAfterElement(list, e.clientY);
                if (afterElement == null) {
                    list.appendChild(this.draggedElement);
                } else {
                    list.insertBefore(this.draggedElement, afterElement);
                }
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                this.reorderSubGoals(goalId);
            });
        });
    }

    /**
     * Get the element after which to insert the dragged element
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.sub-goal-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * Add a new goal
     */
    async addGoal() {
        try {
            const newGoal = {
                year: this.currentYear,
                category: 'Personal',
                title: 'New Goal',
                sub_goals: [],
                progress: 0
            };
            
            const created = await dataService.createAnnualGoal(newGoal);
            this.goals.push(created);
            this.renderGoals();
        } catch (error) {
            console.error('Failed to add goal:', error);
            this.showError('Failed to add goal. Please try again.');
        }
    }

    /**
     * Update a goal
     */
    async updateGoal(goalId, updates) {
        try {
            await dataService.updateAnnualGoal(goalId, updates);
            const goal = this.goals.find(g => g.id === goalId);
            if (goal) {
                Object.assign(goal, updates);
            }
        } catch (error) {
            console.error('Failed to update goal:', error);
            this.showError('Failed to update goal. Please try again.');
        }
    }

    /**
     * Delete a goal
     */
    async deleteGoal(goalId) {
        if (!confirm('Are you sure you want to delete this goal?')) return;
        
        try {
            await dataService.deleteAnnualGoal(goalId);
            this.goals = this.goals.filter(g => g.id !== goalId);
            this.renderGoals();
        } catch (error) {
            console.error('Failed to delete goal:', error);
            this.showError('Failed to delete goal. Please try again.');
        }
    }

    /**
     * Add a sub-goal
     */
    async addSubGoal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const subGoals = goal.sub_goals || [];
        subGoals.push({ text: '', completed: false });
        
        await this.updateGoal(goalId, { sub_goals: subGoals });
        this.renderGoals();
    }

    /**
     * Toggle sub-goal completion
     */
    async toggleSubGoal(goalId, index, completed) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const subGoals = goal.sub_goals || [];
        if (subGoals[index]) {
            subGoals[index].completed = completed;
            
            // Recalculate progress
            const progress = calculateGoalProgress(subGoals);
            
            await this.updateGoal(goalId, { sub_goals: subGoals, progress });
            this.renderGoals();
        }
    }

    /**
     * Update sub-goal text
     */
    async updateSubGoalText(goalId, index, text) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const subGoals = goal.sub_goals || [];
        if (subGoals[index]) {
            subGoals[index].text = text;
            await this.updateGoal(goalId, { sub_goals: subGoals });
        }
    }

    /**
     * Delete a sub-goal
     */
    async deleteSubGoal(goalId, index) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const subGoals = goal.sub_goals || [];
        subGoals.splice(index, 1);
        
        // Recalculate progress
        const progress = calculateGoalProgress(subGoals);
        
        await this.updateGoal(goalId, { sub_goals: subGoals, progress });
        this.renderGoals();
    }

    /**
     * Reorder sub-goals after drag and drop
     */
    async reorderSubGoals(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const card = document.querySelector(`[data-goal-id="${goalId}"]`);
        const subGoalItems = card.querySelectorAll('.sub-goal-item');
        
        const reorderedSubGoals = [];
        subGoalItems.forEach(item => {
            const index = parseInt(item.dataset.index);
            const subGoal = goal.sub_goals[index];
            if (subGoal) {
                reorderedSubGoals.push(subGoal);
            }
        });
        
        await this.updateGoal(goalId, { sub_goals: reorderedSubGoals });
        goal.sub_goals = reorderedSubGoals;
    }

    /**
     * Render reading list
     */
    renderReadingList() {
        const container = document.getElementById('reading-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Ensure we have 50 slots
        const books = [...this.readingList];
        while (books.length < 50) {
            books.push({ book_title: '', author: '', completed: false, rating: 0, order_index: books.length });
        }
        
        books.forEach((book, index) => {
            const bookEntry = this.createBookEntry(book, index + 1);
            container.appendChild(bookEntry);
        });
        
        // Update completed count
        const completedCount = this.readingList.filter(b => b.completed).length;
        document.getElementById('books-completed').textContent = completedCount;
    }

    /**
     * Create a book entry element
     */
    createBookEntry(book, number) {
        const template = document.getElementById('book-template');
        const entry = template.content.cloneNode(true).querySelector('.book-entry');
        
        if (book.id) {
            entry.dataset.bookId = book.id;
        }
        
        entry.querySelector('.book-number').textContent = number;
        
        const titleInput = entry.querySelector('.book-title');
        const authorInput = entry.querySelector('.book-author');
        const completedCheckbox = entry.querySelector('.book-completed');
        
        titleInput.value = book.book_title || '';
        authorInput.value = book.author || '';
        completedCheckbox.checked = book.completed || false;
        
        // Set rating stars
        const stars = entry.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < (book.rating || 0)) {
                star.textContent = '★';
                star.classList.add('filled');
            }
            
            star.addEventListener('click', () => {
                this.setBookRating(book.id || number, index + 1, titleInput, book);
            });
        });
        
        // Event listeners
        titleInput.addEventListener('blur', () => {
            const title = titleInput.value.trim();
            if (title || book.id) {
                this.updateBook(book.id || number, { book_title: title, order_index: number - 1 });
            }
        });
        
        authorInput.addEventListener('blur', () => {
            // Only update if book exists or if title is filled
            if (book.id || titleInput.value.trim()) {
                this.updateBook(book.id || number, { 
                    book_title: titleInput.value.trim() || book.book_title,
                    author: authorInput.value.trim(), 
                    order_index: number - 1 
                });
            }
        });
        
        completedCheckbox.addEventListener('change', () => {
            // Only update if book exists or if title is filled
            if (book.id || titleInput.value.trim()) {
                this.updateBook(book.id || number, { 
                    book_title: titleInput.value.trim() || book.book_title,
                    completed: completedCheckbox.checked, 
                    order_index: number - 1 
                });
            }
        });
        
        entry.querySelector('.delete-book-btn').addEventListener('click', () => {
            this.deleteBook(book.id);
        });
        
        return entry;
    }

    /**
     * Add a new book
     * Note: This just re-renders the list to show empty slots.
     * The actual database entry is created when the user fills in the title.
     */
    async addBook() {
        // Just re-render to show the next empty slot
        // The actual book will be created when user fills in the title
        this.renderReadingList();
    }

    /**
     * Update a book
     */
    async updateBook(bookIdOrIndex, updates) {
        try {
            // If it's a new book (no ID yet), create it
            if (typeof bookIdOrIndex === 'number') {
                // Don't create a new entry if book_title is empty
                if (!updates.book_title || updates.book_title.trim() === '') {
                    return;
                }
                
                // Ensure rating is valid (1-5 or null)
                const rating = updates.rating;
                if (rating !== null && rating !== undefined && (rating < 1 || rating > 5)) {
                    console.warn('Invalid rating value:', rating);
                    return;
                }
                
                const newBook = {
                    year: this.currentYear,
                    book_title: updates.book_title.trim(),
                    author: updates.author ? updates.author.trim() : '',
                    completed: updates.completed || false,
                    rating: rating || null,
                    order_index: updates.order_index
                };
                const created = await dataService.createReadingListEntry(newBook);
                this.readingList.push(created);
                this.renderReadingList();
            } else {
                // Update existing book
                // Ensure rating is valid (1-5 or null)
                if (updates.rating !== undefined) {
                    const rating = updates.rating;
                    if (rating !== null && (rating < 1 || rating > 5)) {
                        console.warn('Invalid rating value:', rating);
                        return;
                    }
                }
                
                await dataService.updateReadingListEntry(bookIdOrIndex, updates);
                const book = this.readingList.find(b => b.id === bookIdOrIndex);
                if (book) {
                    Object.assign(book, updates);
                }
                // Only re-render if we're updating rating or completed status
                // to avoid infinite loops from input blur events
                if (updates.rating !== undefined || updates.completed !== undefined) {
                    this.renderReadingList();
                }
            }
        } catch (error) {
            console.error('Failed to update book:', error);
            this.showError('Failed to update book. Please try again.');
        }
    }

    /**
     * Set book rating
     */
    async setBookRating(bookIdOrIndex, rating, titleInput, book) {
        // Validate rating (must be 1-5)
        if (rating < 1 || rating > 5) {
            console.warn('Invalid rating:', rating);
            return;
        }
        
        // Only update if book exists or if title is filled
        if (typeof bookIdOrIndex === 'string' || (titleInput && titleInput.value.trim())) {
            await this.updateBook(bookIdOrIndex, { 
                book_title: titleInput ? titleInput.value.trim() : book.book_title,
                rating 
            });
        }
    }

    /**
     * Delete a book
     */
    async deleteBook(bookId) {
        if (!bookId) return;
        
        try {
            await dataService.deleteReadingListEntry(bookId);
            this.readingList = this.readingList.filter(b => b.id !== bookId);
            this.renderReadingList();
        } catch (error) {
            console.error('Failed to delete book:', error);
            this.showError('Failed to delete book. Please try again.');
        }
    }

    /**
     * Save reflection
     */
    async saveReflection(text) {
        try {
            const januaryData = await dataService.getMonthlyData(this.currentYear, 1) || {};
            januaryData.year = this.currentYear;
            januaryData.month = 1;
            januaryData.notes = text;
            
            await dataService.upsertMonthlyData(januaryData);
        } catch (error) {
            console.error('Failed to save reflection:', error);
            this.showError('Failed to save reflection. Please try again.');
        }
    }

    /**
     * Save vision board
     */
    async saveVisionBoard(text) {
        try {
            const januaryData = await dataService.getMonthlyData(this.currentYear, 1) || {};
            januaryData.year = this.currentYear;
            januaryData.month = 1;
            januaryData.action_plan = januaryData.action_plan || [{}];
            januaryData.action_plan[0].vision = text;
            
            await dataService.upsertMonthlyData(januaryData);
        } catch (error) {
            console.error('Failed to save vision board:', error);
            this.showError('Failed to save vision board. Please try again.');
        }
    }

    /**
     * Save bucket list
     */
    async saveBucketList(text) {
        try {
            const januaryData = await dataService.getMonthlyData(this.currentYear, 1) || {};
            januaryData.year = this.currentYear;
            januaryData.month = 1;
            januaryData.action_plan = januaryData.action_plan || [{}];
            januaryData.action_plan[0].bucket_list = text;
            
            await dataService.upsertMonthlyData(januaryData);
        } catch (error) {
            console.error('Failed to save bucket list:', error);
            this.showError('Failed to save bucket list. Please try again.');
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // TODO: Implement toast notification
        alert(message);
    }
}

export default AnnualView;
