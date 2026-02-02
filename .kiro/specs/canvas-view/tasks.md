# Implementation Plan: Canvas View

## Overview

This plan implements the Canvas View feature for the web version of the habit tracker app. The implementation follows the existing vanilla JavaScript architecture with Supabase backend and IndexedDB caching. Tasks are ordered to build incrementally, with core functionality first and advanced features later.

## Tasks

- [x] 1. Database setup and data service integration
  - [x] 1.1 Create canvas_documents table migration SQL
    - Add table with id, user_id, title, stroke_data (JSONB), thumbnail_url, timestamps
    - Add RLS policies for user data isolation
    - Add index on user_id and updated_at
    - _Requirements: 7.1, 7.6, 8.1_
  
  - [x] 1.2 Add canvas document methods to data-service.js
    - Implement getCanvasDocuments(userId)
    - Implement getCanvasDocument(id)
    - Implement createCanvasDocument(document)
    - Implement updateCanvasDocument(id, updates)
    - Implement deleteCanvasDocument(id)
    - Follow existing cache-first pattern with offline support
    - _Requirements: 1.2, 7.2, 7.4_
  
  - [x] 1.3 Add canvas store to cache-service.js
    - Add 'canvasDocuments' to STORES constant
    - Add cache TTL configuration for canvas data
    - _Requirements: 7.4_

- [x] 2. Core data models and managers
  - [x] 2.1 Create StrokeManager class
    - Implement stroke collection management (add, remove, clear)
    - Implement toJSON() and fromJSON() serialization
    - Implement renderAll() and renderStroke() methods
    - Implement getStrokesAtPoint() for eraser hit testing
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 2.2 Write property test for stroke data round-trip
    - **Property 1: Stroke Data Round-Trip**
    - **Validates: Requirements 8.4, 8.5, 8.6**
  
  - [x] 2.3 Create UndoManager class
    - Implement push(), undo(), redo() operations
    - Implement canUndo(), canRedo() state checks
    - Enforce 50-action history limit
    - Clear redo stack on new action
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 2.4 Write property test for undo-redo round-trip
    - **Property 8: Undo-Redo Round-Trip**
    - **Validates: Requirements 5.1, 5.2**
  
  - [ ]* 2.5 Write property test for undo history capacity
    - **Property 10: Undo History Capacity**
    - **Validates: Requirements 5.4**
  
  - [x] 2.6 Create ToolManager class
    - Implement tool switching (pen, highlighter, eraser)
    - Implement color and width setters with validation
    - Implement getStrokeStyle() for current settings
    - Clamp width to 1-20 range
    - _Requirements: 3.1, 3.2, 3.4, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 2.7 Write property test for width constraint enforcement
    - **Property 14: Width Constraint Enforcement**
    - **Validates: Requirements 4.2**

- [x] 3. Checkpoint - Core managers complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Pointer input handling
  - [x] 4.1 Create PointerEventHandler class
    - Implement pointer down/move/up event handlers
    - Capture x, y coordinates normalized to 0-1 range
    - Capture pressure data (default 0.5 if unavailable)
    - Capture timestamps for each point
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ]* 4.2 Write property test for stroke point data validity
    - **Property 3: Stroke Point Data Validity**
    - **Validates: Requirements 2.2, 8.2**
  
  - [x] 4.3 Implement palm rejection logic
    - Track stylus vs touch pointer types
    - Ignore touch events within 100ms of active stylus stroke
    - _Requirements: 2.5_
  
  - [ ]* 4.4 Write property test for palm rejection
    - **Property 5: Palm Rejection During Stylus Input**
    - **Validates: Requirements 2.5**
  
  - [x] 4.5 Implement stroke smoothing algorithm
    - Apply Catmull-Rom or similar interpolation
    - Smooth raw input points for visual quality
    - _Requirements: 2.6_

- [x] 5. Canvas rendering
  - [x] 5.1 Implement dual-canvas rendering system
    - Create static canvas for completed strokes
    - Create active canvas overlay for current stroke
    - Use requestAnimationFrame for smooth updates
    - _Requirements: 9.1, 9.3_
  
  - [x] 5.2 Implement pressure-sensitive stroke rendering
    - Vary stroke width based on pressure × baseWidth
    - Apply tool opacity settings
    - _Requirements: 2.4, 3.1, 3.2_
  
  - [ ]* 5.3 Write property test for pressure modulates stroke width
    - **Property 4: Pressure Modulates Stroke Width**
    - **Validates: Requirements 2.4**
  
  - [x] 5.4 Implement eraser tool rendering
    - Show eraser cursor/indicator
    - Highlight strokes on hover for removal preview
    - Remove complete strokes on eraser path intersection
    - _Requirements: 3.3, 3.5_
  
  - [ ]* 5.5 Write property test for eraser removes complete strokes
    - **Property 7: Eraser Removes Complete Strokes**
    - **Validates: Requirements 3.3, 3.5**

- [x] 6. Checkpoint - Drawing functionality complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. View controller and UI
  - [x] 7.1 Create canvas-view.html template
    - Document list sidebar with thumbnails
    - Canvas area with toolbar
    - Tool buttons (pen, highlighter, eraser)
    - Color picker with presets
    - Width slider (1-20)
    - Undo/redo buttons
    - Clear and export buttons
    - Follow existing view HTML patterns
    - _Requirements: 1.1, 1.5, 4.1, 10.5_
  
  - [x] 7.2 Create CanvasView controller class
    - Implement init() with HTML template loading
    - Setup event listeners for all UI controls
    - Initialize StrokeManager, UndoManager, ToolManager
    - Load document list on init
    - _Requirements: 1.1, 1.2_
  
  - [x] 7.3 Implement document list functionality
    - Display documents with thumbnail, title, date
    - Handle new canvas creation
    - Handle document selection and loading
    - Handle document deletion with confirmation
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  
  - [ ]* 7.4 Write property test for document loading renders all strokes
    - **Property 2: Document Loading Renders All Strokes**
    - **Validates: Requirements 1.4, 7.5**
  
  - [x] 7.5 Implement keyboard shortcuts
    - Ctrl+Z for undo, Ctrl+Y for redo
    - Follow existing app keyboard shortcut patterns
    - _Requirements: 5.1, 5.2, 10.4_

- [x] 8. Canvas operations
  - [x] 8.1 Implement clear canvas functionality
    - Show confirmation modal before clearing
    - Clear all strokes and reset undo history
    - _Requirements: 6.1, 6.2_
  
  - [ ]* 8.2 Write property test for clear canvas removes all strokes
    - **Property 11: Clear Canvas Removes All Strokes**
    - **Validates: Requirements 6.2**
  
  - [x] 8.3 Implement PNG export functionality
    - Generate PNG from canvas content
    - Create filename with document title and timestamp
    - Trigger browser download
    - _Requirements: 6.3, 6.4_
  
  - [ ]* 8.4 Write property test for export generates valid PNG
    - **Property 12: Export Generates Valid PNG**
    - **Validates: Requirements 6.3, 6.4**

- [x] 9. Auto-save and persistence
  - [x] 9.1 Implement debounced auto-save
    - Save stroke data within 2 seconds of stroke completion
    - Debounce rapid changes to prevent excessive writes
    - Update document updated_at timestamp
    - _Requirements: 7.2, 9.5_
  
  - [x] 9.2 Implement thumbnail generation
    - Generate thumbnail on save
    - Scale canvas to thumbnail size
    - Store thumbnail URL with document
    - _Requirements: 7.3_
  
  - [x] 9.3 Implement offline support
    - Queue saves when offline
    - Sync when connectivity restored
    - Show offline indicator in UI
    - _Requirements: 7.4_

- [x] 10. Checkpoint - Core feature complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. App integration
  - [x] 11.1 Add Canvas View to navigation
    - Add menu item to index.html navigation
    - Add route handling in app.js Router
    - Add renderCanvasView() method to Router
    - _Requirements: 1.1_
  
  - [x] 11.2 Add Canvas View styles to CSS
    - Add canvas-view styles to main.css
    - Support light and dark themes using CSS variables
    - Ensure responsive layout for tablet and desktop
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 12. Final validation
  - [ ]* 12.1 Write property test for tool settings apply to new strokes
    - **Property 6: Tool Settings Apply to New Strokes**
    - **Validates: Requirements 3.4, 4.3, 4.4**
  
  - [ ]* 12.2 Write property test for stroke data structure validation
    - **Property 13: Stroke Data Structure Validation**
    - **Validates: Requirements 8.1, 8.2, 8.3**
  
  - [ ]* 12.3 Write property test for new stroke clears redo stack
    - **Property 9: New Stroke Clears Redo Stack**
    - **Validates: Requirements 5.3**

- [x] 13. Final checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests use fast-check library and require minimum 100 iterations
- The implementation follows existing app patterns (view controller, data service, cache service)
