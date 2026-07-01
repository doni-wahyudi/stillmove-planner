import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useTheme } from '@/contexts/ThemeContext';
import './Navbar.css';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', shortcut: 'D' },
  { path: '/weekly', label: 'Weekly', shortcut: 'W' },
  { path: '/monthly', label: 'Monthly', shortcut: 'M' },
  { path: '/annual', label: 'Annual', shortcut: 'A' },
  { path: '/habits', label: 'Habits', shortcut: 'H' },
  { path: '/action-plan', label: 'Action Plan' },
  { path: '/kanban', label: 'Kanban', shortcut: 'K' },
  { path: '/canvas', label: 'Canvas', shortcut: 'C' },
  { path: '/pomodoro', label: 'Pomodoro', shortcut: 'P' },
];

export function Navbar() {
  const { signOut } = useAuth();
  const { profiles, activeProfile, switchProfile } = useProfile();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const shortcutMap: Record<string, string> = {
        d: '/dashboard',
        w: '/weekly',
        m: '/monthly',
        a: '/annual',
        h: '/habits',
        k: '/kanban',
        c: '/canvas',
        p: '/pomodoro',
      };

      const path = shortcutMap[e.key.toLowerCase()];
      if (path && !e.ctrlKey && !e.altKey && !e.metaKey) {
        navigate(path);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getAvatarLetter = () => {
    if (activeProfile?.name) return activeProfile.name[0].toUpperCase();
    return '👤';
  };

  return (
    <nav className="main-nav" role="navigation" aria-label="Main navigation">
      <div className="nav-brand">
        <h1>Stillmove Planner</h1>
      </div>

      <button
        className={`mobile-menu-toggle ${menuOpen ? 'active' : ''}`}
        aria-label="Toggle menu"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <ul
        className={`nav-menu ${menuOpen ? 'open' : ''}`}
        role="menubar"
        aria-label="Main menu"
      >
        {NAV_ITEMS.map((item) => (
          <li key={item.path} role="none">
            <NavLink
              to={item.path}
              role="menuitem"
              aria-label={`Navigate to ${item.label} view`}
              data-tooltip={item.shortcut ? `Press ${item.shortcut}` : undefined}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="nav-actions">
        <button
          className="nav-icon-btn"
          aria-label="Toggle dark/light mode"
          title="Toggle Theme"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="user-menu" ref={dropdownRef}>
        <button
          className="user-menu-btn"
          aria-haspopup="true"
          aria-expanded={userDropdownOpen}
          aria-label="User menu"
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
        >
          <span
            className="user-profile-avatar"
            style={{
              background: activeProfile?.color || '#6366f1',
            }}
          >
            {activeProfile?.avatar_data ? (
              <img
                src={activeProfile.avatar_data}
                alt={activeProfile.name}
                className="avatar-img"
              />
            ) : (
              getAvatarLetter()
            )}
          </span>
          <span className="user-profile-name">
            {activeProfile?.name || 'Loading...'}
          </span>
        </button>

        {userDropdownOpen && (
          <div className="user-dropdown" role="menu" aria-label="User options">
            <div className="profile-switcher-list">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  className={`profile-switch-btn ${
                    profile.id === activeProfile?.id ? 'active' : ''
                  }`}
                  role="menuitem"
                  onClick={() => {
                    switchProfile(profile.id);
                    setUserDropdownOpen(false);
                  }}
                >
                  <span
                    className="profile-dot"
                    style={{ background: profile.color }}
                  />
                  {profile.name}
                  {profile.id === activeProfile?.id && (
                    <span className="profile-check">✓</span>
                  )}
                </button>
              ))}
            </div>
            <div className="dropdown-divider" />
            <NavLink
              to="/settings"
              role="menuitem"
              aria-label="Open settings"
              onClick={() => setUserDropdownOpen(false)}
            >
              Manage Profiles
            </NavLink>
            <button
              role="menuitem"
              aria-label="Sign out of application"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
