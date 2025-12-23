/**
 * Data Service Unit Tests
 * Tests for data-service.js methods
 */

// Mock Supabase client
const mockSupabase = {
    auth: {
        getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id', email: 'test@example.com' } }
        })
    },
    from: jest.fn(() => mockSupabase),
    select: jest.fn(() => mockSupabase),
    insert: jest.fn(() => mockSupabase),
    update: jest.fn(() => mockSupabase),
    delete: jest.fn(() => mockSupabase),
    upsert: jest.fn(() => mockSupabase),
    eq: jest.fn(() => mockSupabase),
    gte: jest.fn(() => mockSupabase),
    lte: jest.fn(() => mockSupabase),
    order: jest.fn(() => mockSupabase),
    single: jest.fn(() => mockSupabase),
    maybeSingle: jest.fn(() => mockSupabase)
};

// Mock cache service
const mockCacheService = {
    getAll: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    put: jest.fn().mockResolvedValue(undefined),
    putAll: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    isCacheFresh: jest.fn().mockReturnValue(false),
    markCacheUpdated: jest.fn(),
    addPendingSync: jest.fn().mockResolvedValue({ id: 'sync-1' }),
    online: true
};

// Mock modules before importing
jest.mock('../js/supabase-client.js', () => ({
    getSupabaseClient: () => mockSupabase,
    isSupabaseConfigured: () => true
}));

jest.mock('../js/cache-service.js', () => ({
    default: mockCacheService,
    STORES: {
        goals: 'goals',
        habits: 'habits',
        habitLogs: 'habit_logs',
        timeBlocks: 'time_blocks',
        categories: 'categories',
        readingList: 'reading_list',
        weeklyGoals: 'weekly_goals',
        monthlyData: 'monthly_data',
        dailyEntries: 'daily_entries'
    }
}));

describe('DataService', () => {
    let dataService;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mock implementations
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.update.mockReturnValue(mockSupabase);
        mockSupabase.delete.mockReturnValue(mockSupabase);
    });

    describe('Annual Goals', () => {
        test('getAnnualGoals returns goals for specified year', async () => {
            const mockGoals = [
                { id: '1', title: 'Goal 1', year: 2024, progress: 50 },
                { id: '2', title: 'Goal 2', year: 2024, progress: 75 }
            ];
            
            mockSupabase.select.mockResolvedValueOnce({ data: mockGoals, error: null });
            
            // Import after mocks are set up
            const { default: ds } = await import('../js/data-service.js');
            const result = await ds.getAnnualGoals(2024);
            
            expect(mockSupabase.from).toHaveBeenCalledWith('annual_goals');
            expect(result).toEqual(mockGoals);
        });

        test('createAnnualGoal creates goal with user_id', async () => {
            const newGoal = { title: 'New Goal', year: 2024 };
            const createdGoal = { id: '3', ...newGoal, user_id: 'test-user-id' };
            
            mockSupabase.single.mockResolvedValueOnce({ data: createdGoal, error: null });
            
            const { default: ds } = await import('../js/data-service.js');
            const result = await ds.createAnnualGoal(newGoal);
            
            expect(mockSupabase.from).toHaveBeenCalledWith('annual_goals');
            expect(mockSupabase.insert).toHaveBeenCalled();
        });

        test('updateAnnualGoal updates goal by id', async () => {
            const updates = { title: 'Updated Goal', progress: 100 };
            const updatedGoal = { id: '1', ...updates };
            
            mockSupabase.single.mockResolvedValueOnce({ data: updatedGoal, error: null });
            
            const { default: ds } = await import('../js/data-service.js');
            await ds.updateAnnualGoal('1', updates);
            
            expect(mockSupabase.from).toHaveBeenCalledWith('annual_goals');
            expect(mockSupabase.update).toHaveBeenCalled();
            expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
        });

        test('deleteAnnualGoal removes goal by id', async () => {
            mockSupabase.eq.mockResolvedValueOnce({ error: null });
            
            const { default: ds } = await import('../js/data-service.js');
            await ds.deleteAnnualGoal('1');
            
            expect(mockSupabase.from).toHaveBeenCalledWith('annual_goals');
            expect(mockSupabase.delete).toHaveBeenCalled();
            expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
        });
    });

    describe('Time Blocks', () => {
        test('getTimeBlocks returns blocks for specified date', async () => {
            const mockBlocks = [
                { id: '1', date: '2024-01-15', start_time: '09:00', end_time: '10:00' },
                { id: '2', date: '2024-01-15', start_time: '14:00', end_time: '15:00' }
            ];
            
            mockSupabase.order.mockResolvedValueOnce({ data: mockBlocks, error: null });
            
            const { default: ds } = await import('../js/data-service.js');
            const result = await ds.getTimeBlocks('2024-01-15');
            
            expect(mockSupabase.from).toHaveBeenCalledWith('time_blocks');
            expect(mockSupabase.eq).toHaveBeenCalledWith('date', '2024-01-15');
        });

        test('createTimeBlock creates block with user_id', async () => {
            const newBlock = { 
                date: '2024-01-15', 
                start_time: '09:00', 
                end_time: '10:00',
                title: 'Meeting'
            };
            
            mockSupabase.single.mockResolvedValueOnce({ 
                data: { id: '3', ...newBlock, user_id: 'test-user-id' }, 
                error: null 
            });
            
            const { default: ds } = await import('../js/data-service.js');
            await ds.createTimeBlock(newBlock);
            
            expect(mockSupabase.from).toHaveBeenCalledWith('time_blocks');
            expect(mockSupabase.insert).toHaveBeenCalled();
        });

        test('deleteTimeBlock removes block by id', async () => {
            mockSupabase.eq.mockResolvedValueOnce({ error: null });
            
            const { default: ds } = await import('../js/data-service.js');
            await ds.deleteTimeBlock('1');
            
            expect(mockSupabase.from).toHaveBeenCalledWith('time_blocks');
            expect(mockSupabase.delete).toHaveBeenCalled();
        });
    });

    describe('Daily Habits', () => {
        test('getDailyHabits returns all habits', async () => {
            const mockHabits = [
                { id: '1', name: 'Exercise', frequency: 'daily' },
                { id: '2', name: 'Read', frequency: 'daily' }
            ];
            
            mockSupabase.order.mockResolvedValueOnce({ data: mockHabits, error: null });
            
            const { default: ds } = await import('../js/data-service.js');
            const result = await ds.getDailyHabits();
            
            expect(mockSupabase.from).toHaveBeenCalledWith('daily_habits');
        });

        test('createDailyHabit creates habit with user_id', async () => {
            const newHabit = { name: 'Meditate', frequency: 'daily' };
            
            mockSupabase.single.mockResolvedValueOnce({ 
                data: { id: '3', ...newHabit, user_id: 'test-user-id' }, 
                error: null 
            });
            
            const { default: ds } = await import('../js/data-service.js');
            await ds.createDailyHabit(newHabit);
            
            expect(mockSupabase.from).toHaveBeenCalledWith('daily_habits');
            expect(mockSupabase.insert).toHaveBeenCalled();
        });

        test('toggleDailyHabitCompletion upserts completion record', async () => {
            mockSupabase.single.mockResolvedValueOnce({ 
                data: { habit_id: '1', date: '2024-01-15', completed: true }, 
                error: null 
            });
            
            const { default: ds } = await import('../js/data-service.js');
            await ds.toggleDailyHabitCompletion('1', '2024-01-15', true);
            
            expect(mockSupabase.from).toHaveBeenCalledWith('daily_habit_logs');
            expect(mockSupabase.upsert).toHaveBeenCalled();
        });
    });

    describe('Mood Tracking', () => {
        test('getMoodEntries returns entries in date range', async () => {
            const mockEntries = [
                { id: '1', date: '2024-01-15', mood_emoji: '😊' },
                { id: '2', date: '2024-01-16', mood_emoji: '😴' }
            ];
            
            mockSupabase.order.mockResolvedValueOnce({ data: mockEntries, error: null });
            
            const { default: ds } = await import('../js/data-service.js');
            const result = await ds.getMoodEntries('2024-01-15', '2024-01-16');
            
            expect(mockSupabase.from).toHaveBeenCalledWith('mood_entries');
            expect(mockSupabase.gte).toHaveBeenCalledWith('date', '2024-01-15');
            expect(mockSupabase.lte).toHaveBeenCalledWith('date', '2024-01-16');
        });

        test('setMood upserts mood entry', async () => {
            mockSupabase.single.mockResolvedValueOnce({ 
                data: { date: '2024-01-15', mood_emoji: '😊' }, 
                error: null 
            });
            
            const { default: ds } = await import('../js/data-service.js');
            await ds.setMood('2024-01-15', '😊');
            
            expect(mockSupabase.from).toHaveBeenCalledWith('mood_entries');
            expect(mockSupabase.upsert).toHaveBeenCalled();
        });
    });

    describe('Water Tracking', () => {
        test('setWaterIntake upserts water entry with goal', async () => {
            mockSupabase.single.mockResolvedValueOnce({ 
                data: { date: '2024-01-15', glasses_consumed: 6, goal_glasses: 8 }, 
                error: null 
            });
            
            const { default: ds } = await import('../js/data-service.js');
            await ds.setWaterIntake('2024-01-15', 6, 8);
            
            expect(mockSupabase.from).toHaveBeenCalledWith('water_entries');
            expect(mockSupabase.upsert).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        test('handles database errors gracefully', async () => {
            mockSupabase.select.mockResolvedValueOnce({ 
                data: null, 
                error: { message: 'Database error' } 
            });
            
            const { default: ds } = await import('../js/data-service.js');
            
            // Should not throw, but return empty array or handle error
            await expect(ds.getAnnualGoals(2024)).rejects.toBeDefined();
        });
    });
});
