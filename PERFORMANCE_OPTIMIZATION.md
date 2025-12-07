# Performance Optimization Guide

This document describes the performance optimizations implemented in the Daily Planner Application.

## Overview

The application includes several performance optimization techniques to ensure smooth user experience:

1. **Lazy Loading** - Views are loaded on-demand
2. **Data Caching** - Frequently accessed data is cached in memory
3. **Debouncing** - User input is debounced to reduce unnecessary operations
4. **Virtual Scrolling** - Long lists render only visible items
5. **Image Lazy Loading** - Images load only when visible
6. **Performance Monitoring** - Track and measure application performance

## 1. Lazy Loading

### Implementation
Views are dynamically imported only when needed, reducing initial bundle size and load time.

```javascript
// In app.js - Router class
async renderAnnualView() {
    const { default: AnnualView } = await import('../views/annual-view.js');
    const annualView = new AnnualView(this.stateManager);
    await annualView.init(this.viewContainer);
}
```

### Benefits
- Faster initial page load
- Reduced memory usage
- Better code splitting

## 2. Data Caching

### Implementation
The `CachedDataService` wraps the regular `DataService` with an in-memory cache layer.

```javascript
import cachedDataService from './js/cached-data-service.js';

// Cached calls automatically use cache when available
const goals = await cachedDataService.getAnnualGoals(2025);
```

### Features
- **LRU Eviction**: Least recently used items are evicted when cache is full
- **TTL Support**: Cache entries expire after a configurable time (default: 5 minutes)
- **Automatic Invalidation**: Cache is invalidated on data mutations
- **Cache Statistics**: Track hit rate and performance

### Usage

```javascript
// Get cache statistics
const stats = cachedDataService.getCacheStats();
console.log('Cache hit rate:', stats.hitRate);

// Clear cache manually if needed
cachedDataService.clearCache();
```

### Configuration
Default cache settings:
- Max size: 100 entries
- Default TTL: 5 minutes
- Eviction strategy: LRU (Least Recently Used)

## 3. Debouncing and Throttling

### Implementation
Input handlers are debounced to prevent excessive API calls and re-renders.

```javascript
import { debounce, throttle } from './js/performance.js';
import { createDebouncedTextHandler } from './js/input-handlers.js';

// Debounce text input
const handler = createDebouncedTextHandler((value) => {
    saveData(value);
}, 300);

element.addEventListener('input', handler);
```

### Available Handlers

#### Text Input (300ms delay)
```javascript
import { createDebouncedTextHandler } from './js/input-handlers.js';

const handler = createDebouncedTextHandler((value) => {
    console.log('Saving:', value);
}, 300);
```

#### Textarea (500ms delay)
```javascript
import { createDebouncedTextareaHandler } from './js/input-handlers.js';

const handler = createDebouncedTextareaHandler((value) => {
    console.log('Saving notes:', value);
}, 500);
```

#### Search Input (400ms delay)
```javascript
import { createDebouncedSearchHandler } from './js/input-handlers.js';

const handler = createDebouncedSearchHandler((query) => {
    performSearch(query);
}, 400);
```

#### Scroll Events (100ms throttle)
```javascript
import { createThrottledScrollHandler } from './js/input-handlers.js';

const handler = createThrottledScrollHandler(() => {
    updateScrollPosition();
}, 100);
```

### Form Batching
Batch multiple form field changes together:

```javascript
import { createFormBatcher } from './js/input-handlers.js';

const batcher = createFormBatcher(formElement, (changes) => {
    console.log('All changes:', changes);
    saveFormData(changes);
}, 500);
```

## 4. Virtual Scrolling

### Implementation
For long lists (habits, reading list, etc.), only visible items are rendered.

```javascript
import { VirtualScroller } from './js/performance.js';

const scroller = new VirtualScroller(containerElement, {
    itemHeight: 50,
    bufferSize: 5,
    renderItem: (item, index) => {
        return `<div class="item">${item.name}</div>`;
    }
});

// Set items to display
scroller.setItems(longListOfItems);
```

### Configuration
- `itemHeight`: Height of each item in pixels (default: 50)
- `bufferSize`: Number of extra items to render above/below viewport (default: 5)
- `renderItem`: Function to render each item

### Benefits
- Handles lists with thousands of items smoothly
- Constant memory usage regardless of list size
- Smooth scrolling performance

## 5. Image Lazy Loading

### Implementation
Images are loaded only when they enter the viewport.

```javascript
import { imageLazyLoader } from './js/performance.js';

// Observe all images with data-src attribute
imageLazyLoader.observeAll('img[data-src]');

// Or observe specific image
imageLazyLoader.observe(imageElement);
```

### HTML Usage
```html
<!-- Use data-src instead of src -->
<img data-src="path/to/image.jpg" alt="Description" class="lazy-image">
```

### Configuration
- `rootMargin`: Load images before they enter viewport (default: '50px')
- `threshold`: Intersection threshold (default: 0.01)

## 6. Performance Monitoring

### Implementation
Track and measure application performance metrics.

```javascript
import { performanceMonitor } from './js/performance.js';

// Measure an operation
const timer = performanceMonitor.startTimer('loadData');
await loadData();
performanceMonitor.endTimer(timer, 'apiCall');

// Or use measure helper
await performanceMonitor.measure('loadData', async () => {
    return await loadData();
}, 'apiCall');

// Get performance report
const report = performanceMonitor.getPerformanceReport();
console.log(report);
```

### Metrics Tracked
- **Page Load**: DOM content loaded, load complete, DOM interactive
- **View Transitions**: Time to switch between views
- **API Calls**: Database operation durations
- **Render Times**: Component render durations

### View Report
```javascript
performanceMonitor.logReport();
// Outputs:
// Performance Report
//   Page Load: { domContentLoaded: 1234, loadComplete: 2345, ... }
//   Averages: { viewTransition: 45.2, apiCall: 123.4, render: 12.3 }
//   Counts: { viewTransitions: 10, apiCalls: 50, renders: 100 }
```

## 7. DOM Batching

### Implementation
Batch DOM read and write operations to minimize reflows.

```javascript
import { domBatcher } from './js/performance.js';

// Schedule reads
domBatcher.read(() => {
    const height = element.offsetHeight;
    console.log('Height:', height);
});

// Schedule writes
domBatcher.write(() => {
    element.style.height = '100px';
});

// All reads execute first, then all writes
```

### Benefits
- Minimizes layout thrashing
- Reduces reflows and repaints
- Improves rendering performance

## Best Practices

### 1. Use Cached Data Service
Replace direct `dataService` imports with `cachedDataService`:

```javascript
// Before
import dataService from './js/data-service.js';
const goals = await dataService.getAnnualGoals(2025);

// After
import cachedDataService from './js/cached-data-service.js';
const goals = await cachedDataService.getAnnualGoals(2025);
```

### 2. Debounce User Input
Always debounce text inputs that trigger saves:

```javascript
import { attachDebouncedInput } from './js/input-handlers.js';

attachDebouncedInput(inputElement, (value) => {
    saveData(value);
}, 300);
```

### 3. Use Virtual Scrolling for Long Lists
For lists with more than 50 items:

```javascript
import { VirtualScroller } from './js/performance.js';

const scroller = new VirtualScroller(container, {
    itemHeight: 50,
    renderItem: (item) => renderItemHTML(item)
});
scroller.setItems(longList);
```

### 4. Lazy Load Images
Use `data-src` for images:

```html
<img data-src="image.jpg" alt="Description">
```

```javascript
import { imageLazyLoader } from './js/performance.js';
imageLazyLoader.observeAll();
```

### 5. Monitor Performance
Track critical operations:

```javascript
import { performanceMonitor } from './js/performance.js';

await performanceMonitor.measure('criticalOperation', async () => {
    return await performCriticalOperation();
}, 'apiCall');
```

## Performance Metrics

### Target Metrics
- **Initial Load**: < 2 seconds
- **View Transition**: < 100ms
- **API Call**: < 500ms
- **Render Time**: < 16ms (60fps)
- **Cache Hit Rate**: > 70%

### Monitoring
Check performance regularly:

```javascript
// In browser console
import { performanceMonitor, cacheManager } from './js/performance.js';

performanceMonitor.logReport();
console.log('Cache stats:', cacheManager.getStats());
```

## Troubleshooting

### Cache Issues
If data seems stale:
```javascript
import cachedDataService from './js/cached-data-service.js';
cachedDataService.clearCache();
```

### Performance Issues
Check performance report:
```javascript
import { performanceMonitor } from './js/performance.js';
performanceMonitor.logReport();
```

### Memory Issues
Reduce cache size:
```javascript
import { CacheManager } from './js/performance.js';
const smallCache = new CacheManager(50, 2 * 60 * 1000); // 50 items, 2 min TTL
```

## Future Optimizations

Potential future improvements:
1. Service Worker for offline caching
2. IndexedDB for persistent cache
3. Web Workers for heavy computations
4. Code splitting with dynamic imports
5. Progressive Web App (PWA) features
6. HTTP/2 Server Push
7. Resource hints (preload, prefetch)

## Conclusion

These performance optimizations ensure the Daily Planner Application remains fast and responsive even with large amounts of data. Follow the best practices outlined above when adding new features to maintain optimal performance.
