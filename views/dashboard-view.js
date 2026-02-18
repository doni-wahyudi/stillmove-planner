/**
 * Dashboard View Controller
 * Central hub aggregating data from all features (habits, goals, calendar, Kanban, Pomodoro)
 */

import dataService from '../js/data-service.js';
import kanbanService from '../js/kanban-service.js';
import { formatDate } from '../js/utils.js';

/**
 * Base Widget class with error handling
 */
class BaseWidget {
    constructor(id, title) {
        this.id = id;
        this.title = title;
        this.isLoading = false;
        this.hasError = false;
        this.errorMessage = null;
        this.container = null;
    }

    async safeLoad() {
        this.isLoading = true;
        this.hasError = false;
        this.errorMessage = null;

        try {
            await this.load();
        } catch (error) {
            console.error(`Widget ${this.id} failed to load:`, error);
            this.hasError = true;
            this.errorMessage = error.message || 'Failed to load data';
        } finally {
            this.isLoading = false;
        }
    }

    async load() {
        // Override in subclasses
    }

    render() {
        if (this.hasError) {
            return this.renderError();
        }
        return this.renderContent();
    }

    renderContent() {
        return '<p>No content</p>';
    }

    renderError() {
        return `
            <div class="widget-error" role="alert">
                <span class="error-icon">⚠️</span>
                <p>${this.errorMessage}</p>
                <button class="btn-retry" data-widget="${this.id}">Retry</button>
            </div>
        `;
    }

    setContainer(element) {
        this.container = element;
    }

    updateContainer() {
        if (this.container) {
            this.container.innerHTML = this.render();
        }
    }
}

/**
 * Today's Overview Widget - habits, time blocks, wellness
 */
class TodayOverviewWidget extends BaseWidget {
    constructor(dataService, stateManager) {
        super('today', "Today's Overview");
        this.dataService = dataService;
        this.stateManager = stateManager;
        this.habits = [];
        this.completions = [];
        this.timeBlocks = [];
        this.wellnessData = { mood: null, sleep: null, water: null };
    }

    async load() {
        const today = formatDate(new Date());

        // Parallel data fetching
        const [habits, completions, timeBlocks, mood, sleep, water] = await Promise.all([
            this.dataService.getDailyHabits(),
            this.dataService.getDailyHabitCompletions(today, today),
            this.dataService.getTimeBlocks(today),
            this.dataService.getMoodEntries(today, today).catch(() => []),
            this.dataService.getSleepEntries(today, today).catch(() => []),
            this.dataService.getWaterEntries(today, today).catch(() => [])
        ]);

        this.habits = habits || [];
        this.completions = completions || [];
        this.timeBlocks = (timeBlocks || []).sort((a, b) =>
            (a.start_time || '').localeCompare(b.start_time || '')
        );
        this.wellnessData = {
            mood: mood[0] || null,
            sleep: sleep[0] || null,
            water: water[0] || null
        };
    }

    renderContent() {
        const today = formatDate(new Date());
        const completedIds = new Set(this.completions.filter(c => c.completed).map(c => c.habit_id));
        const completedCount = this.habits.filter(h => completedIds.has(h.id)).length;
        const totalHabits = this.habits.length;

        let html = '<div class="today-overview">';

        // Habits section
        html += '<div class="overview-section">';
        html += `<h4>Habits (${completedCount}/${totalHabits})</h4>`;
        if (this.habits.length === 0) {
            html += '<p class="empty-state">No habits to track. <a href="#habits">Add habits</a></p>';
        } else {
            html += '<div class="habits-quick-list">';
            this.habits.slice(0, 5).forEach(habit => {
                const isCompleted = completedIds.has(habit.id);
                html += `
                    <label class="habit-quick-item ${isCompleted ? 'completed' : ''}">
                        <input type="checkbox" 
                               data-habit-id="${habit.id}" 
                               ${isCompleted ? 'checked' : ''} 
                               class="habit-toggle">
                        <span class="habit-name">${habit.habit_name || 'Unnamed'}</span>
                    </label>
                `;
            });
            if (this.habits.length > 5) {
                html += `<a href="#habits" class="view-more">+${this.habits.length - 5} more</a>`;
            }
            html += '</div>';
        }
        html += '</div>';

        // Time blocks section - filter to show only current hour and future
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const upcomingBlocks = this.timeBlocks.filter(block => {
            // Show blocks where end_time is >= current time (still ongoing or future)
            const endTime = block.end_time ? block.end_time.slice(0, 5) : '23:59';
            return endTime >= currentTime;
        });

        html += '<div class="overview-section">';
        html += '<h4>Today\'s Schedule</h4>';
        if (upcomingBlocks.length === 0) {
            html += '<p class="empty-state">No upcoming time blocks</p>';
        } else {
            html += '<div class="timeblocks-list">';
            upcomingBlocks.slice(0, 3).forEach(block => {
                const startTime = block.start_time ? block.start_time.slice(0, 5) : '';
                const endTime = block.end_time ? block.end_time.slice(0, 5) : '';
                html += `
                    <div class="timeblock-item">
                        <span class="timeblock-time">${startTime} - ${endTime}</span>
                        <span class="timeblock-activity">${block.activity || 'Untitled'}</span>
                    </div>
                `;
            });
            if (upcomingBlocks.length > 3) {
                html += `<a href="#monthly" class="view-more">View all</a>`;
            }
            html += '</div>';
        }
        html += '</div>';

        // Wellness section
        html += '<div class="overview-section wellness-summary">';
        html += '<h4>Wellness</h4>';
        html += '<div class="wellness-icons">';
        html += this.wellnessData.mood
            ? `<span class="wellness-item" title="Today's mood">${this.wellnessData.mood.mood}</span>`
            : '<span class="wellness-item missing" title="Log mood">😶</span>';
        html += this.wellnessData.sleep
            ? `<span class="wellness-item" title="Sleep logged">😴</span>`
            : '<span class="wellness-item missing" title="Log sleep">💤</span>';
        html += this.wellnessData.water
            ? `<span class="wellness-item" title="${this.wellnessData.water.glasses || 0} glasses">💧</span>`
            : '<span class="wellness-item missing" title="Log water">💧</span>';
        html += '</div>';
        html += '</div>';

        // Active Pomodoro
        const pomodoroState = this.stateManager?.getState('pomodoro');
        if (pomodoroState?.isRunning) {
            html += '<div class="overview-section pomodoro-active">';
            html += `<span class="pomodoro-indicator">🍅 ${pomodoroState.mode} in progress</span>`;
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    async toggleHabitCompletion(habitId, completed) {
        const today = formatDate(new Date());
        try {
            if (completed) {
                await this.dataService.createDailyHabitCompletion({
                    habit_id: habitId,
                    date: today,
                    completed: true
                });
            } else {
                await this.dataService.deleteDailyHabitCompletion(habitId, today);
            }
            await this.load();
            this.updateContainer();
        } catch (error) {
            console.error('Failed to toggle habit:', error);
            if (window.showToast) {
                window.showToast('Failed to update habit', 'error');
            }
        }
    }
}

/**
 * Goals Progress Widget - annual and weekly goals
 */
class GoalsProgressWidget extends BaseWidget {
    constructor(dataService) {
        super('goals', 'Goals Progress');
        this.dataService = dataService;
        this.annualGoals = [];
        this.weeklyGoals = [];
    }

    async load() {
        const currentYear = new Date().getFullYear();
        const { year, weekNumber } = this.getCurrentWeek();

        const [annualGoals, weeklyGoals] = await Promise.all([
            this.dataService.getAnnualGoals(currentYear),
            this.dataService.getWeeklyGoals(year, weekNumber)
        ]);

        this.annualGoals = annualGoals || [];
        this.weeklyGoals = weeklyGoals || [];
    }

    getCurrentWeek() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = now - start;
        const oneWeek = 604800000;
        const weekNumber = Math.ceil((diff / oneWeek) + 1);
        return { year: now.getFullYear(), weekNumber };
    }

    renderContent() {
        let html = '<div class="goals-overview">';

        // Annual Goals
        html += '<div class="goals-section">';
        html += '<h4>Annual Goals</h4>';
        if (this.annualGoals.length === 0) {
            html += '<p class="empty-state">No annual goals set. <a href="#annual">Add goals</a></p>';
        } else {
            html += '<div class="goals-list">';
            this.annualGoals.slice(0, 3).forEach(goal => {
                const progress = goal.progress || 0;
                html += `
                    <div class="goal-item" data-goal-id="${goal.id}">
                        <div class="goal-info">
                            <span class="goal-title">${goal.title || 'Untitled'}</span>
                            <span class="goal-progress">${progress}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                `;
            });
            if (this.annualGoals.length > 3) {
                html += `<a href="#annual" class="view-more">+${this.annualGoals.length - 3} more goals</a>`;
            }
            html += '</div>';
        }
        html += '</div>';

        // Weekly Goals
        html += '<div class="goals-section">';
        html += '<h4>This Week</h4>';
        if (this.weeklyGoals.length === 0) {
            html += '<p class="empty-state">No weekly goals. <a href="#weekly">Add goals</a></p>';
        } else {
            const completed = this.weeklyGoals.filter(g => g.completed).length;
            html += `<p class="goals-summary">${completed}/${this.weeklyGoals.length} completed</p>`;
            html += '<div class="weekly-goals-list">';
            this.weeklyGoals.slice(0, 3).forEach(goal => {
                html += `
                    <label class="weekly-goal-item ${goal.completed ? 'completed' : ''}">
                        <input type="checkbox" 
                               data-weekly-goal-id="${goal.id}" 
                               ${goal.completed ? 'checked' : ''} 
                               class="weekly-goal-toggle">
                        <span>${goal.goal_text || 'Untitled'}</span>
                    </label>
                `;
            });
            html += '</div>';
        }
        html += '</div>';

        html += '</div>';
        return html;
    }

    async toggleWeeklyGoal(goalId, completed) {
        try {
            await this.dataService.updateWeeklyGoal(goalId, { completed });
            await this.load();
            this.updateContainer();
        } catch (error) {
            console.error('Failed to toggle weekly goal:', error);
        }
    }
}

/**
 * Kanban Summary Widget - cards due today/this week with board selector
 */
class KanbanSummaryWidget extends BaseWidget {
    constructor(kanbanService) {
        super('kanban', 'Tasks');
        this.kanbanService = kanbanService;
        this.cardsDueToday = [];
        this.cardsDueThisWeek = [];
        this.recentlyCompleted = [];
        this.boards = [];
        this.selectedBoardId = this.loadSelectedBoard(); // 'all' or a board UUID
        this.wipStatus = { inProgress: 0, total: 0 };
    }

    loadSelectedBoard() {
        try {
            return localStorage.getItem('dashboard_kanban_board') || 'all';
        } catch (e) {
            return 'all';
        }
    }

    saveSelectedBoard(boardId) {
        try {
            localStorage.setItem('dashboard_kanban_board', boardId);
        } catch (e) {
            console.warn('Failed to save board selection:', e);
        }
    }

    async load() {
        const boards = await this.kanbanService.getBoards() || [];
        this.boards = boards;

        // Validate selected board still exists
        if (this.selectedBoardId !== 'all' && !boards.find(b => b.id === this.selectedBoardId)) {
            this.selectedBoardId = 'all';
            this.saveSelectedBoard('all');
        }

        const today = formatDate(new Date());
        const weekEnd = this.getWeekEndDate();

        let allCards = [];
        const boardsToLoad = this.selectedBoardId === 'all'
            ? boards
            : boards.filter(b => b.id === this.selectedBoardId);

        for (const board of boardsToLoad) {
            try {
                const fullBoard = await this.kanbanService.getBoard(board.id);
                if (fullBoard?.cards && fullBoard?.columns) {
                    // Create a map of column_id to column title
                    const columnMap = new Map();
                    fullBoard.columns.forEach(col => {
                        columnMap.set(col.id, col.title);
                    });

                    // Map cards with column_title and board title
                    allCards = allCards.concat(
                        fullBoard.cards.map(c => ({
                            ...c,
                            boardTitle: board.title,
                            column_title: columnMap.get(c.column_id) || ''
                        }))
                    );
                }
            } catch (e) {
                console.warn(`Failed to load board ${board.id}:`, e);
            }
        }

        this.cardsDueToday = allCards.filter(c => c.due_date === today && !this.isInDoneColumn(c));
        this.cardsDueThisWeek = allCards.filter(c =>
            c.due_date && c.due_date > today && c.due_date <= weekEnd && !this.isInDoneColumn(c)
        );

        const sevenDaysAgo = this.getDateDaysAgo(7);
        this.recentlyCompleted = allCards.filter(c =>
            this.isInDoneColumn(c) && c.updated_at >= sevenDaysAgo
        ).slice(0, 5);

        // Cards currently in progress
        this.cardsInProgress = allCards.filter(c => this.isInProgressColumn(c));

        this.wipStatus = {
            inProgress: this.cardsInProgress.length,
            total: allCards.filter(c => !c.is_backlog).length
        };
    }

    getWeekEndDate() {
        const d = new Date();
        const day = d.getDay();
        const diff = day === 0 ? 0 : 7 - day;
        d.setDate(d.getDate() + diff);
        return formatDate(d);
    }

    getDateDaysAgo(days) {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return formatDate(d);
    }

    isInDoneColumn(card) {
        const title = card.column_title?.toLowerCase() || '';
        return title === 'done' || title === 'completed' || title === 'finished';
    }

    isInProgressColumn(card) {
        const title = card.column_title?.toLowerCase() || '';
        // Check for various ways to name an "in progress" column
        return title.includes('progress') || title === 'doing' || title === 'wip' || title === 'in-progress';
    }

    async setSelectedBoard(boardId) {
        this.selectedBoardId = boardId;
        this.saveSelectedBoard(boardId);
        await this.safeLoad();
        this.updateContainer();
    }

    renderContent() {
        let html = '<div class="kanban-overview">';

        // Board selector
        html += '<div class="kanban-board-selector">';
        html += '<select id="dashboard-board-select" class="board-select" aria-label="Select board">';
        html += `<option value="all" ${this.selectedBoardId === 'all' ? 'selected' : ''}>All Boards</option>`;
        this.boards.forEach(board => {
            const selected = this.selectedBoardId === board.id ? 'selected' : '';
            html += `<option value="${board.id}" ${selected}>${board.title || 'Untitled'}</option>`;
        });
        html += '</select>';
        html += '</div>';

        // Due Today
        html += '<div class="kanban-section">';
        html += `<h4>Due Today (${this.cardsDueToday.length})</h4>`;
        if (this.cardsDueToday.length === 0) {
            html += '<p class="empty-state">No cards due today 🎉</p>';
        } else {
            html += '<div class="cards-list">';
            this.cardsDueToday.slice(0, 3).forEach(card => {
                html += `
                    <div class="card-item priority-${card.priority || 'medium'}">
                        <span class="card-title">${card.title || 'Untitled'}</span>
                        <span class="card-board">${card.boardTitle || ''}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        html += '</div>';

        // Due This Week
        if (this.cardsDueThisWeek.length > 0) {
            html += '<div class="kanban-section">';
            html += `<h4>This Week (${this.cardsDueThisWeek.length})</h4>`;
            html += '<div class="cards-list">';
            this.cardsDueThisWeek.slice(0, 2).forEach(card => {
                html += `
                    <div class="card-item priority-${card.priority || 'medium'}">
                        <span class="card-title">${card.title || 'Untitled'}</span>
                    </div>
                `;
            });
            html += '</div>';
            html += '</div>';
        }

        // In Progress cards
        html += '<div class="kanban-section">';
        html += `<h4>In Progress (${this.cardsInProgress.length})</h4>`;
        if (this.cardsInProgress.length === 0) {
            html += '<p class="empty-state">No cards in progress</p>';
        } else {
            html += '<div class="cards-list">';
            this.cardsInProgress.slice(0, 3).forEach(card => {
                html += `
                    <div class="card-item priority-${card.priority || 'medium'}">
                        <span class="card-title">${card.title || 'Untitled'}</span>
                        <span class="card-board">${card.boardTitle || ''}</span>
                    </div>
                `;
            });
            if (this.cardsInProgress.length > 3) {
                html += `<span class="view-more-count">+${this.cardsInProgress.length - 3} more</span>`;
            }
            html += '</div>';
        }
        html += '</div>';

        // Quick link to Kanban
        if (this.boards.length > 0) {
            html += '<a href="#kanban" class="view-more">Open Kanban Board →</a>';
        } else {
            html += '<p class="empty-state"><a href="#kanban">Create your first board</a></p>';
        }

        html += '</div>';
        return html;
    }
}

/**
 * Calendar Widget - mini calendar with highlights
 */
class CalendarWidget extends BaseWidget {
    constructor(dataService) {
        super('calendar', 'Calendar');
        this.dataService = dataService;
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.eventDays = new Set();
        this.completionDays = new Set();
    }

    async load() {
        const startDate = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-01`;
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const endDate = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${daysInMonth}`;

        try {
            const [timeBlocks, habitCompletions] = await Promise.all([
                this.dataService.getTimeBlocksRange ?
                    this.dataService.getTimeBlocksRange(startDate, endDate) :
                    Promise.resolve([]),
                this.dataService.getDailyHabitCompletions(startDate, endDate)
            ]);

            this.eventDays = new Set((timeBlocks || []).map(tb => tb.date));

            const completionsByDate = {};
            (habitCompletions || []).forEach(c => {
                if (c.completed) {
                    completionsByDate[c.date] = (completionsByDate[c.date] || 0) + 1;
                }
            });
            this.completionDays = new Set(Object.keys(completionsByDate));
        } catch (e) {
            console.warn('Failed to load calendar data:', e);
        }
    }

    navigateMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
    }

    renderContent() {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        const today = new Date();
        const todayStr = formatDate(today);
        const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

        let html = '<div class="mini-calendar">';

        // Day headers
        html += '<div class="calendar-header-row">';
        dayNames.forEach(day => {
            html += `<span class="calendar-day-header">${day}</span>`;
        });
        html += '</div>';

        // Calendar grid
        html += '<div class="calendar-days">';

        // Empty cells for days before first of month
        for (let i = 0; i < firstDay; i++) {
            html += '<span class="calendar-day empty"></span>';
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const hasEvent = this.eventDays.has(dateStr);
            const hasCompletion = this.completionDays.has(dateStr);

            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (hasEvent) classes += ' has-event';
            if (hasCompletion) classes += ' has-completion';

            html += `<span class="${classes}" data-date="${dateStr}">${day}</span>`;
        }

        html += '</div>';
        html += '</div>';

        return html;
    }
}

/**
 * Statistics Summary Widget - streaks, Pomodoro count, cards completed
 */
class StatisticsSummaryWidget extends BaseWidget {
    constructor(dataService, kanbanService) {
        super('stats', 'Statistics');
        this.dataService = dataService;
        this.kanbanService = kanbanService;
        this.stats = {
            habitStreak: 0,
            pomodoroThisWeek: 0,
            cardsCompletedThisWeek: 0,
            readingProgress: { completed: 0, total: 0 }
        };
    }

    async load() {
        const today = new Date();
        const weekStart = this.getWeekStart(today);
        const weekStartStr = formatDate(weekStart);
        const todayStr = formatDate(today);

        try {
            const [readingList] = await Promise.all([
                this.dataService.getReadingList(today.getFullYear())
            ]);

            // Calculate habit streak
            this.stats.habitStreak = await this.calculateHabitStreak();

            // Pomodoro sessions this week (if method exists)
            if (this.dataService.getPomodoroSessionsRange) {
                try {
                    const sessions = await this.dataService.getPomodoroSessionsRange(weekStartStr, todayStr);
                    this.stats.pomodoroThisWeek = (sessions || [])
                        .filter(s => s.session_type === 'focus' && s.was_completed).length;
                } catch (e) {
                    this.stats.pomodoroThisWeek = 0;
                }
            }

            // Cards completed this week
            this.stats.cardsCompletedThisWeek = await this.getCardsCompletedThisWeek(weekStartStr);

            // Reading progress
            this.stats.readingProgress = {
                completed: (readingList || []).filter(b => b.completed).length,
                total: (readingList || []).length
            };
        } catch (e) {
            console.warn('Failed to load some stats:', e);
        }
    }

    async calculateHabitStreak() {
        try {
            const habits = await this.dataService.getDailyHabits();
            if (!habits || habits.length === 0) return 0;

            let streak = 0;
            let checkDate = new Date();
            let firstCheck = true;

            while (streak < 365) {
                const dateStr = formatDate(checkDate);
                const completions = await this.dataService.getDailyHabitCompletions(dateStr, dateStr);
                const completedCount = (completions || []).filter(c => c.completed).length;

                if (completedCount === habits.length) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else if (firstCheck) {
                    // Allow today to be incomplete
                    checkDate.setDate(checkDate.getDate() - 1);
                    firstCheck = false;
                } else {
                    break;
                }
                firstCheck = false;
            }

            return streak;
        } catch (e) {
            return 0;
        }
    }

    async getCardsCompletedThisWeek(weekStartStr) {
        try {
            const boards = await this.kanbanService.getBoards() || [];
            let count = 0;
            for (const board of boards) {
                const fullBoard = await this.kanbanService.getBoard(board.id);
                if (fullBoard?.cards && fullBoard?.columns) {
                    // Create a map of column_id to column title
                    const columnMap = new Map();
                    fullBoard.columns.forEach(col => {
                        columnMap.set(col.id, col.title);
                    });

                    // Count cards in "done" columns updated this week
                    count += fullBoard.cards.filter(c => {
                        const columnTitle = columnMap.get(c.column_id)?.toLowerCase() || '';
                        const isDone = columnTitle === 'done' || columnTitle === 'completed' || columnTitle === 'finished';
                        return isDone && c.updated_at >= weekStartStr;
                    }).length;
                }
            }
            return count;
        } catch (e) {
            return 0;
        }
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return d;
    }

    renderContent() {
        // Update the stat items in DOM
        return `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${this.stats.habitStreak}</span>
                    <span class="stat-label">Day Streak 🔥</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${this.stats.pomodoroThisWeek}</span>
                    <span class="stat-label">Pomodoros 🍅</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${this.stats.cardsCompletedThisWeek}</span>
                    <span class="stat-label">Cards Done ✅</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${this.stats.readingProgress.completed}/${this.stats.readingProgress.total}</span>
                    <span class="stat-label">Books 📚</span>
                </div>
            </div>
        `;
    }
}

/**
 * Quick Actions Widget
 */
class QuickActionsWidget extends BaseWidget {
    constructor(stateManager, dataService, kanbanService) {
        super('quick-actions', 'Quick Actions');
        this.stateManager = stateManager;
        this.dataService = dataService;
        this.kanbanService = kanbanService;
    }

    async load() {
        // No async loading needed for quick actions
    }

    renderContent() {
        // The HTML is already in the template, just return empty
        return '';
    }
}

/**
 * Interval Challenges Widget - summary of active challenges
 */
class IntervalChallengesWidget extends BaseWidget {
    constructor(dataService) {
        super('challenges', 'Active Challenges');
        this.dataService = dataService;
        this.challenges = [];
    }

    async load() {
        try {
            const allChallenges = await this.dataService.getIntervalChallenges();
            this.challenges = allChallenges.filter(c => !c.is_archived);

            // Fetch habits and completions for each challenge to show progress
            for (const challenge of this.challenges) {
                const habits = await this.dataService.getChallengeHabits(challenge.id);
                const completions = await this.dataService.getChallengeCompletions(
                    challenge.id,
                    challenge.start_date,
                    challenge.end_date
                );

                const start = new Date(challenge.start_date);
                const end = new Date(challenge.end_date);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                const totalSlots = days * habits.length;
                const completedSlots = completions.filter(c => c.completed).length;

                challenge.percent = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

                const today = new Date();
                const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
                challenge.daysLeft = diff;
            }
        } catch (e) {
            console.warn('Failed to load challenges for dashboard:', e);
        }
    }

    renderContent() {
        if (this.challenges.length === 0) {
            return '<div class="empty-state">No active challenges. <a href="#habits">Start one</a></div>';
        }

        let html = '<div class="challenges-summary">';
        this.challenges.forEach(challenge => {
            const daysText = challenge.daysLeft > 0
                ? `${challenge.daysLeft} days left`
                : (challenge.daysLeft === 0 ? 'Last day!' : 'Ended');

            html += `
                <div class="challenge-summary-item" onclick="window.location.hash='#habits'">
                    <div class="challenge-summary-info">
                        <span class="challenge-summary-title">${challenge.title}</span>
                        <span class="challenge-summary-days">${daysText}</span>
                    </div>
                    <div class="progress-bar-small">
                        <div class="progress-fill" style="width: ${challenge.percent}%"></div>
                    </div>
                    <div class="challenge-summary-footer">
                        <span class="challenge-summary-percent">${challenge.percent}% complete</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }
}


/**
 * Main Dashboard View Controller
 */
class DashboardView {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.widgets = new Map();
        this.widgetConfig = this.loadWidgetConfig();
        this.container = null;
    }

    async init(container) {
        this.container = container;
        await this.loadTemplate();
        this.initializeWidgets();
        this.setupEventListeners();
        await this.loadAllWidgets();
        this.updateGreeting();
        this.updateDate();
    }

    async loadTemplate() {
        try {
            const response = await fetch('./views/dashboard-view.html');
            const html = await response.text();
            this.container.innerHTML = html;
        } catch (error) {
            console.error('Failed to load dashboard template:', error);
            this.container.innerHTML = `
                <div class="error-view" role="alert">
                    <h2>Failed to load Dashboard</h2>
                    <p>Please try refreshing the page.</p>
                    <button class="btn-retry" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    initializeWidgets() {
        // Create widget instances
        this.widgets.set('today', new TodayOverviewWidget(dataService, this.stateManager));
        this.widgets.set('goals', new GoalsProgressWidget(dataService));
        this.widgets.set('kanban', new KanbanSummaryWidget(kanbanService));
        this.widgets.set('calendar', new CalendarWidget(dataService));
        this.widgets.set('stats', new StatisticsSummaryWidget(dataService, kanbanService));
        this.widgets.set('challenges', new IntervalChallengesWidget(dataService));
        this.widgets.set('quick-actions', new QuickActionsWidget(this.stateManager, dataService, kanbanService));

        // Set containers
        this.widgets.forEach((widget, key) => {
            const contentEl = document.getElementById(`widget-${key}-content`);
            if (contentEl) {
                widget.setContainer(contentEl);
            }
        });
    }

    async loadAllWidgets() {
        const widgetPromises = [
            this.widgets.get('today').safeLoad(),
            this.widgets.get('goals').safeLoad(),
            this.widgets.get('kanban').safeLoad(),
            this.widgets.get('calendar').safeLoad(),
            this.widgets.get('stats').safeLoad(),
            this.widgets.get('challenges').safeLoad()
        ];

        await Promise.allSettled(widgetPromises);

        // Render all widgets
        this.widgets.forEach((widget, key) => {
            if (key !== 'quick-actions') {
                widget.updateContainer();
            }
        });

        // Update calendar month display
        this.updateCalendarMonthDisplay();
    }

    updateGreeting() {
        const greetingEl = document.getElementById('dashboard-greeting-text');
        if (!greetingEl) return;

        const hour = new Date().getHours();
        let greeting = 'Good evening!';
        if (hour < 12) greeting = 'Good morning!';
        else if (hour < 17) greeting = 'Good afternoon!';

        greetingEl.textContent = greeting;
    }

    updateDate() {
        const dateEl = document.getElementById('dashboard-date');
        if (!dateEl) return;

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }

    updateCalendarMonthDisplay() {
        const monthYearEl = document.getElementById('calendar-month-year');
        const calendarWidget = this.widgets.get('calendar');
        if (monthYearEl && calendarWidget) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            monthYearEl.textContent = `${monthNames[calendarWidget.currentMonth]} ${calendarWidget.currentYear}`;
        }
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('dashboard-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshAllWidgets());
        }

        // Settings button
        const settingsBtn = document.getElementById('dashboard-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettingsModal());
        }

        // Calendar navigation
        const calendarPrevBtn = document.getElementById('calendar-prev-btn');
        const calendarNextBtn = document.getElementById('calendar-next-btn');
        if (calendarPrevBtn) {
            calendarPrevBtn.addEventListener('click', () => this.navigateCalendar(-1));
        }
        if (calendarNextBtn) {
            calendarNextBtn.addEventListener('click', () => this.navigateCalendar(1));
        }

        // Quick action buttons
        this.setupQuickActions();

        // Habit toggles (delegated)
        const todayContent = document.getElementById('widget-today-content');
        if (todayContent) {
            todayContent.addEventListener('change', (e) => {
                if (e.target.classList.contains('habit-toggle')) {
                    const habitId = e.target.dataset.habitId;
                    const completed = e.target.checked;
                    this.widgets.get('today').toggleHabitCompletion(habitId, completed);
                }
            });
        }

        // Weekly goal toggles (delegated)
        const goalsContent = document.getElementById('widget-goals-content');
        if (goalsContent) {
            goalsContent.addEventListener('change', (e) => {
                if (e.target.classList.contains('weekly-goal-toggle')) {
                    const goalId = e.target.dataset.weeklyGoalId;
                    const completed = e.target.checked;
                    this.widgets.get('goals').toggleWeeklyGoal(goalId, completed);
                }
            });
        }

        // Board selector in Kanban widget (delegated)
        const kanbanContent = document.getElementById('widget-kanban-content');
        if (kanbanContent) {
            kanbanContent.addEventListener('change', (e) => {
                if (e.target.id === 'dashboard-board-select') {
                    const boardId = e.target.value;
                    this.widgets.get('kanban').setSelectedBoard(boardId);
                }
            });
        }

        // Retry buttons (delegated)
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-retry')) {
                const widgetId = e.target.dataset.widget;
                if (widgetId && this.widgets.has(widgetId)) {
                    this.refreshWidget(widgetId);
                }
            }
        });

        // Modal close buttons
        const modals = this.container.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    setupQuickActions() {
        // Pomodoro
        const pomodoroBtn = document.getElementById('quick-action-pomodoro');
        if (pomodoroBtn) {
            pomodoroBtn.addEventListener('click', () => {
                if (window.pomodoroTimer) {
                    window.pomodoroTimer.startTimer();
                } else {
                    window.location.hash = '#pomodoro';
                }
            });
        }

        // Habit Log
        const habitBtn = document.getElementById('quick-action-habit');
        if (habitBtn) {
            habitBtn.addEventListener('click', () => this.openHabitLogModal());
        }

        // New Card
        const cardBtn = document.getElementById('quick-action-card');
        if (cardBtn) {
            cardBtn.addEventListener('click', () => {
                window.location.hash = '#kanban';
            });
        }

        // Quick Note
        const noteBtn = document.getElementById('quick-action-note');
        if (noteBtn) {
            noteBtn.addEventListener('click', () => this.openQuickNoteModal());
        }
    }

    async openHabitLogModal() {
        const modal = document.getElementById('habit-log-modal');
        const listEl = document.getElementById('habit-log-list');
        if (!modal || !listEl) return;

        try {
            const habits = await dataService.getDailyHabits();
            const today = formatDate(new Date());
            const completions = await dataService.getDailyHabitCompletions(today, today);
            const completedIds = new Set(completions.filter(c => c.completed).map(c => c.habit_id));

            let html = '';
            habits.forEach(habit => {
                const isCompleted = completedIds.has(habit.id);
                html += `
                    <label class="habit-log-item ${isCompleted ? 'completed' : ''}">
                        <input type="checkbox" 
                               data-habit-id="${habit.id}" 
                               ${isCompleted ? 'checked' : ''} 
                               class="habit-modal-toggle">
                        <span>${habit.habit_name || 'Unnamed'}</span>
                    </label>
                `;
            });
            listEl.innerHTML = html || '<p>No habits to log. <a href="#habits">Add habits</a></p>';

            // Add toggle handlers
            listEl.querySelectorAll('.habit-modal-toggle').forEach(checkbox => {
                checkbox.addEventListener('change', async (e) => {
                    const habitId = e.target.dataset.habitId;
                    await this.widgets.get('today').toggleHabitCompletion(habitId, e.target.checked);
                    e.target.closest('.habit-log-item').classList.toggle('completed', e.target.checked);
                });
            });

            modal.style.display = 'flex';
        } catch (error) {
            console.error('Failed to load habits for modal:', error);
        }
    }

    openQuickNoteModal() {
        const modal = document.getElementById('quick-note-modal');
        if (modal) {
            document.getElementById('quick-note-text').value = '';
            modal.style.display = 'flex';
        }
    }

    openSettingsModal() {
        const modal = document.getElementById('dashboard-settings-modal');
        if (modal) {
            this.renderWidgetToggles();
            modal.style.display = 'flex';
        }
    }

    renderWidgetToggles() {
        const togglesEl = document.getElementById('widget-toggles');
        if (!togglesEl) return;

        const widgetNames = {
            'today': "Today's Overview",
            'goals': 'Goals Progress',
            'kanban': 'Tasks',
            'quick-actions': 'Quick Actions',
            'calendar': 'Calendar',
            'stats': 'Statistics',
            'challenges': 'Active Challenges'
        };

        let html = '';
        Object.entries(widgetNames).forEach(([id, name]) => {
            const isVisible = this.widgetConfig[id]?.visible !== false;
            html += `
                <label class="widget-toggle-item">
                    <input type="checkbox" 
                           data-widget-id="${id}" 
                           ${isVisible ? 'checked' : ''} 
                           class="widget-visibility-toggle">
                    <span>${name}</span>
                </label>
            `;
        });
        togglesEl.innerHTML = html;

        // Add event listeners
        togglesEl.querySelectorAll('.widget-visibility-toggle').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const widgetId = e.target.dataset.widgetId;
                this.toggleWidgetVisibility(widgetId, e.target.checked);
            });
        });
    }

    toggleWidgetVisibility(widgetId, visible) {
        if (!this.widgetConfig[widgetId]) {
            this.widgetConfig[widgetId] = {};
        }
        this.widgetConfig[widgetId].visible = visible;
        this.saveWidgetConfig();

        // Update DOM
        const widgetEl = document.getElementById(`widget-${widgetId}`);
        if (widgetEl) {
            widgetEl.style.display = visible ? '' : 'none';
        }
    }

    async navigateCalendar(delta) {
        const calendarWidget = this.widgets.get('calendar');
        if (calendarWidget) {
            calendarWidget.navigateMonth(delta);
            await calendarWidget.safeLoad();
            calendarWidget.updateContainer();
            this.updateCalendarMonthDisplay();
        }
    }

    async refreshAllWidgets() {
        const refreshBtn = document.getElementById('dashboard-refresh-btn');
        if (refreshBtn) {
            refreshBtn.classList.add('spinning');
        }

        await this.loadAllWidgets();

        if (refreshBtn) {
            setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
        }
    }

    async refreshWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            await widget.safeLoad();
            widget.updateContainer();
        }
    }

    loadWidgetConfig() {
        try {
            const saved = localStorage.getItem('dashboardWidgetConfig');
            return saved ? JSON.parse(saved) : this.getDefaultConfig();
        } catch (e) {
            return this.getDefaultConfig();
        }
    }

    saveWidgetConfig() {
        localStorage.setItem('dashboardWidgetConfig', JSON.stringify(this.widgetConfig));
    }

    getDefaultConfig() {
        return {
            'today': { visible: true, order: 0 },
            'goals': { visible: true, order: 1 },
            'kanban': { visible: true, order: 2 },
            'quick-actions': { visible: true, order: 3 },
            'calendar': { visible: true, order: 4 },
            'stats': { visible: true, order: 5 },
            'challenges': { visible: true, order: 6 }
        };
    }
}

export default DashboardView;
