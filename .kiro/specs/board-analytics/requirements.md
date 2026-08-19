# Requirements Document

## Introduction

The Board Analytics feature provides comprehensive analytics and insights for Kanban boards, enabling users to track productivity, identify bottlenecks, and visualize workflow patterns. This feature calculates metrics from existing kanban_cards and kanban_activity_log tables, presenting data through interactive charts with date range filtering.

## Glossary

- **Analytics_Service**: The service module responsible for calculating and aggregating analytics data from kanban tables
- **Analytics_Panel**: The UI component that displays analytics charts and metrics within the Kanban board view
- **Cycle_Time**: The duration from when a card enters the board (created or moved from backlog) until it reaches the Done column
- **Lead_Time**: The total time from card creation to completion
- **Throughput**: The number of cards completed within a given time period
- **WIP**: Work In Progress - the count of cards currently in active columns (not in backlog or done)
- **Cumulative_Flow_Diagram**: A stacked area chart showing the count of cards in each column over time
- **Stale_Card**: A card that has had no activity (movement, edits, comments) for a configurable number of days
- **Bottleneck_Column**: A column where cards spend disproportionately more time compared to other columns

## Requirements

### Requirement 1: Completion Metrics

**User Story:** As a user, I want to see completion metrics for my Kanban board, so that I can understand my productivity and completion rates.

#### Acceptance Criteria

1. WHEN a user opens the analytics panel, THE Analytics_Service SHALL calculate the count of cards completed per day, week, and month for the selected date range
2. WHEN displaying completion rate, THE Analytics_Panel SHALL show the ratio of completed cards to total cards created within the date range as a percentage
3. WHEN calculating average completion time, THE Analytics_Service SHALL compute the mean time from card creation to reaching the Done column
4. WHEN displaying priority breakdown, THE Analytics_Panel SHALL show a chart with card counts grouped by priority level (high, medium, low, none)
5. IF no cards exist in the selected date range, THEN THE Analytics_Panel SHALL display a message indicating no data is available

### Requirement 2: Cycle Time Analysis

**User Story:** As a user, I want to analyze cycle times for my cards, so that I can identify bottlenecks and optimize my workflow.

#### Acceptance Criteria

1. WHEN calculating column time, THE Analytics_Service SHALL compute the average time cards spend in each column based on activity log entries
2. WHEN displaying cycle time, THE Analytics_Panel SHALL show the average time from when a card enters the first active column until it reaches Done
3. WHEN showing cycle time trends, THE Analytics_Panel SHALL display a line chart of average cycle time over the selected date range
4. WHEN identifying bottlenecks, THE Analytics_Service SHALL flag columns where average card time exceeds 1.5 times the board average
5. IF a card has never been moved, THEN THE Analytics_Service SHALL use the time from creation to current date or completion date

### Requirement 3: Throughput Charts

**User Story:** As a user, I want to visualize throughput and flow metrics, so that I can track my team's delivery capacity over time.

#### Acceptance Criteria

1. WHEN displaying the cumulative flow diagram, THE Analytics_Panel SHALL show a stacked area chart with card counts per column over time
2. WHEN showing cards created vs completed, THE Analytics_Panel SHALL display a dual-line chart comparing creation and completion rates over time
3. WHEN calculating WIP trends, THE Analytics_Service SHALL track the count of cards in non-backlog, non-done columns over time
4. WHEN rendering burndown chart, THE Analytics_Panel SHALL show remaining cards (total minus completed) over the selected date range
5. WHEN rendering burnup chart, THE Analytics_Panel SHALL show both total scope (cards created) and completed cards as separate lines

### Requirement 4: Board Health Indicators

**User Story:** As a user, I want to see board health indicators, so that I can quickly identify issues requiring attention.

#### Acceptance Criteria

1. WHEN calculating overdue cards, THE Analytics_Service SHALL count cards with due_date before the current date that are not in the Done column
2. WHEN identifying stale cards, THE Analytics_Service SHALL count cards with no activity log entries within the configured stale threshold (default 7 days)
3. WHEN checking WIP limit violations, THE Analytics_Service SHALL count columns where current card count exceeds the configured wip_limit
4. WHEN displaying health indicators, THE Analytics_Panel SHALL show a summary card with counts for overdue, stale, and WIP violations
5. IF all health indicators are zero, THEN THE Analytics_Panel SHALL display a positive status message indicating the board is healthy

### Requirement 5: Date Range Filtering

**User Story:** As a user, I want to filter analytics by date range, so that I can analyze specific time periods.

#### Acceptance Criteria

1. WHEN the analytics panel loads, THE Analytics_Panel SHALL default to showing the last 30 days of data
2. WHEN a user selects a preset date range (7 days, 30 days, 90 days, year), THE Analytics_Service SHALL recalculate all metrics for that range
3. WHEN a user selects a custom date range, THE Analytics_Panel SHALL allow selecting start and end dates via date pickers
4. WHEN the date range changes, THE Analytics_Panel SHALL update all charts and metrics without requiring a page reload
5. THE Analytics_Service SHALL only include cards and activity within the selected date range for all calculations

### Requirement 6: Analytics Data Persistence

**User Story:** As a user, I want analytics to load quickly, so that I can access insights without long wait times.

#### Acceptance Criteria

1. WHEN loading analytics, THE Analytics_Service SHALL query data directly from kanban_cards and kanban_activity_log tables
2. WHEN calculating metrics, THE Analytics_Service SHALL use efficient database queries with appropriate indexes
3. WHEN the analytics panel is opened, THE Analytics_Panel SHALL show a loading indicator while data is being fetched
4. IF the database query fails, THEN THE Analytics_Panel SHALL display an error message and offer a retry option
5. THE Analytics_Service SHALL cache calculated metrics in memory for the current session to avoid redundant calculations

### Requirement 7: Analytics UI Integration

**User Story:** As a user, I want to access analytics from the Kanban board view, so that I can easily switch between board management and insights.

#### Acceptance Criteria

1. WHEN viewing a Kanban board, THE Analytics_Panel SHALL be accessible via an analytics button in the board header
2. WHEN the analytics button is clicked, THE Analytics_Panel SHALL open as a slide-out panel or modal overlay
3. WHEN displaying charts, THE Analytics_Panel SHALL use consistent styling with the existing application theme
4. WHEN the user closes the analytics panel, THE Analytics_Panel SHALL preserve the selected date range for the session
5. THE Analytics_Panel SHALL be responsive and display appropriately on both desktop and mobile viewports
