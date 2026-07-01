# Project Technical Details — Stillmove Planner

Stillmove Planner is being migrated from a legacy Vanilla HTML/JS stack to a modern, responsive, and type-safe React + Vite + TypeScript Single Page Application (SPA). The project integrates Supabase as the backend/database, IndexedDB as a write-through caching layer for offline use, and a hash-based routing system to facilitate hosting on GitHub Pages.

---

## 1. System Overview & Tech Stack
* **Frameworks & Bundlers**: React 19.1.0, Vite 6.3.0, TypeScript ~5.8.0, and Hash Router (`react-router-dom` 7.6.0).
* **Styling**: Vanilla CSS utilizing CSS Variables for dynamic themes. Global styles are defined in [main.css](file:///c:/Users/whydo/D9043DB2025/code/explore/web_project/stillmove-planner/src/assets/main.css) and [theme.css](file:///c:/Users/whydo/D9043DB2025/code/explore/web_project/stillmove-planner/src/assets/theme.css).
* **Main Architectural Files**:
  * [supabase.ts](file:///c:/Users/whydo/D9043DB2025/code/explore/web_project/stillmove-planner/src/db/supabase.ts): Proxied Supabase Client with active profile isolation.
  * [CacheService.ts](file:///c:/Users/whydo/D9043DB2025/code/explore/web_project/stillmove-planner/src/services/CacheService.ts): Typed IndexedDB caching layer with pending queues.
  * [DataService.ts](file:///c:/Users/whydo/D9043DB2025/code/explore/web_project/stillmove-planner/src/services/DataService.ts): CRUD wrapper for tasks, habits, and planner items.
  * [AIService.ts](file:///c:/Users/whydo/D9043DB2025/code/explore/web_project/stillmove-planner/src/services/AIService.ts): AI command prompts, natural language commands, schedule optimizer.

---

## 2. Active Routing & Navigation
* **Routing Configuration**: Located in [App.tsx](file:///c:/Users/whydo/D9043DB2025/code/explore/web_project/stillmove-planner/src/App.tsx).
* **Active Views**:
  * `/auth`: [AuthPage](file:///c:/Users/whydo/D9043DB2025/code/explore/web_project/stillmove-planner/src/pages/AuthPage/AuthPage.tsx) - Login, registration, OTP validation.
  * `/dashboard`: [DashboardPage](file:///c:/Users/whydo/D9043DB2025/code/explore/web_project/stillmove-planner/src/pages/DashboardPage/DashboardPage.tsx) - Habit statistics, annual goals, day streak, and tasks today.
  * `/settings`: [SettingsPage](file:///c:/Users/whydo/D9043DB2025/code/explore/web_project/stillmove-planner/src/pages/SettingsPage/SettingsPage.tsx) - Account settings, sub-profiles management, general configuration, and AI options.
* **Placeholder/Coming Soon Views**:
  * `/weekly`: Weekly Planner (Time-blocking scheduler)
  * `/monthly`: Monthly Planner (Calendar grid)
  * `/annual`: Annual Goals (Quarterly tracker)
  * `/habits`: Habits Tracker (Checklist, weekly grids)
  * `/action-plan`: Action Plan (Task priority view)
  * `/kanban`: Kanban Boards (Drag-and-drop workflow cards)
  * `/canvas`: Canvas Boards (Visual drawings, mindmaps, flowchart)
  * `/pomodoro`: Pomodoro Timer (Focus timer)

---

## 3. Permanently Cleaned Up & Removed Features
* **Swipe Gestures for Mobile Navigation**: Disabled `this.setupSwipeGestures()` in [app.js](file:///c:/Users/whydo/D9043DB2025/code/explore/web_project/stillmove-planner/js/app.js) to resolve user frustration with accidental navigation during horizontal scrolling (e.g., viewing last dates in habits or weekly planners).

---

## 4. Key Configurations & Restorations
* **Profile Isolation Proxy**: Implemented in [supabase.ts](file:///c:/Users/whydo/D9043DB2025/code/explore/web_project/stillmove-planner/src/db/supabase.ts) to intercept queries and append a `profile_id` filter automatically to prevent data leak between sub-profiles.
* **IndexedDB Caching**: Implemented in [CacheService.ts](file:///c:/Users/whydo/D9043DB2025/code/explore/web_project/stillmove-planner/src/services/CacheService.ts) for offline resiliency.

---

## 5. Guidelines for Future Chats & Agents
* **Query Security**: Always query via the default Supabase client export `getSupabaseClient()`. Do NOT bypass this or write direct filters for `profile_id` manually unless querying exempt tables (e.g. `sub_profiles`, `profiles`).
* **Responsive Mobile Offsets**: Bottom bar handles navigation. Page containers must have standard padding-bottom (`pb-20` or equivalent CSS variable value) to avoid overlapping content.
* **No Unstyled Placeholders**: Styling must match the rich visual standards (gradients, HSL colors, smooth modal slide transitions).
* **Data Sync safety**: Let components invoke methods on `DataService` which coordinates IndexedDB Cache update + Supabase remote calls.

---

## 6. Verification Pipeline & Smoke Tests
* Run `npm run build` to compile the TypeScript definitions and compile the Vite project.
* Run `npm run dev` to start the local development server on port 5173.
