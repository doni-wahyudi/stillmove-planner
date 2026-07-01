import { useCallback, useEffect, useMemo, useState } from 'react';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/Toast/Toast';
import '../PlannerPages.css';

type ChecklistItem = { text: string; completed: boolean };

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthDates(year: number, monthIndex: number): Date[] {
  const count = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: count }, (_, index) => new Date(year, monthIndex, index + 1));
}

function normalizeChecklist(value: any): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) =>
    typeof item === 'string'
      ? { text: item, completed: false }
      : { text: item.text || item.title || '', completed: Boolean(item.completed) }
  ).filter((item) => item.text);
}

export function MonthlyPage() {
  const { activeProfile } = useProfile();
  const { showToast } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheck, setNewCheck] = useState('');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [eventDate, setEventDate] = useState(toDateKey(now));
  const [eventTitle, setEventTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const dates = useMemo(() => monthDates(year, monthIndex), [monthIndex, year]);
  const startDate = toDateKey(dates[0]);
  const endDate = toDateKey(dates[dates.length - 1]);
  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const loadData = useCallback(async () => {
    if (!activeProfile) return;

    setIsLoading(true);
    try {
      const [monthly, nextBlocks, nextEvents] = await Promise.all([
        dataService.getMonthlyData(year, monthIndex + 1),
        dataService.getTimeBlocksRange(startDate, endDate),
        dataService.getCalendarEventsRange(startDate, endDate),
      ]);
      setNotes(monthly?.notes || '');
      setChecklist(normalizeChecklist(monthly?.checklist));
      setBlocks(nextBlocks);
      setEvents(nextEvents);
    } catch (error) {
      console.error('Failed to load monthly view:', error);
      showToast('Failed to load monthly planner', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, endDate, monthIndex, showToast, startDate, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveMonthly = async (nextNotes = notes, nextChecklist = checklist) => {
    try {
      await dataService.upsertMonthlyData({
        year,
        month: monthIndex + 1,
        notes: nextNotes,
        checklist: nextChecklist,
      });
      showToast('Monthly data saved', 'success');
    } catch (error) {
      console.error('Failed to save monthly data:', error);
      showToast('Failed to save monthly data', 'error');
    }
  };

  const addEvent = async () => {
    if (!eventTitle.trim()) return;
    try {
      const created = await dataService.createCalendarEvent({
        date: eventDate,
        title: eventTitle.trim(),
      });
      setEvents((prev) => [...prev, created]);
      setEventTitle('');
    } catch (error) {
      console.error('Failed to add calendar event:', error);
      showToast('Failed to add event', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading monthly planner...</p>
      </div>
    );
  }

  return (
    <div className="planner-page">
      <header className="planner-header">
        <div>
          <h2>Monthly Planner</h2>
          <p>{monthLabel}</p>
        </div>
        <div className="planner-header-actions">
          <button className="btn-secondary" onClick={() => {
            const next = new Date(year, monthIndex - 1, 1);
            setYear(next.getFullYear());
            setMonthIndex(next.getMonth());
          }}>Prev</button>
          <button className="btn-secondary" onClick={() => {
            const next = new Date();
            setYear(next.getFullYear());
            setMonthIndex(next.getMonth());
          }}>Today</button>
          <button className="btn-secondary" onClick={() => {
            const next = new Date(year, monthIndex + 1, 1);
            setYear(next.getFullYear());
            setMonthIndex(next.getMonth());
          }}>Next</button>
        </div>
      </header>

      <div className="planner-grid">
        <section className="planner-card planner-card--wide">
          <div className="planner-card-header">
            <h3>Calendar</h3>
            <span className="planner-muted">{blocks.length + events.length} items</span>
          </div>
          <div className="planner-calendar">
            {dates.map((date) => {
              const key = toDateKey(date);
              const dayBlocks = blocks.filter((block) => block.date === key);
              const dayEvents = events.filter((event) => event.date === key);
              return (
                <div className={`planner-calendar-day ${key === toDateKey(new Date()) ? 'today' : ''}`} key={key}>
                  <strong>{date.getDate()}</strong>
                  <div className="planner-pill-list">
                    {dayEvents.map((event) => <span className="planner-pill" key={event.id}>{event.title || event.name}</span>)}
                    {dayBlocks.map((block) => <span className="planner-pill" key={block.id}>{(block.start_time || '').slice(0, 5)} {block.activity}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="planner-card">
          <div className="planner-card-header">
            <h3>Monthly Notes</h3>
          </div>
          <div className="planner-form">
            <textarea value={notes} onChange={(event) => setNotes(event.currentTarget.value)} placeholder="Reflection, themes, reminders..." />
            <button className="btn-primary" onClick={() => saveMonthly()}>Save Notes</button>
          </div>
        </section>

        <section className="planner-card">
          <div className="planner-card-header">
            <h3>Checklist</h3>
            <span className="planner-muted">{checklist.filter((item) => item.completed).length}/{checklist.length}</span>
          </div>
          <div className="planner-list">
            {checklist.length === 0 ? <p className="planner-empty">No checklist items.</p> : checklist.map((item, index) => (
              <div className="planner-row" key={`${item.text}-${index}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(event) => {
                      const next = checklist.map((entry, entryIndex) => entryIndex === index ? { ...entry, completed: event.currentTarget.checked } : entry);
                      setChecklist(next);
                      saveMonthly(notes, next);
                    }}
                  />{' '}
                  <strong>{item.text}</strong>
                </label>
                <button className="planner-danger" onClick={() => {
                  const next = checklist.filter((_, entryIndex) => entryIndex !== index);
                  setChecklist(next);
                  saveMonthly(notes, next);
                }}>x</button>
              </div>
            ))}
          </div>
          <div className="planner-form mt-2">
            <input value={newCheck} onChange={(event) => setNewCheck(event.currentTarget.value)} placeholder="Checklist item" />
            <button className="btn-primary" onClick={() => {
              if (!newCheck.trim()) return;
              const next = [...checklist, { text: newCheck.trim(), completed: false }];
              setChecklist(next);
              setNewCheck('');
              saveMonthly(notes, next);
            }}>Add Item</button>
          </div>
        </section>

        <section className="planner-card">
          <div className="planner-card-header">
            <h3>Add Event</h3>
          </div>
          <div className="planner-form">
            <label>Date<input type="date" value={eventDate} onChange={(event) => setEventDate(event.currentTarget.value)} /></label>
            <input value={eventTitle} onChange={(event) => setEventTitle(event.currentTarget.value)} placeholder="Event title" />
            <button className="btn-primary" onClick={addEvent}>Add Event</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default MonthlyPage;
