import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import dataService from '@/services/DataService';
import { useToast } from '@/components/Toast/Toast';

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  soundEnabled: boolean;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
}

export interface PomodoroContextType {
  mode: TimerMode;
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  sessionCount: number;
  currentTask: string;
  linkedGoalId: string | null;
  linkedTimeBlockId: string | null;
  settings: PomodoroSettings;
  isFloatingOpen: boolean;
  isFloatingMinimized: boolean;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  setMode: (mode: TimerMode) => void;
  setTask: (task: string, goalId?: string | null, timeBlockId?: string | null) => void;
  updateSettings: (newSettings: Partial<PomodoroSettings>) => void;
  setIsFloatingOpen: (open: boolean) => void;
  setIsFloatingMinimized: (minimized: boolean) => void;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  soundEnabled: true,
  autoStartBreaks: false,
  autoStartFocus: false,
};

const SETTINGS_KEY = 'stillmove_pomodoro_settings';
const STATE_KEY = 'stillmove_pomodoro_state';

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();

  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const getDurationForMode = useCallback(
    (m: TimerMode, currentSettings = settings): number => {
      if (m === 'shortBreak') return currentSettings.shortBreakDuration * 60;
      if (m === 'longBreak') return currentSettings.longBreakDuration * 60;
      return currentSettings.focusDuration * 60;
    },
    [settings]
  );

  const [mode, setModeState] = useState<TimerMode>('focus');
  const [timeRemaining, setTimeRemaining] = useState<number>(settings.focusDuration * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [linkedGoalId, setLinkedGoalId] = useState<string | null>(null);
  const [linkedTimeBlockId, setLinkedTimeBlockId] = useState<string | null>(null);

  // Floating Player visibility
  const [isFloatingOpen, setIsFloatingOpen] = useState<boolean>(true);
  const [isFloatingMinimized, setIsFloatingMinimized] = useState<boolean>(false);

  // Active session tracking ID for database
  const currentSessionIdRef = useRef<string | null>(null);
  const runStartedAtRef = useRef<number | null>(null);
  const runStartRemainingRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Audio notification chime
  const playSoundChime = useCallback(() => {
    if (!settings.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio chime unavailable:', e);
    }
  }, [settings.soundEnabled]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Save session to DB helper
  const logSessionComplete = useCallback(
    async (sessionType: TimerMode, durationMins: number, wasCompleted: boolean) => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        await dataService.createPomodoroSession({
          date: todayStr,
          started_at: new Date(Date.now() - durationMins * 60000).toISOString(),
          completed_at: new Date().toISOString(),
          duration_minutes: durationMins,
          session_type: sessionType,
          was_completed: wasCompleted,
          task_description: currentTask || null,
          linked_goal_id: linkedGoalId || null,
          linked_time_block_id: linkedTimeBlockId || null,
        });
      } catch (e) {
        console.error('Failed to log Pomodoro session:', e);
      }
    },
    [currentTask, linkedGoalId, linkedTimeBlockId]
  );

  // Complete phase logic
  const handlePhaseComplete = useCallback(async () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    playSoundChime();

    if (mode === 'focus') {
      const nextSessionCount = sessionCount + 1;
      setSessionCount(nextSessionCount);
      await logSessionComplete('focus', settings.focusDuration, true);

      const nextMode: TimerMode =
        nextSessionCount % settings.sessionsBeforeLongBreak === 0
          ? 'longBreak'
          : 'shortBreak';

      const nextDuration = getDurationForMode(nextMode);
      setModeState(nextMode);
      setTimeRemaining(nextDuration);

      if (settings.autoStartBreaks) {
        runStartedAtRef.current = Date.now();
        runStartRemainingRef.current = nextDuration;
        setIsRunning(true);
        setIsPaused(false);
      } else {
        setIsRunning(false);
        setIsPaused(false);
        runStartedAtRef.current = null;
        runStartRemainingRef.current = null;
      }

      showToast(
        `Focus session completed! Time for a ${nextMode === 'longBreak' ? 'long' : 'short'} break.`,
        'success'
      );
    } else {
      // Break completed
      await logSessionComplete(mode, mode === 'shortBreak' ? settings.shortBreakDuration : settings.longBreakDuration, true);
      const nextDuration = getDurationForMode('focus');
      setModeState('focus');
      setTimeRemaining(nextDuration);

      if (settings.autoStartFocus) {
        runStartedAtRef.current = Date.now();
        runStartRemainingRef.current = nextDuration;
        setIsRunning(true);
        setIsPaused(false);
      } else {
        setIsRunning(false);
        setIsPaused(false);
        runStartedAtRef.current = null;
        runStartRemainingRef.current = null;
      }

      showToast('Break finished! Ready to start focus session?', 'info');
    }
  }, [
    getDurationForMode,
    logSessionComplete,
    mode,
    playSoundChime,
    sessionCount,
    settings.autoStartBreaks,
    settings.autoStartFocus,
    settings.focusDuration,
    settings.longBreakDuration,
    settings.sessionsBeforeLongBreak,
    settings.shortBreakDuration,
    showToast,
  ]);

  // Interval timer tick
  useEffect(() => {
    if (!isRunning || isPaused) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!runStartedAtRef.current) {
      runStartedAtRef.current = Date.now();
      runStartRemainingRef.current = timeRemaining;
    }

    intervalRef.current = window.setInterval(() => {
      if (!runStartedAtRef.current || runStartRemainingRef.current === null) return;
      const elapsed = Math.floor((Date.now() - runStartedAtRef.current) / 1000);
      const nextRemaining = Math.max(0, runStartRemainingRef.current - elapsed);
      setTimeRemaining(nextRemaining);

      if (nextRemaining <= 0) {
        handlePhaseComplete();
      }
    }, 400);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [handlePhaseComplete, isPaused, isRunning, timeRemaining]);

  // Controls
  const startTimer = useCallback(() => {
    runStartedAtRef.current = Date.now();
    runStartRemainingRef.current = timeRemaining;
    setIsRunning(true);
    setIsPaused(false);
    setIsFloatingOpen(true);
  }, [timeRemaining]);

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
    runStartedAtRef.current = null;
    runStartRemainingRef.current = null;
  }, []);

  const resumeTimer = useCallback(() => {
    runStartedAtRef.current = Date.now();
    runStartRemainingRef.current = timeRemaining;
    setIsPaused(false);
    setIsRunning(true);
  }, [timeRemaining]);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
    runStartedAtRef.current = null;
    runStartRemainingRef.current = null;
    setTimeRemaining(getDurationForMode(mode));
  }, [getDurationForMode, mode]);

  const skipPhase = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    runStartedAtRef.current = null;
    runStartRemainingRef.current = null;

    if (mode === 'focus') {
      const nextCount = sessionCount + 1;
      setSessionCount(nextCount);
      const nextMode: TimerMode =
        nextCount % settings.sessionsBeforeLongBreak === 0 ? 'longBreak' : 'shortBreak';
      setModeState(nextMode);
      setTimeRemaining(getDurationForMode(nextMode));
    } else {
      setModeState('focus');
      setTimeRemaining(getDurationForMode('focus'));
    }
    setIsRunning(false);
    setIsPaused(false);
  }, [getDurationForMode, mode, sessionCount, settings.sessionsBeforeLongBreak]);

  const setMode = useCallback(
    (newMode: TimerMode) => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setModeState(newMode);
      setTimeRemaining(getDurationForMode(newMode));
      setIsRunning(false);
      setIsPaused(false);
      runStartedAtRef.current = null;
      runStartRemainingRef.current = null;
    },
    [getDurationForMode]
  );

  const setTask = useCallback((task: string, goalId?: string | null, timeBlockId?: string | null) => {
    setCurrentTask(task);
    setLinkedGoalId(goalId || null);
    setLinkedTimeBlockId(timeBlockId || null);
  }, []);

  const updateSettings = useCallback(
    (newSettings: Partial<PomodoroSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...newSettings };
        if (!isRunning) {
          setTimeRemaining(getDurationForMode(mode, next));
        }
        return next;
      });
      showToast('Pomodoro settings updated', 'success');
    },
    [getDurationForMode, isRunning, mode, showToast]
  );

  const value: PomodoroContextType = {
    mode,
    timeRemaining,
    isRunning,
    isPaused,
    sessionCount,
    currentTask,
    linkedGoalId,
    linkedTimeBlockId,
    settings,
    isFloatingOpen,
    isFloatingMinimized,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipPhase,
    setMode,
    setTask,
    updateSettings,
    setIsFloatingOpen,
    setIsFloatingMinimized,
  };

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
}
