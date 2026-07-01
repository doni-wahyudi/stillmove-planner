# Stillmove Planner: React + Vite + TS Migration Handover

This document outlines the current state, architectural designs, database mappings, and remaining tasks for migrating the **Stillmove Planner** from its legacy Vanilla HTML/JS stack to a modern, responsive, and type-safe **React + Vite + TypeScript Single Page Application (SPA)**.

---

## 🛠️ Technology Stack & State Summary

### Target Stack
- **Core**: React 18.3+, Vite 5.2+, TypeScript 5.4+
- **Database / Backend**: Supabase (PostgreSQL)
- **Offline / Caching**: IndexedDB (`CacheService.ts` based on custom storage schemas)
- **Styling**: Vanilla CSS (CSS Variables for themes, custom responsive grid utilities)
- **Routing**: Hash-based Routing (`HashRouter` via `react-router-dom` to support seamless GitHub Pages hosting)

### Key Architectural Decoupling
1. **Profile Isolation Proxy (`src/db/supabase.ts`)**:
   - The database uses sub-profiles to partition workspaces (e.g. personal, work, custom projects).
   - A query proxy intercepts all `supabase.from(relation)` builder actions (`select`, `insert`, `update`, `delete`, `upsert`).
   - If the relation is not in `EXEMPT_RELATIONS`, the proxy automatically appends a filter: `.eq('profile_id', activeProfileId)`.
   - On insertions/upserts, it injects `profile_id = activeProfileId` if not present.
2. **IndexedDB Write-Through Caching (`src/services/CacheService.ts`)**:
   - Caches records locally for fast offline loading.
   - Queues offline mutations to a `sync_queue` table inside IndexedDB.
   - Automatically replays changes back to Supabase once connection recovers.
3. **Data Service (`src/services/DataService.ts`)**:
   - Exposes clean async APIs for pages to interact with database entities (goals, habits, tasks, wellness notes).
   - Handles localized filtering depending on the active sub-profile.

---

## 📂 Current Directory Structure & Status

Below is the directory map of the migrated source files under `src/`:

```
stillmove-planner/src/
├── App.tsx                     # Global providers wrapper & HashRouter routes config
├── main.tsx                    # React bootstrapping entrypoint
├── config.ts                   # Loaded settings & env configurations (OpenRouter, Groq, Supabase keys)
├── assets/                     # Transferred CSS systems (main.css, theme.css)
├── db/
│   └── supabase.ts             # [Ported] Proxied Supabase Client with active profile isolation
├── contexts/
│   ├── AuthContext.tsx         # [Ported] Auth Session Provider (Sign In / Sign Up status)
│   ├── ProfileContext.tsx      # [Ported] Sub-Profile Switcher, Emoji/Color definitions, active profile sync
│   └── ThemeContext.tsx        # [Ported] Light/Dark Theme configuration toggler
├── services/
│   ├── CacheService.ts         # [Ported] Typed IndexedDB caching layer with pending queues
│   ├── DataService.ts          # [Ported] CRUD wrapper for tasks, habits, and planner items
│   └── AIService.ts            # [Ported] AI prompts, natural language commands, schedule optimizer
├── layouts/
│   └── AppLayout/
│       ├── AppLayout.tsx       # [Ported] Shell Layout (injects BottomNav, Navbar, views container)
│       └── AppLayout.css
├── components/
│   ├── Navbar/                 # [Ported] Top branding bar with active profile indicator dropdown
│   ├── BottomNav/              # [Ported] Mobile-friendly bottom dashboard tab bar
│   ├── Modal/                  # [Ported] Animated, accessible popup dialog container
│   └── Toast/                  # [Ported] Clean micro-interactions notifier system
└── pages/
    ├── AuthPage/               # [Ported] Sign-in, Register, OTP Validation screen
    ├── DashboardPage/          # [Ported] Actionable workspace dashboard (habit streaks, today's schedule, wellness notes)
    └── SettingsPage/           # [Ported] Settings with General, AI options, Profile CRUD, Account, and Data management tabs
```

---

## 📅 Remaining Tasks & Work Backlog

The following views and features still need to be ported from Vanilla JS/HTML to React:

### Phase 3 Remnants (Layout Shell)
- [ ] **Breadcrumb Component**: Create navigation trail component on top of panels.
- [ ] **QuickAddFAB**: Floating Action Button on mobile to quickly record tasks or habits.

### Phase 4 Remnants (Primary Core Views)
- [ ] **Habits View**:
  - Requires daily checklist tabs, weekly completion view grids, interval tracking, and wellness/mood metrics charts (using `Chart.js` via `react-chartjs-2`).
- [ ] **Pomodoro Timer View**:
  - Implement focus timer with tab active/background tracking (local storage recovery for tab sleeps) and audio bells.

### Phase 5 (Complex Board & Canvas Views)
- [ ] **Weekly Planner**: Time-blocking scheduler canvas grid with daily columns.
- [ ] **Monthly Planner**: Dynamic monthly calendar grids with draggable tasks.
- [ ] **Annual Goals**: Long-term tracking, split into quarters.
- [ ] **Kanban Boards**: Drag-and-drop workflow cards (lists, comments, attachments).
- [ ] **Action Plan View**: Task lists segmented by priority levels.
- [ ] **Canvas Documents / Mindmaps / Flowcharts**: Custom visual drawing spaces. Re-implement interactive node trees, drawing connections, and saving state to JSON.

### Phase 6 (PWA Deployment)
- [ ] **Service Worker Sync**: Ensure `sw.js` correctly compiles, bundles, and registers under Vite output structure, allowing fully functional offline storage.

---

## 🔑 Crucial Implementation Rules for the Next Agent

When writing React components for Stillmove Planner:
1. **Query Security**: Always query via the default Supabase client export `getSupabaseClient()`. Do NOT bypass this or write direct filters for `profile_id` manually unless querying exempt tables (e.g. `sub_profiles`, `profiles`).
2. **Responsive Mobile Offsets**: Bottom bar handles navigation. Page containers must have standard padding-bottom (`pb-20` or equivalent CSS variable value) to avoid overlapping content.
3. **No Unstyled Placeholders**: Styling must match the rich visual standards (gradients, HSL colors, smooth modal slide transitions).
4. **Data Sync safety**: Let components invoke methods on `DataService` which coordinates IndexedDB Cache update + Supabase remote calls.

---

## 📋 Copy-Paste Prompt to Continue on Another Platform

*Copy the section below and paste it into Claude, ChatGPT, or another AI model on your other platform to continue where you left off:*

```markdown
We are migrating an application called "Stillmove Planner" from custom Vanilla HTML/CSS/JS to React + Vite + TypeScript.
The project folder is ready with the configuration setup and several core views/components/services already ported.

Here is the current state of our migration:
- React contexts are set up for Auth, Profiles (sub-profiles), and Themes.
- Services are ported to TS: Supabase client with a dynamic Profile Isolation Proxy (appends profile_id to queries), CacheService (IndexedDB offline store), DataService (data CRUD), and AIService.
- AuthPage, DashboardPage, and SettingsPage are fully completed.

I want to continue the migration by porting the remaining views and components.
Please look at the existing structure under `/src` to align your code style, imports, and styling conventions:
1. Review the existing `/src/services/DataService.ts` and `/src/db/supabase.ts` files to understand how tasks, habits, and profile structures work.
2. Review `/src/App.tsx` and the current routing layout.

Please start by helping me port the "Habits View" or the "Pomodoro Timer View" from the legacy codebase (you can inspect the legacy HTML/JS files in `/js` and root `/index.html` files or ask me to paste them). Let me know what step we should address first, and outline your approach.
```
