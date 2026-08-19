import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/Toast/Toast';
import './HabitsPage.css';

type HabitTab = 'daily' | 'weekly' | 'wellness' | 'challenges';
type HabitFilter = 'all' | 'completed' | 'incomplete' | 'streak';
type GridMode = 'checklist' | 'count';

interface IntervalChallenge {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  notes?: string | null;
  is_archived?: boolean;
}

interface ChallengeHabit {
  id: string;
  challenge_id: string;
  habit_name: string;
  order_index?: number;
}

interface ChallengeCompletion {
  habit_id: string;
  challenge_id: string;
  date: string;
  completed?: boolean;
}

interface DailyHabit {
  id: string;
  habit_name: string;
  order_index?: number;
  is_active?: boolean;
}

interface WeeklyHabit {
  id: string;
  habit_name: string;
  target_days_per_week?: number;
  order_index?: number;
}

interface HabitCompletion {
  id?: string;
  habit_id: string;
  date: string;
  completed?: boolean;
  notes?: string | null;
}

interface MoodEntry {
  id?: string;
  date: string;
  mood_emoji: string;
}

interface SleepEntry {
  id?: string;
  date: string;
  bedtime?: string;
  wake_time?: string;
  hours_slept?: number;
}

interface WaterEntry {
  id?: string;
  date: string;
  glasses_consumed?: number;
  goal_glasses?: number;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MOOD_OPTIONS = [
  { value: 'great', label: 'Great' },
  { value: 'good', label: 'Good' },
  { value: 'steady', label: 'Steady' },
  { value: 'low', label: 'Low' },
  { value: 'hard', label: 'Hard' },
];

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function getMonthDateKeys(year: number, monthIndex: number): string[] {
  const days = getDaysInMonth(year, monthIndex);
  return Array.from({ length: days }, (_, index) =>
    toDateKey(new Date(year, monthIndex, index + 1))
  );
}

function calculateSleepHours(bedtime: string, wakeTime: string): number {
  if (!bedtime || !wakeTime) return 0;

  const [bedHour, bedMinute] = bedtime.split(':').map(Number);
  const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);
  let bedMinutes = bedHour * 60 + bedMinute;
  let wakeMinutes = wakeHour * 60 + wakeMinute;

  if (wakeMinutes <= bedMinutes) {
    wakeMinutes += 24 * 60;
  }

  return Math.round(((wakeMinutes - bedMinutes) / 60) * 10) / 10;
}

function completionKey(habitId: string, date: string): string {
  return `${habitId}:${date}`;
}

function getCompletionValue(completion?: HabitCompletion): number {
  if (!completion) return 0;
  const noteValue = Number.parseFloat(completion.notes || '');
  if (Number.isFinite(noteValue)) return noteValue;
  return completion.completed ? 1 : 0;
}

export function HabitsPage() {
  const { activeProfile } = useProfile();
  const { showToast } = useToast();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [activeTab, setActiveTab] = useState<HabitTab>('daily');
  const [filter, setFilter] = useState<HabitFilter>('all');
  const [gridMode, setGridMode] = useState<GridMode>('checklist');
  const [selectedChartHabitId, setSelectedChartHabitId] = useState('');

  const [dailyHabits, setDailyHabits] = useState<DailyHabit[]>([]);
  const [dailyCompletions, setDailyCompletions] = useState<HabitCompletion[]>([]);
  const [weeklyHabits, setWeeklyHabits] = useState<WeeklyHabit[]>([]);
  const [weeklyCompletions, setWeeklyCompletions] = useState<HabitCompletion[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [selectedMoodDate, setSelectedMoodDate] = useState(toDateKey(now));
  const [sleepDate, setSleepDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return toDateKey(yesterday);
  });
  const [bedtime, setBedtime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [waterDate, setWaterDate] = useState(toDateKey(now));
  const [waterGoal, setWaterGoal] = useState(8);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ---- Challenges state ----
  const [challenges, setChallenges] = useState<IntervalChallenge[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [challengeHabits, setChallengeHabits] = useState<ChallengeHabit[]>([]);
  const [challengeCompletions, setChallengeCompletions] = useState<ChallengeCompletion[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeStart, setNewChallengeStart] = useState(toDateKey(new Date()));
  const [newChallengeEnd, setNewChallengeEnd] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 29); return toDateKey(d);
  });
  const [newChallengeNotes, setNewChallengeNotes] = useState('');

  // Refs for grid scroll containers to auto-focus today
  const dailyGridScrollRef = useRef<HTMLDivElement | null>(null);
  const weeklyGridScrollRef = useRef<HTMLDivElement | null>(null);
  const challengesGridScrollRef = useRef<HTMLDivElement | null>(null);

  const monthDates = useMemo(
    () => getMonthDateKeys(year, monthIndex),
    [year, monthIndex]
  );
  const startDate = monthDates[0];
  const endDate = monthDates[monthDates.length - 1];
  const todayKey = toDateKey(new Date());
  const monthLabel = `${MONTH_NAMES[monthIndex]} ${year}`;

  const dailyCompletionMap = useMemo(() => {
    const map = new Map<string, HabitCompletion>();
    dailyCompletions.forEach((completion) => {
      map.set(completionKey(completion.habit_id, completion.date), completion);
    });
    return map;
  }, [dailyCompletions]);

  const weeklyCompletionMap = useMemo(() => {
    const map = new Map<string, HabitCompletion>();
    weeklyCompletions.forEach((completion) => {
      map.set(completionKey(completion.habit_id, completion.date), completion);
    });
    return map;
  }, [weeklyCompletions]);

  const moodMap = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    moodEntries.forEach((entry) => map.set(entry.date, entry));
    return map;
  }, [moodEntries]);

  const waterForSelectedDate = useMemo(() => {
    return waterEntries.find((entry) => entry.date === waterDate);
  }, [waterEntries, waterDate]);

  const loadData = useCallback(async () => {
    if (!activeProfile || !startDate || !endDate) return;

    setIsLoading(true);
    try {
      const [
        nextDailyHabits,
        nextWeeklyHabits,
        nextDailyCompletions,
        nextWeeklyCompletions,
        nextMoodEntries,
        nextSleepEntries,
        nextWaterEntries,
      ] = await Promise.all([
        dataService.getDailyHabits(),
        dataService.getWeeklyHabits(),
        dataService.getDailyHabitCompletions(startDate, endDate),
        dataService.getWeeklyHabitCompletions(startDate, endDate),
        dataService.getMoodEntries(startDate, endDate),
        dataService.getSleepEntries(startDate, endDate),
        dataService.getWaterEntries(startDate, endDate),
      ]);

      setDailyHabits(nextDailyHabits);
      setWeeklyHabits(nextWeeklyHabits);
      setDailyCompletions(nextDailyCompletions);
      setWeeklyCompletions(nextWeeklyCompletions);
      setMoodEntries(nextMoodEntries);
      setSleepEntries(nextSleepEntries);
      setWaterEntries(nextWaterEntries);

      if (!selectedChartHabitId && nextDailyHabits.length > 0) {
        setSelectedChartHabitId(nextDailyHabits[0].id);
      }
    } catch (error) {
      console.error('Failed to load habits view:', error);
      showToast('Failed to load habits data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, endDate, selectedChartHabitId, showToast, startDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load challenges list whenever the tab becomes active or showArchived changes
  const loadChallenges = useCallback(async () => {
    if (!activeProfile) return;
    setChallengesLoading(true);
    try {
      const list = await dataService.getIntervalChallenges(showArchived);
      setChallenges(list);
      if (!selectedChallengeId && list.length > 0) {
        setSelectedChallengeId(list[0].id);
      }
    } catch (error) {
      console.error('Failed to load challenges:', error);
      showToast('Failed to load challenges', 'error');
    } finally {
      setChallengesLoading(false);
    }
  }, [activeProfile, showArchived, selectedChallengeId, showToast]);

  useEffect(() => {
    if (activeTab === 'challenges') loadChallenges();
  }, [activeTab, loadChallenges]);

  // Load habits and completions for the selected challenge
  const loadChallengeDetail = useCallback(async (challengeId: string) => {
    if (!challengeId) return;
    try {
      const challenge = challenges.find((c) => c.id === challengeId);
      const habits = await dataService.getChallengeHabits(challengeId);
      setChallengeHabits(habits);
      if (challenge) {
        const completions = await dataService.getChallengeCompletions(
          challengeId, challenge.start_date, challenge.end_date
        );
        setChallengeCompletions(completions);
      }
    } catch (error) {
      console.error('Failed to load challenge detail:', error);
      showToast('Failed to load challenge data', 'error');
    }
  }, [challenges, showToast]);

  useEffect(() => {
    if (selectedChallengeId) loadChallengeDetail(selectedChallengeId);
  }, [selectedChallengeId, loadChallengeDetail]);

  useEffect(() => {
    if (!waterForSelectedDate) {
      setWaterGlasses(0);
      setWaterGoal(8);
      return;
    }

    setWaterGlasses(waterForSelectedDate.glasses_consumed || 0);
    setWaterGoal(waterForSelectedDate.goal_glasses || 8);
  }, [waterForSelectedDate]);

  // Center/scroll the grid container to today's column
  const scrollToToday = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    const container = ref.current;
    const todayEl = container.querySelector('.habit-grid-header.today') as HTMLElement | null;
    if (todayEl) {
      const stickyWidth = 160;
      const availableWidth = Math.max(container.clientWidth - stickyWidth, 100);
      const targetScroll = Math.max(
        0,
        (todayEl.offsetLeft - stickyWidth) - (availableWidth / 2) + (todayEl.offsetWidth / 2)
      );
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, []);

  // Auto-scroll when daily habits tab loads or month changes
  useEffect(() => {
    if (activeTab === 'daily' && !isLoading) {
      const timer = setTimeout(() => {
        scrollToToday(dailyGridScrollRef);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, isLoading, year, monthIndex, dailyHabits.length, scrollToToday]);

  // Auto-scroll when weekly habits tab loads or month changes
  useEffect(() => {
    if (activeTab === 'weekly' && !isLoading) {
      const timer = setTimeout(() => {
        scrollToToday(weeklyGridScrollRef);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, isLoading, year, monthIndex, weeklyHabits.length, scrollToToday]);

  // Auto-scroll when challenges grid loads
  useEffect(() => {
    if (activeTab === 'challenges' && !challengesLoading && selectedChallengeId) {
      const timer = setTimeout(() => {
        scrollToToday(challengesGridScrollRef);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, challengesLoading, selectedChallengeId, challengeHabits.length, scrollToToday]);

  const dailyStats = useMemo(() => {
    const stats = dailyHabits.map((habit) => {
      const completedDates = monthDates.filter(
        (date) => dailyCompletionMap.get(completionKey(habit.id, date))?.completed
      );

      let currentStreak = 0;
      const sortedDates = [...monthDates].reverse();
      for (const date of sortedDates) {
        const completion = dailyCompletionMap.get(completionKey(habit.id, date));
        if (!completion?.completed) break;
        currentStreak += 1;
      }

      return {
        habitId: habit.id,
        completed: completedDates.length,
        percent:
          monthDates.length > 0
            ? Math.round((completedDates.length / monthDates.length) * 100)
            : 0,
        currentStreak,
      };
    });

    return new Map(stats.map((stat) => [stat.habitId, stat]));
  }, [dailyCompletionMap, dailyHabits, monthDates]);

  const filteredDailyHabits = useMemo(() => {
    return dailyHabits.filter((habit) => {
      const todayCompletion = dailyCompletionMap.get(
        completionKey(habit.id, todayKey)
      );
      const stat = dailyStats.get(habit.id);

      if (filter === 'completed') return Boolean(todayCompletion?.completed);
      if (filter === 'incomplete') return !todayCompletion?.completed;
      if (filter === 'streak') return Boolean(stat && stat.currentStreak > 0);
      return true;
    });
  }, [dailyCompletionMap, dailyHabits, dailyStats, filter, todayKey]);

  const totalPoints = useMemo(() => {
    const dailyPoints = dailyCompletions.filter((item) => item.completed).length * 10;
    const weeklyPoints =
      weeklyCompletions.filter((item) => item.completed).length * 15;
    return dailyPoints + weeklyPoints;
  }, [dailyCompletions, weeklyCompletions]);

  const dailyTrend = useMemo(() => {
    return monthDates.map((date) => {
      if (dailyHabits.length === 0) return 0;
      const completed = dailyHabits.filter(
        (habit) => dailyCompletionMap.get(completionKey(habit.id, date))?.completed
      ).length;
      return Math.round((completed / dailyHabits.length) * 100);
    });
  }, [dailyCompletionMap, dailyHabits, monthDates]);

  const selectedChartData = useMemo(() => {
    const values = monthDates.map((date) =>
      getCompletionValue(
        dailyCompletionMap.get(completionKey(selectedChartHabitId, date))
      )
    );
    const total = values.reduce((sum, value) => sum + value, 0);
    const max = Math.max(0, ...values);
    const activeDays = values.filter((value) => value > 0).length;

    return {
      values,
      total,
      max,
      activeDays,
      average: monthDates.length ? total / monthDates.length : 0,
    };
  }, [dailyCompletionMap, monthDates, selectedChartHabitId]);

  const chartPolyline = useMemo(() => {
    const width = 600;
    const height = 150;
    const max = Math.max(1, selectedChartData.max);
    const points = selectedChartData.values.map((value, index) => {
      const x =
        selectedChartData.values.length === 1
          ? width / 2
          : (index / (selectedChartData.values.length - 1)) * width;
      const y = height - (value / max) * (height - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return points.join(' ');
  }, [selectedChartData]);

  const selectedSleepHours = useMemo(
    () => calculateSleepHours(bedtime, wakeTime),
    [bedtime, wakeTime]
  );

  const changeMonth = (delta: number) => {
    const next = new Date(year, monthIndex + delta, 1);
    setYear(next.getFullYear());
    setMonthIndex(next.getMonth());
  };

  const goToCurrentMonth = () => {
    const date = new Date();
    setYear(date.getFullYear());
    setMonthIndex(date.getMonth());
    setTimeout(() => {
      if (activeTab === 'daily') scrollToToday(dailyGridScrollRef);
      if (activeTab === 'weekly') scrollToToday(weeklyGridScrollRef);
      if (activeTab === 'challenges') scrollToToday(challengesGridScrollRef);
    }, 120);
  };

  const addDailyHabit = async () => {
    if (dailyHabits.length >= 30) {
      showToast('Daily habits are limited to 30', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const habit = await dataService.createDailyHabit({
        habit_name: 'New habit',
        order_index: dailyHabits.length,
        is_active: true,
      });
      setDailyHabits((prev) => [...prev, habit]);
      setSelectedChartHabitId((current) => current || habit.id);
      showToast('Habit added', 'success');
    } catch (error) {
      console.error('Failed to add daily habit:', error);
      showToast('Failed to add habit', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addWeeklyHabit = async () => {
    if (weeklyHabits.length >= 10) {
      showToast('Weekly habits are limited to 10', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const habit = await dataService.createWeeklyHabit({
        habit_name: 'New weekly habit',
        target_days_per_week: 3,
        order_index: weeklyHabits.length,
      });
      setWeeklyHabits((prev) => [...prev, habit]);
      showToast('Weekly habit added', 'success');
    } catch (error) {
      console.error('Failed to add weekly habit:', error);
      showToast('Failed to add weekly habit', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateDailyHabit = async (habitId: string, habitName: string) => {
    const trimmed = habitName.trim() || 'Untitled habit';
    setDailyHabits((prev) =>
      prev.map((habit) =>
        habit.id === habitId ? { ...habit, habit_name: trimmed } : habit
      )
    );

    try {
      await dataService.updateDailyHabit(habitId, { habit_name: trimmed });
    } catch (error) {
      console.error('Failed to update daily habit:', error);
      showToast('Failed to rename habit', 'error');
      loadData();
    }
  };

  const updateWeeklyHabit = async (
    habitId: string,
    updates: Partial<WeeklyHabit>
  ) => {
    setWeeklyHabits((prev) =>
      prev.map((habit) => (habit.id === habitId ? { ...habit, ...updates } : habit))
    );

    try {
      await dataService.updateWeeklyHabit(habitId, updates);
    } catch (error) {
      console.error('Failed to update weekly habit:', error);
      showToast('Failed to update weekly habit', 'error');
      loadData();
    }
  };

  const deleteDailyHabit = async (habitId: string) => {
    if (!window.confirm('Delete this daily habit?')) return;

    const previous = dailyHabits;
    setDailyHabits((prev) => prev.filter((habit) => habit.id !== habitId));
    try {
      await dataService.deleteDailyHabit(habitId);
      showToast('Habit deleted', 'success');
    } catch (error) {
      console.error('Failed to delete daily habit:', error);
      setDailyHabits(previous);
      showToast('Failed to delete habit', 'error');
    }
  };

  // ---- Challenge handlers ----
  const createChallenge = async () => {
    if (!newChallengeTitle.trim()) { showToast('Please enter a challenge title', 'warning'); return; }
    setIsSaving(true);
    try {
      const created = await dataService.createIntervalChallenge({
        title: newChallengeTitle.trim(),
        start_date: newChallengeStart,
        end_date: newChallengeEnd,
        notes: newChallengeNotes.trim() || null,
        is_archived: false,
      });
      setChallenges((prev) => [created, ...prev]);
      setSelectedChallengeId(created.id);
      setShowCreateChallenge(false);
      setNewChallengeTitle('');
      setNewChallengeNotes('');
      showToast('Challenge created', 'success');
    } catch (error) {
      console.error('Failed to create challenge:', error);
      showToast('Failed to create challenge', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const archiveChallenge = async (id: string, archive: boolean) => {
    try {
      const updated = await dataService.updateIntervalChallenge(id, { is_archived: archive });
      setChallenges((prev) => prev.map((c) => c.id === id ? { ...c, ...updated } : c));
      showToast(archive ? 'Challenge archived' : 'Challenge restored', 'success');
    } catch (error) {
      console.error('Failed to archive challenge:', error);
      showToast('Failed to update challenge', 'error');
    }
  };

  const deleteChallenge = async (id: string) => {
    if (!window.confirm('Delete this challenge? This will also delete all completions.')) return;
    try {
      await dataService.deleteIntervalChallenge(id);
      setChallenges((prev) => prev.filter((c) => c.id !== id));
      if (selectedChallengeId === id) {
        const remaining = challenges.filter((c) => c.id !== id);
        setSelectedChallengeId(remaining[0]?.id ?? null);
      }
      showToast('Challenge deleted', 'success');
    } catch (error) {
      console.error('Failed to delete challenge:', error);
      showToast('Failed to delete challenge', 'error');
    }
  };

  const addChallengeHabit = async () => {
    if (!selectedChallengeId) return;
    const name = window.prompt('Habit name for this challenge');
    if (!name?.trim()) return;
    try {
      const created = await dataService.createChallengeHabit({
        challenge_id: selectedChallengeId,
        habit_name: name.trim(),
        order_index: challengeHabits.length,
      });
      setChallengeHabits((prev) => [...prev, created]);
    } catch (error) {
      console.error('Failed to add challenge habit:', error);
      showToast('Failed to add habit', 'error');
    }
  };

  const deleteChallengeHabit = async (id: string) => {
    if (!window.confirm('Remove this habit from the challenge?')) return;
    try {
      await dataService.deleteChallengeHabit(id);
      setChallengeHabits((prev) => prev.filter((h) => h.id !== id));
    } catch (error) {
      console.error('Failed to delete challenge habit:', error);
      showToast('Failed to delete habit', 'error');
    }
  };

  const toggleChallengeCell = async (habitId: string, date: string, current: boolean) => {
    if (!selectedChallengeId) return;
    const next = !current;
    setChallengeCompletions((prev) => {
      const existing = prev.find((c) => c.habit_id === habitId && c.date === date);
      if (existing) return prev.map((c) => c.habit_id === habitId && c.date === date ? { ...c, completed: next } : c);
      return [...prev, { habit_id: habitId, challenge_id: selectedChallengeId, date, completed: next }];
    });
    try {
      await dataService.toggleChallengeCompletion(habitId, selectedChallengeId, date, next);
    } catch (error) {
      console.error('Failed to toggle challenge completion:', error);
      showToast('Failed to update', 'error');
      // Revert
      setChallengeCompletions((prev) =>
        prev.map((c) => c.habit_id === habitId && c.date === date ? { ...c, completed: current } : c)
      );
    }
  };

  const deleteWeeklyHabit = async (habitId: string) => {
    if (!window.confirm('Delete this weekly habit?')) return;

    const previous = weeklyHabits;
    setWeeklyHabits((prev) => prev.filter((habit) => habit.id !== habitId));
    try {
      await dataService.deleteWeeklyHabit(habitId);
      showToast('Weekly habit deleted', 'success');
    } catch (error) {
      console.error('Failed to delete weekly habit:', error);
      setWeeklyHabits(previous);
      showToast('Failed to delete weekly habit', 'error');
    }
  };

  const toggleDailyCompletion = async (
    habitId: string,
    date: string,
    completed: boolean
  ) => {
    const previous = dailyCompletions;
    setDailyCompletions((prev) => {
      const existing = prev.find(
        (item) => item.habit_id === habitId && item.date === date
      );
      if (existing) {
        return prev.map((item) =>
          item.habit_id === habitId && item.date === date
            ? { ...item, completed }
            : item
        );
      }
      return [...prev, { habit_id: habitId, date, completed }];
    });

    try {
      await dataService.toggleDailyHabitCompletion(habitId, date, completed);
    } catch (error) {
      console.error('Failed to toggle daily completion:', error);
      setDailyCompletions(previous);
      showToast('Failed to update habit', 'error');
    }
  };

  const toggleWeeklyCompletion = async (
    habitId: string,
    date: string,
    completed: boolean
  ) => {
    const previous = weeklyCompletions;
    setWeeklyCompletions((prev) => {
      const existing = prev.find(
        (item) => item.habit_id === habitId && item.date === date
      );
      if (existing) {
        return prev.map((item) =>
          item.habit_id === habitId && item.date === date
            ? { ...item, completed }
            : item
        );
      }
      return [...prev, { habit_id: habitId, date, completed }];
    });

    try {
      await dataService.toggleWeeklyHabitCompletion(habitId, date, completed);
    } catch (error) {
      console.error('Failed to toggle weekly completion:', error);
      setWeeklyCompletions(previous);
      showToast('Failed to update weekly habit', 'error');
    }
  };

  const editDailyCount = async (habitId: string, date: string) => {
    const existing = dailyCompletionMap.get(completionKey(habitId, date));
    const current = existing?.notes || (existing?.completed ? '1' : '');
    const next = window.prompt('Count or note for this day', current);
    if (next === null) return;

    const completed = next.trim() !== '' && next.trim() !== '0';
    const previous = dailyCompletions;
    setDailyCompletions((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.habit_id === habitId && item.date === date
      );
      if (existingIndex >= 0) {
        return prev.map((item, index) =>
          index === existingIndex
            ? { ...item, completed, notes: next.trim() || null }
            : item
        );
      }
      return [
        ...prev,
        {
          habit_id: habitId,
          date,
          completed,
          notes: next.trim() || null,
        },
      ];
    });

    try {
      await dataService.toggleDailyHabitCompletion(habitId, date, completed);
      await dataService.updateHabitNote(habitId, date, next.trim());
    } catch (error) {
      console.error('Failed to update habit note:', error);
      setDailyCompletions(previous);
      showToast('Failed to update count', 'error');
    }
  };

  const saveMood = async (date: string, mood: string) => {
    const previous = moodEntries;
    setMoodEntries((prev) => {
      const existing = prev.find((entry) => entry.date === date);
      if (existing) {
        return prev.map((entry) =>
          entry.date === date ? { ...entry, mood_emoji: mood } : entry
        );
      }
      return [...prev, { date, mood_emoji: mood }];
    });

    try {
      await dataService.setMood(date, mood);
      showToast('Mood saved', 'success');
    } catch (error) {
      console.error('Failed to save mood:', error);
      setMoodEntries(previous);
      showToast('Failed to save mood', 'error');
    }
  };

  const saveSleep = async () => {
    setIsSaving(true);
    try {
      const saved = await dataService.setSleepData(
        sleepDate,
        bedtime,
        wakeTime,
        selectedSleepHours
      );
      setSleepEntries((prev) => {
        const withoutDate = prev.filter((entry) => entry.date !== sleepDate);
        return [...withoutDate, saved].sort((a, b) => b.date.localeCompare(a.date));
      });
      showToast('Sleep saved', 'success');
    } catch (error) {
      console.error('Failed to save sleep:', error);
      showToast('Failed to save sleep', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const saveWater = async (nextGlasses: number, nextGoal = waterGoal) => {
    const clampedGlasses = Math.max(0, nextGlasses);
    setWaterGlasses(clampedGlasses);
    setWaterGoal(nextGoal);

    try {
      const saved = await dataService.setWaterIntake(
        waterDate,
        clampedGlasses,
        Math.max(1, nextGoal)
      );
      setWaterEntries((prev) => {
        const withoutDate = prev.filter((entry) => entry.date !== waterDate);
        return [...withoutDate, saved].sort((a, b) => b.date.localeCompare(a.date));
      });
    } catch (error) {
      console.error('Failed to save water:', error);
      showToast('Failed to save water', 'error');
    }
  };

  const renderDailyGridCell = (habit: DailyHabit, date: string) => {
    const completion = dailyCompletionMap.get(completionKey(habit.id, date));
    const checked = Boolean(completion?.completed);

    if (gridMode === 'count') {
      const value = getCompletionValue(completion);
      return (
        <button
          key={date}
          className={`habit-cell habit-cell--count ${value > 0 ? 'is-done' : ''}`}
          onClick={() => editDailyCount(habit.id, date)}
          title={date}
        >
          {value > 0 ? value : ''}
        </button>
      );
    }

    return (
      <label
        key={date}
        className={`habit-cell ${checked ? 'is-done' : ''}`}
        title={date}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            toggleDailyCompletion(habit.id, date, event.currentTarget.checked)
          }
        />
      </label>
    );
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading habits...</p>
      </div>
    );
  }

  return (
    <div className="habits-page">
      <header className="habits-page__header">
        <div className="month-year-selector" role="group" aria-label="Month navigation">
          <button className="nav-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">
            &lt;
          </button>
          <h2>{monthLabel}</h2>
          <button className="nav-btn" onClick={() => changeMonth(1)} aria-label="Next month">
            &gt;
          </button>
          <button className="btn-today" onClick={goToCurrentMonth}>
            Today
          </button>
        </div>

        <div className="habits-xp" aria-label="Habit points">
          <span className="habits-xp__value">{totalPoints}</span>
          <span className="habits-xp__label">XP</span>
        </div>
      </header>

      <nav className="habits-tabs" aria-label="Habit sections">
        {([
          ['daily', 'Daily Habits'],
          ['weekly', 'Weekly Habits'],
          ['wellness', 'Wellness'],
          ['challenges', 'Challenges'],
        ] as [HabitTab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            className={`habits-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'daily' && (
        <section className="habits-layout" aria-label="Daily habits">
          <aside className="habits-panel habits-panel--list">
            <div className="panel-heading">
              <h3>Daily Habits</h3>
              <span>{dailyHabits.length}/30</span>
            </div>

            <div className="habits-controls">
              <select
                className="form-select"
                value={filter}
                onChange={(event) => setFilter(event.currentTarget.value as HabitFilter)}
                aria-label="Filter habits"
              >
                <option value="all">All</option>
                <option value="completed">Done today</option>
                <option value="incomplete">Open today</option>
                <option value="streak">Streak</option>
              </select>

              <div className="segmented-control" aria-label="Grid mode">
                <button
                  className={gridMode === 'checklist' ? 'active' : ''}
                  onClick={() => setGridMode('checklist')}
                  title="Checklist"
                >
                  Check
                </button>
                <button
                  className={gridMode === 'count' ? 'active' : ''}
                  onClick={() => setGridMode('count')}
                  title="Count"
                >
                  Count
                </button>
              </div>
            </div>

            <div className="habit-list">
              {filteredDailyHabits.length === 0 ? (
                <div className="habits-empty">No habits in this view.</div>
              ) : (
                filteredDailyHabits.map((habit) => {
                  const stat = dailyStats.get(habit.id);
                  return (
                    <div className="habit-list-item" key={habit.id}>
                      <input
                        className="habit-name-input"
                        defaultValue={habit.habit_name}
                        onBlur={(event) =>
                          updateDailyHabit(habit.id, event.currentTarget.value)
                        }
                        aria-label="Habit name"
                      />
                      <span className="habit-streak">{stat?.currentStreak || 0}d</span>
                      <button
                        className="habit-delete"
                        onClick={() => deleteDailyHabit(habit.id)}
                        aria-label="Delete habit"
                      >
                        x
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <button
              className="btn-primary habits-add-btn"
              onClick={addDailyHabit}
              disabled={isSaving}
            >
              + Add Habit
            </button>
          </aside>

          <div className="habits-panel habits-panel--grid">
            <div className="habit-grid-scroll" ref={dailyGridScrollRef}>
              <div
                className="habit-grid"
                style={{
                  gridTemplateColumns: `minmax(150px, 180px) repeat(${monthDates.length}, 36px)`,
                }}
              >
                <div className="habit-grid-header habit-grid-corner">Habit</div>
                {monthDates.map((date) => (
                  <div
                    key={date}
                    className={`habit-grid-header ${date === todayKey ? 'today' : ''}`}
                  >
                    {Number(date.slice(-2))}
                  </div>
                ))}

                {filteredDailyHabits.map((habit) => (
                  <div className="habit-grid-row" key={habit.id}>
                    <div className="habit-grid-name" title={habit.habit_name}>
                      {habit.habit_name}
                    </div>
                    {monthDates.map((date) => renderDailyGridCell(habit, date))}
                  </div>
                ))}
              </div>
            </div>

            <div className="habit-chart-card">
              <div className="habit-chart-card__header">
                <h3>Habit Chart</h3>
                <select
                  className="form-select"
                  value={selectedChartHabitId}
                  onChange={(event) => setSelectedChartHabitId(event.currentTarget.value)}
                  aria-label="Select habit to chart"
                >
                  {dailyHabits.map((habit) => (
                    <option value={habit.id} key={habit.id}>
                      {habit.habit_name}
                    </option>
                  ))}
                </select>
              </div>

              <svg className="habit-line-chart" viewBox="0 0 600 150" preserveAspectRatio="none">
                {[25, 50, 75, 100].map((percent) => (
                  <line
                    key={percent}
                    x1="0"
                    x2="600"
                    y1={(150 - (percent / 100) * 130 - 10).toFixed(1)}
                    y2={(150 - (percent / 100) * 130 - 10).toFixed(1)}
                  />
                ))}
                <polyline points={chartPolyline} />
              </svg>

              <div className="habit-chart-stats">
                <span>Total {selectedChartData.total.toFixed(1)}</span>
                <span>Avg {selectedChartData.average.toFixed(1)}</span>
                <span>Max {selectedChartData.max.toFixed(1)}</span>
                <span>Days {selectedChartData.activeDays}</span>
              </div>
            </div>
          </div>

          <aside className="habits-panel habits-panel--progress">
            <div className="panel-heading">
              <h3>Monthly Progress</h3>
            </div>

            <div className="progress-list">
              {dailyHabits.map((habit) => {
                const stat = dailyStats.get(habit.id);
                return (
                  <div className="habit-progress-item" key={habit.id}>
                    <div className="habit-progress-label">
                      <span>{habit.habit_name}</span>
                      <strong>{stat?.percent || 0}%</strong>
                    </div>
                    <div className="habit-progress-track">
                      <div style={{ width: `${stat?.percent || 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="streak-section">
              <h4>Daily Trend</h4>
              <div className="streak-bars">
                {dailyTrend.map((value, index) => (
                  <span
                    key={monthDates[index]}
                    className={`streak-bar ${
                      value >= 80 ? 'high' : value >= 50 ? 'medium' : 'low'
                    } ${monthDates[index] === todayKey ? 'today' : ''}`}
                    style={{ height: `${Math.max(8, value)}%` }}
                    title={`${monthDates[index]}: ${value}%`}
                  />
                ))}
              </div>
            </div>

            <div className="achievements-grid">
              <div className={dailyHabits.length > 0 ? 'earned' : ''}>
                <strong>First Habit</strong>
                <span>{dailyHabits.length > 0 ? 'Earned' : 'Locked'}</span>
              </div>
              <div
                className={
                  [...dailyStats.values()].some((stat) => stat.currentStreak >= 7)
                    ? 'earned'
                    : ''
                }
              >
                <strong>7 Day Run</strong>
                <span>
                  {[...dailyStats.values()].some((stat) => stat.currentStreak >= 7)
                    ? 'Earned'
                    : 'Locked'}
                </span>
              </div>
              <div
                className={
                  dailyTrend.some((value) => value === 100) ? 'earned' : ''
                }
              >
                <strong>Perfect Day</strong>
                <span>{dailyTrend.some((value) => value === 100) ? 'Earned' : 'Locked'}</span>
              </div>
            </div>
          </aside>
        </section>
      )}

      {activeTab === 'weekly' && (
        <section className="habits-layout habits-layout--weekly" aria-label="Weekly habits">
          <aside className="habits-panel habits-panel--list">
            <div className="panel-heading">
              <h3>Weekly Habits</h3>
              <span>{weeklyHabits.length}/10</span>
            </div>

            <div className="habit-list">
              {weeklyHabits.length === 0 ? (
                <div className="habits-empty">No weekly habits yet.</div>
              ) : (
                weeklyHabits.map((habit) => (
                  <div className="habit-list-item habit-list-item--weekly" key={habit.id}>
                    <input
                      className="habit-name-input"
                      defaultValue={habit.habit_name}
                      onBlur={(event) =>
                        updateWeeklyHabit(habit.id, {
                          habit_name: event.currentTarget.value.trim() || 'Untitled weekly habit',
                        })
                      }
                      aria-label="Weekly habit name"
                    />
                    <input
                      type="number"
                      className="habit-target-input"
                      min={1}
                      max={7}
                      value={habit.target_days_per_week || 3}
                      onChange={(event) =>
                        updateWeeklyHabit(habit.id, {
                          target_days_per_week: Number(event.currentTarget.value),
                        })
                      }
                      aria-label="Target days per week"
                    />
                    <button
                      className="habit-delete"
                      onClick={() => deleteWeeklyHabit(habit.id)}
                      aria-label="Delete weekly habit"
                    >
                      x
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              className="btn-primary habits-add-btn"
              onClick={addWeeklyHabit}
              disabled={isSaving}
            >
              + Add Habit
            </button>
          </aside>

          <div className="habits-panel habits-panel--grid">
            <div className="habit-grid-scroll" ref={weeklyGridScrollRef}>
              <div
                className="habit-grid"
                style={{
                  gridTemplateColumns: `minmax(150px, 180px) repeat(${monthDates.length}, 36px)`,
                }}
              >
                <div className="habit-grid-header habit-grid-corner">Habit</div>
                {monthDates.map((date) => (
                  <div
                    key={date}
                    className={`habit-grid-header ${date === todayKey ? 'today' : ''}`}
                  >
                    {Number(date.slice(-2))}
                  </div>
                ))}

                {weeklyHabits.map((habit) => (
                  <div className="habit-grid-row" key={habit.id}>
                    <div className="habit-grid-name" title={habit.habit_name}>
                      {habit.habit_name}
                    </div>
                    {monthDates.map((date) => {
                      const checked = Boolean(
                        weeklyCompletionMap.get(completionKey(habit.id, date))?.completed
                      );
                      return (
                        <label
                          className={`habit-cell ${checked ? 'is-done' : ''}`}
                          key={date}
                          title={date}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              toggleWeeklyCompletion(
                                habit.id,
                                date,
                                event.currentTarget.checked
                              )
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="habits-panel habits-panel--progress">
            <div className="panel-heading">
              <h3>Monthly Progress</h3>
            </div>

            <div className="progress-list">
              {weeklyHabits.map((habit) => {
                const completed = monthDates.filter(
                  (date) =>
                    weeklyCompletionMap.get(completionKey(habit.id, date))?.completed
                ).length;
                const target = Math.ceil(monthDates.length / 7) * (habit.target_days_per_week || 3);
                const percent = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;

                return (
                  <div className="habit-progress-item" key={habit.id}>
                    <div className="habit-progress-label">
                      <span>{habit.habit_name}</span>
                      <strong>
                        {completed}/{target}
                      </strong>
                    </div>
                    <div className="habit-progress-track">
                      <div style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </section>
      )}

      {activeTab === 'wellness' && (
        <section className="wellness-grid" aria-label="Wellness trackers">
          <div className="wellness-card">
            <div className="panel-heading">
              <h3>Mood Tracker</h3>
              <span>{selectedMoodDate}</span>
            </div>

            <div className="mood-calendar">
              {monthDates.map((date) => {
                const mood = moodMap.get(date)?.mood_emoji;
                return (
                  <button
                    key={date}
                    className={`mood-day ${date === selectedMoodDate ? 'selected' : ''}`}
                    onClick={() => setSelectedMoodDate(date)}
                  >
                    <span>{Number(date.slice(-2))}</span>
                    <strong>{mood ? mood.slice(0, 2).toUpperCase() : ''}</strong>
                  </button>
                );
              })}
            </div>

            <div className="mood-options">
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood.value}
                  className={
                    moodMap.get(selectedMoodDate)?.mood_emoji === mood.value
                      ? 'active'
                      : ''
                  }
                  onClick={() => saveMood(selectedMoodDate, mood.value)}
                >
                  {mood.label}
                </button>
              ))}
            </div>
          </div>

          <div className="wellness-card">
            <div className="panel-heading">
              <h3>Sleep Tracker</h3>
              <span>{selectedSleepHours}h</span>
            </div>

            <div className="wellness-form">
              <label>
                Date
                <input
                  type="date"
                  value={sleepDate}
                  onChange={(event) => setSleepDate(event.currentTarget.value)}
                />
              </label>
              <label>
                Bedtime
                <input
                  type="time"
                  value={bedtime}
                  onChange={(event) => setBedtime(event.currentTarget.value)}
                />
              </label>
              <label>
                Wake
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(event) => setWakeTime(event.currentTarget.value)}
                />
              </label>
              <button className="btn-primary" onClick={saveSleep} disabled={isSaving}>
                Save Sleep
              </button>
            </div>

            <div className="wellness-log">
              {sleepEntries.slice(0, 6).map((entry) => (
                <div key={`${entry.id || entry.date}-sleep`}>
                  <span>{entry.date}</span>
                  <strong>{entry.hours_slept || 0}h</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="wellness-card">
            <div className="panel-heading">
              <h3>Water Tracker</h3>
              <span>
                {waterGoal > 0 ? Math.round((waterGlasses / waterGoal) * 100) : 0}%
              </span>
            </div>

            <div className="wellness-form">
              <label>
                Date
                <input
                  type="date"
                  value={waterDate}
                  onChange={(event) => setWaterDate(event.currentTarget.value)}
                />
              </label>
              <label>
                Goal
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={waterGoal}
                  onChange={(event) =>
                    saveWater(waterGlasses, Number(event.currentTarget.value))
                  }
                />
              </label>
            </div>

            <div className="water-counter">
              <button onClick={() => saveWater(waterGlasses - 1)}>-</button>
              <strong>
                {waterGlasses} / {waterGoal}
              </strong>
              <button onClick={() => saveWater(waterGlasses + 1)}>+</button>
            </div>

            <div className="habit-progress-track water-progress">
              <div
                style={{
                  width: `${Math.min(
                    100,
                    waterGoal > 0 ? (waterGlasses / waterGoal) * 100 : 0
                  )}%`,
                }}
              />
            </div>

            <div className="wellness-log">
              {waterEntries.slice(0, 6).map((entry) => (
                <div key={`${entry.id || entry.date}-water`}>
                  <span>{entry.date}</span>
                  <strong>
                    {entry.glasses_consumed || 0}/{entry.goal_glasses || 8}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'challenges' && (() => {
        const selectedChallenge = challenges.find((c) => c.id === selectedChallengeId) ?? null;
        // Build date array spanning the selected challenge's duration
        const challengeDates: string[] = [];
        if (selectedChallenge) {
          const start = new Date(selectedChallenge.start_date);
          const end = new Date(selectedChallenge.end_date);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            challengeDates.push(toDateKey(new Date(d)));
          }
        }
        const completionKey2 = (habitId: string, date: string) => `${habitId}:${date}`;
        const compMap = new Map<string, boolean>();
        challengeCompletions.forEach((c) => compMap.set(completionKey2(c.habit_id, c.date), Boolean(c.completed)));

        return (
          <section className="challenges-layout" aria-label="Interval challenges">
            {/* Left sidebar: challenge list */}
            <aside className="challenges-sidebar">
              <div className="panel-heading">
                <h3>Challenges</h3>
                <button className="btn-primary" onClick={() => setShowCreateChallenge(true)}>+ New</button>
              </div>

              <label className="challenges-archive-toggle">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.currentTarget.checked)} />
                Show archived
              </label>

              {challengesLoading ? (
                <div className="habits-empty">Loading…</div>
              ) : challenges.length === 0 ? (
                <div className="habits-empty">No challenges yet. Create one to get started.</div>
              ) : (
                <div className="challenge-list">
                  {challenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className={`challenge-list-item ${selectedChallengeId === challenge.id ? 'selected' : ''} ${challenge.is_archived ? 'archived' : ''}`}
                      onClick={() => setSelectedChallengeId(challenge.id)}
                    >
                      <div className="challenge-list-item__info">
                        <strong>{challenge.title}</strong>
                        <span>{challenge.start_date} → {challenge.end_date}</span>
                      </div>
                      <div className="challenge-list-item__actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="challenge-action-btn"
                          title={challenge.is_archived ? 'Restore' : 'Archive'}
                          onClick={() => archiveChallenge(challenge.id, !challenge.is_archived)}
                        >
                          {challenge.is_archived ? '↩' : '⊘'}
                        </button>
                        <button
                          className="challenge-action-btn challenge-action-btn--delete"
                          title="Delete"
                          onClick={() => deleteChallenge(challenge.id)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>

            {/* Main area: selected challenge detail */}
            <div className="challenges-detail">
              {!selectedChallenge ? (
                <div className="habits-empty">Select a challenge to view its progress.</div>
              ) : (
                <>
                  <div className="challenges-detail__header">
                    <div>
                      <h3>{selectedChallenge.title}</h3>
                      <span className="challenges-detail__dates">{selectedChallenge.start_date} → {selectedChallenge.end_date}</span>
                      {selectedChallenge.notes && <p className="challenges-detail__notes">{selectedChallenge.notes}</p>}
                    </div>
                    <button className="btn-secondary" onClick={addChallengeHabit}>+ Add habit</button>
                  </div>

                  {challengeHabits.length === 0 ? (
                    <div className="habits-empty">No habits in this challenge. Add one to start tracking.</div>
                  ) : (
                    <div className="habit-grid-scroll" ref={challengesGridScrollRef}>
                      <div
                        className="habit-grid challenge-grid"
                        style={{ gridTemplateColumns: `minmax(150px, 200px) repeat(${challengeDates.length}, 32px)` }}
                      >
                        {/* Header row */}
                        <div className="habit-grid-header habit-grid-corner">Habit</div>
                        {challengeDates.map((date) => (
                          <div
                            key={date}
                            className={`habit-grid-header ${date === todayKey ? 'today' : ''}`}
                            title={date}
                          >
                            {Number(date.slice(-2))}
                          </div>
                        ))}

                        {/* Habit rows */}
                        {challengeHabits.map((habit) => (
                          <div className="habit-grid-row" key={habit.id}>
                            <div className="habit-grid-name habit-grid-name--challenge" title={habit.habit_name}>
                              <span>{habit.habit_name}</span>
                              <button
                                className="habit-delete"
                                onClick={() => deleteChallengeHabit(habit.id)}
                                title="Remove habit"
                              >×</button>
                            </div>
                            {challengeDates.map((date) => {
                              const checked = Boolean(compMap.get(completionKey2(habit.id, date)));
                              return (
                                <label
                                  key={date}
                                  className={`habit-cell ${checked ? 'is-done' : ''}`}
                                  title={date}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleChallengeCell(habit.id, date, checked)}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-habit summary bars */}
                  <div className="challenges-summary">
                    {challengeHabits.map((habit) => {
                      const done = challengeDates.filter((d) => compMap.get(completionKey2(habit.id, d))).length;
                      const pct = challengeDates.length > 0 ? Math.round((done / challengeDates.length) * 100) : 0;
                      return (
                        <div key={habit.id} className="habit-progress-item">
                          <div className="habit-progress-label">
                            <span>{habit.habit_name}</span>
                            <strong>{done}/{challengeDates.length} ({pct}%)</strong>
                          </div>
                          <div className="habit-progress-track">
                            <div style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Create challenge modal */}
            {showCreateChallenge && (
              <div className="dashboard-dialog-backdrop" onMouseDown={() => setShowCreateChallenge(false)}>
                <section className="dashboard-dialog challenges-create-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <h3>New Challenge</h3>
                  <label>
                    Title
                    <input
                      type="text"
                      className="form-input"
                      value={newChallengeTitle}
                      onChange={(e) => setNewChallengeTitle(e.currentTarget.value)}
                      placeholder="e.g. 30-day fitness challenge"
                      autoFocus
                    />
                  </label>
                  <div className="challenges-create-modal__dates">
                    <label>
                      Start
                      <input type="date" className="form-input" value={newChallengeStart} onChange={(e) => setNewChallengeStart(e.currentTarget.value)} />
                    </label>
                    <label>
                      End
                      <input type="date" className="form-input" value={newChallengeEnd} onChange={(e) => setNewChallengeEnd(e.currentTarget.value)} />
                    </label>
                  </div>
                  <label>
                    Notes (optional)
                    <textarea
                      className="form-input"
                      rows={2}
                      value={newChallengeNotes}
                      onChange={(e) => setNewChallengeNotes(e.currentTarget.value)}
                      placeholder="Any details or motivation…"
                    />
                  </label>
                  <div className="challenges-create-modal__actions">
                    <button className="btn-secondary" onClick={() => setShowCreateChallenge(false)}>Cancel</button>
                    <button className="btn-primary" onClick={createChallenge} disabled={isSaving}>Create</button>
                  </div>
                </section>
              </div>
            )}
          </section>
        );
      })()}
    </div>
  );
}

export default HabitsPage;
