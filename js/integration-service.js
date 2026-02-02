/**
 * IntegrationService - A central coordinator for cross-feature functionality.
 * Handles data sharing, events, and navigation between Kanban, Calendar, Habits, etc.
 * 
 * Requirements: 14.1, 15.1
 */

import dataService from './data-service.js';
import kanbanService from './kanban-service.js';

class IntegrationService {
    constructor() {
        this.events = {};
        this.cache = new Map();
    }

    // ==================== EVENT SYSTEM ====================

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {any} data - Data to pass to callbacks
     */
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event callback for ${event}:`, error);
            }
        });
    }

    // ==================== CORE CARD FETCHING ====================

    /**
     * Get cards due within a specific date range
     * Requirements: 1.1, 7.1, 10.1
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Array>} List of cards with enhanced metadata
     */
    async getCardsDueInRange(startDate, endDate) {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const todayStr = new Date().toISOString().split('T')[0];

            // Fetch all boards and cards (could be optimized with targeted queries if needed)
            const boards = await kanbanService.getBoards();
            const allCards = [];

            for (const board of boards) {
                const fullBoard = await kanbanService.getBoard(board.id);
                if (fullBoard && fullBoard.cards) {
                    allCards.push(...fullBoard.cards.map(card => ({
                        ...card,
                        boardId: board.id,
                        boardTitle: board.title,
                        // Find column title
                        columnTitle: fullBoard.columns?.find(col => col.id === card.column_id)?.title || 'Unknown'
                    })));
                }
            }

            // Filter by due date
            return allCards.filter(card => {
                if (!card.due_date) return false;

                const dueDate = new Date(card.due_date);
                const isInRange = dueDate >= start && dueDate <= end;

                if (isInRange) {
                    // Inject status flags
                    card.isOverdue = card.due_date < todayStr && card.columnTitle.toLowerCase() !== 'done';
                    card.isDueToday = card.due_date === todayStr;
                    return true;
                }
                return false;
            });
        } catch (error) {
            console.error('Error fetching cards due in range:', error);
            return [];
        }
    }

    /**
     * Get cards due during the specified week
     * Requirement: 7.1
     * @param {string} weekStart - Start date of the week (YYYY-MM-DD)
     */
    async getCardsDueThisWeek(weekStart) {
        const start = new Date(weekStart);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        return this.getCardsDueInRange(
            start.toISOString().split('T')[0],
            end.toISOString().split('T')[0]
        );
    }

    /**
     * Get cards due during the specified month
     * Requirement: 10.1
     */
    async getCardsDueThisMonth(year, month) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);

        return this.getCardsDueInRange(
            start.toISOString().split('T')[0],
            end.toISOString().split('T')[0]
        );
    }

    // ==================== CALENDAR TRANSFORMATION ====================

    /**
     * Transform a Kanban card into a calendar event
     * Requirement: 1.2, 1.3
     * @param {Object} card - Card object
     * @returns {Object} Calendar event object
     */
    transformCardToCalendarEvent(card) {
        return {
            id: card.id,
            title: card.title,
            date: card.due_date,
            boardId: card.boardId,
            boardTitle: card.boardTitle,
            columnTitle: card.columnTitle,
            priority: card.priority || 'none',
            isOverdue: card.isOverdue,
            isDueToday: card.isDueToday,
            eventType: 'kanban_card_due',
            // Color mapping based on priority or category
            color: this.getCardEventColor(card.priority)
        };
    }

    /**
     * Helper to get color for card event
     */
    getCardEventColor(priority) {
        switch (priority) {
            case 'high': return '#ef4444'; // Red
            case 'medium': return '#f59e0b'; // Amber
            case 'low': return '#10b981'; // Emerald
            default: return '#6366f1'; // Indigo
        }
    }

    // ==================== NAVIGATION API ====================

    /**
     * Navigate to a card in the Kanban view
     * Requirement: 2.1, 2.2, 2.3, 2.4, 14.1
     * @param {string} cardId - ID of the card
     * @param {Object} options - Navigation options (e.g., boardId)
     */
    async navigateToCard(cardId, options = {}) {
        try {
            const card = await kanbanService.getBoardCard(cardId) || await dataService.getKanbanCard(cardId);
            if (!card) throw new Error('Card not found');

            const boardId = card.board_id || options.boardId;
            if (!boardId) throw new Error('Board ID not found for card');

            // Set URL parameters for deep linking
            const url = new URL(window.location.href);
            url.searchParams.set('view', 'kanban');
            url.searchParams.set('boardId', boardId);
            url.searchParams.set('cardId', cardId);
            window.history.pushState({}, '', url);

            // Emit navigation event
            this.emit('navigate', {
                view: 'kanban',
                params: { boardId, cardId }
            });

            return true;
        } catch (error) {
            console.error('Navigation failed:', error);
            if (window.Toast) window.Toast.error('Could not find card');
            return false;
        }
    }

    /**
     * Create a card from the calendar
     * Requirement: 3.1, 3.2
     */
    async createCardFromCalendar(dueDate, cardData = {}) {
        // Emit event to open card creation modal with pre-filled date
        this.emit('openCardModal', {
            mode: 'create',
            preFill: {
                due_date: dueDate,
                ...cardData
            }
        });
    }

    // ==================== HABIT LINKING ====================

    /**
     * Create a card from a habit
     * Requirement: 4.1, 4.2
     */
    async createCardFromHabit(habitId, habitName) {
        this.emit('openCardModal', {
            mode: 'create',
            preFill: {
                title: habitName,
                linked_habit_id: habitId
            }
        });
    }

    /**
     * Get summary statistics for a month
     * Requirement: 12.1, 12.2
     */
    async getMonthlyCompletionSummary(year, month) {
        const cards = await this.getCardsDueThisMonth(year, month);
        const totalCreated = cards.length;
        const completedCards = cards.filter(c => c.columnTitle.toLowerCase() === 'done');
        const totalCompleted = completedCards.length;

        return {
            totalCreated,
            totalCompleted,
            completionRate: totalCreated > 0 ? (totalCompleted / totalCreated) * 100 : 0,
            byPriority: {
                high: cards.filter(c => c.priority === 'high').length,
                medium: cards.filter(c => c.priority === 'medium').length,
                low: cards.filter(c => c.priority === 'low').length
            }
        };
    }
}

const integrationService = new IntegrationService();
export default integrationService;
