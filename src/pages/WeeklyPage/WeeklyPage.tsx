import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/Toast/Toast';
import '../PlannerPages.css';

type WeeklyGoal = any;
type DailyGoal = { id: string; text: string; completed: boolean; date: string };

interface TimeBlock {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  activity: string;
  category?: string;
  notes?: string | null;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getWeekStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const day = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return Math.ceil((day + start.getDay() + 1) / 7);
}

function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const HOUR_HEIGHT = 60; // px per hour in the grid
const GRID_START = 6;   // grid starts at 06:00
const GRID_END   = 23;  // grid ends at 23:00 (17 hours visible)
const HOURS = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);
const SCROLL_TO_HOUR = 7; // auto-scroll to 07:00 on mount

const CATEGORY_COLORS: Record<string, string> = {
  Personal:  '#8b5cf6',
  Work:      '#2563eb',
  Business:  '#0891b2',
  Family:    '#059669',
  Education: '#d97706',
  Social:    '#db2777',
  Project:   '#dc2626',
  Health:    '#16a34a',
  Other:     '#64748b',
};

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: '#dc2626',
  Medium: '#d97706',
  Low:    '#16a34a',
};

function blockStyle(block: TimeBlock, conflicts: Set<string>) {
  const start = Math.max(timeToMinutes(block.start_time), GRID_START * 60);
  const end   = Math.min(timeToMinutes(block.end_time),   GRID_END   * 60);
  const top   = ((start - GRID_START * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 20);
  const color = CATEGORY_COLORS[block.category || 'Other'] || '#64748b';
  const hasConflict = conflicts.has(block.id);
  return {
    top:    `${top}px`,
    height: `${height}px`,
    background: color,
    outline: hasConflict ? '2px solid #dc2626' : 'none',
  };
}

function findConflicts(dayBlocks: TimeBlock[]): Set<string> {
  const conflicts = new Set<string>();
  for (let i = 0; i < dayBlocks.length; i++) {
    for (let j = i + 1; j < dayBlocks.length; j++) {
      const a = dayBlocks[i], b = dayBlocks[j];
      const aStart = timeToMinutes(a.start_time), aEnd = timeToMinutes(a.end_time);
      const bStart = timeToMinutes(b.start_time), bEnd = timeToMinutes(b.end_time);
      if (aStart < bEnd && aEnd > bStart) {
        conflicts.add(a.id);
        conflicts.add(b.id);
      }
    }
  }
  return conflicts;
}

const EMPTY_EDIT: Partial<TimeBlock> & { id?: string } = {};
const CATEGORIES = ['Personal', 'Work', 'Business', 'Family', 'Education', 'Social', 'Project', 'Health', 'Other'];

// ── Daily Goals stored in localStorage (no new Supabase table needed) ──
const DAILY_GOALS_KEY = 'sm_daily_goals';

function loadDailyGoalsFromStorage(): DailyGoal[] {
  try {
    return JSON.parse(localStorage.getItem(DAILY_GOALS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveDailyGoalsToStorage(goals: DailyGoal[]) {
  localStorage.setItem(DAILY_GOALS_KEY, JSON.stringify(goals));
}

export function WeeklyPage() {
  const { activeProfile } = useProfile();
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [goalText, setGoalText] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [blockDate, setBlockDate] = useState(toDateKey(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [activity, setActivity] = useState('');
  const [category, setCategory] = useState('Personal');
  const [draggedBlockId, setDraggedBlockId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ── Daily Goals state ──
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>(loadDailyGoalsFromStorage);
  const [selectedDayKey, setSelectedDayKey] = useState(toDateKey(new Date()));
  const [dailyGoalText, setDailyGoalText] = useState('');

  // Schedule grid ref for auto-scroll
  const scheduleRef = useRef<HTMLDivElement>(null);

  // Edit modal
  const [editBlock, setEditBlock] = useState<Partial<TimeBlock> & { id?: string }>(EMPTY_EDIT);
  const [showEditModal, setShowEditModal] = useState(false);

  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    }),
    [weekStart]
  );
  const weekEnd = weekDays[6];
  const year = anchorDate.getFullYear();
  const weekNumber = getWeekNumber(anchorDate);

  const loadData = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const [nextGoals, nextBlocks] = await Promise.all([
        dataService.getWeeklyGoals(year, weekNumber),
        dataService.getTimeBlocksRange(toDateKey(weekStart), toDateKey(weekEnd)),
      ]);
      setGoals(nextGoals);
      setBlocks(nextBlocks);
    } catch (error) {
      console.error('Failed to load weekly view:', error);
      showToast('Failed to load weekly planner', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, showToast, weekEnd, weekNumber, weekStart, year]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-scroll schedule to SCROLL_TO_HOUR on mount / week change
  useEffect(() => {
    if (scheduleRef.current) {
      const scrollPx = (SCROLL_TO_HOUR - GRID_START) * HOUR_HEIGHT;
      scheduleRef.current.scrollTop = scrollPx;
    }
  }, [weekStart]);

  // ── Daily Goals helpers ──
  const todayDailyGoals = dailyGoals.filter((g) => g.date === selectedDayKey);

  const addDailyGoal = () => {
    const text = dailyGoalText.trim();
    if (!text) return;
    const newGoal: DailyGoal = {
      id: `dg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text,
      completed: false,
      date: selectedDayKey,
    };
    const updated = [...dailyGoals, newGoal];
    setDailyGoals(updated);
    saveDailyGoalsToStorage(updated);
    setDailyGoalText('');
  };

  const toggleDailyGoal = (id: string) => {
    const updated = dailyGoals.map((g) => g.id === id ? { ...g, completed: !g.completed } : g);
    setDailyGoals(updated);
    saveDailyGoalsToStorage(updated);
  };

  const deleteDailyGoal = (id: string) => {
    const updated = dailyGoals.filter((g) => g.id !== id);
    setDailyGoals(updated);
    saveDailyGoalsToStorage(updated);
  };

  // Weekly goals
  const addGoal = async () => {
    if (!goalText.trim()) return;
    try {
      const created = await dataService.createWeeklyGoal({ year, week_number: weekNumber, goal_text: goalText.trim(), priority, completed: false });
      setGoals((prev) => [...prev, created]);
      setGoalText('');
    } catch (error) {
      console.error(error);
      showToast('Failed to add weekly goal', 'error');
    }
  };

  const addBlock = async () => {
    if (!activity.trim()) return;
    setIsSaving(true);
    try {
      const created = await dataService.createTimeBlock({ date: blockDate, start_time: startTime, end_time: endTime, activity: activity.trim(), category });
      setBlocks((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)));
      setActivity('');
    } catch (error) {
      console.error(error);
      showToast('Failed to add time block', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const moveBlockToDay = async (date: string) => {
    const block = blocks.find((item) => item.id === draggedBlockId);
    if (!block || block.date === date) { setDraggedBlockId(''); return; }
    setBlocks((prev) => prev.map((item) => item.id === block.id ? { ...item, date } : item));
    try {
      await dataService.updateTimeBlock(block.id, { date });
      showToast('Time block moved', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to move time block', 'error');
      loadData();
    } finally {
      setDraggedBlockId('');
    }
  };

  const openEdit = (block: TimeBlock) => {
    setEditBlock({ ...block });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editBlock.id) return;
    setIsSaving(true);
    const updates: Partial<TimeBlock> = {
      date: editBlock.date ?? '',
      start_time: editBlock.start_time ?? '',
      end_time: editBlock.end_time ?? '',
      activity: (editBlock.activity ?? '').trim(),
      category: editBlock.category,
      notes: editBlock.notes || null,
    };
    setBlocks((prev) => prev.map((b) => b.id === editBlock.id ? { ...b, ...updates } as TimeBlock : b));
    setShowEditModal(false);
    try {
      await dataService.updateTimeBlock(editBlock.id, updates);
    } catch (error) {
      console.error(error);
      showToast('Failed to save changes', 'error');
      loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBlock = async (id: string) => {
    if (!window.confirm('Delete this time block?')) return;
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setShowEditModal(false);
    try {
      await dataService.deleteTimeBlock(id);
      showToast('Time block deleted', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete', 'error');
      loadData();
    }
  };

  const duplicateBlock = async (block: TimeBlock) => {
    setShowEditModal(false);
    try {
      const created = await dataService.createTimeBlock({
        date: block.date,
        start_time: block.start_time,
        end_time: block.end_time,
        activity: `${block.activity} (copy)`,
        category: block.category,
        notes: block.notes,
      });
      setBlocks((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)));
      showToast('Time block duplicated', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to duplicate', 'error');
    }
  };

  const handleSlotClick = (date: string, hour: number) => {
    setBlockDate(date);
    setStartTime(minutesToTime(hour * 60));
    setEndTime(minutesToTime((hour + 1) * 60));
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading weekly planner...</p>
      </div>
    );
  }

  return (
    <div className="planner-page">
      <header className="planner-header">
        <div>
          <h2>{t('weekly.title')}</h2>
          <p>Week {weekNumber}: {toDateKey(weekStart)} – {toDateKey(weekEnd)}</p>
        </div>
        <div className="planner-header-actions">
          <button className="btn-secondary" onClick={() => setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() - 7))}>{t('weekly.prevWeek')}</button>
          <button className="btn-secondary" onClick={() => setAnchorDate(new Date())}>{t('habits.jumpToday')}</button>
          <button className="btn-secondary" onClick={() => setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() + 7))}>{t('weekly.nextWeek')}</button>
        </div>
      </header>

      <div className="planner-grid">
        {/* Weekly Goals */}
        <section className="planner-card">
          <div className="planner-card-header">
            <h3>{language === 'id' ? '🎯 Target Mingguan' : '🎯 Weekly Goals'}</h3>
            <span className="planner-muted">{goals.filter((g) => g.completed).length}/{goals.length}</span>
          </div>
          <div className="planner-list">
            {goals.length === 0
              ? <p className="planner-empty">{language === 'id' ? 'Belum ada target minggu ini.' : 'No goals for this week.'}</p>
              : goals.map((goal) => (
                <div className="planner-row" key={goal.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(goal.completed)}
                      onChange={async (e) => {
                        const completed = e.currentTarget.checked;
                        setGoals((prev) => prev.map((item) => item.id === goal.id ? { ...item, completed } : item));
                        await dataService.updateWeeklyGoal(goal.id, { completed });
                      }}
                    />{' '}
                    <strong style={{ textDecoration: goal.completed ? 'line-through' : 'none' }}>{goal.goal_text}</strong>
                  </label>
                  <button className="planner-danger" onClick={async () => {
                    await dataService.deleteWeeklyGoal(goal.id);
                    setGoals((prev) => prev.filter((item) => item.id !== goal.id));
                  }}>×</button>
                  <small style={{ color: PRIORITY_COLORS[goal.priority] || '#64748b', gridColumn: '1/-1', fontWeight: 700 }}>
                    {goal.priority || 'Medium'}
                  </small>
                </div>
              ))
            }
          </div>
          <div className="planner-form mt-2">
            <input value={goalText} onChange={(e) => setGoalText(e.currentTarget.value)} placeholder={language === 'id' ? 'Target minggu baru...' : 'New weekly goal...'} onKeyDown={(e) => e.key === 'Enter' && addGoal()} />
            <div className="planner-form-row">
              <select value={priority} onChange={(e) => setPriority(e.currentTarget.value)}>
                <option>Urgent</option><option>Medium</option><option>Low</option>
              </select>
              <button className="btn-primary" onClick={addGoal}>{language === 'id' ? 'Tambah' : 'Add Goal'}</button>
            </div>
          </div>
        </section>

        {/* ── Daily Goals Card ── */}
        <section className="planner-card weekly-daily-goals-card">
          <div className="planner-card-header">
            <h3>{language === 'id' ? '📋 Target Harian' : '📋 Daily Goals'}</h3>
            <span className="planner-muted">
              {todayDailyGoals.filter((g) => g.completed).length}/{todayDailyGoals.length}
            </span>
          </div>

          {/* Day selector tabs */}
          <div className="daily-goals-day-tabs">
            {weekDays.map((day) => {
              const key = toDateKey(day);
              const isToday = key === toDateKey(new Date());
              const dayGoals = dailyGoals.filter((g) => g.date === key);
              const doneCount = dayGoals.filter((g) => g.completed).length;
              const isSelected = key === selectedDayKey;
              return (
                <button
                  key={key}
                  className={`daily-goals-day-tab ${isSelected ? 'active' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => setSelectedDayKey(key)}
                  title={key}
                >
                  <span className="day-tab-label">
                    {day.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'narrow' })}
                  </span>
                  <span className="day-tab-date">{day.getDate()}</span>
                  {dayGoals.length > 0 && (
                    <span className={`day-tab-badge ${doneCount === dayGoals.length ? 'done' : ''}`}>
                      {doneCount}/{dayGoals.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Goals list for selected day */}
          <div className="planner-list daily-goals-list">
            {todayDailyGoals.length === 0
              ? <p className="planner-empty" style={{ fontSize: '0.8rem', padding: '12px' }}>
                  {language === 'id' ? 'Tidak ada target untuk hari ini.' : 'No tasks for this day.'}
                </p>
              : todayDailyGoals.map((g) => (
                <div className={`daily-goal-row ${g.completed ? 'completed' : ''}`} key={g.id}>
                  <label className="daily-goal-label">
                    <input
                      type="checkbox"
                      checked={g.completed}
                      onChange={() => toggleDailyGoal(g.id)}
                    />
                    <span>{g.text}</span>
                  </label>
                  <button className="planner-danger" style={{ fontSize: '0.75rem', minWidth: 28, minHeight: 28 }} onClick={() => deleteDailyGoal(g.id)}>×</button>
                </div>
              ))
            }
          </div>

          {/* Add goal input */}
          <div className="planner-form mt-2">
            <div className="planner-form-row">
              <input
                value={dailyGoalText}
                onChange={(e) => setDailyGoalText(e.currentTarget.value)}
                placeholder={language === 'id' ? 'Tambah target hari ini...' : 'Add a task for this day...'}
                onKeyDown={(e) => e.key === 'Enter' && addDailyGoal()}
              />
              <button className="btn-primary" onClick={addDailyGoal}>
                {language === 'id' ? '+' : '+'}
              </button>
            </div>
          </div>
        </section>

        {/* Time Slot Grid */}
        <section className="planner-card planner-card--wide weekly-schedule-card">
          <div className="planner-card-header">
            <h3>{language === 'id' ? 'Jadwal Mingguan' : 'Schedule'}</h3>
            <span className="planner-muted">{blocks.length} {language === 'id' ? 'blok' : 'blocks'} · {language === 'id' ? 'Scroll untuk navigasi' : 'Scroll to navigate'}</span>
          </div>

          <div className="weekly-grid-wrapper" ref={scheduleRef}>
            {/* Time axis */}
            <div className="weekly-time-axis">
              <div className="weekly-time-axis__header" />
              {HOURS.map((h) => (
                <div key={h} className="weekly-time-axis__hour" style={{ height: `${HOUR_HEIGHT}px` }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day) => {
              const dateKey = toDateKey(day);
              const dayBlocks = blocks.filter((b) => b.date === dateKey);
              const conflicts = findConflicts(dayBlocks);
              const isToday = dateKey === toDateKey(new Date());
              return (
                <div
                  key={dateKey}
                  className={`weekly-day-col ${isToday ? 'today' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => moveBlockToDay(dateKey)}
                >
                  {/* Day header */}
                  <div className={`weekly-day-col__header ${isToday ? 'today' : ''}`}>
                    <strong>{day.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'short' })}</strong>
                    <span>{day.getDate()}</span>
                  </div>

                  {/* Slot body */}
                  <div className="weekly-day-col__body" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="weekly-slot-line"
                        style={{ top: `${(h - GRID_START) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                        onClick={() => handleSlotClick(dateKey, h)}
                        title={`Add block at ${String(h).padStart(2, '0')}:00`}
                      />
                    ))}

                    {dayBlocks.map((block) => (
                      <button
                        key={block.id}
                        className="weekly-block"
                        style={blockStyle(block, conflicts)}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggedBlockId(block.id); }}
                        onClick={(e) => { e.stopPropagation(); openEdit(block); }}
                        title={`${block.start_time}–${block.end_time} ${block.activity}`}
                      >
                        <span className="weekly-block__time">{block.start_time.slice(0, 5)}–{block.end_time.slice(0, 5)}</span>
                        <span className="weekly-block__name">{block.activity}</span>
                        {block.category && <span className="weekly-block__cat">{block.category}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Add Time Block form */}
        <section className="planner-card planner-card--full">
          <div className="planner-card-header">
            <h3>{language === 'id' ? 'Tambah Blok Waktu' : 'Add Time Block'}</h3>
            <span className="planner-muted">{language === 'id' ? 'Klik slot jam pada jadwal untuk mengisi otomatis' : 'Click a slot on the grid to pre-fill date & time'}</span>
          </div>
          <div className="planner-form">
            <div className="planner-form-row">
              <label>{language === 'id' ? 'Tanggal' : 'Date'}<input type="date" value={blockDate} onChange={(e) => setBlockDate(e.currentTarget.value)} /></label>
              <label>{language === 'id' ? 'Kategori' : 'Category'}
                <select value={category} onChange={(e) => setCategory(e.currentTarget.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <div className="planner-form-row">
              <label>{language === 'id' ? 'Mulai' : 'Start'}<input type="time" value={startTime} onChange={(e) => setStartTime(e.currentTarget.value)} /></label>
              <label>{language === 'id' ? 'Selesai' : 'End'}<input type="time" value={endTime} onChange={(e) => setEndTime(e.currentTarget.value)} /></label>
            </div>
            <input value={activity} onChange={(e) => setActivity(e.currentTarget.value)} placeholder={language === 'id' ? 'Nama aktivitas' : 'Activity name'} onKeyDown={(e) => e.key === 'Enter' && addBlock()} />
            <button className="btn-primary" onClick={addBlock} disabled={isSaving}>{language === 'id' ? 'Tambah Blok Waktu' : 'Add Time Block'}</button>
          </div>
        </section>
      </div>

      {/* Edit / Delete / Duplicate Modal */}
      {showEditModal && editBlock.id && (
        <div className="planner-modal-backdrop" onMouseDown={() => setShowEditModal(false)}>
          <div className="planner-modal weekly-edit-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="weekly-edit-modal__header">
              <h3>{language === 'id' ? 'Ubah Blok Waktu' : 'Edit Time Block'}</h3>
              <button className="planner-danger" onClick={() => deleteBlock(editBlock.id!)}>{language === 'id' ? 'Hapus' : 'Delete'}</button>
            </div>

            <div className="planner-form">
              <div className="planner-form-row">
                <label>{language === 'id' ? 'Tanggal' : 'Date'}<input type="date" value={editBlock.date || ''} onChange={(e) => setEditBlock((prev) => ({ ...prev, date: e.currentTarget.value }))} /></label>
                <label>{language === 'id' ? 'Kategori' : 'Category'}
                  <select value={editBlock.category || 'Personal'} onChange={(e) => setEditBlock((prev) => ({ ...prev, category: e.currentTarget.value }))}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <div className="planner-form-row">
                <label>{language === 'id' ? 'Mulai' : 'Start'}<input type="time" value={editBlock.start_time || ''} onChange={(e) => setEditBlock((prev) => ({ ...prev, start_time: e.currentTarget.value }))} /></label>
                <label>{language === 'id' ? 'Selesai' : 'End'}<input type="time" value={editBlock.end_time || ''} onChange={(e) => setEditBlock((prev) => ({ ...prev, end_time: e.currentTarget.value }))} /></label>
              </div>
              <label>{language === 'id' ? 'Aktivitas' : 'Activity'}<input type="text" value={editBlock.activity || ''} onChange={(e) => setEditBlock((prev) => ({ ...prev, activity: e.currentTarget.value }))} /></label>
              <label>{language === 'id' ? 'Catatan' : 'Notes'}<textarea rows={2} value={editBlock.notes || ''} onChange={(e) => setEditBlock((prev) => ({ ...prev, notes: e.currentTarget.value }))} /></label>
            </div>

            <div className="weekly-edit-modal__actions">
              <button className="btn-secondary" onClick={() => duplicateBlock(editBlock as TimeBlock)}>{language === 'id' ? 'Duplikat' : 'Duplicate'}</button>
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>{language === 'id' ? 'Batal' : 'Cancel'}</button>
              <button className="btn-primary" onClick={saveEdit} disabled={isSaving}>{language === 'id' ? 'Simpan' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeklyPage;
