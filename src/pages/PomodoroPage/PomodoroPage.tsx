import { useCallback, useEffect, useMemo, useState } from 'react';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/Toast/Toast';
import { usePomodoro, TimerMode } from '@/contexts/PomodoroContext';
import './PomodoroPage.css';

type TaskSource = 'custom' | 'goal' | 'timeblock';

interface PomodoroSession {
  id: string;
  date: string;
  started_at: string;
  completed_at?: string | null;
  duration_minutes: number;
  session_type: TimerMode;
  was_completed: boolean;
  linked_goal_id?: string | null;
  linked_time_block_id?: string | null;
  task_description?: string | null;
}

interface AnnualGoal {
  id: string;
  title?: string;
  goal_text?: string;
}

interface TimeBlock {
  id: string;
  start_time?: string;
  end_time?: string;
  activity?: string;
  title?: string;
}

const BREAK_SUGGESTIONS: Record<Exclude<TimerMode, 'focus'>, string[]> = {
  shortBreak: [
    'Look away from the screen and soften your eyes.',
    'Drink water and reset your posture.',
    'Stretch your wrists, shoulders, and neck.',
    'Take five slow breaths before returning.',
  ],
  longBreak: [
    'Take a short walk and get away from the desk.',
    'Eat a light snack or make tea.',
    'Step outside for fresh air.',
    'Do a short reset before the next focus block.',
  ],
};

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function modeLabel(mode: TimerMode): string {
  if (mode === 'shortBreak') return 'Short Break';
  if (mode === 'longBreak') return 'Long Break';
  return 'Focus';
}

export function PomodoroPage() {
  const { activeProfile } = useProfile();
  const { t } = useLanguage();
  const { showToast } = useToast();

  // Consume global timer state and actions
  const {
    mode,
    timeRemaining,
    isRunning,
    isPaused,
    sessionCount,
    currentTask,
    linkedGoalId,
    linkedTimeBlockId,
    settings,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipPhase,
    setMode,
    setTask,
    updateSettings,
  } = usePomodoro();

  const [taskSource, setTaskSource] = useState<TaskSource>('custom');
  const [linkedItem, setLinkedItem] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings form local state
  const [formFocusDur, setFormFocusDur] = useState(settings.focusDuration);
  const [formShortBreak, setFormShortBreak] = useState(settings.shortBreakDuration);
  const [formLongBreak, setFormLongBreak] = useState(settings.longBreakDuration);
  const [formIntervals, setFormIntervals] = useState(settings.sessionsBeforeLongBreak);
  const [formSound, setFormSound] = useState(settings.soundEnabled);
  const [formAutoBreak, setFormAutoBreak] = useState(settings.autoStartBreaks);
  const [formAutoFocus, setFormAutoFocus] = useState(settings.autoStartFocus);

  // Analytics & targets state
  const [todaySessions, setTodaySessions] = useState<PomodoroSession[]>([]);
  const [weekSessions, setWeekSessions] = useState<PomodoroSession[]>([]);
  const [goals, setGoals] = useState<AnnualGoal[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = toDateKey(new Date());
  const weekStartDate = getWeekStart(new Date());
  const weekStart = toDateKey(weekStartDate);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEnd = toDateKey(weekEndDate);

  const completedToday = useMemo(
    () => todaySessions.filter((s) => s.session_type === 'focus' && s.was_completed),
    [todaySessions]
  );

  const completedThisWeek = useMemo(
    () => weekSessions.filter((s) => s.session_type === 'focus' && s.was_completed),
    [weekSessions]
  );

  const weeklyBars = useMemo(() => {
    const counts = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStartDate);
      date.setDate(weekStartDate.getDate() + index);
      const dateKey = toDateKey(date);
      return {
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: dateKey,
        count: completedThisWeek.filter((session) => session.date === dateKey).length,
      };
    });
    const max = Math.max(1, ...counts.map((item) => item.count));
    return counts.map((item) => ({
      ...item,
      percent: Math.max(8, (item.count / max) * 100),
    }));
  }, [completedThisWeek, weekStartDate]);

  const totalFocusMinutes = useMemo(
    () =>
      completedThisWeek.reduce(
        (sum, session) => sum + (session.duration_minutes || settings.focusDuration),
        0
      ),
    [completedThisWeek, settings.focusDuration]
  );

  const dayStreak = useMemo(() => {
    const completedDates = new Set(completedThisWeek.map((session) => session.date));
    let streak = 0;
    const cursor = new Date();
    for (let index = 0; index < 14; index += 1) {
      if (!completedDates.has(toDateKey(cursor))) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [completedThisWeek]);

  const totalModeDuration = useMemo(() => {
    if (mode === 'shortBreak') return settings.shortBreakDuration * 60;
    if (mode === 'longBreak') return settings.longBreakDuration * 60;
    return settings.focusDuration * 60;
  }, [mode, settings]);

  const progress = useMemo(() => {
    return totalModeDuration > 0 ? (totalModeDuration - timeRemaining) / totalModeDuration : 0;
  }, [timeRemaining, totalModeDuration]);

  const breakSuggestion = useMemo(() => {
    if (mode === 'focus') return '';
    const suggestions = BREAK_SUGGESTIONS[mode];
    const index = sessionCount % suggestions.length;
    return suggestions[index];
  }, [mode, sessionCount]);

  const linkedGoalStats = useMemo(() => {
    return goals
      .map((goal) => {
        const sessions = completedThisWeek.filter((session) => session.linked_goal_id === goal.id);
        return {
          goal,
          sessions: sessions.length,
          minutes: sessions.reduce(
            (sum, session) => sum + (session.duration_minutes || settings.focusDuration),
            0
          ),
        };
      })
      .filter((item) => item.sessions > 0);
  }, [completedThisWeek, goals, settings.focusDuration]);

  const loadData = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const [nextToday, nextWeek, nextGoals, nextBlocks] = await Promise.all([
        dataService.getPomodoroSessions(today),
        dataService.getPomodoroSessionsRange(weekStart, weekEnd),
        dataService.getAnnualGoals(new Date().getFullYear()),
        dataService.getTimeBlocks(today),
      ]);
      setTodaySessions(nextToday || []);
      setWeekSessions(nextWeek || []);
      setGoals(nextGoals || []);
      setTimeBlocks(nextBlocks || []);
    } catch (error) {
      console.error('Failed to load pomodoro data:', error);
      showToast('Failed to load Pomodoro data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, showToast, today, weekEnd, weekStart]);

  useEffect(() => {
    loadData();
  }, [loadData, isRunning]);

  const handleToggleTimer = () => {
    if (isRunning && !isPaused) {
      pauseTimer();
    } else if (isPaused) {
      resumeTimer();
    } else {
      startTimer();
    }
  };

  const handleTaskSourceChange = (src: TaskSource) => {
    setTaskSource(src);
    setLinkedItem('');
    setTask(currentTask, null, null);
  };

  const handleLinkedItemChange = (val: string) => {
    setLinkedItem(val);
    if (!val) {
      setTask(currentTask, null, null);
      return;
    }
    if (taskSource === 'goal') {
      const goal = goals.find((g) => g.id === val);
      setTask(goal?.title || goal?.goal_text || currentTask, val, null);
    } else {
      const block = timeBlocks.find((b) => b.id === val);
      setTask(block?.activity || block?.title || currentTask, null, val);
    }
  };

  const handleSaveSettings = () => {
    updateSettings({
      focusDuration: clamp(Number(formFocusDur), 1, 90),
      shortBreakDuration: clamp(Number(formShortBreak), 1, 30),
      longBreakDuration: clamp(Number(formLongBreak), 1, 60),
      sessionsBeforeLongBreak: clamp(Number(formIntervals), 1, 12),
      soundEnabled: formSound,
      autoStartBreaks: formAutoBreak,
      autoStartFocus: formAutoFocus,
    });
    setShowSettingsModal(false);
  };

  const circumference = 2 * Math.PI * 90;
  const strokeOffset = circumference * (1 - progress);

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading Pomodoro Studio...</p>
      </div>
    );
  }

  return (
    <div className="pomodoro-page">
      {/* Page Header */}
      <header className="pomodoro-header">
        <div>
          <h2>{t('pomodoro.title')}</h2>
          <p>{t('pomodoro.subtitle')}</p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => {
            setFormFocusDur(settings.focusDuration);
            setFormShortBreak(settings.shortBreakDuration);
            setFormLongBreak(settings.longBreakDuration);
            setFormIntervals(settings.sessionsBeforeLongBreak);
            setFormSound(settings.soundEnabled);
            setFormAutoBreak(settings.autoStartBreaks);
            setFormAutoFocus(settings.autoStartFocus);
            setShowSettingsModal(true);
          }}
        >
          ⚙️ {t('pomodoro.settings')}
        </button>
      </header>

      {/* Main Layout Grid */}
      <div className="pomodoro-layout-react">
        {/* Left / Secondary Analytics & History Sidebar */}
        <aside className="pomodoro-side">
          {/* Weekly Bar Chart */}
          <section className="pomodoro-card">
            <div className="pomodoro-card-heading">
              <h3>Weekly Progress</h3>
              <span>{weekStart} to {weekEnd}</span>
            </div>
            <div className="pomodoro-week-chart" role="img" aria-label="Weekly focus sessions">
              {weeklyBars.map((bar) => (
                <div className="pomodoro-week-bar" key={bar.date}>
                  <div className="pomodoro-week-track">
                    <span style={{ height: `${bar.percent}%` }} />
                  </div>
                  <strong>{bar.count}</strong>
                  <small>{bar.label}</small>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Sessions History */}
          <section className="pomodoro-card">
            <div className="pomodoro-card-heading">
              <h3>Recent Sessions</h3>
              <span>This Week</span>
            </div>
            <div className="pomodoro-recent-list">
              {completedThisWeek.length === 0 ? (
                <p className="pomodoro-empty">No completed sessions yet this week.</p>
              ) : (
                completedThisWeek
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((session) => (
                    <div className="pomodoro-recent-item" key={session.id}>
                      <span>{session.date}</span>
                      <strong>{session.duration_minutes} min</strong>
                      <small>{session.task_description || 'Focus block'}</small>
                    </div>
                  ))
              )}
            </div>
          </section>

          {/* Goal Focus Time Progress */}
          <section className="pomodoro-card">
            <div className="pomodoro-card-heading">
              <h3>Goal Focus Time</h3>
              <span>{linkedGoalStats.length} linked</span>
            </div>
            <div className="pomodoro-goal-list">
              {linkedGoalStats.length === 0 ? (
                <p className="pomodoro-empty">Link focus sessions to goals to track target effort.</p>
              ) : (
                linkedGoalStats.map((item) => (
                  <div className="pomodoro-goal-item" key={item.goal.id}>
                    <span>{item.goal.title || item.goal.goal_text || 'Untitled Goal'}</span>
                    <strong>{item.sessions} sessions</strong>
                    <small>{Math.round((item.minutes / 60) * 10) / 10}h</small>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        {/* Right / Primary Timer and Controls Section */}
        <main className="pomodoro-main">
          {/* Top Metric Cards */}
          <section className="pomodoro-stats-grid" aria-label="Pomodoro statistics">
            <div>
              <strong>{completedToday.length}</strong>
              <span>Today</span>
            </div>
            <div>
              <strong>{completedThisWeek.length}</strong>
              <span>This Week</span>
            </div>
            <div>
              <strong>{Math.round((totalFocusMinutes / 60) * 10) / 10}h</strong>
              <span>Focus Time</span>
            </div>
            <div>
              <strong>{dayStreak}</strong>
              <span>Day Streak</span>
            </div>
          </section>

          {/* Central Timer Card */}
          <section className="pomodoro-timer-card">
            {/* Mode Switcher Tabs */}
            <div className="pomodoro-mode-switch">
              {(['focus', 'shortBreak', 'longBreak'] as const).map((item) => (
                <button
                  key={item}
                  className={`pomodoro-mode-btn ${mode === item ? 'active' : ''}`}
                  onClick={() => setMode(item)}
                >
                  {modeLabel(item)}
                </button>
              ))}
            </div>

            {/* Circular Progress Ring */}
            <div className={`timer-circle-react timer-circle-react--${mode}`}>
              <svg viewBox="0 0 200 200" aria-hidden="true">
                <circle className="timer-ring-bg" cx="100" cy="100" r="90" />
                <circle
                  className="timer-ring-progress"
                  cx="100"
                  cy="100"
                  r="90"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                />
              </svg>
              <div className="timer-face">
                <span>{modeLabel(mode)}</span>
                <h2>{formatTime(timeRemaining)}</h2>
                <small>Session {sessionCount + 1} of {settings.sessionsBeforeLongBreak}</small>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pomodoro-timer-controls">
              <button
                className={`btn-primary pomodoro-btn-primary ${isRunning && !isPaused ? 'running' : ''}`}
                onClick={handleToggleTimer}
              >
                {isRunning && !isPaused ? '⏸ Pause' : isPaused ? '▶ Resume' : '▶ Start Focus'}
              </button>
              <button className="btn-secondary" onClick={skipPhase} title="Skip to next phase">
                ⏭ Skip
              </button>
              <button className="btn-secondary" onClick={resetTimer} title="Reset timer">
                ↺ Reset
              </button>
            </div>

            {/* Break Suggestion Banner */}
            {breakSuggestion && (
              <div className="pomodoro-break-banner">
                <span>💡 {breakSuggestion}</span>
              </div>
            )}

            {/* Task Link & Details Form */}
            <div className="pomodoro-task-section">
              <div className="pomodoro-source-toggle">
                <button
                  className={taskSource === 'custom' ? 'active' : ''}
                  onClick={() => handleTaskSourceChange('custom')}
                >
                  Custom Task
                </button>
                <button
                  className={taskSource === 'goal' ? 'active' : ''}
                  onClick={() => handleTaskSourceChange('goal')}
                >
                  Annual Goal
                </button>
                <button
                  className={taskSource === 'timeblock' ? 'active' : ''}
                  onClick={() => handleTaskSourceChange('timeblock')}
                >
                  Today's Time Block
                </button>
              </div>

              {taskSource === 'custom' ? (
                <input
                  type="text"
                  value={currentTask}
                  onChange={(e) => setTask(e.target.value, null, null)}
                  placeholder="What are you working on in this focus block?"
                />
              ) : taskSource === 'goal' ? (
                <select
                  value={linkedGoalId || linkedItem}
                  onChange={(e) => handleLinkedItemChange(e.target.value)}
                >
                  <option value="">Select an annual goal...</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      🎯 {goal.title || goal.goal_text || 'Goal'}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={linkedTimeBlockId || linkedItem}
                  onChange={(e) => handleLinkedItemChange(e.target.value)}
                >
                  <option value="">Select a time block today...</option>
                  {timeBlocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      🕒 {block.start_time} - {block.end_time}: {block.activity || block.title || 'Block'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="planner-modal-backdrop" onMouseDown={() => setShowSettingsModal(false)}>
          <div
            className="planner-modal pomodoro-settings-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="planner-card-header">
              <h3>Pomodoro Settings</h3>
              <button className="planner-danger" onClick={() => setShowSettingsModal(false)}>
                ×
              </button>
            </div>

            <div className="planner-form">
              <div className="planner-form-row">
                <label>
                  Focus Duration (minutes)
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={formFocusDur}
                    onChange={(e) => setFormFocusDur(Number(e.target.value))}
                  />
                </label>
                <label>
                  Short Break (minutes)
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formShortBreak}
                    onChange={(e) => setFormShortBreak(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="planner-form-row">
                <label>
                  Long Break (minutes)
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={formLongBreak}
                    onChange={(e) => setFormLongBreak(Number(e.target.value))}
                  />
                </label>
                <label>
                  Sessions Before Long Break
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={formIntervals}
                    onChange={(e) => setFormIntervals(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="pomodoro-toggle-options">
                <label className="pomodoro-checkbox-row">
                  <input
                    type="checkbox"
                    checked={formSound}
                    onChange={(e) => setFormSound(e.target.checked)}
                  />
                  <span>Play audio chime on completion</span>
                </label>

                <label className="pomodoro-checkbox-row">
                  <input
                    type="checkbox"
                    checked={formAutoBreak}
                    onChange={(e) => setFormAutoBreak(e.target.checked)}
                  />
                  <span>Auto-start breaks after focus</span>
                </label>

                <label className="pomodoro-checkbox-row">
                  <input
                    type="checkbox"
                    checked={formAutoFocus}
                    onChange={(e) => setFormAutoFocus(e.target.checked)}
                  />
                  <span>Auto-start focus after breaks</span>
                </label>
              </div>

              <div className="planner-actions">
                <button className="btn-primary" onClick={handleSaveSettings}>
                  Save Settings
                </button>
                <button className="btn-secondary" onClick={() => setShowSettingsModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PomodoroPage;
