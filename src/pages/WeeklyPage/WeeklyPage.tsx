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

interface QuickAdd {
  date: string;
  start_time: string;
  end_time: string;
  activity: string;
  category: string;
  notes: string;
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

const HOUR_HEIGHT = 60;
const GRID_START = 6;
const GRID_END   = 23;
const HOURS = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);
const SCROLL_TO_HOUR = 7;

const CATEGORY_COLORS: Record<string, string> = {
  Personal: '#8b5cf6', Work: '#2563eb', Business: '#0891b2', Family: '#059669',
  Education: '#d97706', Social: '#db2777', Project: '#dc2626', Health: '#16a34a', Other: '#64748b',
};
const PRIORITY_COLORS: Record<string, string> = { Urgent: '#dc2626', Medium: '#d97706', Low: '#16a34a' };

function blockStyle(block: TimeBlock, conflicts: Set<string>) {
  const start = Math.max(timeToMinutes(block.start_time), GRID_START * 60);
  const end   = Math.min(timeToMinutes(block.end_time),   GRID_END   * 60);
  const top   = ((start - GRID_START * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 20);
  return { top: `${top}px`, height: `${height}px`, background: CATEGORY_COLORS[block.category || 'Other'] || '#64748b', outline: conflicts.has(block.id) ? '2px solid #dc2626' : 'none' };
}
function findConflicts(dayBlocks: TimeBlock[]): Set<string> {
  const conflicts = new Set<string>();
  for (let i = 0; i < dayBlocks.length; i++)
    for (let j = i + 1; j < dayBlocks.length; j++) {
      const a = dayBlocks[i], b = dayBlocks[j];
      if (timeToMinutes(a.start_time) < timeToMinutes(b.end_time) && timeToMinutes(a.end_time) > timeToMinutes(b.start_time)) { conflicts.add(a.id); conflicts.add(b.id); }
    }
  return conflicts;
}

const EMPTY_EDIT: Partial<TimeBlock> & { id?: string } = {};
const EMPTY_QUICK: QuickAdd = { date: '', start_time: '', end_time: '', activity: '', category: 'Personal', notes: '' };
const CATEGORIES = ['Personal', 'Work', 'Business', 'Family', 'Education', 'Social', 'Project', 'Health', 'Other'];
const DAILY_GOALS_KEY = 'sm_daily_goals';
function loadDG(): DailyGoal[] { try { return JSON.parse(localStorage.getItem(DAILY_GOALS_KEY) || '[]'); } catch { return []; } }
function saveDG(goals: DailyGoal[]) { localStorage.setItem(DAILY_GOALS_KEY, JSON.stringify(goals)); }

export function WeeklyPage() {
  const { activeProfile } = useProfile();
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [goalText, setGoalText] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [draggedBlockId, setDraggedBlockId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>(loadDG);
  const [selectedDayKey, setSelectedDayKey] = useState(toDateKey(new Date()));
  const [dailyGoalText, setDailyGoalText] = useState('');
  const scheduleRef = useRef<HTMLDivElement>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);
  const [editBlock, setEditBlock] = useState<Partial<TimeBlock> & { id?: string }>(EMPTY_EDIT);
  const [showEditModal, setShowEditModal] = useState(false);
  const [quickAdd, setQuickAdd] = useState<QuickAdd>(EMPTY_QUICK);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate]);
  const weekDays  = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; }), [weekStart]);
  const weekEnd = weekDays[6];
  const year = anchorDate.getFullYear();
  const weekNumber = getWeekNumber(anchorDate);

  const loadData = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const [ng, nb] = await Promise.all([dataService.getWeeklyGoals(year, weekNumber), dataService.getTimeBlocksRange(toDateKey(weekStart), toDateKey(weekEnd))]);
      setGoals(ng || []); setBlocks(nb || []);
    } catch (err) { console.error(err); showToast('Failed to load weekly planner', 'error'); }
    finally { setIsLoading(false); }
  }, [activeProfile, showToast, weekEnd, weekNumber, weekStart, year]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (scheduleRef.current) scheduleRef.current.scrollTop = (SCROLL_TO_HOUR - GRID_START) * HOUR_HEIGHT; }, [weekStart]);
  useEffect(() => { if (showQuickAdd) setTimeout(() => quickInputRef.current?.focus(), 80); }, [showQuickAdd]);

  const isId = language === 'id';
  const todayDG = dailyGoals.filter((g) => g.date === selectedDayKey);
  const addDG = () => { const t2 = dailyGoalText.trim(); if (!t2) return; const u = [...dailyGoals, { id: `dg_${Date.now()}`, text: t2, completed: false, date: selectedDayKey }]; setDailyGoals(u); saveDG(u); setDailyGoalText(''); };
  const toggleDG = (id: string) => { const u = dailyGoals.map((g) => g.id === id ? { ...g, completed: !g.completed } : g); setDailyGoals(u); saveDG(u); };
  const deleteDG = (id: string) => { const u = dailyGoals.filter((g) => g.id !== id); setDailyGoals(u); saveDG(u); };

  const addGoal = async () => {
    if (!goalText.trim()) return;
    try { const c = await dataService.createWeeklyGoal({ year, week_number: weekNumber, goal_text: goalText.trim(), priority, completed: false }); setGoals((p) => [...p, c]); setGoalText(''); }
    catch (err) { console.error(err); showToast('Failed to add goal', 'error'); }
  };

  const openQA = (date: string, hour: number) => { setQuickAdd({ date, start_time: minutesToTime(hour * 60), end_time: minutesToTime((hour + 1) * 60), activity: '', category: 'Personal', notes: '' }); setShowQuickAdd(true); };
  const closeQA = () => { setShowQuickAdd(false); setQuickAdd(EMPTY_QUICK); };
  const saveQA = async () => {
    if (!quickAdd.activity.trim()) { quickInputRef.current?.focus(); return; }
    setIsSaving(true);
    try {
      const c = await dataService.createTimeBlock({ date: quickAdd.date, start_time: quickAdd.start_time, end_time: quickAdd.end_time, activity: quickAdd.activity.trim(), category: quickAdd.category, notes: quickAdd.notes || null });
      setBlocks((p) => [...p, c].sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)));
      closeQA(); showToast(isId ? 'Blok waktu ditambahkan!' : 'Time block added!', 'success');
    } catch (err) { console.error(err); showToast('Failed to add time block', 'error'); }
    finally { setIsSaving(false); }
  };

  const moveBlock = async (date: string) => {
    const block = blocks.find((b) => b.id === draggedBlockId);
    if (!block || block.date === date) { setDraggedBlockId(''); return; }
    setBlocks((p) => p.map((b) => b.id === block.id ? { ...b, date } : b));
    try { await dataService.updateTimeBlock(block.id, { date }); showToast('Moved', 'success'); }
    catch (err) { console.error(err); loadData(); }
    finally { setDraggedBlockId(''); }
  };

  const openEdit = (block: TimeBlock) => { setEditBlock({ ...block }); setShowEditModal(true); };
  const saveEdit = async () => {
    if (!editBlock.id) return;
    setIsSaving(true);
    const upd: Partial<TimeBlock> = { date: editBlock.date ?? '', start_time: editBlock.start_time ?? '', end_time: editBlock.end_time ?? '', activity: (editBlock.activity ?? '').trim(), category: editBlock.category, notes: editBlock.notes || null };
    setBlocks((p) => p.map((b) => b.id === editBlock.id ? { ...b, ...upd } as TimeBlock : b)); setShowEditModal(false);
    try { await dataService.updateTimeBlock(editBlock.id, upd); }
    catch (err) { console.error(err); showToast('Failed to save', 'error'); loadData(); }
    finally { setIsSaving(false); }
  };

  const deleteBlock = async (id: string) => {
    if (!window.confirm(isId ? 'Hapus blok waktu ini?' : 'Delete this time block?')) return;
    setBlocks((p) => p.filter((b) => b.id !== id)); setShowEditModal(false);
    try { await dataService.deleteTimeBlock(id); showToast(isId ? 'Dihapus' : 'Deleted', 'success'); }
    catch (err) { console.error(err); loadData(); }
  };

  const dupBlock = async (block: TimeBlock) => {
    setShowEditModal(false);
    try { const c = await dataService.createTimeBlock({ ...block, activity: `${block.activity} (copy)` }); setBlocks((p) => [...p, c].sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))); showToast('Duplicated', 'success'); }
    catch (err) { console.error(err); }
  };

  if (isLoading) return <div className="dashboard-loading"><div className="spinner" /><p>Loading weekly planner...</p></div>;

  const todayKey = toDateKey(new Date());

  return (
    <div className="planner-page weekly-page-full">
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

      <div className="weekly-goals-row">
        <section className="planner-card">
          <div className="planner-card-header">
            <h3>🎯 {isId ? 'Target Mingguan' : 'Weekly Goals'}</h3>
            <span className="planner-muted">{goals.filter((g) => g.completed).length}/{goals.length}</span>
          </div>
          <div className="planner-list">
            {goals.length === 0
              ? <p className="planner-empty">{isId ? 'Belum ada target minggu ini.' : 'No goals for this week.'}</p>
              : goals.map((goal) => (
                <div className="planner-row" key={goal.id}>
                  <label>
                    <input type="checkbox" checked={Boolean(goal.completed)} onChange={async (e) => { const c = e.target.checked; setGoals((p) => p.map((x) => x.id === goal.id ? { ...x, completed: c } : x)); await dataService.updateWeeklyGoal(goal.id, { completed: c }); }} />{' '}
                    <strong style={{ textDecoration: goal.completed ? 'line-through' : 'none' }}>{goal.goal_text}</strong>
                  </label>
                  <button className="planner-danger" onClick={async () => { await dataService.deleteWeeklyGoal(goal.id); setGoals((p) => p.filter((x) => x.id !== goal.id)); }}>×</button>
                  <small style={{ color: PRIORITY_COLORS[goal.priority] || '#64748b', gridColumn: '1/-1', fontWeight: 700 }}>{goal.priority || 'Medium'}</small>
                </div>
              ))}
          </div>
          <div className="planner-form mt-2">
            <input value={goalText} onChange={(e) => setGoalText(e.target.value)} placeholder={isId ? 'Target minggu baru...' : 'New weekly goal...'} onKeyDown={(e) => e.key === 'Enter' && addGoal()} />
            <div className="planner-form-row">
              <select value={priority} onChange={(e) => setPriority(e.target.value)}><option>Urgent</option><option>Medium</option><option>Low</option></select>
              <button className="btn-primary" onClick={addGoal}>{isId ? 'Tambah' : 'Add Goal'}</button>
            </div>
          </div>
        </section>

        <section className="planner-card weekly-daily-goals-card">
          <div className="planner-card-header">
            <h3>📋 {isId ? 'Target Harian' : 'Daily Goals'}</h3>
            <span className="planner-muted">{todayDG.filter((g) => g.completed).length}/{todayDG.length}</span>
          </div>
          <div className="daily-goals-day-tabs">
            {weekDays.map((day) => {
              const key = toDateKey(day);
              const dg = dailyGoals.filter((g) => g.date === key);
              const dc = dg.filter((g) => g.completed).length;
              return (
                <button key={key} className={`daily-goals-day-tab${key === selectedDayKey ? ' active' : ''}${key === todayKey ? ' today' : ''}`} onClick={() => setSelectedDayKey(key)} title={key}>
                  <span className="day-tab-label">{day.toLocaleDateString(isId ? 'id-ID' : 'en-US', { weekday: 'narrow' })}</span>
                  <span className="day-tab-date">{day.getDate()}</span>
                  {dg.length > 0 && <span className={`day-tab-badge${dc === dg.length ? ' done' : ''}`}>{dc}/{dg.length}</span>}
                </button>
              );
            })}
          </div>
          <div className="planner-list daily-goals-list">
            {todayDG.length === 0
              ? <p className="planner-empty" style={{ fontSize: '0.8rem', padding: '12px' }}>{isId ? 'Tidak ada target untuk hari ini.' : 'No tasks for this day.'}</p>
              : todayDG.map((g) => (
                <div className={`daily-goal-row${g.completed ? ' completed' : ''}`} key={g.id}>
                  <label className="daily-goal-label"><input type="checkbox" checked={g.completed} onChange={() => toggleDG(g.id)} /><span>{g.text}</span></label>
                  <button className="planner-danger" style={{ minWidth: 28, minHeight: 28 }} onClick={() => deleteDG(g.id)}>×</button>
                </div>
              ))}
          </div>
          <div className="planner-form mt-2">
            <div className="planner-form-row">
              <input value={dailyGoalText} onChange={(e) => setDailyGoalText(e.target.value)} placeholder={isId ? 'Tambah target hari ini...' : 'Add a task...'} onKeyDown={(e) => e.key === 'Enter' && addDG()} />
              <button className="btn-primary" onClick={addDG}>+</button>
            </div>
          </div>
        </section>
      </div>

      <section className="planner-card weekly-schedule-full">
        <div className="planner-card-header">
          <h3>{isId ? 'Jadwal Mingguan' : 'Weekly Schedule'}</h3>
          <span className="planner-muted">{blocks.length} {isId ? 'blok' : 'blocks'} · {isId ? 'Klik slot kosong untuk tambah aktivitas' : 'Click any empty slot to add an activity'}</span>
        </div>
        <div className="weekly-grid-wrapper" ref={scheduleRef}>
          <div className="weekly-time-axis">
            <div className="weekly-time-axis__header" />
            {HOURS.map((h) => <div key={h} className="weekly-time-axis__hour" style={{ height: `${HOUR_HEIGHT}px` }}>{String(h).padStart(2, '0')}:00</div>)}
          </div>
          {weekDays.map((day) => {
            const dk = toDateKey(day);
            const db = blocks.filter((b) => b.date === dk);
            const cf = findConflicts(db);
            const isT = dk === todayKey;
            return (
              <div key={dk} className={`weekly-day-col${isT ? ' today' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={() => moveBlock(dk)}>
                <div className={`weekly-day-col__header${isT ? ' today' : ''}`}>
                  <strong>{day.toLocaleDateString(isId ? 'id-ID' : 'en-US', { weekday: 'short' })}</strong>
                  <span>{day.getDate()}</span>
                </div>
                <div className="weekly-day-col__body" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                  {HOURS.map((h) => <div key={h} className="weekly-slot-line" style={{ top: `${(h - GRID_START) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }} onClick={() => openQA(dk, h)} title={`${isId ? 'Tambah pukul' : 'Add at'} ${String(h).padStart(2, '0')}:00`} />)}
                  {db.map((block) => (
                    <button key={block.id} className="weekly-block" style={blockStyle(block, cf)} draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggedBlockId(block.id); }} onClick={(e) => { e.stopPropagation(); openEdit(block); }}>
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

      {showQuickAdd && (
        <div className="planner-modal-backdrop" onMouseDown={closeQA}>
          <div className="planner-modal weekly-quick-add-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="weekly-edit-modal__header">
              <h3>⚡ {isId ? 'Tambah Aktivitas' : 'Add Activity'}</h3>
              <button className="planner-danger" onClick={closeQA}>×</button>
            </div>
            <div className="quick-add-meta">
              <span className="quick-add-chip">📅 {quickAdd.date}</span>
              <span className="quick-add-chip">🕐 {quickAdd.start_time} – {quickAdd.end_time}</span>
            </div>
            <div className="planner-form">
              <input
                ref={quickInputRef}
                value={quickAdd.activity || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuickAdd((p) => ({ ...p, activity: val }));
                }}
                placeholder={isId ? 'Nama aktivitas...' : 'Activity name...'}
                onKeyDown={(e) => e.key === 'Enter' && saveQA()}
                className="quick-add-activity-input"
              />
              <div className="planner-form-row">
                <label>
                  {isId ? 'Mulai' : 'Start'}
                  <input
                    type="time"
                    value={quickAdd.start_time || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuickAdd((p) => ({ ...p, start_time: val }));
                    }}
                  />
                </label>
                <label>
                  {isId ? 'Selesai' : 'End'}
                  <input
                    type="time"
                    value={quickAdd.end_time || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuickAdd((p) => ({ ...p, end_time: val }));
                    }}
                  />
                </label>
              </div>
              <div className="quick-add-cat-row">
                <span className="quick-add-cat-label">{isId ? 'Kategori' : 'Category'}:</span>
                <div className="quick-add-cat-chips">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      className={`quick-add-cat-chip${quickAdd.category === cat ? ' active' : ''}`}
                      style={{ '--cat-color': CATEGORY_COLORS[cat] } as React.CSSProperties}
                      onClick={() => setQuickAdd((p) => ({ ...p, category: cat }))}
                      title={cat}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary,#64748b)' }}>
                {isId ? 'Catatan (opsional)' : 'Notes (optional)'}
                <textarea
                  rows={2}
                  value={quickAdd.notes || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuickAdd((p) => ({ ...p, notes: val }));
                  }}
                  placeholder={isId ? 'Tambah catatan...' : 'Add notes...'}
                  style={{ resize: 'vertical', minHeight: 56 }}
                />
              </label>
            </div>
            <div className="weekly-edit-modal__actions">
              <button className="btn-secondary" onClick={closeQA}>{isId ? 'Batal' : 'Cancel'}</button>
              <button className="btn-primary" onClick={saveQA} disabled={isSaving}>{isSaving ? '...' : (isId ? '+ Tambah' : '+ Add Block')}</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editBlock.id && (
        <div className="planner-modal-backdrop" onMouseDown={() => setShowEditModal(false)}>
          <div className="planner-modal weekly-edit-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="weekly-edit-modal__header">
              <h3>{isId ? 'Ubah Blok Waktu' : 'Edit Time Block'}</h3>
              <button className="planner-danger" onClick={() => deleteBlock(editBlock.id!)}>{isId ? 'Hapus' : 'Delete'}</button>
            </div>
            <div className="planner-form">
              <div className="planner-form-row">
                <label>
                  {isId ? 'Tanggal' : 'Date'}
                  <input
                    type="date"
                    value={editBlock.date || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditBlock((p) => ({ ...p, date: val }));
                    }}
                  />
                </label>
                <label>
                  {isId ? 'Kategori' : 'Category'}
                  <select
                    value={editBlock.category || 'Personal'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditBlock((p) => ({ ...p, category: val }));
                    }}
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <div className="planner-form-row">
                <label>
                  {isId ? 'Mulai' : 'Start'}
                  <input
                    type="time"
                    value={editBlock.start_time || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditBlock((p) => ({ ...p, start_time: val }));
                    }}
                  />
                </label>
                <label>
                  {isId ? 'Selesai' : 'End'}
                  <input
                    type="time"
                    value={editBlock.end_time || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditBlock((p) => ({ ...p, end_time: val }));
                    }}
                  />
                </label>
              </div>
              <label>
                {isId ? 'Aktivitas' : 'Activity'}
                <input
                  type="text"
                  value={editBlock.activity || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditBlock((p) => ({ ...p, activity: val }));
                  }}
                />
              </label>
              <label>
                {isId ? 'Catatan' : 'Notes'}
                <textarea
                  rows={2}
                  value={editBlock.notes || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditBlock((p) => ({ ...p, notes: val }));
                  }}
                />
              </label>
            </div>
            <div className="weekly-edit-modal__actions">
              <button className="btn-secondary" onClick={() => dupBlock(editBlock as TimeBlock)}>{isId ? 'Duplikat' : 'Duplicate'}</button>
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>{isId ? 'Batal' : 'Cancel'}</button>
              <button className="btn-primary" onClick={saveEdit} disabled={isSaving}>{isId ? 'Simpan' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeklyPage;
