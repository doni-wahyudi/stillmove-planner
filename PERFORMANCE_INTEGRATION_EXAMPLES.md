# Performance Optimization Integration Examples

This document provides practical examples of how to integrate the performance optimizations into existing views.

## Example 1: Habits View with Virtual Scrolling

### Before (Current Implementation)
```javascript
// views/habits-view.js
renderDailyHabitsGrid() {
    const gridContainer = document.getElementById('daily-habits-grid');
    gridContainer.innerHTML = '';
    
    // Renders ALL habits and ALL days - can be slow with 30 habits × 31 days = 930 cells
    this.dailyHabits.slice(0, 30).forEach(habit => {
        const row = document.createElement('div');
        // ... render all cells for all days
        gridContainer.appendChild(row);
    });
}
```

### After (With Virtual Scrolling)
```javascript
// views/habits-view.js
import { VirtualScroller } from '../js/performance.js';

class HabitsView {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.virtualScroller = null;
    }
    
    renderDailyHabitsGrid() {
        const gridContainer = document.getElementById('daily-habits-grid');
        
        if (!this.virtualScroller) {
            this.virtualScroller = new VirtualScroller(gridContainer, {
                itemHeight: 50,
                bufferSize: 3,
                renderItem: (habit, index) => this.renderHabitRow(habit)
            });
        }
        
        this.virtualScroller.setItems(this.dailyHabits.slice(0, 30));
    }
    
    renderHabitRow(habit) {
        const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
        let html = `<div class="habits-grid-row">`;
        html += `<div class="grid-cell habit-name-cell">${habit.habit_name || 'Unnamed'}</div>`;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const completion = this.dailyHabitCompletions.find(c => c.habit_id === habit.id && c.date === date);
            
            html += `
                <div class="grid-cell checkbox-cell">
                    <input type="checkbox" 
                           ${completion?.completed ? 'checked' : ''} 
                           onchange="window.toggleHabit('${habit.id}', '${date}', this.checked)">
                </div>
            `;
        }
        
        html += `</div>`;
        return html;
    }
}
```

## Example 2: Using Cached Data Service

### Before (Direct DataService)
```javascript
// views/annual-view.js
import dataService from '../js/data-service.js';

class AnnualView {
    async loadData() {
        // Every call hits the database
        this.annualGoals = await dataService.getAnnualGoals(this.currentYear);
        this.readingList = await dataService.getReadingList(this.currentYear);
    }
}
```

### After (With Caching)
```javascript
// views/annual-view.js
import cachedDataService from '../js/cached-data-service.js';

class AnnualView {
    async loadData() {
        // First call hits database, subsequent calls use cache
        this.annualGoals = await cachedDataService.getAnnualGoals(this.currentYear);
        this.readingList = await cachedDataService.getReadingList(this.currentYear);
        
        // Cache is automatically invalidated when data is modified
    }
    
    async updateGoal(id, updates) {
        // This will invalidate the cache automatically
        await cachedDataService.updateAnnualGoal(id, updates);
        
        // Next loadData() call will fetch fresh data
        await this.loadData();
    }
}
```

## Example 3: Debounced Input Handlers

### Before (Immediate Save)
```javascript
// views/monthly-view.js
setupEventListeners() {
    const notesTextarea = document.getElementById('monthly-notes');
    
    // Saves on every keystroke - can cause performance issues
    notesTextarea.addEventListener('input', (e) => {
        this.saveMonthlyNotes(e.target.value);
    });
}
```

### After (With Debouncing)
```javascript
// views/monthly-view.js
import { attachDebouncedTextarea } from '../js/input-handlers.js';

setupEventListeners() {
    const notesTextarea = document.getElementById('monthly-notes');
    
    // Saves only after user stops typing for 500ms
    this.cleanupFunctions = this.cleanupFunctions || [];
    const cleanup = attachDebouncedTextarea(notesTextarea, (value) => {
        this.saveMonthlyNotes(value);
    }, 500);
    
    this.cleanupFunctions.push(cleanup);
}

// Clean up when view is destroyed
destroy() {
    if (this.cleanupFunctions) {
        this.cleanupFunctions.forEach(fn => fn());
    }
}
```

## Example 4: Form Batching for Action Plans

### Before (Individual Field Saves)
```javascript
// views/action-plan-view.js
setupActionPlanForm() {
    document.getElementById('life-area').addEventListener('input', (e) => {
        this.saveField('life_area', e.target.value);
    });
    
    document.getElementById('specific-action').addEventListener('input', (e) => {
        this.saveField('specific_action', e.target.value);
    });
    
    document.getElementById('frequency').addEventListener('input', (e) => {
        this.saveField('frequency', e.target.value);
    });
    
    // Multiple API calls for each field change
}
```

### After (With Form Batching)
```javascript
// views/action-plan-view.js
import { createFormBatcher } from '../js/input-handlers.js';

setupActionPlanForm() {
    const form = document.getElementById('action-plan-form');
    
    // All changes are batched and saved together after 500ms
    this.formBatcher = createFormBatcher(form, (changes) => {
        this.saveActionPlan(changes);
    }, 500);
}

async saveActionPlan(changes) {
    // Single API call with all changes
    await cachedDataService.updateActionPlan(this.currentPlanId, changes);
}
```

## Example 5: Lazy Loading Images in Vision Board

### Before (Immediate Load)
```html
<!-- views/annual-view.html -->
<div class="vision-board">
    <img src="vision-image-1.jpg" alt="Vision 1">
    <img src="vision-image-2.jpg" alt="Vision 2">
    <img src="vision-image-3.jpg" alt="Vision 3">
    <!-- All images load immediately -->
</div>
```

### After (With Lazy Loading)
```html
<!-- views/annual-view.html -->
<div class="vision-board">
    <img data-src="vision-image-1.jpg" alt="Vision 1" class="lazy-image">
    <img data-src="vision-image-2.jpg" alt="Vision 2" class="lazy-image">
    <img data-src="vision-image-3.jpg" alt="Vision 3" class="lazy-image">
    <!-- Images load only when visible -->
</div>
```

```javascript
// views/annual-view.js
import { imageLazyLoader } from '../js/performance.js';

async init(container) {
    // ... render view
    
    // Observe all lazy images
    imageLazyLoader.observeAll('.lazy-image');
}
```

## Example 6: Performance Monitoring for Critical Operations

### Before (No Monitoring)
```javascript
// views/habits-view.js
async loadData() {
    this.dailyHabits = await dataService.getDailyHabits();
    this.dailyHabitCompletions = await dataService.getDailyHabitCompletions(startDate, endDate);
    this.renderCurrentTab();
}
```

### After (With Monitoring)
```javascript
// views/habits-view.js
import { performanceMonitor } from '../js/performance.js';

async loadData() {
    await performanceMonitor.measure('HabitsView.loadData', async () => {
        this.dailyHabits = await cachedDataService.getDailyHabits();
        this.dailyHabitCompletions = await cachedDataService.getDailyHabitCompletions(startDate, endDate);
    }, 'apiCall');
    
    await performanceMonitor.measure('HabitsView.render', async () => {
        this.renderCurrentTab();
    }, 'render');
}

// Check performance in console
showPerformanceStats() {
    performanceMonitor.logReport();
}
```

## Example 7: Throttled Scroll Handler for Weekly View

### Before (Unthrottled)
```javascript
// views/weekly-view.js
setupEventListeners() {
    const timeGrid = document.getElementById('time-grid');
    
    // Fires on every scroll event - can cause jank
    timeGrid.addEventListener('scroll', () => {
        this.updateVisibleTimeBlocks();
    });
}
```

### After (With Throttling)
```javascript
// views/weekly-view.js
import { createThrottledScrollHandler } from '../js/input-handlers.js';

setupEventListeners() {
    const timeGrid = document.getElementById('time-grid');
    
    // Fires at most once per 100ms - smooth scrolling
    const scrollHandler = createThrottledScrollHandler(() => {
        this.updateVisibleTimeBlocks();
    }, 100);
    
    timeGrid.addEventListener('scroll', scrollHandler);
}
```

## Example 8: DOM Batching for Habit Grid Updates

### Before (Multiple Reflows)
```javascript
// views/habits-view.js
updateHabitCompletions() {
    this.dailyHabits.forEach(habit => {
        const element = document.getElementById(`habit-${habit.id}`);
        const height = element.offsetHeight; // Read
        element.style.backgroundColor = '#green'; // Write
        const width = element.offsetWidth; // Read - causes reflow!
        element.style.width = '100%'; // Write - causes another reflow!
    });
}
```

### After (With DOM Batching)
```javascript
// views/habits-view.js
import { domBatcher } from '../js/performance.js';

updateHabitCompletions() {
    const measurements = [];
    
    // Schedule all reads first
    this.dailyHabits.forEach((habit, index) => {
        domBatcher.read(() => {
            const element = document.getElementById(`habit-${habit.id}`);
            measurements[index] = {
                height: element.offsetHeight,
                width: element.offsetWidth
            };
        });
    });
    
    // Then schedule all writes
    this.dailyHabits.forEach((habit, index) => {
        domBatcher.write(() => {
            const element = document.getElementById(`habit-${habit.id}`);
            element.style.backgroundColor = '#green';
            element.style.width = '100%';
        });
    });
    
    // All reads execute first, then all writes - only one reflow!
}
```

## Example 9: Complete View Integration

Here's a complete example showing all optimizations in one view:

```javascript
// views/optimized-habits-view.js
import cachedDataService from '../js/cached-data-service.js';
import { VirtualScroller, performanceMonitor, imageLazyLoader } from '../js/performance.js';
import { attachDebouncedInput, createThrottledScrollHandler } from '../js/input-handlers.js';

class OptimizedHabitsView {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.virtualScroller = null;
        this.cleanupFunctions = [];
    }

    async init(container) {
        this.container = container;
        
        // Load view with performance monitoring
        await performanceMonitor.measure('HabitsView.init', async () => {
            await this.loadTemplate();
            this.setupEventListeners();
            await this.loadData();
        }, 'viewTransition');
    }

    async loadTemplate() {
        const response = await fetch('views/habits-view.html');
        const html = await response.text();
        this.container.innerHTML = html;
        
        // Setup lazy loading for any images
        imageLazyLoader.observeAll('.lazy-image');
    }

    setupEventListeners() {
        // Debounced habit name input
        const habitInputs = document.querySelectorAll('.habit-name');
        habitInputs.forEach(input => {
            const cleanup = attachDebouncedInput(input, (value) => {
                this.updateHabitName(input.dataset.habitId, value);
            }, 300);
            this.cleanupFunctions.push(cleanup);
        });
        
        // Throttled scroll handler
        const scrollContainer = document.getElementById('habits-scroll-container');
        if (scrollContainer) {
            const scrollHandler = createThrottledScrollHandler(() => {
                this.handleScroll();
            }, 100);
            scrollContainer.addEventListener('scroll', scrollHandler);
        }
    }

    async loadData() {
        // Use cached data service
        await performanceMonitor.measure('HabitsView.loadData', async () => {
            this.dailyHabits = await cachedDataService.getDailyHabits();
            this.dailyHabitCompletions = await cachedDataService.getDailyHabitCompletions(
                this.getStartDate(),
                this.getEndDate()
            );
        }, 'apiCall');
        
        // Render with virtual scrolling
        this.renderWithVirtualScrolling();
    }

    renderWithVirtualScrolling() {
        const container = document.getElementById('habits-grid-container');
        
        if (!this.virtualScroller) {
            this.virtualScroller = new VirtualScroller(container, {
                itemHeight: 50,
                bufferSize: 5,
                renderItem: (habit) => this.renderHabitRow(habit)
            });
        }
        
        this.virtualScroller.setItems(this.dailyHabits);
    }

    renderHabitRow(habit) {
        // Render logic here
        return `<div class="habit-row">${habit.habit_name}</div>`;
    }

    async updateHabitName(habitId, name) {
        // Cached service automatically invalidates cache
        await cachedDataService.updateDailyHabit(habitId, { habit_name: name });
    }

    destroy() {
        // Cleanup
        this.cleanupFunctions.forEach(fn => fn());
        if (this.virtualScroller) {
            // Virtual scroller cleanup if needed
        }
        imageLazyLoader.disconnect();
    }

    // Show performance stats (for debugging)
    showStats() {
        console.log('Cache Stats:', cachedDataService.getCacheStats());
        console.log('Performance Report:', cachedDataService.getPerformanceReport());
    }
}

export default OptimizedHabitsView;
```

## Migration Checklist

When integrating these optimizations into existing views:

- [ ] Replace `dataService` imports with `cachedDataService`
- [ ] Add debouncing to all text inputs and textareas
- [ ] Add throttling to scroll and resize handlers
- [ ] Implement virtual scrolling for lists with >50 items
- [ ] Add lazy loading to images
- [ ] Add performance monitoring to critical operations
- [ ] Use DOM batching for bulk DOM operations
- [ ] Add cleanup functions for event listeners
- [ ] Test performance improvements
- [ ] Monitor cache hit rates

## Performance Testing

After integration, test performance:

```javascript
// In browser console
import { performanceMonitor, cacheManager } from './js/performance.js';

// Check performance
performanceMonitor.logReport();

// Check cache effectiveness
console.log('Cache stats:', cacheManager.getStats());

// Clear cache if needed
cacheManager.clear();
```

## Conclusion

These examples show how to integrate the performance optimizations into existing code with minimal changes. The optimizations are designed to be:

1. **Non-breaking**: Can be added incrementally
2. **Modular**: Use only what you need
3. **Easy to integrate**: Simple API
4. **Well-documented**: Clear examples
5. **Testable**: Built-in monitoring

Start with the easiest wins (cached data service, debouncing) and gradually add more optimizations as needed.
