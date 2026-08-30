import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import './Navbar.css';

interface NavDef {
  path: string;
  labelKey: string;
  shortcut?: string;
}

const NAV_DEFS: NavDef[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', shortcut: 'D' },
  { path: '/weekly', labelKey: 'nav.weekly', shortcut: 'W' },
  { path: '/monthly', labelKey: 'nav.monthly', shortcut: 'M' },
  { path: '/annual', labelKey: 'nav.annual', shortcut: 'A' },
  { path: '/habits', labelKey: 'nav.habits', shortcut: 'H' },
  { path: '/action-plan', labelKey: 'nav.actionPlan' },
  { path: '/kanban', labelKey: 'nav.kanban', shortcut: 'K' },
  { path: '/events', labelKey: 'nav.events', shortcut: 'E' },
  { path: '/canvas', labelKey: 'nav.canvas', shortcut: 'C' },
  { path: '/pomodoro', labelKey: 'nav.pomodoro', shortcut: 'P' },
  { path: '/pantry', labelKey: 'nav.pantry', shortcut: 'F' },
];

export function Navbar() {
  const { signOut } = useAuth();
  const { profiles, activeProfile, switchProfile } = useProfile();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
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
        e: '/events',
        c: '/canvas',
        p: '/pomodoro',
        f: '/pantry',
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
        {NAV_DEFS.map((item) => {
          const label = t(item.labelKey);
          return (
            <li key={item.path} role="none">
              <NavLink
                to={item.path}
                role="menuitem"
                aria-label={`Navigate to ${label} view`}
                data-tooltip={item.shortcut ? `Press ${item.shortcut}` : undefined}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {label}
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="nav-actions">
        {/* Language Toggle Button */}
        <button
          className="nav-lang-btn"
          aria-label={t('nav.toggleLanguage')}
          title={t('nav.toggleLanguage')}
          onClick={toggleLanguage}
        >
          {language === 'en' ? '🇮🇩 ID' : '🇬🇧 EN'}
        </button>

        {/* Theme Toggle Button */}
        <button
          className="nav-icon-btn"
          aria-label={t('nav.toggleTheme')}
          title={t('nav.toggleTheme')}
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
          aria-label="Open user menu"
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
        >
          <div
            className="user-avatar"
            style={{
              borderColor: activeProfile?.color || 'var(--accent-primary)',
            }}
          >
            {activeProfile?.avatar_data ? (
              <img src={activeProfile.avatar_data} alt={activeProfile.name} />
            ) : activeProfile?.emoji ? (
              <span>{activeProfile.emoji}</span>
            ) : (
              <span>{getAvatarLetter()}</span>
            )}
          </div>
          <span className="profile-name">
            {activeProfile?.name || 'Default'}
          </span>
          <span className="dropdown-arrow">▼</span>
        </button>

        {userDropdownOpen && (
          <div className="user-dropdown-menu" role="menu">
            <div className="user-dropdown-header">
              <span className="current-profile-label">{t('nav.switchProfile')}:</span>
            </div>

            <div className="profile-switch-list">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  className={`profile-switch-item ${
                    p.id === activeProfile?.id ? 'active' : ''
                  }`}
                  role="menuitem"
                  onClick={() => {
                    switchProfile(p.id);
                    setUserDropdownOpen(false);
                  }}
                >
                  <span
                    className="profile-dot"
                    style={{ backgroundColor: p.color || '#6366f1' }}
                  ></span>
                  <span className="profile-item-name">{p.name}</span>
                  {p.id === activeProfile?.id && (
                    <span className="active-checkmark">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="user-dropdown-divider"></div>

            <NavLink
              to="/settings"
              className="user-dropdown-item"
              role="menuitem"
              onClick={() => setUserDropdownOpen(false)}
            >
              ⚙️ {t('nav.settings')}
            </NavLink>

            <button
              className="user-dropdown-item sign-out-btn"
              role="menuitem"
              onClick={handleSignOut}
            >
              🚪 {t('nav.signOut')}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
