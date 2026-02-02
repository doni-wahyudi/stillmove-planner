/**
 * Kanban View Controller
 * Handles the Kanban board interface with boards, columns, cards, and backlog
 * 
 * Requirements: 12.2, 12.4 - Display board list or last viewed board, remember last viewed board
 */

import dataService from '../js/data-service.js';
import kanbanService from '../js/kanban-service.js';
import analyticsPanel from '../js/analytics-panel.js';

// LocalStorage key for persisting last viewed board
const LAST_VIEWED_BOARD_KEY = 'kanban_last_viewed_board';
const BACKLOG_EXPANDED_KEY = 'kanban_backlog_expanded';

/**
 * DragDropHandler - Handles drag-and-drop operations for Kanban board
 * Implements card dragging between columns, within columns, to/from backlog,
 * and column reordering.
 * 
 * Requirements: 2.4, 3.2, 3.3, 11.3, 11.4
 */
class DragDropHandler {
    constructor(kanbanView) {
        this.view = kanbanView;
        this.draggedCard = null;
        this.draggedColumn = null;
        this.dragType = null; // 'card' or 'column'
        this.placeholder = null;
        this.sourceColumnId = null;
        this.sourceIsBacklog = false;
        this.touchStartY = 0;
        this.touchStartX = 0;
        this.touchElement = null;
        this.touchClone = null;
        this.scrollInterval = null;
    }

    /**
     * Initialize drag listeners on the container
     * @param {HTMLElement} container - The container element
     */
    initDragListeners(container) {
        if (!container) return;

        // Use event delegation for drag events
        container.addEventListener('dragstart', (e) => this._handleDragStart(e));
        container.addEventListener('dragover', (e) => this._handleDragOver(e));
        container.addEventListener('dragenter', (e) => this._handleDragEnter(e));
        container.addEventListener('dragleave', (e) => this._handleDragLeave(e));
        container.addEventListener('drop', (e) => this._handleDrop(e));
        container.addEventListener('dragend', (e) => this._handleDragEnd(e));

        // Initialize touch listeners for mobile support
        this.initTouchListeners(container);
    }

    /**
     * Handle drag start event
     * @param {DragEvent} event - The drag event
     */
    _handleDragStart(event) {
        const cardEl = event.target.closest('.kanban-card');
        const columnEl = event.target.closest('.kanban-column');
        const columnHeader = event.target.closest('.column-header');

        // Check if dragging a card
        if (cardEl && !columnHeader) {
            this.dragType = 'card';
            this.draggedCard = cardEl;
            this.sourceColumnId = cardEl.closest('.kanban-column')?.dataset.columnId || null;
            this.sourceIsBacklog = cardEl.closest('#backlog-cards') !== null;

            // Set drag data
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', cardEl.dataset.cardId);
            event.dataTransfer.setData('application/x-kanban-card', JSON.stringify({
                cardId: cardEl.dataset.cardId,
                sourceColumnId: this.sourceColumnId,
                isBacklog: this.sourceIsBacklog
            }));

            // Add dragging class after a small delay to prevent visual glitch
            requestAnimationFrame(() => {
                cardEl.classList.add('dragging');
                // Add is-dragging to container to prevent text selection
                document.querySelector('.kanban-view')?.classList.add('is-dragging');
            });

            // Create placeholder
            this.createPlaceholder('card');
        }
        // Check if dragging a column (by its header)
        else if (columnHeader && columnEl) {
            this.dragType = 'column';
            this.draggedColumn = columnEl;

            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', columnEl.dataset.columnId);
            event.dataTransfer.setData('application/x-kanban-column', columnEl.dataset.columnId);

            requestAnimationFrame(() => {
                columnEl.classList.add('dragging');
                // Add is-dragging to container to prevent text selection
                document.querySelector('.kanban-view')?.classList.add('is-dragging');
            });

            // Create placeholder for column
            this.createPlaceholder('column');
        }
    }

    /**
     * Handle drag over event
     * @param {DragEvent} event - The drag event
     */
    _handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        if (this.dragType === 'card') {
            this._handleCardDragOver(event);
        } else if (this.dragType === 'column') {
            this._handleColumnDragOver(event);
        }
    }

    /**
     * Handle card drag over - position placeholder
     * @param {DragEvent} event - The drag event
     */
    _handleCardDragOver(event) {
        const columnEl = event.target.closest('.kanban-column');
        const backlogCards = event.target.closest('#backlog-cards');
        const cardsContainer = columnEl?.querySelector('.column-cards') || backlogCards;

        if (!cardsContainer || !this.placeholder) return;

        // Calculate drop position
        const position = this.calculateDropPosition(event, cardsContainer);

        // Move placeholder to the calculated position
        const cards = Array.from(cardsContainer.querySelectorAll('.kanban-card:not(.dragging):not(.drag-placeholder)'));

        if (position >= cards.length) {
            cardsContainer.appendChild(this.placeholder);
        } else if (cards[position]) {
            cardsContainer.insertBefore(this.placeholder, cards[position]);
        } else {
            cardsContainer.appendChild(this.placeholder);
        }
    }

    /**
     * Handle column drag over - position placeholder
     * @param {DragEvent} event - The drag event
     */
    _handleColumnDragOver(event) {
        const columnsContainer = document.getElementById('columns-container');
        if (!columnsContainer || !this.placeholder) return;

        const columnEl = event.target.closest('.kanban-column');
        if (!columnEl || columnEl === this.draggedColumn) return;

        // Calculate position based on mouse X position
        const columns = Array.from(columnsContainer.querySelectorAll('.kanban-column:not(.dragging):not(.drag-placeholder)'));
        const mouseX = event.clientX;

        let insertBefore = null;
        for (const col of columns) {
            const rect = col.getBoundingClientRect();
            const midX = rect.left + rect.width / 2;
            if (mouseX < midX) {
                insertBefore = col;
                break;
            }
        }

        if (insertBefore) {
            columnsContainer.insertBefore(this.placeholder, insertBefore);
        } else {
            // Insert before the add-column-placeholder
            const addColumnPlaceholder = document.getElementById('add-column-placeholder');
            if (addColumnPlaceholder) {
                columnsContainer.insertBefore(this.placeholder, addColumnPlaceholder);
            } else {
                columnsContainer.appendChild(this.placeholder);
            }
        }
    }

    /**
     * Handle drag enter event
     * @param {DragEvent} event - The drag event
     */
    _handleDragEnter(event) {
        event.preventDefault();

        const columnEl = event.target.closest('.kanban-column');
        const backlogPanel = event.target.closest('#backlog-panel');

        if (this.dragType === 'card') {
            // Highlight valid drop targets
            if (columnEl && !columnEl.classList.contains('dragging')) {
                columnEl.classList.add('drag-over');
            }
            if (backlogPanel) {
                backlogPanel.classList.add('drag-over');
            }
        }
    }

    /**
     * Handle drag leave event
     * @param {DragEvent} event - The drag event
     */
    _handleDragLeave(event) {
        const columnEl = event.target.closest('.kanban-column');
        const backlogPanel = event.target.closest('#backlog-panel');

        // Only remove highlight if actually leaving the element
        if (columnEl && !columnEl.contains(event.relatedTarget)) {
            columnEl.classList.remove('drag-over');
        }
        if (backlogPanel && !backlogPanel.contains(event.relatedTarget)) {
            backlogPanel.classList.remove('drag-over');
        }
    }

    /**
     * Handle drop event
     * @param {DragEvent} event - The drag event
     */
    async _handleDrop(event) {
        event.preventDefault();

        // Remove all drag-over highlights
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

        if (this.dragType === 'card') {
            await this._handleCardDrop(event);
        } else if (this.dragType === 'column') {
            await this._handleColumnDrop(event);
        }

        this._cleanup();
    }

    /**
     * Handle card drop
     * Requirements: 3.2, 3.3, 11.3, 11.4, 4.4
     * @param {DragEvent} event - The drag event
     */
    async _handleCardDrop(event) {
        const columnEl = event.target.closest('.kanban-column');
        const backlogCards = event.target.closest('#backlog-cards');
        const backlogPanel = event.target.closest('#backlog-panel');

        if (!this.draggedCard) return;

        const cardId = this.draggedCard.dataset.cardId;

        try {
            // Dropping on backlog
            // Requirement 11.4: Drag card from column to backlog
            if (backlogPanel || backlogCards) {
                if (!this.sourceIsBacklog) {
                    await kanbanService.moveCardToBacklog(cardId);
                    this.view.showSuccess('Card moved to backlog');
                } else {
                    // Reordering within backlog
                    const position = this._getPlaceholderPosition(backlogCards || document.getElementById('backlog-cards'));
                    await this._reorderBacklog(cardId, position);
                }
            }
            // Dropping on a column
            // Requirement 3.2: Card movement between columns via drag-and-drop
            // Requirement 3.3: Card movement within a column via drag-and-drop
            // Requirement 11.3: Drag card from backlog to column
            else if (columnEl) {
                const targetColumnId = columnEl.dataset.columnId;
                const cardsContainer = columnEl.querySelector('.column-cards');
                const position = this._getPlaceholderPosition(cardsContainer);

                // Check if moving to a different column or reordering within same column
                if (this.sourceIsBacklog) {
                    // Moving from backlog to column
                    await kanbanService.moveCardFromBacklog(cardId, targetColumnId, position);
                    this.view.showSuccess('Card moved from backlog');
                } else if (targetColumnId !== this.sourceColumnId) {
                    // Moving between columns
                    await kanbanService.moveCard(cardId, targetColumnId, position);
                } else {
                    // Reordering within the same column
                    await kanbanService.moveCard(cardId, targetColumnId, position);
                }

                // Requirement 4.4: Prompt to update goal's progress when card moved to Done
                // Check if card is linked to a goal and target column is "Done"
                await this._checkGoalProgressPrompt(cardId, targetColumnId);
            }

            // Reload board to reflect changes
            await this.view.loadBoard(this.view.currentBoardId);
        } catch (error) {
            console.error('Failed to move card:', error);
            this.view.showError('Failed to move card. Please try again.');
            // Reload to restore original state
            await this.view.loadBoard(this.view.currentBoardId);
        }
    }

    /**
     * Check if goal progress prompt should be shown
     * Requirement 4.4: Optionally prompt to update goal's progress when card moved to Done
     * @param {string} cardId - Card ID
     * @param {string} targetColumnId - Target column ID
     */
    async _checkGoalProgressPrompt(cardId, targetColumnId) {
        // Find the card data
        const card = this.view.currentBoard?.cards?.find(c => c.id === cardId);
        if (!card || !card.linked_goal_id) return;

        // Find the target column
        const targetColumn = this.view.currentBoard?.columns?.find(c => c.id === targetColumnId);
        if (!targetColumn) return;

        // Check if target column is "Done" (case-insensitive)
        const isDoneColumn = targetColumn.title.toLowerCase() === 'done';
        if (!isDoneColumn) return;

        // Show goal progress prompt
        await this.view.showGoalProgressPrompt(card.linked_goal_id);
    }

    /**
     * Handle column drop
     * Requirement 2.4: Column reordering via drag-and-drop updates order indices
     * @param {DragEvent} event - The drag event
     */
    async _handleColumnDrop(event) {
        if (!this.draggedColumn) return;

        const columnsContainer = document.getElementById('columns-container');
        if (!columnsContainer) return;

        try {
            // Get new column order from DOM
            const columns = Array.from(columnsContainer.querySelectorAll('.kanban-column:not(.drag-placeholder)'));
            const columnOrder = columns.map(col => col.dataset.columnId).filter(id => id);

            // Update column order via service
            await kanbanService.reorderColumns(this.view.currentBoardId, columnOrder);

            // Reload board to reflect changes
            await this.view.loadBoard(this.view.currentBoardId);
        } catch (error) {
            console.error('Failed to reorder columns:', error);
            this.view.showError('Failed to reorder columns. Please try again.');
            // Reload to restore original state
            await this.view.loadBoard(this.view.currentBoardId);
        }
    }

    /**
     * Handle drag end event
     * @param {DragEvent} event - The drag event
     */
    _handleDragEnd(event) {
        this._cleanup();
    }

    /**
     * Reorder cards within backlog
     * @param {string} cardId - Card ID being moved
     * @param {number} position - Target position
     */
    async _reorderBacklog(cardId, position) {
        const backlog = await kanbanService.getBacklog(this.view.currentBoardId);
        const cardOrder = backlog.map(c => c.id);

        // Remove card from current position
        const currentIndex = cardOrder.indexOf(cardId);
        if (currentIndex > -1) {
            cardOrder.splice(currentIndex, 1);
        }

        // Insert at new position
        cardOrder.splice(position, 0, cardId);

        await kanbanService.reorderBacklog(this.view.currentBoardId, cardOrder);
    }

    /**
     * Get the position of the placeholder in its container
     * @param {HTMLElement} container - The container element
     * @returns {number} Position index
     */
    _getPlaceholderPosition(container) {
        if (!container || !this.placeholder) return 0;

        const cards = Array.from(container.querySelectorAll('.kanban-card:not(.dragging), .drag-placeholder'));
        const placeholderIndex = cards.indexOf(this.placeholder);

        return placeholderIndex >= 0 ? placeholderIndex : 0;
    }

    /**
     * Create a placeholder element for visual feedback
     * @param {string} type - 'card' or 'column'
     */
    createPlaceholder(type) {
        this.removePlaceholder();

        this.placeholder = document.createElement('div');
        this.placeholder.className = `drag-placeholder drag-placeholder-${type}`;

        if (type === 'card') {
            this.placeholder.style.height = this.draggedCard ?
                `${this.draggedCard.offsetHeight}px` : '60px';
            this.placeholder.style.margin = '8px 0';
        } else if (type === 'column') {
            this.placeholder.style.width = this.draggedColumn ?
                `${this.draggedColumn.offsetWidth}px` : '280px';
            this.placeholder.style.minHeight = '200px';
        }
    }

    /**
     * Remove the placeholder element
     */
    removePlaceholder() {
        if (this.placeholder && this.placeholder.parentNode) {
            this.placeholder.parentNode.removeChild(this.placeholder);
        }
        this.placeholder = null;
    }

    /**
     * Calculate drop position based on mouse position
     * @param {DragEvent} event - The drag event
     * @param {HTMLElement} container - The container element
     * @returns {number} Position index
     */
    calculateDropPosition(event, container) {
        if (!container) return 0;

        const cards = Array.from(container.querySelectorAll('.kanban-card:not(.dragging):not(.drag-placeholder)'));

        if (cards.length === 0) return 0;

        const mouseY = event.clientY;

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const rect = card.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            if (mouseY < midY) {
                return i;
            }
        }

        return cards.length;
    }

    /**
     * Cleanup after drag operation
     */
    _cleanup() {
        // Remove dragging class from elements
        if (this.draggedCard) {
            this.draggedCard.classList.remove('dragging');
        }
        if (this.draggedColumn) {
            this.draggedColumn.classList.remove('dragging');
        }

        // Remove all drag-over highlights
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

        // Remove is-dragging class from container
        document.querySelector('.kanban-view')?.classList.remove('is-dragging');

        // Remove placeholder
        this.removePlaceholder();

        // Reset state
        this.draggedCard = null;
        this.draggedColumn = null;
        this.dragType = null;
        this.sourceColumnId = null;
        this.sourceIsBacklog = false;

        // Clear any scroll interval
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
            this.scrollInterval = null;
        }
    }

    // ==================== TOUCH SUPPORT FOR MOBILE ====================

    /**
     * Initialize touch listeners for mobile drag-and-drop
     * @param {HTMLElement} container - The container element
     */
    initTouchListeners(container) {
        if (!container) return;

        container.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        container.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        container.addEventListener('touchend', (e) => this.onTouchEnd(e));
        container.addEventListener('touchcancel', (e) => this.onTouchEnd(e));
    }

    /**
     * Handle touch start event
     * @param {TouchEvent} event - The touch event
     */
    onTouchStart(event) {
        const touch = event.touches[0];
        const cardEl = event.target.closest('.kanban-card');
        const columnHeader = event.target.closest('.column-header');
        const columnEl = event.target.closest('.kanban-column');

        // Only handle long press for drag (to distinguish from scroll)
        // For now, we'll use a simple approach - drag starts immediately on card touch
        if (cardEl && !columnHeader) {
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchElement = cardEl;
            this.dragType = 'card';
            this.sourceColumnId = cardEl.closest('.kanban-column')?.dataset.columnId || null;
            this.sourceIsBacklog = cardEl.closest('#backlog-cards') !== null;

            // Create visual clone for dragging
            this._createTouchClone(cardEl, touch);

            // Create placeholder
            this.createPlaceholder('card');

            // Add dragging class
            cardEl.classList.add('dragging');
            this.draggedCard = cardEl;

            // Add is-dragging to container to prevent text selection
            document.querySelector('.kanban-view')?.classList.add('is-dragging');

            event.preventDefault();
        } else if (columnHeader && columnEl) {
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchElement = columnEl;
            this.dragType = 'column';

            this._createTouchClone(columnEl, touch);
            this.createPlaceholder('column');
            columnEl.classList.add('dragging');
            this.draggedColumn = columnEl;

            // Add is-dragging to container to prevent text selection
            document.querySelector('.kanban-view')?.classList.add('is-dragging');

            event.preventDefault();
        }
    }

    /**
     * Handle touch move event
     * @param {TouchEvent} event - The touch event
     */
    onTouchMove(event) {
        if (!this.touchElement || !this.touchClone) return;

        const touch = event.touches[0];

        // Move the clone
        this.touchClone.style.left = `${touch.clientX - this.touchClone.offsetWidth / 2}px`;
        this.touchClone.style.top = `${touch.clientY - this.touchClone.offsetHeight / 2}px`;

        // Find element under touch point (excluding the clone)
        this.touchClone.style.pointerEvents = 'none';
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        this.touchClone.style.pointerEvents = '';

        if (this.dragType === 'card') {
            this._handleTouchCardMove(elementBelow, touch);
        } else if (this.dragType === 'column') {
            this._handleTouchColumnMove(elementBelow, touch);
        }

        // Auto-scroll when near edges
        this._handleAutoScroll(touch);

        event.preventDefault();
    }

    /**
     * Handle touch card movement
     * @param {HTMLElement} elementBelow - Element under touch point
     * @param {Touch} touch - Touch object
     */
    _handleTouchCardMove(elementBelow, touch) {
        const columnEl = elementBelow?.closest('.kanban-column');
        const backlogCards = elementBelow?.closest('#backlog-cards');
        const backlogPanel = elementBelow?.closest('#backlog-panel');
        const cardsContainer = columnEl?.querySelector('.column-cards') || backlogCards;

        // Update drag-over highlights
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        if (columnEl) columnEl.classList.add('drag-over');
        if (backlogPanel) backlogPanel.classList.add('drag-over');

        if (!cardsContainer || !this.placeholder) return;

        // Calculate and update placeholder position
        const position = this._calculateTouchDropPosition(touch, cardsContainer);
        const cards = Array.from(cardsContainer.querySelectorAll('.kanban-card:not(.dragging):not(.drag-placeholder)'));

        if (position >= cards.length) {
            cardsContainer.appendChild(this.placeholder);
        } else if (cards[position]) {
            cardsContainer.insertBefore(this.placeholder, cards[position]);
        }
    }

    /**
     * Handle touch column movement
     * @param {HTMLElement} elementBelow - Element under touch point
     * @param {Touch} touch - Touch object
     */
    _handleTouchColumnMove(elementBelow, touch) {
        const columnsContainer = document.getElementById('columns-container');
        if (!columnsContainer || !this.placeholder) return;

        const columns = Array.from(columnsContainer.querySelectorAll('.kanban-column:not(.dragging):not(.drag-placeholder)'));

        let insertBefore = null;
        for (const col of columns) {
            const rect = col.getBoundingClientRect();
            const midX = rect.left + rect.width / 2;
            if (touch.clientX < midX) {
                insertBefore = col;
                break;
            }
        }

        if (insertBefore) {
            columnsContainer.insertBefore(this.placeholder, insertBefore);
        } else {
            const addColumnPlaceholder = document.getElementById('add-column-placeholder');
            if (addColumnPlaceholder) {
                columnsContainer.insertBefore(this.placeholder, addColumnPlaceholder);
            }
        }
    }

    /**
     * Calculate drop position for touch events
     * @param {Touch} touch - Touch object
     * @param {HTMLElement} container - Container element
     * @returns {number} Position index
     */
    _calculateTouchDropPosition(touch, container) {
        if (!container) return 0;

        const cards = Array.from(container.querySelectorAll('.kanban-card:not(.dragging):not(.drag-placeholder)'));

        if (cards.length === 0) return 0;

        for (let i = 0; i < cards.length; i++) {
            const rect = cards[i].getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            if (touch.clientY < midY) {
                return i;
            }
        }

        return cards.length;
    }

    /**
     * Handle touch end event
     * @param {TouchEvent} event - The touch event
     */
    async onTouchEnd(event) {
        if (!this.touchElement) return;

        // Get the last touch position
        const touch = event.changedTouches[0];

        // Find drop target
        if (this.touchClone) {
            this.touchClone.style.pointerEvents = 'none';
        }
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);

        try {
            if (this.dragType === 'card') {
                await this._handleTouchCardDrop(elementBelow);
            } else if (this.dragType === 'column') {
                await this._handleTouchColumnDrop();
            }
        } catch (error) {
            console.error('Touch drop failed:', error);
            this.view.showError('Failed to move item. Please try again.');
        }

        this._cleanupTouch();
    }

    /**
     * Handle touch card drop
     * Requirement 4.4: Optionally prompt to update goal's progress when card moved to Done
     * @param {HTMLElement} elementBelow - Element under touch point
     */
    async _handleTouchCardDrop(elementBelow) {
        if (!this.draggedCard) return;

        const cardId = this.draggedCard.dataset.cardId;
        const columnEl = elementBelow?.closest('.kanban-column');
        const backlogPanel = elementBelow?.closest('#backlog-panel');
        const backlogCards = elementBelow?.closest('#backlog-cards');

        if (backlogPanel || backlogCards) {
            if (!this.sourceIsBacklog) {
                await kanbanService.moveCardToBacklog(cardId);
                this.view.showSuccess('Card moved to backlog');
            } else {
                const container = backlogCards || document.getElementById('backlog-cards');
                const position = this._getPlaceholderPosition(container);
                await this._reorderBacklog(cardId, position);
            }
        } else if (columnEl) {
            const targetColumnId = columnEl.dataset.columnId;
            const cardsContainer = columnEl.querySelector('.column-cards');
            const position = this._getPlaceholderPosition(cardsContainer);

            if (this.sourceIsBacklog) {
                await kanbanService.moveCardFromBacklog(cardId, targetColumnId, position);
                this.view.showSuccess('Card moved from backlog');
            } else {
                await kanbanService.moveCard(cardId, targetColumnId, position);
            }

            // Requirement 4.4: Prompt to update goal's progress when card moved to Done
            await this._checkGoalProgressPrompt(cardId, targetColumnId);
        }

        await this.view.loadBoard(this.view.currentBoardId);
    }

    /**
     * Handle touch column drop
     */
    async _handleTouchColumnDrop() {
        const columnsContainer = document.getElementById('columns-container');
        if (!columnsContainer) return;

        const columns = Array.from(columnsContainer.querySelectorAll('.kanban-column:not(.drag-placeholder)'));
        const columnOrder = columns.map(col => col.dataset.columnId).filter(id => id);

        await kanbanService.reorderColumns(this.view.currentBoardId, columnOrder);
        await this.view.loadBoard(this.view.currentBoardId);
    }

    /**
     * Create a visual clone for touch dragging
     * @param {HTMLElement} element - Element to clone
     * @param {Touch} touch - Touch object
     */
    _createTouchClone(element, touch) {
        this.touchClone = element.cloneNode(true);
        this.touchClone.classList.add('touch-drag-clone');
        this.touchClone.style.position = 'fixed';
        this.touchClone.style.zIndex = '10000';
        this.touchClone.style.pointerEvents = 'none';
        this.touchClone.style.opacity = '0.8';
        this.touchClone.style.transform = 'rotate(3deg) scale(1.05)';
        this.touchClone.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
        this.touchClone.style.width = `${element.offsetWidth}px`;
        this.touchClone.style.left = `${touch.clientX - element.offsetWidth / 2}px`;
        this.touchClone.style.top = `${touch.clientY - element.offsetHeight / 2}px`;

        document.body.appendChild(this.touchClone);
    }

    /**
     * Handle auto-scrolling when dragging near edges
     * @param {Touch} touch - Touch object
     */
    _handleAutoScroll(touch) {
        const scrollThreshold = 50;
        const scrollSpeed = 10;
        const columnsContainer = document.getElementById('columns-container');

        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
            this.scrollInterval = null;
        }

        if (!columnsContainer) return;

        const rect = columnsContainer.getBoundingClientRect();

        // Horizontal scrolling for columns container
        if (touch.clientX < rect.left + scrollThreshold) {
            this.scrollInterval = setInterval(() => {
                columnsContainer.scrollLeft -= scrollSpeed;
            }, 16);
        } else if (touch.clientX > rect.right - scrollThreshold) {
            this.scrollInterval = setInterval(() => {
                columnsContainer.scrollLeft += scrollSpeed;
            }, 16);
        }
    }

    /**
     * Cleanup after touch drag operation
     */
    _cleanupTouch() {
        // Remove touch clone
        if (this.touchClone && this.touchClone.parentNode) {
            this.touchClone.parentNode.removeChild(this.touchClone);
        }
        this.touchClone = null;
        this.touchElement = null;

        // Use standard cleanup
        this._cleanup();
    }
}

class KanbanView {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.currentBoardId = null;
        this.boards = [];
        this.currentBoard = null;
        this.dragState = null;
        this.filters = {};
        this.categories = [];
        this.annualGoals = [];
        this.container = null;
        this.isBacklogExpanded = true;
        this.dragDropHandler = null;
    }

    /**
     * Initialize the Kanban view
     * Requirement 12.2: Display board list or last viewed board when navigating to Kanban view
     * Requirement 12.4: Remember user's last viewed board and restore it on subsequent visits
     * Requirement 12.5: Deep-linking support for specific board or card
     * @param {HTMLElement} container - Container element for the view
     * @param {Object} [deepLinkParams] - Optional deep-link parameters
     * @param {string} [deepLinkParams.boardId] - Board ID to navigate to directly
     * @param {string} [deepLinkParams.cardId] - Card ID to highlight/open
     */
    async init(container, deepLinkParams = {}) {
        this.container = container;
        this.deepLinkParams = deepLinkParams;

        // Load the HTML template
        const response = await fetch('views/kanban-view.html');
        const html = await response.text();
        this.container.innerHTML = html;

        // Load backlog expanded state from localStorage
        this.isBacklogExpanded = this._getBacklogExpandedState();

        // Initialize drag-and-drop handler
        this.dragDropHandler = new DragDropHandler(this);
        this.dragDropHandler.initDragListeners(this.container);

        // Setup event listeners
        this.setupEventListeners();

        // Initialize keyboard navigation
        this.initKeyboardNavigation();

        // Initialize analytics panel
        await analyticsPanel.init();

        // Load boards and handle deep-linking
        await this.loadBoards();

        // Handle deep-link to specific card after board is loaded
        if (this.deepLinkParams.cardId && this.currentBoardId) {
            await this.handleDeepLinkCard(this.deepLinkParams.cardId);
        }
    }

    /**
     * Handle deep-link to a specific card
     * Requirement 12.5: Deep-linking support for specific board or card
     * @param {string} cardId - Card ID to highlight/open
     */
    async handleDeepLinkCard(cardId) {
        // Find the card element and highlight it
        const cardElement = this.container.querySelector(`[data-card-id="${cardId}"]`);
        if (cardElement) {
            // Scroll the card into view
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Add highlight effect
            cardElement.classList.add('deep-link-highlight');

            // Remove highlight after animation
            setTimeout(() => {
                cardElement.classList.remove('deep-link-highlight');
            }, 2000);

            // Optionally open the card modal
            const card = this.currentBoard?.cards?.find(c => c.id === cardId);
            if (card) {
                this.openCardModal(card);
            }
        }
    }

    /**
     * Setup event listeners for the view
     */
    setupEventListeners() {
        // Board selector
        const boardSelector = document.getElementById('board-selector');
        boardSelector?.addEventListener('change', (e) => this.onBoardSelect(e.target.value));

        // Board action buttons
        document.getElementById('new-board-btn')?.addEventListener('click', () => this.openBoardModal());
        document.getElementById('edit-board-btn')?.addEventListener('click', () => this.openBoardModal(this.currentBoard));
        document.getElementById('delete-board-btn')?.addEventListener('click', () => this.confirmDeleteBoard());
        document.getElementById('create-first-board-btn')?.addEventListener('click', () => this.openBoardModal());

        // Column and card buttons
        document.getElementById('add-column-btn')?.addEventListener('click', () => this.openColumnModal());
        document.getElementById('add-column-inline-btn')?.addEventListener('click', () => this.openColumnModal());
        document.getElementById('add-card-btn')?.addEventListener('click', () => this.openCardModal());

        // Filter panel
        document.getElementById('filter-toggle-btn')?.addEventListener('click', () => this.toggleFilterPanel());
        document.getElementById('clear-filters-btn')?.addEventListener('click', () => this.clearFilters());
        document.getElementById('search-input')?.addEventListener('input', (e) => this.onSearchInput(e.target.value));
        document.getElementById('priority-filter')?.addEventListener('change', (e) => this.onPriorityFilter(e.target.value));
        document.getElementById('label-filter')?.addEventListener('change', (e) => this.onLabelFilter(e.target.value));
        document.getElementById('due-date-filter')?.addEventListener('change', (e) => this.onDueDateFilter(e.target.value));

        // Backlog panel
        document.getElementById('toggle-backlog-btn')?.addEventListener('click', () => this.toggleBacklog());
        document.getElementById('add-backlog-card-btn')?.addEventListener('click', () => this.openCardModal(null, true));

        // Analytics panel toggle
        document.getElementById('analytics-toggle-btn')?.addEventListener('click', () => {
            if (this.currentBoardId) {
                analyticsPanel.open(this.currentBoardId);
            }
        });

        // Modal event listeners
        this.setupModalListeners();
    }

    /**
     * Setup modal event listeners
     */
    setupModalListeners() {
        // Board modal
        const boardModal = document.getElementById('board-modal');
        if (boardModal) {
            boardModal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => this.closeBoardModal());
            });
            boardModal.addEventListener('click', (e) => {
                if (e.target === boardModal) this.closeBoardModal();
            });
            document.getElementById('save-board-btn')?.addEventListener('click', () => this.saveBoard());
        }

        // Card modal
        const cardModal = document.getElementById('card-modal');
        if (cardModal) {
            cardModal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => this.closeCardModal());
            });
            cardModal.addEventListener('click', (e) => {
                if (e.target === cardModal) this.closeCardModal();
            });
            document.getElementById('save-card-btn')?.addEventListener('click', () => this.saveCard());
            document.getElementById('delete-card-btn')?.addEventListener('click', () => this.confirmDeleteCard());
        }

        // Column modal
        const columnModal = document.getElementById('column-modal');
        if (columnModal) {
            columnModal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => this.closeColumnModal());
            });
            columnModal.addEventListener('click', (e) => {
                if (e.target === columnModal) this.closeColumnModal();
            });
            document.getElementById('save-column-btn')?.addEventListener('click', () => this.saveColumn());
            document.getElementById('delete-column-btn')?.addEventListener('click', () => this.confirmDeleteColumn());
        }

        // Delete confirmation modal
        const deleteModal = document.getElementById('delete-confirm-modal');
        if (deleteModal) {
            deleteModal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => this.closeDeleteModal());
            });
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) this.closeDeleteModal();
            });
        }

        // Add label modal
        const addLabelModal = document.getElementById('add-label-modal');
        if (addLabelModal) {
            addLabelModal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => this.closeAddLabelModal());
            });
            addLabelModal.addEventListener('click', (e) => {
                if (e.target === addLabelModal) this.closeAddLabelModal();
            });
            document.getElementById('save-new-label-btn')?.addEventListener('click', () => this.saveNewLabel());
        }

        // Add label button in card modal
        document.getElementById('add-label-btn')?.addEventListener('click', () => this.openAddLabelModal());

        // Goal progress modal
        // Requirement 4.4: Optionally prompt to update goal's progress when card moved to Done
        const goalProgressModal = document.getElementById('goal-progress-modal');
        if (goalProgressModal) {
            goalProgressModal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => this.closeGoalProgressModal());
            });
            goalProgressModal.addEventListener('click', (e) => {
                if (e.target === goalProgressModal) this.closeGoalProgressModal();
            });
            document.getElementById('skip-goal-progress-btn')?.addEventListener('click', () => this.closeGoalProgressModal());
            document.getElementById('update-goal-progress-btn')?.addEventListener('click', () => this.updateGoalProgress());

            // Update displayed value when slider changes
            const progressInput = document.getElementById('goal-progress-input');
            const progressValue = document.getElementById('goal-progress-value');
            progressInput?.addEventListener('input', (e) => {
                if (progressValue) progressValue.textContent = e.target.value;
            });
        }
    }

    /**
     * Load all boards for the current user
     * Requirement 12.2: Display board list or last viewed board
     * Requirement 12.5: Deep-linking support for specific board
     */
    async loadBoards() {
        try {
            this.showLoading(true);

            // Load boards from service
            this.boards = await kanbanService.getBoards();

            // Load categories for board creation
            this.categories = await dataService.getCustomCategories();

            // Render board selector
            this.renderBoardSelector();

            // Priority for board selection:
            // 1. Deep-link board ID (from URL hash)
            // 2. Last viewed board ID (from localStorage)
            // 3. First board in list (most recently updated)
            const deepLinkBoardId = this.deepLinkParams?.boardId;
            const lastViewedBoardId = this._getLastViewedBoardId();

            let boardIdToLoad = null;

            if (deepLinkBoardId && this.boards.some(b => b.id === deepLinkBoardId)) {
                // Deep-link takes priority
                boardIdToLoad = deepLinkBoardId;
            } else if (lastViewedBoardId && this.boards.some(b => b.id === lastViewedBoardId)) {
                // Fall back to last viewed board
                boardIdToLoad = lastViewedBoardId;
            } else if (this.boards.length > 0) {
                // Fall back to first board (most recently updated)
                boardIdToLoad = this.boards[0].id;
            }

            if (boardIdToLoad) {
                await this.loadBoard(boardIdToLoad);
            } else {
                // Show empty state
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Failed to load boards:', error);
            this.showError('Failed to load boards. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Load a specific board with its columns and cards
     * Requirement 12.4: Remember user's last viewed board
     * @param {string} boardId - Board ID to load
     */
    async loadBoard(boardId) {
        if (!boardId) {
            this.showEmptyState();
            return;
        }

        try {
            this.showLoading(true);

            // Load board with columns and cards
            this.currentBoard = await kanbanService.getBoard(boardId);

            if (!this.currentBoard) {
                this.showError('Board not found');
                this.showEmptyState();
                return;
            }

            this.currentBoardId = boardId;

            // Persist last viewed board ID
            this._setLastViewedBoardId(boardId);

            // Update board selector
            const boardSelector = document.getElementById('board-selector');
            if (boardSelector) {
                boardSelector.value = boardId;
            }

            // Load annual goals for card linking
            const currentYear = new Date().getFullYear();
            this.annualGoals = await dataService.getAnnualGoals(currentYear);

            // Show board action buttons
            this.showBoardActions(true);

            // Show analytics toggle button
            const analyticsBtn = document.getElementById('analytics-toggle-btn');
            if (analyticsBtn) {
                analyticsBtn.style.display = 'inline-block';
            }

            // Render the board
            this.render();
        } catch (error) {
            console.error('Failed to load board:', error);
            this.showError('Failed to load board. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Render the entire board view
     */
    render() {
        if (!this.currentBoard) {
            this.showEmptyState();
            return;
        }

        // Hide empty state
        const emptyState = document.getElementById('no-board-state');
        if (emptyState) emptyState.style.display = 'none';

        // Show add column placeholder
        const addColumnPlaceholder = document.getElementById('add-column-placeholder');
        if (addColumnPlaceholder) addColumnPlaceholder.style.display = 'flex';

        // Render columns
        this.renderColumns();

        // Render backlog
        this.renderBacklog();

        // Apply any active filters
        if (Object.keys(this.filters).length > 0) {
            this.applyFilters();
        }

        // Sync Pomodoro active indicator with current state
        // Requirement 5.2: Display visual indicator on card when Pomodoro session is active
        this.syncPomodoroIndicator();
    }

    /**
     * Render the board selector dropdown
     */
    renderBoardSelector() {
        const selector = document.getElementById('board-selector');
        if (!selector) return;

        // Clear existing options except the placeholder
        selector.innerHTML = '<option value="">-- Select a Board --</option>';

        // Add board options
        this.boards.forEach(board => {
            const option = document.createElement('option');
            option.value = board.id;
            option.textContent = board.title;
            selector.appendChild(option);
        });

        // Select current board if set
        if (this.currentBoardId) {
            selector.value = this.currentBoardId;
        }
    }

    /**
     * Render columns with their cards
     */
    renderColumns() {
        const container = document.getElementById('columns-container');
        if (!container || !this.currentBoard) return;

        // Remove existing columns (but keep empty state and add column placeholder)
        const existingColumns = container.querySelectorAll('.kanban-column');
        existingColumns.forEach(col => col.remove());

        // Get columns sorted by order_index
        const columns = (this.currentBoard.columns || [])
            .sort((a, b) => a.order_index - b.order_index);

        // Get the add column placeholder to insert columns before it
        const addColumnPlaceholder = document.getElementById('add-column-placeholder');

        // Render each column
        columns.forEach(column => {
            const columnEl = this.createColumnElement(column);
            if (addColumnPlaceholder) {
                container.insertBefore(columnEl, addColumnPlaceholder);
            } else {
                container.appendChild(columnEl);
            }
        });
    }

    /**
     * Create a column element from template
     * Requirement 2.6: Display visual warning when WIP limit is reached
     * @param {Object} column - Column data
     * @returns {HTMLElement} Column element
     */
    createColumnElement(column) {
        const template = document.getElementById('kanban-column-template');
        const columnEl = template.content.cloneNode(true).querySelector('.kanban-column');

        columnEl.dataset.columnId = column.id;
        columnEl.setAttribute('aria-label', column.title);

        // Set column title
        const titleEl = columnEl.querySelector('.column-title');
        if (titleEl) {
            titleEl.textContent = column.title;
        }

        // Get cards for this column (non-backlog cards)
        const columnCards = (this.currentBoard.cards || [])
            .filter(c => c.column_id === column.id && !c.is_backlog)
            .sort((a, b) => a.order_index - b.order_index);

        // Update card count
        const countEl = columnEl.querySelector('.column-count');
        if (countEl) {
            countEl.textContent = `(${columnCards.length})`;
        }

        // Show WIP limit badge if set
        const wipBadge = columnEl.querySelector('.wip-limit-badge');
        if (wipBadge && column.wip_limit) {
            wipBadge.textContent = `WIP: ${columnCards.length}/${column.wip_limit}`;
            wipBadge.style.display = 'inline-block';

            // Add warning class if at or over limit
            if (columnCards.length >= column.wip_limit) {
                wipBadge.classList.add('wip-over-limit');
            } else {
                wipBadge.classList.remove('wip-over-limit');
            }
        }

        // Render cards in the column
        const cardsContainer = columnEl.querySelector('.column-cards');
        if (cardsContainer) {
            columnCards.forEach(card => {
                const cardEl = this.createCardElement(card);
                cardsContainer.appendChild(cardEl);
            });
        }

        // Setup column event listeners
        this.setupColumnEventListeners(columnEl, column);

        return columnEl;
    }

    /**
     * Create a card element from template
     * Requirement 3.6: Display visual indicators for upcoming and overdue dates
     * Requirement 3.7: Display color-coded priority indicator (High=red, Medium=yellow, Low=green)
     * Requirement 3.8: Display colored label badges on cards
     * @param {Object} card - Card data
     * @returns {HTMLElement} Card element
     */
    createCardElement(card) {
        const template = document.getElementById('kanban-card-template');
        const cardEl = template.content.cloneNode(true).querySelector('.kanban-card');

        cardEl.dataset.cardId = card.id;

        // Set card title
        const titleEl = cardEl.querySelector('.card-title');
        if (titleEl) {
            titleEl.textContent = card.title;
        }

        // Render labels
        const labelsContainer = cardEl.querySelector('.card-labels');
        if (labelsContainer && card.labels && card.labels.length > 0) {
            card.labels.forEach(label => {
                const labelEl = document.createElement('span');
                labelEl.className = 'card-label';
                labelEl.textContent = typeof label === 'string' ? label : label.name;
                if (typeof label === 'object' && label.color) {
                    labelEl.style.backgroundColor = label.color;
                }
                labelsContainer.appendChild(labelEl);
            });
        }

        // Show priority badge
        const priorityEl = cardEl.querySelector('.card-priority');
        if (priorityEl && card.priority) {
            const priorityIcons = { high: '🔴', medium: '🟡', low: '🟢' };
            priorityEl.textContent = priorityIcons[card.priority] || '';
            priorityEl.style.display = 'inline';
            priorityEl.title = `Priority: ${card.priority}`;
        }

        // Show due date with visual indicators for overdue and upcoming dates
        // Requirement 3.6: Display visual indicators for upcoming and overdue dates
        const dueDateEl = cardEl.querySelector('.card-due-date');
        if (dueDateEl && card.due_date) {
            const dueDate = new Date(card.due_date + 'T00:00:00'); // Normalize to midnight local time
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Calculate days until due
            const timeDiff = dueDate.getTime() - today.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            dueDateEl.textContent = this.formatDueDate(card.due_date);
            dueDateEl.style.display = 'inline';

            // Add appropriate CSS class based on due date status
            if (daysDiff < 0) {
                // Past due - overdue
                dueDateEl.classList.add('overdue');
            } else if (daysDiff === 0) {
                // Due today
                dueDateEl.classList.add('due-today');
            } else if (daysDiff <= 3) {
                // Due within 3 days - upcoming
                dueDateEl.classList.add('due-soon');
            }
        }

        // Show goal link indicator
        const goalLinkEl = cardEl.querySelector('.card-goal-link');
        if (goalLinkEl && card.linked_goal_id) {
            goalLinkEl.style.display = 'inline';
            const linkedGoal = this.annualGoals.find(g => g.id === card.linked_goal_id);
            goalLinkEl.title = linkedGoal ? `Linked to: ${linkedGoal.title}` : 'Linked to goal';
        }

        // Show pomodoro count
        const pomodoroEl = cardEl.querySelector('.card-pomodoro-count');
        if (pomodoroEl && card.pomodoro_count > 0) {
            pomodoroEl.textContent = `🍅 ${card.pomodoro_count}`;
            pomodoroEl.style.display = 'inline';
        }

        // Load and display card preview indicators (checklist, attachments, comments)
        // Requirements: 3.2, 6.5, 12.1
        this.loadCardPreviewIndicators(cardEl, card.id);

        // Setup card event listeners
        this.setupCardEventListeners(cardEl, card);

        return cardEl;
    }

    /**
     * Load and display card preview indicators asynchronously
     * Requirements: 3.2, 6.5, 12.1 - Display checklist progress, attachment count, and comment count on card previews
     * @param {HTMLElement} cardEl - The card element
     * @param {string} cardId - The card ID
     */
    async loadCardPreviewIndicators(cardEl, cardId) {
        try {
            // Fetch all indicators in parallel for better performance
            const [checklistProgress, attachmentCount, commentCount] = await Promise.all([
                kanbanService.getChecklistProgress(cardId),
                kanbanService.getAttachmentCount(cardId),
                kanbanService.getCommentCount(cardId)
            ]);

            // Show checklist progress indicator if there are checklist items
            // Requirement 3.2: Show compact progress indicator in board view
            const checklistEl = cardEl.querySelector('.card-checklist-progress');
            if (checklistEl && checklistProgress.total > 0) {
                checklistEl.textContent = `📋 ${checklistProgress.completed}/${checklistProgress.total}`;
                checklistEl.style.display = 'inline';
                checklistEl.title = `Checklist: ${checklistProgress.completed} of ${checklistProgress.total} items completed`;

                // Add completion style if all items are complete
                if (checklistProgress.completed === checklistProgress.total) {
                    checklistEl.classList.add('all-complete');
                }
            }

            // Show attachment count indicator if there are attachments
            // Requirement 6.5: Show attachment count indicator with paperclip icon
            const attachmentEl = cardEl.querySelector('.card-attachment-count');
            if (attachmentEl && attachmentCount > 0) {
                attachmentEl.textContent = `📎 ${attachmentCount}`;
                attachmentEl.style.display = 'inline';
                attachmentEl.title = `${attachmentCount} attachment${attachmentCount !== 1 ? 's' : ''}`;
            }

            // Show comment count indicator if there are comments
            // Requirement 12.1: Display comment count on card previews
            const commentEl = cardEl.querySelector('.card-comment-count');
            if (commentEl && commentCount > 0) {
                commentEl.textContent = `💬 ${commentCount}`;
                commentEl.style.display = 'inline';
                commentEl.title = `${commentCount} comment${commentCount !== 1 ? 's' : ''}`;
            }
        } catch (error) {
            // Silently fail - indicators are non-critical UI enhancements
            console.warn('Failed to load card preview indicators:', error);
        }
    }

    /**
     * Render the backlog panel
     */
    renderBacklog() {
        const backlogPanel = document.getElementById('backlog-panel');
        const backlogCards = document.getElementById('backlog-cards');
        const backlogCount = document.getElementById('backlog-count');
        const toggleBtn = document.getElementById('toggle-backlog-btn');

        if (!backlogPanel || !backlogCards || !this.currentBoard) return;

        // Get backlog cards
        const backlog = (this.currentBoard.cards || [])
            .filter(c => c.is_backlog)
            .sort((a, b) => a.order_index - b.order_index);

        // Update count
        if (backlogCount) {
            backlogCount.textContent = `(${backlog.length})`;
        }

        // Update expanded state
        if (this.isBacklogExpanded) {
            backlogPanel.classList.remove('collapsed');
            backlogPanel.setAttribute('aria-expanded', 'true');
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', 'true');
                toggleBtn.querySelector('span').textContent = '◀';
                toggleBtn.setAttribute('aria-label', 'Collapse backlog');
            }
        } else {
            backlogPanel.classList.add('collapsed');
            backlogPanel.setAttribute('aria-expanded', 'false');
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', 'false');
                toggleBtn.querySelector('span').textContent = '▶';
                toggleBtn.setAttribute('aria-label', 'Expand backlog');
            }
        }

        // Clear existing cards
        backlogCards.innerHTML = '';

        // Show empty state or cards
        const emptyState = document.createElement('div');
        emptyState.className = 'backlog-empty-state';
        emptyState.innerHTML = `
            <p>No items in backlog</p>
            <p class="hint">Drag cards here to save for later</p>
        `;

        if (backlog.length === 0) {
            emptyState.style.display = 'block';
            backlogCards.appendChild(emptyState);
        } else {
            backlog.forEach(card => {
                const cardEl = this.createCardElement(card);
                backlogCards.appendChild(cardEl);
            });
        }
    }

    /**
     * Setup event listeners for a column element
     * @param {HTMLElement} columnEl - Column element
     * @param {Object} column - Column data
     */
    setupColumnEventListeners(columnEl, column) {
        // Column menu button
        const menuBtn = columnEl.querySelector('.column-menu-btn');
        menuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showColumnContextMenu(e, column);
        });

        // Add card to column button
        const addCardBtn = columnEl.querySelector('.add-card-to-column-btn');
        addCardBtn?.addEventListener('click', () => this.openCardModal(null, false, column.id));

        // Drag and drop for column (stub for task 8)
        columnEl.addEventListener('dragover', (e) => this.handleDragOver(e, column.id));
        columnEl.addEventListener('drop', (e) => this.handleDrop(e, column.id));
    }

    /**
     * Setup event listeners for a card element
     * @param {HTMLElement} cardEl - Card element
     * @param {Object} card - Card data
     */
    setupCardEventListeners(cardEl, card) {
        // Click to edit
        cardEl.addEventListener('click', (e) => {
            // Don't open modal if clicking on action buttons
            if (e.target.closest('.card-actions')) return;
            this.openCardModal(card);
        });

        // Keyboard navigation
        cardEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openCardModal(card);
            }
        });

        // Edit button
        const editBtn = cardEl.querySelector('.card-edit-btn');
        editBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openCardModal(card);
        });

        // Pomodoro button
        const pomodoroBtn = cardEl.querySelector('.card-pomodoro-btn');
        pomodoroBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startPomodoroForCard(card);
        });

        // Drag and drop (stub for task 8)
        cardEl.addEventListener('dragstart', (e) => this.handleDragStart(e, card.id));
        cardEl.addEventListener('dragend', (e) => this.handleDragEnd(e));
    }

    // ==================== BOARD OPERATIONS ====================

    /**
     * Handle board selection change
     * @param {string} boardId - Selected board ID
     */
    async onBoardSelect(boardId) {
        if (boardId) {
            await this.loadBoard(boardId);
        } else {
            this.currentBoard = null;
            this.currentBoardId = null;
            this.showEmptyState();
        }
    }

    /**
     * Create a new board
     * @param {Object} boardData - Board data
     */
    async createBoard(boardData) {
        try {
            this.showLoading(true);

            const templateId = boardData.template || 'blank';
            const newBoard = await kanbanService.createBoardFromTemplate(templateId, {
                title: boardData.title,
                description: boardData.description,
                category_id: boardData.category_id
            });

            // Add to boards list
            this.boards.unshift(newBoard);

            // Update selector and load the new board
            this.renderBoardSelector();
            await this.loadBoard(newBoard.id);

            this.showSuccess('Board created successfully');
        } catch (error) {
            console.error('Failed to create board:', error);
            this.showError('Failed to create board. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Delete the current board
     */
    async deleteBoard() {
        if (!this.currentBoardId) return;

        try {
            this.showLoading(true);

            await kanbanService.deleteBoard(this.currentBoardId);

            // Remove from boards list
            this.boards = this.boards.filter(b => b.id !== this.currentBoardId);

            // Clear current board
            this.currentBoard = null;
            this.currentBoardId = null;
            this._clearLastViewedBoardId();

            // Update selector
            this.renderBoardSelector();

            // Load another board or show empty state
            if (this.boards.length > 0) {
                await this.loadBoard(this.boards[0].id);
            } else {
                this.showEmptyState();
            }

            this.showSuccess('Board deleted successfully');
        } catch (error) {
            console.error('Failed to delete board:', error);
            this.showError('Failed to delete board. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    // ==================== DRAG AND DROP (Task 8) ====================

    /**
     * Handle drag start event
     * Requirement 3.2, 3.3: Card movement via drag-and-drop
     * @param {DragEvent} event - Drag event
     * @param {string} cardId - Card ID being dragged
     */
    handleDragStart(event, cardId) {
        // Drag handling is now managed by DragDropHandler via event delegation
        // This method is kept for backward compatibility but the actual handling
        // is done in DragDropHandler._handleDragStart
        this.dragState = { cardId };
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cardId);
        event.target.classList.add('dragging');
    }

    /**
     * Handle drag over event
     * @param {DragEvent} event - Drag event
     * @param {string} columnId - Column ID being dragged over
     */
    handleDragOver(event, columnId) {
        // Drag handling is now managed by DragDropHandler via event delegation
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    /**
     * Handle drop event
     * Requirement 3.2, 3.3, 11.3, 11.4: Card movement between columns, within columns, to/from backlog
     * @param {DragEvent} event - Drop event
     * @param {string} columnId - Target column ID
     * @param {number} position - Target position
     */
    handleDrop(event, columnId, position = 0) {
        // Drag handling is now managed by DragDropHandler via event delegation
        event.preventDefault();
    }

    /**
     * Handle drag end event
     * @param {DragEvent} event - Drag event
     */
    handleDragEnd(event) {
        // Drag handling is now managed by DragDropHandler via event delegation
        event.target.classList.remove('dragging');
        this.dragState = null;
    }

    // ==================== FILTER OPERATIONS ====================

    /**
     * Toggle filter panel visibility
     */
    toggleFilterPanel() {
        const filterPanel = document.getElementById('filter-panel');
        const toggleBtn = document.getElementById('filter-toggle-btn');

        if (!filterPanel) return;

        const isVisible = filterPanel.style.display !== 'none';
        filterPanel.style.display = isVisible ? 'none' : 'block';
        toggleBtn?.setAttribute('aria-expanded', !isVisible);
    }

    /**
     * Handle search input
     * @param {string} query - Search query
     */
    onSearchInput(query) {
        this.filters.search = query || undefined;
        this.applyFilters();
    }

    /**
     * Handle priority filter change
     * @param {string} priority - Priority value
     */
    onPriorityFilter(priority) {
        this.filters.priority = priority || undefined;
        this.applyFilters();
    }

    /**
     * Handle label filter change
     * @param {string} label - Label value
     */
    onLabelFilter(label) {
        this.filters.labels = label ? [label] : undefined;
        this.applyFilters();
    }

    /**
     * Handle due date filter change
     * @param {string} dueDate - Due date filter value
     */
    onDueDateFilter(dueDate) {
        this.filters.dueDate = dueDate || undefined;
        this.applyFilters();
    }

    /**
     * Apply current filters to cards
     */
    applyFilters() {
        if (!this.currentBoard) return;

        const hasFilters = Object.values(this.filters).some(v => v !== undefined);

        // Update filter indicator
        const indicator = document.querySelector('.filter-active-indicator');
        if (indicator) {
            indicator.style.display = hasFilters ? 'inline-block' : 'none';
        }

        // Get all card elements
        const cardElements = this.container.querySelectorAll('.kanban-card');

        if (!hasFilters) {
            // Show all cards
            cardElements.forEach(el => el.style.display = '');
            return;
        }

        // Filter cards using KanbanService
        const allCards = this.currentBoard.cards || [];
        const filteredCards = kanbanService.filterCards(allCards, this.filters);
        const filteredIds = new Set(filteredCards.map(c => c.id));

        // Show/hide cards based on filter results
        cardElements.forEach(el => {
            const cardId = el.dataset.cardId;
            el.style.display = filteredIds.has(cardId) ? '' : 'none';
        });
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.filters = {};

        // Reset filter inputs
        const searchInput = document.getElementById('search-input');
        const priorityFilter = document.getElementById('priority-filter');
        const labelFilter = document.getElementById('label-filter');
        const dueDateFilter = document.getElementById('due-date-filter');

        if (searchInput) searchInput.value = '';
        if (priorityFilter) priorityFilter.value = '';
        if (labelFilter) labelFilter.value = '';
        if (dueDateFilter) dueDateFilter.value = '';

        this.applyFilters();
    }

    // ==================== BACKLOG OPERATIONS ====================

    /**
     * Toggle backlog panel expanded/collapsed state
     */
    toggleBacklog() {
        this.isBacklogExpanded = !this.isBacklogExpanded;
        this._setBacklogExpandedState(this.isBacklogExpanded);
        this.renderBacklog();
    }

    // ==================== MODAL OPERATIONS ====================

    /**
     * Open board creation/edit modal
     * @param {Object|null} board - Board to edit, or null for new board
     */
    openBoardModal(board = null) {
        const modal = document.getElementById('board-modal');
        const titleEl = document.getElementById('board-modal-title');
        const titleInput = document.getElementById('board-title');
        const descInput = document.getElementById('board-description');
        const categorySelect = document.getElementById('board-category');
        const templateSelect = document.getElementById('board-template');
        const saveBtn = document.getElementById('save-board-btn');

        if (!modal) return;

        // Set modal title
        if (titleEl) {
            titleEl.textContent = board ? 'Edit Board' : 'Create New Board';
        }

        // Populate category select
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">-- No Category --</option>';
            this.categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                categorySelect.appendChild(option);
            });
        }

        // Populate form fields
        if (titleInput) titleInput.value = board?.title || '';
        if (descInput) descInput.value = board?.description || '';
        if (categorySelect) categorySelect.value = board?.category_id || '';

        // Hide template selector when editing
        const templateGroup = templateSelect?.closest('.form-group');
        if (templateGroup) {
            templateGroup.style.display = board ? 'none' : 'block';
        }
        if (templateSelect && !board) templateSelect.value = 'blank';

        // Update save button text
        if (saveBtn) {
            saveBtn.textContent = board ? 'Save Changes' : 'Create Board';
        }

        // Store editing state
        this._editingBoard = board;

        // Show modal
        modal.style.display = 'flex';
        titleInput?.focus();
    }

    /**
     * Close board modal
     */
    closeBoardModal() {
        const modal = document.getElementById('board-modal');
        if (modal) modal.style.display = 'none';
        this._editingBoard = null;
    }

    /**
     * Save board from modal
     */
    async saveBoard() {
        const titleInput = document.getElementById('board-title');
        const descInput = document.getElementById('board-description');
        const categorySelect = document.getElementById('board-category');
        const templateSelect = document.getElementById('board-template');

        const title = titleInput?.value?.trim();
        if (!title) {
            this.showError('Board title is required');
            return;
        }

        const boardData = {
            title,
            description: descInput?.value?.trim() || null,
            category_id: categorySelect?.value || null,
            template: templateSelect?.value || 'blank'
        };

        if (this._editingBoard) {
            // Update existing board
            try {
                await kanbanService.updateBoard(this._editingBoard.id, boardData);

                // Update local state
                const boardIndex = this.boards.findIndex(b => b.id === this._editingBoard.id);
                if (boardIndex >= 0) {
                    this.boards[boardIndex] = { ...this.boards[boardIndex], ...boardData };
                }
                if (this.currentBoard?.id === this._editingBoard.id) {
                    this.currentBoard = { ...this.currentBoard, ...boardData };
                }

                this.renderBoardSelector();
                this.showSuccess('Board updated successfully');
            } catch (error) {
                console.error('Failed to update board:', error);
                this.showError('Failed to update board. Please try again.');
                return;
            }
        } else {
            // Create new board
            await this.createBoard(boardData);
        }

        this.closeBoardModal();
    }

    /**
     * Open card creation/edit modal
     * Requirements: 3.4, 4.1, 4.2, 12.2 - Modal with editable fields, goal link selector, tabbed interface
     * @param {Object|null} card - Card to edit, or null for new card
     * @param {boolean} isBacklog - Whether to add to backlog
     * @param {string|null} columnId - Target column ID for new cards
     */
    openCardModal(card = null, isBacklog = false, columnId = null) {
        const modal = document.getElementById('card-modal');
        const titleEl = document.getElementById('card-modal-title');
        const titleInput = document.getElementById('card-title');
        const descInput = document.getElementById('card-description');
        const prioritySelect = document.getElementById('card-priority');
        const dueDateInput = document.getElementById('card-due-date');
        const goalSelect = document.getElementById('card-goal');
        const deleteBtn = document.getElementById('delete-card-btn');
        const pomodoroStats = document.getElementById('card-pomodoro-stats');
        const pomodoroTotal = document.getElementById('card-pomodoro-total');
        const labelsContainer = document.getElementById('card-labels-container');
        const tabsContainer = document.getElementById('card-modal-tabs');

        if (!modal) return;

        // Set modal title
        if (titleEl) {
            titleEl.textContent = card ? 'Edit Card' : 'Add New Card';
        }

        // Show/hide tabs based on whether editing existing card (Requirement 12.2)
        // Tabs are only shown for existing cards, not for new card creation
        if (tabsContainer) {
            tabsContainer.style.display = card ? 'flex' : 'none';
        }

        // Initialize tab state for existing cards
        if (card) {
            this._initCardModalTabs(card);
        } else {
            // For new cards, ensure Details tab content is visible
            this._showCardTab('details');
        }

        // Populate goal select (Requirement 4.1: Link card to existing Annual Goal)
        if (goalSelect) {
            goalSelect.innerHTML = '<option value="">-- No Goal Linked --</option>';
            this.annualGoals.forEach(goal => {
                const option = document.createElement('option');
                option.value = goal.id;
                option.textContent = goal.title || 'Unnamed Goal';
                goalSelect.appendChild(option);
            });
        }

        // Populate labels container
        if (labelsContainer) {
            this._populateLabelsContainer(labelsContainer, card?.labels || []);
        }

        // Populate form fields
        if (titleInput) titleInput.value = card?.title || '';
        if (descInput) descInput.value = card?.description || '';
        if (prioritySelect) prioritySelect.value = card?.priority || '';
        if (dueDateInput) dueDateInput.value = card?.due_date || '';
        if (goalSelect) goalSelect.value = card?.linked_goal_id || '';

        // Show/hide delete button
        if (deleteBtn) {
            deleteBtn.style.display = card ? 'inline-block' : 'none';
        }

        // Show pomodoro stats for existing cards
        if (pomodoroStats && pomodoroTotal) {
            if (card && card.pomodoro_count > 0) {
                pomodoroTotal.textContent = card.pomodoro_count;
                pomodoroStats.style.display = 'block';
            } else {
                pomodoroStats.style.display = 'none';
            }
        }

        // Store editing state
        this._editingCard = card;
        this._newCardIsBacklog = isBacklog;
        this._newCardColumnId = columnId;

        // Show modal
        modal.style.display = 'flex';
        titleInput?.focus();
    }

    /**
     * Initialize card modal tabs for existing cards
     * Requirement 12.2: Organize card detail modal with tabs
     * @param {Object} card - The card being edited
     */
    async _initCardModalTabs(card) {
        // Destroy any existing tab components
        this._destroyCardModalComponents();

        // Initialize component references
        this._cardModalComponents = {
            checklist: null,
            attachments: null,
            comments: null,
            activity: null
        };

        // Set up tab click handlers
        const tabs = document.querySelectorAll('.card-modal-tab');
        tabs.forEach(tab => {
            // Remove existing listeners by cloning
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);

            newTab.addEventListener('click', () => {
                this._handleCardTabClick(newTab.dataset.tab, card);
            });
        });

        // Update tab counts
        await this._updateCardModalTabCounts(card.id);

        // Default to Details tab
        this._showCardTab('details');
    }

    /**
     * Handle card modal tab click
     * Requirement 12.2: Initialize components when tabs are selected
     * @param {string} tabName - Name of the tab clicked
     * @param {Object} card - The card being edited
     */
    async _handleCardTabClick(tabName, card) {
        // Update tab UI
        this._showCardTab(tabName);

        // Initialize component for the selected tab if not already initialized
        if (tabName === 'checklist' && !this._cardModalComponents?.checklist) {
            await this._initChecklistTab(card.id);
        } else if (tabName === 'attachments' && !this._cardModalComponents?.attachments) {
            await this._initAttachmentsTab(card.id);
        } else if (tabName === 'comments' && !this._cardModalComponents?.comments) {
            await this._initCommentsTab(card.id);
        } else if (tabName === 'activity' && !this._cardModalComponents?.activity) {
            await this._initActivityTab(card.id);
        }
    }

    /**
     * Show a specific card modal tab
     * @param {string} tabName - Name of the tab to show
     */
    _showCardTab(tabName) {
        // Update tab buttons
        const tabs = document.querySelectorAll('.card-modal-tab');
        tabs.forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        // Update tab content panels
        const panels = document.querySelectorAll('.card-tab-content');
        panels.forEach(panel => {
            const isActive = panel.id === `card-tab-${tabName}`;
            panel.classList.toggle('active', isActive);
        });
    }

    /**
     * Initialize the Checklist tab component
     * @param {string} cardId - Card ID
     */
    async _initChecklistTab(cardId) {
        const container = document.getElementById('card-tab-checklist');
        if (!container) return;

        try {
            const component = new ChecklistComponent(cardId, container, kanbanService);
            await component.init();
            this._cardModalComponents.checklist = component;
        } catch (error) {
            console.error('Failed to initialize checklist tab:', error);
            container.innerHTML = '<p class="error-message">Failed to load checklist</p>';
        }
    }

    /**
     * Initialize the Attachments tab component
     * @param {string} cardId - Card ID
     */
    async _initAttachmentsTab(cardId) {
        const container = document.getElementById('card-tab-attachments');
        if (!container) return;

        try {
            const component = new AttachmentsComponent(cardId, container, kanbanService);
            await component.init();
            this._cardModalComponents.attachments = component;
        } catch (error) {
            console.error('Failed to initialize attachments tab:', error);
            container.innerHTML = '<p class="error-message">Failed to load attachments</p>';
        }
    }

    /**
     * Initialize the Comments tab component
     * @param {string} cardId - Card ID
     */
    async _initCommentsTab(cardId) {
        const container = document.getElementById('card-tab-comments');
        if (!container) return;

        try {
            // Get current user ID for ownership checks
            const { data: { user } } = await dataService.supabase.auth.getUser();
            const currentUserId = user?.id || null;

            const component = new CommentsComponent(cardId, container, kanbanService, currentUserId);
            await component.init();
            this._cardModalComponents.comments = component;
        } catch (error) {
            console.error('Failed to initialize comments tab:', error);
            container.innerHTML = '<p class="error-message">Failed to load comments</p>';
        }
    }

    /**
     * Initialize the Activity tab component
     * @param {string} cardId - Card ID
     */
    async _initActivityTab(cardId) {
        const container = document.getElementById('card-tab-activity');
        if (!container) return;

        try {
            const component = new ActivityLogComponent(cardId, container, kanbanService);
            await component.init();
            this._cardModalComponents.activity = component;
        } catch (error) {
            console.error('Failed to initialize activity tab:', error);
            container.innerHTML = '<p class="error-message">Failed to load activity log</p>';
        }
    }

    /**
     * Update tab counts for checklist progress and attachment count
     * Requirement 12.2: Show tab counts where applicable
     * @param {string} cardId - Card ID
     */
    async _updateCardModalTabCounts(cardId) {
        try {
            // Get checklist progress
            const checklistProgress = await kanbanService.getChecklistProgress(cardId);
            const checklistCountEl = document.getElementById('checklist-tab-count');
            if (checklistCountEl) {
                if (checklistProgress.total > 0) {
                    checklistCountEl.textContent = `(${checklistProgress.completed}/${checklistProgress.total})`;
                } else {
                    checklistCountEl.textContent = '';
                }
            }

            // Get attachment count
            const attachmentCount = await kanbanService.getAttachmentCount(cardId);
            const attachmentsCountEl = document.getElementById('attachments-tab-count');
            if (attachmentsCountEl) {
                if (attachmentCount > 0) {
                    attachmentsCountEl.textContent = `(${attachmentCount})`;
                } else {
                    attachmentsCountEl.textContent = '';
                }
            }

            // Get comment count
            const commentCount = await kanbanService.getCommentCount(cardId);
            const commentsCountEl = document.getElementById('comments-tab-count');
            if (commentsCountEl) {
                if (commentCount > 0) {
                    commentsCountEl.textContent = `(${commentCount})`;
                } else {
                    commentsCountEl.textContent = '';
                }
            }
        } catch (error) {
            console.error('Failed to update tab counts:', error);
        }
    }

    /**
     * Destroy card modal tab components
     * Requirement 12.2: Destroy components when modal closes
     */
    _destroyCardModalComponents() {
        if (this._cardModalComponents) {
            if (this._cardModalComponents.checklist) {
                this._cardModalComponents.checklist.destroy();
            }
            if (this._cardModalComponents.attachments) {
                this._cardModalComponents.attachments.destroy();
            }
            if (this._cardModalComponents.comments) {
                this._cardModalComponents.comments.destroy();
            }
            if (this._cardModalComponents.activity) {
                this._cardModalComponents.activity.destroy();
            }
            this._cardModalComponents = null;
        }

        // Clear tab content containers
        const checklistContainer = document.getElementById('card-tab-checklist');
        const attachmentsContainer = document.getElementById('card-tab-attachments');
        const commentsContainer = document.getElementById('card-tab-comments');
        const activityContainer = document.getElementById('card-tab-activity');

        if (checklistContainer) checklistContainer.innerHTML = '';
        if (attachmentsContainer) attachmentsContainer.innerHTML = '';
        if (commentsContainer) commentsContainer.innerHTML = '';
        if (activityContainer) activityContainer.innerHTML = '';
    }

    /**
     * Get all unique labels from the current board
     * @returns {Array<{name: string, color: string}>} Array of unique labels
     */
    _getAllBoardLabels() {
        const labelsMap = new Map();

        if (!this.currentBoard) return [];

        // Collect labels from all cards in columns
        const columns = this.currentBoard.columns || [];
        columns.forEach(column => {
            const cards = column.cards || [];
            cards.forEach(card => {
                if (card.labels && Array.isArray(card.labels)) {
                    card.labels.forEach(label => {
                        const labelName = typeof label === 'string' ? label : label.name;
                        const labelColor = typeof label === 'string' ? '#6366f1' : (label.color || '#6366f1');
                        if (labelName && !labelsMap.has(labelName)) {
                            labelsMap.set(labelName, { name: labelName, color: labelColor });
                        }
                    });
                }
            });
        });

        // Collect labels from backlog cards
        const backlogCards = this.currentBoard.backlog || [];
        backlogCards.forEach(card => {
            if (card.labels && Array.isArray(card.labels)) {
                card.labels.forEach(label => {
                    const labelName = typeof label === 'string' ? label : label.name;
                    const labelColor = typeof label === 'string' ? '#6366f1' : (label.color || '#6366f1');
                    if (labelName && !labelsMap.has(labelName)) {
                        labelsMap.set(labelName, { name: labelName, color: labelColor });
                    }
                });
            }
        });

        return Array.from(labelsMap.values());
    }

    /**
     * Populate the labels container with checkboxes
     * @param {HTMLElement} container - The labels container element
     * @param {Array} selectedLabels - Currently selected labels for the card
     */
    _populateLabelsContainer(container, selectedLabels) {
        container.innerHTML = '';

        // Get all unique labels from the board
        const allLabels = this._getAllBoardLabels();

        // Normalize selected labels to array of names
        const selectedLabelNames = (selectedLabels || []).map(label =>
            typeof label === 'string' ? label : label.name
        );

        // Create checkbox for each existing label
        allLabels.forEach(label => {
            const labelItem = this._createLabelCheckbox(label, selectedLabelNames.includes(label.name));
            container.appendChild(labelItem);
        });

        // If no labels exist, show a hint
        if (allLabels.length === 0) {
            const hint = document.createElement('p');
            hint.className = 'form-hint';
            hint.textContent = 'No labels yet. Click "Add New Label" to create one.';
            container.appendChild(hint);
        }
    }

    /**
     * Create a label checkbox element
     * @param {Object} label - Label object with name and color
     * @param {boolean} isChecked - Whether the checkbox should be checked
     * @returns {HTMLElement} Label checkbox element
     */
    _createLabelCheckbox(label, isChecked) {
        const labelItem = document.createElement('label');
        labelItem.className = 'label-checkbox-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'card-label';
        checkbox.value = label.name;
        checkbox.dataset.color = label.color;
        checkbox.checked = isChecked;

        const colorBadge = document.createElement('span');
        colorBadge.className = 'label-color-badge';
        colorBadge.style.backgroundColor = label.color;

        const labelText = document.createElement('span');
        labelText.className = 'label-text';
        labelText.textContent = label.name;

        labelItem.appendChild(checkbox);
        labelItem.appendChild(colorBadge);
        labelItem.appendChild(labelText);

        return labelItem;
    }

    /**
     * Get selected labels from the card modal
     * @returns {Array<{name: string, color: string}>} Array of selected labels
     */
    _getSelectedLabels() {
        const container = document.getElementById('card-labels-container');
        if (!container) return [];

        const checkboxes = container.querySelectorAll('input[name="card-label"]:checked');
        return Array.from(checkboxes).map(checkbox => ({
            name: checkbox.value,
            color: checkbox.dataset.color || '#6366f1'
        }));
    }

    /**
     * Open the add label modal
     */
    openAddLabelModal() {
        const modal = document.getElementById('add-label-modal');
        const nameInput = document.getElementById('new-label-name');
        const colorInput = document.getElementById('new-label-color');

        if (!modal) return;

        // Reset form
        if (nameInput) nameInput.value = '';
        if (colorInput) colorInput.value = '#10b981';

        // Show modal
        modal.style.display = 'flex';
        nameInput?.focus();
    }

    /**
     * Close the add label modal
     */
    closeAddLabelModal() {
        const modal = document.getElementById('add-label-modal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Save a new label from the add label modal
     */
    saveNewLabel() {
        const nameInput = document.getElementById('new-label-name');
        const colorInput = document.getElementById('new-label-color');
        const labelsContainer = document.getElementById('card-labels-container');

        const name = nameInput?.value?.trim();
        if (!name) {
            this.showError('Label name is required');
            return;
        }

        const color = colorInput?.value || '#10b981';

        // Check if label already exists
        const existingLabels = this._getAllBoardLabels();
        if (existingLabels.some(l => l.name.toLowerCase() === name.toLowerCase())) {
            this.showError('A label with this name already exists');
            return;
        }

        // Add the new label to the container (checked by default)
        if (labelsContainer) {
            // Remove the "no labels" hint if present
            const hint = labelsContainer.querySelector('.form-hint');
            if (hint) hint.remove();

            const newLabel = { name, color };
            const labelItem = this._createLabelCheckbox(newLabel, true);
            labelsContainer.appendChild(labelItem);
        }

        // Close the modal
        this.closeAddLabelModal();
        this.showSuccess('Label added');
    }

    /**
     * Close card modal
     * Requirement 12.2: Destroy components when modal closes
     */
    closeCardModal() {
        // Destroy tab components before closing
        this._destroyCardModalComponents();

        const modal = document.getElementById('card-modal');
        if (modal) modal.style.display = 'none';
        this._editingCard = null;
        this._newCardIsBacklog = false;
        this._newCardColumnId = null;
    }

    /**
     * Save card from modal
     * Requirements: 3.4, 4.1, 4.2 - Save card with all fields including labels and goal link
     */
    async saveCard() {
        const titleInput = document.getElementById('card-title');
        const descInput = document.getElementById('card-description');
        const prioritySelect = document.getElementById('card-priority');
        const dueDateInput = document.getElementById('card-due-date');
        const goalSelect = document.getElementById('card-goal');

        const title = titleInput?.value?.trim();
        if (!title) {
            this.showError('Card title is required');
            return;
        }

        // Get selected labels
        const labels = this._getSelectedLabels();

        const cardData = {
            title,
            description: descInput?.value?.trim() || null,
            priority: prioritySelect?.value || null,
            due_date: dueDateInput?.value || null,
            linked_goal_id: goalSelect?.value || null,
            labels: labels
        };

        try {
            if (this._editingCard) {
                // Update existing card
                await kanbanService.updateCard(this._editingCard.id, cardData);
                this.showSuccess('Card updated successfully');
            } else {
                // Create new card
                if (this._newCardIsBacklog) {
                    // Add to backlog - need to create card then move to backlog
                    const firstColumn = this.currentBoard.columns?.[0];
                    if (firstColumn) {
                        const newCard = await kanbanService.createCard(firstColumn.id, cardData);
                        await kanbanService.moveCardToBacklog(newCard.id);
                    }
                } else {
                    // Add to specific column or first column
                    const targetColumnId = this._newCardColumnId || this.currentBoard.columns?.[0]?.id;
                    if (targetColumnId) {
                        await kanbanService.createCard(targetColumnId, cardData);
                    }
                }
                this.showSuccess('Card created successfully');
            }

            // Reload board to reflect changes
            await this.loadBoard(this.currentBoardId);
            this.closeCardModal();
        } catch (error) {
            console.error('Failed to save card:', error);
            this.showError('Failed to save card. Please try again.');
        }
    }

    /**
     * Open column creation/edit modal
     * @param {Object|null} column - Column to edit, or null for new column
     */
    openColumnModal(column = null) {
        const modal = document.getElementById('column-modal');
        const titleEl = document.getElementById('column-modal-title');
        const titleInput = document.getElementById('column-title');
        const wipInput = document.getElementById('column-wip-limit');
        const colorInput = document.getElementById('column-color');
        const deleteBtn = document.getElementById('delete-column-btn');

        if (!modal) return;

        // Set modal title
        if (titleEl) {
            titleEl.textContent = column ? 'Edit Column' : 'Add New Column';
        }

        // Populate form fields
        if (titleInput) titleInput.value = column?.title || '';
        if (wipInput) wipInput.value = column?.wip_limit || '';
        if (colorInput) colorInput.value = column?.color || '#6366f1';

        // Show/hide delete button
        if (deleteBtn) {
            deleteBtn.style.display = column ? 'inline-block' : 'none';
        }

        // Store editing state
        this._editingColumn = column;

        // Show modal
        modal.style.display = 'flex';
        titleInput?.focus();
    }

    /**
     * Close column modal
     */
    closeColumnModal() {
        const modal = document.getElementById('column-modal');
        if (modal) modal.style.display = 'none';
        this._editingColumn = null;
    }

    /**
     * Save column from modal
     */
    async saveColumn() {
        const titleInput = document.getElementById('column-title');
        const wipInput = document.getElementById('column-wip-limit');
        const colorInput = document.getElementById('column-color');

        const title = titleInput?.value?.trim();
        if (!title) {
            this.showError('Column title is required');
            return;
        }

        const columnData = {
            title,
            wip_limit: wipInput?.value ? parseInt(wipInput.value) : null,
            color: colorInput?.value || null
        };

        try {
            if (this._editingColumn) {
                // Update existing column
                await kanbanService.updateColumn(this._editingColumn.id, columnData);
                this.showSuccess('Column updated successfully');
            } else {
                // Create new column
                await kanbanService.createColumn(this.currentBoardId, columnData);
                this.showSuccess('Column created successfully');
            }

            // Reload board to reflect changes
            await this.loadBoard(this.currentBoardId);
            this.closeColumnModal();
        } catch (error) {
            console.error('Failed to save column:', error);
            this.showError('Failed to save column. Please try again.');
        }
    }

    /**
     * Show column context menu
     * @param {MouseEvent} event - Click event
     * @param {Object} column - Column data
     */
    showColumnContextMenu(event, column) {
        const menu = document.getElementById('column-context-menu');
        if (!menu) return;

        // Position menu near the click
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        menu.style.display = 'block';

        // Store current column for menu actions
        this._contextMenuColumn = column;

        // Setup menu item handlers
        const handleMenuClick = (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (!action) return;

            switch (action) {
                case 'edit':
                    this.openColumnModal(column);
                    break;
                case 'add-card':
                    this.openCardModal(null, false, column.id);
                    break;
                case 'move-left':
                    this.moveColumn(column, -1);
                    break;
                case 'move-right':
                    this.moveColumn(column, 1);
                    break;
                case 'delete':
                    this._editingColumn = column;
                    this.confirmDeleteColumn();
                    break;
            }

            this.hideColumnContextMenu();
        };

        // Remove old listener and add new one
        menu.removeEventListener('click', menu._clickHandler);
        menu._clickHandler = handleMenuClick;
        menu.addEventListener('click', handleMenuClick);

        // Close menu on outside click
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                this.hideColumnContextMenu();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    /**
     * Hide column context menu
     */
    hideColumnContextMenu() {
        const menu = document.getElementById('column-context-menu');
        if (menu) menu.style.display = 'none';
        this._contextMenuColumn = null;
    }

    /**
     * Move column left or right
     * @param {Object} column - Column to move
     * @param {number} direction - -1 for left, 1 for right
     */
    async moveColumn(column, direction) {
        if (!this.currentBoard?.columns) return;

        const columns = [...this.currentBoard.columns].sort((a, b) => a.order_index - b.order_index);
        const currentIndex = columns.findIndex(c => c.id === column.id);
        const newIndex = currentIndex + direction;

        if (newIndex < 0 || newIndex >= columns.length) return;

        // Swap positions
        const columnOrder = columns.map(c => c.id);
        [columnOrder[currentIndex], columnOrder[newIndex]] = [columnOrder[newIndex], columnOrder[currentIndex]];

        try {
            await kanbanService.reorderColumns(this.currentBoardId, columnOrder);
            await this.loadBoard(this.currentBoardId);
        } catch (error) {
            console.error('Failed to move column:', error);
            this.showError('Failed to move column. Please try again.');
        }
    }

    // ==================== DELETE CONFIRMATIONS ====================

    /**
     * Show delete confirmation for board
     */
    confirmDeleteBoard() {
        const modal = document.getElementById('delete-confirm-modal');
        const message = document.getElementById('delete-confirm-message');
        const confirmBtn = document.getElementById('confirm-delete-btn');
        const columnOptions = document.getElementById('delete-column-options');

        if (!modal) return;

        if (message) {
            message.textContent = `Are you sure you want to delete "${this.currentBoard?.title}"? This will delete all columns and cards in this board. This action cannot be undone.`;
        }
        if (columnOptions) columnOptions.style.display = 'none';

        // Setup confirm handler
        const handleConfirm = async () => {
            await this.deleteBoard();
            this.closeDeleteModal();
            confirmBtn?.removeEventListener('click', handleConfirm);
        };

        confirmBtn?.removeEventListener('click', confirmBtn._handler);
        confirmBtn._handler = handleConfirm;
        confirmBtn?.addEventListener('click', handleConfirm);

        modal.style.display = 'flex';
    }

    /**
     * Show delete confirmation for card
     */
    confirmDeleteCard() {
        const modal = document.getElementById('delete-confirm-modal');
        const message = document.getElementById('delete-confirm-message');
        const confirmBtn = document.getElementById('confirm-delete-btn');
        const columnOptions = document.getElementById('delete-column-options');

        if (!modal || !this._editingCard) return;

        if (message) {
            message.textContent = `Are you sure you want to delete "${this._editingCard.title}"? This action cannot be undone.`;
        }
        if (columnOptions) columnOptions.style.display = 'none';

        // Setup confirm handler
        const handleConfirm = async () => {
            try {
                await kanbanService.deleteCard(this._editingCard.id);
                this.showSuccess('Card deleted successfully');
                await this.loadBoard(this.currentBoardId);
                this.closeCardModal();
            } catch (error) {
                console.error('Failed to delete card:', error);
                this.showError('Failed to delete card. Please try again.');
            }
            this.closeDeleteModal();
            confirmBtn?.removeEventListener('click', handleConfirm);
        };

        confirmBtn?.removeEventListener('click', confirmBtn._handler);
        confirmBtn._handler = handleConfirm;
        confirmBtn?.addEventListener('click', handleConfirm);

        modal.style.display = 'flex';
    }

    /**
     * Show delete confirmation for column
     */
    confirmDeleteColumn() {
        const modal = document.getElementById('delete-confirm-modal');
        const message = document.getElementById('delete-confirm-message');
        const confirmBtn = document.getElementById('confirm-delete-btn');
        const columnOptions = document.getElementById('delete-column-options');

        if (!modal || !this._editingColumn) return;

        // Check if column has cards
        const columnCards = (this.currentBoard?.cards || [])
            .filter(c => c.column_id === this._editingColumn.id && !c.is_backlog);

        if (message) {
            message.textContent = columnCards.length > 0
                ? `This column contains ${columnCards.length} card(s). What would you like to do?`
                : `Are you sure you want to delete "${this._editingColumn.title}"? This action cannot be undone.`;
        }

        if (columnOptions) {
            columnOptions.style.display = columnCards.length > 0 ? 'block' : 'none';
        }

        // Setup confirm handler
        const handleConfirm = async () => {
            try {
                let moveCardsTo = null;
                if (columnCards.length > 0) {
                    const moveOption = document.querySelector('input[name="delete-column-action"]:checked');
                    if (moveOption?.value === 'move') {
                        // Find adjacent column
                        const columns = (this.currentBoard?.columns || [])
                            .sort((a, b) => a.order_index - b.order_index);
                        const currentIndex = columns.findIndex(c => c.id === this._editingColumn.id);
                        const adjacentColumn = columns[currentIndex + 1] || columns[currentIndex - 1];
                        moveCardsTo = adjacentColumn?.id;
                    }
                }

                await kanbanService.deleteColumn(this._editingColumn.id, moveCardsTo);
                this.showSuccess('Column deleted successfully');
                await this.loadBoard(this.currentBoardId);
                this.closeColumnModal();
            } catch (error) {
                console.error('Failed to delete column:', error);
                this.showError('Failed to delete column. Please try again.');
            }
            this.closeDeleteModal();
            confirmBtn?.removeEventListener('click', handleConfirm);
        };

        confirmBtn?.removeEventListener('click', confirmBtn._handler);
        confirmBtn._handler = handleConfirm;
        confirmBtn?.addEventListener('click', handleConfirm);

        modal.style.display = 'flex';
    }

    /**
     * Close delete confirmation modal
     */
    closeDeleteModal() {
        const modal = document.getElementById('delete-confirm-modal');
        if (modal) modal.style.display = 'none';
    }

    // ==================== GOAL PROGRESS MODAL ====================

    /**
     * Show goal progress prompt modal
     * Requirement 4.4: Optionally prompt to update goal's progress when card moved to Done
     * @param {string} goalId - Goal ID to update
     */
    async showGoalProgressPrompt(goalId) {
        const modal = document.getElementById('goal-progress-modal');
        const goalTitleEl = document.getElementById('goal-progress-goal-title');
        const currentProgressEl = document.getElementById('goal-progress-current');
        const progressInput = document.getElementById('goal-progress-input');
        const progressValue = document.getElementById('goal-progress-value');

        if (!modal) return;

        // Find the goal
        const goal = this.annualGoals.find(g => g.id === goalId);
        if (!goal) return;

        // Store the goal ID for later use
        this._updatingGoalId = goalId;

        // Populate modal with goal info
        if (goalTitleEl) goalTitleEl.textContent = goal.title || 'Unnamed Goal';

        const currentProgress = goal.progress || 0;
        if (currentProgressEl) currentProgressEl.textContent = currentProgress;

        // Set slider to current progress (or slightly higher as suggestion)
        const suggestedProgress = Math.min(100, currentProgress + 10);
        if (progressInput) {
            progressInput.value = suggestedProgress;
            progressInput.min = currentProgress; // Don't allow decreasing progress
        }
        if (progressValue) progressValue.textContent = suggestedProgress;

        // Show modal
        modal.style.display = 'flex';
    }

    /**
     * Close goal progress modal
     */
    closeGoalProgressModal() {
        const modal = document.getElementById('goal-progress-modal');
        if (modal) modal.style.display = 'none';
        this._updatingGoalId = null;
    }

    /**
     * Update goal progress from modal
     * Requirement 4.4: Update goal's progress when card moved to Done
     */
    async updateGoalProgress() {
        const progressInput = document.getElementById('goal-progress-input');
        const newProgress = parseInt(progressInput?.value || '0');

        if (!this._updatingGoalId) {
            this.closeGoalProgressModal();
            return;
        }

        try {
            // Update the goal progress via data service
            await dataService.updateAnnualGoal(this._updatingGoalId, {
                progress: newProgress
            });

            // Update local cache
            const goalIndex = this.annualGoals.findIndex(g => g.id === this._updatingGoalId);
            if (goalIndex !== -1) {
                this.annualGoals[goalIndex].progress = newProgress;
            }

            this.showSuccess(`Goal progress updated to ${newProgress}%`);
            this.closeGoalProgressModal();
        } catch (error) {
            console.error('Failed to update goal progress:', error);
            this.showError('Failed to update goal progress. Please try again.');
        }
    }

    // ==================== POMODORO INTEGRATION ====================

    /**
     * Start a Pomodoro session for a card
     * Requirement 5.1: Click Pomodoro button on card starts session with card title as task description
     * @param {Object} card - Card to start Pomodoro for
     */
    async startPomodoroForCard(card) {
        try {
            const pomodoroData = await kanbanService.startPomodoroForCard(card.id);

            // Check if Pomodoro view/timer is available via global instance
            if (window.pomodoroTimer && typeof window.pomodoroTimer.startSessionForCard === 'function') {
                window.pomodoroTimer.startSessionForCard({
                    taskDescription: pomodoroData.title,
                    linkedCardId: pomodoroData.cardId
                });
                this.showSuccess(`Started Pomodoro for "${card.title}"`);
            } else {
                // Fallback: Use state manager directly if pomodoro view is loaded
                const pomodoroState = this.stateManager?.getState('pomodoro');
                if (pomodoroState !== undefined) {
                    this.stateManager.setState('pomodoro', {
                        ...pomodoroState,
                        mode: 'focus',
                        timeRemaining: 25 * 60, // Default 25 minutes
                        currentTask: pomodoroData.title,
                        linkedCardId: pomodoroData.cardId,
                        linkedGoalId: null,
                        linkedTimeBlockId: null,
                        isRunning: true,
                        isPaused: false
                    });
                    this.showSuccess(`Started Pomodoro for "${card.title}"`);

                    // Navigate to pomodoro view to see the timer
                    if (window.location.hash !== '#pomodoro') {
                        this.showSuccess('Navigate to Pomodoro view to see the timer');
                    }
                } else {
                    this.showError('Pomodoro timer not available. Please visit the Pomodoro view first.');
                }
            }

            // Update the card UI to show active indicator
            this.updateActivePomodoroIndicator(card.id);
        } catch (error) {
            console.error('Failed to start Pomodoro:', error);
            this.showError('Failed to start Pomodoro session');
        }
    }

    /**
     * Update the active Pomodoro indicator on cards
     * Requirement 5.2: Display visual indicator on card when Pomodoro session is active
     * @param {string} activeCardId - ID of the card with active Pomodoro (null to clear all)
     */
    updateActivePomodoroIndicator(activeCardId = null) {
        // Remove active indicator from all cards
        const allCards = this.container?.querySelectorAll('.kanban-card');
        allCards?.forEach(cardEl => {
            cardEl.classList.remove('pomodoro-active');
            const indicator = cardEl.querySelector('.pomodoro-active-indicator');
            if (indicator) indicator.remove();
        });

        // Add active indicator to the specified card
        if (activeCardId) {
            const activeCard = this.container?.querySelector(`.kanban-card[data-card-id="${activeCardId}"]`);
            if (activeCard) {
                activeCard.classList.add('pomodoro-active');

                // Add pulsing indicator if not already present
                if (!activeCard.querySelector('.pomodoro-active-indicator')) {
                    const indicator = document.createElement('div');
                    indicator.className = 'pomodoro-active-indicator';
                    indicator.innerHTML = '🍅';
                    indicator.title = 'Pomodoro session active';
                    activeCard.insertBefore(indicator, activeCard.firstChild);
                }
            }
        }
    }

    /**
     * Check and update active Pomodoro indicator based on current state
     * Called during render to sync indicator with pomodoro state
     */
    syncPomodoroIndicator() {
        const pomodoroState = this.stateManager?.getState('pomodoro');
        if (pomodoroState?.isRunning && !pomodoroState?.isPaused && pomodoroState?.linkedCardId) {
            this.updateActivePomodoroIndicator(pomodoroState.linkedCardId);
        } else {
            this.updateActivePomodoroIndicator(null);
        }
    }

    // ==================== UI HELPERS ====================

    /**
     * Show/hide board action buttons
     * @param {boolean} show - Whether to show buttons
     */
    showBoardActions(show) {
        const editBtn = document.getElementById('edit-board-btn');
        const deleteBtn = document.getElementById('delete-board-btn');
        const addColumnBtn = document.getElementById('add-column-btn');
        const addCardBtn = document.getElementById('add-card-btn');

        if (editBtn) editBtn.style.display = show ? 'inline-flex' : 'none';
        if (deleteBtn) deleteBtn.style.display = show ? 'inline-flex' : 'none';
        if (addColumnBtn) addColumnBtn.style.display = show ? 'inline-flex' : 'none';
        if (addCardBtn) addCardBtn.style.display = show ? 'inline-flex' : 'none';
    }

    /**
     * Show empty state when no board is selected
     */
    showEmptyState() {
        const emptyState = document.getElementById('no-board-state');
        const addColumnPlaceholder = document.getElementById('add-column-placeholder');
        const columnsContainer = document.getElementById('columns-container');

        // Remove existing columns
        if (columnsContainer) {
            const existingColumns = columnsContainer.querySelectorAll('.kanban-column');
            existingColumns.forEach(col => col.remove());
        }

        if (emptyState) emptyState.style.display = 'flex';
        if (addColumnPlaceholder) addColumnPlaceholder.style.display = 'none';

        this.showBoardActions(false);
    }

    /**
     * Show/hide loading spinner
     * @param {boolean} show - Whether to show spinner
     */
    showLoading(show) {
        // Use existing spinner component if available
        if (window.Spinner) {
            if (show) {
                // Store reference to spinner so we can hide it later
                this._loadingSpinner = window.Spinner.show({ text: 'Loading...' });
            } else {
                // Hide the spinner we stored
                if (this._loadingSpinner) {
                    window.Spinner.hide(this._loadingSpinner);
                    this._loadingSpinner = null;
                }
                // Also remove any orphaned spinner overlays
                const overlays = document.querySelectorAll('.spinner-overlay');
                overlays.forEach(overlay => {
                    window.Spinner.hide(overlay);
                });
            }
        }
    }

    /**
     * Show success toast message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        if (window.showToast) {
            window.showToast(message, 'success');
        } else if (window.Toast) {
            window.Toast.success(message);
        } else {
            console.log('Success:', message);
        }
    }

    /**
     * Show error toast message
     * @param {string} message - Error message
     */
    showError(message) {
        if (window.showToast) {
            window.showToast(message, 'error');
        } else if (window.Toast) {
            window.Toast.error(message);
        } else {
            console.error('Error:', message);
        }
    }

    /**
     * Format due date for display
     * @param {string} dateStr - Date string (YYYY-MM-DD)
     * @returns {string} Formatted date
     */
    formatDueDate(dateStr) {
        if (!dateStr) return '';

        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);

        if (dateOnly.getTime() === today.getTime()) {
            return 'Today';
        } else if (dateOnly.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        } else if (dateOnly < today) {
            return `Overdue: ${date.toLocaleDateString()}`;
        } else {
            return date.toLocaleDateString();
        }
    }

    // ==================== LOCALSTORAGE HELPERS ====================

    /**
     * Get last viewed board ID from localStorage
     * Requirement 12.4: Remember user's last viewed board
     * @returns {string|null} Board ID or null
     * @private
     */
    _getLastViewedBoardId() {
        try {
            return localStorage.getItem(LAST_VIEWED_BOARD_KEY);
        } catch (e) {
            console.warn('Failed to read from localStorage:', e);
            return null;
        }
    }

    /**
     * Set last viewed board ID in localStorage
     * Requirement 12.4: Remember user's last viewed board
     * @param {string} boardId - Board ID to store
     * @private
     */
    _setLastViewedBoardId(boardId) {
        try {
            localStorage.setItem(LAST_VIEWED_BOARD_KEY, boardId);
        } catch (e) {
            console.warn('Failed to write to localStorage:', e);
        }
    }

    /**
     * Clear last viewed board ID from localStorage
     * @private
     */
    _clearLastViewedBoardId() {
        try {
            localStorage.removeItem(LAST_VIEWED_BOARD_KEY);
        } catch (e) {
            console.warn('Failed to remove from localStorage:', e);
        }
    }

    /**
     * Get backlog expanded state from localStorage
     * @returns {boolean} Whether backlog is expanded
     * @private
     */
    _getBacklogExpandedState() {
        try {
            const stored = localStorage.getItem(BACKLOG_EXPANDED_KEY);
            return stored === null ? true : stored === 'true';
        } catch (e) {
            console.warn('Failed to read from localStorage:', e);
            return true;
        }
    }

    /**
     * Set backlog expanded state in localStorage
     * @param {boolean} expanded - Whether backlog is expanded
     * @private
     */
    _setBacklogExpandedState(expanded) {
        try {
            localStorage.setItem(BACKLOG_EXPANDED_KEY, String(expanded));
        } catch (e) {
            console.warn('Failed to write to localStorage:', e);
        }
    }

    // ==================== KEYBOARD NAVIGATION ====================
    // Requirement 9.5: Keyboard navigation support

    /**
     * Initialize keyboard navigation for the Kanban board
     * Requirement 9.5: Implement arrow key navigation between cards and columns
     */
    initKeyboardNavigation() {
        // Remove existing listener if any
        if (this._keyboardHandler) {
            document.removeEventListener('keydown', this._keyboardHandler);
        }

        this._keyboardHandler = (e) => this.handleKeyboardNavigation(e);
        document.addEventListener('keydown', this._keyboardHandler);
    }

    /**
     * Handle keyboard navigation events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardNavigation(event) {
        // Only handle when Kanban view is active
        if (!this.container || !document.body.contains(this.container)) {
            return;
        }

        // Don't handle if user is typing in an input
        const activeElement = document.activeElement;
        if (activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.isContentEditable
        )) {
            return;
        }

        const focusedCard = this.container.querySelector('.kanban-card:focus');
        const focusedColumn = this.container.querySelector('.kanban-column:focus');

        switch (event.key) {
            case 'ArrowRight':
                event.preventDefault();
                if (focusedCard) {
                    this.navigateToNextColumn(focusedCard);
                } else if (focusedColumn) {
                    this.focusNextColumn(focusedColumn);
                } else {
                    this.focusFirstCard();
                }
                break;

            case 'ArrowLeft':
                event.preventDefault();
                if (focusedCard) {
                    this.navigateToPreviousColumn(focusedCard);
                } else if (focusedColumn) {
                    this.focusPreviousColumn(focusedColumn);
                } else {
                    this.focusFirstCard();
                }
                break;

            case 'ArrowDown':
                event.preventDefault();
                if (focusedCard) {
                    this.navigateToNextCard(focusedCard);
                } else {
                    this.focusFirstCard();
                }
                break;

            case 'ArrowUp':
                event.preventDefault();
                if (focusedCard) {
                    this.navigateToPreviousCard(focusedCard);
                } else {
                    this.focusFirstCard();
                }
                break;

            case 'Enter':
            case ' ':
                if (focusedCard && event.key === 'Enter') {
                    event.preventDefault();
                    const cardId = focusedCard.dataset.cardId;
                    const card = this.currentBoard?.cards?.find(c => c.id === cardId);
                    if (card) {
                        this.openCardModal(card);
                    }
                }
                break;

            case 'n':
            case 'N':
                // Quick add new card (Shift+N for new board)
                if (event.shiftKey) {
                    event.preventDefault();
                    this.openBoardModal();
                } else if (!event.ctrlKey && !event.metaKey) {
                    event.preventDefault();
                    this.openCardModal();
                }
                break;

            case 'f':
            case 'F':
                // Toggle filter panel
                if (!event.ctrlKey && !event.metaKey) {
                    event.preventDefault();
                    this.toggleFilterPanel();
                }
                break;

            case 'b':
            case 'B':
                // Toggle backlog panel
                if (!event.ctrlKey && !event.metaKey) {
                    event.preventDefault();
                    this.toggleBacklog();
                }
                break;

            case 'Escape':
                // Clear focus or close modals
                if (focusedCard || focusedColumn) {
                    event.preventDefault();
                    document.activeElement?.blur();
                }
                break;

            case '/':
                // Focus search input
                event.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    this.toggleFilterPanel(); // Ensure filter panel is open
                    setTimeout(() => searchInput.focus(), 100);
                }
                break;
        }
    }

    /**
     * Focus the first card in the board
     */
    focusFirstCard() {
        const firstCard = this.container.querySelector('.kanban-card');
        if (firstCard) {
            firstCard.focus();
        }
    }

    /**
     * Navigate to the next card in the same column
     * @param {HTMLElement} currentCard - Currently focused card
     */
    navigateToNextCard(currentCard) {
        const column = currentCard.closest('.kanban-column');
        const backlogPanel = currentCard.closest('#backlog-panel');

        let cards;
        if (backlogPanel) {
            cards = Array.from(backlogPanel.querySelectorAll('.kanban-card'));
        } else if (column) {
            cards = Array.from(column.querySelectorAll('.kanban-card'));
        } else {
            return;
        }

        const currentIndex = cards.indexOf(currentCard);
        const nextCard = cards[currentIndex + 1];

        if (nextCard) {
            nextCard.focus();
            nextCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Navigate to the previous card in the same column
     * @param {HTMLElement} currentCard - Currently focused card
     */
    navigateToPreviousCard(currentCard) {
        const column = currentCard.closest('.kanban-column');
        const backlogPanel = currentCard.closest('#backlog-panel');

        let cards;
        if (backlogPanel) {
            cards = Array.from(backlogPanel.querySelectorAll('.kanban-card'));
        } else if (column) {
            cards = Array.from(column.querySelectorAll('.kanban-card'));
        } else {
            return;
        }

        const currentIndex = cards.indexOf(currentCard);
        const prevCard = cards[currentIndex - 1];

        if (prevCard) {
            prevCard.focus();
            prevCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Navigate to the same position card in the next column
     * @param {HTMLElement} currentCard - Currently focused card
     */
    navigateToNextColumn(currentCard) {
        const currentColumn = currentCard.closest('.kanban-column');
        if (!currentColumn) return;

        const columns = Array.from(this.container.querySelectorAll('.kanban-column'));
        const currentColumnIndex = columns.indexOf(currentColumn);
        const nextColumn = columns[currentColumnIndex + 1];

        if (nextColumn) {
            const currentCards = Array.from(currentColumn.querySelectorAll('.kanban-card'));
            const currentCardIndex = currentCards.indexOf(currentCard);

            const nextCards = Array.from(nextColumn.querySelectorAll('.kanban-card'));
            const targetCard = nextCards[Math.min(currentCardIndex, nextCards.length - 1)] || nextCards[0];

            if (targetCard) {
                targetCard.focus();
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                // Focus the column if no cards
                nextColumn.focus();
            }
        }
    }

    /**
     * Navigate to the same position card in the previous column
     * @param {HTMLElement} currentCard - Currently focused card
     */
    navigateToPreviousColumn(currentCard) {
        const currentColumn = currentCard.closest('.kanban-column');
        if (!currentColumn) return;

        const columns = Array.from(this.container.querySelectorAll('.kanban-column'));
        const currentColumnIndex = columns.indexOf(currentColumn);
        const prevColumn = columns[currentColumnIndex - 1];

        if (prevColumn) {
            const currentCards = Array.from(currentColumn.querySelectorAll('.kanban-card'));
            const currentCardIndex = currentCards.indexOf(currentCard);

            const prevCards = Array.from(prevColumn.querySelectorAll('.kanban-card'));
            const targetCard = prevCards[Math.min(currentCardIndex, prevCards.length - 1)] || prevCards[0];

            if (targetCard) {
                targetCard.focus();
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                // Focus the column if no cards
                prevColumn.focus();
            }
        }
    }

    /**
     * Focus the next column
     * @param {HTMLElement} currentColumn - Currently focused column
     */
    focusNextColumn(currentColumn) {
        const columns = Array.from(this.container.querySelectorAll('.kanban-column'));
        const currentIndex = columns.indexOf(currentColumn);
        const nextColumn = columns[currentIndex + 1];

        if (nextColumn) {
            const firstCard = nextColumn.querySelector('.kanban-card');
            if (firstCard) {
                firstCard.focus();
            } else {
                nextColumn.focus();
            }
        }
    }

    /**
     * Focus the previous column
     * @param {HTMLElement} currentColumn - Currently focused column
     */
    focusPreviousColumn(currentColumn) {
        const columns = Array.from(this.container.querySelectorAll('.kanban-column'));
        const currentIndex = columns.indexOf(currentColumn);
        const prevColumn = columns[currentIndex - 1];

        if (prevColumn) {
            const firstCard = prevColumn.querySelector('.kanban-card');
            if (firstCard) {
                firstCard.focus();
            } else {
                prevColumn.focus();
            }
        }
    }

    // ==================== CLEANUP ====================

    /**
     * Destroy the view and cleanup resources
     */
    destroy() {
        // Remove keyboard handler
        if (this._keyboardHandler) {
            document.removeEventListener('keydown', this._keyboardHandler);
            this._keyboardHandler = null;
        }

        // Clear state
        this.currentBoardId = null;
        this.currentBoard = null;
        this.boards = [];
        this.dragState = null;
        this.filters = {};
        this._editingBoard = null;
        this._editingCard = null;
        this._editingColumn = null;

        // Cleanup drag handler
        if (this.dragDropHandler) {
            this.dragDropHandler._cleanup();
            this.dragDropHandler = null;
        }

        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

/**
 * ChecklistComponent - Manages checklist items within a Kanban card
 * Provides CRUD operations for checklist items with progress tracking
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 1.7, 13.4
 */
class ChecklistComponent {
    /**
     * Create a ChecklistComponent instance
     * @param {string} cardId - The ID of the card this checklist belongs to
     * @param {HTMLElement} container - The container element to render into
     * @param {Object} kanbanService - The KanbanService instance for data operations
     */
    constructor(cardId, container, kanbanService) {
        this.cardId = cardId;
        this.container = container;
        this.kanbanService = kanbanService;
        this.items = [];
        this.dragHandler = null;
        this._eventListeners = [];
        this._editingItemId = null;
        this._isOffline = false;
        this._hasQueuedOperations = false;

        // Listen for online/offline events
        this._handleOnline = () => this._onOnlineStatusChange(true);
        this._handleOffline = () => this._onOnlineStatusChange(false);
        window.addEventListener('online', this._handleOnline);
        window.addEventListener('offline', this._handleOffline);
    }

    /**
     * Handle online/offline status changes
     * @param {boolean} isOnline - Whether the app is now online
     * @private
     */
    _onOnlineStatusChange(isOnline) {
        this._isOffline = !isOnline;
        // Re-render to update offline indicator
        this.render();

        if (isOnline && this._hasQueuedOperations) {
            this._showSuccess('Back online - syncing changes...');
            this._hasQueuedOperations = false;
        }
    }

    /**
     * Initialize the checklist component
     * Loads checklist items from the service and renders the UI
     * Requirement 1.1: Display "Add Checklist" button in card detail view
     * Requirement 13.4: Allow viewing cached checklists when offline
     */
    async init() {
        try {
            // Load checklist items from service (returns {items, isOffline})
            const result = await this.kanbanService.getChecklistItems(this.cardId);
            this.items = result.items || result; // Handle both new and old return format
            this._isOffline = result.isOffline || !navigator.onLine;

            // Render the component
            await this.render();
        } catch (error) {
            console.error('Failed to initialize checklist:', error);
            this._showError('Failed to load checklist items');
        }
    }

    /**
     * Render the complete checklist UI
     * Requirement 3.1: Display progress indicator showing "X/Y items done"
     * Requirement 13.4: Display cached items when offline
     */
    async render() {
        if (!this.container) return;

        // Clear existing content
        this.container.innerHTML = '';

        // Create main checklist container
        const checklistEl = document.createElement('div');
        checklistEl.className = 'kanban-checklist';

        // Render offline indicator if offline or has queued operations
        if (this._isOffline || this._hasQueuedOperations) {
            const offlineIndicator = this._renderOfflineIndicator();
            checklistEl.appendChild(offlineIndicator);
        }

        // Render header with progress indicator
        const headerEl = this._renderHeader();
        checklistEl.appendChild(headerEl);

        // Render add item input
        const addItemEl = this._renderAddItemInput();
        checklistEl.appendChild(addItemEl);

        // Render checklist items
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'kanban-checklist-items';
        itemsContainer.setAttribute('role', 'list');
        itemsContainer.setAttribute('aria-label', 'Checklist items');

        // Sort items by order_index and render
        const sortedItems = [...this.items].sort((a, b) => a.order_index - b.order_index);
        sortedItems.forEach(item => {
            const itemEl = this._renderItem(item);
            itemsContainer.appendChild(itemEl);
        });

        checklistEl.appendChild(itemsContainer);

        // Add to container
        this.container.appendChild(checklistEl);

        // Initialize drag-and-drop for checklist items (Requirement 4.1, 4.4)
        this.initDragAndDrop();
    }

    /**
     * Render the offline indicator
     * Requirement 1.7: Show offline indicator when operations are queued
     * @returns {HTMLElement} Offline indicator element
     * @private
     */
    _renderOfflineIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'kanban-checklist-offline-indicator';
        indicator.setAttribute('role', 'status');
        indicator.setAttribute('aria-live', 'polite');

        const icon = document.createElement('span');
        icon.className = 'offline-icon';
        icon.innerHTML = '📡';
        icon.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.className = 'offline-text';

        if (this._isOffline) {
            text.textContent = 'You are offline. Viewing cached data.';
            indicator.classList.add('offline');
        } else if (this._hasQueuedOperations) {
            text.textContent = 'Changes queued for sync.';
            indicator.classList.add('queued');
        }

        indicator.appendChild(icon);
        indicator.appendChild(text);

        return indicator;
    }

    /**
     * Render the checklist header with title and progress indicator
     * @returns {HTMLElement} Header element
     */
    _renderHeader() {
        const header = document.createElement('div');
        header.className = 'kanban-checklist-header';

        const title = document.createElement('h4');
        title.className = 'kanban-checklist-title';
        title.textContent = 'Checklist';

        const progress = this.renderProgressIndicator();

        header.appendChild(title);
        header.appendChild(progress);

        return header;
    }

    /**
     * Render the add item input field
     * Requirement 1.1: Display "Add Checklist" button/input
     * @returns {HTMLElement} Add item input element
     */
    _renderAddItemInput() {
        const addContainer = document.createElement('div');
        addContainer.className = 'kanban-checklist-add';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'kanban-checklist-add-input';
        input.placeholder = 'Add an item...';
        input.setAttribute('aria-label', 'Add checklist item');

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'kanban-checklist-add-btn';
        addBtn.textContent = '+';
        addBtn.setAttribute('aria-label', 'Add item');
        addBtn.title = 'Add item';

        // Handle add item on Enter key
        const handleKeydown = async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const text = input.value.trim();
                if (text) {
                    await this.addItem(text);
                    input.value = '';
                    input.focus();
                }
            }
        };

        // Handle add item on button click
        const handleClick = async () => {
            const text = input.value.trim();
            if (text) {
                await this.addItem(text);
                input.value = '';
                input.focus();
            }
        };

        input.addEventListener('keydown', handleKeydown);
        addBtn.addEventListener('click', handleClick);

        // Track listeners for cleanup
        this._eventListeners.push(
            { element: input, event: 'keydown', handler: handleKeydown },
            { element: addBtn, event: 'click', handler: handleClick }
        );

        addContainer.appendChild(input);
        addContainer.appendChild(addBtn);

        return addContainer;
    }

    /**
     * Render a single checklist item
     * Requirement 2.2: Display completed items with strikethrough style
     * Requirement 4.1: Items are draggable for reordering
     * @param {Object} item - Checklist item data
     * @returns {HTMLElement} Item element
     */
    _renderItem(item) {
        const itemEl = document.createElement('div');
        itemEl.className = 'kanban-checklist-item';
        itemEl.dataset.itemId = item.id;
        itemEl.setAttribute('role', 'listitem');

        // Make item draggable for reordering (Requirement 4.4)
        itemEl.setAttribute('draggable', 'true');

        if (item.is_completed) {
            itemEl.classList.add('completed');
        }

        // Drag handle for visual cue
        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '⋮⋮';
        dragHandle.setAttribute('aria-hidden', 'true');

        // Checkbox for toggling completion
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'kanban-checklist-checkbox';
        checkbox.checked = item.is_completed;
        checkbox.setAttribute('aria-label', `Mark "${item.text}" as ${item.is_completed ? 'incomplete' : 'complete'}`);

        // Handle toggle
        const handleToggle = async () => {
            await this.toggleItem(item.id);
        };
        checkbox.addEventListener('change', handleToggle);
        this._eventListeners.push({ element: checkbox, event: 'change', handler: handleToggle });

        // Text content (editable)
        const textEl = document.createElement('span');
        textEl.className = 'kanban-checklist-item-text';
        textEl.textContent = item.text;

        // Make text editable on double-click
        const handleDoubleClick = () => {
            this._startEditing(item, textEl);
        };
        textEl.addEventListener('dblclick', handleDoubleClick);
        this._eventListeners.push({ element: textEl, event: 'dblclick', handler: handleDoubleClick });

        // Due date input
        const dueDateContainer = document.createElement('div');
        dueDateContainer.className = 'kanban-checklist-item-due-date';

        const dueDateInput = document.createElement('input');
        dueDateInput.type = 'date';
        dueDateInput.className = 'kanban-checklist-due-date-input';
        dueDateInput.value = item.due_date || '';
        dueDateInput.setAttribute('aria-label', `Due date for "${item.text}"`);
        dueDateInput.title = 'Set due date';

        // Add visual indicator if due date is set and past
        if (item.due_date) {
            const today = new Date().toISOString().split('T')[0];
            if (item.due_date < today && !item.is_completed) {
                dueDateContainer.classList.add('overdue');
            } else if (item.due_date === today && !item.is_completed) {
                dueDateContainer.classList.add('due-today');
            }
        }

        const handleDueDateChange = async () => {
            const newDueDate = dueDateInput.value || null;
            await this.updateItemDueDate(item.id, newDueDate);
        };
        dueDateInput.addEventListener('change', handleDueDateChange);
        this._eventListeners.push({ element: dueDateInput, event: 'change', handler: handleDueDateChange });

        dueDateContainer.appendChild(dueDateInput);

        // Actions container
        const actionsEl = document.createElement('div');
        actionsEl.className = 'kanban-checklist-item-actions';

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'kanban-checklist-item-btn kanban-checklist-edit-btn';
        editBtn.innerHTML = '✏️';
        editBtn.setAttribute('aria-label', `Edit "${item.text}"`);
        editBtn.title = 'Edit item';

        const handleEditClick = () => {
            this._startEditing(item, textEl);
        };
        editBtn.addEventListener('click', handleEditClick);
        this._eventListeners.push({ element: editBtn, event: 'click', handler: handleEditClick });

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'kanban-checklist-item-btn kanban-checklist-delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.setAttribute('aria-label', `Delete "${item.text}"`);
        deleteBtn.title = 'Delete item';

        const handleDeleteClick = async () => {
            await this.deleteItem(item.id);
        };
        deleteBtn.addEventListener('click', handleDeleteClick);
        this._eventListeners.push({ element: deleteBtn, event: 'click', handler: handleDeleteClick });

        actionsEl.appendChild(editBtn);
        actionsEl.appendChild(deleteBtn);

        itemEl.appendChild(dragHandle);
        itemEl.appendChild(checkbox);
        itemEl.appendChild(textEl);
        itemEl.appendChild(dueDateContainer);
        itemEl.appendChild(actionsEl);

        return itemEl;
    }

    /**
     * Update the due date of a checklist item
     * @param {string} itemId - The ID of the item to update
     * @param {string|null} dueDate - The new due date (YYYY-MM-DD format) or null to clear
     */
    async updateItemDueDate(itemId, dueDate) {
        try {
            // Update via service
            const result = await this.kanbanService.updateChecklistItem(itemId, { due_date: dueDate });
            const updatedItem = result.item || result;
            const wasQueued = result.queued || false;

            // Update local items array
            const index = this.items.findIndex(item => item.id === itemId);
            if (index !== -1) {
                this.items[index] = updatedItem;
            }

            // Track if we have queued operations
            if (wasQueued) {
                this._hasQueuedOperations = true;
                this._showWarning('Due date updated (will sync when online)');
            } else {
                this._showSuccess('Due date updated');
            }

            // Re-render to update visual indicators
            await this.render();
        } catch (error) {
            console.error('Failed to update checklist item due date:', error);
            this._showError('Failed to update due date');
        }
    }

    /**
     * Start inline editing of an item
     * @param {Object} item - The item to edit
     * @param {HTMLElement} textEl - The text element to replace with input
     */
    _startEditing(item, textEl) {
        // Prevent multiple edits at once
        if (this._editingItemId) return;
        this._editingItemId = item.id;

        const originalText = item.text;
        const itemEl = textEl.closest('.kanban-checklist-item');

        // Create input for editing
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'kanban-checklist-edit-input';
        input.value = originalText;

        // Replace text with input
        textEl.style.display = 'none';
        itemEl.insertBefore(input, textEl.nextSibling);
        input.focus();
        input.select();

        // Handle save on Enter or blur
        const saveEdit = async () => {
            const newText = input.value.trim();
            if (newText && newText !== originalText) {
                await this.editItem(item.id, newText);
            } else {
                // Restore original text if empty or unchanged
                textEl.style.display = '';
                input.remove();
            }
            this._editingItemId = null;
        };

        // Handle cancel on Escape
        const cancelEdit = () => {
            textEl.style.display = '';
            input.remove();
            this._editingItemId = null;
        };

        const handleKeydown = async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await saveEdit();
            } else if (e.key === 'Escape') {
                cancelEdit();
            }
        };

        const handleBlur = async () => {
            // Small delay to allow for button clicks
            setTimeout(async () => {
                if (document.activeElement !== input) {
                    await saveEdit();
                }
            }, 100);
        };

        input.addEventListener('keydown', handleKeydown);
        input.addEventListener('blur', handleBlur);
    }

    /**
     * Add a new checklist item
     * Requirement 1.2: Create new item with provided text and unchecked status
     * Requirement 1.3: Prevent addition of empty items
     * Requirement 1.7: Queue operations when offline
     * @param {string} text - The text for the new item
     */
    async addItem(text) {
        // Validate text is not empty (Requirement 1.3)
        if (!text || !text.trim()) {
            this._showError('Checklist item text cannot be empty');
            return;
        }

        try {
            // Create item via service (returns {item, queued})
            const result = await this.kanbanService.createChecklistItem(this.cardId, text.trim());
            const newItem = result.item || result; // Handle both new and old return format
            const wasQueued = result.queued || false;

            // Add to local items array
            this.items.push(newItem);

            // Track if we have queued operations
            if (wasQueued) {
                this._hasQueuedOperations = true;
                this._showWarning('Item added (will sync when online)');
            } else {
                this._showSuccess('Item added');
            }

            // Re-render to show new item
            await this.render();
        } catch (error) {
            console.error('Failed to add checklist item:', error);
            this._showError('Failed to add item');
        }
    }

    /**
     * Toggle the completion status of a checklist item
     * Requirement 2.1: Toggle is_completed status on checkbox click
     * Requirement 1.7: Queue operations when offline
     * @param {string} itemId - The ID of the item to toggle
     */
    async toggleItem(itemId) {
        try {
            // Toggle via service (returns {item, queued})
            const result = await this.kanbanService.toggleChecklistItem(itemId);
            const updatedItem = result.item || result; // Handle both new and old return format
            const wasQueued = result.queued || false;

            // Update local items array
            const index = this.items.findIndex(item => item.id === itemId);
            if (index !== -1) {
                this.items[index] = updatedItem;
            }

            // Track if we have queued operations
            if (wasQueued) {
                this._hasQueuedOperations = true;
            }

            // Re-render to update UI (Requirement 2.2: strikethrough, 2.3: progress indicator)
            await this.render();
        } catch (error) {
            console.error('Failed to toggle checklist item:', error);
            this._showError('Failed to update item');
        }
    }

    /**
     * Edit a checklist item's text
     * Requirement 1.5: Update item text immediately
     * Requirement 1.7: Queue operations when offline
     * @param {string} itemId - The ID of the item to edit
     * @param {string} text - The new text for the item
     */
    async editItem(itemId, text) {
        // Validate text is not empty
        if (!text || !text.trim()) {
            this._showError('Checklist item text cannot be empty');
            return;
        }

        try {
            // Update via service (returns {item, queued})
            const result = await this.kanbanService.updateChecklistItem(itemId, { text: text.trim() });
            const updatedItem = result.item || result; // Handle both new and old return format
            const wasQueued = result.queued || false;

            // Update local items array
            const index = this.items.findIndex(item => item.id === itemId);
            if (index !== -1) {
                this.items[index] = updatedItem;
            }

            // Track if we have queued operations
            if (wasQueued) {
                this._hasQueuedOperations = true;
                this._showWarning('Item updated (will sync when online)');
            } else {
                this._showSuccess('Item updated');
            }

            // Re-render to show updated text
            await this.render();
        } catch (error) {
            console.error('Failed to edit checklist item:', error);
            this._showError('Failed to update item');
        }
    }

    /**
     * Delete a checklist item with confirmation
     * Requirement 1.6: Remove item after confirmation
     * Requirement 1.7: Queue operations when offline
     * @param {string} itemId - The ID of the item to delete
     */
    async deleteItem(itemId) {
        // Find the item for confirmation message
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        // Show confirmation dialog
        const confirmed = await this._confirmDelete(item.text);
        if (!confirmed) return;

        try {
            // Delete via service (returns {queued})
            const result = await this.kanbanService.deleteChecklistItem(itemId);
            const wasQueued = result.queued || false;

            // Remove from local items array
            this.items = this.items.filter(i => i.id !== itemId);

            // Track if we have queued operations
            if (wasQueued) {
                this._hasQueuedOperations = true;
                this._showWarning('Item deleted (will sync when online)');
            } else {
                this._showSuccess('Item deleted');
            }

            // Re-render to remove item from UI
            await this.render();
        } catch (error) {
            console.error('Failed to delete checklist item:', error);
            this._showError('Failed to delete item');
        }
    }

    /**
     * Render the progress indicator
     * Requirement 3.1: Display "X/Y items done"
     * Requirement 3.4: Display with completion style when all items complete
     * @returns {HTMLElement} Progress indicator element
     */
    renderProgressIndicator() {
        const progress = document.createElement('div');
        progress.className = 'kanban-checklist-progress';

        const total = this.items.length;
        const completed = this.items.filter(item => item.is_completed).length;

        if (total === 0) {
            progress.textContent = 'No items';
            progress.classList.add('empty');
        } else {
            progress.textContent = `${completed}/${total} done`;

            // Add completion style when all items are complete (Requirement 3.4)
            if (completed === total) {
                progress.classList.add('all-complete');
            } else if (completed > 0) {
                progress.classList.add('in-progress');
            }
        }

        // Add progress bar
        if (total > 0) {
            const progressBar = document.createElement('div');
            progressBar.className = 'kanban-checklist-progress-bar';

            const progressFill = document.createElement('div');
            progressFill.className = 'kanban-checklist-progress-fill';
            progressFill.style.width = `${(completed / total) * 100}%`;

            if (completed === total) {
                progressFill.classList.add('complete');
            }

            progressBar.appendChild(progressFill);
            progress.appendChild(progressBar);
        }

        return progress;
    }

    /**
     * Show confirmation dialog for deletion
     * @param {string} itemText - The text of the item being deleted
     * @returns {Promise<boolean>} True if confirmed, false otherwise
     */
    async _confirmDelete(itemText) {
        // Use the existing delete confirmation modal if available
        const modal = document.getElementById('delete-confirm-modal');
        if (modal) {
            return new Promise((resolve) => {
                const messageEl = document.getElementById('delete-confirm-message');
                if (messageEl) {
                    messageEl.textContent = `Are you sure you want to delete "${itemText}"?`;
                }

                const confirmBtn = document.getElementById('confirm-delete-btn');
                const cancelBtns = modal.querySelectorAll('.modal-close');

                const cleanup = () => {
                    modal.style.display = 'none';
                    confirmBtn?.removeEventListener('click', handleConfirm);
                    cancelBtns.forEach(btn => btn.removeEventListener('click', handleCancel));
                    modal.removeEventListener('click', handleBackdrop);
                };

                const handleConfirm = () => {
                    cleanup();
                    resolve(true);
                };

                const handleCancel = () => {
                    cleanup();
                    resolve(false);
                };

                const handleBackdrop = (e) => {
                    if (e.target === modal) {
                        cleanup();
                        resolve(false);
                    }
                };

                confirmBtn?.addEventListener('click', handleConfirm);
                cancelBtns.forEach(btn => btn.addEventListener('click', handleCancel));
                modal.addEventListener('click', handleBackdrop);

                modal.style.display = 'flex';
            });
        }

        // Fallback to browser confirm
        return confirm(`Are you sure you want to delete "${itemText}"?`);
    }

    /**
     * Show success message using toast if available
     * @param {string} message - Success message
     */
    _showSuccess(message) {
        if (typeof Toast !== 'undefined' && Toast.success) {
            Toast.success(message);
        } else if (typeof window.showToast === 'function') {
            window.showToast(message, 'success');
        }
    }

    /**
     * Show error message using toast if available
     * @param {string} message - Error message
     */
    _showError(message) {
        if (typeof Toast !== 'undefined' && Toast.error) {
            Toast.error(message);
        } else if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
        } else {
            console.error(message);
        }
    }

    /**
     * Show warning message using toast if available
     * Requirement 1.7: Show offline indicator when operations are queued
     * @param {string} message - Warning message
     */
    _showWarning(message) {
        if (typeof Toast !== 'undefined' && Toast.warning) {
            Toast.warning(message);
        } else if (typeof window.showToast === 'function') {
            window.showToast(message, 'warning');
        } else {
            console.warn(message);
        }
    }

    // ==================== DRAG-AND-DROP REORDERING ====================
    // Requirements: 4.1, 4.2, 4.4

    /**
     * Initialize drag-and-drop listeners for checklist items
     * Requirement 4.1: Provide visual feedback showing the drag operation
     * Requirement 4.4: Support both mouse drag-and-drop and touch gestures
     */
    initDragAndDrop() {
        const itemsContainer = this.container?.querySelector('.kanban-checklist-items');
        if (!itemsContainer) return;

        // Store reference for cleanup
        this._itemsContainer = itemsContainer;

        // Mouse drag-and-drop events (using event delegation)
        const handleDragStart = (e) => this._handleItemDragStart(e);
        const handleDragOver = (e) => this._handleItemDragOver(e);
        const handleDrop = (e) => this._handleItemDrop(e);
        const handleDragEnd = (e) => this._handleItemDragEnd(e);
        const handleDragEnter = (e) => this._handleItemDragEnter(e);
        const handleDragLeave = (e) => this._handleItemDragLeave(e);

        itemsContainer.addEventListener('dragstart', handleDragStart);
        itemsContainer.addEventListener('dragover', handleDragOver);
        itemsContainer.addEventListener('drop', handleDrop);
        itemsContainer.addEventListener('dragend', handleDragEnd);
        itemsContainer.addEventListener('dragenter', handleDragEnter);
        itemsContainer.addEventListener('dragleave', handleDragLeave);

        // Track listeners for cleanup
        this._eventListeners.push(
            { element: itemsContainer, event: 'dragstart', handler: handleDragStart },
            { element: itemsContainer, event: 'dragover', handler: handleDragOver },
            { element: itemsContainer, event: 'drop', handler: handleDrop },
            { element: itemsContainer, event: 'dragend', handler: handleDragEnd },
            { element: itemsContainer, event: 'dragenter', handler: handleDragEnter },
            { element: itemsContainer, event: 'dragleave', handler: handleDragLeave }
        );

        // Touch events for mobile support (Requirement 4.4)
        const handleTouchStart = (e) => this._handleItemTouchStart(e);
        const handleTouchMove = (e) => this._handleItemTouchMove(e);
        const handleTouchEnd = (e) => this._handleItemTouchEnd(e);

        itemsContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
        itemsContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        itemsContainer.addEventListener('touchend', handleTouchEnd);

        this._eventListeners.push(
            { element: itemsContainer, event: 'touchstart', handler: handleTouchStart },
            { element: itemsContainer, event: 'touchmove', handler: handleTouchMove },
            { element: itemsContainer, event: 'touchend', handler: handleTouchEnd }
        );

        // Initialize drag state
        this._dragState = {
            draggedItem: null,
            draggedItemId: null,
            placeholder: null,
            touchClone: null,
            touchStartY: 0,
            isDragging: false
        };
    }

    /**
     * Handle drag start event for checklist items
     * Requirement 4.1: Provide visual feedback showing the drag operation
     * @param {DragEvent} e - The drag event
     */
    _handleItemDragStart(e) {
        const itemEl = e.target.closest('.kanban-checklist-item');
        if (!itemEl) return;

        this._dragState.draggedItem = itemEl;
        this._dragState.draggedItemId = itemEl.dataset.itemId;
        this._dragState.isDragging = true;

        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', itemEl.dataset.itemId);

        // Add dragging class after a small delay to prevent visual glitch
        requestAnimationFrame(() => {
            itemEl.classList.add('dragging');
        });

        // Create placeholder for visual feedback
        this._createDragPlaceholder(itemEl);
    }

    /**
     * Handle drag enter event
     * @param {DragEvent} e - The drag event
     */
    _handleItemDragEnter(e) {
        e.preventDefault();
        const itemEl = e.target.closest('.kanban-checklist-item');
        if (itemEl && itemEl !== this._dragState.draggedItem) {
            itemEl.classList.add('drag-over');
        }
    }

    /**
     * Handle drag leave event
     * @param {DragEvent} e - The drag event
     */
    _handleItemDragLeave(e) {
        const itemEl = e.target.closest('.kanban-checklist-item');
        if (itemEl && !itemEl.contains(e.relatedTarget)) {
            itemEl.classList.remove('drag-over');
        }
    }

    /**
     * Handle drag over event for checklist items
     * Requirement 4.1: Provide visual feedback showing the drag operation
     * @param {DragEvent} e - The drag event
     */
    _handleItemDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (!this._dragState.isDragging || !this._dragState.placeholder) return;

        const itemsContainer = this._itemsContainer;
        if (!itemsContainer) return;

        // Calculate drop position based on mouse Y position
        const items = Array.from(itemsContainer.querySelectorAll('.kanban-checklist-item:not(.dragging):not(.drag-placeholder)'));
        const mouseY = e.clientY;

        let insertBefore = null;
        for (const item of items) {
            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            if (mouseY < midY) {
                insertBefore = item;
                break;
            }
        }

        // Move placeholder to the calculated position
        if (insertBefore) {
            itemsContainer.insertBefore(this._dragState.placeholder, insertBefore);
        } else {
            itemsContainer.appendChild(this._dragState.placeholder);
        }
    }

    /**
     * Handle drop event for checklist items
     * Requirement 4.2: Update order indices for all affected items on drop
     * @param {DragEvent} e - The drag event
     */
    async _handleItemDrop(e) {
        e.preventDefault();

        // Remove all drag-over highlights
        this._itemsContainer?.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

        if (!this._dragState.isDragging || !this._dragState.draggedItemId) return;

        // Calculate new order based on placeholder position
        const newOrder = this._calculateNewOrder();

        // Clean up drag state
        this._cleanupDrag();

        // Call service to reorder items (Requirement 4.2)
        if (newOrder && newOrder.length > 0) {
            try {
                await this.kanbanService.reorderChecklistItems(this.cardId, newOrder);

                // Update local items with new order
                newOrder.forEach((itemId, index) => {
                    const item = this.items.find(i => i.id === itemId);
                    if (item) {
                        item.order_index = index;
                    }
                });

                // Re-render to reflect new order
                await this.render();
            } catch (error) {
                console.error('Failed to reorder checklist items:', error);
                this._showError('Failed to reorder items');
                // Re-render to restore original order
                await this.render();
            }
        }
    }

    /**
     * Handle drag end event for checklist items
     * @param {DragEvent} e - The drag event
     */
    _handleItemDragEnd(e) {
        // Remove all drag-over highlights
        this._itemsContainer?.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

        this._cleanupDrag();
    }

    /**
     * Create a placeholder element for visual feedback during drag
     * @param {HTMLElement} itemEl - The item being dragged
     */
    _createDragPlaceholder(itemEl) {
        // Remove existing placeholder if any
        this._removeDragPlaceholder();

        const placeholder = document.createElement('div');
        placeholder.className = 'drag-placeholder';
        placeholder.style.height = `${itemEl.offsetHeight}px`;

        this._dragState.placeholder = placeholder;

        // Insert placeholder after the dragged item
        itemEl.parentNode?.insertBefore(placeholder, itemEl.nextSibling);
    }

    /**
     * Remove the drag placeholder
     */
    _removeDragPlaceholder() {
        if (this._dragState.placeholder && this._dragState.placeholder.parentNode) {
            this._dragState.placeholder.parentNode.removeChild(this._dragState.placeholder);
        }
        this._dragState.placeholder = null;
    }

    /**
     * Calculate the new order of items based on placeholder position
     * @returns {Array<string>} Array of item IDs in new order
     */
    _calculateNewOrder() {
        const itemsContainer = this._itemsContainer;
        if (!itemsContainer) return [];

        // Get all items including placeholder, excluding the dragged item
        const elements = Array.from(itemsContainer.children);
        const newOrder = [];

        for (const el of elements) {
            if (el.classList.contains('drag-placeholder')) {
                // Insert dragged item at placeholder position
                if (this._dragState.draggedItemId) {
                    newOrder.push(this._dragState.draggedItemId);
                }
            } else if (el.classList.contains('kanban-checklist-item') && !el.classList.contains('dragging')) {
                const itemId = el.dataset.itemId;
                if (itemId) {
                    newOrder.push(itemId);
                }
            }
        }

        // If dragged item wasn't added (placeholder not found), add it at the end
        if (this._dragState.draggedItemId && !newOrder.includes(this._dragState.draggedItemId)) {
            newOrder.push(this._dragState.draggedItemId);
        }

        return newOrder;
    }

    /**
     * Clean up drag state and visual elements
     */
    _cleanupDrag() {
        // Remove dragging class from dragged item
        if (this._dragState.draggedItem) {
            this._dragState.draggedItem.classList.remove('dragging');
        }

        // Remove placeholder
        this._removeDragPlaceholder();

        // Remove touch clone if exists
        if (this._dragState.touchClone && this._dragState.touchClone.parentNode) {
            this._dragState.touchClone.parentNode.removeChild(this._dragState.touchClone);
        }

        // Reset drag state
        this._dragState = {
            draggedItem: null,
            draggedItemId: null,
            placeholder: null,
            touchClone: null,
            touchStartY: 0,
            isDragging: false
        };
    }

    // ==================== TOUCH SUPPORT FOR MOBILE ====================
    // Requirement 4.4: Support touch gestures for mobile

    /**
     * Handle touch start event for mobile drag-and-drop
     * @param {TouchEvent} e - The touch event
     */
    _handleItemTouchStart(e) {
        const itemEl = e.target.closest('.kanban-checklist-item');
        if (!itemEl) return;

        // Check if touch started on drag handle or item itself (not on buttons/checkbox)
        const target = e.target;
        if (target.closest('.kanban-checklist-item-btn') ||
            target.closest('.kanban-checklist-checkbox')) {
            return; // Don't start drag on interactive elements
        }

        const touch = e.touches[0];

        this._dragState.draggedItem = itemEl;
        this._dragState.draggedItemId = itemEl.dataset.itemId;
        this._dragState.touchStartY = touch.clientY;
        this._dragState.isDragging = true;

        // Add dragging class
        itemEl.classList.add('dragging');

        // Create placeholder
        this._createDragPlaceholder(itemEl);

        // Create visual clone for touch dragging
        this._createTouchClone(itemEl, touch);

        e.preventDefault();
    }

    /**
     * Handle touch move event for mobile drag-and-drop
     * @param {TouchEvent} e - The touch event
     */
    _handleItemTouchMove(e) {
        if (!this._dragState.isDragging || !this._dragState.touchClone) return;

        const touch = e.touches[0];
        const itemsContainer = this._itemsContainer;

        // Move the clone
        this._dragState.touchClone.style.top = `${touch.clientY - this._dragState.touchClone.offsetHeight / 2}px`;

        // Find element under touch point (excluding the clone)
        this._dragState.touchClone.style.pointerEvents = 'none';
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        this._dragState.touchClone.style.pointerEvents = '';

        if (!itemsContainer || !this._dragState.placeholder) return;

        // Calculate drop position
        const items = Array.from(itemsContainer.querySelectorAll('.kanban-checklist-item:not(.dragging):not(.drag-placeholder)'));

        let insertBefore = null;
        for (const item of items) {
            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            if (touch.clientY < midY) {
                insertBefore = item;
                break;
            }
        }

        // Move placeholder
        if (insertBefore) {
            itemsContainer.insertBefore(this._dragState.placeholder, insertBefore);
        } else {
            itemsContainer.appendChild(this._dragState.placeholder);
        }

        e.preventDefault();
    }

    /**
     * Handle touch end event for mobile drag-and-drop
     * @param {TouchEvent} e - The touch event
     */
    async _handleItemTouchEnd(e) {
        if (!this._dragState.isDragging) return;

        // Calculate new order based on placeholder position
        const newOrder = this._calculateNewOrder();

        // Clean up drag state
        this._cleanupDrag();

        // Call service to reorder items
        if (newOrder && newOrder.length > 0) {
            try {
                await this.kanbanService.reorderChecklistItems(this.cardId, newOrder);

                // Update local items with new order
                newOrder.forEach((itemId, index) => {
                    const item = this.items.find(i => i.id === itemId);
                    if (item) {
                        item.order_index = index;
                    }
                });

                // Re-render to reflect new order
                await this.render();
            } catch (error) {
                console.error('Failed to reorder checklist items:', error);
                this._showError('Failed to reorder items');
                // Re-render to restore original order
                await this.render();
            }
        }
    }

    /**
     * Create a visual clone for touch dragging
     * @param {HTMLElement} itemEl - The item being dragged
     * @param {Touch} touch - The touch object
     */
    _createTouchClone(itemEl, touch) {
        const clone = itemEl.cloneNode(true);
        clone.classList.add('touch-drag-clone');
        clone.style.position = 'fixed';
        clone.style.zIndex = '10000';
        clone.style.pointerEvents = 'none';
        clone.style.opacity = '0.8';
        clone.style.width = `${itemEl.offsetWidth}px`;
        clone.style.left = `${itemEl.getBoundingClientRect().left}px`;
        clone.style.top = `${touch.clientY - itemEl.offsetHeight / 2}px`;
        clone.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        clone.style.transform = 'scale(1.02)';

        document.body.appendChild(clone);
        this._dragState.touchClone = clone;
    }

    /**
     * Destroy the component and cleanup resources
     */
    destroy() {
        // Clean up any active drag operation
        if (this._dragState) {
            this._cleanupDrag();
        }

        // Remove all event listeners
        this._eventListeners.forEach(({ element, event, handler }) => {
            element?.removeEventListener(event, handler);
        });
        this._eventListeners = [];

        // Remove online/offline event listeners
        if (this._handleOnline) {
            window.removeEventListener('online', this._handleOnline);
        }
        if (this._handleOffline) {
            window.removeEventListener('offline', this._handleOffline);
        }

        // Clear editing state
        this._editingItemId = null;

        // Clear offline state
        this._isOffline = false;
        this._hasQueuedOperations = false;

        // Clear items
        this.items = [];

        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }

        // Clear drag handler if exists
        if (this.dragHandler) {
            this.dragHandler = null;
        }

        // Clear items container reference
        this._itemsContainer = null;
    }
}

/**
 * AttachmentsComponent - Handles file attachments for Kanban cards
 * Displays attachments, handles uploads with progress, and manages deletions
 * 
 * Requirements: 5.1, 5.4, 6.1, 6.6, 7.1
 */
class AttachmentsComponent {
    /**
     * Create an AttachmentsComponent instance
     * @param {string} cardId - The ID of the card this attachment list belongs to
     * @param {HTMLElement} container - The container element to render into
     * @param {Object} kanbanService - The KanbanService instance for data operations
     */
    constructor(cardId, container, kanbanService) {
        this.cardId = cardId;
        this.container = container;
        this.kanbanService = kanbanService;
        this.attachments = [];
        this._eventListeners = [];
        this._uploadInProgress = false;
    }

    /**
     * Initialize the attachments component
     * Loads attachments from the service and renders the UI
     * Requirement 5.1: Display "Add Attachment" button in card detail view
     */
    async init() {
        try {
            // Load attachments from service
            this.attachments = await this.kanbanService.getAttachments(this.cardId);

            // Render the component
            await this.render();
        } catch (error) {
            console.error('Failed to initialize attachments:', error);
            this._showError('Failed to load attachments');
        }
    }

    /**
     * Render the complete attachments UI
     * Requirement 6.1: Display attachments in a list within the card detail view
     */
    async render() {
        if (!this.container) return;

        // Clear existing content and event listeners
        this._cleanupEventListeners();
        this.container.innerHTML = '';

        // Create main attachments container
        const attachmentsEl = document.createElement('div');
        attachmentsEl.className = 'kanban-attachments';

        // Render header
        const headerEl = this._renderHeader();
        attachmentsEl.appendChild(headerEl);

        // Render upload area
        const uploadEl = this._renderUploadArea();
        attachmentsEl.appendChild(uploadEl);

        // Render attachments list
        const listEl = document.createElement('div');
        listEl.className = 'kanban-attachments-list';
        listEl.setAttribute('role', 'list');
        listEl.setAttribute('aria-label', 'File attachments');

        if (this.attachments.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'kanban-attachments-empty';
            emptyEl.textContent = 'No attachments yet';
            listEl.appendChild(emptyEl);
        } else {
            // Sort by created_at descending (newest first)
            const sortedAttachments = [...this.attachments].sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
            sortedAttachments.forEach(attachment => {
                const attachmentEl = this.renderAttachment(attachment);
                listEl.appendChild(attachmentEl);
            });
        }

        attachmentsEl.appendChild(listEl);

        // Add to container
        this.container.appendChild(attachmentsEl);
    }

    /**
     * Render the attachments header with title and count
     * @returns {HTMLElement} Header element
     */
    _renderHeader() {
        const header = document.createElement('div');
        header.className = 'kanban-attachments-header';

        const title = document.createElement('h4');
        title.className = 'kanban-attachments-title';
        title.textContent = 'Attachments';

        const count = document.createElement('span');
        count.className = 'kanban-attachments-count';
        count.textContent = this.attachments.length > 0 ? `(${this.attachments.length})` : '';

        header.appendChild(title);
        header.appendChild(count);

        return header;
    }

    /**
     * Render the file upload area
     * Requirement 5.1: Display "Add Attachment" button
     * Requirement 5.8: Disable upload when offline and show indicator
     * @returns {HTMLElement} Upload area element
     */
    _renderUploadArea() {
        const uploadArea = document.createElement('div');
        uploadArea.className = 'kanban-attachments-upload';

        // Offline indicator - Requirement 5.8
        const offlineIndicator = document.createElement('div');
        offlineIndicator.className = 'kanban-attachments-offline-indicator';
        offlineIndicator.style.display = 'none';
        offlineIndicator.innerHTML = `
            <span class="offline-icon">📡</span>
            <span class="offline-text">Attachment uploads require an internet connection</span>
        `;
        this._offlineIndicator = offlineIndicator;

        // Hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.className = 'kanban-attachments-file-input';
        fileInput.id = `attachment-input-${this.cardId}`;
        fileInput.setAttribute('aria-label', 'Select file to upload');
        // Accept common file types
        fileInput.accept = 'image/*,.pdf,.doc,.docx,.txt,.csv,.zip';

        // Upload button
        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'kanban-attachments-upload-btn';
        uploadBtn.innerHTML = '<span class="upload-icon">📎</span> Add Attachment';
        uploadBtn.setAttribute('aria-label', 'Add attachment');

        // Progress container (hidden by default)
        const progressContainer = document.createElement('div');
        progressContainer.className = 'kanban-attachments-progress';
        progressContainer.style.display = 'none';

        const progressBar = document.createElement('div');
        progressBar.className = 'kanban-attachments-progress-bar';

        const progressFill = document.createElement('div');
        progressFill.className = 'kanban-attachments-progress-fill';

        const progressText = document.createElement('span');
        progressText.className = 'kanban-attachments-progress-text';
        progressText.textContent = 'Uploading...';

        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);

        // Handle file selection
        const handleFileChange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.uploadFile(file);
                // Reset input to allow re-uploading same file
                fileInput.value = '';
            }
        };

        // Handle button click to trigger file input
        const handleButtonClick = () => {
            if (!this._uploadInProgress && navigator.onLine) {
                fileInput.click();
            } else if (!navigator.onLine) {
                this._showError('Attachment uploads require an internet connection');
            }
        };

        fileInput.addEventListener('change', handleFileChange);
        uploadBtn.addEventListener('click', handleButtonClick);

        // Track listeners for cleanup
        this._eventListeners.push(
            { element: fileInput, event: 'change', handler: handleFileChange },
            { element: uploadBtn, event: 'click', handler: handleButtonClick }
        );

        // Set up online/offline event listeners - Requirement 5.8
        const handleOnline = () => this._updateOfflineState(false);
        const handleOffline = () => this._updateOfflineState(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        this._eventListeners.push(
            { element: window, event: 'online', handler: handleOnline },
            { element: window, event: 'offline', handler: handleOffline }
        );

        uploadArea.appendChild(offlineIndicator);
        uploadArea.appendChild(fileInput);
        uploadArea.appendChild(uploadBtn);
        uploadArea.appendChild(progressContainer);

        // Store references for progress updates
        this._progressContainer = progressContainer;
        this._progressFill = progressFill;
        this._progressText = progressText;
        this._uploadBtn = uploadBtn;

        // Initialize offline state
        this._updateOfflineState(!navigator.onLine);

        return uploadArea;
    }

    /**
     * Update the UI based on offline state
     * Requirement 5.8: Disable upload when offline and show indicator
     * @param {boolean} isOffline - Whether the app is offline
     */
    _updateOfflineState(isOffline) {
        if (this._uploadBtn) {
            this._uploadBtn.disabled = isOffline;
            if (isOffline) {
                this._uploadBtn.classList.add('disabled');
                this._uploadBtn.setAttribute('aria-disabled', 'true');
                this._uploadBtn.title = 'Attachment uploads require an internet connection';
            } else {
                this._uploadBtn.classList.remove('disabled');
                this._uploadBtn.removeAttribute('aria-disabled');
                this._uploadBtn.title = '';
            }
        }

        if (this._offlineIndicator) {
            this._offlineIndicator.style.display = isOffline ? 'flex' : 'none';
            if (isOffline) {
                this._offlineIndicator.classList.add('offline');
            } else {
                this._offlineIndicator.classList.remove('offline');
            }
        }
    }

    /**
     * Upload a file with progress indicator
     * Requirement 5.4: Display progress indicator during upload
     * @param {File} file - The file to upload
     */
    async uploadFile(file) {
        if (this._uploadInProgress) {
            this._showError('Upload already in progress');
            return;
        }

        // Check if online (Requirement 5.8)
        if (!navigator.onLine) {
            this._showError('Attachment uploads require an internet connection');
            return;
        }

        this._uploadInProgress = true;

        // Show progress indicator
        if (this._progressContainer) {
            this._progressContainer.style.display = 'flex';
        }
        if (this._uploadBtn) {
            this._uploadBtn.disabled = true;
            this._uploadBtn.classList.add('uploading');
        }

        // Progress callback
        const onProgress = (progress) => {
            if (this._progressFill) {
                this._progressFill.style.width = `${progress}%`;
            }
            if (this._progressText) {
                this._progressText.textContent = `Uploading... ${Math.round(progress)}%`;
            }
        };

        try {
            // Upload via service
            const newAttachment = await this.kanbanService.uploadAttachment(
                this.cardId,
                file,
                onProgress
            );

            // Add to local attachments array
            this.attachments.push(newAttachment);

            // Re-render to show new attachment
            await this.render();

            this._showSuccess('File uploaded successfully');
        } catch (error) {
            console.error('Failed to upload file:', error);

            // Show specific error message if available
            if (error.message.includes('File size')) {
                this._showError('File size must be 10MB or less');
            } else if (error.message.includes('File type')) {
                this._showError('File type not supported');
            } else {
                this._showError('Failed to upload file. Please try again.');
            }
        } finally {
            this._uploadInProgress = false;

            // Hide progress indicator
            if (this._progressContainer) {
                this._progressContainer.style.display = 'none';
            }
            if (this._progressFill) {
                this._progressFill.style.width = '0%';
            }
            if (this._uploadBtn) {
                this._uploadBtn.disabled = false;
                this._uploadBtn.classList.remove('uploading');
            }
        }
    }

    /**
     * Delete an attachment with confirmation
     * Requirement 7.1: Prompt for confirmation before deletion
     * Requirement 7.5: Prevent deletion when offline with message
     * @param {string} attachmentId - The ID of the attachment to delete
     */
    async deleteAttachment(attachmentId) {
        // Check if online (Requirement 7.5)
        if (!navigator.onLine) {
            this._showError('Attachment deletion requires an internet connection. Please try again when online.');
            return;
        }

        // Find the attachment for confirmation message
        const attachment = this.attachments.find(a => a.id === attachmentId);
        if (!attachment) return;

        // Show confirmation dialog
        const confirmed = await this._confirmDelete(attachment.file_name);
        if (!confirmed) return;

        try {
            // Delete via service
            await this.kanbanService.deleteAttachment(attachmentId);

            // Remove from local attachments array
            this.attachments = this.attachments.filter(a => a.id !== attachmentId);

            // Re-render to remove attachment from UI
            await this.render();

            this._showSuccess('Attachment deleted');
        } catch (error) {
            console.error('Failed to delete attachment:', error);
            // Show specific error message if it's an offline error
            if (error.message.includes('internet connection')) {
                this._showError(error.message);
            } else {
                this._showError('Failed to delete attachment. Please try again.');
            }
        }
    }

    /**
     * Render a single attachment item
     * Requirement 6.6: Display file name, file type icon, and file size
     * Requirement 6.2: Display inline thumbnail preview for image attachments
     * @param {Object} attachment - Attachment data
     * @returns {HTMLElement} Attachment element
     */
    renderAttachment(attachment) {
        const attachmentEl = document.createElement('div');
        attachmentEl.className = 'kanban-attachment-item';
        attachmentEl.dataset.attachmentId = attachment.id;
        attachmentEl.setAttribute('role', 'listitem');

        const isImage = this.isImageType(attachment.file_type);

        // For images, render thumbnail preview (Requirement 6.2)
        if (isImage) {
            const thumbnailEl = this.renderImagePreview(attachment);
            attachmentEl.appendChild(thumbnailEl);
        } else {
            // File icon based on type for non-images
            const iconEl = document.createElement('span');
            iconEl.className = 'kanban-attachment-icon';
            iconEl.innerHTML = this.getFileIcon(attachment.file_type);
            iconEl.setAttribute('aria-hidden', 'true');
            attachmentEl.appendChild(iconEl);
        }

        // File info container
        const infoEl = document.createElement('div');
        infoEl.className = 'kanban-attachment-info';

        // File name (clickable to preview/download)
        const nameEl = document.createElement('button');
        nameEl.type = 'button';
        nameEl.className = 'kanban-attachment-name kanban-attachment-name-btn';
        nameEl.textContent = attachment.file_name;

        if (isImage) {
            // Requirement 6.3: Open larger preview modal when clicking image attachment
            nameEl.setAttribute('aria-label', `Preview ${attachment.file_name}`);
            const handleNameClick = (e) => {
                e.preventDefault();
                this.openImageModal(attachment);
            };
            nameEl.addEventListener('click', handleNameClick);
            this._eventListeners.push({ element: nameEl, event: 'click', handler: handleNameClick });
        } else {
            // Requirement 6.4: Initiate file download when clicking non-image attachment
            nameEl.setAttribute('aria-label', `Download ${attachment.file_name}`);
            const handleNameClick = (e) => {
                e.preventDefault();
                this.downloadFile(attachment);
            };
            nameEl.addEventListener('click', handleNameClick);
            this._eventListeners.push({ element: nameEl, event: 'click', handler: handleNameClick });
        }

        // File size
        const sizeEl = document.createElement('span');
        sizeEl.className = 'kanban-attachment-size';
        sizeEl.textContent = this.formatFileSize(attachment.file_size);

        infoEl.appendChild(nameEl);
        infoEl.appendChild(sizeEl);

        // Actions container
        const actionsEl = document.createElement('div');
        actionsEl.className = 'kanban-attachment-actions';

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'kanban-attachment-delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.setAttribute('aria-label', `Delete ${attachment.file_name}`);
        deleteBtn.title = 'Delete attachment';

        const handleDeleteClick = async () => {
            await this.deleteAttachment(attachment.id);
        };
        deleteBtn.addEventListener('click', handleDeleteClick);
        this._eventListeners.push({ element: deleteBtn, event: 'click', handler: handleDeleteClick });

        actionsEl.appendChild(deleteBtn);

        attachmentEl.appendChild(infoEl);
        attachmentEl.appendChild(actionsEl);

        return attachmentEl;
    }

    /**
     * Check if a file type is an image
     * @param {string} fileType - MIME type of the file
     * @returns {boolean} True if the file is an image
     */
    isImageType(fileType) {
        if (!fileType) return false;
        return fileType.startsWith('image/');
    }

    /**
     * Render inline thumbnail preview for image attachments
     * Requirement 6.2: Display inline thumbnail preview for image attachments
     * @param {Object} attachment - Attachment data with url property
     * @returns {HTMLElement} Thumbnail element
     */
    renderImagePreview(attachment) {
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.className = 'kanban-attachment-thumbnail';

        const thumbnailImg = document.createElement('img');
        thumbnailImg.src = attachment.url || '';
        thumbnailImg.alt = attachment.file_name;
        thumbnailImg.className = 'kanban-attachment-thumbnail-img';
        thumbnailImg.loading = 'lazy';

        // Handle image load error - show placeholder
        thumbnailImg.onerror = () => {
            thumbnailImg.style.display = 'none';
            const placeholder = document.createElement('span');
            placeholder.className = 'kanban-attachment-thumbnail-placeholder';
            placeholder.innerHTML = '🖼️';
            thumbnailContainer.appendChild(placeholder);
        };

        // Make thumbnail clickable to open modal (Requirement 6.3)
        thumbnailContainer.style.cursor = 'pointer';
        thumbnailContainer.setAttribute('role', 'button');
        thumbnailContainer.setAttribute('tabindex', '0');
        thumbnailContainer.setAttribute('aria-label', `Preview ${attachment.file_name}`);

        const handleThumbnailClick = () => {
            this.openImageModal(attachment);
        };

        const handleThumbnailKeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openImageModal(attachment);
            }
        };

        thumbnailContainer.addEventListener('click', handleThumbnailClick);
        thumbnailContainer.addEventListener('keydown', handleThumbnailKeydown);
        this._eventListeners.push(
            { element: thumbnailContainer, event: 'click', handler: handleThumbnailClick },
            { element: thumbnailContainer, event: 'keydown', handler: handleThumbnailKeydown }
        );

        thumbnailContainer.appendChild(thumbnailImg);

        return thumbnailContainer;
    }

    /**
     * Open full-size image preview modal
     * Requirement 6.3: Open larger preview modal when clicking image attachment
     * @param {Object} attachment - Attachment data with url and file_name
     */
    openImageModal(attachment) {
        // Check if modal already exists, remove it first
        const existingModal = document.getElementById('image-preview-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'image-preview-modal';
        modal.className = 'kanban-image-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', `Image preview: ${attachment.file_name}`);

        // Modal content container
        const modalContent = document.createElement('div');
        modalContent.className = 'kanban-image-modal-content';

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'kanban-image-modal-close';
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', 'Close image preview');
        closeBtn.title = 'Close';

        // Image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'kanban-image-modal-image-container';

        // Full-size image
        const image = document.createElement('img');
        image.src = attachment.url || '';
        image.alt = attachment.file_name;
        image.className = 'kanban-image-modal-image';

        // Image caption with file name
        const caption = document.createElement('div');
        caption.className = 'kanban-image-modal-caption';
        caption.textContent = attachment.file_name;

        // Download button in modal
        const downloadBtn = document.createElement('button');
        downloadBtn.type = 'button';
        downloadBtn.className = 'kanban-image-modal-download';
        downloadBtn.innerHTML = '⬇️ Download';
        downloadBtn.setAttribute('aria-label', `Download ${attachment.file_name}`);

        // Event handlers
        const closeModal = () => {
            modal.remove();
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEscape);
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };

        const handleBackdropClick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };

        const handleDownloadClick = () => {
            this.downloadFile(attachment);
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', handleBackdropClick);
        downloadBtn.addEventListener('click', handleDownloadClick);
        document.addEventListener('keydown', handleEscape);

        // Assemble modal
        imageContainer.appendChild(image);
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(imageContainer);
        modalContent.appendChild(caption);
        modalContent.appendChild(downloadBtn);
        modal.appendChild(modalContent);

        // Add to document and prevent body scroll
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Focus close button for accessibility
        closeBtn.focus();
    }

    /**
     * Initiate file download for attachments
     * Requirement 6.4: Initiate file download when clicking non-image attachment
     * @param {Object} attachment - Attachment data with url and file_name
     */
    downloadFile(attachment) {
        if (!attachment.url) {
            this._showError('Download URL not available');
            return;
        }

        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.file_name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        // For cross-origin URLs, we need to fetch and create a blob
        // This ensures the download attribute works properly
        fetch(attachment.url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch file');
                }
                return response.blob();
            })
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                link.href = blobUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            })
            .catch(error => {
                console.error('Download failed:', error);
                // Fallback: open in new tab
                window.open(attachment.url, '_blank', 'noopener,noreferrer');
            });
    }

    /**
     * Get appropriate file icon based on file type
     * Requirement 6.6: Display file type icon
     * @param {string} fileType - MIME type of the file
     * @returns {string} Icon emoji or HTML
     */
    getFileIcon(fileType) {
        if (!fileType) return '📄';

        // Image types
        if (fileType.startsWith('image/')) {
            return '🖼️';
        }

        // Document types
        if (fileType === 'application/pdf') {
            return '📕';
        }

        if (fileType === 'application/msword' ||
            fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return '📘';
        }

        // Spreadsheet/CSV
        if (fileType === 'text/csv' ||
            fileType === 'application/vnd.ms-excel' ||
            fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            return '📊';
        }

        // Text files
        if (fileType === 'text/plain') {
            return '📝';
        }

        // Archive files
        if (fileType === 'application/zip' ||
            fileType === 'application/x-zip-compressed' ||
            fileType === 'application/x-rar-compressed') {
            return '📦';
        }

        // Default
        return '📄';
    }

    /**
     * Format file size in human-readable format
     * Requirement 6.6: Display file size
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0 || bytes === undefined || bytes === null) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        // Ensure we don't exceed our units array
        const unitIndex = Math.min(i, units.length - 1);

        return `${parseFloat((bytes / Math.pow(k, unitIndex)).toFixed(1))} ${units[unitIndex]}`;
    }

    /**
     * Show confirmation dialog for deletion
     * @param {string} fileName - The name of the file being deleted
     * @returns {Promise<boolean>} True if confirmed, false otherwise
     */
    async _confirmDelete(fileName) {
        // Use the existing delete confirmation modal if available
        const modal = document.getElementById('delete-confirm-modal');
        if (modal) {
            return new Promise((resolve) => {
                const messageEl = document.getElementById('delete-confirm-message');
                if (messageEl) {
                    messageEl.textContent = `Are you sure you want to delete "${fileName}"?`;
                }

                const confirmBtn = document.getElementById('confirm-delete-btn');
                const cancelBtns = modal.querySelectorAll('.modal-close');

                const cleanup = () => {
                    modal.style.display = 'none';
                    confirmBtn?.removeEventListener('click', handleConfirm);
                    cancelBtns.forEach(btn => btn.removeEventListener('click', handleCancel));
                    modal.removeEventListener('click', handleBackdrop);
                };

                const handleConfirm = () => {
                    cleanup();
                    resolve(true);
                };

                const handleCancel = () => {
                    cleanup();
                    resolve(false);
                };

                const handleBackdrop = (e) => {
                    if (e.target === modal) {
                        cleanup();
                        resolve(false);
                    }
                };

                confirmBtn?.addEventListener('click', handleConfirm);
                cancelBtns.forEach(btn => btn.addEventListener('click', handleCancel));
                modal.addEventListener('click', handleBackdrop);

                modal.style.display = 'flex';
            });
        }

        // Fallback to browser confirm
        return confirm(`Are you sure you want to delete "${fileName}"?`);
    }

    /**
     * Clean up event listeners
     */
    _cleanupEventListeners() {
        this._eventListeners.forEach(({ element, event, handler }) => {
            element?.removeEventListener(event, handler);
        });
        this._eventListeners = [];
    }

    /**
     * Show success message using toast if available
     * @param {string} message - Success message
     */
    _showSuccess(message) {
        if (typeof Toast !== 'undefined' && Toast.success) {
            Toast.success(message);
        } else if (typeof window.showToast === 'function') {
            window.showToast(message, 'success');
        }
    }

    /**
     * Show error message using toast if available
     * @param {string} message - Error message
     */
    _showError(message) {
        if (typeof Toast !== 'undefined' && Toast.error) {
            Toast.error(message);
        } else if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
        } else {
            console.error(message);
        }
    }

    /**
     * Destroy the component and cleanup resources
     */
    destroy() {
        // Clean up event listeners
        this._cleanupEventListeners();

        // Clear attachments
        this.attachments = [];

        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }

        // Clear references
        this._progressContainer = null;
        this._progressFill = null;
        this._progressText = null;
        this._uploadBtn = null;
    }
}

/**
 * CommentsComponent - Manages comments for a Kanban card
 * Displays comments, handles adding/editing/deleting with ownership checks
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 8.6, 9.5, 13.4
 */
class CommentsComponent {
    /**
     * Create a CommentsComponent instance
     * @param {string} cardId - The ID of the card this comment list belongs to
     * @param {HTMLElement} container - The container element to render into
     * @param {Object} kanbanService - The KanbanService instance for data operations
     * @param {string} currentUserId - The current user's ID for ownership checks
     */
    constructor(cardId, container, kanbanService, currentUserId) {
        this.cardId = cardId;
        this.container = container;
        this.kanbanService = kanbanService;
        this.currentUserId = currentUserId;
        this.comments = [];
        this._eventListeners = [];
        this._editingCommentId = null;
        this._isOffline = false;
        this._hasQueuedOperations = false;

        // Listen for online/offline events - Requirement 8.6, 9.5, 13.4
        this._handleOnline = () => this._onOnlineStatusChange(true);
        this._handleOffline = () => this._onOnlineStatusChange(false);
        window.addEventListener('online', this._handleOnline);
        window.addEventListener('offline', this._handleOffline);
    }

    /**
     * Handle online/offline status changes
     * @param {boolean} isOnline - Whether the app is now online
     * @private
     */
    _onOnlineStatusChange(isOnline) {
        this._isOffline = !isOnline;
        // Re-render to update offline indicator
        this.render();

        if (isOnline && this._hasQueuedOperations) {
            this._showSuccess('Back online - syncing changes...');
            this._hasQueuedOperations = false;
        }
    }

    /**
     * Initialize the comments component
     * Loads comments from the service and renders the UI
     * Requirement 8.1: Display comment input area in card detail view
     * Requirement 13.4: Allow viewing cached comments when offline
     */
    async init() {
        try {
            // Load comments from service (returns {comments, isOffline})
            const result = await this.kanbanService.getComments(this.cardId);
            // Handle both new format {comments, isOffline} and old format (array)
            if (Array.isArray(result)) {
                this.comments = result;
                this._isOffline = !navigator.onLine;
            } else {
                this.comments = result.comments || [];
                this._isOffline = result.isOffline || !navigator.onLine;
            }

            // Render the component
            await this.render();
        } catch (error) {
            console.error('Failed to initialize comments:', error);
            this._showError('Failed to load comments');
        }
    }

    /**
     * Render the complete comments UI
     * Requirement 8.5: Display comments in reverse chronological order (newest first)
     * Requirement 13.4: Display cached comments when offline
     */
    async render() {
        if (!this.container) return;

        // Clear existing content and event listeners
        this._cleanupEventListeners();
        this.container.innerHTML = '';

        // Create main comments container
        const commentsEl = document.createElement('div');
        commentsEl.className = 'kanban-comments';

        // Render offline indicator if offline or has queued operations - Requirement 8.6, 9.5, 13.4
        if (this._isOffline || this._hasQueuedOperations) {
            const offlineIndicator = this._renderOfflineIndicator();
            commentsEl.appendChild(offlineIndicator);
        }

        // Render header
        const headerEl = this._renderHeader();
        commentsEl.appendChild(headerEl);

        // Render comment input area (Requirement 8.1)
        const inputEl = this._renderCommentInput();
        commentsEl.appendChild(inputEl);

        // Render comments list
        const listEl = document.createElement('div');
        listEl.className = 'kanban-comments-list';
        listEl.setAttribute('role', 'list');
        listEl.setAttribute('aria-label', 'Comments');

        if (this.comments.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'kanban-comments-empty';
            emptyEl.textContent = 'No comments yet. Be the first to comment!';
            listEl.appendChild(emptyEl);
        } else {
            // Sort by created_at descending (newest first) - Requirement 8.5
            const sortedComments = [...this.comments].sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
            sortedComments.forEach(comment => {
                const commentEl = this.renderComment(comment);
                listEl.appendChild(commentEl);
            });
        }

        commentsEl.appendChild(listEl);

        // Add to container
        this.container.appendChild(commentsEl);
    }

    /**
     * Render the offline indicator
     * Requirement 8.6, 9.5: Show offline indicator when operations are queued
     * Requirement 13.4: Show indicator when viewing cached data
     * @returns {HTMLElement} Offline indicator element
     * @private
     */
    _renderOfflineIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'kanban-comments-offline-indicator';
        indicator.setAttribute('role', 'status');
        indicator.setAttribute('aria-live', 'polite');

        const icon = document.createElement('span');
        icon.className = 'offline-icon';
        icon.innerHTML = '📡';
        icon.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.className = 'offline-text';

        if (this._isOffline) {
            text.textContent = 'You are offline. Viewing cached comments.';
            indicator.classList.add('offline');
        } else if (this._hasQueuedOperations) {
            text.textContent = 'Changes queued for sync.';
            indicator.classList.add('queued');
        }

        indicator.appendChild(icon);
        indicator.appendChild(text);

        return indicator;
    }

    /**
     * Render the comments header with title and count
     * @returns {HTMLElement} Header element
     */
    _renderHeader() {
        const header = document.createElement('div');
        header.className = 'kanban-comments-header';

        const title = document.createElement('h4');
        title.className = 'kanban-comments-title';
        title.textContent = 'Comments';

        const count = document.createElement('span');
        count.className = 'kanban-comments-count';
        count.textContent = this.comments.length > 0 ? `(${this.comments.length})` : '';

        header.appendChild(title);
        header.appendChild(count);

        return header;
    }

    /**
     * Render the comment input area
     * Requirement 8.1: Display comment input area in card detail view
     * @returns {HTMLElement} Comment input element
     */
    _renderCommentInput() {
        const inputContainer = document.createElement('div');
        inputContainer.className = 'kanban-comments-input-container';

        // Textarea for comment input
        const textarea = document.createElement('textarea');
        textarea.className = 'kanban-comments-textarea';
        textarea.placeholder = 'Write a comment...';
        textarea.setAttribute('aria-label', 'Write a comment');
        textarea.rows = 3;

        // Submit button
        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'kanban-comments-submit-btn';
        submitBtn.textContent = 'Add Comment';
        submitBtn.setAttribute('aria-label', 'Add comment');

        // Handle submit on button click
        const handleSubmit = async () => {
            const text = textarea.value.trim();
            if (text) {
                await this.addComment(text);
                textarea.value = '';
            }
        };

        // Handle submit on Ctrl+Enter
        const handleKeydown = async (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                await handleSubmit();
            }
        };

        submitBtn.addEventListener('click', handleSubmit);
        textarea.addEventListener('keydown', handleKeydown);

        // Track listeners for cleanup
        this._eventListeners.push(
            { element: submitBtn, event: 'click', handler: handleSubmit },
            { element: textarea, event: 'keydown', handler: handleKeydown }
        );

        inputContainer.appendChild(textarea);
        inputContainer.appendChild(submitBtn);

        return inputContainer;
    }

    /**
     * Add a new comment
     * Requirement 8.2: Create comment with text, user_id, and timestamp
     * Requirement 8.3: Prevent empty comment submission
     * Requirement 8.4: Display comment immediately in comments list
     * Requirement 8.6: Queue comment creation for sync when offline
     * @param {string} text - Comment text
     */
    async addComment(text) {
        // Validate text is not empty (Requirement 8.3)
        if (!text || !text.trim()) {
            this._showError('Comment cannot be empty');
            return;
        }

        try {
            // Create comment via service (returns {comment, queued})
            const result = await this.kanbanService.createComment(this.cardId, text);

            // Handle both new format {comment, queued} and old format (comment object)
            const newComment = result.comment || result;
            const wasQueued = result.queued || false;

            // Add to local comments array (Requirement 8.4 - display immediately)
            this.comments.push(newComment);

            // Track if we have queued operations
            if (wasQueued) {
                this._hasQueuedOperations = true;
            }

            // Re-render to show new comment
            await this.render();

            if (wasQueued) {
                this._showSuccess('Comment added (will sync when online)');
            } else {
                this._showSuccess('Comment added');
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
            this._showError('Failed to add comment. Please try again.');
        }
    }

    /**
     * Edit an existing comment
     * Requirement 9.2: Update text and add "edited" indicator with timestamp
     * Requirement 9.5: Queue comment edits for sync when offline
     * @param {string} commentId - The ID of the comment to edit
     * @param {string} text - New comment text
     */
    async editComment(commentId, text) {
        // Validate text is not empty
        if (!text || !text.trim()) {
            this._showError('Comment cannot be empty');
            return;
        }

        try {
            // Update comment via service (returns {comment, queued})
            const result = await this.kanbanService.updateComment(commentId, text);

            // Handle both new format {comment, queued} and old format (comment object)
            const updatedComment = result.comment || result;
            const wasQueued = result.queued || false;

            // Update in local comments array
            const index = this.comments.findIndex(c => c.id === commentId);
            if (index !== -1) {
                this.comments[index] = updatedComment;
            }

            // Track if we have queued operations
            if (wasQueued) {
                this._hasQueuedOperations = true;
            }

            // Clear editing state
            this._editingCommentId = null;

            // Re-render to show updated comment
            await this.render();

            if (wasQueued) {
                this._showSuccess('Comment updated (will sync when online)');
            } else {
                this._showSuccess('Comment updated');
            }
        } catch (error) {
            console.error('Failed to edit comment:', error);
            if (error.message.includes('only edit your own')) {
                this._showError('You can only edit your own comments');
            } else {
                this._showError('Failed to edit comment. Please try again.');
            }
        }
    }

    /**
     * Delete a comment with confirmation
     * Requirement 9.3: Remove comment after confirmation
     * Requirement 9.5: Queue comment deletions for sync when offline
     * @param {string} commentId - The ID of the comment to delete
     */
    async deleteComment(commentId) {
        // Find the comment for confirmation
        const comment = this.comments.find(c => c.id === commentId);
        if (!comment) return;

        // Show confirmation dialog
        const confirmed = await this._confirmDelete();
        if (!confirmed) return;

        try {
            // Delete via service (returns {queued})
            const result = await this.kanbanService.deleteComment(commentId);

            // Handle both new format {queued} and old format (void)
            const wasQueued = result?.queued || false;

            // Remove from local comments array
            this.comments = this.comments.filter(c => c.id !== commentId);

            // Track if we have queued operations
            if (wasQueued) {
                this._hasQueuedOperations = true;
            }

            // Re-render to remove comment from UI
            await this.render();

            if (wasQueued) {
                this._showSuccess('Comment deleted (will sync when online)');
            } else {
                this._showSuccess('Comment deleted');
            }
        } catch (error) {
            console.error('Failed to delete comment:', error);
            if (error.message.includes('only delete your own')) {
                this._showError('You can only delete your own comments');
            } else {
                this._showError('Failed to delete comment. Please try again.');
            }
        }
    }

    /**
     * Render a single comment item
     * Requirement 9.1: Display edit and delete buttons for user's own comments
     * Requirement 9.2: Show "edited" indicator for edited comments
     * @param {Object} comment - Comment data
     * @returns {HTMLElement} Comment element
     */
    renderComment(comment) {
        const commentEl = document.createElement('div');
        commentEl.className = 'kanban-comment-item';
        commentEl.dataset.commentId = comment.id;
        commentEl.setAttribute('role', 'listitem');

        // Check if this is the current user's comment (Requirement 9.1)
        const isOwner = comment.user_id === this.currentUserId;

        // Check if we're editing this comment
        const isEditing = this._editingCommentId === comment.id;

        // Comment header with user info and timestamp
        const headerEl = document.createElement('div');
        headerEl.className = 'kanban-comment-header';

        // User avatar placeholder
        const avatarEl = document.createElement('div');
        avatarEl.className = 'kanban-comment-avatar';
        avatarEl.textContent = '👤';
        avatarEl.setAttribute('aria-hidden', 'true');

        // User info container
        const userInfoEl = document.createElement('div');
        userInfoEl.className = 'kanban-comment-user-info';

        // User name (using user_id for now, could be enhanced with user lookup)
        const userNameEl = document.createElement('span');
        userNameEl.className = 'kanban-comment-user-name';
        userNameEl.textContent = isOwner ? 'You' : 'User';

        // Timestamp
        const timestampEl = document.createElement('span');
        timestampEl.className = 'kanban-comment-timestamp';
        timestampEl.textContent = this.formatTimestamp(comment.created_at);
        timestampEl.title = new Date(comment.created_at).toLocaleString();

        // Edited indicator (Requirement 9.2)
        if (comment.edited_at) {
            const editedEl = document.createElement('span');
            editedEl.className = 'kanban-comment-edited';
            editedEl.textContent = '(edited)';
            editedEl.title = `Edited ${this.formatTimestamp(comment.edited_at)}`;
            userInfoEl.appendChild(userNameEl);
            userInfoEl.appendChild(timestampEl);
            userInfoEl.appendChild(editedEl);
        } else {
            userInfoEl.appendChild(userNameEl);
            userInfoEl.appendChild(timestampEl);
        }

        headerEl.appendChild(avatarEl);
        headerEl.appendChild(userInfoEl);

        // Comment body
        const bodyEl = document.createElement('div');
        bodyEl.className = 'kanban-comment-body';

        if (isEditing) {
            // Render edit form
            const editForm = this._renderEditForm(comment);
            bodyEl.appendChild(editForm);
        } else {
            // Render comment text
            const textEl = document.createElement('p');
            textEl.className = 'kanban-comment-text';
            textEl.textContent = comment.text;
            bodyEl.appendChild(textEl);
        }

        // Actions container (only for owner) - Requirement 9.1
        if (isOwner && !isEditing) {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'kanban-comment-actions';

            // Edit button
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'kanban-comment-edit-btn';
            editBtn.innerHTML = '✏️';
            editBtn.setAttribute('aria-label', 'Edit comment');
            editBtn.title = 'Edit comment';

            const handleEditClick = () => {
                this._editingCommentId = comment.id;
                this.render();
            };
            editBtn.addEventListener('click', handleEditClick);
            this._eventListeners.push({ element: editBtn, event: 'click', handler: handleEditClick });

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'kanban-comment-delete-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.setAttribute('aria-label', 'Delete comment');
            deleteBtn.title = 'Delete comment';

            const handleDeleteClick = async () => {
                await this.deleteComment(comment.id);
            };
            deleteBtn.addEventListener('click', handleDeleteClick);
            this._eventListeners.push({ element: deleteBtn, event: 'click', handler: handleDeleteClick });

            actionsEl.appendChild(editBtn);
            actionsEl.appendChild(deleteBtn);
            headerEl.appendChild(actionsEl);
        }

        commentEl.appendChild(headerEl);
        commentEl.appendChild(bodyEl);

        return commentEl;
    }

    /**
     * Render the edit form for a comment
     * @param {Object} comment - Comment data
     * @returns {HTMLElement} Edit form element
     */
    _renderEditForm(comment) {
        const formEl = document.createElement('div');
        formEl.className = 'kanban-comment-edit-form';

        // Textarea with current text
        const textarea = document.createElement('textarea');
        textarea.className = 'kanban-comment-edit-textarea';
        textarea.value = comment.text;
        textarea.rows = 3;
        textarea.setAttribute('aria-label', 'Edit comment text');

        // Buttons container
        const buttonsEl = document.createElement('div');
        buttonsEl.className = 'kanban-comment-edit-buttons';

        // Save button
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'kanban-comment-save-btn';
        saveBtn.textContent = 'Save';
        saveBtn.setAttribute('aria-label', 'Save changes');

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'kanban-comment-cancel-btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.setAttribute('aria-label', 'Cancel editing');

        // Handle save
        const handleSave = async () => {
            const newText = textarea.value.trim();
            if (newText && newText !== comment.text) {
                await this.editComment(comment.id, newText);
            } else if (!newText) {
                this._showError('Comment cannot be empty');
            } else {
                // No changes, just cancel
                this._editingCommentId = null;
                this.render();
            }
        };

        // Handle cancel
        const handleCancel = () => {
            this._editingCommentId = null;
            this.render();
        };

        // Handle Escape key to cancel
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSave();
            }
        };

        saveBtn.addEventListener('click', handleSave);
        cancelBtn.addEventListener('click', handleCancel);
        textarea.addEventListener('keydown', handleKeydown);

        this._eventListeners.push(
            { element: saveBtn, event: 'click', handler: handleSave },
            { element: cancelBtn, event: 'click', handler: handleCancel },
            { element: textarea, event: 'keydown', handler: handleKeydown }
        );

        buttonsEl.appendChild(saveBtn);
        buttonsEl.appendChild(cancelBtn);

        formEl.appendChild(textarea);
        formEl.appendChild(buttonsEl);

        // Focus textarea after render
        setTimeout(() => textarea.focus(), 0);

        return formEl;
    }

    /**
     * Format timestamp in human-readable format (e.g., "2 hours ago")
     * @param {string} timestamp - ISO timestamp string
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (diffSecs < 60) {
            return 'just now';
        } else if (diffMins < 60) {
            return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
        } else if (diffHours < 24) {
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffDays < 7) {
            return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
        } else if (diffWeeks < 4) {
            return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
        } else if (diffMonths < 12) {
            return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
        } else {
            return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
        }
    }

    /**
     * Show confirmation dialog for deletion
     * @returns {Promise<boolean>} True if confirmed, false otherwise
     */
    async _confirmDelete() {
        // Use the existing delete confirmation modal if available
        const modal = document.getElementById('delete-confirm-modal');
        if (modal) {
            return new Promise((resolve) => {
                const messageEl = document.getElementById('delete-confirm-message');
                if (messageEl) {
                    messageEl.textContent = 'Are you sure you want to delete this comment?';
                }

                const confirmBtn = document.getElementById('confirm-delete-btn');
                const cancelBtns = modal.querySelectorAll('.modal-close');

                const cleanup = () => {
                    modal.style.display = 'none';
                    confirmBtn?.removeEventListener('click', handleConfirm);
                    cancelBtns.forEach(btn => btn.removeEventListener('click', handleCancel));
                    modal.removeEventListener('click', handleBackdrop);
                };

                const handleConfirm = () => {
                    cleanup();
                    resolve(true);
                };

                const handleCancel = () => {
                    cleanup();
                    resolve(false);
                };

                const handleBackdrop = (e) => {
                    if (e.target === modal) {
                        cleanup();
                        resolve(false);
                    }
                };

                confirmBtn?.addEventListener('click', handleConfirm);
                cancelBtns.forEach(btn => btn.addEventListener('click', handleCancel));
                modal.addEventListener('click', handleBackdrop);

                modal.style.display = 'flex';
            });
        }

        // Fallback to browser confirm
        return confirm('Are you sure you want to delete this comment?');
    }

    /**
     * Clean up event listeners
     */
    _cleanupEventListeners() {
        this._eventListeners.forEach(({ element, event, handler }) => {
            element?.removeEventListener(event, handler);
        });
        this._eventListeners = [];
    }

    /**
     * Show success message using toast if available
     * @param {string} message - Success message
     */
    _showSuccess(message) {
        if (typeof Toast !== 'undefined' && Toast.success) {
            Toast.success(message);
        } else if (typeof window.showToast === 'function') {
            window.showToast(message, 'success');
        }
    }

    /**
     * Show error message using toast if available
     * @param {string} message - Error message
     */
    _showError(message) {
        if (typeof Toast !== 'undefined' && Toast.error) {
            Toast.error(message);
        } else if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
        } else {
            console.error(message);
        }
    }

    /**
     * Destroy the component and cleanup resources
     */
    destroy() {
        // Clean up event listeners
        this._cleanupEventListeners();

        // Remove online/offline event listeners
        window.removeEventListener('online', this._handleOnline);
        window.removeEventListener('offline', this._handleOffline);

        // Clear comments
        this.comments = [];

        // Clear editing state
        this._editingCommentId = null;

        // Clear offline state
        this._isOffline = false;
        this._hasQueuedOperations = false;

        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}


/**
 * ActivityLogComponent - Displays chronological activity history for a card
 * Requirements: 10.1, 10.7, 10.8
 */
class ActivityLogComponent {
    /**
     * Create an ActivityLogComponent instance
     * @param {string} cardId - The ID of the card this activity log belongs to
     * @param {HTMLElement} container - The container element to render into
     * @param {Object} kanbanService - The KanbanService instance for data operations
     */
    constructor(cardId, container, kanbanService) {
        this.cardId = cardId;
        this.container = container;
        this.kanbanService = kanbanService;
        this.activities = [];
        this._eventListeners = [];
    }

    /**
     * Initialize the activity log component
     * Loads activity entries from the service and renders the UI
     * Requirement 10.1: Display activity log section in card detail view
     */
    async init() {
        try {
            // Load activity log from service
            this.activities = await this.kanbanService.getActivityLog(this.cardId);

            // Render the component
            await this.render();
        } catch (error) {
            console.error('Failed to initialize activity log:', error);
            this._showError('Failed to load activity log');
        }
    }

    /**
     * Render the complete activity log UI
     * Requirement 10.8: Display activity entries in reverse chronological order (newest first)
     */
    async render() {
        if (!this.container) return;

        // Clear existing content and event listeners
        this._cleanupEventListeners();
        this.container.innerHTML = '';

        // Create main activity log container
        const activityLogEl = document.createElement('div');
        activityLogEl.className = 'kanban-activity-log';

        // Render header
        const headerEl = this._renderHeader();
        activityLogEl.appendChild(headerEl);

        // Render activity list
        const listEl = document.createElement('div');
        listEl.className = 'kanban-activity-list';
        listEl.setAttribute('role', 'list');
        listEl.setAttribute('aria-label', 'Activity log');

        if (this.activities.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'kanban-activity-empty';
            emptyEl.textContent = 'No activity recorded yet.';
            listEl.appendChild(emptyEl);
        } else {
            // Sort by created_at descending (newest first) - Requirement 10.8
            const sortedActivities = [...this.activities].sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
            sortedActivities.forEach(entry => {
                const entryEl = this.renderActivityEntry(entry);
                listEl.appendChild(entryEl);
            });
        }

        activityLogEl.appendChild(listEl);

        // Add to container
        this.container.appendChild(activityLogEl);
    }

    /**
     * Render the activity log header with title
     * @returns {HTMLElement} Header element
     */
    _renderHeader() {
        const header = document.createElement('div');
        header.className = 'kanban-activity-header';

        const title = document.createElement('h4');
        title.className = 'kanban-activity-title';
        title.textContent = 'Activity';

        const count = document.createElement('span');
        count.className = 'kanban-activity-count';
        count.textContent = this.activities.length > 0 ? `(${this.activities.length})` : '';

        header.appendChild(title);
        header.appendChild(count);

        return header;
    }

    /**
     * Render a single activity entry
     * Requirement 10.7: Display activity entries with timestamp and user attribution
     * @param {Object} entry - Activity entry data
     * @returns {HTMLElement} Activity entry element
     */
    renderActivityEntry(entry) {
        const entryEl = document.createElement('div');
        entryEl.className = 'kanban-activity-entry';
        entryEl.dataset.activityId = entry.id;
        entryEl.setAttribute('role', 'listitem');

        // Activity icon
        const iconEl = document.createElement('span');
        iconEl.className = 'kanban-activity-icon';
        iconEl.setAttribute('aria-hidden', 'true');
        iconEl.textContent = this._getActivityIcon(entry.action_type);

        // Activity content container
        const contentEl = document.createElement('div');
        contentEl.className = 'kanban-activity-content';

        // Activity message
        const messageEl = document.createElement('span');
        messageEl.className = 'kanban-activity-message';
        messageEl.innerHTML = this.formatActivityMessage(entry);

        // Timestamp (Requirement 10.7)
        const timestampEl = document.createElement('span');
        timestampEl.className = 'kanban-activity-timestamp';
        timestampEl.textContent = this.formatTimestamp(entry.created_at);
        timestampEl.title = new Date(entry.created_at).toLocaleString();

        contentEl.appendChild(messageEl);
        contentEl.appendChild(timestampEl);

        entryEl.appendChild(iconEl);
        entryEl.appendChild(contentEl);

        return entryEl;
    }

    /**
     * Format activity message based on action type
     * @param {Object} entry - Activity entry data
     * @returns {string} Formatted message (may contain HTML)
     */
    formatActivityMessage(entry) {
        const actionData = entry.action_data || {};

        switch (entry.action_type) {
            case 'card_created':
                return 'Card was <strong>created</strong>';

            case 'card_moved':
                const fromColumn = this._escapeHtml(actionData.from_column || 'unknown');
                const toColumn = this._escapeHtml(actionData.to_column || 'unknown');
                return `Card moved from <strong>${fromColumn}</strong> to <strong>${toColumn}</strong>`;

            case 'card_edited':
                const editedField = actionData.field ? this._escapeHtml(actionData.field) : 'details';
                return `Card <strong>${editedField}</strong> was updated`;

            case 'checklist_item_added':
                const addedText = this._truncateText(actionData.text || 'item', 50);
                return `Added checklist item: <strong>${this._escapeHtml(addedText)}</strong>`;

            case 'checklist_item_completed':
                const completedText = this._truncateText(actionData.text || 'item', 50);
                return `Completed: <strong>${this._escapeHtml(completedText)}</strong>`;

            case 'checklist_item_uncompleted':
                const uncompletedText = this._truncateText(actionData.text || 'item', 50);
                return `Uncompleted: <strong>${this._escapeHtml(uncompletedText)}</strong>`;

            case 'checklist_item_deleted':
                const deletedItemText = this._truncateText(actionData.text || 'item', 50);
                return `Deleted checklist item: <strong>${this._escapeHtml(deletedItemText)}</strong>`;

            case 'attachment_added':
                const addedFileName = this._escapeHtml(actionData.file_name || 'file');
                return `Added attachment: <strong>${addedFileName}</strong>`;

            case 'attachment_deleted':
                const deletedFileName = this._escapeHtml(actionData.file_name || 'file');
                return `Deleted attachment: <strong>${deletedFileName}</strong>`;

            case 'comment_added':
                const commentPreview = this._truncateText(actionData.text || '', 50);
                return commentPreview
                    ? `Added comment: <em>"${this._escapeHtml(commentPreview)}"</em>`
                    : 'Added a <strong>comment</strong>';

            case 'comment_edited':
                return 'Edited a <strong>comment</strong>';

            case 'comment_deleted':
                return 'Deleted a <strong>comment</strong>';

            default:
                return `Activity: <strong>${this._escapeHtml(entry.action_type)}</strong>`;
        }
    }

    /**
     * Get icon for activity type
     * @param {string} actionType - Activity action type
     * @returns {string} Icon emoji
     */
    _getActivityIcon(actionType) {
        const icons = {
            'card_created': '✨',
            'card_moved': '➡️',
            'card_edited': '✏️',
            'checklist_item_added': '➕',
            'checklist_item_completed': '✅',
            'checklist_item_uncompleted': '⬜',
            'checklist_item_deleted': '🗑️',
            'attachment_added': '📎',
            'attachment_deleted': '📎',
            'comment_added': '💬',
            'comment_edited': '💬',
            'comment_deleted': '💬'
        };
        return icons[actionType] || '📝';
    }

    /**
     * Format timestamp in human-readable format (e.g., "2 hours ago")
     * @param {string} timestamp - ISO timestamp string
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (diffSecs < 60) {
            return 'just now';
        } else if (diffMins < 60) {
            return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
        } else if (diffHours < 24) {
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffDays < 7) {
            return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
        } else if (diffWeeks < 4) {
            return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
        } else if (diffMonths < 12) {
            return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
        } else {
            return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
        }
    }

    /**
     * Escape HTML special characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Truncate text to specified length with ellipsis
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    _truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Clean up event listeners
     */
    _cleanupEventListeners() {
        this._eventListeners.forEach(({ element, event, handler }) => {
            element?.removeEventListener(event, handler);
        });
        this._eventListeners = [];
    }

    /**
     * Show error message using toast if available
     * @param {string} message - Error message
     */
    _showError(message) {
        if (typeof Toast !== 'undefined' && Toast.error) {
            Toast.error(message);
        } else if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
        } else {
            console.error(message);
        }
    }

    /**
     * Destroy the component and cleanup resources
     */
    destroy() {
        // Clean up event listeners
        this._cleanupEventListeners();

        // Clear activities
        this.activities = [];

        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}


// Export for ES modules
export default KanbanView;
export { DragDropHandler, ChecklistComponent, AttachmentsComponent, CommentsComponent, ActivityLogComponent };

// Make available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.KanbanView = KanbanView;
    window.DragDropHandler = DragDropHandler;
    window.ChecklistComponent = ChecklistComponent;
    window.AttachmentsComponent = AttachmentsComponent;
    window.CommentsComponent = CommentsComponent;
    window.ActivityLogComponent = ActivityLogComponent;
}
