import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/db/supabase';
import { useProfile } from '@/contexts/ProfileContext';
import './DashboardPage.css';

interface DashboardStats {
  habitsCompleted: number;
  habitsTotal: number;
  tasksToday: number;
  goalsCount: number;
  streak: number;
}

export function DashboardPage() {
  const { activeProfile } = useProfile();
  const [stats, setStats] = useState<DashboardStats>({
    habitsCompleted: 0,
    habitsTotal: 0,
    tasksToday: 0,
    goalsCount: 0,
    streak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!activeProfile) return;

      setIsLoading(true);
      try {
        const supabase = getSupabaseClient();
        const today = new Date().toISOString().split('T')[0];

        // Fetch daily habits
        const { data: habits } = await supabase
          .from('daily_habits')
          .select('id')
          .eq('is_active', true);

        // Fetch today's completions
        const { data: completions } = await supabase
          .from('daily_habit_completions')
          .select('id')
          .eq('date', today);

        // Fetch annual goals
        const { data: goals } = await supabase
          .from('annual_goals')
          .select('id')
          .eq('year', new Date().getFullYear());

        setStats({
          habitsCompleted: completions?.length || 0,
          habitsTotal: habits?.length || 0,
          tasksToday: 0,
          goalsCount: goals?.length || 0,
          streak: 0,
        });
      } catch (error) {
        console.error('Dashboard load error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [activeProfile]);

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? 'Good morning'
      : now.getHours() < 18
      ? 'Good afternoon'
      : 'Good evening';

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const habitPercentage =
    stats.habitsTotal > 0
      ? Math.round((stats.habitsCompleted / stats.habitsTotal) * 100)
      : 0;

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-view">
      <div className="dashboard-header">
        <div className="greeting-section">
          <h2 className="greeting">
            {greeting}, {activeProfile?.name || 'there'} 👋
          </h2>
          <p className="date-display">{dateStr}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--habits">
          <div className="stat-icon">✨</div>
          <div className="stat-info">
            <div className="stat-value">
              {stats.habitsCompleted}/{stats.habitsTotal}
            </div>
            <div className="stat-label">Habits Today</div>
          </div>
          <div className="stat-progress">
            <div
              className="stat-progress-bar"
              style={{ width: `${habitPercentage}%` }}
            />
          </div>
        </div>

        <div className="stat-card stat-card--goals">
          <div className="stat-icon">🎯</div>
          <div className="stat-info">
            <div className="stat-value">{stats.goalsCount}</div>
            <div className="stat-label">Annual Goals</div>
          </div>
        </div>

        <div className="stat-card stat-card--streak">
          <div className="stat-icon">🔥</div>
          <div className="stat-info">
            <div className="stat-value">{stats.streak}</div>
            <div className="stat-label">Day Streak</div>
          </div>
        </div>

        <div className="stat-card stat-card--tasks">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <div className="stat-value">{stats.tasksToday}</div>
            <div className="stat-label">Tasks Today</div>
          </div>
        </div>
      </div>

      <div className="dashboard-message">
        <p>
          🚀 Welcome to the revamped Stillmove Planner! More views are being
          migrated — stay tuned.
        </p>
      </div>
    </div>
  );
}

export default DashboardPage;
