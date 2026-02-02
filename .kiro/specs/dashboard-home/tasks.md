# Implementation Plan: Dashboard Home View

## Overview

This implementation plan breaks down the Dashboard Home View feature into discrete coding tasks. The dashboard will be implemented as a new view following existing patterns, with modular widgets that can be developed and tested independently.

## Tasks

- [ ] 1. Set up dashboard view structure and navigation
  - [ ] 1.1 Create dashboard-view.html template file
    - Create HTML structure with widget containers
    - Add responsive grid layout classes
    - Include loading skeleton placeholders
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 1.2 Create dashboard-view.js with DashboardView class
    - Implement constructor with stateManager integration
    - Implement init() method to load template and setup
    - Implement loadWidgetConfig() and saveWidgetConfig() for localStorage
    - Export as default module
    - _Requirements: 1.1, 10.1, 10.2_
  
  - [ ] 1.3 Register dashboard view in app.js router
    - Add 'dashboard' case to renderView switch
    - Create renderDashboardView() method
    - Update APP_CONFIG.defaultView to 'dashboard'
    - Add dashboard to navigation menu as first item
    - _Requirements: 1.1, 1.3_


- [ ] 2. Implement Today's Overview Widget
  - [ ] 2.1 Create TodayOverviewWidget class
    - Implement constructor with dataService and stateManager
    - Implement load() method to fetch habits, completions, time blocks, wellness data
    - Use Promise.all for parallel data fetching
    - _Requirements: 2.1, 2.4, 2.6_
  
  - [ ] 2.2 Implement habit display and toggle functionality
    - Render habits with checkboxes showing completion status
    - Implement toggleHabitCompletion() method
    - Add optimistic update with rollback on error
    - _Requirements: 2.2, 2.3_
  
  - [ ] 2.3 Implement time blocks display
    - Sort time blocks by start_time
    - Render with activity name, time range, category color
    - _Requirements: 2.4, 2.5_
  
  - [ ] 2.4 Implement wellness data display
    - Show mood, sleep, water entries if they exist
    - Show prompts to add entries if missing
    - _Requirements: 2.6, 2.7_
  
  - [ ] 2.5 Implement active Pomodoro session display
    - Check stateManager for active session
    - Display mode and time remaining
    - _Requirements: 2.8_
  
  - [ ]* 2.6 Write property test for time blocks sorting
    - **Property 3: Time Blocks Sorted by Start Time**
    - **Validates: Requirements 2.4**

- [ ] 3. Implement Goals Progress Widget
  - [ ] 3.1 Create GoalsProgressWidget class
    - Implement constructor with dataService
    - Implement load() to fetch annual and weekly goals
    - Implement getCurrentWeek() helper
    - _Requirements: 3.1, 3.3_
  
  - [ ] 3.2 Implement annual goals display with progress bars
    - Render goals with title, progress percentage, category color
    - Add click handler to navigate to annual view
    - _Requirements: 3.2, 3.7_
  
  - [ ] 3.3 Implement weekly goals display with toggles
    - Render goals with checkboxes
    - Implement toggleWeeklyGoal() method
    - _Requirements: 3.4, 3.5_
  
  - [ ] 3.4 Implement trend indicator
    - Calculate completion rate vs previous period
    - Display visual indicator (arrow up/down)
    - _Requirements: 3.6_
  
  - [ ]* 3.5 Write property test for data completeness
    - **Property 2: Data Completeness - All Items Displayed**
    - **Validates: Requirements 2.1, 3.1, 3.3**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 5. Implement Kanban Summary Widget
  - [ ] 5.1 Create KanbanSummaryWidget class
    - Implement constructor with kanbanService
    - Implement load() to fetch boards and aggregate cards
    - Implement helper methods: isInDoneColumn(), isInProgressColumn()
    - _Requirements: 4.1, 4.2_
  
  - [ ] 5.2 Implement cards due today/this week display
    - Filter cards by due_date
    - Exclude cards in Done columns
    - Render with title, board name, priority indicator
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 5.3 Implement recently completed cards display
    - Filter cards completed in last 7 days
    - Limit to 5 most recent
    - _Requirements: 4.4_
  
  - [ ] 5.4 Implement board quick access and WIP status
    - Render links to active boards
    - Calculate and display WIP status
    - Add click handler to navigate to kanban view
    - _Requirements: 4.5, 4.6, 4.7_
  
  - [ ] 5.5 Implement empty state
    - Show prompt to create first board when no boards exist
    - _Requirements: 4.8_
  
  - [ ]* 5.6 Write property test for Kanban date filtering
    - **Property 8: Kanban Cards Due Date Filtering**
    - **Validates: Requirements 4.1, 4.2, 4.4**

- [ ] 6. Implement Quick Actions Widget
  - [ ] 6.1 Create QuickActionsWidget class
    - Implement constructor with stateManager, dataService, kanbanService
    - _Requirements: 5.1_
  
  - [ ] 6.2 Implement Pomodoro quick start
    - Add button to start Pomodoro session
    - Integrate with global pomodoroTimer or navigate to view
    - _Requirements: 5.1, 5.2_
  
  - [ ] 6.3 Implement habit log modal
    - Add button to open habit log modal
    - Fetch habits and render selection UI
    - _Requirements: 5.3, 5.4_
  
  - [ ] 6.4 Implement new card modal
    - Add button to open new card modal
    - Fetch boards and render card creation form
    - _Requirements: 5.5, 5.6_
  
  - [ ] 6.5 Implement quick note modal
    - Add button to open quick note modal
    - Render text input for note entry
    - _Requirements: 5.7, 5.8_


- [ ] 7. Implement Calendar Widget
  - [ ] 7.1 Create CalendarWidget class
    - Implement constructor with dataService
    - Implement load() to fetch time blocks and habit completions for month
    - Track eventDays and completionDays as Sets
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ] 7.2 Implement mini calendar grid rendering
    - Render current month in compact grid
    - Highlight today's date
    - Mark days with events and completions
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  
  - [ ] 7.3 Implement month navigation
    - Add prev/next month buttons
    - Implement navigateMonth() method
    - Reload data on navigation
    - _Requirements: 6.6_
  
  - [ ] 7.4 Implement day click and tooltip
    - Add click handler to navigate to monthly view
    - Add tooltip showing event count on hover
    - _Requirements: 6.4, 6.7_
  
  - [ ]* 7.5 Write property test for calendar navigation round-trip
    - **Property 10: Calendar Month Navigation Round-Trip**
    - **Validates: Requirements 6.6**

- [ ] 8. Implement Statistics Summary Widget
  - [ ] 8.1 Create StatisticsSummaryWidget class
    - Implement constructor with dataService, kanbanService
    - Implement load() to calculate all statistics
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 8.2 Implement habit streak calculation
    - Implement calculateHabitStreak() method
    - Count consecutive days with all habits completed
    - _Requirements: 7.1_
  
  - [ ] 8.3 Implement Pomodoro and cards statistics
    - Count completed focus sessions this week
    - Count cards moved to Done this week
    - _Requirements: 7.2, 7.3_
  
  - [ ] 8.4 Implement reading progress display
    - Calculate completed vs total books
    - _Requirements: 7.4_
  
  - [ ] 8.5 Implement trend indicators and navigation
    - Compare to previous period
    - Display visual indicators (arrows, colors)
    - Add click handlers to navigate to detailed views
    - _Requirements: 7.5, 7.6, 7.7_
  
  - [ ]* 8.6 Write property test for habit streak calculation
    - **Property 12: Habit Streak Calculation**
    - **Validates: Requirements 7.1**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 10. Implement widget orchestration and error handling
  - [ ] 10.1 Implement BaseWidget class with error handling
    - Create safeLoad() wrapper with try/catch
    - Implement renderError() method
    - Track isLoading, hasError, errorMessage state
    - _Requirements: 12.1, 12.2_
  
  - [ ] 10.2 Implement parallel widget loading in DashboardView
    - Use Promise.allSettled for widget loading
    - Handle partial failures gracefully
    - Implement showFullPageError() for complete failure
    - _Requirements: 1.4, 1.5, 12.3_
  
  - [ ] 10.3 Implement refresh functionality
    - Add manual refresh button
    - Implement refreshAllWidgets() method
    - Show loading state during refresh
    - _Requirements: 9.4_
  
  - [ ]* 10.4 Write property test for widget error isolation
    - **Property 1: Widget Error Isolation**
    - **Validates: Requirements 1.5, 12.1**

- [ ] 11. Implement widget customization
  - [ ] 11.1 Implement widget visibility toggle
    - Add settings panel UI
    - Implement toggleWidgetVisibility() method
    - Persist to localStorage
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ] 11.2 Implement widget reordering
    - Add drag handles to widgets
    - Implement reorderWidgets() method
    - Persist order to localStorage
    - _Requirements: 10.4_
  
  - [ ] 11.3 Implement default configuration
    - Define getDefaultConfig() method
    - Apply defaults for new users
    - _Requirements: 10.5_
  
  - [ ]* 11.4 Write property test for config persistence round-trip
    - **Property 15: Widget Configuration Persistence Round-Trip**
    - **Validates: Requirements 10.2**

- [ ] 12. Implement responsive layout and styling
  - [ ] 12.1 Add dashboard CSS to main.css
    - Create .dashboard-view container styles
    - Implement responsive grid layout
    - Style widget containers with consistent spacing
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 12.2 Add dark mode support to theme.css
    - Add dashboard-specific dark mode variables
    - Ensure sufficient color contrast
    - _Requirements: 8.5_
  
  - [ ] 12.3 Implement mobile-friendly touch targets
    - Ensure buttons meet minimum touch target size (44px)
    - Add appropriate spacing for mobile
    - _Requirements: 8.6_

- [ ] 13. Implement accessibility features
  - [ ] 13.1 Add keyboard navigation
    - Implement tab order between widgets
    - Add keyboard shortcuts for common actions
    - _Requirements: 11.1_
  
  - [ ] 13.2 Add ARIA labels and roles
    - Add aria-label to all widgets
    - Add role="region" to widget containers
    - Add aria-live for dynamic updates
    - _Requirements: 11.2, 11.5_
  
  - [ ] 13.3 Add focus indicators
    - Style :focus-visible states
    - Ensure visible focus ring on all interactive elements
    - _Requirements: 11.4_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Follow existing view patterns from habits-view.js and kanban-view.js
- Use existing CSS class naming conventions to avoid conflicts (prefix with `dashboard-`)
