import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/Toast/Toast';
import { AppLayout } from '@/layouts/AppLayout/AppLayout';
import { AuthPage } from '@/pages/AuthPage/AuthPage';
import { ActionPlanPage } from '@/pages/ActionPlanPage/ActionPlanPage';
import { AnnualPage } from '@/pages/AnnualPage/AnnualPage';
import { CanvasPage } from '@/pages/CanvasPage/CanvasPage';
import { DashboardPage } from '@/pages/DashboardPage/DashboardPage';
import { HabitsPage } from '@/pages/HabitsPage/HabitsPage';
import { KanbanPage } from '@/pages/KanbanPage/KanbanPage';
import { MonthlyPage } from '@/pages/MonthlyPage/MonthlyPage';
import { PomodoroPage } from '@/pages/PomodoroPage/PomodoroPage';
import { SettingsPage } from '@/pages/SettingsPage/SettingsPage';
import { WeeklyPage } from '@/pages/WeeklyPage/WeeklyPage';

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

// Public Route Wrapper (prevent authenticated users from going to login)
function PublicRoute({ children }: { children: React.JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <ToastProvider>
            <HashRouter>
              <Routes>
                {/* Public Auth Routes */}
                <Route
                  path="/auth"
                  element={
                    <PublicRoute>
                      <AuthPage />
                    </PublicRoute>
                  }
                />

                {/* Protected Layout Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="weekly" element={<WeeklyPage />} />
                  <Route path="monthly" element={<MonthlyPage />} />
                  <Route path="annual" element={<AnnualPage />} />
                  <Route path="habits" element={<HabitsPage />} />
                  <Route path="action-plan" element={<ActionPlanPage />} />
                  <Route path="kanban" element={<KanbanPage />} />
                  <Route path="canvas" element={<CanvasPage />} />
                  <Route path="pomodoro" element={<PomodoroPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </HashRouter>
          </ToastProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
