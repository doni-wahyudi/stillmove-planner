# Stillmove Planner Legacy Parity Report

Date: 2026-08-19

## Scope and Method

This report compares the legacy Vanilla JS feature set checked into `views/` and `js/` with the current React routes in `src/App.tsx` and the corresponding React pages under `src/pages/`.

The requested deployed URL could not be inspected through the available browser bridge: the in-app browser connection failed and the public page was not retrievable through the web reader. The report is therefore a source-level parity audit of the same legacy GitHub Pages build, not an authenticated visual test. No credentials are recorded or reproduced here.

## Executive Summary

All eleven legacy destination views have a React route:

| Legacy destination | React route | Overall status |
| --- | --- | --- |
| Dashboard | `#/dashboard` | Partial parity |
| Weekly | `#/weekly` | Partial parity |
| Monthly | `#/monthly` | Partial parity |
| Annual | `#/annual` | Partial parity |
| Habits | `#/habits` | Partial parity |
| Action Plan | `#/action-plan` | Partial parity |
| Kanban | `#/kanban` | Partial parity |
| Canvas, Mindmap, Flowchart | `#/canvas` | Partial parity |
| Pomodoro | `#/pomodoro` | Partial parity |
| Settings | `#/settings` | Partial parity |
| Authentication | `#/auth` | Partial parity |

The remaining migration is feature-parity work, not missing top-level routing. The biggest gaps are the legacy dashboard widgets, interval challenges, the full schedule-grid interactions, Kanban attachments/filters/mobile interactions, and the canvas editor's mature interaction model.

## Dashboard

Implemented:

- Basic summary, today schedule, habits, wellness summary, and navigation shell.
- Quick-add control, profile selector, theme, toast, breadcrumb, and mobile navigation are available globally.

Missing or reduced from legacy `views/dashboard-view.js`:

- Configurable dashboard widget layout and per-widget visibility settings.
- Kanban dashboard widget with board selector, work-in-progress/completed counts, and persisted board choice.
- Monthly calendar widget navigation and richer calendar indicators.
- Productivity score derived from habits, goals, and completed Kanban cards.
- Legacy quick actions, habit-log modal, quick-note modal, and dashboard settings modal.
- Explicit dashboard refresh controls and per-widget error/loading states.

Stale copy:

- `src/pages/DashboardPage/DashboardPage.tsx` still says: "More views are being migrated - stay tuned." This is obsolete and should be removed or replaced.

## Weekly Planner

Implemented:

- Week navigation, goals, task completion, add/delete time blocks, and basic day-to-day drag/drop movement.

Missing or reduced from legacy `views/weekly-view.js`:

- Hour-by-hour/slot-based visual schedule grid.
- Block resizing by drag handle and resize preview.
- Time-block edit modal, duplicate action, and richer delete confirmation.
- Overlap/conflict handling and category-specific block presentation.
- Event-type handling beyond a basic time block.
- Custom category updates in planner modal controls.

## Monthly Planner

Implemented:

- Month navigation, calendar display, notes, checklist, events, and drag/drop movement of basic events and time blocks.

Missing or reduced from legacy `views/monthly-view.js`:

- Complete calendar grid including adjacent-month dates and week alignment.
- Multi-day event creation by drag selection.
- Event create/edit modal with event type, times, category, and multi-day range.
- Sidebar summary and mobile sidebar behavior.
- Time-slot summary metrics and richer event/time-block indicators.
- Editing/deleting existing calendar events from the calendar.

## Annual Goals

Implemented:

- Annual navigation, goals, categories, progress, deadlines, milestone subgoals, reading-list records, and basic book completion.

Missing or reduced from legacy `views/annual-view.js`:

- Goal-template gallery and template application.
- Editable/reorderable milestones with inline text editing and deletion.
- Deadline countdown/milestone presentation states.
- Reading filters, sort controls, current page/total pages, rating, and detailed reading progress.
- Annual reflection, vision board, and bucket-list panels.
- AI habit suggestions for a goal.

## Habits and Wellness

Implemented:

- Daily and weekly habits, completion grids, notes, basic charts, streak/progress information, mood, sleep, and water tracking.

Missing or reduced from legacy `views/habits-view.js`:

- Interval challenges: create/edit/archive/delete challenge, configurable challenge habits, challenge completion grids, and challenge notes.
- Habit bundles/templates.
- Habit reordering and drag/drop ordering.
- Habit-to-goal and habit-to-Kanban-card linking workflows.
- Points, achievements, daily challenge, milestone celebration, chain visualization, heatmap, and full streak-chart experiences.
- Completion sound and richer animation/preferences behavior.

## Pomodoro

Implemented:

- Focus/short-break/long-break cycles, session persistence, browser-time recovery, settings, bell, task/goal/time-block linking, session history, statistics, and goal-focus aggregation.

Missing or reduced from legacy `views/pomodoro-view.js` and `js/app.js`:

- Cross-route floating Pomodoro player with minimize, drag positioning, and resume controls.
- Floating player's persisted location/state and route-aware visibility.
- Any legacy-specific break activity UI not present in the React timer.

## Action Plan

Implemented:

- Monthly selection, life areas, actions, frequency, success criteria, progress, evaluation notes, create, update, and delete.

Missing or reduced from legacy `views/action-plan-view.js`:

- Dedicated create/edit modal workflow with validation and cancel/confirm flow.
- More structured table-row editing and action-plan grouping/presentation parity.

## Kanban

Implemented:

- Boards, default columns, backlog, cards, basic card and column drag/drop, card detail editor, priorities, labels, due date, checklist completion, comments, activity, and deletes.

Missing or reduced from legacy `views/kanban-view.js` and `js/kanban-service.js`:

- Column create/edit/delete, WIP-limit editing, column color controls, context menu, and explicit move actions.
- Exact drag ordering with insertion placeholders, drag-to-backlog ordering, mobile touch dragging, and auto-scroll.
- Board/card deep links and persisted "last viewed board"/backlog expanded state.
- Search, priority/label/due-date filters, filter clearing, and board-level label management.
- File attachments: upload to Supabase Storage, image preview/lightbox, download, delete, and offline state.
- Comment editing/deletion, checklist item editing/deletion/reordering/due dates, and tab count badges.
- Full activity formatting and indicator badges on cards.
- Kanban-to-goal progress prompt and Kanban-to-Pomodoro active-card integration.
- Keyboard navigation and richer accessibility interactions.

## Canvas, Mindmap, and Flowchart

Implemented:

- Saved documents with freehand stroke data, color/width controls, a simple mindmap mode, and a simple flowchart mode stored in document JSON.

Missing or reduced from legacy `views/canvas-view.js`, `js/mindmap-engine.js`, and `js/flowchart-engine.js`:

- Canvas eraser, undo/redo, keyboard shortcuts, auto-save indicator, inline rename, delete confirmation, export to PNG, and full color/tool controls.
- Canvas document thumbnails and document search.
- Mindmap pan/zoom, node drag/drop, tree layout, collapse/expand, contextual node commands, styling controls, and SVG/PNG export.
- Dedicated persisted mindmap documents/nodes and flowchart documents/nodes/edges.
- Flowchart shape palette, node move/resize, handles, connector creation, connector styles, arrow types, labels, pan/zoom, and editing toolbar.

## Settings, Authentication, and App Shell

Implemented:

- Auth session handling, profiles, theme, general/AI/profile/account/data settings tabs, navbar, bottom navigation, toast, modal, breadcrumb, and quick-add FAB.

Needs validation or detailed comparison rather than known missing code:

- Auth registration, OTP, invitation-code, profile-isolation, account deletion, import/export, and AI-provider workflows need authenticated end-to-end validation.
- PWA offline/sync behavior needs production deployment validation.

## Legacy-Only Supporting Surface

The legacy project also contains analytics controllers/services (`js/analytics-panel.js`, `js/analytics-charts.js`, and `js/analytics-service.js`). No dedicated React analytics route or panel is present in `src/App.tsx`. If analytics is part of the intended product navigation, it remains an unported feature area.

## Recommended Completion Order

1. Remove the obsolete dashboard migration banner and port the configurable dashboard widgets.
2. Port interval challenges and habit linking, because they are a visible missing Habits tab/workflow.
3. Finish planner interaction parity: weekly time-slot grid/resizing, then monthly multi-day events/editing.
4. Finish Kanban: filters, column management, attachment storage, mobile drag, and card-detail editing parity.
5. Replace the simplified canvas modes with the legacy editor interaction model or adopt a maintained React canvas/diagram library and migrate persisted data.
6. Add the cross-route floating Pomodoro player and analytics panel if both remain product requirements.
7. Run the intentionally deferred automated, authenticated end-to-end, and production/PWA validation passes.

## Source References

- Legacy routes and shared Pomodoro player: `js/app.js`
- Legacy views: `views/*-view.js`
- Legacy canvas engines: `js/canvas-renderer.js`, `js/mindmap-engine.js`, `js/flowchart-engine.js`
- React route inventory: `src/App.tsx`
- Current React pages: `src/pages/`
