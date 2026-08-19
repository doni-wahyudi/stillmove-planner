import { useCallback, useEffect, useMemo, useState } from 'react';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/Toast/Toast';
import '../PlannerPages.css';

type ChecklistItem = { text: string; completed: boolean };

interface CalendarEventItem {
  id: string;
  date: string;
  title: string;
  description?: string | null;
  category?: string;
  is_all_day?: boolean;
  end_date?: string | null;
}

interface TimeBlockItem {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  activity: string;
  category?: string;
  notes?: string | null;
}

interface ActionPlanItem {
  id?: string;
  year?: number;
  month?: number;
  goal: string;
  progress: number;
  evaluation?: string;
}

interface GoalDeadline {
  id: string;
  title: string;
  deadline?: string;
}

interface CalendarDayInfo {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  weekNumber: number;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function normalizeChecklist(value: any): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) =>
    typeof item === 'string'
      ? { text: item, completed: false }
      : { text: item.text || item.title || '', completed: Boolean(item.completed) }
  ).filter((item) => item.text);
}

const CATEGORY_COLORS: Record<string, string> = {
  Personal: '#8b5cf6',
  Work: '#2563eb',
  Business: '#0891b2',
  Family: '#059669',
  Education: '#d97706',
  Social: '#db2777',
  Project: '#dc2626',
  Health: '#16a34a',
  Other: '#64748b',
};

const CATEGORIES = ['Personal', 'Work', 'Business', 'Family', 'Education', 'Social', 'Project', 'Health', 'Other'];

export function MonthlyPage() {
  const { activeProfile } = useProfile();
  const { showToast } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheck, setNewCheck] = useState('');
  const [actionPlans, setActionPlans] = useState<ActionPlanItem[]>([]);
  const [blocks, setBlocks] = useState<TimeBlockItem[]>([]);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [annualGoals, setAnnualGoals] = useState<GoalDeadline[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<{ date: string; completed: number; total: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'event' | 'block' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Multi-day selection state
  const [dragSelectionStart, setDragSelectionStart] = useState<string | null>(null);
  const [dragSelectionEnd, setDragSelectionEnd] = useState<string | null>(null);
  const [isDragSelecting, setIsDragSelecting] = useState(false);

  // Event modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedEventType, setSelectedEventType] = useState<'time-block' | 'calendar-event'>('time-block');
  const [editItem, setEditItem] = useState<{
    id?: string;
    type: 'event' | 'block';
    date: string;
    endDate?: string;
    title: string;
    startTime: string;
    endTime: string;
    category: string;
    notes: string;
  }>({
    type: 'block',
    date: toDateKey(now),
    endDate: toDateKey(now),
    title: '',
    startTime: '09:00',
    endTime: '10:00',
    category: 'Personal',
    notes: '',
  });

  // Action plan modal / inline add
  const [showAddActionPlan, setShowAddActionPlan] = useState(false);
  const [newActionGoal, setNewActionGoal] = useState('');
  const [newActionProgress, setNewActionProgress] = useState(0);
  const [newActionEval, setNewActionEval] = useState('');

  // Month date ranges
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const startDateStr = toDateKey(monthStart);
  const endDateStr = toDateKey(monthEnd);
  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Compute full 35 or 42 grid cells including adjacent-month dates
  const calendarWeeks = useMemo(() => {
    const firstDayIndex = monthStart.getDay(); // 0 = Sun
    const daysInMonth = monthEnd.getDate();
    const prevMonthDays = new Date(year, monthIndex, 0).getDate();

    const cells: CalendarDayInfo[] = [];
    const todayStr = toDateKey(new Date());

    // 1. Previous month adjacent days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, monthIndex - 1, prevMonthDays - i);
      const k = toDateKey(d);
      cells.push({
        date: d,
        dateKey: k,
        dayNumber: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: k === todayStr,
        isPast: d < new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        weekNumber: getWeekNumber(d),
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, monthIndex, day);
      const k = toDateKey(d);
      cells.push({
        date: d,
        dateKey: k,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: k === todayStr,
        isPast: d < new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        weekNumber: getWeekNumber(d),
      });
    }

    // 3. Next month adjacent days to complete row (multiples of 7)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let nextDay = 1; nextDay <= remaining; nextDay++) {
        const d = new Date(year, monthIndex + 1, nextDay);
        const k = toDateKey(d);
        cells.push({
          date: d,
          dateKey: k,
          dayNumber: nextDay,
          isCurrentMonth: false,
          isToday: k === todayStr,
          isPast: d < new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          weekNumber: getWeekNumber(d),
        });
      }
    }

    // Group into 7-day weeks
    const weeks: CalendarDayInfo[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [monthIndex, year]);

  const calendarStartDate = calendarWeeks[0]?.[0]?.dateKey || startDateStr;
  const calendarEndDate = calendarWeeks[calendarWeeks.length - 1]?.[6]?.dateKey || endDateStr;

  const loadData = useCallback(async () => {
    if (!activeProfile) return;

    setIsLoading(true);
    try {
      const [
        monthly,
        nextBlocks,
        nextEvents,
        goals,
        dailyHabits,
        dailyCompletions,
        plans,
      ] = await Promise.all([
        dataService.getMonthlyData(year, monthIndex + 1),
        dataService.getTimeBlocksRange(calendarStartDate, calendarEndDate),
        dataService.getCalendarEventsRange(calendarStartDate, calendarEndDate),
        dataService.getAnnualGoals(year),
        dataService.getDailyHabits(),
        dataService.getDailyHabitCompletions(calendarStartDate, calendarEndDate),
        dataService.getActionPlans(year, monthIndex + 1),
      ]);

      setNotes(monthly?.notes || '');
      setChecklist(normalizeChecklist(monthly?.checklist));
      setBlocks(nextBlocks || []);
      setEvents(nextEvents || []);
      setAnnualGoals((goals || []).filter((g: any) => g.deadline));
      setActionPlans(plans || []);

      // Calculate habit completion rate per day
      if (dailyHabits && dailyHabits.length > 0 && dailyCompletions) {
        const map = new Map<string, number>();
        dailyCompletions.forEach((c: any) => {
          if (c.completed) map.set(c.date, (map.get(c.date) || 0) + 1);
        });
        const summary = Array.from(map.entries()).map(([date, completed]) => ({
          date,
          completed,
          total: dailyHabits.length,
        }));
        setHabitCompletions(summary);
      }
    } catch (error) {
      console.error('Failed to load monthly view:', error);
      showToast('Failed to load monthly planner', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, calendarEndDate, calendarStartDate, monthIndex, showToast, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save notes on blur
  const saveMonthly = async (nextNotes = notes, nextChecklist = checklist) => {
    try {
      await dataService.upsertMonthlyData({
        year,
        month: monthIndex + 1,
        notes: nextNotes,
        checklist: nextChecklist,
      });
      showToast('Saved notes & checklist', 'success');
    } catch (error) {
      console.error('Failed to save monthly data:', error);
      showToast('Failed to save monthly data', 'error');
    }
  };

  // Open create modal for single date or range
  const openCreateModal = (dateStr: string, endDateStr?: string) => {
    setModalMode('create');
    setSelectedEventType('time-block');
    setEditItem({
      type: 'block',
      date: dateStr,
      endDate: endDateStr || dateStr,
      title: '',
      startTime: '09:00',
      endTime: '10:00',
      category: 'Personal',
      notes: '',
    });
    setShowEventModal(true);
  };

  // Open edit modal for an existing block or event
  const openEditModal = (item: CalendarEventItem | TimeBlockItem, type: 'event' | 'block') => {
    setModalMode('edit');
    if (type === 'block') {
      const b = item as TimeBlockItem;
      setSelectedEventType('time-block');
      setEditItem({
        id: b.id,
        type: 'block',
        date: b.date,
        endDate: b.date,
        title: b.activity,
        startTime: b.start_time || '09:00',
        endTime: b.end_time || '10:00',
        category: b.category || 'Personal',
        notes: b.notes || '',
      });
    } else {
      const e = item as CalendarEventItem;
      setSelectedEventType('calendar-event');
      setEditItem({
        id: e.id,
        type: 'event',
        date: e.date,
        endDate: e.end_date || e.date,
        title: e.title,
        startTime: '09:00',
        endTime: '10:00',
        category: e.category || 'Personal',
        notes: e.description || '',
      });
    }
    setShowEventModal(true);
  };

  // Save event/block from modal
  const handleSaveModal = async () => {
    if (!editItem.title.trim()) {
      showToast('Please enter an event title', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        if (selectedEventType === 'calendar-event') {
          const created = await dataService.createCalendarEvent({
            date: editItem.date,
            end_date: editItem.endDate !== editItem.date ? editItem.endDate : null,
            title: editItem.title.trim(),
            description: editItem.notes.trim() || null,
            category: editItem.category,
            is_all_day: true,
          });
          setEvents((prev) => [...prev, created]);
          showToast('Calendar event created', 'success');
        } else {
          const created = await dataService.createTimeBlock({
            date: editItem.date,
            start_time: editItem.startTime,
            end_time: editItem.endTime,
            activity: editItem.title.trim(),
            category: editItem.category,
            notes: editItem.notes.trim() || null,
          });
          setBlocks((prev) => [...prev, created]);
          showToast('Time block created', 'success');
        }
      } else {
        // Edit mode
        if (editItem.type === 'block') {
          const updates = {
            date: editItem.date,
            start_time: editItem.startTime,
            end_time: editItem.endTime,
            activity: editItem.title.trim(),
            category: editItem.category,
            notes: editItem.notes.trim() || null,
          };
          await dataService.updateTimeBlock(editItem.id!, updates);
          setBlocks((prev) => prev.map((b) => (b.id === editItem.id ? { ...b, ...updates } : b)));
          showToast('Time block updated', 'success');
        } else {
          const updates = {
            date: editItem.date,
            end_date: editItem.endDate !== editItem.date ? editItem.endDate : null,
            title: editItem.title.trim(),
            description: editItem.notes.trim() || null,
            category: editItem.category,
          };
          await dataService.updateCalendarEvent(editItem.id!, updates);
          setEvents((prev) => prev.map((e) => (e.id === editItem.id ? { ...e, ...updates } : e)));
          showToast('Calendar event updated', 'success');
        }
      }
      setShowEventModal(false);
    } catch (error) {
      console.error('Failed to save event:', error);
      showToast('Failed to save event', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete event/block
  const handleDeleteModalItem = async () => {
    if (!editItem.id) return;
    if (!window.confirm('Delete this item?')) return;

    try {
      if (editItem.type === 'block') {
        await dataService.deleteTimeBlock(editItem.id);
        setBlocks((prev) => prev.filter((b) => b.id !== editItem.id));
      } else {
        await dataService.deleteCalendarEvent(editItem.id);
        setEvents((prev) => prev.filter((e) => e.id !== editItem.id));
      }
      setShowEventModal(false);
      showToast('Item deleted', 'success');
    } catch (error) {
      console.error('Failed to delete item:', error);
      showToast('Failed to delete item', 'error');
    }
  };

  // Drag and drop movement between days
  const moveItem = async (targetDate: string) => {
    if (!draggedItem) return;
    const { id, type } = draggedItem;

    if (type === 'event') {
      const item = events.find((e) => e.id === id);
      if (!item || item.date === targetDate) return;
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, date: targetDate } : e)));
      try {
        await dataService.updateCalendarEvent(id, { date: targetDate });
        showToast('Event moved', 'success');
      } catch {
        showToast('Failed to move event', 'error');
        loadData();
      }
    } else {
      const item = blocks.find((b) => b.id === id);
      if (!item || item.date === targetDate) return;
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, date: targetDate } : b)));
      try {
        await dataService.updateTimeBlock(id, { date: targetDate });
        showToast('Time block moved', 'success');
      } catch {
        showToast('Failed to move time block', 'error');
        loadData();
      }
    }
    setDraggedItem(null);
  };

  // Action plan handlers
  const handleAddActionPlan = async () => {
    if (!newActionGoal.trim()) {
      showToast('Please enter a goal description', 'warning');
      return;
    }
    try {
      const created = await dataService.createActionPlan({
        year,
        month: monthIndex + 1,
        goal: newActionGoal.trim(),
        progress: newActionProgress,
        evaluation: newActionEval.trim() || null,
      });
      setActionPlans((prev) => [...prev, created]);
      setNewActionGoal('');
      setNewActionProgress(0);
      setNewActionEval('');
      setShowAddActionPlan(false);
      showToast('Action plan created', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to add action plan', 'error');
    }
  };

  const handleUpdateActionProgress = async (id: string, progress: number) => {
    setActionPlans((prev) => prev.map((p) => (p.id === id ? { ...p, progress } : p)));
    try {
      await dataService.updateActionPlan(id, { progress });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteActionPlan = async (id: string) => {
    if (!window.confirm('Delete this action plan?')) return;
    setActionPlans((prev) => prev.filter((p) => p.id !== id));
    try {
      await dataService.deleteActionPlan(id);
      showToast('Action plan deleted', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete', 'error');
    }
  };

  // Multi-day selection handling
  const handleDayMouseDown = (dateKey: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
      setIsDragSelecting(true);
      setDragSelectionStart(dateKey);
      setDragSelectionEnd(dateKey);
    }
  };

  const handleDayMouseEnter = (dateKey: string) => {
    if (isDragSelecting) {
      setDragSelectionEnd(dateKey);
    }
  };

  const handleDayMouseUp = () => {
    if (isDragSelecting && dragSelectionStart && dragSelectionEnd) {
      setIsDragSelecting(false);
      const [start, end] = dragSelectionStart <= dragSelectionEnd
        ? [dragSelectionStart, dragSelectionEnd]
        : [dragSelectionEnd, dragSelectionStart];
      openCreateModal(start, end);
      setDragSelectionStart(null);
      setDragSelectionEnd(null);
    }
  };

  // Summary dashboard metrics
  const totalTimeBlocks = blocks.length;
  const totalMinutesScheduled = blocks.reduce((sum, b) => {
    if (!b.start_time || !b.end_time) return sum + 60;
    const [sh, sm] = b.start_time.split(':').map(Number);
    const [eh, em] = b.end_time.split(':').map(Number);
    const diff = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
    return sum + (diff > 0 ? diff : 60);
  }, 0);
  const scheduledHours = Math.round(totalMinutesScheduled / 60);

  const checklistDoneCount = checklist.filter((i) => i.completed).length;
  const checklistPercent = checklist.length > 0 ? Math.round((checklistDoneCount / checklist.length) * 100) : 0;

  const actionPlanProgress = actionPlans.length > 0
    ? Math.round(actionPlans.reduce((sum, p) => sum + (p.progress || 0), 0) / actionPlans.length)
    : 0;

  const totalHabitsCompleted = habitCompletions.reduce((sum, h) => sum + h.completed, 0);
  const totalHabitsPossible = habitCompletions.reduce((sum, h) => sum + h.total, 0);
  const habitsRate = totalHabitsPossible > 0 ? Math.round((totalHabitsCompleted / totalHabitsPossible) * 100) : 0;

  // Weekly trend data (time blocks per week of month)
  const weeklyTrendData = useMemo(() => {
    return calendarWeeks.map((week, idx) => {
      const weekDates = new Set(week.map((d) => d.dateKey));
      const count = blocks.filter((b) => weekDates.has(b.date)).length;
      return { weekNum: idx + 1, count };
    });
  }, [blocks, calendarWeeks]);

  const maxWeeklyCount = Math.max(...weeklyTrendData.map((w) => w.count), 1);

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading monthly planner...</p>
      </div>
    );
  }

  return (
    <div className="planner-page monthly-page" onMouseUp={handleDayMouseUp}>
      {/* View Header */}
      <header className="planner-header">
        <div>
          <h2>Monthly Planner</h2>
          <p>{monthLabel}</p>
        </div>
        <div className="planner-header-actions">
          <button
            className="btn-secondary"
            onClick={() => {
              const next = new Date(year, monthIndex - 1, 1);
              setYear(next.getFullYear());
              setMonthIndex(next.getMonth());
            }}
          >
            ← Prev
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              const next = new Date();
              setYear(next.getFullYear());
              setMonthIndex(next.getMonth());
            }}
          >
            Today
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              const next = new Date(year, monthIndex + 1, 1);
              setYear(next.getFullYear());
              setMonthIndex(next.getMonth());
            }}
          >
            Next →
          </button>
        </div>
      </header>

      {/* Monthly Summary Dashboard */}
      <section className="monthly-summary-dashboard" aria-label="Monthly summary">
        <div className="monthly-summary-cards">
          <div className="monthly-summary-card">
            <div className="summary-icon">📅</div>
            <div className="summary-content">
              <span className="summary-value">{totalTimeBlocks}</span>
              <span className="summary-label">Time Blocks</span>
            </div>
          </div>
          <div className="monthly-summary-card">
            <div className="summary-icon">⏱️</div>
            <div className="summary-content">
              <span className="summary-value">{scheduledHours}h</span>
              <span className="summary-label">Scheduled</span>
            </div>
          </div>
          <div className="monthly-summary-card">
            <div className="summary-icon">✅</div>
            <div className="summary-content">
              <span className="summary-value">{checklistPercent}%</span>
              <span className="summary-label">Checklist Done</span>
            </div>
          </div>
          <div className="monthly-summary-card">
            <div className="summary-icon">🎯</div>
            <div className="summary-content">
              <span className="summary-value">{actionPlanProgress}%</span>
              <span className="summary-label">Action Plans</span>
            </div>
          </div>
          <div className="monthly-summary-card">
            <div className="summary-icon">🔥</div>
            <div className="summary-content">
              <span className="summary-value">{habitsRate}%</span>
              <span className="summary-label">Habits Rate</span>
            </div>
          </div>
          <div className="monthly-summary-card">
            <div className="summary-icon">🏆</div>
            <div className="summary-content">
              <span className="summary-value">{annualGoals.length}</span>
              <span className="summary-label">Goal Deadlines</span>
            </div>
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="monthly-weekly-trend">
          <div className="trend-header">
            <h4>Weekly Activity Trend</h4>
            <span className="planner-muted">Blocks per week</span>
          </div>
          <div className="trend-chart">
            {weeklyTrendData.map((w) => {
              const heightPct = Math.round((w.count / maxWeeklyCount) * 100);
              return (
                <div key={w.weekNum} className="trend-bar-group">
                  <div className="trend-bar-track">
                    <div
                      className="trend-bar-fill"
                      style={{ height: `${Math.max(heightPct, 8)}%` }}
                      title={`Week ${w.weekNum}: ${w.count} blocks`}
                    />
                  </div>
                  <span className="trend-bar-label">W{w.weekNum}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Grid Layout: Calendar + Sidebar */}
      <div className="monthly-layout-grid">
        {/* Calendar Section */}
        <section className="planner-card monthly-calendar-card">
          <div className="planner-card-header">
            <div className="calendar-header-title">
              <h3>Monthly Calendar</h3>
              <span className="planner-muted">Shift + click & drag to select multiple days</span>
            </div>
            <button className="btn-primary" onClick={() => openCreateModal(toDateKey(new Date()))}>
              + Add Event
            </button>
          </div>

          <div className="monthly-calendar-table">
            {/* Header row */}
            <div className="calendar-table-header">
              <div className="col-week-num">Wk</div>
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Weeks */}
            {calendarWeeks.map((week, weekIdx) => (
              <div key={weekIdx} className="calendar-table-row">
                <div className="col-week-num">{week[0]?.weekNumber}</div>
                {week.map((day) => {
                  const dayBlocks = blocks.filter(
                    (b) => b.date === day.dateKey && (!selectedCategory || b.category === selectedCategory)
                  );
                  const dayEvents = events.filter(
                    (e) => e.date === day.dateKey && (!selectedCategory || e.category === selectedCategory)
                  );
                  const dayDeadlines = annualGoals.filter((g) => g.deadline?.startsWith(day.dateKey));
                  const habitInfo = habitCompletions.find((h) => h.date === day.dateKey);

                  // Range selection highlight
                  const isInRange =
                    dragSelectionStart &&
                    dragSelectionEnd &&
                    day.dateKey >= (dragSelectionStart <= dragSelectionEnd ? dragSelectionStart : dragSelectionEnd) &&
                    day.dateKey <= (dragSelectionStart <= dragSelectionEnd ? dragSelectionEnd : dragSelectionStart);

                  return (
                    <div
                      key={day.dateKey}
                      className={`monthly-day-cell ${!day.isCurrentMonth ? 'adjacent-month' : ''} ${
                        day.isToday ? 'today' : ''
                      } ${day.isPast ? 'past' : ''} ${isInRange ? 'in-range' : ''}`}
                      onMouseDown={(e) => handleDayMouseDown(day.dateKey, e)}
                      onMouseEnter={() => handleDayMouseEnter(day.dateKey)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => moveItem(day.dateKey)}
                      onClick={(e) => {
                        if (!e.shiftKey) openCreateModal(day.dateKey);
                      }}
                    >
                      <div className="day-cell-top">
                        <span className="day-number">{day.dayNumber}</span>
                        <div className="day-badges">
                          {dayDeadlines.length > 0 && (
                            <span
                              className="deadline-badge"
                              title={`Goal deadline: ${dayDeadlines.map((d) => d.title).join(', ')}`}
                            >
                              🎯
                            </span>
                          )}
                          {habitInfo && habitInfo.completed > 0 && (
                            <span
                              className="habit-dot-badge"
                              title={`Habits: ${habitInfo.completed}/${habitInfo.total}`}
                            />
                          )}
                        </div>
                      </div>

                      {/* Items list */}
                      <div className="day-items-list" onClick={(e) => e.stopPropagation()}>
                        {dayEvents.map((evt) => {
                          const catColor = CATEGORY_COLORS[evt.category || 'Other'] || '#2563eb';
                          return (
                            <div
                              key={evt.id}
                              className="day-event-pill"
                              style={{ borderLeftColor: catColor }}
                              draggable
                              onDragStart={() => setDraggedItem({ id: evt.id, type: 'event' })}
                              onClick={() => openEditModal(evt, 'event')}
                              title={`${evt.title} (Calendar Event)`}
                            >
                              <span className="pill-dot" style={{ backgroundColor: catColor }} />
                              <span className="pill-title">{evt.title}</span>
                            </div>
                          );
                        })}

                        {dayBlocks.map((blk) => {
                          const catColor = CATEGORY_COLORS[blk.category || 'Other'] || '#059669';
                          return (
                            <div
                              key={blk.id}
                              className="day-block-pill"
                              style={{ borderLeftColor: catColor }}
                              draggable
                              onDragStart={() => setDraggedItem({ id: blk.id, type: 'block' })}
                              onClick={() => openEditModal(blk, 'block')}
                              title={`${(blk.start_time || '').slice(0, 5)} ${blk.activity}`}
                            >
                              <span className="pill-time">{(blk.start_time || '').slice(0, 5)}</span>
                              <span className="pill-title">{blk.activity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="calendar-legend">
            <span className="legend-item"><span className="legend-dot" style={{ background: '#2563eb' }} /> Time Block</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#8b5cf6' }} /> Calendar Event</span>
            <span className="legend-item">🎯 Goal Deadline</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }} /> Habits Completed</span>
          </div>
        </section>

        {/* Sidebar: Categories & Filter */}
        <aside className="planner-card monthly-sidebar-card">
          <div className="planner-card-header">
            <h3>Categories</h3>
            {selectedCategory && (
              <button className="btn-secondary" onClick={() => setSelectedCategory(null)}>
                Clear Filter
              </button>
            )}
          </div>
          <div className="category-filter-list">
            {CATEGORIES.map((cat) => {
              const color = CATEGORY_COLORS[cat] || '#64748b';
              const count =
                blocks.filter((b) => b.category === cat).length +
                events.filter((e) => e.category === cat).length;
              return (
                <button
                  key={cat}
                  className={`category-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                >
                  <span className="category-swatch" style={{ background: color }} />
                  <span className="category-name">{cat}</span>
                  <span className="category-count">{count}</span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Action Plan Realization Section */}
      <section className="planner-card planner-card--full action-plans-section">
        <div className="planner-card-header">
          <div>
            <h3>Action Plan Realization</h3>
            <span className="planner-muted">Track monthly milestones with live progress evaluation</span>
          </div>
          <button className="btn-primary" onClick={() => setShowAddActionPlan(!showAddActionPlan)}>
            {showAddActionPlan ? 'Cancel' : '+ Add Action Plan'}
          </button>
        </div>

        {showAddActionPlan && (
          <div className="action-plan-form">
            <div className="planner-form-row">
              <label>
                Goal / Milestone
                <input
                  type="text"
                  value={newActionGoal}
                  onChange={(e) => setNewActionGoal(e.currentTarget.value)}
                  placeholder="e.g., Launch marketing campaign"
                  autoFocus
                />
              </label>
              <label>
                Progress ({newActionProgress}%)
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newActionProgress}
                  onChange={(e) => setNewActionProgress(Number(e.currentTarget.value))}
                />
              </label>
            </div>
            <label>
              Evaluation Notes
              <textarea
                rows={2}
                value={newActionEval}
                onChange={(e) => setNewActionEval(e.currentTarget.value)}
                placeholder="Results, learnings, or next steps..."
              />
            </label>
            <div className="planner-actions">
              <button className="btn-primary" onClick={handleAddActionPlan}>
                Save Action Plan
              </button>
            </div>
          </div>
        )}

        <div className="action-plans-grid">
          {actionPlans.length === 0 ? (
            <p className="planner-empty">No action plans yet for this month. Create one to get started.</p>
          ) : (
            actionPlans.map((plan) => (
              <div key={plan.id} className="action-plan-card">
                <div className="action-plan-card-header">
                  <strong>{plan.goal}</strong>
                  <button className="planner-danger" onClick={() => handleDeleteActionPlan(plan.id!)}>
                    ×
                  </button>
                </div>
                <div className="action-plan-slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={plan.progress || 0}
                    onChange={(e) => handleUpdateActionProgress(plan.id!, Number(e.currentTarget.value))}
                  />
                  <span className="progress-percent">{plan.progress || 0}%</span>
                </div>
                {plan.evaluation && <p className="action-plan-eval">{plan.evaluation}</p>}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Bottom Section: Notes + Checklist */}
      <div className="monthly-bottom-grid">
        {/* Monthly Notes */}
        <section className="planner-card">
          <div className="planner-card-header">
            <h3>Monthly Notes & Themes</h3>
          </div>
          <div className="planner-form">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              onBlur={() => saveMonthly(notes, checklist)}
              placeholder="Reflections, monthly themes, goals, and focus areas..."
              rows={6}
            />
            <button className="btn-primary" onClick={() => saveMonthly(notes, checklist)}>
              Save Notes
            </button>
          </div>
        </section>

        {/* Monthly Checklist */}
        <section className="planner-card">
          <div className="planner-card-header">
            <h3>Monthly Checklist</h3>
            <span className="planner-muted">
              {checklistDoneCount}/{checklist.length}
            </span>
          </div>
          <div className="planner-list">
            {checklist.length === 0 ? (
              <p className="planner-empty">No checklist items yet.</p>
            ) : (
              checklist.map((item, index) => (
                <div className="planner-row" key={`${item.text}-${index}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => {
                        const next = checklist.map((entry, i) =>
                          i === index ? { ...entry, completed: e.currentTarget.checked } : entry
                        );
                        setChecklist(next);
                        saveMonthly(notes, next);
                      }}
                    />{' '}
                    <strong style={{ textDecoration: item.completed ? 'line-through' : 'none' }}>
                      {item.text}
                    </strong>
                  </label>
                  <button
                    className="planner-danger"
                    onClick={() => {
                      const next = checklist.filter((_, i) => i !== index);
                      setChecklist(next);
                      saveMonthly(notes, next);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="planner-form mt-2">
            <input
              value={newCheck}
              onChange={(e) => setNewCheck(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCheck.trim()) {
                  const next = [...checklist, { text: newCheck.trim(), completed: false }];
                  setChecklist(next);
                  setNewCheck('');
                  saveMonthly(notes, next);
                }
              }}
              placeholder="Add checklist item..."
            />
            <button
              className="btn-primary"
              onClick={() => {
                if (!newCheck.trim()) return;
                const next = [...checklist, { text: newCheck.trim(), completed: false }];
                setChecklist(next);
                setNewCheck('');
                saveMonthly(notes, next);
              }}
            >
              Add Item
            </button>
          </div>
        </section>
      </div>

      {/* Event Create / Edit Modal */}
      {showEventModal && (
        <div className="planner-modal-backdrop" onMouseDown={() => setShowEventModal(false)}>
          <div className="planner-modal monthly-event-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="monthly-event-modal__header">
              <h3>{modalMode === 'create' ? 'Add Event' : 'Edit Event'}</h3>
              {modalMode === 'edit' && (
                <button className="planner-danger" onClick={handleDeleteModalItem}>
                  Delete
                </button>
              )}
            </div>

            {/* Event Type selector (for create) */}
            {modalMode === 'create' && (
              <div className="modal-event-type-tabs">
                <button
                  type="button"
                  className={`modal-type-btn ${selectedEventType === 'time-block' ? 'active' : ''}`}
                  onClick={() => setSelectedEventType('time-block')}
                >
                  ⏰ Scheduled Time Block
                </button>
                <button
                  type="button"
                  className={`modal-type-btn ${selectedEventType === 'calendar-event' ? 'active' : ''}`}
                  onClick={() => setSelectedEventType('calendar-event')}
                >
                  📅 All-Day / Range Event
                </button>
              </div>
            )}

            <div className="planner-form">
              <div className="planner-form-row">
                <label>
                  Start Date
                  <input
                    type="date"
                    value={editItem.date}
                    onChange={(e) => setEditItem((prev) => ({ ...prev, date: e.currentTarget.value }))}
                  />
                </label>
                {selectedEventType === 'calendar-event' && (
                  <label>
                    End Date
                    <input
                      type="date"
                      value={editItem.endDate || editItem.date}
                      onChange={(e) => setEditItem((prev) => ({ ...prev, endDate: e.currentTarget.value }))}
                    />
                  </label>
                )}
                <label>
                  Category
                  <select
                    value={editItem.category}
                    onChange={(e) => setEditItem((prev) => ({ ...prev, category: e.currentTarget.value }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedEventType === 'time-block' && (
                <div className="planner-form-row">
                  <label>
                    Start Time
                    <input
                      type="time"
                      value={editItem.startTime}
                      onChange={(e) => setEditItem((prev) => ({ ...prev, startTime: e.currentTarget.value }))}
                    />
                  </label>
                  <label>
                    End Time
                    <input
                      type="time"
                      value={editItem.endTime}
                      onChange={(e) => setEditItem((prev) => ({ ...prev, endTime: e.currentTarget.value }))}
                    />
                  </label>
                </div>
              )}

              <label>
                Title / Activity
                <input
                  type="text"
                  value={editItem.title}
                  onChange={(e) => setEditItem((prev) => ({ ...prev, title: e.currentTarget.value }))}
                  placeholder="e.g. Team Planning Session"
                  autoFocus
                />
              </label>

              <label>
                Notes (optional)
                <textarea
                  rows={2}
                  value={editItem.notes}
                  onChange={(e) => setEditItem((prev) => ({ ...prev, notes: e.currentTarget.value }))}
                  placeholder="Details, location, link..."
                />
              </label>
            </div>

            <div className="monthly-event-modal__actions">
              <button className="btn-secondary" onClick={() => setShowEventModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveModal} disabled={isSaving}>
                {modalMode === 'create' ? 'Create Event' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MonthlyPage;


