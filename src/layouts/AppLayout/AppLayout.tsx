import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/Navbar/Navbar';
import { Breadcrumb } from '@/components/Breadcrumb/Breadcrumb';
import { BottomNav } from '@/components/BottomNav/BottomNav';
import { QuickAddFAB } from '@/components/QuickAddFAB/QuickAddFAB';
import './AppLayout.css';

export function AppLayout() {
  return (
    <div id="app" role="application" aria-label="Stillmove Planner Application">
      <Navbar />
      <main className="main-content" role="main" aria-label="Main content">
        <Breadcrumb />
        <div className="view-container" role="region" aria-live="polite">
          <Outlet />
        </div>
      </main>
      <QuickAddFAB />
      <BottomNav />
    </div>
  );
}

export default AppLayout;
