# Requirements Document

## Introduction

The Canvas View feature provides a flexible digital canvas for freehand writing and drawing using stylus or M-Pencil input devices. This feature enables users to capture handwritten notes, sketches, and ideas within the Daily Planner application. Unlike static image-based solutions, drawings are stored as editable stroke data, allowing users to modify their work at any time. The canvas integrates with the existing Supabase backend for cloud storage and cross-device synchronization.

## Glossary

- **Canvas**: The HTML5 drawing surface where users create freehand content using pointer input
- **Stroke**: A continuous line drawn from pointer down to pointer up, consisting of multiple points with coordinates and optional pressure data
- **Stroke_Data**: JSON-formatted data structure containing all stroke information including coordinates, pressure, timestamps, and styling properties
- **Canvas_Document**: A saved canvas with its associated stroke data, metadata, and thumbnail
- **Pointer_Events_API**: Web API that provides unified handling of mouse, touch, and stylus input with pressure sensitivity support
- **Palm_Rejection**: The system's ability to ignore unintentional touch input from the user's palm while writing with a stylus
- **Drawing_Tool**: A configurable instrument (pen, highlighter, eraser) that determines how strokes are rendered
- **Stroke_Smoothing**: Algorithm that interpolates raw input points to create visually smooth curves
- **Canvas_View_Controller**: The JavaScript module that manages canvas rendering, user input, and data persistence

## Requirements

### Requirement 1: Canvas Navigation and Document Management

**User Story:** As a user, I want to access the Canvas View from the main navigation menu, so that I can create and manage my handwritten notes alongside other planner features.

#### Acceptance Criteria

1. WHEN a user clicks the "Canvas View" menu item, THE Canvas_View_Controller SHALL display the canvas interface with a document list
2. WHEN the Canvas View loads, THE Canvas_View_Controller SHALL retrieve and display all saved Canvas_Documents for the current user
3. WHEN a user clicks "New Canvas", THE Canvas_View_Controller SHALL create a new blank Canvas_Document and open it for editing
4. WHEN a user selects an existing Canvas_Document, THE Canvas_View_Controller SHALL load and render all stored Stroke_Data on the Canvas
5. WHEN displaying the document list, THE Canvas_View_Controller SHALL show a thumbnail preview, title, and last modified date for each Canvas_Document

### Requirement 2: Stylus and Pointer Input Handling

**User Story:** As a user, I want to draw on the canvas using my stylus or M-Pencil with pressure sensitivity, so that I can create natural handwritten content.

#### Acceptance Criteria

1. WHEN a pointer device touches the Canvas, THE Canvas_View_Controller SHALL begin recording a new Stroke with coordinates and pressure data
2. WHEN the pointer moves across the Canvas, THE Canvas_View_Controller SHALL continuously capture point data including x, y coordinates, pressure (0-1), and timestamp
3. WHEN the pointer is lifted from the Canvas, THE Canvas_View_Controller SHALL complete the current Stroke and add it to the Stroke_Data collection
4. WHEN pressure data is available from the stylus, THE Canvas_View_Controller SHALL vary the stroke width proportionally to the pressure value
5. WHEN a non-stylus touch is detected while a stylus stroke is active, THE Canvas_View_Controller SHALL ignore the touch input (Palm_Rejection)
6. THE Canvas_View_Controller SHALL apply Stroke_Smoothing to raw input points to produce visually smooth curves

### Requirement 3: Drawing Tools

**User Story:** As a user, I want to choose between different drawing tools (pen, highlighter, eraser), so that I can create varied content and make corrections.

#### Acceptance Criteria

1. THE Canvas_View_Controller SHALL provide a pen Drawing_Tool that creates solid, opaque strokes
2. THE Canvas_View_Controller SHALL provide a highlighter Drawing_Tool that creates semi-transparent strokes with increased width
3. THE Canvas_View_Controller SHALL provide an eraser Drawing_Tool that removes strokes intersecting with the eraser path
4. WHEN a user selects a Drawing_Tool, THE Canvas_View_Controller SHALL apply that tool's properties to subsequent strokes
5. WHEN using the eraser, THE Canvas_View_Controller SHALL remove complete strokes that intersect with the eraser path rather than pixel-based erasing

### Requirement 4: Stroke Styling Options

**User Story:** As a user, I want to customize stroke color and width, so that I can create visually distinct content.

#### Acceptance Criteria

1. THE Canvas_View_Controller SHALL provide a color picker with preset colors and custom color selection
2. THE Canvas_View_Controller SHALL provide stroke width options ranging from 1 to 20 pixels
3. WHEN a user changes the stroke color, THE Canvas_View_Controller SHALL apply the new color to subsequent strokes
4. WHEN a user changes the stroke width, THE Canvas_View_Controller SHALL apply the new base width to subsequent strokes (pressure still modulates final width)
5. THE Canvas_View_Controller SHALL persist the last used color and width settings for the current session

### Requirement 5: Undo and Redo Functionality

**User Story:** As a user, I want to undo and redo my drawing actions, so that I can easily correct mistakes.

#### Acceptance Criteria

1. WHEN a user triggers undo (button or Ctrl+Z), THE Canvas_View_Controller SHALL remove the most recent Stroke from the Canvas and add it to the redo stack
2. WHEN a user triggers redo (button or Ctrl+Y), THE Canvas_View_Controller SHALL restore the most recently undone Stroke to the Canvas
3. WHEN a new Stroke is drawn after an undo, THE Canvas_View_Controller SHALL clear the redo stack
4. THE Canvas_View_Controller SHALL maintain an undo history of at least 50 actions
5. WHEN the undo stack is empty, THE Canvas_View_Controller SHALL disable the undo button
6. WHEN the redo stack is empty, THE Canvas_View_Controller SHALL disable the redo button

### Requirement 6: Canvas Operations

**User Story:** As a user, I want to clear the canvas and export my drawings, so that I can start fresh or share my work.

#### Acceptance Criteria

1. WHEN a user clicks "Clear Canvas", THE Canvas_View_Controller SHALL prompt for confirmation before removing all strokes
2. IF the user confirms the clear action, THEN THE Canvas_View_Controller SHALL remove all Stroke_Data and reset the Canvas to blank
3. WHEN a user clicks "Export to PNG", THE Canvas_View_Controller SHALL generate a PNG image of the current Canvas content
4. WHEN exporting, THE Canvas_View_Controller SHALL download the PNG file with a filename based on the Canvas_Document title and timestamp

### Requirement 7: Data Persistence and Storage

**User Story:** As a user, I want my canvas drawings to be saved automatically and synced across devices, so that I never lose my work.

#### Acceptance Criteria

1. THE Canvas_View_Controller SHALL store Stroke_Data as JSON containing stroke arrays with point coordinates, pressure values, timestamps, and style properties
2. WHEN a Stroke is completed, THE Canvas_View_Controller SHALL auto-save the updated Stroke_Data to Supabase within 2 seconds
3. WHEN saving a Canvas_Document, THE Canvas_View_Controller SHALL generate and store a thumbnail image for the document list
4. THE Canvas_View_Controller SHALL support offline drawing with automatic sync when connectivity is restored
5. WHEN loading a Canvas_Document, THE Canvas_View_Controller SHALL parse the stored Stroke_Data JSON and render all strokes accurately
6. THE Canvas_View_Controller SHALL store canvas metadata including title, created_at, updated_at, and thumbnail_url

### Requirement 8: Stroke Data Format

**User Story:** As a developer, I want stroke data stored in a structured JSON format, so that drawings remain editable and the data is efficient to store and transmit.

#### Acceptance Criteria

1. THE Stroke_Data format SHALL include an array of strokes, where each stroke contains an array of points
2. Each point in a Stroke SHALL contain x coordinate, y coordinate, pressure value (0-1), and timestamp
3. Each Stroke SHALL contain metadata including tool type, color, base width, and creation timestamp
4. THE Canvas_View_Controller SHALL serialize Stroke_Data to JSON for storage
5. THE Canvas_View_Controller SHALL deserialize JSON Stroke_Data and reconstruct strokes for rendering
6. FOR ALL valid Stroke_Data objects, serializing then deserializing SHALL produce an equivalent object (round-trip property)

### Requirement 9: Performance and Rendering

**User Story:** As a user, I want smooth drawing performance even with many strokes, so that the canvas remains responsive.

#### Acceptance Criteria

1. THE Canvas_View_Controller SHALL render strokes at 60 frames per second during active drawing
2. WHEN a Canvas_Document contains more than 1000 strokes, THE Canvas_View_Controller SHALL use optimized rendering techniques to maintain performance
3. THE Canvas_View_Controller SHALL use requestAnimationFrame for smooth rendering updates
4. WHEN the Canvas is idle, THE Canvas_View_Controller SHALL render a static image to reduce CPU usage
5. THE Canvas_View_Controller SHALL debounce auto-save operations to prevent excessive database writes

### Requirement 10: User Interface Integration

**User Story:** As a user, I want the Canvas View to match the existing application design, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE Canvas_View_Controller SHALL follow the existing application's visual design patterns and CSS variables
2. THE Canvas_View_Controller SHALL support both light and dark themes
3. THE Canvas_View_Controller SHALL be responsive and work on tablet and desktop screen sizes
4. THE Canvas_View_Controller SHALL provide keyboard shortcuts consistent with other views (e.g., Ctrl+Z for undo)
5. THE Canvas_View_Controller SHALL display a toolbar with drawing tools, color picker, and action buttons
