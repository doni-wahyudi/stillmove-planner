# Performance Optimization Quick Start Guide

Get started with performance optimizations in 5 minutes!

## Step 1: Test the Optimizations (1 minute)

Open `test-performance.html` in your browser to see all optimizations in action:

```bash
# Open in browser
start test-performance.html
```

Click through each test section to verify everything works.

## Step 2: Use Cached Data Service (2 minutes)

Replace your data service imports:

```javascript
// OLD - Direct database calls
import dataService from './js/data-service.js';
const goals = await dataService.getAnnualGoals(2025);

// NEW - Cached calls (same API!)
import cachedDataService from './js/cached-data-service.js';
const goals = await cachedDataService.getAnnualGoals(2025);
```

That's it! Your data is now cached automatically. 🎉

## Step 3: Debounce Text Inputs (1 minute)

Add debouncing to any text input:

```javascript
import { attachDebouncedInput } from './js/input-handlers.js';

// Saves only after user stops typing for 300ms
attachDebouncedInput(inputElement, (value) => {
    saveData(value);
}, 300);
```

## Step 4: Add Virtual Scrolling (1 minute)

For lists with many items:

```javascript
import { VirtualScroller } from './js/performance.js';

const scroller = new VirtualScroller(containerElement, {
    itemHeight: 50,
    renderItem: (item) => `<div>${item.name}</div>`
});

scroller.setItems(yourLongList);
```

## Step 5: Monitor Performance (30 seconds)

Check how well it's working:

```javascript
import { performanceMonitor, cacheManager } from './js/performance.js';

// In browser console
performanceMonitor.logReport();
console.log('Cache stats:', cacheManager.getStats());
```

## That's It!

You now have:
- ✅ Automatic data caching
- ✅ Debounced inputs
- ✅ Virtual scrolling
- ✅ Performance monitoring

## Next Steps

Want more? Check out:
- `PERFORMANCE_OPTIMIZATION.md` - Full documentation
- `PERFORMANCE_INTEGRATION_EXAMPLES.md` - Real-world examples
- `PERFORMANCE_IMPLEMENTATION_SUMMARY.md` - Complete feature list

## Common Use Cases

### Debounce a Textarea
```javascript
import { attachDebouncedTextarea } from './js/input-handlers.js';

attachDebouncedTextarea(textarea, (value) => {
    saveNotes(value);
}, 500);
```

### Lazy Load Images
```html
<img data-src="image.jpg" alt="Description">
```

```javascript
import { imageLazyLoader } from './js/performance.js';
imageLazyLoader.observeAll();
```

### Throttle Scroll Events
```javascript
import { createThrottledScrollHandler } from './js/input-handlers.js';

const handler = createThrottledScrollHandler(() => {
    updateUI();
}, 100);

element.addEventListener('scroll', handler);
```

## Performance Targets

After implementing these optimizations, you should see:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial Load | 3-4s | <2s | 40-50% |
| View Switch | 150-200ms | <100ms | 50% |
| API Calls | Every time | Cached | 70-80% |
| Scroll FPS | 30-40 | 60 | 50-100% |
| Memory (long lists) | High | Low | 50-60% |

## Troubleshooting

### Cache seems stale?
```javascript
import cachedDataService from './js/cached-data-service.js';
cachedDataService.clearCache();
```

### Want to see what's cached?
```javascript
import { cacheManager } from './js/performance.js';
console.log(cacheManager.getStats());
```

### Performance issues?
```javascript
import { performanceMonitor } from './js/performance.js';
performanceMonitor.logReport();
```

## Questions?

Check the full documentation:
- `PERFORMANCE_OPTIMIZATION.md` - Complete guide
- `PERFORMANCE_INTEGRATION_EXAMPLES.md` - Code examples
- `test-performance.html` - Interactive demos

Happy optimizing! 🚀
