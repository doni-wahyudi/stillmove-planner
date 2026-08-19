# Implementation Plan: Kanban Card Enhancements

## Overview

This implementation plan breaks down the Kanban Card Enhancements feature into discrete coding tasks. The approach is incremental: database schema first, then service layer, then UI components, with testing integrated throughout. Each task builds on previous work to ensure no orphaned code.

## Tasks

- [x] 1. Database Schema and Storage Setup
  - [x] 1.1 Create database migration SQL file for new tables
    - Create `database/add-kanban-enhancements-tables.sql`
    - Add kanban_checklist_items table with RLS policies
    - Add kanban_attachments table with RLS policies
    - Add kanban_comments table with RLS policies
    - Add kanban_activity_log table with RLS policies
    - Add indexes for performance
    - _Requirements: 1.4, 5.3, 8.2, 11.1_

  - [x] 1.2 Document Supabase Storage bucket setup
    - Add instructions for creating 'kanban-attachments' bucket
    - Document bucket policies and file size limits
    - _Requirements: 5.2, 5.7_

- [x] 2. Extend Cache Service
  - [x] 2.1 Add new cache stores to cache-service.js
    - Add STORES entries: checklistItems, attachments, comments, activityLog
    - Add CACHE_TTL entries for each new store
    - _Requirements: 13.2_

  - [ ]* 2.2 Write property test for cache store configuration
    - **Property 28: Cache Population**
    - **Validates: Requirements 13.2**

- [x] 3. Implement Data Service Extensions
  - [x] 3.1 Add checklist item CRUD methods to data-service.js
    - Implement getChecklistItems(cardId)
    - Implement createChecklistItem(item)
    - Implement updateChecklistItem(id, updates)
    - Implement deleteChecklistItem(id)
    - Follow existing cache-first patterns
    - _Requirements: 1.2, 1.4, 1.5, 1.6, 1.7_

  - [x] 3.2 Add attachment CRUD methods to data-service.js
    - Implement getAttachments(cardId)
    - Implement createAttachment(attachment)
    - Implement deleteAttachment(id)
    - Note: File upload handled by StorageService
    - _Requirements: 5.3, 7.3_

  - [x] 3.3 Add comment CRUD methods to data-service.js
    - Implement getComments(cardId)
    - Implement createComment(comment)
    - Implement updateComment(id, updates)
    - Implement deleteComment(id)
    - Follow existing cache-first patterns
    - _Requirements: 8.2, 9.2, 9.3_

  - [x] 3.4 Add activity log methods to data-service.js
    - Implement getActivityLog(cardId)
    - Implement createActivityEntry(entry)
    - _Requirements: 10.2, 11.1_

- [x] 4. Implement Storage Service
  - [x] 4.1 Create storage-service.js for Supabase Storage operations
    - Implement uploadFile(file, path, onProgress)
    - Implement deleteFile(path)
    - Implement getPublicUrl(path)
    - Implement validateFile(file) with type and size checks
    - _Requirements: 5.2, 5.6, 5.7_

  - [ ]* 4.2 Write property tests for file validation
    - **Property 9: File Type Validation**
    - **Property 10: File Size Validation**
    - **Validates: Requirements 5.6, 5.7**

- [x] 5. Checkpoint - Database and Service Layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Kanban Service Extensions
  - [x] 6.1 Add checklist operations to kanban-service.js
    - Implement getChecklistItems(cardId)
    - Implement createChecklistItem(cardId, text)
    - Implement updateChecklistItem(itemId, updates)
    - Implement toggleChecklistItem(itemId)
    - Implement deleteChecklistItem(itemId)
    - Implement reorderChecklistItems(cardId, itemOrder)
    - Implement getChecklistProgress(cardId)
    - Add activity logging for checklist operations
    - _Requirements: 1.2, 1.5, 1.6, 2.1, 4.2, 10.5_

  - [ ]* 6.2 Write property tests for checklist operations
    - **Property 4: Checklist Order Index Invariant**
    - **Property 5: Checklist Toggle Round-Trip**
    - **Property 6: Checklist Progress Calculation**
    - **Validates: Requirements 1.6, 2.1, 2.3, 4.2, 4.3**

  - [x] 6.3 Add attachment operations to kanban-service.js
    - Implement getAttachments(cardId)
    - Implement uploadAttachment(cardId, file, onProgress)
    - Implement deleteAttachment(attachmentId)
    - Implement getAttachmentCount(cardId)
    - Add activity logging for attachment operations
    - _Requirements: 5.2, 5.3, 7.2, 7.3, 10.6_

  - [ ]* 6.4 Write property tests for attachment operations
    - **Property 7: Attachment Path Uniqueness**
    - **Property 8: Attachment Record Completeness**
    - **Validates: Requirements 5.2, 5.3**

  - [x] 6.5 Add comment operations to kanban-service.js
    - Implement getComments(cardId)
    - Implement createComment(cardId, text)
    - Implement updateComment(commentId, text)
    - Implement deleteComment(commentId)
    - Implement getCommentCount(cardId)
    - Add activity logging for comment operations
    - _Requirements: 8.2, 9.2, 9.3, 9.4_

  - [ ]* 6.6 Write property tests for comment operations
    - **Property 15: Comment Creation Completeness**
    - **Property 16: Comment Chronological Order**
    - **Property 19: Comment Ownership Authorization**
    - **Validates: Requirements 8.2, 8.5, 9.4**

  - [x] 6.7 Add activity log operations to kanban-service.js
    - Implement getActivityLog(cardId)
    - Implement logActivity(cardId, actionType, actionData)
    - Define ACTIVITY_TYPES constants
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [ ]* 6.8 Write property tests for activity log
    - **Property 23: Activity Entry Completeness**
    - **Property 24: Activity Log Chronological Order**
    - **Property 25: Activity Entry Serialization Round-Trip**
    - **Validates: Requirements 10.7, 10.8, 11.4**

- [x] 7. Checkpoint - Service Layer Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Checklist UI Component
  - [x] 8.1 Create ChecklistComponent class in kanban-view.js
    - Implement init(), render(), destroy() lifecycle
    - Implement addItem(text) with validation
    - Implement toggleItem(itemId)
    - Implement editItem(itemId, text)
    - Implement deleteItem(itemId) with confirmation
    - Implement renderProgressIndicator()
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1_

  - [x] 8.2 Implement checklist drag-and-drop reordering
    - Initialize drag listeners for checklist items
    - Handle drag start, over, drop, end events
    - Support touch gestures for mobile
    - Call reorderChecklistItems on drop
    - _Requirements: 4.1, 4.2, 4.4_

  - [ ]* 8.3 Write unit tests for ChecklistComponent
    - Test item rendering with various states
    - Test progress indicator calculation
    - Test empty input rejection
    - _Requirements: 1.3, 2.2, 3.1_

- [x] 9. Implement Attachments UI Component
  - [x] 9.1 Create AttachmentsComponent class in kanban-view.js
    - Implement init(), render(), destroy() lifecycle
    - Implement uploadFile(file) with progress indicator
    - Implement deleteAttachment(attachmentId) with confirmation
    - Implement renderAttachment(attachment)
    - Implement getFileIcon(fileType)
    - Implement formatFileSize(bytes)
    - _Requirements: 5.1, 5.4, 6.1, 6.6, 7.1_

  - [x] 9.2 Implement image preview functionality
    - Render inline thumbnails for image attachments
    - Implement openImageModal(attachment) for full preview
    - Implement downloadFile(attachment) for non-images
    - _Requirements: 6.2, 6.3, 6.4_

  - [ ]* 9.3 Write unit tests for AttachmentsComponent
    - Test file type icon mapping
    - Test file size formatting
    - Test image vs non-image rendering
    - _Requirements: 6.2, 6.6_

- [x] 10. Implement Comments UI Component
  - [x] 10.1 Create CommentsComponent class in kanban-view.js
    - Implement init(), render(), destroy() lifecycle
    - Implement addComment(text) with validation
    - Implement editComment(commentId, text)
    - Implement deleteComment(commentId) with confirmation
    - Implement renderComment(comment) with ownership check
    - Implement formatTimestamp(timestamp)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3_

  - [ ]* 10.2 Write unit tests for CommentsComponent
    - Test comment rendering with edit indicator
    - Test ownership-based action buttons
    - Test timestamp formatting
    - _Requirements: 9.1, 9.2_

- [x] 11. Implement Activity Log UI Component
  - [x] 11.1 Create ActivityLogComponent class in kanban-view.js
    - Implement init(), render(), destroy() lifecycle
    - Implement renderActivityEntry(entry)
    - Implement formatActivityMessage(entry) for each action type
    - Implement formatTimestamp(timestamp)
    - _Requirements: 10.1, 10.7, 10.8_

  - [ ]* 11.2 Write unit tests for ActivityLogComponent
    - Test activity message formatting for each action type
    - Test chronological ordering
    - _Requirements: 10.7, 10.8_

- [x] 12. Checkpoint - UI Components Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Integrate Components into Card Modal
  - [x] 13.1 Enhance card modal with tabbed interface
    - Add tab navigation: Details, Checklist, Attachments, Activity
    - Initialize components when tabs are selected
    - Destroy components when modal closes
    - _Requirements: 12.2_

  - [x] 13.2 Update card preview rendering in board view
    - Add checklist progress indicator to card preview
    - Add attachment count indicator with paperclip icon
    - Add comment count indicator
    - _Requirements: 3.2, 6.5, 12.1_

  - [ ]* 13.3 Write property test for card preview metadata
    - **Property 26: Card Preview Metadata Accuracy**
    - **Validates: Requirements 12.1**

- [x] 14. Add CSS Styles
  - [x] 14.1 Add checklist styles to main.css
    - Style checklist container and items
    - Style checkbox and completion states (strikethrough)
    - Style progress indicator
    - Style drag-and-drop states
    - _Requirements: 2.2, 3.4_

  - [x] 14.2 Add attachment styles to main.css
    - Style attachment list and items
    - Style file type icons
    - Style image thumbnails
    - Style upload progress indicator
    - _Requirements: 6.1, 6.2_

  - [x] 14.3 Add comment styles to main.css
    - Style comment list and items
    - Style comment input area
    - Style edit/delete buttons
    - Style edited indicator
    - _Requirements: 8.1, 9.1_

  - [x] 14.4 Add activity log styles to main.css
    - Style activity list and entries
    - Style action type icons
    - Style timestamps
    - _Requirements: 10.1_

  - [x] 14.5 Add dark mode styles to theme.css
    - Add dark mode variants for all new components
    - Ensure proper contrast ratios
    - _Requirements: 12.4_

  - [x] 14.6 Add card preview indicator styles
    - Style compact progress indicator
    - Style attachment count badge
    - Style comment count badge
    - _Requirements: 3.2, 6.5, 12.1_

- [x] 15. Implement Offline Support
  - [x] 15.1 Add offline handling for checklist operations
    - Queue create/update/delete when offline
    - Display cached items when offline
    - Show offline indicator
    - _Requirements: 1.7, 13.4_

  - [x] 15.2 Add offline handling for comment operations
    - Queue create/update/delete when offline
    - Display cached comments when offline
    - _Requirements: 8.6, 9.5, 13.4_

  - [x] 15.3 Add offline blocking for attachment operations
    - Prevent upload when offline with message
    - Prevent delete when offline with message
    - _Requirements: 5.8, 7.5_

  - [ ]* 15.4 Write property test for offline queueing
    - **Property 27: Offline Operation Queueing**
    - **Validates: Requirements 1.7, 8.6, 9.5, 11.3**

- [x] 16. Wire Activity Logging into Existing Card Operations
  - [x] 16.1 Add activity logging to card creation
    - Log 'card_created' when createCard is called
    - _Requirements: 10.2_

  - [x] 16.2 Add activity logging to card movement
    - Log 'card_moved' when moveCard is called
    - Include source and target column names in action_data
    - _Requirements: 10.3_

  - [x] 16.3 Add activity logging to card editing
    - Log 'card_edited' when updateCard changes title or description
    - _Requirements: 10.4_

  - [ ]* 16.4 Write property tests for activity logging integration
    - **Property 20: Activity Entry Creation on Card Events**
    - **Property 21: Activity Entry Creation on Checklist Events**
    - **Property 22: Activity Entry Creation on Attachment Events**
    - **Validates: Requirements 10.2, 10.3, 10.5, 10.6**

- [x] 17. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all requirements are covered
  - Test offline/online transitions
  - Test dark mode appearance

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- CSS changes should follow the CSS debugging guide: search for existing rules before adding new ones
