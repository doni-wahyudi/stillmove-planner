# StillMove Planner - Improvement Recommendations

## Overview
This document outlines recommended improvements based on a code review of the StillMove Planner application.

---

## 🔴 High Priority

### 1. Service Worker Path Issues ✅ (Done)
**Problem:** The service worker uses absolute paths (`/index.html`, `/css/main.css`) which won't work when deployed to a subdirectory like `/stillmove-planner/`.

**Fix:** Updated `sw.js` to use relative paths:
- Changed all static assets to use `./` prefix
- Fixed fallback path in fetch handler
- Bumped cache version to v3

### 2. CSS Theme Override Complexity ✅ (Done - Safe Cleanup Complete)
**Problem:** The dark/light mode toggle has accumulated many `!important` overrides, making the CSS hard to maintain and debug.

**Completed (Safe Cleanup):**
- Removed duplicate `.sr-only` definitions (3 → 1)
- Removed unused toast styles (old implementation)
- Saved 58 lines total
- See `docs/CSS_CONSOLIDATION.md` for details

**Before/After:**
- main.css: 4,686 → 4,638 lines (-48)
- theme.css: 7,798 → 7,788 lines (-10)

**Intentionally Kept (Different Purposes):**
- `.modal` - main.css has layout, theme.css has colors
- `.skip-to-main` - main.css has positioning, theme.css has colors  
- `.loading-spinner` - main.css has layout, theme.css has theme

**Future Considerations (Requires Visual Regression Testing):**
- Consolidate `:root` variables (HIGH RISK)
- Remove redundant `!important` declarations (HIGH RISK)
- Consider CSS-in-JS for better scoping

### 3. Error Boundaries ✅ (Done)
**Problem:** View loading errors show generic error messages without recovery options.

**Implemented:**
- Added `getErrorViewHTML()` helper with retry buttons and hints
- Added global error boundary in `error-handler.js`
- Catches unhandled errors and promise rejections
- Shows user-friendly toast notifications for all errors

---

## 🟡 Medium Priority

### 4. Cache Invalidation Strategy ✅ (Done)
**Problem:** The cache service doesn't have a clear invalidation strategy. Stale data could persist.

**Implemented in `js/cache-service.js`:**
- Added `CACHE_TTL` configuration for different data types (5min to 24hrs)
- Added `isCacheFresh()` method to check if cache is still valid
- Added `getCacheAge()` for human-readable cache age
- Added `invalidateCache()` and `invalidateAllCaches()` methods
- Added `forceRefresh()` for manual cache refresh
- Cache metadata stored in localStorage

### 5. Bundle Size Optimization
**Problem:** All views are dynamically imported but there's no code splitting optimization.

**Recommendation:**
- Add a build step with Vite or Rollup for production
- Implement proper code splitting
- Minify CSS and JS for production
- Add gzip compression

### 6. Accessibility Improvements ✅ (Already implemented)
**Current state:** Good foundation with ARIA labels and keyboard navigation.

**Already implemented in `js/accessibility.js`:**
- Skip link for main content
- Keyboard navigation (arrow keys for menus/grids)
- Focus trapping in modals
- ARIA live regions for dynamic content
- Screen reader announcements
- Theme toggle with accessibility support
- Keyboard drag support

**Minor enhancements to consider:**
- Test with screen readers (NVDA, VoiceOver)
- Add more descriptive ARIA labels where needed

### 7. Performance Monitoring ✅ (Done)
**Problem:** No performance metrics collection.

**Implemented in `js/performance-monitor.js`:**
- Web Vitals tracking (LCP, FID, CLS, TTFB)
- View load time tracking for all views
- Slow resource warnings (>500ms)
- Performance summary with averages
- Metrics stored in localStorage (last 100 entries)
- Available globally via `window.performanceMonitor.logSummary()`

---

## 🟢 Low Priority (Nice to Have)

### 8. TypeScript Migration
**Benefit:** Better type safety, IDE support, and maintainability.

**Approach:**
- Start with `.d.ts` declaration files
- Gradually convert files starting with utilities
- Use strict mode for new code

### 9. Testing Coverage ✅ (Done)
**Current:** Comprehensive unit tests added.

**Test Files Created:**
- `tests/utils.test.js` - 50+ tests for utility functions
  - Goal progress calculation
  - Date formatting
  - Days in month
  - Category colors
  - Sleep duration
  - Water intake
  - Habit progress (7/14/21/28 days)
  - Time slots validation
  - Pomodoro timer functions
  - Debounce/throttle
  
- `tests/data-service.test.js` - Tests for DataService
  - Annual goals CRUD
  - Time blocks CRUD
  - Daily habits
  - Mood/water tracking
  - Error handling
  
- `tests/cache-service.test.js` - Tests for CacheService
  - TTL configuration
  - Cache freshness
  - Cache invalidation
  - Store names
  
- `tests/performance-monitor.test.js` - Tests for PerformanceMonitor
  - Metric recording
  - Performance ratings
  - View load timing
  - Summary generation
  
- `tests/error-handler.test.js` - Tests for ErrorHandler
  - Error categorization
  - User messages
  - Toast notifications
  - Specialized handlers
  
- `tests/accessibility.test.js` - Tests for Accessibility
  - Theme storage
  - System theme detection
  - ARIA attributes
  - Focus management

**Run tests with:**
```bash
npm test
```

**Remaining (optional):**
- Add E2E tests with Playwright or Cypress
- Increase coverage to 80%+

### 10. Documentation ✅ (Done)
**Created:**
- `docs/API.md` - Complete API reference for all services
- `docs/ARCHITECTURE.md` - System architecture documentation

**Covers:**
- DataService methods (goals, habits, time blocks, tracking)
- CacheService with TTL configuration
- PerformanceMonitor usage
- ErrorHandler patterns
- UI Components (Toast, Modal, Spinner)
- State Management
- Database schema overview
- Data flow diagrams
- Security (RLS)
- Deployment guide

### 11. State Management
**Current:** Custom StateManager class.

**Consideration:** For future scaling, consider:
- Zustand (lightweight)
- Jotai (atomic state)
- Keep current solution if app doesn't grow significantly

---

## 🔧 Quick Wins

### Immediate fixes that can be done quickly:

1. **Fix manifest.json paths** ✅ (Done)
   - Changed to relative paths for subdirectory deployment

2. **Fix service worker paths** ✅ (Done)
   - Changed all paths to relative (`./`) for subdirectory deployment
   - Fixed fallback path in fetch handler
   - Bumped cache version to v3

3. **Add loading states** ✅ (Done)
   - Added skeleton loaders with shimmer animation
   - Replaced "Loading..." text with visual skeleton UI

4. **Improve error messages** ✅ (Done)
   - Added `getErrorViewHTML()` helper method
   - Error views now include helpful hints
   - Added retry buttons to all error states

5. **Add data export reminder** ✅ (Done)
   - Added `checkExportReminder()` method
   - Shows toast notification every 7 days
   - Reminds users to backup their data

6. **Optimize images** ✅ (Done)
   - Reduced from 7.41MB to 3.42MB (54% reduction)
   - Current size is acceptable for PWA icons
   - Further optimization possible with lossy compression (tinypng.com) if needed

---

## 📊 Code Quality Metrics

| Metric | Before | Current | Target |
|--------|--------|---------|--------|
| main.css | 4,686 lines | 4,638 lines | < 4,000 lines |
| theme.css | 7,798 lines | 7,788 lines | < 6,000 lines |
| JS bundle size | Unknown | Unknown | < 500KB |
| Test coverage | Low | Medium | > 80% |
| Lighthouse PWA | Unknown | Unknown | > 90 |
| Accessibility | Good | Good | Excellent |

---

## 🗓️ Suggested Implementation Order

1. **Week 1:** ✅ Fix service worker paths, add error boundaries
2. **Week 2:** ✅ Add skeleton loaders, improve error messages, add export reminder
3. **Week 3:** ✅ Implement cache TTL, add performance monitoring
4. **Week 4:** ✅ CSS consolidation (safe cleanup complete)

---

## Notes

- The application has a solid foundation with good separation of concerns
- The PWA implementation is functional but needs path fixes for subdirectory deployment
- The caching strategy is well-designed for offline support
- The UI/UX is polished with good accessibility features
