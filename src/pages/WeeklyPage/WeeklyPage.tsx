import { useCallback, useEffect, useMemo, useState } from 'react';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/Toast/Toast';
import '../PlannerPages.css';

type WeeklyGoal = any;
type TimeBlock = any;

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

export function WeeklyPage() {
  const { activeProfile } = useProfile();
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
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addGoal = async () => {
    if (!goalText.trim()) return;
    try {
      const created = await dataService.createWeeklyGoal({
        year,
        week_number: weekNumber,
        goal_text: goalText.trim(),
        priority,
        completed: false,
      });
      setGoals((prev) => [...prev, created]);
      setGoalText('');
    } catch (error) {
      console.error('Failed to create weekly goal:', error);
      showToast('Failed to add weekly goal', 'error');
    }
  };

  const addBlock = async () => {
    if (!activity.trim()) return;
    try {
      const created = await dataService.createTimeBlock({
        date: blockDate,
        start_time: startTime,
        end_time: endTime,
        activity: activity.trim(),
        category,
      });
      setBlocks((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)));
      setActivity('');
    } catch (error) {
      console.error('Failed to create time block:', error);
      showToast('Failed to add time block', 'error');
    }
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
          <h2>Weekly Planner</h2>
          <p>
            Week {weekNumber}: {toDateKey(weekStart)} to {toDateKey(weekEnd)}
          </p>
        </div>
        <div className="planner-header-actions">
          <button className="btn-secondary" onClick={() => setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() - 7))}>Prev</button>
          <button className="btn-secondary" onClick={() => setAnchorDate(new Date())}>Today</button>
          <button className="btn-secondary" onClick={() => setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() + 7))}>Next</button>
        </div>
      </header>

      <div className="planner-grid">
        <section className="planner-card">
          <div className="planner-card-header">
            <h3>Weekly Goals</h3>
            <span className="planner-muted">{goals.filter((goal) => goal.completed).length}/{goals.length}</span>
          </div>
          <div className="planner-list">
            {goals.length === 0 ? <p className="planner-empty">No goals for this week.</p> : goals.map((goal) => (
              <div className="planner-row" key={goal.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(goal.completed)}
                    onChange={async (event) => {
                      const completed = event.currentTarget.checked;
                      setGoals((prev) => prev.map((item) => item.id === goal.id ? { ...item, completed } : item));
                      await dataService.updateWeeklyGoal(goal.id, { completed });
                    }}
                  />{' '}
                  <strong>{goal.goal_text}</strong>
                </label>
                <button className="planner-danger" onClick={async () => {
                  await dataService.deleteWeeklyGoal(goal.id);
                  setGoals((prev) => prev.filter((item) => item.id !== goal.id));
                }}>x</button>
                <small>{goal.priority || 'Medium'}</small>
              </div>
            ))}
          </div>
          <div className="planner-form mt-2">
            <input value={goalText} onChange={(event) => setGoalText(event.currentTarget.value)} placeholder="New weekly goal" />
            <div className="planner-form-row">
              <select value={priority} onChange={(event) => setPriority(event.currentTarget.value)}>
                <option>Urgent</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <button className="btn-primary" onClick={addGoal}>Add Goal</button>
            </div>
          </div>
        </section>

        <section className="planner-card planner-card--wide">
          <div className="planner-card-header">
            <h3>Schedule</h3>
            <span className="planner-muted">{blocks.length} blocks</span>
          </div>
          <div className="planner-calendar">
            {weekDays.map((day) => {
              const dateKey = toDateKey(day);
              const dayBlocks = blocks.filter((block) => block.date === dateKey);
              return (
                <div className={`planner-calendar-day ${dateKey === toDateKey(new Date()) ? 'today' : ''}`} key={dateKey}>
                  <strong>{day.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</strong>
                  <div className="planner-pill-list">
                    {dayBlocks.map((block) => (
                      <span className="planner-pill" key={block.id} title={block.activity}>
                        {(block.start_time || '').slice(0, 5)} {block.activity}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="planner-card planner-card--full">
          <div className="planner-card-header">
            <h3>Add Time Block</h3>
          </div>
          <div className="planner-form">
            <div className="planner-form-row">
              <label>Date<input type="date" value={blockDate} onChange={(event) => setBlockDate(event.currentTarget.value)} /></label>
              <label>Category<select value={category} onChange={(event) => setCategory(event.currentTarget.value)}><option>Personal</option><option>Work</option><option>Business</option><option>Family</option><option>Education</option><option>Social</option><option>Project</option></select></label>
            </div>
            <div className="planner-form-row">
              <label>Start<input type="time" value={startTime} onChange={(event) => setStartTime(event.currentTarget.value)} /></label>
              <label>End<input type="time" value={endTime} onChange={(event) => setEndTime(event.currentTarget.value)} /></label>
            </div>
            <input value={activity} onChange={(event) => setActivity(event.currentTarget.value)} placeholder="Activity" />
            <button className="btn-primary" onClick={addBlock}>Add Time Block</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default WeeklyPage;
