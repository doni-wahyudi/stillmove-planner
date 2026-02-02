/**
 * KanbanService - Business logic layer for Kanban board operations
 * Handles board, column, and card operations with order index management
 * and template instantiation logic.
 * 
 * Requirements: 1.1, 2.1, 2.2, 3.1, 10.2
 * Extended for card enhancements: 1.2, 1.5, 1.6, 2.1, 4.2, 10.5
 * Extended for attachments: 5.2, 5.3, 7.2, 7.3, 10.6
 * Extended for offline support: 1.7, 13.4
 */

import dataService from './data-service.js';
import storageService from './storage-service.js';
import cacheService, { STORES } from './cache-service.js';

/**
 * Activity action types for activity logging
 * Requirement 10.5: Log checklist item actions as activity entries
 * @enum {string}
 */
const ACTIVITY_TYPES = {
    CARD_CREATED: 'card_created',
    CARD_MOVED: 'card_moved',
    CARD_EDITED: 'card_edited',
    CHECKLIST_ITEM_ADDED: 'checklist_item_added',
    CHECKLIST_ITEM_COMPLETED: 'checklist_item_completed',
    CHECKLIST_ITEM_UNCOMPLETED: 'checklist_item_uncompleted',
    CHECKLIST_ITEM_DELETED: 'checklist_item_deleted',
    ATTACHMENT_ADDED: 'attachment_added',
    ATTACHMENT_DELETED: 'attachment_deleted',
    COMMENT_ADDED: 'comment_added',
    COMMENT_EDITED: 'comment_edited',
    COMMENT_DELETED: 'comment_deleted'
};

/**
 * Board templates for quick board creation
 * Requirement 10.2: Template instantiation creates board with predefined columns
 */
const BOARD_TEMPLATES = {
    blank: {
        title: 'Blank Board',
        columns: [
            { title: 'To Do', order_index: 0 },
            { title: 'In Progress', order_index: 1 },
            { title: 'Done', order_index: 2 }
        ],
        cards: []
    },
    personal: {
        title: 'Personal Tasks',
        columns: [
            { title: 'Backlog', order_index: 0 },
            { title: 'This Week', order_index: 1 },
            { title: 'Today', order_index: 2 },
            { title: 'Done', order_index: 3 }
        ],
        cards: []
    },
    project: {
        title: 'Project Management',
        columns: [
            { title: 'Backlog', order_index: 0 },
            { title: 'To Do', order_index: 1 },
            { title: 'In Progress', order_index: 2, wip_limit: 3 },
            { title: 'Review', order_index: 3, wip_limit: 2 },
            { title: 'Done', order_index: 4 }
        ],
        cards: []
    },
    weekly: {
        title: 'Weekly Planning',
        columns: [
            { title: 'Monday', order_index: 0 },
            { title: 'Tuesday', order_index: 1 },
            { title: 'Wednesday', order_index: 2 },
            { title: 'Thursday', order_index: 3 },
            { title: 'Friday', order_index: 4 },
            { title: 'Weekend', order_index: 5 },
            { title: 'Done', order_index: 6 }
        ],
        cards: []
    }
};

class KanbanService {
    constructor() {
        this.dataService = dataService;
    }

    // ==================== BOARD OPERATIONS ====================

    /**
     * Get all boards for the current user
     * @returns {Promise<Array>} Array of boards sorted by updated_at descending
     */
    async getBoards() {
        return await this.dataService.getKanbanBoards();
    }

    /**
     * Get a single board with its columns and cards
     * @param {string} boardId - Board ID
     * @returns {Promise<Object|null>} Board object with columns and cards, or null
     */
    async getBoard(boardId) {
        const board = await this.dataService.getKanbanBoard(boardId);
        if (!board) return null;

        // Load columns and cards for the board
        const columns = await this.dataService.getKanbanColumns(boardId);
        const cards = await this.dataService.getKanbanCards(boardId);

        return {
            ...board,
            columns: columns || [],
            cards: cards || []
        };
    }

    /**
     * Create a new board
     * Requirement 1.1: Store board with unique ID, title, description, category
     * @param {Object} data - Board data with title, description, category_id
     * @returns {Promise<Object>} Created board
     */
    async createBoard(data) {
        const boardData = {
            title: data.title,
            description: data.description || null,
            category_id: data.category_id || null,
            settings: data.settings || {}
        };

        return await this.dataService.createKanbanBoard(boardData);
    }

    /**
     * Update an existing board
     * @param {string} boardId - Board ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated board
     */
    async updateBoard(boardId, updates) {
        return await this.dataService.updateKanbanBoard(boardId, updates);
    }

    /**
     * Delete a board and all associated columns and cards
     * @param {string} boardId - Board ID
     * @returns {Promise<void>}
     */
    async deleteBoard(boardId) {
        return await this.dataService.deleteKanbanBoard(boardId);
    }

    /**
     * Create a board from a template
     * Requirement 2.1: Create default columns "To Do", "In Progress", "Done" for blank template
     * Requirement 10.2: Template instantiation creates board with predefined columns
     * @param {string} templateId - Template ID (blank, personal, project, weekly)
     * @param {Object} overrides - Optional overrides for board data (title, description, category_id)
     * @returns {Promise<Object>} Created board with columns
     */
    async createBoardFromTemplate(templateId, overrides = {}) {
        const template = BOARD_TEMPLATES[templateId];
        if (!template) {
            throw new Error(`Unknown template: ${templateId}`);
        }

        // Create the board
        const boardData = {
            title: overrides.title || template.title,
            description: overrides.description || null,
            category_id: overrides.category_id || null,
            settings: overrides.settings || {}
        };

        const board = await this.dataService.createKanbanBoard(boardData);

        // Create columns from template
        const createdColumns = [];
        for (const columnDef of template.columns) {
            const column = await this.dataService.createKanbanColumn({
                board_id: board.id,
                title: columnDef.title,
                order_index: columnDef.order_index,
                wip_limit: columnDef.wip_limit || null,
                color: columnDef.color || null
            });
            createdColumns.push(column);
        }

        return {
            ...board,
            columns: createdColumns,
            cards: []
        };
    }

    // ==================== COLUMN OPERATIONS ====================

    /**
     * Create a new column in a board
     * @param {string} boardId - Board ID
     * @param {Object} data - Column data with title, wip_limit, color
     * @returns {Promise<Object>} Created column
     */
    async createColumn(boardId, data) {
        // Get existing columns to determine order_index
        const existingColumns = await this.dataService.getKanbanColumns(boardId);
        const maxOrderIndex = existingColumns.length > 0
            ? Math.max(...existingColumns.map(c => c.order_index))
            : -1;

        const columnData = {
            board_id: boardId,
            title: data.title,
            order_index: data.order_index !== undefined ? data.order_index : maxOrderIndex + 1,
            wip_limit: data.wip_limit || null,
            color: data.color || null
        };

        const column = await this.dataService.createKanbanColumn(columnData);

        // If inserting at a specific position, reorder other columns
        if (data.order_index !== undefined && data.order_index <= maxOrderIndex) {
            await this._reindexColumns(boardId);
        }

        return column;
    }

    /**
     * Update a column
     * @param {string} columnId - Column ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated column
     */
    async updateColumn(columnId, updates) {
        return await this.dataService.updateKanbanColumn(columnId, updates);
    }

    /**
     * Delete a column
     * @param {string} columnId - Column ID
     * @param {string|null} moveCardsTo - Column ID to move cards to, or null to delete cards
     * @returns {Promise<void>}
     */
    async deleteColumn(columnId, moveCardsTo = null) {
        // Get the column to find its board_id
        const columns = await this._getAllColumns();
        const column = columns.find(c => c.id === columnId);
        if (!column) {
            throw new Error('Column not found');
        }

        // Get cards in this column
        const allCards = await this.dataService.getKanbanCards(column.board_id);
        const columnCards = allCards.filter(c => c.column_id === columnId);

        if (moveCardsTo && columnCards.length > 0) {
            // Move cards to the target column
            const targetCards = allCards.filter(c => c.column_id === moveCardsTo);
            const maxOrderIndex = targetCards.length > 0
                ? Math.max(...targetCards.map(c => c.order_index))
                : -1;

            for (let i = 0; i < columnCards.length; i++) {
                await this.dataService.updateKanbanCard(columnCards[i].id, {
                    column_id: moveCardsTo,
                    order_index: maxOrderIndex + 1 + i
                });
            }
        } else if (columnCards.length > 0) {
            // Delete cards in the column
            for (const card of columnCards) {
                await this.dataService.deleteKanbanCard(card.id);
            }
        }

        // Delete the column
        await this.dataService.deleteKanbanColumn(columnId);

        // Reindex remaining columns
        await this._reindexColumns(column.board_id);
    }

    /**
     * Reorder columns in a board
     * Requirement 2.2: Order indices must be sequential with no gaps
     * @param {string} boardId - Board ID
     * @param {Array<string>} columnOrder - Array of column IDs in desired order
     * @returns {Promise<Array>} Updated columns
     */
    async reorderColumns(boardId, columnOrder) {
        const columns = await this.dataService.getKanbanColumns(boardId);
        const updatedColumns = [];

        for (let i = 0; i < columnOrder.length; i++) {
            const columnId = columnOrder[i];
            const column = columns.find(c => c.id === columnId);
            if (column && column.order_index !== i) {
                const updated = await this.dataService.updateKanbanColumn(columnId, {
                    order_index: i
                });
                updatedColumns.push(updated);
            } else if (column) {
                updatedColumns.push(column);
            }
        }

        return updatedColumns.sort((a, b) => a.order_index - b.order_index);
    }

    // ==================== CARD OPERATIONS ====================

    /**
     * Create a new card in a column
     * Requirement 3.1: Card must have unique ID, title, column_id, order_index, timestamps
     * Requirement 10.2: Log 'card_created' activity entry when card is created
     * @param {string} columnId - Column ID
     * @param {Object} data - Card data
     * @returns {Promise<Object>} Created card
     */
    async createCard(columnId, data) {
        // Get the column to find board_id
        const columns = await this._getAllColumns();
        const column = columns.find(c => c.id === columnId);
        if (!column) {
            throw new Error('Column not found');
        }

        // Get existing cards in the column to determine order_index
        const allCards = await this.dataService.getKanbanCards(column.board_id);
        const columnCards = allCards.filter(c => c.column_id === columnId && !c.is_backlog);
        const maxOrderIndex = columnCards.length > 0
            ? Math.max(...columnCards.map(c => c.order_index))
            : -1;

        const cardData = {
            board_id: column.board_id,
            column_id: columnId,
            title: data.title,
            description: data.description || null,
            order_index: data.order_index !== undefined ? data.order_index : maxOrderIndex + 1,
            priority: data.priority || null,
            due_date: data.due_date || null,
            labels: data.labels || [],
            is_backlog: false,
            linked_goal_id: data.linked_goal_id || null,
            pomodoro_count: 0
        };

        const card = await this.dataService.createKanbanCard(cardData);

        // Log activity (Requirement 10.2)
        try {
            await this.logActivity(card.id, ACTIVITY_TYPES.CARD_CREATED, {
                title: card.title,
                column_id: columnId,
                column_title: column.title
            });
        } catch (error) {
            console.warn('Failed to log card creation activity:', error);
        }

        return card;
    }

    /**
     * Update a card
     * Requirement 10.4: Log 'card_edited' activity entry when title or description is edited
     * @param {string} cardId - Card ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated card
     */
    async updateCard(cardId, updates) {
        // Check if title or description is being updated (Requirement 10.4)
        const isContentEdit = updates.title !== undefined || updates.description !== undefined;

        const updatedCard = await this.dataService.updateKanbanCard(cardId, updates);

        // Log activity only for content edits (Requirement 10.4)
        if (isContentEdit) {
            try {
                const changedFields = [];
                if (updates.title !== undefined) changedFields.push('title');
                if (updates.description !== undefined) changedFields.push('description');

                await this.logActivity(cardId, ACTIVITY_TYPES.CARD_EDITED, {
                    changed_fields: changedFields,
                    new_title: updates.title,
                    new_description: updates.description?.substring(0, 100) // Truncate for activity log
                });
            } catch (error) {
                console.warn('Failed to log card edit activity:', error);
            }
        }

        return updatedCard;
    }

    /**
     * Delete a card
     * @param {string} cardId - Card ID
     * @returns {Promise<void>}
     */
    async deleteCard(cardId) {
        const card = await this.dataService.getKanbanCard(cardId);
        if (!card) return;

        await this.dataService.deleteKanbanCard(cardId);

        // Reindex cards in the column or backlog
        if (card.is_backlog) {
            await this._reindexBacklog(card.board_id);
        } else if (card.column_id) {
            await this._reindexCardsInColumn(card.board_id, card.column_id);
        }
    }

    /**
     * Move a card to a different column or position
     * Requirement 3.2, 3.3: Update order indices to be sequential with no gaps
     * Requirement 10.3: Log 'card_moved' activity entry when card is moved between columns
     * @param {string} cardId - Card ID
     * @param {string} targetColumnId - Target column ID
     * @param {number} position - Target position (order_index)
     * @returns {Promise<Object>} Updated card
     */
    async moveCard(cardId, targetColumnId, position) {
        const card = await this.dataService.getKanbanCard(cardId);
        if (!card) {
            throw new Error('Card not found');
        }

        const sourceColumnId = card.column_id;
        const wasBacklog = card.is_backlog;

        // Get all cards in the target column
        const allCards = await this.dataService.getKanbanCards(card.board_id);
        const targetColumnCards = allCards
            .filter(c => c.column_id === targetColumnId && !c.is_backlog && c.id !== cardId)
            .sort((a, b) => a.order_index - b.order_index);

        // Insert at position and shift others
        const updatedCard = await this.dataService.updateKanbanCard(cardId, {
            column_id: targetColumnId,
            order_index: position,
            is_backlog: false
        });

        // Reindex cards in target column
        await this._reindexCardsInColumn(card.board_id, targetColumnId);

        // Reindex source column/backlog if different
        if (wasBacklog) {
            await this._reindexBacklog(card.board_id);
        } else if (sourceColumnId && sourceColumnId !== targetColumnId) {
            await this._reindexCardsInColumn(card.board_id, sourceColumnId);
        }

        // Log activity for card movement (Requirement 10.3)
        try {
            // Get column names for activity log
            const columns = await this.dataService.getKanbanColumns(card.board_id);
            const sourceColumn = wasBacklog ? null : columns.find(c => c.id === sourceColumnId);
            const targetColumn = columns.find(c => c.id === targetColumnId);

            await this.logActivity(cardId, ACTIVITY_TYPES.CARD_MOVED, {
                from_column: wasBacklog ? 'Backlog' : (sourceColumn?.title || 'Unknown'),
                to_column: targetColumn?.title || 'Unknown',
                from_column_id: wasBacklog ? null : sourceColumnId,
                to_column_id: targetColumnId
            });
        } catch (error) {
            console.warn('Failed to log card movement activity:', error);
        }

        return updatedCard;
    }

    /**
     * Move a card to the backlog
     * Requirement 10.3: Log 'card_moved' activity entry when card is moved to backlog
     * @param {string} cardId - Card ID
     * @returns {Promise<Object>} Updated card
     */
    async moveCardToBacklog(cardId) {
        const card = await this.dataService.getKanbanCard(cardId);
        if (!card) {
            throw new Error('Card not found');
        }

        const sourceColumnId = card.column_id;

        // Get backlog cards to determine order_index
        const allCards = await this.dataService.getKanbanCards(card.board_id);
        const backlogCards = allCards.filter(c => c.is_backlog);
        const maxOrderIndex = backlogCards.length > 0
            ? Math.max(...backlogCards.map(c => c.order_index))
            : -1;

        const updatedCard = await this.dataService.updateKanbanCard(cardId, {
            column_id: null,
            is_backlog: true,
            order_index: maxOrderIndex + 1
        });

        // Reindex source column
        if (sourceColumnId) {
            await this._reindexCardsInColumn(card.board_id, sourceColumnId);
        }

        // Log activity for card movement to backlog (Requirement 10.3)
        try {
            // Get source column name for activity log
            const columns = await this.dataService.getKanbanColumns(card.board_id);
            const sourceColumn = columns.find(c => c.id === sourceColumnId);

            await this.logActivity(cardId, ACTIVITY_TYPES.CARD_MOVED, {
                from_column: sourceColumn?.title || 'Unknown',
                to_column: 'Backlog',
                from_column_id: sourceColumnId,
                to_column_id: null
            });
        } catch (error) {
            console.warn('Failed to log card movement to backlog activity:', error);
        }

        return updatedCard;
    }

    /**
     * Move a card from backlog to a column
     * @param {string} cardId - Card ID
     * @param {string} columnId - Target column ID
     * @param {number} position - Target position
     * @returns {Promise<Object>} Updated card
     */
    async moveCardFromBacklog(cardId, columnId, position) {
        return await this.moveCard(cardId, columnId, position);
    }

    // ==================== CHECKLIST OPERATIONS ====================

    /**
     * Check if the application is currently online
     * @returns {boolean} True if online, false if offline
     */
    isOnline() {
        return navigator.onLine;
    }

    /**
     * Get all checklist items for a card
     * Requirement 1.2: Get checklist items for display
     * Requirement 13.4: Allow viewing cached checklists when offline
     * @param {string} cardId - Card ID
     * @returns {Promise<{items: Array, isOffline: boolean}>} Checklist items sorted by order_index and offline status
     */
    async getChecklistItems(cardId) {
        const items = await this.dataService.getChecklistItems(cardId);
        return {
            items: items || [],
            isOffline: !this.isOnline()
        };
    }

    /**
     * Create a new checklist item
     * Requirement 1.2: Create a new item with provided text and unchecked status
     * Requirement 1.4: Persist with card_id, text, order_index, is_completed=false
     * Requirement 1.7: Queue checklist operations for sync when offline
     * Requirement 10.5: Log checklist item addition as activity entry
     * @param {string} cardId - Card ID
     * @param {string} text - Item text
     * @returns {Promise<{item: Object, queued: boolean}>} Created checklist item and queue status
     */
    async createChecklistItem(cardId, text) {
        // Validate text is not empty
        if (!text || !text.trim()) {
            throw new Error('Checklist item text is required');
        }

        // Get existing items to determine next order_index
        const existingItems = await this.dataService.getChecklistItems(cardId);
        const maxOrderIndex = existingItems.length > 0
            ? Math.max(...existingItems.map(item => item.order_index))
            : -1;

        const itemData = {
            card_id: cardId,
            text: text.trim(),
            is_completed: false,
            order_index: maxOrderIndex + 1
        };

        const isOffline = !this.isOnline();
        const createdItem = await this.dataService.createChecklistItem(itemData);

        // Log activity (will also be queued if offline)
        try {
            await this.logActivity(cardId, ACTIVITY_TYPES.CHECKLIST_ITEM_ADDED, {
                item_id: createdItem.id,
                text: createdItem.text
            });
        } catch (error) {
            // Don't fail the operation if activity logging fails
            console.warn('Failed to log checklist item creation activity:', error);
        }

        return {
            item: createdItem,
            queued: isOffline
        };
    }

    /**
     * Update a checklist item
     * Requirement 1.5: Update item text immediately
     * Requirement 1.7: Queue checklist operations for sync when offline
     * @param {string} itemId - Item ID
     * @param {Object} updates - Fields to update (text, is_completed)
     * @returns {Promise<{item: Object, queued: boolean}>} Updated item and queue status
     */
    async updateChecklistItem(itemId, updates) {
        const isOffline = !this.isOnline();
        const updatedItem = await this.dataService.updateChecklistItem(itemId, updates);
        return {
            item: updatedItem,
            queued: isOffline
        };
    }

    /**
     * Toggle checklist item completion
     * Requirement 2.1: Toggle the is_completed status
     * Requirement 1.7: Queue checklist operations for sync when offline
     * Requirement 10.5: Log completion/uncompletion as activity entry
     * @param {string} itemId - Item ID
     * @returns {Promise<{item: Object, queued: boolean}>} Updated item with toggled status and queue status
     */
    async toggleChecklistItem(itemId) {
        // Get current item to determine current state
        const items = await this._getAllChecklistItems();
        const item = items.find(i => i.id === itemId);
        
        if (!item) {
            throw new Error('Checklist item not found');
        }

        const isOffline = !this.isOnline();
        const newCompletedStatus = !item.is_completed;
        const updatedItem = await this.dataService.updateChecklistItem(itemId, {
            is_completed: newCompletedStatus
        });

        // Log activity based on new status (will also be queued if offline)
        const activityType = newCompletedStatus 
            ? ACTIVITY_TYPES.CHECKLIST_ITEM_COMPLETED 
            : ACTIVITY_TYPES.CHECKLIST_ITEM_UNCOMPLETED;

        try {
            await this.logActivity(item.card_id, activityType, {
                item_id: itemId,
                text: item.text
            });
        } catch (error) {
            // Don't fail the operation if activity logging fails
            console.warn('Failed to log checklist item toggle activity:', error);
        }

        return {
            item: updatedItem,
            queued: isOffline
        };
    }

    /**
     * Delete a checklist item
     * Requirement 1.6: Remove item and reindex remaining items
     * Requirement 1.7: Queue checklist operations for sync when offline
     * Requirement 10.5: Log deletion as activity entry
     * @param {string} itemId - Item ID
     * @returns {Promise<{queued: boolean}>} Queue status
     */
    async deleteChecklistItem(itemId) {
        // Get item before deletion for activity logging
        const items = await this._getAllChecklistItems();
        const item = items.find(i => i.id === itemId);
        
        if (!item) {
            throw new Error('Checklist item not found');
        }

        const cardId = item.card_id;
        const itemText = item.text;
        const isOffline = !this.isOnline();

        // Delete the item
        await this.dataService.deleteChecklistItem(itemId);

        // Reindex remaining items
        await this._reindexChecklistItems(cardId);

        // Log activity (will also be queued if offline)
        try {
            await this.logActivity(cardId, ACTIVITY_TYPES.CHECKLIST_ITEM_DELETED, {
                item_id: itemId,
                text: itemText
            });
        } catch (error) {
            // Don't fail the operation if activity logging fails
            console.warn('Failed to log checklist item deletion activity:', error);
        }

        return { queued: isOffline };
    }

    /**
     * Reorder checklist items
     * Requirement 4.2: Update order indices for all affected items
     * Requirement 1.6: Maintain sequential order indices with no gaps
     * Requirement 1.7: Queue checklist operations for sync when offline
     * @param {string} cardId - Card ID
     * @param {Array<string>} itemOrder - Array of item IDs in desired order
     * @returns {Promise<{items: Array, queued: boolean}>} Updated items and queue status
     */
    async reorderChecklistItems(cardId, itemOrder) {
        const items = await this.dataService.getChecklistItems(cardId);
        const updatedItems = [];
        const isOffline = !this.isOnline();

        for (let i = 0; i < itemOrder.length; i++) {
            const itemId = itemOrder[i];
            const item = items.find(it => it.id === itemId);
            
            if (item && item.order_index !== i) {
                const updated = await this.dataService.updateChecklistItem(itemId, {
                    order_index: i
                });
                updatedItems.push(updated);
            } else if (item) {
                updatedItems.push(item);
            }
        }

        return {
            items: updatedItems.sort((a, b) => a.order_index - b.order_index),
            queued: isOffline
        };
    }

    /**
     * Get checklist progress for a card
     * Requirement 2.3: Calculate progress indicator showing "X/Y items done"
     * @param {string} cardId - Card ID
     * @returns {Promise<{completed: number, total: number}>}
     */
    async getChecklistProgress(cardId) {
        const items = await this.dataService.getChecklistItems(cardId);
        const total = items.length;
        const completed = items.filter(item => item.is_completed).length;

        return { completed, total };
    }

    // ==================== ATTACHMENT OPERATIONS ====================

    /**
     * Get all attachments for a card
     * Requirement 5.2, 5.3: Get attachments for display
     * @param {string} cardId - Card ID
     * @returns {Promise<Array>} Attachments sorted by created_at
     */
    async getAttachments(cardId) {
        return await this.dataService.getAttachments(cardId);
    }

    /**
     * Upload and create an attachment
     * Requirement 5.2: Upload file to Supabase Storage with unique path
     * Requirement 5.3: Create attachment record with card_id, file_name, file_path, file_type, file_size
     * Requirement 5.8: Prevent attachment uploads when offline
     * Requirement 10.6: Log attachment addition as activity entry
     * @param {string} cardId - Card ID
     * @param {File} file - File to upload
     * @param {Function} [onProgress] - Progress callback (0-100)
     * @returns {Promise<Object>} Created attachment with URL
     * @throws {Error} If offline or validation fails
     */
    async uploadAttachment(cardId, file, onProgress) {
        // Requirement 5.8: Prevent attachment uploads when offline
        if (!this.isOnline()) {
            throw new Error('Attachment uploads require an internet connection. Please try again when online.');
        }

        // Validate file first
        const validation = storageService.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Get current user ID for the storage path
        const { data: { user } } = await this.dataService.supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Generate unique storage path
        const storagePath = storageService.generatePath(user.id, cardId, file.name);

        // Upload file to storage
        const uploadResult = await storageService.uploadFile(file, storagePath, onProgress);

        // Create attachment metadata record
        const attachmentData = {
            card_id: cardId,
            file_name: file.name,
            file_path: uploadResult.path,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user.id
        };

        const attachment = await this.dataService.createAttachment(attachmentData);

        // Add the URL to the returned attachment
        attachment.url = uploadResult.url;

        // Log activity
        await this.logActivity(cardId, ACTIVITY_TYPES.ATTACHMENT_ADDED, {
            attachment_id: attachment.id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size
        });

        return attachment;
    }

    /**
     * Delete an attachment
     * Requirement 7.2: Remove file from Supabase Storage
     * Requirement 7.3: Remove attachment record from database
     * Requirement 7.5: Prevent attachment deletion when offline
     * Requirement 10.6: Log attachment deletion as activity entry
     * @param {string} attachmentId - Attachment ID
     * @returns {Promise<void>}
     * @throws {Error} If offline or attachment not found
     */
    async deleteAttachment(attachmentId) {
        // Requirement 7.5: Prevent attachment deletion when offline
        if (!this.isOnline()) {
            throw new Error('Attachment deletion requires an internet connection. Please try again when online.');
        }

        // Get attachment metadata to find file path and card_id
        const attachments = await this._getAllAttachments();
        const attachment = attachments.find(a => a.id === attachmentId);

        if (!attachment) {
            throw new Error('Attachment not found');
        }

        const cardId = attachment.card_id;
        const fileName = attachment.file_name;
        const filePath = attachment.file_path;

        // Delete file from storage
        await storageService.deleteFile(filePath);

        // Delete metadata record from database
        await this.dataService.deleteAttachment(attachmentId);

        // Log activity
        await this.logActivity(cardId, ACTIVITY_TYPES.ATTACHMENT_DELETED, {
            attachment_id: attachmentId,
            file_name: fileName
        });
    }

    /**
     * Get attachment count for a card
     * Requirement 5.3: Count attachments for card preview display
     * @param {string} cardId - Card ID
     * @returns {Promise<number>} Number of attachments
     */
    async getAttachmentCount(cardId) {
        const attachments = await this.dataService.getAttachments(cardId);
        return attachments.length;
    }

    // ==================== COMMENT OPERATIONS ====================

    /**
     * Get all comments for a card
     * Requirement 8.2: Get comments for display
     * Requirement 8.5: Comments sorted by created_at descending (newest first)
     * Requirement 13.4: Allow viewing cached comments when offline
     * @param {string} cardId - Card ID
     * @returns {Promise<{comments: Array, isOffline: boolean}>} Comments sorted by created_at descending and offline status
     */
    async getComments(cardId) {
        const comments = await this.dataService.getComments(cardId);
        return {
            comments: comments || [],
            isOffline: !this.isOnline()
        };
    }

    /**
     * Create a new comment
     * Requirement 8.2: Create comment with text, user_id, and timestamp
     * Requirement 8.3: Prevent empty comment submission
     * Requirement 8.6: Queue comment creation for sync when offline
     * @param {string} cardId - Card ID
     * @param {string} text - Comment text
     * @returns {Promise<{comment: Object, queued: boolean}>} Created comment and queue status
     */
    async createComment(cardId, text) {
        // Validate text is not empty (Requirement 8.3)
        if (!text || !text.trim()) {
            throw new Error('Comment text is required');
        }

        // Get current user ID
        const { data: { user } } = await this.dataService.supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const commentData = {
            card_id: cardId,
            user_id: user.id,
            text: text.trim()
        };

        const isOffline = !this.isOnline();
        const createdComment = await this.dataService.createComment(commentData);

        // Log activity (Requirement 10.5 - log comment actions, will also be queued if offline)
        try {
            await this.logActivity(cardId, ACTIVITY_TYPES.COMMENT_ADDED, {
                comment_id: createdComment.id,
                text: createdComment.text.substring(0, 100) // Truncate for activity log
            });
        } catch (error) {
            // Don't fail the operation if activity logging fails
            console.warn('Failed to log comment creation activity:', error);
        }

        return {
            comment: createdComment,
            queued: isOffline
        };
    }

    /**
     * Update a comment
     * Requirement 9.2: Update comment text and add edited_at timestamp
     * Requirement 9.4: Only allow users to edit their own comments
     * Requirement 9.5: Queue comment edits for sync when offline
     * @param {string} commentId - Comment ID
     * @param {string} text - New text
     * @returns {Promise<{comment: Object, queued: boolean}>} Updated comment with edited_at timestamp and queue status
     */
    async updateComment(commentId, text) {
        // Validate text is not empty
        if (!text || !text.trim()) {
            throw new Error('Comment text is required');
        }

        // Get current user ID
        const { data: { user } } = await this.dataService.supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Get the comment to verify ownership (Requirement 9.4)
        const comment = await this._getCommentById(commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }

        // Verify ownership - only allow users to edit their own comments
        if (comment.user_id !== user.id) {
            throw new Error('You can only edit your own comments');
        }

        const cardId = comment.card_id;
        const isOffline = !this.isOnline();

        // Update the comment (data-service handles edited_at timestamp)
        const updatedComment = await this.dataService.updateComment(commentId, {
            text: text.trim()
        });

        // Log activity (will also be queued if offline)
        try {
            await this.logActivity(cardId, ACTIVITY_TYPES.COMMENT_EDITED, {
                comment_id: commentId,
                text: text.trim().substring(0, 100) // Truncate for activity log
            });
        } catch (error) {
            // Don't fail the operation if activity logging fails
            console.warn('Failed to log comment edit activity:', error);
        }

        return {
            comment: updatedComment,
            queued: isOffline
        };
    }

    /**
     * Delete a comment
     * Requirement 9.3: Remove comment after confirmation
     * Requirement 9.4: Only allow users to delete their own comments
     * Requirement 9.5: Queue comment deletions for sync when offline
     * @param {string} commentId - Comment ID
     * @returns {Promise<{queued: boolean}>} Queue status
     */
    async deleteComment(commentId) {
        // Get current user ID
        const { data: { user } } = await this.dataService.supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Get the comment to verify ownership (Requirement 9.4)
        const comment = await this._getCommentById(commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }

        // Verify ownership - only allow users to delete their own comments
        if (comment.user_id !== user.id) {
            throw new Error('You can only delete your own comments');
        }

        const cardId = comment.card_id;
        const commentText = comment.text;
        const isOffline = !this.isOnline();

        // Delete the comment
        await this.dataService.deleteComment(commentId);

        // Log activity (will also be queued if offline)
        try {
            await this.logActivity(cardId, ACTIVITY_TYPES.COMMENT_DELETED, {
                comment_id: commentId,
                text: commentText.substring(0, 100) // Truncate for activity log
            });
        } catch (error) {
            // Don't fail the operation if activity logging fails
            console.warn('Failed to log comment deletion activity:', error);
        }

        return { queued: isOffline };
    }

    /**
     * Get comment count for a card
     * Requirement 12.1: Display comment count on card previews
     * @param {string} cardId - Card ID
     * @returns {Promise<number>} Number of comments
     */
    async getCommentCount(cardId) {
        const comments = await this.dataService.getComments(cardId);
        return comments.length;
    }

    /**
     * Get a comment by ID (for internal use)
     * @param {string} commentId - Comment ID
     * @returns {Promise<Object|null>} Comment or null if not found
     * @private
     */
    async _getCommentById(commentId) {
        // Get all comments across all cards to find the specific one
        const boards = await this.dataService.getKanbanBoards();
        
        for (const board of boards) {
            const cards = await this.dataService.getKanbanCards(board.id);
            for (const card of cards) {
                const comments = await this.dataService.getComments(card.id);
                const comment = comments.find(c => c.id === commentId);
                if (comment) {
                    return comment;
                }
            }
        }
        
        return null;
    }

    // ==================== ACTIVITY LOG OPERATIONS ====================

    /**
     * Get activity log for a card
     * @param {string} cardId - Card ID
     * @returns {Promise<Array>} Activity entries sorted by created_at descending
     */
    async getActivityLog(cardId) {
        return await this.dataService.getActivityLog(cardId);
    }

    /**
     * Log an activity entry
     * @param {string} cardId - Card ID
     * @param {string} actionType - Type of action (from ACTIVITY_TYPES)
     * @param {Object} actionData - Additional data about the action
     * @returns {Promise<Object>} Created activity entry
     */
    async logActivity(cardId, actionType, actionData = {}) {
        const entry = {
            card_id: cardId,
            action_type: actionType,
            action_data: actionData
        };

        return await this.dataService.createActivityEntry(entry);
    }

    // ==================== BACKLOG OPERATIONS ====================

    /**
     * Get backlog cards for a board
     * @param {string} boardId - Board ID
     * @returns {Promise<Array>} Array of backlog cards sorted by order_index
     */
    async getBacklog(boardId) {
        const allCards = await this.dataService.getKanbanCards(boardId);
        return allCards
            .filter(c => c.is_backlog)
            .sort((a, b) => a.order_index - b.order_index);
    }

    /**
     * Reorder backlog cards
     * @param {string} boardId - Board ID
     * @param {Array<string>} cardOrder - Array of card IDs in desired order
     * @returns {Promise<Array>} Updated backlog cards
     */
    async reorderBacklog(boardId, cardOrder) {
        const allCards = await this.dataService.getKanbanCards(boardId);
        const backlogCards = allCards.filter(c => c.is_backlog);
        const updatedCards = [];

        for (let i = 0; i < cardOrder.length; i++) {
            const cardId = cardOrder[i];
            const card = backlogCards.find(c => c.id === cardId);
            if (card && card.order_index !== i) {
                const updated = await this.dataService.updateKanbanCard(cardId, {
                    order_index: i
                });
                updatedCards.push(updated);
            } else if (card) {
                updatedCards.push(card);
            }
        }

        return updatedCards.sort((a, b) => a.order_index - b.order_index);
    }

    // ==================== INTEGRATION METHODS ====================

    /**
     * Link a card to an annual goal
     * @param {string} cardId - Card ID
     * @param {string} goalId - Goal ID
     * @returns {Promise<Object>} Updated card
     */
    async linkCardToGoal(cardId, goalId) {
        return await this.dataService.updateKanbanCard(cardId, {
            linked_goal_id: goalId
        });
    }

    /**
     * Start a Pomodoro session for a card
     * @param {string} cardId - Card ID
     * @returns {Promise<Object>} Card data for Pomodoro integration
     */
    async startPomodoroForCard(cardId) {
        const card = await this.dataService.getKanbanCard(cardId);
        if (!card) {
            throw new Error('Card not found');
        }

        // Return card data that can be used by Pomodoro timer
        return {
            cardId: card.id,
            title: card.title,
            boardId: card.board_id
        };
    }

    /**
     * Increment Pomodoro count for a card
     * @param {string} cardId - Card ID
     * @returns {Promise<Object>} Updated card
     */
    async incrementPomodoroCount(cardId) {
        const card = await this.dataService.getKanbanCard(cardId);
        if (!card) {
            throw new Error('Card not found');
        }

        return await this.dataService.updateKanbanCard(cardId, {
            pomodoro_count: (card.pomodoro_count || 0) + 1
        });
    }

    /**
     * Get Pomodoro stats for a card
     * @param {string} cardId - Card ID
     * @returns {Promise<Object>} Pomodoro stats
     */
    async getCardPomodoroStats(cardId) {
        const card = await this.dataService.getKanbanCard(cardId);
        if (!card) {
            throw new Error('Card not found');
        }

        return {
            cardId: card.id,
            title: card.title,
            pomodoroCount: card.pomodoro_count || 0,
            // Assuming 25 minutes per pomodoro
            totalMinutes: (card.pomodoro_count || 0) * 25
        };
    }

    // ==================== FILTERING ====================

    /**
     * Filter cards based on criteria
     * Requirements: 7.2, 7.3, 7.4
     * @param {Array} cards - Array of cards to filter
     * @param {Object} filters - Filter criteria (CardFilters type)
     * @param {string} [filters.search] - Search query
     * @param {'high'|'medium'|'low'} [filters.priority] - Priority filter
     * @param {string[]} [filters.labels] - Label names to filter by
     * @param {'overdue'|'today'|'week'|'none'} [filters.dueDate] - Due date filter
     * @returns {Array} Filtered cards
     */
    filterCards(cards, filters) {
        if (!cards || !Array.isArray(cards)) {
            return [];
        }

        if (!filters || typeof filters !== 'object') {
            return cards;
        }

        let result = cards;

        // Apply search filter if present
        // Requirement 7.1: Search filter - filter cards where title OR description contains query
        if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
            result = this.searchCards(result, filters.search);
        }

        // Apply priority filter
        // Requirement 7.2: Priority filter - show only cards with selected priority level
        if (filters.priority) {
            result = result.filter(card => card.priority === filters.priority);
        }

        // Apply label filter
        // Requirement 7.3: Label filter - show only cards with selected label
        if (filters.labels && Array.isArray(filters.labels) && filters.labels.length > 0) {
            result = result.filter(card => {
                if (!card.labels || !Array.isArray(card.labels)) {
                    return false;
                }
                // Check if card has any of the filter labels
                return filters.labels.some(filterLabel => 
                    card.labels.some(cardLabel => {
                        // Handle both string labels and object labels with name property
                        const cardLabelName = typeof cardLabel === 'string' ? cardLabel : cardLabel.name;
                        return cardLabelName === filterLabel;
                    })
                );
            });
        }

        // Apply due date filter
        // Requirement 7.4: Due date filter - show cards matching date criteria
        if (filters.dueDate) {
            result = this._filterByDueDate(result, filters.dueDate);
        }

        return result;
    }

    /**
     * Search cards by query
     * Requirement 7.1: Search filter - filter cards where title OR description contains query (case-insensitive)
     * @param {Array} cards - Array of cards to search
     * @param {string} query - Search query
     * @returns {Array} Matching cards
     */
    searchCards(cards, query) {
        if (!cards || !Array.isArray(cards)) {
            return [];
        }

        if (!query || typeof query !== 'string' || !query.trim()) {
            return cards;
        }

        const lowerQuery = query.toLowerCase().trim();

        return cards.filter(card => {
            // Check title (case-insensitive)
            const titleMatch = card.title && 
                typeof card.title === 'string' && 
                card.title.toLowerCase().includes(lowerQuery);

            // Check description (case-insensitive)
            const descriptionMatch = card.description && 
                typeof card.description === 'string' && 
                card.description.toLowerCase().includes(lowerQuery);

            return titleMatch || descriptionMatch;
        });
    }

    /**
     * Filter cards by due date criteria
     * @param {Array} cards - Array of cards to filter
     * @param {'overdue'|'today'|'week'|'none'} criteria - Due date filter criteria
     * @returns {Array} Filtered cards
     * @private
     */
    _filterByDueDate(cards, criteria) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        // Calculate end of week (Sunday)
        const weekEnd = new Date(today);
        const daysUntilSunday = 7 - today.getDay();
        weekEnd.setDate(today.getDate() + daysUntilSunday);
        weekEnd.setHours(23, 59, 59, 999);

        return cards.filter(card => {
            // Handle 'none' filter - cards with no due date
            if (criteria === 'none') {
                return !card.due_date;
            }

            // For other filters, card must have a due date
            if (!card.due_date) {
                return false;
            }

            const dueDate = new Date(card.due_date);
            dueDate.setHours(0, 0, 0, 0);

            switch (criteria) {
                case 'overdue':
                    // Cards with due date before today
                    return dueDate < today;

                case 'today':
                    // Cards due today
                    return dueDate.getTime() === today.getTime();

                case 'week':
                    // Cards due this week (today through end of week)
                    return dueDate >= today && dueDate <= weekEnd;

                default:
                    return true;
            }
        });
    }

    // ==================== HELPER METHODS ====================

    /**
     * Get all columns (for internal use)
     * @private
     */
    async _getAllColumns() {
        // This is a workaround since we don't have a method to get all columns
        // In practice, we'd need to know the board_id
        const boards = await this.dataService.getKanbanBoards();
        const allColumns = [];
        for (const board of boards) {
            const columns = await this.dataService.getKanbanColumns(board.id);
            allColumns.push(...columns);
        }
        return allColumns;
    }

    /**
     * Reindex columns in a board to ensure sequential order indices
     * Requirement 2.2: Order indices must be sequential with no gaps
     * @param {string} boardId - Board ID
     * @private
     */
    async _reindexColumns(boardId) {
        const columns = await this.dataService.getKanbanColumns(boardId);
        const sortedColumns = columns.sort((a, b) => a.order_index - b.order_index);

        for (let i = 0; i < sortedColumns.length; i++) {
            if (sortedColumns[i].order_index !== i) {
                await this.dataService.updateKanbanColumn(sortedColumns[i].id, {
                    order_index: i
                });
            }
        }
    }

    /**
     * Reindex cards in a column to ensure sequential order indices
     * @param {string} boardId - Board ID
     * @param {string} columnId - Column ID
     * @private
     */
    async _reindexCardsInColumn(boardId, columnId) {
        const allCards = await this.dataService.getKanbanCards(boardId);
        const columnCards = allCards
            .filter(c => c.column_id === columnId && !c.is_backlog)
            .sort((a, b) => a.order_index - b.order_index);

        for (let i = 0; i < columnCards.length; i++) {
            if (columnCards[i].order_index !== i) {
                await this.dataService.updateKanbanCard(columnCards[i].id, {
                    order_index: i
                });
            }
        }
    }

    /**
     * Reindex backlog cards to ensure sequential order indices
     * @param {string} boardId - Board ID
     * @private
     */
    async _reindexBacklog(boardId) {
        const allCards = await this.dataService.getKanbanCards(boardId);
        const backlogCards = allCards
            .filter(c => c.is_backlog)
            .sort((a, b) => a.order_index - b.order_index);

        for (let i = 0; i < backlogCards.length; i++) {
            if (backlogCards[i].order_index !== i) {
                await this.dataService.updateKanbanCard(backlogCards[i].id, {
                    order_index: i
                });
            }
        }
    }

    /**
     * Get all checklist items across all cards (for internal use)
     * @returns {Promise<Array>} All checklist items
     * @private
     */
    async _getAllChecklistItems() {
        // Get all boards to find all cards
        const boards = await this.dataService.getKanbanBoards();
        const allItems = [];
        
        for (const board of boards) {
            const cards = await this.dataService.getKanbanCards(board.id);
            for (const card of cards) {
                const items = await this.dataService.getChecklistItems(card.id);
                allItems.push(...items);
            }
        }
        
        return allItems;
    }

    /**
     * Get all attachments across all cards (for internal use)
     * @returns {Promise<Array>} All attachments
     * @private
     */
    async _getAllAttachments() {
        // Get all boards to find all cards
        const boards = await this.dataService.getKanbanBoards();
        const allAttachments = [];
        
        for (const board of boards) {
            const cards = await this.dataService.getKanbanCards(board.id);
            for (const card of cards) {
                const attachments = await this.dataService.getAttachments(card.id);
                allAttachments.push(...attachments);
            }
        }
        
        return allAttachments;
    }

    /**
     * Reindex checklist items in a card to ensure sequential order indices
     * Requirement 1.6: Maintain sequential order indices with no gaps
     * @param {string} cardId - Card ID
     * @private
     */
    async _reindexChecklistItems(cardId) {
        const items = await this.dataService.getChecklistItems(cardId);
        const sortedItems = items.sort((a, b) => a.order_index - b.order_index);

        for (let i = 0; i < sortedItems.length; i++) {
            if (sortedItems[i].order_index !== i) {
                await this.dataService.updateChecklistItem(sortedItems[i].id, {
                    order_index: i
                });
            }
        }
    }

    /**
     * Get available templates
     * @returns {Object} Template definitions
     */
    getTemplates() {
        return BOARD_TEMPLATES;
    }

    /**
     * Check if a column is over its WIP limit
     * @param {string} columnId - Column ID
     * @param {string} boardId - Board ID
     * @returns {Promise<Object>} WIP status { isOverLimit, currentCount, wipLimit }
     */
    async checkWipLimit(columnId, boardId) {
        const columns = await this.dataService.getKanbanColumns(boardId);
        const column = columns.find(c => c.id === columnId);
        
        if (!column || !column.wip_limit) {
            return { isOverLimit: false, currentCount: 0, wipLimit: null };
        }

        const allCards = await this.dataService.getKanbanCards(boardId);
        const columnCards = allCards.filter(c => c.column_id === columnId && !c.is_backlog);
        const currentCount = columnCards.length;

        return {
            isOverLimit: currentCount >= column.wip_limit,
            currentCount,
            wipLimit: column.wip_limit
        };
    }
}

// Create and export singleton instance
const kanbanService = new KanbanService();
export default kanbanService;

// Also export the class, templates, and activity types for testing
export { KanbanService, BOARD_TEMPLATES, ACTIVITY_TYPES };

// Make available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.KanbanService = KanbanService;
    window.kanbanService = kanbanService;
    window.BOARD_TEMPLATES = BOARD_TEMPLATES;
    window.ACTIVITY_TYPES = ACTIVITY_TYPES;
}
