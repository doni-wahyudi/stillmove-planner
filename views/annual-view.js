/**
 * Annual View Controller
 * Handles the annual overview and goal setting interface
 */

import dataService from '../js/data-service.js';
import { calculateGoalProgress } from '../js/utils.js';
import aiService from '../js/ai-service.js';

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
        
        // Update breadcrumb
        this.updateBreadcrumb();
        
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
        
        // Reading list filter and sort
        document.getElementById('reading-filter')?.addEventListener('change', () => this.renderReadingList());
        document.getElementById('reading-sort')?.addEventListener('change', () => this.renderReadingList());
        
        // Goal templates button
        document.getElementById('goal-templates-btn')?.addEventListener('click', () => this.showGoalTemplates());
        
        // Goal templates modal close
        const templatesModal = document.getElementById('goal-templates-modal');
        templatesModal?.querySelector('.modal-close')?.addEventListener('click', () => this.hideGoalTemplates());
        templatesModal?.addEventListener('click', (e) => {
            if (e.target === templatesModal) this.hideGoalTemplates();
        });
    }
    
    /**
     * Goal templates data
     */
    getGoalTemplates() {
        return [
            {
                icon: '💪',
                title: 'Fitness Journey',
                category: 'Health',
                description: 'Get in shape and build healthy habits',
                subGoals: [
                    'Exercise 3x per week consistently',
                    'Reach target weight/body composition',
                    'Complete a fitness challenge (5K, marathon, etc.)',
                    'Build a sustainable workout routine',
                    'Improve flexibility and mobility'
                ]
            },
            {
                icon: '📚',
                title: 'Learn a New Skill',
                category: 'Learning',
                description: 'Master something new this year',
                subGoals: [
                    'Choose skill and find learning resources',
                    'Complete beginner course/tutorial',
                    'Practice for 30 minutes daily',
                    'Build a portfolio project',
                    'Get feedback from experts'
                ]
            },
            {
                icon: '💰',
                title: 'Financial Freedom',
                category: 'Finance',
                description: 'Take control of your finances',
                subGoals: [
                    'Create and stick to a monthly budget',
                    'Build 3-6 month emergency fund',
                    'Pay off high-interest debt',
                    'Start investing regularly',
                    'Increase income by 10%'
                ]
            },
            {
                icon: '🚀',
                title: 'Career Growth',
                category: 'Career',
                description: 'Advance your professional life',
                subGoals: [
                    'Update resume and LinkedIn profile',
                    'Learn industry-relevant skills',
                    'Network with 5 new professionals monthly',
                    'Seek promotion or new opportunity',
                    'Get a mentor in your field'
                ]
            },
            {
                icon: '🧘',
                title: 'Mental Wellness',
                category: 'Health',
                description: 'Prioritize your mental health',
                subGoals: [
                    'Establish daily meditation practice',
                    'Reduce screen time before bed',
                    'Journal thoughts and feelings weekly',
                    'Practice gratitude daily',
                    'Set healthy boundaries'
                ]
            },
            {
                icon: '❤️',
                title: 'Strengthen Relationships',
                category: 'Relationships',
                description: 'Deepen connections with loved ones',
                subGoals: [
                    'Schedule regular quality time with family',
                    'Reconnect with old friends',
                    'Be more present in conversations',
                    'Express appreciation more often',
                    'Plan meaningful experiences together'
                ]
            },
            {
                icon: '✍️',
                title: 'Creative Project',
                category: 'Personal',
                description: 'Bring your creative vision to life',
                subGoals: [
                    'Define the project scope and vision',
                    'Create a timeline with milestones',
                    'Dedicate weekly time for creation',
                    'Share work and get feedback',
                    'Complete and publish/launch'
                ]
            },
            {
                icon: '🌍',
                title: 'Travel Adventure',
                category: 'Personal',
                description: 'Explore new places and cultures',
                subGoals: [
                    'Research and choose destinations',
                    'Set travel budget and save',
                    'Plan itinerary and book accommodations',
                    'Learn about local culture/language',
                    'Document and share experiences'
                ]
            }
        ];
    }
    
    /**
     * Show goal templates modal
     */
    showGoalTemplates() {
        const modal = document.getElementById('goal-templates-modal');
        const grid = document.getElementById('goal-templates-grid');
        if (!modal || !grid) return;
        
        // Render templates
        const templates = this.getGoalTemplates();
        grid.innerHTML = templates.map((template, index) => `
            <div class="goal-template-card" data-template-index="${index}">
                <div class="template-icon">${template.icon}</div>
                <div class="template-info">
                    <h4>${template.title}</h4>
                    <span class="template-category">${template.category}</span>
                    <p>${template.description}</p>
                    <div class="template-subgoals-preview">
                        ${template.subGoals.slice(0, 3).map(sg => `<span>• ${sg}</span>`).join('')}
                        ${template.subGoals.length > 3 ? `<span class="more">+${template.subGoals.length - 3} more</span>` : ''}
                    </div>
                </div>
                <button class="btn-small btn-primary use-template-btn">Use Template</button>
            </div>
        `).join('');
        
        // Add click handlers
        grid.querySelectorAll('.use-template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.goal-template-card');
                const index = parseInt(card.dataset.templateIndex);
                this.applyGoalTemplate(templates[index]);
            });
        });
        
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
    
    /**
     * Hide goal templates modal
     */
    hideGoalTemplates() {
        const modal = document.getElementById('goal-templates-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }
    
    /**
     * Apply a goal template
     */
    async applyGoalTemplate(template) {
        try {
            const newGoal = {
                year: this.currentYear,
                category: template.category,
                title: template.title,
                sub_goals: template.subGoals.map(text => ({ text, completed: false })),
                progress: 0
            };
            
            const created = await dataService.createAnnualGoal(newGoal);
            this.goals.push(created);
            this.renderGoals();
            this.hideGoalTemplates();
            
            // Show success feedback
            if (window.showToast) {
                window.showToast(`Goal "${template.title}" created with ${template.subGoals.length} sub-goals!`, 'success');
            }
        } catch (error) {
            console.error('Failed to apply goal template:', error);
            this.showError('Failed to create goal. Please try again.');
        }
    }
    
    /**
     * Get current reading filter value
     */
    getReadingFilter() {
        return document.getElementById('reading-filter')?.value || 'all';
    }
    
    /**
     * Get current reading sort value
     */
    getReadingSort() {
        return document.getElementById('reading-sort')?.value || 'order';
    }

    /**
     * Change year
     */
    async changeYear(delta) {
        this.currentYear += delta;
        document.getElementById('current-year').textContent = this.currentYear;
        this.updateBreadcrumb();
        await this.loadData();
    }

    /**
     * Go to current year (This Year button)
     */
    async goToCurrentYear() {
        this.currentYear = new Date().getFullYear();
        document.getElementById('current-year').textContent = this.currentYear;
        this.updateBreadcrumb();
        await this.loadData();
    }
    
    /**
     * Update breadcrumb context
     */
    updateBreadcrumb() {
        const breadcrumbContext = document.getElementById('breadcrumb-context');
        if (breadcrumbContext) {
            breadcrumbContext.textContent = `${this.currentYear}`;
        }
    }
    
    /**
     * Get milestone info based on progress percentage
     */
    getMilestone(progress) {
        if (progress >= 100) {
            return { icon: '🏆', label: 'Complete!', class: 'milestone-complete' };
        } else if (progress >= 75) {
            return { icon: '🔥', label: 'Almost there!', class: 'milestone-75' };
        } else if (progress >= 50) {
            return { icon: '⭐', label: 'Halfway!', class: 'milestone-50' };
        } else if (progress >= 25) {
            return { icon: '🚀', label: 'Good start!', class: 'milestone-25' };
        }
        return null;
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
        
        // Add milestone badge if applicable
        const milestoneEl = card.querySelector('.goal-milestone');
        if (milestoneEl) {
            const milestone = this.getMilestone(progress);
            if (milestone) {
                milestoneEl.innerHTML = `<span class="milestone-badge ${milestone.class}">${milestone.icon} ${milestone.label}</span>`;
                milestoneEl.style.display = 'block';
            } else {
                milestoneEl.style.display = 'none';
            }
        }
        
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
        
        // AI suggest habits button
        const aiBtn = card.querySelector('.ai-suggest-habits-btn');
        if (aiBtn) {
            aiBtn.addEventListener('click', () => this.showAISuggestHabits(goal));
        }
        
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
        
        const filter = this.getReadingFilter();
        const sort = this.getReadingSort();
        
        // Start with actual books
        let books = [...this.readingList];
        
        // Apply filter
        if (filter !== 'all') {
            books = books.filter(book => {
                if (!book.book_title) return false;
                switch (filter) {
                    case 'completed':
                        return book.completed;
                    case 'reading':
                        return !book.completed && book.current_page > 0;
                    case 'unread':
                        return !book.completed && (!book.current_page || book.current_page === 0);
                    case 'rating-5':
                        return book.rating === 5;
                    case 'rating-4':
                        return book.rating >= 4;
                    case 'rating-3':
                        return book.rating >= 3;
                    default:
                        return true;
                }
            });
        }
        
        // Apply sort
        if (sort !== 'order') {
            books.sort((a, b) => {
                switch (sort) {
                    case 'title':
                        return (a.book_title || '').localeCompare(b.book_title || '');
                    case 'rating-desc':
                        return (b.rating || 0) - (a.rating || 0);
                    case 'rating-asc':
                        return (a.rating || 0) - (b.rating || 0);
                    case 'progress':
                        const progressA = a.total_pages ? (a.current_page || 0) / a.total_pages : 0;
                        const progressB = b.total_pages ? (b.current_page || 0) / b.total_pages : 0;
                        return progressB - progressA;
                    default:
                        return (a.order_index || 0) - (b.order_index || 0);
                }
            });
        }
        
        // If showing all and not sorted, add empty slots
        if (filter === 'all' && sort === 'order') {
            while (books.length < 50) {
                books.push({ book_title: '', author: '', completed: false, rating: 0, order_index: books.length });
            }
        }
        
        books.forEach((book, index) => {
            const displayNumber = filter === 'all' && sort === 'order' ? index + 1 : (book.order_index || 0) + 1;
            const bookEntry = this.createBookEntry(book, displayNumber);
            container.appendChild(bookEntry);
        });
        
        // Update stats
        const completedCount = this.readingList.filter(b => b.completed).length;
        document.getElementById('books-completed').textContent = completedCount;
        
        // Calculate total pages read
        const totalPagesRead = this.readingList.reduce((sum, book) => sum + (book.current_page || 0), 0);
        const pagesReadEl = document.getElementById('pages-read');
        if (pagesReadEl) {
            pagesReadEl.textContent = totalPagesRead.toLocaleString();
        }
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
        const currentPageInput = entry.querySelector('.book-current-page');
        const totalPagesInput = entry.querySelector('.book-total-pages');
        const progressFill = entry.querySelector('.book-progress-fill');
        
        titleInput.value = book.book_title || '';
        authorInput.value = book.author || '';
        completedCheckbox.checked = book.completed || false;
        currentPageInput.value = book.current_page || '';
        totalPagesInput.value = book.total_pages || '';
        
        // Update progress bar
        this.updateBookProgressBar(progressFill, book.current_page, book.total_pages);
        
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
            if (book.id || titleInput.value.trim()) {
                this.updateBook(book.id || number, { 
                    book_title: titleInput.value.trim() || book.book_title,
                    author: authorInput.value.trim(), 
                    order_index: number - 1 
                });
            }
        });
        
        // Page progress event listeners
        currentPageInput.addEventListener('blur', () => {
            if (book.id || titleInput.value.trim()) {
                const currentPage = parseInt(currentPageInput.value) || 0;
                const totalPages = parseInt(totalPagesInput.value) || 0;
                
                // Auto-complete if current page equals total pages
                const shouldComplete = totalPages > 0 && currentPage >= totalPages;
                
                this.updateBook(book.id || number, { 
                    book_title: titleInput.value.trim() || book.book_title,
                    current_page: currentPage,
                    completed: shouldComplete || completedCheckbox.checked,
                    order_index: number - 1 
                });
                
                this.updateBookProgressBar(progressFill, currentPage, totalPages);
                
                if (shouldComplete && !completedCheckbox.checked) {
                    completedCheckbox.checked = true;
                }
            }
        });
        
        totalPagesInput.addEventListener('blur', () => {
            if (book.id || titleInput.value.trim()) {
                const totalPages = parseInt(totalPagesInput.value) || 0;
                const currentPage = parseInt(currentPageInput.value) || 0;
                
                this.updateBook(book.id || number, { 
                    book_title: titleInput.value.trim() || book.book_title,
                    total_pages: totalPages,
                    order_index: number - 1 
                });
                
                this.updateBookProgressBar(progressFill, currentPage, totalPages);
            }
        });
        
        completedCheckbox.addEventListener('change', () => {
            if (book.id || titleInput.value.trim()) {
                const updates = { 
                    book_title: titleInput.value.trim() || book.book_title,
                    completed: completedCheckbox.checked, 
                    order_index: number - 1 
                };
                
                // If marking complete and has total pages, set current to total
                if (completedCheckbox.checked && totalPagesInput.value) {
                    updates.current_page = parseInt(totalPagesInput.value);
                    currentPageInput.value = totalPagesInput.value;
                    this.updateBookProgressBar(progressFill, updates.current_page, parseInt(totalPagesInput.value));
                }
                
                this.updateBook(book.id || number, updates);
            }
        });
        
        entry.querySelector('.delete-book-btn').addEventListener('click', () => {
            this.deleteBook(book.id);
        });
        
        return entry;
    }
    
    /**
     * Update book progress bar
     */
    updateBookProgressBar(progressFill, currentPage, totalPages) {
        if (!progressFill) return;
        
        if (totalPages && totalPages > 0) {
            const percentage = Math.min(100, Math.round((currentPage || 0) / totalPages * 100));
            progressFill.style.width = `${percentage}%`;
            
            // Color based on progress
            if (percentage >= 100) {
                progressFill.style.background = 'var(--success-color, #10b981)';
            } else if (percentage >= 50) {
                progressFill.style.background = 'var(--accent-primary)';
            } else {
                progressFill.style.background = 'var(--accent-tertiary)';
            }
        } else {
            progressFill.style.width = '0%';
        }
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
    
    /**
     * Show AI suggest habits modal
     */
    async showAISuggestHabits(goal) {
        if (!goal.title || goal.title.trim() === '') {
            if (window.showToast) {
                window.showToast('Please enter a goal title first', 'error');
            } else {
                alert('Please enter a goal title first');
            }
            return;
        }
        
        // Check if AI is available
        if (!aiService.isAvailable()) {
            if (window.Toast) {
                window.Toast.error('AI not configured. Set up your API key in Settings > AI Settings');
            } else {
                alert('AI not configured. Please set up your API key in Settings > AI Settings');
            }
            return;
        }
        
        // Show loading modal
        const modal = document.createElement('div');
        modal.className = 'modal ai-suggestions-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-medium">
                <div class="modal-header">
                    <h3>✨ AI Habit Suggestions</h3>
                    <button class="modal-close-btn" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="ai-loading">
                        <div class="ai-loading-spinner"></div>
                        <p>Analyzing your goal and generating habit suggestions...</p>
                        <p class="ai-goal-context">Goal: <strong>${goal.title}</strong></p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close function
        const closeModal = () => modal.remove();
        
        // Event delegation for close buttons
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
            if (e.target.classList.contains('modal-close-btn') || e.target.classList.contains('ai-cancel-btn')) {
                closeModal();
            }
        });
        
        try {
            // Call AI service
            const suggestions = await aiService.suggestHabitsForGoal(goal.title);
            
            if (!suggestions || suggestions.length === 0) {
                modal.querySelector('.modal-body').innerHTML = `
                    <div class="ai-error">
                        <p>😕 Couldn't generate suggestions. Please try again.</p>
                        <button class="btn-secondary ai-cancel-btn">Close</button>
                    </div>
                `;
                return;
            }
            
            // Show suggestions
            modal.querySelector('.modal-body').innerHTML = `
                <p class="ai-intro">Based on your goal "<strong>${goal.title}</strong>", here are suggested daily habits:</p>
                <div class="ai-suggestions-list">
                    ${suggestions.map((s, i) => `
                        <div class="ai-suggestion-item" data-index="${i}">
                            <div class="suggestion-checkbox">
                                <input type="checkbox" id="suggestion-${i}" checked />
                            </div>
                            <div class="suggestion-content">
                                <label for="suggestion-${i}" class="suggestion-name">${s.name}</label>
                                <p class="suggestion-reason">${s.reason}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="ai-actions">
                    <button class="btn-secondary ai-cancel-btn">Cancel</button>
                    <button class="btn-primary ai-add-habits-btn">Add Selected Habits</button>
                </div>
            `;
            
            // Add habits button
            modal.querySelector('.ai-add-habits-btn').addEventListener('click', async () => {
                const selectedHabits = [];
                modal.querySelectorAll('.ai-suggestion-item').forEach((item, i) => {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    if (checkbox.checked) {
                        selectedHabits.push(suggestions[i]);
                    }
                });
                
                if (selectedHabits.length === 0) {
                    if (window.showToast) {
                        window.showToast('Please select at least one habit', 'error');
                    }
                    return;
                }
                
                // Add habits to daily habits
                try {
                    for (const habit of selectedHabits) {
                        await dataService.createDailyHabit({
                            habit_name: habit.name,
                            linked_goal_id: goal.id
                        });
                    }
                    
                    closeModal();
                    
                    if (window.showToast) {
                        window.showToast(`Added ${selectedHabits.length} habit${selectedHabits.length > 1 ? 's' : ''} linked to your goal!`, 'success');
                    }
                } catch (error) {
                    console.error('Failed to add habits:', error);
                    if (window.showToast) {
                        window.showToast('Failed to add habits. Please try again.', 'error');
                    }
                }
            });
            
        } catch (error) {
            console.error('AI suggestion failed:', error);
            modal.querySelector('.modal-body').innerHTML = `
                <div class="ai-error">
                    <p>😕 ${error.message || 'Failed to get suggestions. Please try again.'}</p>
                    <button class="btn-secondary ai-cancel-btn">Close</button>
                </div>
            `;
        }
    }
}

export default AnnualView;
