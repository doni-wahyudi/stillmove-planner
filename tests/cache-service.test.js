/**
 * Cache Service Unit Tests
 * Tests for cache-service.js methods
 */

// Mock IndexedDB
const mockIDBStore = {
    put: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn()
};

const mockIDBTransaction = {
    objectStore: jest.fn(() => mockIDBStore),
    oncomplete: null,
    onerror: null
};

const mockIDBDatabase = {
    transaction: jest.fn(() => mockIDBTransaction),
    objectStoreNames: { contains: jest.fn(() => true) },
    createObjectStore: jest.fn(() => ({ createIndex: jest.fn() }))
};

// Mock indexedDB
global.indexedDB = {
    open: jest.fn(() => ({
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
        result: mockIDBDatabase
    }))
};

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: jest.fn((key) => localStorageMock.store[key] || null),
    setItem: jest.fn((key, value) => { localStorageMock.store[key] = value; }),
    removeItem: jest.fn((key) => { delete localStorageMock.store[key]; }),
    clear: jest.fn(() => { localStorageMock.store = {}; })
};
global.localStorage = localStorageMock;

// Mock navigator
global.navigator = { onLine: true };

// Mock window events
global.window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

describe('CacheService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.store = {};
    });

    describe('Cache TTL Configuration', () => {
        test('CACHE_TTL has correct values for different data types', async () => {
            const { CACHE_TTL } = await import('../js/cache-service.js');
            
            // Goals should have longer TTL (24 hours)
            expect(CACHE_TTL.goals).toBe(24 * 60 * 60 * 1000);
            
            // Habit logs should have shorter TTL (5 minutes)
            expect(CACHE_TTL.habitLogs).toBe(5 * 60 * 1000);
            
            // Time blocks should have short TTL (5 minutes)
            expect(CACHE_TTL.timeBlocks).toBe(5 * 60 * 1000);
            
            // Categories rarely change (24 hours)
            expect(CACHE_TTL.categories).toBe(24 * 60 * 60 * 1000);
        });
    });

    describe('Cache Freshness', () => {
        test('isCacheFresh returns false when no metadata exists', async () => {
            const { default: cacheService } = await import('../js/cache-service.js');
            
            // Clear any existing metadata
            cacheService.cacheMetadata = {};
            
            const result = cacheService.isCacheFresh('goals');
            expect(result).toBe(false);
        });

        test('isCacheFresh returns true when cache is within TTL', async () => {
            const { default: cacheService } = await import('../js/cache-service.js');
            
            // Set cache as just updated
            cacheService.cacheMetadata = { goals: Date.now() };
            
            const result = cacheService.isCacheFresh('goals');
            expect(result).toBe(true);
        });

        test('isCacheFresh returns false when cache is expired', async () => {
            const { default: cacheService } = await import('../js/cache-service.js');
            
            // Set cache as expired (25 hours ago for goals with 24hr TTL)
            cacheService.cacheMetadata = { goals: Date.now() - (25 * 60 * 60 * 1000) };
            
            const result = cacheService.isCacheFresh('goals');
            expect(result).toBe(false);
        });
    });

    describe('Cache Age', () => {
        test('getCacheAge returns "never cached" when no metadata', async () => {
            const { default: cacheService } = await import('../js/cache-service.js');
            
            cacheService.cacheMetadata = {};
            
            const result = cacheService.getCacheAge('goals');
            expect(result).toBe('never cached');
        });

        test('getCacheAge returns human-readable time', async () => {
            const { default: cacheService } = await import('../js/cache-service.js');
            
            // Set cache as 5 minutes ago
            cacheService.cacheMetadata = { goals: Date.now() - (5 * 60 * 1000) };
            
            const result = cacheService.getCacheAge('goals');
            expect(result).toContain('5m ago');
        });
    });

    describe('Cache Invalidation', () => {
        test('invalidateCache removes metadata for store', async () => {
            const { default: cacheService } = await import('../js/cache-service.js');
            
            cacheService.cacheMetadata = { goals: Date.now(), habits: Date.now() };
            cacheService.invalidateCache('goals');
            
            expect(cacheService.cacheMetadata.goals).toBeUndefined();
            expect(cacheService.cacheMetadata.habits).toBeDefined();
        });

        test('invalidateAllCaches clears all metadata', async () => {
            const { default: cacheService } = await import('../js/cache-service.js');
            
            cacheService.cacheMetadata = { goals: Date.now(), habits: Date.now() };
            cacheService.invalidateAllCaches();
            
            expect(Object.keys(cacheService.cacheMetadata).length).toBe(0);
        });
    });

    describe('Store Names', () => {
        test('STORES contains all required store names', async () => {
            const { STORES } = await import('../js/cache-service.js');
            
            expect(STORES.goals).toBe('goals');
            expect(STORES.habits).toBe('habits');
            expect(STORES.habitLogs).toBe('habit_logs');
            expect(STORES.timeBlocks).toBe('time_blocks');
            expect(STORES.categories).toBe('categories');
            expect(STORES.readingList).toBe('reading_list');
            expect(STORES.weeklyGoals).toBe('weekly_goals');
            expect(STORES.actionPlans).toBe('action_plans');
        });
    });
});
