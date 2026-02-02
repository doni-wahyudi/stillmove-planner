/**
 * @typedef {Object} DateRange
 * @property {string} startDate - Start of the date range (YYYY-MM-DD)
 * @property {string} endDate - End of the date range (YYYY-MM-DD)
 */

/**
 * @typedef {Object} CompletionMetrics
 * @property {number} totalCompleted - Total cards completed in range
 * @property {number} totalCreated - Total cards created in range
 * @property {number} completionRate - Percentage (0-100)
 * @property {number} avgCompletionTimeMs - Average time to complete in milliseconds
 * @property {Object} byPriority - Cards grouped by priority {high, medium, low, none}
 * @property {Array<{date: string, count: number}>} dailyCompletions - Daily completion counts
 */

/**
 * @typedef {Object} CycleTimeMetrics
 * @property {number} avgCycleTimeMs - Average cycle time in milliseconds
 * @property {Array<{columnId: string, columnTitle: string, avgTimeMs: number}>} columnTimes
 * @property {Array<{date: string, avgTimeMs: number}>} trends - Cycle time over time
 * @property {Array<string>} bottleneckColumnIds - Columns exceeding 1.5x average
 */

/**
 * @typedef {Object} ThroughputMetrics
 * @property {Array<{date: string, columns: Object<string, number>}>} cumulativeFlow
 * @property {Array<{date: string, created: number, completed: number}>} createdVsCompleted
 * @property {Array<{date: string, wip: number}>} wipTrends
 * @property {Array<{date: string, remaining: number}>} burndown
 * @property {Array<{date: string, total: number, completed: number}>} burnup
 * @property {Object<string, string>} columnMap - Mapping of columnId to columnTitle
 */

/**
 * @typedef {Object} BoardHealthMetrics
 * @property {number} overdueCount - Cards past due date
 * @property {number} staleCount - Cards with no recent activity
 * @property {number} wipViolationCount - Columns over WIP limit
 * @property {Array<{id: string, title: string}>} overdueCards - List of overdue cards
 * @property {Array<{id: string, title: string}>} staleCards - List of stale cards
 * @property {Array<{id: string, title: string, current: number, limit: number}>} wipViolations
 */

/**
 * @typedef {Object} BoardAnalytics
 * @property {CompletionMetrics} completion
 * @property {CycleTimeMetrics} cycleTime
 * @property {ThroughputMetrics} throughput
 * @property {BoardHealthMetrics} health
 */

import dataService from './data-service.js';
import kanbanService from './kanban-service.js';

class AnalyticsService {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Get complete analytics for a board
     * @param {string} boardId - Board ID
     * @param {DateRange} dateRange - Date range for analysis
     * @returns {Promise<BoardAnalytics>}
     */
    async getBoardAnalytics(boardId, dateRange) {
        const cacheKey = `${boardId}_${dateRange.startDate}_${dateRange.endDate}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const [completion, cycleTime, throughput, health] = await Promise.all([
            this.getCompletionMetrics(boardId, dateRange),
            this.getCycleTimeMetrics(boardId, dateRange),
            this.getThroughputMetrics(boardId, dateRange),
            this.getBoardHealthMetrics(boardId)
        ]);

        const analytics = { completion, cycleTime, throughput, health };
        this.cache.set(cacheKey, analytics);
        return analytics;
    }

    /**
     * Get cards for a board within date range
     * @param {string} boardId - Board ID
     * @param {DateRange} dateRange - Date range
     * @returns {Promise<Array>}
     */
    async getCardsForBoard(boardId, dateRange) {
        // Fetch all cards for the board (filtering by date range can be done locally or in query)
        // For simplicity and cache efficiency, we fetch all and filter
        const cards = await kanbanService.getBoard(boardId).then(b => b?.cards || []);

        return cards.filter(card => {
            const created = new Date(card.created_at);
            const start = new Date(dateRange.startDate);
            const end = new Date(dateRange.endDate);
            // Include if created before or during the range
            return created <= end;
        });
    }

    /**
     * Get activity logs for a board within date range
     * @param {string} boardId - Board ID
     * @param {DateRange} dateRange - Date range
     * @returns {Promise<Array>}
     */
    async getActivityLogForBoard(boardId, dateRange) {
        return await dataService.getKanbanActivityLogRange(
            boardId,
            dateRange.startDate,
            dateRange.endDate
        );
    }

    /**
     * Get columns for a board
     * @param {string} boardId - Board ID
     * @returns {Promise<Array>}
     */
    async getColumnsForBoard(boardId) {
        return await kanbanService.getBoard(boardId).then(b => b?.columns || []);
    }

    /**
     * Helper to get list of dates in range
     * @param {DateRange} dateRange 
     * @returns {Array<string>} Array of ISO date strings (YYYY-MM-DD)
     */
    getDaysInRange(dateRange) {
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        const days = [];
        let current = new Date(start);

        while (current <= end) {
            days.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }

        return days;
    }

    /**
     * Get card column at a specific date
     * @param {Object} card 
     * @param {Array} activityLog 
     * @param {Date} date 
     * @returns {string|null} Column ID
     */
    getCardColumnAtDate(card, activityLog, date) {
        const cardLogs = activityLog
            .filter(log => log.card_id === card.id && new Date(log.created_at) <= date)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (cardLogs.length > 0) {
            const lastLog = cardLogs[0];
            if (lastLog.action_type === 'card_moved') {
                return lastLog.action_data.to_column_id;
            } else if (lastLog.action_type === 'card_created') {
                return lastLog.action_data.column_id;
            }
        }

        // If no logs before date, check if it was created before date
        if (new Date(card.created_at) <= date) {
            return card.column_id; // Default to current column if no move history
        }

        return null;
    }

    /**
     * Get completion metrics
     * @param {string} boardId - Board ID
     * @param {DateRange} dateRange - Date range
     * @returns {Promise<CompletionMetrics>}
     */
    async getCompletionMetrics(boardId, dateRange) {
        const [cards, activities, columns] = await Promise.all([
            this.getCardsForBoard(boardId, dateRange),
            this.getActivityLogForBoard(boardId, dateRange),
            this.getColumnsForBoard(boardId)
        ]);

        const doneColumn = this.findDoneColumn(columns);
        if (!doneColumn) {
            return {
                totalCompleted: 0,
                totalCreated: 0,
                completionRate: 0,
                avgCompletionTimeMs: 0,
                byPriority: { high: 0, medium: 0, low: 0, none: 0 },
                dailyCompletions: []
            };
        }

        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);

        // Created in range
        const createdInRange = cards.filter(card => {
            const created = new Date(card.created_at);
            return created >= startDate && created <= endDate;
        });

        // Completed in range (moved to Done column)
        const completionLogs = activities.filter(log =>
            log.action_type === 'card_moved' &&
            log.action_data.to_column_id === doneColumn.id
        );

        const completedCards = cards.filter(card =>
            completionLogs.some(log => log.card_id === card.id)
        );

        // Daily completions
        const days = this.getDaysInRange(dateRange);
        const dailyCompletions = days.map(day => {
            const count = completionLogs.filter(log =>
                log.created_at.startsWith(day)
            ).length;
            return { date: day, count };
        });

        // Completion time
        let totalCompletionTime = 0;
        let completionCount = 0;

        completionLogs.forEach(log => {
            const card = cards.find(c => c.id === log.card_id);
            if (card) {
                const duration = new Date(log.created_at) - new Date(card.created_at);
                totalCompletionTime += duration;
                completionCount++;
            }
        });

        // Group by priority
        const byPriority = { high: 0, medium: 0, low: 0, none: 0 };
        completedCards.forEach(card => {
            const p = (card.priority || 'none').toLowerCase();
            if (byPriority.hasOwnProperty(p)) {
                byPriority[p]++;
            } else {
                byPriority.none++;
            }
        });

        return {
            totalCompleted: completionLogs.length,
            totalCreated: createdInRange.length,
            completionRate: createdInRange.length > 0 ? (completionLogs.length / createdInRange.length) * 100 : 0,
            avgCompletionTimeMs: completionCount > 0 ? totalCompletionTime / completionCount : 0,
            byPriority,
            dailyCompletions
        };
    }

    /**
     * Get cycle time metrics
     * @param {string} boardId - Board ID
     * @param {DateRange} dateRange - Date range
     * @returns {Promise<CycleTimeMetrics>}
     */
    async getCycleTimeMetrics(boardId, dateRange) {
        const [cards, activities, columns] = await Promise.all([
            this.getCardsForBoard(boardId, dateRange),
            this.getActivityLogForBoard(boardId, dateRange),
            this.getColumnsForBoard(boardId)
        ]);

        const doneColumn = this.findDoneColumn(columns);
        if (!doneColumn) return { avgCycleTimeMs: 0, columnTimes: [], trends: [], bottleneckColumnIds: [] };

        const completionLogs = activities.filter(log =>
            log.action_type === 'card_moved' &&
            log.action_data.to_column_id === doneColumn.id
        );

        const columnTimeStats = {}; // { columnId: { totalTime: 0, count: 0 } }
        columns.forEach(col => {
            columnTimeStats[col.id] = { totalTime: 0, count: 0 };
        });

        let totalCycleTime = 0;
        let completedCount = 0;
        const dailyAvgCycleTime = {}; // { date: { total: 0, count: 0 } }

        completionLogs.forEach(log => {
            const card = cards.find(c => c.id === log.card_id);
            if (!card) return;

            const completionTime = new Date(log.created_at);
            const creationTime = new Date(card.created_at);
            const cycleTime = completionTime - creationTime;

            totalCycleTime += cycleTime;
            completedCount++;

            const date = log.created_at.split('T')[0];
            if (!dailyAvgCycleTime[date]) dailyAvgCycleTime[date] = { total: 0, count: 0 };
            dailyAvgCycleTime[date].total += cycleTime;
            dailyAvgCycleTime[date].count++;

            // Calculate time in each column for this card
            const cardLogs = activities
                .filter(l => l.card_id === card.id && new Date(l.created_at) <= completionTime)
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            let lastTime = creationTime;
            let lastColumnId = cardLogs.length > 0 && cardLogs[0].action_type === 'card_created'
                ? cardLogs[0].action_data.column_id
                : card.column_id; // Approximation if missing create log

            cardLogs.forEach(entry => {
                if (entry.action_type === 'card_moved') {
                    const currentTime = new Date(entry.created_at);
                    const duration = currentTime - lastTime;

                    if (lastColumnId && columnTimeStats[lastColumnId]) {
                        columnTimeStats[lastColumnId].totalTime += duration;
                        columnTimeStats[lastColumnId].count++;
                    }

                    lastTime = currentTime;
                    lastColumnId = entry.action_data.to_column_id;
                }
            });
        });

        const avgCycleTimeMs = completedCount > 0 ? totalCycleTime / completedCount : 0;

        const columnTimes = columns.map(col => ({
            columnId: col.id,
            columnTitle: col.title,
            avgTimeMs: columnTimeStats[col.id].count > 0
                ? columnTimeStats[col.id].totalTime / columnTimeStats[col.id].count
                : 0
        }));

        const trends = this.getDaysInRange(dateRange).map(day => ({
            date: day,
            avgTimeMs: dailyAvgCycleTime[day] ? dailyAvgCycleTime[day].total / dailyAvgCycleTime[day].count : 0
        }));

        const bottleneckColumnIds = columnTimes
            .filter(ct => ct.avgTimeMs > avgCycleTimeMs * 1.5 && ct.columnId !== doneColumn.id)
            .map(ct => ct.columnId);

        return {
            avgCycleTimeMs,
            columnTimes,
            trends,
            bottleneckColumnIds
        };
    }

    /**
     * Get throughput metrics
     * @param {string} boardId - Board ID
     * @param {DateRange} dateRange - Date range
     * @returns {Promise<ThroughputMetrics>}
     */
    async getThroughputMetrics(boardId, dateRange) {
        const [cards, activities, columns] = await Promise.all([
            this.getCardsForBoard(boardId, dateRange),
            this.getActivityLogForBoard(boardId, dateRange),
            this.getColumnsForBoard(boardId)
        ]);

        const doneColumn = this.findDoneColumn(columns);
        const days = this.getDaysInRange(dateRange);

        const cumulativeFlow = [];
        const createdVsCompleted = [];
        const wipTrends = [];
        const burndown = [];
        const burnup = [];

        days.forEach(day => {
            const date = new Date(day);
            const columnCounts = {};
            columns.forEach(col => columnCounts[col.id] = 0);

            let createdToday = 0;
            let completedToday = 0;
            let totalCardsAtDate = 0;
            let completedCardsAtDate = 0;

            cards.forEach(card => {
                const createdDate = new Date(card.created_at);
                if (createdDate > date) return; // Not created yet

                totalCardsAtDate++;
                if (createdDate.toISOString().split('T')[0] === day) {
                    createdToday++;
                }

                const columnId = this.getCardColumnAtDate(card, activities, date);
                if (columnId && columnCounts.hasOwnProperty(columnId)) {
                    columnCounts[columnId]++;
                    if (doneColumn && columnId === doneColumn.id) {
                        completedCardsAtDate++;
                        // Check if it was completed TODAY
                        const completedLog = activities.find(log =>
                            log.card_id === card.id &&
                            log.action_type === 'card_moved' &&
                            log.action_data.to_column_id === doneColumn.id &&
                            log.created_at.startsWith(day)
                        );
                        if (completedLog) completedToday++;
                    }
                }
            });

            cumulativeFlow.push({ date: day, columns: columnCounts });
            createdVsCompleted.push({ date: day, created: createdToday, completed: completedToday });

            // WIP is cards in columns that are not "Done" and not "Backlog" (approximated)
            const wipCount = Object.entries(columnCounts)
                .filter(([id, count]) => id !== doneColumn?.id)
                .reduce((sum, [id, count]) => sum + count, 0);
            wipTrends.push({ date: day, wip: wipCount });

            burndown.push({ date: day, remaining: totalCardsAtDate - completedCardsAtDate });
            burnup.push({ date: day, total: totalCardsAtDate, completed: completedCardsAtDate });
        });

        return {
            cumulativeFlow,
            createdVsCompleted,
            wipTrends,
            burndown,
            burnup,
            columnMap: columns.reduce((map, col) => {
                map[col.id] = col.title;
                return map;
            }, {})
        };
    }

    /**
     * Get board health metrics
     * @param {string} boardId - Board ID
     * @param {number} staleDaysThreshold - Days without activity to consider stale
     * @returns {Promise<BoardHealthMetrics>}
     */
    async getBoardHealthMetrics(boardId, staleDaysThreshold = 7) {
        const [board, columns] = await Promise.all([
            kanbanService.getBoard(boardId),
            kanbanService.getBoard(boardId).then(b => b?.columns || [])
        ]);

        if (!board) return {
            overdueCount: 0,
            staleCount: 0,
            wipViolationCount: 0,
            overdueCards: [],
            staleCards: [],
            wipViolations: []
        };

        const cards = board.cards || [];
        const now = new Date();
        const staleThresholdDate = new Date();
        staleThresholdDate.setDate(now.getDate() - staleDaysThreshold);

        const overdueCards = cards.filter(card =>
            card.due_date && new Date(card.due_date) < now && !this.isCardDone(card, columns)
        ).map(card => ({ id: card.id, title: card.title }));

        const staleCards = cards.filter(card =>
            new Date(card.updated_at || card.created_at) < staleThresholdDate && !this.isCardDone(card, columns)
        ).map(card => ({ id: card.id, title: card.title }));

        const wipViolations = [];
        columns.forEach(col => {
            if (col.wip_limit && col.wip_limit > 0) {
                const currentCount = cards.filter(c => c.column_id === col.id).length;
                if (currentCount > col.wip_limit) {
                    wipViolations.push({
                        id: col.id,
                        title: col.title,
                        current: currentCount,
                        limit: col.wip_limit
                    });
                }
            }
        });

        return {
            overdueCount: overdueCards.length,
            staleCount: staleCards.length,
            wipViolationCount: wipViolations.length,
            overdueCards,
            staleCards,
            wipViolations
        };
    }

    /**
     * Helper to check if a card is in the Done column
     * @param {Object} card 
     * @param {Array} columns 
     * @returns {boolean}
     */
    isCardDone(card, columns) {
        const doneColumn = this.findDoneColumn(columns);
        return doneColumn && card.column_id === doneColumn.id;
    }

    /**
     * Identify the "Done" column for a board
     * @param {Array} columns - Board columns
     * @returns {Object|null} Done column or null
     */
    findDoneColumn(columns) {
        if (!columns) return null;
        return columns.find(col => {
            const title = col.title?.toLowerCase() || '';
            return title === 'done' || title === 'completed' || title === 'finished';
        });
    }

    /**
     * Helper to invalidate cache
     */
    clearCache() {
        this.cache.clear();
    }
}

const analyticsService = new AnalyticsService();
export default analyticsService;
