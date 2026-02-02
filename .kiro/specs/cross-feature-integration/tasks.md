# Implementation Plan: Cross-Feature Integration

## Overview

This implementation plan breaks down the cross-feature integration into incremental coding tasks. The Integration Service will be built first, followed by view-specific integrations. Each major component includes property tests to validate correctness.

## Tasks

- [ ] 1. Create Integration Service foundation
  - [ ] 1.1 Create `js/integration-service.js` with base class structure
    - Import dataService and kanbanService
    - Set up event emitter pattern with `on()`, `off()`, and `emit()` methods
    - Export singleton instance
    - _Requirements: 14.1, 15.1_
  
  - [ ] 1.2 Implement date range card fetching methods
    - Implement `getCardsDueInRange(startDate, endDate)`
    - Implement `getCardsDueThisWeek(weekStart)`
    - Implement `getCardsDueThisMonth(year, month)`
    - Add isOverdue and isDueToday flag calculations
    - _Requirements: 1.1, 1.4, 1.5, 7.1, 10.1_
  
  - [ ]* 1.3 Write property tests for date range filtering
    - **Property 1: Date Range Filtering Returns Only Cards Within Range**
    - **Property 2: Overdue and Today Flags Are Correctly Calculated**
    - **Validates: Requirements 1.1, 1.4, 1.5, 7.1, 10.1**

- [ ] 2. Implement Calendar-Kanban integration
  - [ ] 2.1 Implement CardDueDateEvent transformation
    - Create `transformCardToCalendarEvent(card, board, column)` method
    - Include all required fields: id, title, date, boardId, boardTitle, columnId, columnTitle, priority, isOverdue, isDueToday, eventType
    - _Requirements: 1.2, 1.3_
  
  - [ ]* 2.2 Write property test for CardDueDateEvent completeness
    - **Property 6: Card Due Date Events Contain Required Fields**
    - **Validates: Requirements 1.3, 6.2, 7.3**
  
  - [ ] 2.3 Implement card creation from calendar
    - Implement `createCardFromCalendar(dueDate, cardData)`
    - Pre-fill due_date from calendar date
    - Handle board/column selection
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ]* 2.4 Write property test for card creation pre-fill
    - **Property 3: Card Creation Pre-fills Correct Data** (calendar portion)
    - **Validates: Requirements 3.1**
  
  - [ ] 2.5 Implement navigation to card from calendar
    - Implement `navigateToCard(cardId, options)`
    - Handle board switching if needed
    - Support opening card modal
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 3. Checkpoint - Ensure calendar integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement Habit-Card linking
  - [ ] 4.1 Add database migration for linked_habit_id
    - Create SQL migration file `database/add-habit-card-linking.sql`
    - Add `linked_habit_id` column to kanban_cards table
    - Add index for habit-card lookups
    - _Requirements: 4.3, 4.4_
  
  - [ ] 4.2 Extend Data Service for habit-card operations
    - Add `getCardsLinkedToHabit(habitId)` method to data-service.js
    - Add `updateKanbanCard` support for linked_habit_id field
    - _Requirements: 6.1_
  
  - [ ] 4.3 Implement habit linking methods in Integration Service
    - Implement `createCardFromHabit(habitId, cardData)`
    - Implement `linkCardToHabit(cardId, habitId)`
    - Implement `unlinkCardFromHabit(cardId)`
    - Implement `getCardsLinkedToHabit(habitId)` with status
    - _Requirements: 4.2, 4.3, 5.4, 6.1, 6.2, 6.3_
  
  - [ ]* 4.4 Write property tests for habit linking
    - **Property 3: Card Creation Pre-fills Correct Data** (habit portion)
    - **Property 4: Unlinking Preserves Both Items**
    - **Property 5: Linked Cards Retrieval Returns Correct Cards With Status**
    - **Validates: Requirements 4.2, 4.3, 5.4, 6.1, 6.3**

- [ ] 5. Implement Weekly View integration
  - [ ] 5.1 Implement unified task list
    - Implement `getUnifiedWeeklyTasks(year, weekNumber)`
    - Combine weekly goals and cards due this week
    - Add type field ('goal' or 'card') to each item
    - Calculate completion status for cards based on column
    - _Requirements: 8.1, 8.2, 8.4_
  
  - [ ]* 5.2 Write property test for unified task list
    - **Property 7: Unified Task List Combines Goals and Cards With Type Distinction**
    - **Validates: Requirements 8.1, 8.2, 8.4**

- [ ] 6. Checkpoint - Ensure habit and weekly integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Monthly View integration
  - [ ] 7.1 Implement monthly completion summary
    - Implement `getMonthlyCompletionSummary(year, month)`
    - Calculate totalCompleted, totalCreated, byPriority
    - Calculate previousMonthCompleted and completionTrend
    - _Requirements: 12.1, 12.2, 12.4_
  
  - [ ]* 7.2 Write property test for completion summary
    - **Property 8: Monthly Completion Summary Contains All Required Statistics**
    - **Validates: Requirements 12.1, 12.2, 12.4**
  
  - [ ] 7.3 Implement action plan card linking
    - Implement `linkActionPlanToCard(actionPlanItemId, cardId)`
    - Implement `unlinkActionPlanFromCard(actionPlanItemId)`
    - Extend monthly data retrieval to include linked card status
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [ ]* 7.4 Write property test for action plan linking
    - **Property 9: Action Plan Card Linking Shows Card Status**
    - **Validates: Requirements 13.2, 13.4**

- [ ] 8. Implement cross-view navigation
  - [ ] 8.1 Implement unified navigation API
    - Implement `navigateTo(viewName, params)`
    - Support deep linking with URL parameters
    - Implement URL parameter parsing
    - _Requirements: 14.1, 14.3_
  
  - [ ]* 8.2 Write property test for URL parsing
    - **Property 10: Deep Link URL Parsing Extracts Correct IDs**
    - **Validates: Requirements 14.3**
  
  - [ ] 8.3 Implement navigation error handling
    - Handle deleted items gracefully
    - Display user-friendly error messages
    - Return to source view on failure
    - _Requirements: 14.4_

- [ ] 9. Implement data synchronization
  - [ ] 9.1 Implement event-based updates
    - Emit events on card updates (cardUpdated, cardDeleted)
    - Emit events on habit updates (habitDeleted)
    - Subscribe views to relevant events
    - _Requirements: 15.1_
  
  - [ ] 9.2 Implement cascade behavior on delete
    - Handle card deletion: update linked action plan items
    - Handle habit deletion: unlink associated cards
    - _Requirements: 15.2, 15.3_
  
  - [ ]* 9.3 Write property tests for data consistency
    - **Property 11: Data Consistency Round-Trip**
    - **Property 12: Cascade Behavior on Delete Updates Linked Items**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.5**

- [ ] 10. Checkpoint - Ensure all Integration Service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Integrate with Monthly View
  - [ ] 11.1 Add card due date overlay to calendar
    - Extend `renderCalendar()` to fetch and display card due dates
    - Add toggle for showing/hiding card events
    - Style card events distinctly from time blocks
    - _Requirements: 10.2, 11.1, 11.2, 11.3_
  
  - [ ] 11.2 Add completion summary section
    - Add summary panel to monthly view HTML
    - Render completion statistics from Integration Service
    - Update summary when cards are completed
    - _Requirements: 12.1, 12.3_
  
  - [ ] 11.3 Add action plan card linking UI
    - Add "Link to Card" option in action plan item menu
    - Display linked card status on action plan items
    - Add card selection modal
    - _Requirements: 13.1, 13.2, 13.4_

- [ ] 12. Integrate with Weekly View
  - [ ] 12.1 Add "Tasks Due This Week" section
    - Add section to weekly view HTML
    - Render cards due this week from Integration Service
    - Show priority and overdue indicators
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [ ] 12.2 Add unified task list display
    - Combine weekly goals and cards in task list
    - Add type icons/badges for distinction
    - Handle completion status updates
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 12.3 Add quick card creation
    - Add quick-add button for cards
    - Implement card creation modal with week date picker
    - Board/column selection
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 13. Integrate with Habits View
  - [ ] 13.1 Add "Create Card" option to habits
    - Add button to habit item template
    - Implement card creation modal from habit
    - Pre-fill card title with habit name
    - _Requirements: 4.1, 4.2_
  
  - [ ] 13.2 Add linked cards section to habit detail
    - Display list of cards linked to habit
    - Show card title, status, and due date
    - Add click-to-navigate functionality
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 14. Integrate with Kanban View
  - [ ] 14.1 Add habit linking to card modal
    - Add habit selector dropdown to card edit modal
    - Display habit link indicator on cards
    - Implement link/unlink functionality
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 14.2 Add calendar card creation entry point
    - Handle navigation from calendar with pre-filled due date
    - Support board/column selection
    - _Requirements: 3.1, 3.2_

- [ ] 15. Checkpoint - Ensure all view integrations work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Add CSS styles for integration features
  - [ ] 16.1 Add calendar card event styles
    - Style CardDueDateEvent distinct from time blocks
    - Add overdue and today highlight styles
    - Add Kanban icon indicator
    - _Requirements: 1.2, 1.4, 1.5, 1.6_
  
  - [ ] 16.2 Add habit link indicator styles
    - Style habit badge on Kanban cards
    - Style linked cards list in habits view
    - _Requirements: 5.3, 6.2_
  
  - [ ] 16.3 Add weekly tasks section styles
    - Style "Tasks Due This Week" section
    - Style unified task list with type distinction
    - _Requirements: 7.2, 8.2_
  
  - [ ] 16.4 Add monthly summary styles
    - Style completion summary panel
    - Style action plan link indicators
    - _Requirements: 12.1, 13.4_

- [ ] 17. Final checkpoint - Full integration testing
  - Ensure all tests pass, ask the user if questions arise.
  - Test cross-view navigation flows
  - Test data synchronization across views
  - Verify offline behavior

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The Integration Service should be completed before view integrations
- CSS changes should follow the project's CSS debugging guide to avoid conflicts
