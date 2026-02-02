# Implementation Plan: Board Analytics

## Overview

This implementation plan breaks down the Board Analytics feature into discrete coding tasks. The approach prioritizes core analytics calculations first, followed by chart components, then UI integration. Property-based tests are included as optional sub-tasks to validate correctness properties.

## Tasks

- [ ] 1. Create Analytics Service foundation
  - [ ] 1.1 Create `js/analytics-service.js` with class structure and type definitions
    - Define AnalyticsService class with constructor
    - Add JSDoc type definitions for DateRange, CompletionMetrics, CycleTimeMetrics, ThroughputMetrics, BoardHealthMetrics, BoardAnalytics
    - Export singleton instance
    - _Requirements: 6.1, 6.2_

  - [ ] 1.2 Implement data fetching methods in Analytics Service
    - Add `getCardsForBoard(boardId, dateRange)` method to fetch cards within date range
    - Add `getActivityLogForBoard(boardId, dateRange)` method to fetch activity logs
    - Add `getColumnsForBoard(boardId)` method to fetch board columns
    - Integrate with existing dataService
    - _Requirements: 6.1_

  - [ ] 1.3 Implement helper methods for analytics calculations
    - Add `findDoneColumn(columns)` to identify Done column by title
    - Add `getDaysInRange(dateRange)` to generate array of dates
    - Add `getCardColumnAtDate(card, activityLog, date)` to determine card position at a point in time
    - _Requirements: 2.5_

- [ ] 2. Implement Completion Metrics
  - [ ] 2.1 Implement `getCompletionMetrics(boardId, dateRange)` method
    - Calculate total completed cards in range
    - Calculate total created cards in range
    - Calculate completion rate percentage
    - Calculate average completion time in milliseconds
    - Group cards by priority (high, medium, low, none)
    - Generate daily completion counts array
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 2.2 Write property tests for completion metrics
    - **Property 1: Card Counting Aggregation**
    - **Property 2: Completion Rate Calculation**
    - **Property 3: Average Completion Time**
    - **Property 4: Priority Grouping**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ] 3. Implement Cycle Time Metrics
  - [ ] 3.1 Implement `calculateColumnTimes(cardId, activityLog)` method
    - Parse activity log entries for card movements
    - Calculate time spent in each column
    - Handle edge case of cards never moved (use creation time)
    - _Requirements: 2.1, 2.5_

  - [ ] 3.2 Implement `getCycleTimeMetrics(boardId, dateRange)` method
    - Calculate average cycle time across all completed cards
    - Calculate average time per column
    - Generate cycle time trends over date range
    - Identify bottleneck columns (>1.5x average)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 3.3 Write property tests for cycle time metrics
    - **Property 5: Column Time Calculation**
    - **Property 6: Bottleneck Detection**
    - **Validates: Requirements 2.1, 2.2, 2.4**

- [ ] 4. Implement Throughput Metrics
  - [ ] 4.1 Implement `getThroughputMetrics(boardId, dateRange)` method
    - Generate cumulative flow diagram data (cards per column per day)
    - Calculate created vs completed counts per day
    - Calculate WIP trends over time
    - Generate burndown data (remaining cards over time)
    - Generate burnup data (total and completed over time)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.2 Write property tests for throughput metrics
    - **Property 7: Cumulative Flow Consistency**
    - **Validates: Requirements 3.1, 3.3**

- [ ] 5. Implement Board Health Metrics
  - [ ] 5.1 Implement `getBoardHealthMetrics(boardId, staleDaysThreshold)` method
    - Count and list overdue cards (due_date < today, not in Done)
    - Count and list stale cards (no activity in threshold days)
    - Count and list WIP limit violations
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 5.2 Write property tests for board health metrics
    - **Property 8: Overdue Card Detection**
    - **Property 9: Stale Card Detection**
    - **Property 10: WIP Violation Detection**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ] 6. Implement main analytics aggregation and caching
  - [ ] 6.1 Implement `getBoardAnalytics(boardId, dateRange)` method
    - Aggregate all metrics (completion, cycleTime, throughput, health)
    - Implement in-memory caching with cache key based on boardId + dateRange
    - Add cache invalidation on date range change
    - _Requirements: 6.5_

  - [ ]* 6.2 Write property tests for date filtering and caching
    - **Property 11: Date Range Filtering**
    - **Property 12: Metrics Caching Consistency**
    - **Validates: Requirements 5.5, 6.5**

- [ ] 7. Checkpoint - Verify Analytics Service
  - Ensure all Analytics Service methods work correctly
  - Run all property tests
  - Ask the user if questions arise

- [ ] 8. Create Chart Components
  - [ ] 8.1 Create `js/analytics-charts.js` with Chart.js wrapper classes
    - Create AnalyticsLineChart class for trends
    - Create AnalyticsBarChart class for completion/priority data
    - Create AnalyticsAreaChart class for cumulative flow diagram
    - Follow patterns from mobile-app chart components
    - Support theme-aware colors (light/dark mode)
    - _Requirements: 7.3_

  - [ ] 8.2 Add chart configuration and styling
    - Define color palette consistent with existing theme
    - Configure responsive chart options
    - Add tooltip formatting for dates and durations
    - _Requirements: 7.3, 7.5_

- [ ] 9. Create Analytics Panel UI
  - [ ] 9.1 Create `views/analytics-panel.html` template
    - Add panel container with header and close button
    - Add date range selector with presets (7d, 30d, 90d, year)
    - Add custom date range inputs
    - Add sections for each metric category
    - Add canvas elements for charts
    - Add health indicators summary card
    - _Requirements: 5.1, 5.3, 7.1, 7.2_

  - [ ] 9.2 Create `js/analytics-panel.js` controller
    - Implement AnalyticsPanel class with open/close methods
    - Implement date range selection handlers
    - Implement chart rendering with data from AnalyticsService
    - Implement health indicators rendering
    - Add loading and error states
    - Preserve date range selection in session
    - _Requirements: 5.2, 5.4, 6.3, 6.4, 7.4_

  - [ ]* 9.3 Write unit tests for Analytics Panel
    - Test date range preservation
    - Test loading/error state transitions
    - **Property 13: Date Range Preservation**
    - **Validates: Requirements 7.4**

- [ ] 10. Add Analytics Panel CSS
  - [ ] 10.1 Add analytics panel styles to `css/main.css`
    - Style panel container (slide-out or modal)
    - Style date range selector
    - Style chart containers with proper spacing
    - Style health indicators cards
    - Style loading and error states
    - _Requirements: 7.3_

  - [ ] 10.2 Add responsive styles for analytics panel
    - Adjust layout for mobile viewports
    - Stack charts vertically on small screens
    - Ensure touch-friendly date selectors
    - _Requirements: 7.5_

  - [ ] 10.3 Add dark mode styles to `css/theme.css`
    - Add analytics panel dark mode variables
    - Ensure chart colors work in dark mode
    - Style health indicators for dark mode
    - _Requirements: 7.3_

- [ ] 11. Integrate Analytics Panel with Kanban View
  - [ ] 11.1 Add analytics button to Kanban board header
    - Add button element to `views/kanban-view.html`
    - Style button consistent with existing header buttons
    - _Requirements: 7.1_

  - [ ] 11.2 Wire up analytics panel in `views/kanban-view.js`
    - Import AnalyticsPanel and AnalyticsService
    - Add click handler for analytics button
    - Initialize analytics panel with current board ID
    - Handle panel open/close state
    - _Requirements: 7.1, 7.2_

- [ ] 12. Checkpoint - Full Integration Test
  - Ensure analytics panel opens from Kanban board
  - Verify all charts render with real data
  - Test date range filtering
  - Test responsive behavior
  - Ask the user if questions arise

- [ ] 13. Add empty state and edge case handling
  - [ ] 13.1 Implement empty state UI
    - Show "No data available" message when no cards in range
    - Show "Board is healthy" message when all health indicators are zero
    - _Requirements: 1.5, 4.5_

  - [ ] 13.2 Implement error handling UI
    - Show error message with retry button on fetch failure
    - Handle partial data gracefully (some metrics available, others not)
    - _Requirements: 6.4_

- [ ] 14. Final checkpoint - Complete feature verification
  - Ensure all tests pass
  - Verify all requirements are met
  - Test with various board states (empty, few cards, many cards)
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The implementation uses vanilla JavaScript consistent with the existing codebase
- Chart.js is used for visualizations, following patterns from mobile-app components
