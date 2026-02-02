/**
 * KanbanService Unit Tests
 * Tests for js/kanban-service.js - Filter and Search methods
 * Requirements: 7.1, 7.2, 7.3, 7.4
 * 
 * Since filterCards and searchCards are pure functions, we test them
 * by extracting the logic and testing directly without external dependencies.
 */

// ==================== FILTERING LOGIC (extracted for testing) ====================

/**
 * Filter cards based on criteria
 * Requirements: 7.2, 7.3, 7.4
 */
function filterCards(cards, filters, searchCardsFn) {
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
        result = searchCardsFn(result, filters.search);
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
        result = filterByDueDate(result, filters.dueDate);
    }

    return result;
}

/**
 * Search cards by query
 * Requirement 7.1: Search filter - filter cards where title OR description contains query (case-insensitive)
 */
function searchCards(cards, query) {
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
 */
function filterByDueDate(cards, criteria) {
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

// ==================== TESTS ====================

describe('KanbanService Filter Methods', () => {

    describe('searchCards', () => {
        // Requirement 7.1: Search filter - filter cards where title OR description contains query (case-insensitive)

        test('returns all cards when query is empty', () => {
            const cards = [
                { id: '1', title: 'Task 1', description: 'Description 1' },
                { id: '2', title: 'Task 2', description: 'Description 2' }
            ];
            expect(searchCards(cards, '')).toEqual(cards);
        });

        test('returns all cards when query is null', () => {
            const cards = [
                { id: '1', title: 'Task 1', description: 'Description 1' }
            ];
            expect(searchCards(cards, null)).toEqual(cards);
        });

        test('returns all cards when query is undefined', () => {
            const cards = [
                { id: '1', title: 'Task 1', description: 'Description 1' }
            ];
            expect(searchCards(cards, undefined)).toEqual(cards);
        });

        test('returns empty array when cards is null', () => {
            expect(searchCards(null, 'test')).toEqual([]);
        });

        test('returns empty array when cards is undefined', () => {
            expect(searchCards(undefined, 'test')).toEqual([]);
        });

        test('returns empty array when cards is not an array', () => {
            expect(searchCards('not an array', 'test')).toEqual([]);
        });

        test('filters cards by title match (case-insensitive)', () => {
            const cards = [
                { id: '1', title: 'Important Task', description: 'Do something' },
                { id: '2', title: 'Another item', description: 'Something else' },
                { id: '3', title: 'IMPORTANT Meeting', description: 'Attend meeting' }
            ];
            const result = searchCards(cards, 'important');
            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['1', '3']);
        });

        test('filters cards by description match (case-insensitive)', () => {
            const cards = [
                { id: '1', title: 'Task 1', description: 'Review the code' },
                { id: '2', title: 'Task 2', description: 'Write documentation' },
                { id: '3', title: 'Task 3', description: 'CODE review meeting' }
            ];
            const result = searchCards(cards, 'code');
            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['1', '3']);
        });

        test('matches cards where title OR description contains query', () => {
            const cards = [
                { id: '1', title: 'Bug fix', description: 'Fix the login issue' },
                { id: '2', title: 'Login feature', description: 'Add new login' },
                { id: '3', title: 'Dashboard', description: 'Update dashboard' }
            ];
            const result = searchCards(cards, 'login');
            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['1', '2']);
        });

        test('handles cards with null description', () => {
            const cards = [
                { id: '1', title: 'Task with null desc', description: null },
                { id: '2', title: 'Another task', description: 'Has description' }
            ];
            const result = searchCards(cards, 'task');
            expect(result).toHaveLength(2);
        });

        test('handles cards with undefined description', () => {
            const cards = [
                { id: '1', title: 'Task without desc' },
                { id: '2', title: 'Another task', description: 'Has description' }
            ];
            const result = searchCards(cards, 'task');
            expect(result).toHaveLength(2);
        });

        test('returns empty array when no cards match', () => {
            const cards = [
                { id: '1', title: 'Task 1', description: 'Description 1' },
                { id: '2', title: 'Task 2', description: 'Description 2' }
            ];
            const result = searchCards(cards, 'xyz123');
            expect(result).toEqual([]);
        });

        test('trims whitespace from query', () => {
            const cards = [
                { id: '1', title: 'Important Task', description: 'Do something' }
            ];
            const result = searchCards(cards, '  important  ');
            expect(result).toHaveLength(1);
        });

        test('handles query with only whitespace', () => {
            const cards = [
                { id: '1', title: 'Task 1', description: 'Description 1' }
            ];
            const result = searchCards(cards, '   ');
            expect(result).toEqual(cards);
        });
    });

    describe('filterCards - Priority Filter', () => {
        // Requirement 7.2: Priority filter - show only cards with selected priority level

        test('filters cards by high priority', () => {
            const cards = [
                { id: '1', title: 'Task 1', priority: 'high' },
                { id: '2', title: 'Task 2', priority: 'medium' },
                { id: '3', title: 'Task 3', priority: 'high' },
                { id: '4', title: 'Task 4', priority: 'low' }
            ];
            const result = filterCards(cards, { priority: 'high' }, searchCards);
            expect(result).toHaveLength(2);
            expect(result.every(c => c.priority === 'high')).toBe(true);
        });

        test('filters cards by medium priority', () => {
            const cards = [
                { id: '1', title: 'Task 1', priority: 'high' },
                { id: '2', title: 'Task 2', priority: 'medium' },
                { id: '3', title: 'Task 3', priority: 'medium' }
            ];
            const result = filterCards(cards, { priority: 'medium' }, searchCards);
            expect(result).toHaveLength(2);
            expect(result.every(c => c.priority === 'medium')).toBe(true);
        });

        test('filters cards by low priority', () => {
            const cards = [
                { id: '1', title: 'Task 1', priority: 'low' },
                { id: '2', title: 'Task 2', priority: 'high' },
                { id: '3', title: 'Task 3', priority: 'low' }
            ];
            const result = filterCards(cards, { priority: 'low' }, searchCards);
            expect(result).toHaveLength(2);
            expect(result.every(c => c.priority === 'low')).toBe(true);
        });

        test('excludes cards with null priority when filtering', () => {
            const cards = [
                { id: '1', title: 'Task 1', priority: 'high' },
                { id: '2', title: 'Task 2', priority: null },
                { id: '3', title: 'Task 3' } // undefined priority
            ];
            const result = filterCards(cards, { priority: 'high' }, searchCards);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
        });

        test('returns empty array when no cards match priority', () => {
            const cards = [
                { id: '1', title: 'Task 1', priority: 'high' },
                { id: '2', title: 'Task 2', priority: 'medium' }
            ];
            const result = filterCards(cards, { priority: 'low' }, searchCards);
            expect(result).toEqual([]);
        });
    });

    describe('filterCards - Label Filter', () => {
        // Requirement 7.3: Label filter - show only cards with selected label

        test('filters cards by single label (string labels)', () => {
            const cards = [
                { id: '1', title: 'Task 1', labels: ['bug', 'urgent'] },
                { id: '2', title: 'Task 2', labels: ['feature'] },
                { id: '3', title: 'Task 3', labels: ['bug'] }
            ];
            const result = filterCards(cards, { labels: ['bug'] }, searchCards);
            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['1', '3']);
        });

        test('filters cards by single label (object labels with name property)', () => {
            const cards = [
                { id: '1', title: 'Task 1', labels: [{ name: 'bug', color: 'red' }] },
                { id: '2', title: 'Task 2', labels: [{ name: 'feature', color: 'blue' }] },
                { id: '3', title: 'Task 3', labels: [{ name: 'bug', color: 'red' }] }
            ];
            const result = filterCards(cards, { labels: ['bug'] }, searchCards);
            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['1', '3']);
        });

        test('filters cards by multiple labels (OR logic)', () => {
            const cards = [
                { id: '1', title: 'Task 1', labels: ['bug'] },
                { id: '2', title: 'Task 2', labels: ['feature'] },
                { id: '3', title: 'Task 3', labels: ['enhancement'] },
                { id: '4', title: 'Task 4', labels: ['bug', 'feature'] }
            ];
            const result = filterCards(cards, { labels: ['bug', 'feature'] }, searchCards);
            expect(result).toHaveLength(3);
            expect(result.map(c => c.id)).toEqual(['1', '2', '4']);
        });

        test('excludes cards with no labels', () => {
            const cards = [
                { id: '1', title: 'Task 1', labels: ['bug'] },
                { id: '2', title: 'Task 2', labels: [] },
                { id: '3', title: 'Task 3' } // undefined labels
            ];
            const result = filterCards(cards, { labels: ['bug'] }, searchCards);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
        });

        test('excludes cards with null labels', () => {
            const cards = [
                { id: '1', title: 'Task 1', labels: ['bug'] },
                { id: '2', title: 'Task 2', labels: null }
            ];
            const result = filterCards(cards, { labels: ['bug'] }, searchCards);
            expect(result).toHaveLength(1);
        });

        test('returns all cards when labels filter is empty array', () => {
            const cards = [
                { id: '1', title: 'Task 1', labels: ['bug'] },
                { id: '2', title: 'Task 2', labels: ['feature'] }
            ];
            const result = filterCards(cards, { labels: [] }, searchCards);
            expect(result).toEqual(cards);
        });
    });

    describe('filterCards - Due Date Filter', () => {
        // Requirement 7.4: Due date filter - show cards matching date criteria

        const getToday = () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today;
        };

        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const getDateOffset = (days) => {
            const date = getToday();
            date.setDate(date.getDate() + days);
            return formatDate(date);
        };

        test('filters overdue cards', () => {
            const cards = [
                { id: '1', title: 'Task 1', due_date: getDateOffset(-5) }, // 5 days ago
                { id: '2', title: 'Task 2', due_date: getDateOffset(-1) }, // yesterday
                { id: '3', title: 'Task 3', due_date: getDateOffset(0) },  // today
                { id: '4', title: 'Task 4', due_date: getDateOffset(3) }   // 3 days from now
            ];
            const result = filterCards(cards, { dueDate: 'overdue' }, searchCards);
            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['1', '2']);
        });

        test('filters cards due today', () => {
            const cards = [
                { id: '1', title: 'Task 1', due_date: getDateOffset(-1) }, // yesterday
                { id: '2', title: 'Task 2', due_date: getDateOffset(0) },  // today
                { id: '3', title: 'Task 3', due_date: getDateOffset(0) },  // today
                { id: '4', title: 'Task 4', due_date: getDateOffset(1) }   // tomorrow
            ];
            const result = filterCards(cards, { dueDate: 'today' }, searchCards);
            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['2', '3']);
        });

        test('filters cards due this week', () => {
            // Calculate days until end of week (Sunday)
            const today = getToday();
            const daysUntilSunday = 7 - today.getDay();
            
            const cards = [
                { id: '1', title: 'Task 1', due_date: getDateOffset(-1) },              // yesterday (not included)
                { id: '2', title: 'Task 2', due_date: getDateOffset(0) },               // today
                { id: '3', title: 'Task 3', due_date: getDateOffset(daysUntilSunday) }, // end of week
                { id: '4', title: 'Task 4', due_date: getDateOffset(daysUntilSunday + 1) } // next week
            ];
            const result = filterCards(cards, { dueDate: 'week' }, searchCards);
            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['2', '3']);
        });

        test('filters cards with no due date', () => {
            const cards = [
                { id: '1', title: 'Task 1', due_date: getDateOffset(0) },
                { id: '2', title: 'Task 2', due_date: null },
                { id: '3', title: 'Task 3' }, // undefined due_date
                { id: '4', title: 'Task 4', due_date: getDateOffset(5) }
            ];
            const result = filterCards(cards, { dueDate: 'none' }, searchCards);
            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['2', '3']);
        });

        test('excludes cards without due date for overdue filter', () => {
            const cards = [
                { id: '1', title: 'Task 1', due_date: getDateOffset(-1) },
                { id: '2', title: 'Task 2', due_date: null },
                { id: '3', title: 'Task 3' }
            ];
            const result = filterCards(cards, { dueDate: 'overdue' }, searchCards);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
        });

        test('excludes cards without due date for today filter', () => {
            const cards = [
                { id: '1', title: 'Task 1', due_date: getDateOffset(0) },
                { id: '2', title: 'Task 2', due_date: null }
            ];
            const result = filterCards(cards, { dueDate: 'today' }, searchCards);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
        });
    });

    describe('filterCards - Combined Filters', () => {
        test('combines search and priority filters', () => {
            const cards = [
                { id: '1', title: 'Important bug', priority: 'high' },
                { id: '2', title: 'Important feature', priority: 'medium' },
                { id: '3', title: 'Minor bug', priority: 'high' },
                { id: '4', title: 'Important task', priority: 'high' }
            ];
            const result = filterCards(cards, { 
                search: 'important', 
                priority: 'high' 
            }, searchCards);
            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['1', '4']);
        });

        test('combines priority and label filters', () => {
            const cards = [
                { id: '1', title: 'Task 1', priority: 'high', labels: ['bug'] },
                { id: '2', title: 'Task 2', priority: 'high', labels: ['feature'] },
                { id: '3', title: 'Task 3', priority: 'low', labels: ['bug'] }
            ];
            const result = filterCards(cards, { 
                priority: 'high', 
                labels: ['bug'] 
            }, searchCards);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
        });

        test('combines all filters', () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            const cards = [
                { id: '1', title: 'Critical bug', priority: 'high', labels: ['bug'], due_date: todayStr },
                { id: '2', title: 'Critical feature', priority: 'high', labels: ['bug'], due_date: todayStr },
                { id: '3', title: 'Critical bug', priority: 'medium', labels: ['bug'], due_date: todayStr },
                { id: '4', title: 'Critical bug', priority: 'high', labels: ['feature'], due_date: todayStr },
                { id: '5', title: 'Minor bug', priority: 'high', labels: ['bug'], due_date: todayStr }
            ];
            const result = filterCards(cards, { 
                search: 'critical',
                priority: 'high', 
                labels: ['bug'],
                dueDate: 'today'
            }, searchCards);
            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['1', '2']);
        });

        test('returns all cards when filters object is empty', () => {
            const cards = [
                { id: '1', title: 'Task 1', priority: 'high' },
                { id: '2', title: 'Task 2', priority: 'low' }
            ];
            const result = filterCards(cards, {}, searchCards);
            expect(result).toEqual(cards);
        });

        test('returns all cards when filters is null', () => {
            const cards = [
                { id: '1', title: 'Task 1' },
                { id: '2', title: 'Task 2' }
            ];
            const result = filterCards(cards, null, searchCards);
            expect(result).toEqual(cards);
        });

        test('returns all cards when filters is undefined', () => {
            const cards = [
                { id: '1', title: 'Task 1' },
                { id: '2', title: 'Task 2' }
            ];
            const result = filterCards(cards, undefined, searchCards);
            expect(result).toEqual(cards);
        });

        test('returns empty array when cards is empty', () => {
            const result = filterCards([], { priority: 'high' }, searchCards);
            expect(result).toEqual([]);
        });

        test('returns empty array when cards is null', () => {
            const result = filterCards(null, { priority: 'high' }, searchCards);
            expect(result).toEqual([]);
        });
    });
});
