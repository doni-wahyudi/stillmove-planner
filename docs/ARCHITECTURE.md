# StillMove Planner - Architecture Documentation

## Overview

StillMove Planner is a Progressive Web App (PWA) built with vanilla JavaScript, using a modular architecture with clear separation of concerns.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JavaScript (ES Modules) |
| Styling | CSS3 with Custom Properties |
| Backend | Supabase (PostgreSQL + Auth) |
| Caching | IndexedDB via Cache Service |
| PWA | Service Worker + Web App Manifest |

---

## Directory Structure

```
stillmove-planner/
├── index.html              # Main app entry point
├── auth.html               # Authentication page
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
│
├── js/                     # JavaScript modules
│   ├── app.js              # Main application controller
│   ├── config.js           # Configuration constants
│   ├── data-service.js     # Database operations
│   ├── cache-service.js    # IndexedDB caching
│   ├── auth-service.js     # Authentication
│   ├── supabase-client.js  # Supabase initialization
│   ├── error-handler.js    # Error handling
│   ├── accessibility.js    # A11y & theme management
│   ├── performance-monitor.js # Web Vitals tracking
│   └── auto-save.js        # Auto-save functionality
│
├── views/                  # View modules (HTML + JS)
│   ├── weekly-view.*       # Weekly planner
│   ├── monthly-view.*      # Monthly calendar
│   ├── annual-view.*       # Annual goals
│   ├── habits-view.*       # Habit tracker
│   ├── action-plan-view.*  # Action plans
│   ├── pomodoro-view.*     # Focus timer
│   └── settings-view.*     # Settings
│
├── components/             # Reusable UI components
│   ├── modal.js            # Modal dialogs
│   ├── toast.js            # Notifications
│   ├── spinner.js          # Loading indicators
│   ├── calendar.js         # Calendar widget
│   └── progress-bar.js     # Progress indicators
│
├── css/                    # Stylesheets
│   ├── main.css            # Base styles
│   └── theme.css           # Theme & dark mode
│
├── database/               # SQL schemas & migrations
│   ├── schema.sql          # Main schema
│   └── *.sql               # Migration files
│
├── tests/                  # Test files
│   ├── *.test.js           # Jest unit tests
│   └── test-*.html         # Browser test pages
│
└── docs/                   # Documentation
    ├── API.md              # API reference
    └── ARCHITECTURE.md     # This file
```

---

## Application Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    App (app.js)                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │StateManager │  │   Router    │  │  Services   │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│              ┌───────────────┼───────────────┐              │
│              ▼               ▼               ▼              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │  Weekly View  │ │ Monthly View  │ │  Other Views  │     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
│              │               │               │              │
│              └───────────────┼───────────────┘              │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   DataService                        │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │CacheService │  │  Supabase   │  │ErrorHandler │  │    │
│  │  │ (IndexedDB) │  │  (Backend)  │  │             │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Patterns

### 1. Module Pattern

All JavaScript files use ES Modules for clean dependency management:

```javascript
// Importing
import { APP_CONFIG } from './config.js';
import dataService from './data-service.js';

// Exporting
export default class MyService { }
export { helperFunction };
```

### 2. Singleton Services

Core services are singletons exported as default:

```javascript
// data-service.js
class DataService { }
const dataService = new DataService();
export default dataService;
```

### 3. State Management

Centralized state with subscription pattern:

```javascript
class StateManager {
    subscribe(key, callback) { }
    setState(key, value) { }
    getState(key) { }
}
```

### 4. Cache-First Strategy

Data fetching follows cache-first with background sync:

```
1. Check IndexedDB cache
2. If fresh → return cached data
3. If stale → return cached, fetch in background
4. If offline → return cached only
5. Update cache when new data arrives
```

### 5. Dynamic View Loading

Views are loaded on-demand for better performance:

```javascript
async renderWeeklyView() {
    const { default: WeeklyView } = await import('../views/weekly-view.js');
    const view = new WeeklyView(this.stateManager);
    await view.init(this.viewContainer);
}
```


---

## Data Flow

### Read Operation

```
User Action → View → DataService → CacheService (check)
                                        │
                    ┌───────────────────┴───────────────────┐
                    │ Cache Fresh?                          │
                    │                                       │
                    ▼ YES                                   ▼ NO
            Return Cached Data              Fetch from Supabase
                    │                               │
                    │                               ▼
                    │                       Update Cache
                    │                               │
                    └───────────────────────────────┘
                                    │
                                    ▼
                            Update UI
```

### Write Operation

```
User Action → View → DataService → CacheService (write)
                                        │
                                        ▼
                                Update IndexedDB
                                        │
                    ┌───────────────────┴───────────────────┐
                    │ Online?                               │
                    │                                       │
                    ▼ YES                                   ▼ NO
            Write to Supabase               Add to Pending Sync
                    │                               │
                    ▼                               │
            Update UI with                  Update UI with
            server response                 cached data
                    │                               │
                    └───────────────────────────────┘
```

---

## Offline Support

### Service Worker Strategy

| Resource Type | Strategy |
|---------------|----------|
| HTML pages | Network first, cache fallback |
| CSS/JS assets | Cache first, network update |
| API requests | Pass through (handled by DataService) |
| Static assets | Cache first |

### IndexedDB Stores

| Store | Purpose |
|-------|---------|
| `goals` | Annual goals |
| `habits` | Habit definitions |
| `habit_logs` | Habit completions |
| `time_blocks` | Schedule blocks |
| `categories` | Color categories |
| `pending_sync` | Offline operations queue |

### Sync Process

1. User makes change while offline
2. Change saved to IndexedDB
3. Operation added to `pending_sync` queue
4. When online, process queue in order
5. Remove from queue on success
6. Retry on failure

---

## Security

### Row Level Security (RLS)

All database tables use Supabase RLS:

```sql
-- Users can only access their own data
CREATE POLICY "Users can view own goals"
ON annual_goals FOR SELECT
USING (auth.uid() = user_id);
```

### Authentication Flow

```
1. User enters credentials
2. Supabase validates & returns JWT
3. JWT stored in session
4. All API calls include JWT
5. RLS policies enforce access
```

---

## Performance Optimizations

### Implemented

- **Dynamic imports** - Views loaded on demand
- **IndexedDB caching** - Reduces API calls
- **Cache TTL** - Automatic cache invalidation
- **Skeleton loaders** - Better perceived performance
- **Web Vitals tracking** - Performance monitoring

### Recommendations

- **Build step** - Minify JS/CSS for production
- **Code splitting** - Separate vendor bundles
- **Image optimization** - WebP with fallbacks
- **Preloading** - Critical resources

---

## Testing Strategy

### Unit Tests (Jest)

- Service methods (data-service, cache-service)
- Utility functions
- State management

### Integration Tests

- View rendering
- Data flow
- Offline scenarios

### Manual Testing

- Cross-browser compatibility
- Mobile responsiveness
- Accessibility (screen readers)

---

## Deployment

### GitHub Pages

1. Push to `main` branch
2. GitHub Actions builds (if configured)
3. Deployed to `username.github.io/repo-name`

### PWA Requirements

- HTTPS (provided by GitHub Pages)
- Valid manifest.json
- Service worker registered
- Responsive design

---

## Future Considerations

### Potential Improvements

1. **TypeScript** - Better type safety
2. **Build tooling** - Vite for optimization
3. **E2E tests** - Playwright/Cypress
4. **CI/CD** - Automated testing & deployment
5. **Analytics** - Usage tracking (privacy-respecting)

### Scalability

- Current architecture supports moderate growth
- Consider state management library if complexity increases
- Database indexes for large datasets
- Pagination for list views
