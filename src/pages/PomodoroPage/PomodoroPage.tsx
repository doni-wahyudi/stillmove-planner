import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/Toast/Toast';
import './PomodoroPage.css';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';
type TaskSource = 'custom' | 'goal' | 'timeblock';

interface PomodoroSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
}

interface TimerState {
  mode: TimerMode;
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  sessionCount: number;
  currentTask: string;
  linkedGoalId: string | null;
  linkedTimeBlockId: string | null;
}

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

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
};

const SETTINGS_KEY = 'stillmove_pomodoro_settings';
const STATE_KEY = 'stillmove_pomodoro_state';

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

function loadSettings(): PomodoroSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getModeDuration(mode: TimerMode, settings: PomodoroSettings): number {
  if (mode === 'shortBreak') return settings.shortBreakDuration * 60;
  if (mode === 'longBreak') return settings.longBreakDuration * 60;
  return settings.focusDuration * 60;
}

function createInitialTimerState(settings: PomodoroSettings): TimerState {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (!saved) {
      return {
        mode: 'focus',
        timeRemaining: settings.focusDuration * 60,
        isRunning: false,
        isPaused: false,
        sessionCount: 0,
        currentTask: '',
        linkedGoalId: null,
        linkedTimeBlockId: null,
      };
    }

    const parsed = JSON.parse(saved);
    const mode = (parsed.mode || 'focus') as TimerMode;
    let timeRemaining = Number(parsed.timeRemaining) || getModeDuration(mode, settings);

    if (parsed.isRunning && !parsed.isPaused && parsed.startedAt) {
      const elapsed = Math.floor((Date.now() - Number(parsed.startedAt)) / 1000);
      timeRemaining = Math.max(0, timeRemaining - elapsed);
    }

    return {
      mode,
      timeRemaining: timeRemaining || getModeDuration(mode, settings),
      isRunning: Boolean(parsed.isRunning && timeRemaining > 0),
      isPaused: Boolean(parsed.isPaused),
      sessionCount: Number(parsed.sessionCount) || 0,
      currentTask: parsed.currentTask || '',
      linkedGoalId: parsed.linkedGoalId || null,
      linkedTimeBlockId: parsed.linkedTimeBlockId || null,
    };
  } catch {
    return {
      mode: 'focus',
      timeRemaining: settings.focusDuration * 60,
      isRunning: false,
      isPaused: false,
      sessionCount: 0,
      currentTask: '',
      linkedGoalId: null,
      linkedTimeBlockId: null,
    };
  }
}

export function PomodoroPage() {
  const { activeProfile } = useProfile();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<PomodoroSettings>(() => loadSettings());
  const [timerState, setTimerState] = useState<TimerState>(() =>
    createInitialTimerState(loadSettings())
  );
  const [taskSource, setTaskSource] = useState<TaskSource>('custom');
  const [linkedItem, setLinkedItem] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [todaySessions, setTodaySessions] = useState<PomodoroSession[]>([]);
  const [weekSessions, setWeekSessions] = useState<PomodoroSession[]>([]);
  const [goals, setGoals] = useState<AnnualGoal[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const intervalRef = useRef<number | null>(null);
  const runStartedAtRef = useRef<number | null>(null);
  const runStartRemainingRef = useRef<number | null>(null);
  const timerStateRef = useRef(timerState);
  const currentSessionIdRef = useRef(currentSessionId);

  const today = toDateKey(new Date());
  const weekStartDate = getWeekStart(new Date());
  const weekStart = toDateKey(weekStartDate);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEnd = toDateKey(weekEndDate);

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const completedToday = useMemo(
    () =>
      todaySessions.filter(
        (session) => session.session_type === 'focus' && session.was_completed
      ),
    [todaySessions]
  );

  const completedThisWeek = useMemo(
    () =>
      weekSessions.filter(
        (session) => session.session_type === 'focus' && session.was_completed
      ),
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

  const progress = useMemo(() => {
    const duration = getModeDuration(timerState.mode, settings);
    return duration > 0 ? (duration - timerState.timeRemaining) / duration : 0;
  }, [settings, timerState.mode, timerState.timeRemaining]);

  const breakSuggestion = useMemo(() => {
    if (timerState.mode === 'focus') return '';
    const suggestions = BREAK_SUGGESTIONS[timerState.mode];
    const index = timerState.sessionCount % suggestions.length;
    return suggestions[index];
  }, [timerState.mode, timerState.sessionCount]);

  const linkedGoalStats = useMemo(() => {
    return goals
      .map((goal) => {
        const sessions = completedThisWeek.filter(
          (session) => session.linked_goal_id === goal.id
        );
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
      setTodaySessions(nextToday);
      setWeekSessions(nextWeek);
      setGoals(nextGoals);
      setTimeBlocks(nextBlocks);
    } catch (error) {
      console.error('Failed to load pomodoro data:', error);
      showToast('Failed to load Pomodoro data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, showToast, today, weekEnd, weekStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const persistTimerState = useCallback((state: TimerState) => {
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        ...state,
        startedAt: runStartedAtRef.current,
      })
    );
  }, []);

  useEffect(() => {
    persistTimerState(timerState);
  }, [persistTimerState, timerState]);

  const playBell = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.45);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.45);
    } catch (error) {
      console.warn('Audio unavailable:', error);
    }
  }, []);

  const completeCurrentMode = useCallback(async () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const state = timerStateRef.current;
    playBell();

    if (state.mode === 'focus') {
      const nextSessionCount = state.sessionCount + 1;
      const existingSessionId = currentSessionIdRef.current;

      if (existingSessionId) {
        try {
          await dataService.updatePomodoroSession(existingSessionId, {
            completed_at: new Date().toISOString(),
            was_completed: true,
          });
        } catch (error) {
          console.warn('Failed to complete Pomodoro session:', error);
        }
        setCurrentSessionId(null);
      }

      const nextMode: TimerMode =
        nextSessionCount % settings.sessionsBeforeLongBreak === 0
          ? 'longBreak'
          : 'shortBreak';
      const nextDuration = getModeDuration(nextMode, settings);
      runStartedAtRef.current = Date.now();
      runStartRemainingRef.current = nextDuration;

      setTimerState((prev) => ({
        ...prev,
        mode: nextMode,
        timeRemaining: nextDuration,
        isRunning: true,
        isPaused: false,
        sessionCount: nextSessionCount,
      }));
      showToast('Focus session completed', 'success');
      loadData();
      return;
    }

    runStartedAtRef.current = null;
    runStartRemainingRef.current = null;
    setTimerState((prev) => ({
      ...prev,
      mode: 'focus',
      timeRemaining: settings.focusDuration * 60,
      isRunning: false,
      isPaused: false,
    }));
    showToast('Break completed', 'success');
  }, [loadData, playBell, settings, showToast]);

  useEffect(() => {
    if (!timerState.isRunning || timerState.isPaused) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!runStartedAtRef.current) {
      runStartedAtRef.current = Date.now();
      runStartRemainingRef.current = timerState.timeRemaining;
    }

    intervalRef.current = window.setInterval(() => {
      if (!runStartedAtRef.current || runStartRemainingRef.current === null) return;

      const elapsed = Math.floor((Date.now() - runStartedAtRef.current) / 1000);
      const nextTime = Math.max(0, runStartRemainingRef.current - elapsed);
      setTimerState((prev) => ({ ...prev, timeRemaining: nextTime }));

      if (nextTime <= 0) {
        completeCurrentMode();
      }
    }, 500);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    completeCurrentMode,
    timerState.isPaused,
    timerState.isRunning,
    timerState.timeRemaining,
  ]);

  const startTimer = async () => {
    if (timerState.mode === 'focus' && !currentSessionId) {
      try {
        const session = await dataService.createPomodoroSession({
          date: today,
          started_at: new Date().toISOString(),
          duration_minutes: settings.focusDuration,
          session_type: 'focus',
          was_completed: false,
          task_description: timerState.currentTask || null,
          linked_goal_id: timerState.linkedGoalId,
          linked_time_block_id: timerState.linkedTimeBlockId,
        });
        setCurrentSessionId(session?.id || null);
      } catch (error) {
        console.warn('Failed to create Pomodoro session:', error);
        showToast('Timer started without cloud session', 'warning');
      }
    }

    runStartedAtRef.current = Date.now();
    runStartRemainingRef.current = timerState.timeRemaining;
    setTimerState((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
    }));
  };

  const pauseTimer = () => {
    setTimerState((prev) => ({ ...prev, isPaused: true }));
    runStartedAtRef.current = null;
    runStartRemainingRef.current = null;
  };

  const toggleTimer = () => {
    if (!timerState.isRunning) {
      startTimer();
      return;
    }
    if (timerState.isPaused) {
      runStartedAtRef.current = Date.now();
      runStartRemainingRef.current = timerState.timeRemaining;
      setTimerState((prev) => ({ ...prev, isPaused: false }));
      return;
    }
    pauseTimer();
  };

  const resetTimer = async () => {
    if (currentSessionId) {
      try {
        await dataService.deletePomodoroSession(currentSessionId);
      } catch (error) {
        console.warn('Failed to delete incomplete Pomodoro session:', error);
      }
    }

    setCurrentSessionId(null);
    runStartedAtRef.current = null;
    runStartRemainingRef.current = null;
    setTimerState((prev) => ({
      ...prev,
      mode: 'focus',
      timeRemaining: settings.focusDuration * 60,
      isRunning: false,
      isPaused: false,
    }));
  };

  const skipPhase = async () => {
    if (timerState.mode === 'focus' && currentSessionId) {
      try {
        await dataService.deletePomodoroSession(currentSessionId);
      } catch (error) {
        console.warn('Failed to delete skipped Pomodoro session:', error);
      }
      setCurrentSessionId(null);
    }

    const nextMode: TimerMode = timerState.mode === 'focus' ? 'shortBreak' : 'focus';
    const nextDuration = getModeDuration(nextMode, settings);
    runStartedAtRef.current = null;
    runStartRemainingRef.current = null;
    setTimerState((prev) => ({
      ...prev,
      mode: nextMode,
      timeRemaining: nextDuration,
      isRunning: false,
      isPaused: false,
    }));
    showToast('Skipped to next phase', 'info');
  };

  const saveSettings = () => {
    const nextSettings = {
      focusDuration: clamp(settings.focusDuration, 1, 60),
      shortBreakDuration: clamp(settings.shortBreakDuration, 1, 30),
      longBreakDuration: clamp(settings.longBreakDuration, 1, 60),
      sessionsBeforeLongBreak: clamp(settings.sessionsBeforeLongBreak, 2, 10),
    };
    setSettings(nextSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));

    if (!timerState.isRunning) {
      setTimerState((prev) => ({
        ...prev,
        timeRemaining: getModeDuration(prev.mode, nextSettings),
      }));
    }

    setShowSettings(false);
    showToast('Timer settings saved', 'success');
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    if (!timerState.isRunning) {
      setTimerState((prev) => ({
        ...prev,
        mode: 'focus',
        timeRemaining: DEFAULT_SETTINGS.focusDuration * 60,
      }));
    }
  };

  const updateTaskSource = (nextSource: TaskSource) => {
    setTaskSource(nextSource);
    setLinkedItem('');
    setTimerState((prev) => ({
      ...prev,
      linkedGoalId: null,
      linkedTimeBlockId: null,
    }));
  };

  const updateLinkedItem = (value: string) => {
    setLinkedItem(value);
    if (!value) {
      setTimerState((prev) => ({
        ...prev,
        linkedGoalId: null,
        linkedTimeBlockId: null,
      }));
      return;
    }

    if (taskSource === 'goal') {
      const goal = goals.find((item) => item.id === value);
      setTimerState((prev) => ({
        ...prev,
        currentTask: goal?.title || goal?.goal_text || prev.currentTask,
        linkedGoalId: value,
        linkedTimeBlockId: null,
      }));
      return;
    }

    const block = timeBlocks.find((item) => item.id === value);
    setTimerState((prev) => ({
      ...prev,
      currentTask: block?.activity || block?.title || prev.currentTask,
      linkedTimeBlockId: value,
      linkedGoalId: null,
    }));
  };

  const clearStoredState = () => {
    localStorage.removeItem(STATE_KEY);
    resetTimer();
  };

  const circumference = 2 * Math.PI * 90;
  const strokeOffset = circumference * (1 - progress);

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading Pomodoro...</p>
      </div>
    );
  }

  return (
    <div className="pomodoro-page">
      <header className="pomodoro-header">
        <div>
          <h2>Pomodoro Timer</h2>
          <p>Stay focused with timed work blocks and real recovery breaks.</p>
        </div>
        <button className="btn-secondary" onClick={() => setShowSettings((value) => !value)}>
          Settings
        </button>
      </header>

      <div className="pomodoro-layout-react">
        <aside className="pomodoro-side">
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

          <section className="pomodoro-card">
            <div className="pomodoro-card-heading">
              <h3>Recent Sessions</h3>
              <span>Last 7 days</span>
            </div>
            <div className="pomodoro-recent-list">
              {completedThisWeek.length === 0 ? (
                <p className="pomodoro-empty">No completed sessions yet.</p>
              ) : (
                completedThisWeek
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((session) => (
                    <div className="pomodoro-recent-item" key={session.id}>
                      <span>{session.date}</span>
                      <strong>{session.duration_minutes} min</strong>
                      <small>{session.task_description || 'Focus session'}</small>
                    </div>
                  ))
              )}
            </div>
          </section>

          <section className="pomodoro-card">
            <div className="pomodoro-card-heading">
              <h3>Goal Progress</h3>
              <span>{linkedGoalStats.length} linked</span>
            </div>
            <div className="pomodoro-goal-list">
              {linkedGoalStats.length === 0 ? (
                <p className="pomodoro-empty">Link a session to a goal to track focus time.</p>
              ) : (
                linkedGoalStats.map((item) => (
                  <div className="pomodoro-goal-item" key={item.goal.id}>
                    <span>{item.goal.title || item.goal.goal_text || 'Untitled goal'}</span>
                    <strong>{item.sessions} sessions</strong>
                    <small>{Math.round(item.minutes / 60 * 10) / 10}h</small>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        <main className="pomodoro-main">
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
              <strong>{Math.round(totalFocusMinutes / 60 * 10) / 10}h</strong>
              <span>Focus Time</span>
            </div>
            <div>
              <strong>{dayStreak}</strong>
              <span>Day Streak</span>
            </div>
          </section>

          <section className="pomodoro-timer-card">
            <div className={`timer-circle-react timer-circle-react--${timerState.mode}`}>
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
                <span>{modeLabel(timerState.mode)}</span>
                <strong>{formatTime(timerState.timeRemaining)}</strong>
                <small>
                  Session {timerState.sessionCount}/{settings.sessionsBeforeLongBreak}
                </small>
              </div>
            </div>

            {timerState.mode !== 'focus' && (
              <div className="break-suggestion">
                <strong>Break suggestion</strong>
                <span>{breakSuggestion}</span>
              </div>
            )}

            <div className="task-selection-react">
              <label>
                Working on
                <input
                  type="text"
                  value={timerState.currentTask}
                  onChange={(event) =>
                    setTimerState((prev) => ({
                      ...prev,
                      currentTask: event.currentTarget.value,
                    }))
                  }
                  placeholder="What are you focusing on?"
                />
              </label>

              <div className="task-link-row">
                <select
                  value={taskSource}
                  onChange={(event) => updateTaskSource(event.currentTarget.value as TaskSource)}
                  aria-label="Task source"
                >
                  <option value="custom">Custom task</option>
                  <option value="goal">Link to goal</option>
                  <option value="timeblock">Link to time block</option>
                </select>
                {taskSource !== 'custom' && (
                  <select
                    value={linkedItem}
                    onChange={(event) => updateLinkedItem(event.currentTarget.value)}
                    aria-label="Linked item"
                  >
                    <option value="">Select item</option>
                    {taskSource === 'goal' &&
                      goals.map((goal) => (
                        <option value={goal.id} key={goal.id}>
                          {goal.title || goal.goal_text || 'Untitled goal'}
                        </option>
                      ))}
                    {taskSource === 'timeblock' &&
                      timeBlocks.map((block) => (
                        <option value={block.id} key={block.id}>
                          {(block.start_time || '').slice(0, 5)} {block.activity || block.title}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>

            <div className="timer-controls-react" aria-label="Timer controls">
              <button className="btn-primary btn-large" onClick={toggleTimer}>
                {!timerState.isRunning ? 'Start' : timerState.isPaused ? 'Resume' : 'Pause'}
              </button>
              <button className="btn-secondary" onClick={resetTimer}>Reset</button>
              <button className="btn-secondary" onClick={skipPhase}>Skip</button>
            </div>
          </section>

          {showSettings && (
            <section className="pomodoro-settings-react">
              <div className="pomodoro-card-heading">
                <h3>Timer Settings</h3>
                <button className="btn-secondary" onClick={resetSettings}>Defaults</button>
              </div>
              <div className="pomodoro-settings-grid">
                <label>
                  Focus
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={settings.focusDuration}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        focusDuration: Number(event.currentTarget.value),
                      }))
                    }
                  />
                </label>
                <label>
                  Short break
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.shortBreakDuration}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        shortBreakDuration: Number(event.currentTarget.value),
                      }))
                    }
                  />
                </label>
                <label>
                  Long break
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={settings.longBreakDuration}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        longBreakDuration: Number(event.currentTarget.value),
                      }))
                    }
                  />
                </label>
                <label>
                  Long break after
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={settings.sessionsBeforeLongBreak}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        sessionsBeforeLongBreak: Number(event.currentTarget.value),
                      }))
                    }
                  />
                </label>
              </div>
              <div className="pomodoro-settings-actions">
                <button className="btn-primary" onClick={saveSettings}>Save Settings</button>
                <button className="btn-secondary" onClick={clearStoredState}>
                  Clear Timer State
                </button>
              </div>
            </section>
          )}

          <section className="pomodoro-card session-history-react">
            <div className="pomodoro-card-heading">
              <h3>Today's Sessions</h3>
              <span>{today}</span>
            </div>
            {completedToday.length === 0 ? (
              <p className="pomodoro-empty">No completed sessions today.</p>
            ) : (
              <div className="pomodoro-session-list">
                {completedToday.map((session, index) => (
                  <div className="pomodoro-session-item" key={session.id}>
                    <strong>#{index + 1}</strong>
                    <span>
                      {new Date(session.started_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <small>{session.task_description || 'Focus session'}</small>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default PomodoroPage;
