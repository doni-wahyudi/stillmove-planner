/**
 * Performance Optimization Module
 * Provides caching, debouncing, virtual scrolling, and performance monitoring
 */

/**
 * In-Memory Cache Manager
 * Provides caching with TTL (time-to-live) and size limits
 */
class CacheManager {
    constructor(maxSize = 100, defaultTTL = 5 * 60 * 1000) { // 5 minutes default TTL
        this.cache = new Map();
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }

    /**
     * Generate cache key from arguments
     */
    generateKey(prefix, ...args) {
        return `${prefix}:${JSON.stringify(args)}`;
    }

    /**
     * Get item from cache
     */
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            this.stats.misses++;
            return null;
        }
        
        // Check if expired
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }
        
        // Update access time for LRU
        item.lastAccess = Date.now();
        this.stats.hits++;
        return item.data;
    }

    /**
     * Set item in cache
     */
    set(key, data, ttl = this.defaultTTL) {
        // Evict oldest if at max size
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictOldest();
        }
        
        this.cache.set(key, {
            data,
            expiry: Date.now() + ttl,
            lastAccess: Date.now()
        });
    }

    /**
     * Evict oldest accessed item (LRU)
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        for (const [key, value] of this.cache.entries()) {
            if (value.lastAccess < oldestTime) {
                oldestTime = value.lastAccess;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.stats.evictions++;
        }
    }

    /**
     * Invalidate cache entries by prefix
     */
    invalidate(prefix) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;
        
        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: `${hitRate}%`
        };
    }
}

/**
 * Debounce function
 * Delays execution until after wait milliseconds have elapsed since last call
 */
function debounce(func, wait = 300) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 * Ensures function is called at most once per specified time period
 */
function throttle(func, limit = 300) {
    let inThrottle;
    
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Virtual Scrolling Manager
 * Renders only visible items in long lists for better performance
 */
class VirtualScroller {
    constructor(container, options = {}) {
        this.container = container;
        this.items = [];
        this.itemHeight = options.itemHeight || 50;
        this.bufferSize = options.bufferSize || 5;
        this.renderItem = options.renderItem || ((item) => item.toString());
        
        this.scrollTop = 0;
        this.visibleStart = 0;
        this.visibleEnd = 0;
        
        this.setupContainer();
        this.attachScrollListener();
    }

    /**
     * Setup container structure
     */
    setupContainer() {
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        
        // Create viewport
        this.viewport = document.createElement('div');
        this.viewport.style.position = 'relative';
        this.container.appendChild(this.viewport);
        
        // Create content container
        this.content = document.createElement('div');
        this.content.style.position = 'absolute';
        this.content.style.top = '0';
        this.content.style.left = '0';
        this.content.style.right = '0';
        this.viewport.appendChild(this.content);
    }

    /**
     * Attach scroll listener with throttling
     */
    attachScrollListener() {
        const handleScroll = throttle(() => {
            this.scrollTop = this.container.scrollTop;
            this.render();
        }, 16); // ~60fps
        
        this.container.addEventListener('scroll', handleScroll);
    }

    /**
     * Set items to display
     */
    setItems(items) {
        this.items = items;
        this.viewport.style.height = `${items.length * this.itemHeight}px`;
        this.render();
    }

    /**
     * Calculate visible range
     */
    calculateVisibleRange() {
        const containerHeight = this.container.clientHeight;
        const start = Math.floor(this.scrollTop / this.itemHeight);
        const end = Math.ceil((this.scrollTop + containerHeight) / this.itemHeight);
        
        // Add buffer
        this.visibleStart = Math.max(0, start - this.bufferSize);
        this.visibleEnd = Math.min(this.items.length, end + this.bufferSize);
    }

    /**
     * Render visible items
     */
    render() {
        this.calculateVisibleRange();
        
        // Clear content
        this.content.innerHTML = '';
        
        // Set offset
        this.content.style.transform = `translateY(${this.visibleStart * this.itemHeight}px)`;
        
        // Render visible items
        for (let i = this.visibleStart; i < this.visibleEnd; i++) {
            const itemElement = document.createElement('div');
            itemElement.style.height = `${this.itemHeight}px`;
            itemElement.innerHTML = this.renderItem(this.items[i], i);
            this.content.appendChild(itemElement);
        }
    }

    /**
     * Update single item
     */
    updateItem(index, newData) {
        if (index >= 0 && index < this.items.length) {
            this.items[index] = newData;
            if (index >= this.visibleStart && index < this.visibleEnd) {
                this.render();
            }
        }
    }

    /**
     * Scroll to item
     */
    scrollToItem(index) {
        const targetScroll = index * this.itemHeight;
        this.container.scrollTop = targetScroll;
    }
}

/**
 * Image Lazy Loader
 * Loads images only when they enter viewport
 */
class ImageLazyLoader {
    constructor(options = {}) {
        this.rootMargin = options.rootMargin || '50px';
        this.threshold = options.threshold || 0.01;
        this.images = new Set();
        
        this.setupObserver();
    }

    /**
     * Setup Intersection Observer
     */
    setupObserver() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                (entries) => this.handleIntersection(entries),
                {
                    rootMargin: this.rootMargin,
                    threshold: this.threshold
                }
            );
        }
    }

    /**
     * Handle intersection
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadImage(entry.target);
                this.observer.unobserve(entry.target);
                this.images.delete(entry.target);
            }
        });
    }

    /**
     * Load image
     */
    loadImage(img) {
        const src = img.dataset.src;
        if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
        }
    }

    /**
     * Observe image
     */
    observe(img) {
        if (this.observer) {
            this.images.add(img);
            this.observer.observe(img);
        } else {
            // Fallback for browsers without IntersectionObserver
            this.loadImage(img);
        }
    }

    /**
     * Observe multiple images
     */
    observeAll(selector = 'img[data-src]') {
        const images = document.querySelectorAll(selector);
        images.forEach(img => this.observe(img));
    }

    /**
     * Disconnect observer
     */
    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
            this.images.clear();
        }
    }
}

/**
 * Performance Monitor
 * Tracks and reports performance metrics
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoad: null,
            viewTransitions: [],
            apiCalls: [],
            renderTimes: []
        };
        
        this.measurePageLoad();
    }

    /**
     * Measure page load time
     */
    measurePageLoad() {
        if (window.performance && window.performance.timing) {
            window.addEventListener('load', () => {
                const timing = window.performance.timing;
                this.metrics.pageLoad = {
                    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                    loadComplete: timing.loadEventEnd - timing.navigationStart,
                    domInteractive: timing.domInteractive - timing.navigationStart
                };
            });
        }
    }

    /**
     * Start timing an operation
     */
    startTimer(label) {
        return {
            label,
            start: performance.now()
        };
    }

    /**
     * End timing and record
     */
    endTimer(timer, category = 'general') {
        const duration = performance.now() - timer.start;
        
        if (category === 'viewTransition') {
            this.metrics.viewTransitions.push({
                label: timer.label,
                duration,
                timestamp: Date.now()
            });
        } else if (category === 'apiCall') {
            this.metrics.apiCalls.push({
                label: timer.label,
                duration,
                timestamp: Date.now()
            });
        } else if (category === 'render') {
            this.metrics.renderTimes.push({
                label: timer.label,
                duration,
                timestamp: Date.now()
            });
        }
        
        return duration;
    }

    /**
     * Measure function execution time
     */
    async measure(label, fn, category = 'general') {
        const timer = this.startTimer(label);
        try {
            const result = await fn();
            this.endTimer(timer, category);
            return result;
        } catch (error) {
            this.endTimer(timer, category);
            throw error;
        }
    }

    /**
     * Get performance report
     */
    getReport() {
        const avgViewTransition = this.calculateAverage(this.metrics.viewTransitions);
        const avgApiCall = this.calculateAverage(this.metrics.apiCalls);
        const avgRender = this.calculateAverage(this.metrics.renderTimes);
        
        return {
            pageLoad: this.metrics.pageLoad,
            averages: {
                viewTransition: avgViewTransition,
                apiCall: avgApiCall,
                render: avgRender
            },
            counts: {
                viewTransitions: this.metrics.viewTransitions.length,
                apiCalls: this.metrics.apiCalls.length,
                renders: this.metrics.renderTimes.length
            }
        };
    }

    /**
     * Calculate average duration
     */
    calculateAverage(items) {
        if (items.length === 0) return 0;
        const sum = items.reduce((acc, item) => acc + item.duration, 0);
        return (sum / items.length).toFixed(2);
    }

    /**
     * Log performance report to console
     */
    logReport() {
        const report = this.getReport();
        console.group('Performance Report');
        console.log('Page Load:', report.pageLoad);
        console.log('Averages:', report.averages);
        console.log('Counts:', report.counts);
        console.groupEnd();
    }

    /**
     * Clear metrics
     */
    clearMetrics() {
        this.metrics.viewTransitions = [];
        this.metrics.apiCalls = [];
        this.metrics.renderTimes = [];
    }
}

/**
 * Request Animation Frame helper for smooth animations
 */
function rafThrottle(callback) {
    let requestId = null;
    
    return function(...args) {
        if (requestId === null) {
            requestId = requestAnimationFrame(() => {
                requestId = null;
                callback(...args);
            });
        }
    };
}

/**
 * Batch DOM updates to minimize reflows
 */
class DOMBatcher {
    constructor() {
        this.readQueue = [];
        this.writeQueue = [];
        this.scheduled = false;
    }

    /**
     * Schedule a DOM read operation
     */
    read(fn) {
        this.readQueue.push(fn);
        this.schedule();
    }

    /**
     * Schedule a DOM write operation
     */
    write(fn) {
        this.writeQueue.push(fn);
        this.schedule();
    }

    /**
     * Schedule batch execution
     */
    schedule() {
        if (!this.scheduled) {
            this.scheduled = true;
            requestAnimationFrame(() => this.flush());
        }
    }

    /**
     * Execute batched operations
     */
    flush() {
        // Execute all reads first
        while (this.readQueue.length > 0) {
            const fn = this.readQueue.shift();
            fn();
        }
        
        // Then execute all writes
        while (this.writeQueue.length > 0) {
            const fn = this.writeQueue.shift();
            fn();
        }
        
        this.scheduled = false;
    }
}

// Create singleton instances
const cacheManager = new CacheManager();
const performanceMonitor = new PerformanceMonitor();
const imageLazyLoader = new ImageLazyLoader();
const domBatcher = new DOMBatcher();

// Export utilities
export {
    CacheManager,
    cacheManager,
    debounce,
    throttle,
    VirtualScroller,
    ImageLazyLoader,
    imageLazyLoader,
    PerformanceMonitor,
    performanceMonitor,
    rafThrottle,
    DOMBatcher,
    domBatcher
};
