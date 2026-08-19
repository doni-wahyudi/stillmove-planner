# Stillmove Planner Migration Implementation Plan

Last updated: 2026-08-19

This plan is derived from `LEGACY_PARITY_REPORT.md`. Status is updated before work starts and when work is complete.

## Status Key

- `pending`: not started
- `in_progress`: currently being implemented
- `completed`: implemented and type-checked
- `blocked`: requires a decision, credentials, schema change, or external dependency

## Work Items

| ID | Status | Scope | Completion criteria |
| --- | --- | --- | --- |
| 1 | completed | Dashboard cleanup and widgets | Remove stale migration banner; add configurable legacy-equivalent dashboard widgets and persistence. |
| 2 | completed | Habits interval challenges and links | Port active/archive challenge workflows, completion grid, and habit links. |
| 3 | completed | Weekly planner interactions | Port slot grid, block edit/duplicate/delete, resize, and conflict presentation. |
| 4 | completed | Monthly planner interactions | Port multi-day events, event editing, adjacent dates, and summary/sidebar behavior. |
| 5 | completed | Kanban parity | Add column management, filters, attachment storage, richer detail editing, mobile drag, and deep links. |
| 6 | completed | Canvas editor parity | Add editor controls, undo/redo, export, and richer mindmap/flowchart interactions. |
| 7 | completed | Pomodoro floating player and analytics | Port cross-route timer player and determine/port analytics navigation. |
| 8 | pending | Deferred validation | Automated tests, authenticated end-to-end QA, production/PWA QA. Explicitly excluded until requested. |

## Change Log

| Date | Item | Update |
| --- | --- | --- |
| 2026-08-19 | 1 | Marked in progress. |
| 2026-08-19 | 1 | Completed. Dashboard widgets (today, goals, kanban, calendar, challenges, actions, stats), configurable visibility, board selector, refresh, and settings modal are all present. Stale migration banner confirmed absent. |
| 2026-08-19 | 2 | Marked in progress. Adding Challenges tab to HabitsPage. |
| 2026-08-19 | 2 | Completed. Added Challenges tab to HabitsPage with create/archive/delete challenge workflow, per-challenge habit management (add/delete), date×habit completion grid with optimistic toggle, per-habit summary progress bars, and matching CSS. Added updateIntervalChallenge, deleteIntervalChallenge, and deleteChallengeHabit to DataService. TypeScript check passes (exit 0). |
| 2026-08-19 | 3 | Completed. WeeklyPage fully rewritten: hour-by-hour visual schedule grid (06:00–23:00) with absolute-positioned category-coloured time blocks, click-to-prefill slot targets, drag-to-move day columns, conflict/overlap red outline detection, block edit+duplicate+delete modal, Enter-key shortcuts, and all CSS added to PlannerPages.css. TypeScript check passes (exit 0). |
| 2026-08-19 | 4 | Marked in progress. Implementing full calendar grid with adjacent-month dates, multi-day event range, event create/edit/delete modal with event types, monthly summary metrics & weekly trend chart, action plans with progress sliders, categories sidebar, and notes/checklist. |
| 2026-08-19 | 4 | Completed. MonthlyPage fully implemented: calendar grid with ISO week numbers & adjacent-month dates, event create/edit/delete modal for both scheduled time blocks & all-day calendar events, Shift+drag multi-day range selection, monthly summary metric cards, weekly progress trend bar chart, action plans with interactive progress sliders & evaluation notes, categories filter sidebar, and notes/checklist. TypeScript check passes (exit 0). |
| 2026-08-19 | 5 | Completed. KanbanPage fully implemented: board management (create, rename, delete, switch boards), column management (add column, inline WIP limits, WIP warnings, delete column with automatic cards fallback to backlog, drag-to-reorder columns), multi-criteria filtering & search (text search across title/description/tags, priority tabs, dynamic tags filter, due date states: overdue/today/week), drag-and-drop cards between columns and backlog, collapsible backlog drawer, rich card detail modal (interactive checklist with progress bar, comments with timestamps & deletion, activity history log, tag chip management, due dates, priority pills, and deep link URL copying). Added deleteKanbanComment to DataService. TypeScript check passes (exit 0). |
| 2026-08-19 | 6 | Completed. CanvasPage fully implemented: multi-mode canvas studio (Draw: pen, highlighter with opacity, eraser, color presets & custom color picker, stroke width slider 1–24px, clear canvas; Mindmap: central topic & branching ideas, auto-linking Bézier curves, draggable nodes, color themes; Flowchart: process/terminal/decision/note shapes, directional connector arrows, step linking, draggable shapes), multi-level Undo/Redo history stack with keyboard shortcuts (Ctrl+Z/Ctrl+Y), Zoom (40%–250%) & Pan controls, PNG raster export, JSON data export, JSON import file picker, document management sidebar (search filter, mode filter tabs, new document, duplicate document, delete document), title editing with autosave status badge. TypeScript check passes (exit 0). |
| 2026-08-19 | 7 | Completed. Global Pomodoro timer system implemented: PomodoroContext providing cross-route state synchronization (mode: focus/shortBreak/longBreak, countdown timer, auto-session DB logging to pomodoro_sessions, sound chimes, auto-start transitions), FloatingPomodoroPlayer mini-player (draggable overlay, position persistence in localStorage, minimized pill vs expanded card views, play/pause/skip/reset controls, deep link to Pomodoro studio), PomodoroPage full studio integration (progress ring SVG, custom task & annual goal / time block selector links, weekly distribution bar chart, recent session history, goal focus time analysis, and settings modal for custom durations & audio triggers). TypeScript check passes (exit 0). |
| 2026-08-19 | 2 | UI Polish: Fixed Daily Trend streak-bars overflow across card boundaries by applying flexbox proportional scaling (flex: 1 1 0; min-width: 0) and box-sizing containment. Implemented frozen pane for the habit name column (.habit-grid-corner and .habit-grid-name) with sticky positioning (position: sticky; left: 0; z-index: 5/10), elevation background, and shadow dividers so habit names remain persistently visible while horizontally scrolling through all month dates. TypeScript check passes (exit 0). |
| 2026-08-19 | 2 | UX Improvement: Implemented automatic horizontal scroll centering to today's date column across Daily Habits, Weekly Habits, and Challenges grids on load, tab switch, and clicking 'Today'. Habit name column remains frozen on the left while today's column is smoothly positioned into the center of the active viewport. TypeScript check passes (exit 0). |
