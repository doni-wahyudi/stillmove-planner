import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import './BottomNav.css';

interface NavDef {
  path: string;
  icon: string;
  labelKey: string;
}

const PRIMARY_DEFS: NavDef[] = [
  { path: '/dashboard', icon: '🏠', labelKey: 'nav.home' },
  { path: '/weekly', icon: '📅', labelKey: 'nav.weekly' },
  { path: '/habits', icon: '✨', labelKey: 'nav.habits' },
  { path: '/kanban', icon: '📌', labelKey: 'nav.kanban' },
  { path: '/pomodoro', icon: '⏱️', labelKey: 'nav.pomodoro' },
];

const ALL_DEFS: NavDef[] = [
  { path: '/dashboard', icon: '🏠', labelKey: 'nav.dashboard' },
  { path: '/weekly', icon: '📅', labelKey: 'weekly.title' },
  { path: '/monthly', icon: '📆', labelKey: 'monthly.title' },
  { path: '/habits', icon: '✨', labelKey: 'habits.title' },
  { path: '/annual', icon: '🎯', labelKey: 'annual.title' },
  { path: '/action-plan', icon: '📋', labelKey: 'nav.actionPlan' },
  { path: '/kanban', icon: '📌', labelKey: 'kanban.title' },
  { path: '/events', icon: '🎪', labelKey: 'events.suiteTitle' },
  { path: '/canvas', icon: '🎨', labelKey: 'canvas.title' },
  { path: '/pomodoro', icon: '⏱️', labelKey: 'pomodoro.title' },
  { path: '/settings', icon: '⚙️', labelKey: 'settings.title' },
];

export function BottomNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      {/* Primary Bottom Navigation Bar */}
      <nav
        className="bottom-nav"
        role="navigation"
        aria-label="Mobile navigation"
      >
        {PRIMARY_DEFS.map((item) => {
          const label = t(item.labelKey);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `bottom-nav-item ${isActive ? 'active' : ''}`
              }
              aria-label={`${label} view`}
              onClick={() => setDrawerOpen(false)}
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              <span className="bottom-nav-label">{label}</span>
            </NavLink>
          );
        })}

        {/* More Menu Drawer Trigger */}
        <button
          className={`bottom-nav-item bottom-nav-more-btn ${drawerOpen ? 'active' : ''}`}
          onClick={() => setDrawerOpen((prev) => !prev)}
          aria-label="Open all views navigation"
          aria-expanded={drawerOpen}
        >
          <span className="bottom-nav-icon">{drawerOpen ? '✕' : '⚡'}</span>
          <span className="bottom-nav-label">{t('nav.more')}</span>
        </button>
      </nav>

      {/* Slide-Up Mobile Navigation Sheet */}
      {drawerOpen && (
        <div
          className="bottom-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="bottom-drawer-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="All views navigation sheet"
          >
            <div className="drawer-header">
              <h3>🧭 All Planner Spaces</h3>
              <button
                className="drawer-close-btn"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation sheet"
              >
                ✕
              </button>
            </div>

            <div className="drawer-grid">
              {ALL_DEFS.map((item) => {
                const label = t(item.labelKey);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `drawer-grid-item ${isActive ? 'active' : ''}`
                    }
                    onClick={() => setDrawerOpen(false)}
                  >
                    <span className="drawer-item-icon">{item.icon}</span>
                    <span className="drawer-item-label">{label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
