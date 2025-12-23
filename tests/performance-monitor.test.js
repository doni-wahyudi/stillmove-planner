/**
 * Performance Monitor Unit Tests
 * Tests for performance-monitor.js
 */

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: jest.fn((key) => localStorageMock.store[key] || null),
    setItem: jest.fn((key, value) => { localStorageMock.store[key] = value; }),
    removeItem: jest.fn((key) => { delete localStorageMock.store[key]; }),
    clear: jest.fn(() => { localStorageMock.store = {}; })
};
global.localStorage = localStorageMock;

// Mock window
global.window = {
    addEventListener: jest.fn(),
    location: { hash: '#weekly' },
    matchMedia: jest.fn(() => ({ matches: false })),
    PerformanceObserver: undefined
};

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now()),
    getEntriesByType: jest.fn(() => [])
};

describe('PerformanceMonitor', () => {
    let performanceMonitor;

    beforeEach(async () => {
        jest.clearAllMocks();
        localStorageMock.store = {};
        
        // Reset module cache to get fresh instance
        jest.resetModules();
        const module = await import('../js/performance-monitor.js');
        performanceMonitor = module.default;
        performanceMonitor.metrics = [];
        performanceMonitor.viewLoadTimes = new Map();
    });

    describe('Metric Recording', () => {
        test('recordMetric adds metric to array', () => {
            performanceMonitor.recordMetric('LCP', 2500);
            
            expect(performanceMonitor.metrics.length).toBe(1);
            expect(performanceMonitor.metrics[0].name).toBe('LCP');
            expect(performanceMonitor.metrics[0].value).toBe(2500);
        });

        test('recordMetric includes timestamp and url', () => {
            performanceMonitor.recordMetric('FID', 100);
            
            expect(performanceMonitor.metrics[0].timestamp).toBeDefined();
            expect(performanceMonitor.metrics[0].url).toBe('#weekly');
        });

        test('recordMetric rounds values to 2 decimal places', () => {
            performanceMonitor.recordMetric('CLS', 0.12345);
            
            expect(performanceMonitor.metrics[0].value).toBe(0.12);
        });
    });

    describe('Performance Ratings', () => {
        test('getRating returns "good" for LCP under 2500ms', () => {
            const rating = performanceMonitor.getRating('LCP', 2000);
            expect(rating).toBe('good');
        });

        test('getRating returns "needs-improvement" for LCP between 2500-4000ms', () => {
            const rating = performanceMonitor.getRating('LCP', 3000);
            expect(rating).toBe('needs-improvement');
        });

        test('getRating returns "poor" for LCP over 4000ms', () => {
            const rating = performanceMonitor.getRating('LCP', 5000);
            expect(rating).toBe('poor');
        });

        test('getRating returns "good" for FID under 100ms', () => {
            const rating = performanceMonitor.getRating('FID', 50);
            expect(rating).toBe('good');
        });

        test('getRating returns "good" for CLS under 0.1', () => {
            const rating = performanceMonitor.getRating('CLS', 0.05);
            expect(rating).toBe('good');
        });

        test('getRating returns "unknown" for unrecognized metric', () => {
            const rating = performanceMonitor.getRating('UNKNOWN', 100);
            expect(rating).toBe('unknown');
        });
    });

    describe('View Load Timing', () => {
        test('startViewLoad records start time', () => {
            performance.now.mockReturnValue(1000);
            performanceMonitor.startViewLoad('weekly');
            
            expect(performanceMonitor.viewLoadTimes.get('weekly')).toBe(1000);
        });

        test('endViewLoad calculates duration and records metric', () => {
            performance.now.mockReturnValueOnce(1000);
            performanceMonitor.startViewLoad('weekly');
            
            performance.now.mockReturnValueOnce(1500);
            performanceMonitor.endViewLoad('weekly');
            
            const viewMetric = performanceMonitor.metrics.find(m => m.name === 'ViewLoad:weekly');
            expect(viewMetric).toBeDefined();
            expect(viewMetric.value).toBe(500);
        });

        test('endViewLoad removes view from tracking map', () => {
            performance.now.mockReturnValue(1000);
            performanceMonitor.startViewLoad('monthly');
            performanceMonitor.endViewLoad('monthly');
            
            expect(performanceMonitor.viewLoadTimes.has('monthly')).toBe(false);
        });
    });

    describe('Summary Generation', () => {
        test('getSummary returns averages for metrics', () => {
            performanceMonitor.metrics = [
                { name: 'LCP', value: 2000, timestamp: new Date().toISOString(), url: '#weekly' },
                { name: 'LCP', value: 3000, timestamp: new Date().toISOString(), url: '#monthly' },
                { name: 'FID', value: 50, timestamp: new Date().toISOString(), url: '#weekly' },
                { name: 'CLS', value: 0.1, timestamp: new Date().toISOString(), url: '#weekly' }
            ];
            
            const summary = performanceMonitor.getSummary();
            
            expect(summary.avgLCP).toBe(2500);
            expect(summary.avgFID).toBe(50);
            expect(summary.avgCLS).toBe('0.100');
        });

        test('getSummary returns view load averages', () => {
            performanceMonitor.metrics = [
                { name: 'ViewLoad:weekly', value: 500, timestamp: new Date().toISOString(), url: '#weekly' },
                { name: 'ViewLoad:weekly', value: 700, timestamp: new Date().toISOString(), url: '#weekly' },
                { name: 'ViewLoad:monthly', value: 800, timestamp: new Date().toISOString(), url: '#monthly' }
            ];
            
            const summary = performanceMonitor.getSummary();
            
            expect(summary.viewLoadAverages.weekly).toBe(600);
            expect(summary.viewLoadAverages.monthly).toBe(800);
        });

        test('getSummary returns null for missing metrics', () => {
            performanceMonitor.metrics = [];
            
            const summary = performanceMonitor.getSummary();
            
            expect(summary.avgLCP).toBeNull();
            expect(summary.avgFID).toBeNull();
            expect(summary.avgCLS).toBeNull();
        });
    });

    describe('Metric Storage', () => {
        test('clearMetrics removes all metrics', () => {
            performanceMonitor.metrics = [
                { name: 'LCP', value: 2000 }
            ];
            
            performanceMonitor.clearMetrics();
            
            expect(performanceMonitor.metrics.length).toBe(0);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('stillmove_perf_metrics');
        });
    });
});
