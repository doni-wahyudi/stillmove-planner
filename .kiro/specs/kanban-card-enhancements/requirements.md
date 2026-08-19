# Requirements Document

## Introduction

This document defines the requirements for enhancing Kanban cards with three major capabilities: checklists/subtasks, file attachments, and comments/activity logging. These enhancements transform cards from simple task placeholders into comprehensive work items that can track detailed progress, store related files, and maintain a history of collaboration and changes.

## Glossary

- **Kanban_Card**: An existing task item on the Kanban board containing title, description, and metadata
- **Checklist**: A list of subtasks or items within a card that can be individually completed
- **Checklist_Item**: A single item within a checklist with text and completion status
- **Attachment**: A file (image, document, etc.) associated with a card and stored in Supabase Storage
- **Comment**: A text note added to a card by a user with timestamp and attribution
- **Activity_Log**: A chronological record of all changes and events on a card
- **Activity_Entry**: A single event in the activity log (card created, moved, edited, etc.)
- **Progress_Indicator**: A visual display showing checklist completion (e.g., "3/5 items done")
- **Data_Service**: The existing service layer that handles CRUD operations with Supabase
- **Cache_Service**: The existing IndexedDB-based caching service for offline support
- **Supabase_Storage**: Supabase's file storage service for storing attachments

## Requirements

### Requirement 1: Checklist Creation and Management

**User Story:** As a user, I want to add checklists to my Kanban cards, so that I can break down tasks into smaller actionable items.

#### Acceptance Criteria

1. WHEN a user opens a card's detail view, THE System SHALL display an "Add Checklist" button
2. WHEN a user adds a checklist item, THE System SHALL create a new item with the provided text and unchecked status
3. WHEN a user submits an empty checklist item, THE System SHALL prevent the addition and maintain the current state
4. WHEN a checklist item is created, THE System SHALL persist it to the database with card_id, text, order_index, and is_completed=false
5. WHEN a user edits a checklist item's text, THE System SHALL update the item immediately
6. WHEN a user deletes a checklist item, THE System SHALL remove it after confirmation and reindex remaining items
7. IF the user is offline, THEN THE System SHALL queue checklist operations for sync when connectivity is restored

### Requirement 2: Checklist Item Completion

**User Story:** As a user, I want to mark checklist items as complete or incomplete, so that I can track my progress on subtasks.

#### Acceptance Criteria

1. WHEN a user clicks a checklist item's checkbox, THE System SHALL toggle the is_completed status
2. WHEN a checklist item is marked complete, THE System SHALL display it with a strikethrough style
3. WHEN a checklist item status changes, THE System SHALL update the progress indicator immediately
4. WHEN all checklist items are completed, THE System SHALL display a visual indicator of full completion
5. THE System SHALL persist completion status changes to the database immediately

### Requirement 3: Checklist Progress Display

**User Story:** As a user, I want to see a progress indicator on cards with checklists, so that I can quickly assess task completion status.

#### Acceptance Criteria

1. WHEN a card has checklist items, THE System SHALL display a progress indicator showing "X/Y items done"
2. WHEN viewing the card in the board view (card preview), THE System SHALL show a compact progress indicator
3. WHEN the checklist progress changes, THE System SHALL update the indicator in real-time
4. WHEN all items are complete, THE System SHALL display the progress indicator with a completion style (e.g., green color)
5. WHEN a card has no checklist items, THE System SHALL not display a progress indicator

### Requirement 4: Checklist Item Reordering

**User Story:** As a user, I want to reorder checklist items via drag-and-drop, so that I can prioritize subtasks.

#### Acceptance Criteria

1. WHEN a user drags a checklist item, THE System SHALL provide visual feedback showing the drag operation
2. WHEN a user drops a checklist item at a new position, THE System SHALL update order indices for all affected items
3. WHEN checklist items are reordered, THE System SHALL maintain sequential order indices with no gaps
4. THE System SHALL support both mouse drag-and-drop and touch gestures for reordering

### Requirement 5: File Attachment Upload

**User Story:** As a user, I want to attach files to my Kanban cards, so that I can keep related documents with my tasks.

#### Acceptance Criteria

1. WHEN a user opens a card's detail view, THE System SHALL display an "Add Attachment" button
2. WHEN a user selects a file to upload, THE System SHALL upload it to Supabase Storage with a unique path
3. WHEN a file is uploaded, THE System SHALL create an attachment record with card_id, file_name, file_path, file_type, and file_size
4. WHEN an upload is in progress, THE System SHALL display a progress indicator
5. IF an upload fails, THEN THE System SHALL display an error message and allow retry
6. THE System SHALL support common file types: images (jpg, png, gif, webp), documents (pdf, doc, docx), and other files (txt, csv, zip)
7. THE System SHALL enforce a maximum file size limit of 10MB per attachment
8. IF the user is offline, THEN THE System SHALL prevent attachment uploads and display an appropriate message

### Requirement 6: Attachment Display and Preview

**User Story:** As a user, I want to view and preview attachments on my cards, so that I can quickly access related files.

#### Acceptance Criteria

1. WHEN a card has attachments, THE System SHALL display them in a list within the card detail view
2. WHEN an attachment is an image, THE System SHALL display an inline thumbnail preview
3. WHEN a user clicks an image attachment, THE System SHALL open a larger preview modal
4. WHEN a user clicks a non-image attachment, THE System SHALL initiate a file download
5. WHEN viewing the card in the board view (card preview), THE System SHALL show an attachment count indicator (e.g., paperclip icon with count)
6. THE System SHALL display file name, file type icon, and file size for each attachment

### Requirement 7: Attachment Deletion

**User Story:** As a user, I want to delete attachments from my cards, so that I can remove outdated or incorrect files.

#### Acceptance Criteria

1. WHEN a user clicks delete on an attachment, THE System SHALL prompt for confirmation
2. WHEN deletion is confirmed, THE System SHALL remove the file from Supabase Storage
3. WHEN deletion is confirmed, THE System SHALL remove the attachment record from the database
4. IF deletion fails, THEN THE System SHALL display an error message and maintain the attachment
5. IF the user is offline, THEN THE System SHALL prevent attachment deletion and display an appropriate message

### Requirement 8: Comment Creation

**User Story:** As a user, I want to add comments to my Kanban cards, so that I can add notes and context to my tasks.

#### Acceptance Criteria

1. WHEN a user opens a card's detail view, THE System SHALL display a comment input area
2. WHEN a user submits a comment, THE System SHALL create a new comment with text, user_id, and timestamp
3. WHEN a user submits an empty comment, THE System SHALL prevent the addition and maintain the current state
4. WHEN a comment is created, THE System SHALL display it immediately in the comments list
5. THE System SHALL display comments in reverse chronological order (newest first)
6. IF the user is offline, THEN THE System SHALL queue comment creation for sync when connectivity is restored

### Requirement 9: Comment Editing and Deletion

**User Story:** As a user, I want to edit and delete my own comments, so that I can correct mistakes or remove outdated information.

#### Acceptance Criteria

1. WHEN a user views their own comment, THE System SHALL display edit and delete buttons
2. WHEN a user edits a comment, THE System SHALL update the text and add an "edited" indicator with timestamp
3. WHEN a user deletes a comment, THE System SHALL remove it after confirmation
4. THE System SHALL only allow users to edit or delete their own comments
5. IF the user is offline, THEN THE System SHALL queue comment edits/deletions for sync when connectivity is restored

### Requirement 10: Activity Log Display

**User Story:** As a user, I want to see an activity log on my cards, so that I can track the history of changes and events.

#### Acceptance Criteria

1. WHEN a user opens a card's detail view, THE System SHALL display an activity log section
2. WHEN a card is created, THE System SHALL log a "card created" activity entry
3. WHEN a card is moved between columns, THE System SHALL log a "card moved from X to Y" activity entry
4. WHEN a card's title or description is edited, THE System SHALL log a "card edited" activity entry
5. WHEN a checklist item is added or completed, THE System SHALL log the action as an activity entry
6. WHEN an attachment is added or removed, THE System SHALL log the action as an activity entry
7. THE System SHALL display activity entries with timestamp and user attribution
8. THE System SHALL display activity entries in reverse chronological order (newest first)

### Requirement 11: Activity Log Persistence

**User Story:** As a user, I want my activity log to be saved, so that I can review the history of my cards at any time.

#### Acceptance Criteria

1. THE System SHALL persist all activity entries to the database with card_id, action_type, action_data, user_id, and timestamp
2. WHEN loading a card's detail view, THE System SHALL fetch and display all activity entries for that card
3. IF the user is offline, THEN THE System SHALL display cached activity entries and queue new entries for sync
4. FOR ALL valid activity entry objects, serializing then deserializing SHALL produce an equivalent object (round-trip property)

### Requirement 12: User Interface Integration

**User Story:** As a user, I want the new card features to integrate seamlessly with the existing Kanban interface, so that my workflow is not disrupted.

#### Acceptance Criteria

1. THE System SHALL display checklist progress, attachment count, and comment count on card previews in the board view
2. THE System SHALL organize the card detail modal with tabs or sections for: Details, Checklist, Attachments, Activity
3. THE System SHALL use the existing modal, toast, and spinner components for consistent UI patterns
4. THE System SHALL support dark mode using the existing theme system
5. THE System SHALL be responsive and usable on mobile devices
6. WHEN an error occurs, THE System SHALL display a user-friendly message using the toast component

### Requirement 13: Data Persistence and Caching

**User Story:** As a user, I want my checklist, attachment, and comment data to be saved reliably, so that I don't lose my work.

#### Acceptance Criteria

1. THE System SHALL persist all checklist, attachment, and comment data to Supabase using the existing Data_Service patterns
2. THE System SHALL cache checklist items, comments, and activity entries in IndexedDB for offline access
3. THE System SHALL NOT cache attachment file contents locally (only metadata)
4. WHEN the user is offline, THE System SHALL allow viewing cached checklists, comments, and activity
5. WHEN data is synced after offline changes, THE System SHALL handle conflicts by preferring the most recent modification
