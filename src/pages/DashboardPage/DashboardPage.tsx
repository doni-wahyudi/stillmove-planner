import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/Toast/Toast';
import './DashboardPage.css';

type WidgetId = 'today' | 'goals' | 'kanban' | 'actions' | 'calendar' | 'challenges' | 'stats';

const SETTINGS_KEY = 'stillmove_dashboard_widgets';
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const weekStart = () => { const date = new Date(); date.setDate(date.getDate() - date.getDay()); return dateKey(date); };

export function DashboardPage() {
  const { activeProfile } = useProfile();
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const WIDGETS: { id: WidgetId; titleKey: string }[] = useMemo(() => [
    { id: 'today', titleKey: 'dashboard.todayHabits' },
    { id: 'goals', titleKey: 'dashboard.goalsSummary' },
    { id: 'kanban', titleKey: 'dashboard.kanbanCards' },
    { id: 'actions', titleKey: 'nav.actionPlan' },
    { id: 'calendar', titleKey: 'monthly.title' },
    { id: 'challenges', titleKey: 'habits.challengesTab' },
    { id: 'stats', titleKey: 'common.overview' },
  ], []);

  const [data, setData] = useState<any>({ habits: [], completions: [], goals: [], blocks: [], boards: [], cards: [], sessions: [], books: [], challenges: [] });
  const [visible, setVisible] = useState<Record<WidgetId, boolean>>(() => ({ today: true, goals: true, kanban: true, actions: true, calendar: true, challenges: true, stats: true, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }));
  const [showSettings, setShowSettings] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const [habits, completions, goals, blocks, boards, sessions, books, challenges] = await Promise.all([
        dataService.getDailyHabits(),
        dataService.getDailyHabitCompletions(dateKey(now), dateKey(now)),
        dataService.getAnnualGoals(now.getFullYear()),
        dataService.getTimeBlocksRange(dateKey(start), dateKey(end)),
        dataService.getKanbanBoards(),
        dataService.getPomodoroSessionsRange(weekStart(), dateKey(now)),
        dataService.getReadingList(now.getFullYear()),
        dataService.getIntervalChallenges()
      ]);
      const cards = boards[0] ? await dataService.getKanbanCards(boards[0].id) : [];
      setData({ habits, completions, goals, blocks, boards, cards, sessions, books, challenges });
    } catch (error) {
      console.error(error);
      showToast(t('common.noData'), 'error');
    } finally {
      setLoading(false);
    }
  }, [activeProfile, showToast, t]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(visible)); }, [visible]);

  const today = dateKey(new Date());
  const completedHabits = data.completions.filter((item: any) => item.completed !== false).length;
  const doneCards = data.cards.filter((item: any) => /done|complete/i.test(item.column_title || '')).length;
  const monthDays = useMemo(() => Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate() }, (_, index) => new Date(calendarDate.getFullYear(), calendarDate.getMonth(), index + 1)), [calendarDate]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greetingMorning');
    if (hour < 18) return t('dashboard.greetingAfternoon');
    return t('dashboard.greetingEvening');
  }, [t]);

  const widget = (id: WidgetId, content: React.ReactNode) => visible[id] ? (
    <section className={`dashboard-widget dashboard-widget--${id}`} key={id}>
      <div className="dashboard-widget-header">
        <h3>{t(WIDGETS.find((item) => item.id === id)?.titleKey || '')}</h3>
      </div>
      {content}
    </section>
  ) : null;

  if (loading) return <div className="dashboard-loading"><div className="spinner" /><p>{t('common.loading')}</p></div>;

  const dateLocale = language === 'id' ? 'id-ID' : 'en-US';

  return (
    <div className="dashboard-view">
      <header className="dashboard-header">
        <div>
          <h2 className="greeting">{greeting}, {activeProfile?.name || 'there'}</h2>
          <p className="date-display">
            {new Date().toLocaleDateString(dateLocale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="dashboard-header-actions">
          <button className="btn-secondary" onClick={load}>{t('common.refresh')}</button>
          <button className="btn-secondary" onClick={() => setShowSettings(true)}>{t('dashboard.widgets')}</button>
        </div>
      </header>

      <div className="dashboard-grid-rich">
        {widget('today', (
          <div className="dashboard-list">
            <strong>{completedHabits}/{data.habits.length} {t('dashboard.completed')}</strong>
            {data.blocks.filter((item: any) => item.date === today).slice(0, 4).map((item: any) => (
              <span key={item.id}>{(item.start_time || '').slice(0, 5)} {item.activity}</span>
            ))}
            {data.blocks.filter((item: any) => item.date === today).length === 0 && <span>No time blocks scheduled today.</span>}
          </div>
        ))}

        {widget('goals', (
          <div className="dashboard-list">
            {data.goals.slice(0, 5).map((goal: any) => (
              <div key={goal.id}>
                <span>{goal.title}</span>
                <div className="dashboard-progress"><i style={{ width: `${goal.progress || 0}%` }} /></div>
              </div>
            ))}
            {data.goals.length === 0 && <span>{t('common.noData')}</span>}
          </div>
        ))}

        {widget('kanban', (
          <div className="dashboard-list">
            <select className="dashboard-select" onChange={async (event) => { const cards = await dataService.getKanbanCards(event.currentTarget.value); setData((prev: any) => ({ ...prev, cards })); }}>
              <option value="">{data.boards[0]?.title || 'No board selected'}</option>
              {data.boards.slice(1).map((board: any) => <option key={board.id} value={board.id}>{board.title}</option>)}
            </select>
            <strong>{data.cards.length} cards</strong>
            <span>{data.cards.filter((item: any) => item.priority === 'high').length} high priority</span>
            <button className="btn-secondary" onClick={() => navigate('/kanban')}>{t('dashboard.openBoard')}</button>
          </div>
        ))}

        {widget('actions', (
          <div className="dashboard-quick-actions">
            <button onClick={() => navigate('/pomodoro')}>Pomodoro</button>
            <button onClick={() => navigate('/habits')}>Habits</button>
            <button onClick={() => navigate('/kanban')}>Kanban</button>
            <button onClick={() => navigate('/events')}>Events</button>
          </div>
        ))}

        {widget('calendar', (
          <div>
            <div className="dashboard-calendar-nav">
              <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}>Prev</button>
              <strong>{calendarDate.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })}</strong>
              <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}>Next</button>
            </div>
            <div className="dashboard-calendar">
              {monthDays.map((date) => {
                const key = dateKey(date);
                return (
                  <button className={key === today ? 'today' : ''} key={key} onClick={() => navigate('/monthly')}>
                    {date.getDate()}
                    <small>{data.blocks.filter((item: any) => item.date === key).length || ''}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {widget('challenges', (
          <div className="dashboard-list">
            {data.challenges.slice(0, 4).map((challenge: any) => (
              <div key={challenge.id}>
                <strong>{challenge.title}</strong>
                <span>{challenge.start_date} to {challenge.end_date}</span>
              </div>
            ))}
            {data.challenges.length === 0 && <span>{t('dashboard.noActiveChallenges')}</span>}
            <button className="btn-secondary" onClick={() => navigate('/habits')}>{t('dashboard.openHabits')}</button>
          </div>
        ))}

        {widget('stats', (
          <div className="dashboard-stat-list">
            <div><strong>{completedHabits}</strong><span>Habits today</span></div>
            <div><strong>{data.sessions.filter((item: any) => item.was_completed).length}</strong><span>Pomodoros</span></div>
            <div><strong>{doneCards}</strong><span>Cards done</span></div>
            <div><strong>{data.books.filter((item: any) => item.completed).length}/{data.books.length}</strong><span>Books</span></div>
          </div>
        ))}
      </div>

      {showSettings && (
        <div className="dashboard-dialog-backdrop" onMouseDown={() => setShowSettings(false)}>
          <section className="dashboard-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <h3>{t('dashboard.customizeWidgets')}</h3>
            {WIDGETS.map((item) => (
              <label key={item.id}>
                <input type="checkbox" checked={visible[item.id]} onChange={(event) => setVisible((prev) => ({ ...prev, [item.id]: event.currentTarget.checked }))} /> {t(item.titleKey)}
              </label>
            ))}
            <button className="btn-primary" onClick={() => setShowSettings(false)}>{t('common.save')}</button>
          </section>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;

