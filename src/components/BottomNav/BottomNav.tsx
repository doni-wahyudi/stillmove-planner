import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const BOTTOM_NAV_ITEMS = [
  { path: '/dashboard', icon: '🏠', label: 'Home' },
  { path: '/weekly', icon: '📅', label: 'Weekly' },
  { path: '/monthly', icon: '📆', label: 'Monthly' },
  { path: '/habits', icon: '✨', label: 'Habits' },
  { path: '/annual', icon: '🎯', label: 'Annual' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
];

export function BottomNav() {
  return (
    <nav
      className="bottom-nav"
      role="navigation"
      aria-label="Mobile navigation"
    >
      {BOTTOM_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'active' : ''}`
          }
          aria-label={`${item.label} view`}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;
