import { Link, useLocation } from 'react-router-dom';
import './Breadcrumb.css';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  weekly: 'Weekly Planner',
  monthly: 'Monthly Planner',
  annual: 'Annual Goals',
  habits: 'Habits',
  'action-plan': 'Action Plan',
  kanban: 'Kanban',
  canvas: 'Canvas',
  pomodoro: 'Pomodoro',
  settings: 'Settings',
};

export function Breadcrumb() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  if (parts.length === 0 || parts[0] === 'dashboard') return null;

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link to="/dashboard">Dashboard</Link>
      {parts.map((part, index) => {
        const path = `/${parts.slice(0, index + 1).join('/')}`;
        const label = ROUTE_LABELS[part] || part;
        const isLast = index === parts.length - 1;

        return (
          <span className="breadcrumb__segment" key={path}>
            <span className="breadcrumb__separator">/</span>
            {isLast ? <span>{label}</span> : <Link to={path}>{label}</Link>}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumb;
