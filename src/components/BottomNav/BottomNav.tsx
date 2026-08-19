import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

interface NavEntry {
  path: string;
  icon: string;
  label: string;
  badge?: string;
}

const PRIMARY_BOTTOM_ITEMS: NavEntry[] = [
  { path: '/dashboard', icon: '🏠', label: 'Home' },
  { path: '/weekly', icon: '📅', label: 'Weekly' },
  { path: '/habits', icon: '✨', label: 'Habits' },
  { path: '/kanban', icon: '📌', label: 'Kanban' },
  { path: '/pomodoro', icon: '⏱️', label: 'Focus' },
];

const ALL_NAV_ITEMS: NavEntry[] = [
  { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { path: '/weekly', icon: '📅', label: 'Weekly Planner' },
  { path: '/monthly', icon: '📆', label: 'Monthly Calendar' },
  { path: '/habits', icon: '✨', label: 'Habits & Challenges' },
  { path: '/annual', icon: '🎯', label: 'Annual Goals' },
  { path: '/action-plan', icon: '📋', label: 'Action Plan' },
  { path: '/kanban', icon: '📌', label: 'Kanban Workspace' },
  { path: '/canvas', icon: '🎨', label: 'Canvas Studio' },
  { path: '/pomodoro', icon: '⏱️', label: 'Pomodoro Studio' },
  { path: '/settings', icon: '⚙️', label: 'Settings & Profiles' },
];

export function BottomNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Primary Bottom Navigation Bar */}
      <nav
        className="bottom-nav"
        role="navigation"
        aria-label="Mobile navigation"
      >
        {PRIMARY_BOTTOM_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'active' : ''}`
            }
            aria-label={`${item.label} view`}
            onClick={() => setDrawerOpen(false)}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}

        {/* More Menu Drawer Trigger */}
        <button
          className={`bottom-nav-item bottom-nav-more-btn ${drawerOpen ? 'active' : ''}`}
          onClick={() => setDrawerOpen((prev) => !prev)}
          aria-label="Open all views navigation"
          aria-expanded={drawerOpen}
        >
          <span className="bottom-nav-icon">{drawerOpen ? '✕' : '⚡'}</span>
          <span className="bottom-nav-label">More</span>
        </button>
      </nav>

      {/* Slide-Up Mobile Navigation Sheet */}
      {drawerOpen && (
        <div
          className="bottom-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="All views menu"
        >
          <div
            className="bottom-drawer-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bottom-drawer-handle" />
            <div className="bottom-drawer-header">
              <h3>All Views</h3>
              <button
                className="bottom-drawer-close"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="bottom-drawer-grid">
              {ALL_NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `bottom-drawer-item ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setDrawerOpen(false)}
                >
                  <span className="drawer-item-icon">{item.icon}</span>
                  <span className="drawer-item-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BottomNav;
