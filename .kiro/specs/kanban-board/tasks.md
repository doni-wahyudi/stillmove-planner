# Implementation Plan: Kanban Board

## Overview

This implementation plan breaks down the Kanban Board feature into incremental coding tasks. Each task builds on previous work, ensuring no orphaned code. The implementation uses vanilla JavaScript for the web version, following existing patterns in the codebase.

## Tasks

- [ ] 1. Set up database schema and data service methods
  - [x] 1.1 Create database migration file for kanban tables
    - Create `database/add-kanban-tables.sql` with boards, columns, and cards tables
    - Include RLS policies, indexes, and triggers following existing patterns
    - _Requirements: 8.1_
  
  - [x] 1.2 Add Kanban methods to DataService
    - Add CRUD methods for boards, columns, and cards in `js/data-service.js`
    - Follow existing cache-first patterns with offline support
    - _Requirements: 8.1, 8.2, 1.6_
  
  - [ ]* 1.3 Write property test for serialization round-trip
    - **Property 19: Serialization Round-Trip**
    - **Validates: Requirements 8.4, 8.5**

- [x] 2. Checkpoint - Verify database and data service
  - Ensure migration runs successfully
  - Test CRUD operations manually
  - Ask the user if questions arise

- [ ] 3. Create KanbanService with core business logic
  - [x] 3.1 Implement KanbanService class
    - Create `js/kanban-service.js` with board, column, and card operations
    - Implement order index management for columns and cards
    - Implement template instantiation logic
    - _Requirements: 1.1, 2.1, 2.2, 3.1, 10.2_
  
  - [ ]* 3.2 Write property test for default columns
    - **Property 5: Default Columns on Board Creation**
    - **Validates: Requirements 2.1**
  
  - [ ]* 3.3 Write property test for column order consistency
    - **Property 6: Column Order Index Consistency**
    - **Validates: Requirements 2.2, 2.4**
  
  - [ ]* 3.4 Write property test for card movement
    - **Property 9: Card Movement Index Consistency**
    - **Validates: Requirements 3.2, 3.3**

- [ ] 4. Implement filtering and search logic
  - [x] 4.1 Add filter and search methods to KanbanService
    - Implement `filterCards(cards, filters)` method
    - Implement `searchCards(cards, query)` method
    - Support priority, label, and due date filters
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 4.2 Write property test for search filter
    - **Property 14: Search Filter Accuracy**
    - **Validates: Requirements 7.1**
  
  - [ ]* 4.3 Write property test for priority filter
    - **Property 15: Priority Filter Accuracy**
    - **Validates: Requirements 7.2**

- [x] 5. Checkpoint - Verify service layer
  - Ensure all service methods work correctly
  - Run property tests
  - Ask the user if questions arise

- [ ] 6. Create Kanban view HTML template
  - [x] 6.1 Create kanban-view.html
    - Create `views/kanban-view.html` with board layout structure
    - Include board selector, column containers, backlog panel
    - Include filter controls and add card/column buttons
    - _Requirements: 9.1, 11.1, 12.3_

- [ ] 7. Implement KanbanView class
  - [x] 7.1 Create KanbanView with initialization and rendering
    - Create `views/kanban-view.js` following existing view patterns
    - Implement `init()`, `loadBoards()`, `loadBoard()`, `render()` methods
    - Implement board selector and last viewed board persistence
    - _Requirements: 12.2, 12.4_
  
  - [x] 7.2 Implement column and card rendering
    - Render columns with cards, WIP limit indicators
    - Render card details (title, priority badge, due date, labels)
    - Implement visual indicators for overdue dates
    - _Requirements: 2.6, 3.6, 3.7, 3.8_
  
  - [x] 7.3 Implement backlog panel
    - Render collapsible backlog panel with card list
    - Implement expand/collapse toggle with state persistence
    - Display backlog item count
    - _Requirements: 11.1, 11.6_
  
  - [ ]* 7.4 Write property test for backlog flag management
    - **Property 21: Backlog Flag Management**
    - **Validates: Requirements 11.2, 11.3, 11.4**

- [ ] 8. Implement drag-and-drop functionality
  - [x] 8.1 Create DragDropHandler class
    - Create drag-and-drop handler in `views/kanban-view.js`
    - Implement card dragging between columns and within columns
    - Implement card dragging to/from backlog
    - Implement column reordering
    - _Requirements: 2.4, 3.2, 3.3, 11.3, 11.4_
  
  - [x] 8.2 Add visual feedback for drag operations
    - Show drop target highlighting
    - Create placeholder element during drag
    - Handle drag cancellation and error recovery
    - _Requirements: 9.4_

- [x] 9. Checkpoint - Verify view and drag-drop
  - Test board rendering and navigation
  - Test drag-and-drop operations
  - Ask the user if questions arise

- [ ] 10. Implement modals for board and card editing
  - [x] 10.1 Implement board creation/edit modal
    - Use existing Modal component for board form
    - Include title, description, category selector, template selector
    - _Requirements: 1.1, 1.5, 10.1_
  
  - [x] 10.2 Implement card creation/edit modal
    - Use existing Modal component for card form
    - Include title, description, due date, priority, labels
    - Include goal link selector (populated from annual goals)
    - _Requirements: 3.4, 4.1, 4.2_
  
  - [x] 10.3 Implement column edit modal
    - Use existing Modal component for column settings
    - Include title and WIP limit fields
    - _Requirements: 2.3, 2.6_

- [ ] 11. Implement Pomodoro integration
  - [x] 11.1 Add Pomodoro button and integration
    - Add Pomodoro start button to card UI
    - Implement `startPomodoroForCard()` method
    - Display active Pomodoro indicator on card
    - Update pomodoro_count when session completes
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 11.2 Write property test for Pomodoro count
    - **Property 12: Pomodoro Count Increment**
    - **Validates: Requirements 5.3**

- [ ] 12. Implement Goal integration
  - [x] 12.1 Add goal linking functionality
    - Populate goal selector in card modal from annual goals
    - Display linked goal reference on card
    - Implement goal progress prompt when card moved to Done
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 12.2 Write property test for goal-linked card count
    - **Property 11: Goal-Linked Card Count**
    - **Validates: Requirements 4.3**

- [x] 13. Add navigation integration
  - [x] 13.1 Add Kanban to main navigation
    - Add Kanban menu item to `index.html` navigation
    - Register kanban view in `js/app.js` view router
    - Implement deep-linking support for boards and cards
    - _Requirements: 12.1, 12.5_

- [x] 14. Checkpoint - Verify integrations
  - Test Pomodoro integration end-to-end
  - Test goal linking and display
  - Test navigation and deep-linking
  - Ask the user if questions arise

- [x] 15. Add CSS styles for Kanban view
  - [x] 15.1 Add Kanban styles to main.css
    - Add board layout styles (flexbox for columns)
    - Add column styles with WIP limit indicators
    - Add card styles with priority colors, labels, due date badges
    - Add backlog panel styles with collapse animation
    - Add drag-and-drop visual feedback styles
    - _Requirements: 9.1, 9.3_
  
  - [x] 15.2 Add dark mode styles to theme.css
    - Add Kanban-specific dark mode overrides
    - Ensure proper contrast for all elements
    - _Requirements: 9.2_

- [x] 16. Implement keyboard navigation
  - [x] 16.1 Add keyboard support
    - Implement arrow key navigation between cards and columns
    - Implement Enter to open card modal
    - Implement keyboard shortcuts for common actions
    - _Requirements: 9.5_

- [x] 17. Final checkpoint - Complete feature verification
  - Ensure all tests pass
  - Test complete user flows
  - Test offline functionality
  - Test responsive design on mobile viewport
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Follow existing code patterns in the codebase (view structure, data service, modal usage)
- Use `fast-check` library for property-based tests
