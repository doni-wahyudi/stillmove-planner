/**
 * Performance Monitor
 * Tracks Web Vitals and view loading times
 */

const PERF_STORAGE_KEY = 'stillmove_perf_metrics';
const MAX_STORED_METRICS = 100;

class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.viewLoadTimes = new Map();
        this.initialized = false;
    }

    /**
     * Initialize performance monitoring
     */
    init() {
        if (this.initialized) return;
        
        this.loadStoredMetrics();
        this.observeWebVitals();
        this.observeResourceTiming();
        
        this.initialized = true;
        console.log('[Perf] Performance monitoring initialized');
    }

    /**
     * Load previously stored metrics
     */
    loadStoredMetrics() {
        try {
            const stored = localStorage.getItem(PERF_STORAGE_KEY);
            if (stored) {
                this.metrics = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[Perf] Failed to load stored metrics:', e);
        }
    }

    /**
     * Save metrics to localStorage
     */
    saveMetrics() {
        try {
            // Keep only the most recent metrics
            const toStore = this.metrics.slice(-MAX_STORED_METRICS);
            localStorage.setItem(PERF_STORAGE_KEY, JSON.stringify(toStore));
        } catch (e) {
            console.warn('[Perf] Failed to save metrics:', e);
        }
    }

    /**
     * Observe Web Vitals using PerformanceObserver
     */
    observeWebVitals() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            try {
                // LCP
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.recordMetric('LCP', lastEntry.startTime);
                });
                lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

                // FID (First Input Delay)
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        this.recordMetric('FID', entry.processingStart - entry.startTime);
                    });
                });
                fidObserver.observe({ type: 'first-input', buffered: true });

                // CLS (Cumulative Layout Shift)
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    });
                    this.recordMetric('CLS', clsValue);
                });
                clsObserver.observe({ type: 'layout-shift', buffered: true });

            } catch (e) {
                console.warn('[Perf] PerformanceObserver not fully supported:', e);
            }
        }

        // Navigation timing
        window.addEventListener('load', () => {
            setTimeout(() => {
                const timing = performance.getEntriesByType('navigation')[0];
                if (timing) {
                    this.recordMetric('TTFB', timing.responseStart);
                    this.recordMetric('DOMContentLoaded', timing.domContentLoadedEventEnd);
                    this.recordMetric('Load', timing.loadEventEnd);
                }
            }, 0);
        });
    }

    /**
     * Observe resource loading times
     */
    observeResourceTiming() {
        if ('PerformanceObserver' in window) {
            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        // Only track slow resources (> 500ms)
                        if (entry.duration > 500) {
                            console.warn(`[Perf] Slow resource: ${entry.name} (${Math.round(entry.duration)}ms)`);
                        }
                    });
                });
                resourceObserver.observe({ type: 'resource', buffered: true });
            } catch (e) {
                // Resource timing not supported
            }
        }
    }

    /**
     * Record a performance metric
     */
    recordMetric(name, value) {
        const metric = {
            name,
            value: Math.round(value * 100) / 100,
            timestamp: new Date().toISOString(),
            url: window.location.hash || '#weekly'
        };
        
        this.metrics.push(metric);
        this.saveMetrics();
        
        // Log significant metrics
        if (name === 'LCP' || name === 'FID' || name === 'CLS') {
            const rating = this.getRating(name, value);
            console.log(`[Perf] ${name}: ${metric.value}${name === 'CLS' ? '' : 'ms'} (${rating})`);
        }
    }

    /**
     * Get rating for a metric (good/needs-improvement/poor)
     */
    getRating(name, value) {
        const thresholds = {
            LCP: { good: 2500, poor: 4000 },
            FID: { good: 100, poor: 300 },
            CLS: { good: 0.1, poor: 0.25 },
            TTFB: { good: 800, poor: 1800 }
        };
        
        const threshold = thresholds[name];
        if (!threshold) return 'unknown';
        
        if (value <= threshold.good) return 'good';
        if (value <= threshold.poor) return 'needs-improvement';
        return 'poor';
    }

    /**
     * Start timing a view load
     */
    startViewLoad(viewName) {
        this.viewLoadTimes.set(viewName, performance.now());
    }

    /**
     * End timing a view load
     */
    endViewLoad(viewName) {
        const startTime = this.viewLoadTimes.get(viewName);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.recordMetric(`ViewLoad:${viewName}`, duration);
            this.viewLoadTimes.delete(viewName);
            
            // Warn if view load is slow
            if (duration > 1000) {
                console.warn(`[Perf] Slow view load: ${viewName} (${Math.round(duration)}ms)`);
            }
        }
    }

    /**
     * Get summary of recent metrics
     */
    getSummary() {
        const summary = {
            LCP: [],
            FID: [],
            CLS: [],
            viewLoads: {}
        };

        this.metrics.forEach((metric) => {
            if (metric.name === 'LCP') summary.LCP.push(metric.value);
            else if (metric.name === 'FID') summary.FID.push(metric.value);
            else if (metric.name === 'CLS') summary.CLS.push(metric.value);
            else if (metric.name.startsWith('ViewLoad:')) {
                const viewName = metric.name.replace('ViewLoad:', '');
                if (!summary.viewLoads[viewName]) {
                    summary.viewLoads[viewName] = [];
                }
                summary.viewLoads[viewName].push(metric.value);
            }
        });

        // Calculate averages
        const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
        
        return {
            avgLCP: avg(summary.LCP),
            avgFID: avg(summary.FID),
            avgCLS: summary.CLS.length ? (summary.CLS.reduce((a, b) => a + b, 0) / summary.CLS.length).toFixed(3) : null,
            viewLoadAverages: Object.fromEntries(
                Object.entries(summary.viewLoads).map(([k, v]) => [k, avg(v)])
            ),
            totalMetrics: this.metrics.length
        };
    }

    /**
     * Clear all stored metrics
     */
    clearMetrics() {
        this.metrics = [];
        localStorage.removeItem(PERF_STORAGE_KEY);
        console.log('[Perf] Metrics cleared');
    }

    /**
     * Log performance summary to console
     */
    logSummary() {
        const summary = this.getSummary();
        console.group('[Perf] Performance Summary');
        console.log('LCP (avg):', summary.avgLCP ? `${summary.avgLCP}ms` : 'N/A');
        console.log('FID (avg):', summary.avgFID ? `${summary.avgFID}ms` : 'N/A');
        console.log('CLS (avg):', summary.avgCLS || 'N/A');
        console.log('View Load Times:', summary.viewLoadAverages);
        console.log('Total metrics recorded:', summary.totalMetrics);
        console.groupEnd();
    }
}

// Export singleton
const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;

// Make available globally for debugging
if (typeof window !== 'undefined') {
    window.performanceMonitor = performanceMonitor;
}
