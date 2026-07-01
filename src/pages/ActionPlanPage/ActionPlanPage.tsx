import { useCallback, useEffect, useMemo, useState } from 'react';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/Toast/Toast';
import '../PlannerPages.css';

const LIFE_AREAS = ['Personal', 'Work', 'Health', 'Family', 'Learning', 'Finance', 'Social'];

export function ActionPlanPage() {
  const { activeProfile } = useProfile();
  const { showToast } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [plans, setPlans] = useState<any[]>([]);
  const [lifeArea, setLifeArea] = useState('Personal');
  const [action, setAction] = useState('');
  const [frequency, setFrequency] = useState('Weekly');
  const [criteria, setCriteria] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const monthLabel = useMemo(
    () => new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [month, year]
  );

  const loadData = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      setPlans(await dataService.getActionPlans(year, month));
    } catch (error) {
      console.error('Failed to load action plans:', error);
      showToast('Failed to load action plans', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, month, showToast, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addPlan = async () => {
    if (!action.trim()) return;
    try {
      const created = await dataService.createActionPlan({
        year,
        month,
        life_area: lifeArea,
        specific_action: action.trim(),
        frequency,
        success_criteria: criteria.trim(),
        progress: 0,
      });
      setPlans((prev) => [...prev, created]);
      setAction('');
      setCriteria('');
    } catch (error) {
      console.error('Failed to create action plan:', error);
      showToast('Failed to add action', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading action plan...</p>
      </div>
    );
  }

  return (
    <div className="planner-page">
      <header className="planner-header">
        <div>
          <h2>Action Plan</h2>
          <p>{monthLabel}</p>
        </div>
        <div className="planner-header-actions">
          <input className="planner-select" type="month" value={`${year}-${String(month).padStart(2, '0')}`} onChange={(event) => {
            const [nextYear, nextMonth] = event.currentTarget.value.split('-').map(Number);
            setYear(nextYear);
            setMonth(nextMonth);
          }} />
        </div>
      </header>

      <div className="planner-grid">
        <section className="planner-card planner-card--wide">
          <div className="planner-card-header">
            <h3>Actions by Life Area</h3>
            <span className="planner-muted">{plans.length} actions</span>
          </div>
          <div className="planner-list">
            {plans.length === 0 ? <p className="planner-empty">No action plans for this month.</p> : plans.map((plan) => (
              <div className="planner-row" key={plan.id}>
                <div>
                  <strong>{plan.specific_action}</strong>
                  <small>{plan.life_area} - {plan.frequency || 'No frequency'} - {plan.success_criteria || 'No criteria'}</small>
                  <div className="planner-progress"><span style={{ width: `${plan.progress || 0}%` }} /></div>
                </div>
                <button className="planner-danger" onClick={async () => {
                  await dataService.deleteActionPlan(plan.id);
                  setPlans((prev) => prev.filter((item) => item.id !== plan.id));
                }}>x</button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={plan.progress || 0}
                  onChange={async (event) => {
                    const progress = Number(event.currentTarget.value);
                    setPlans((prev) => prev.map((item) => item.id === plan.id ? { ...item, progress } : item));
                    await dataService.updateActionPlan(plan.id, { progress });
                  }}
                />
                <textarea
                  value={plan.evaluation || ''}
                  placeholder="Evaluation notes"
                  onChange={(event) => setPlans((prev) => prev.map((item) => item.id === plan.id ? { ...item, evaluation: event.currentTarget.value } : item))}
                  onBlur={async (event) => dataService.updateActionPlan(plan.id, { evaluation: event.currentTarget.value })}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="planner-card">
          <div className="planner-card-header">
            <h3>Add Action</h3>
          </div>
          <div className="planner-form">
            <label>Life Area<select value={lifeArea} onChange={(event) => setLifeArea(event.currentTarget.value)}>{LIFE_AREAS.map((area) => <option key={area}>{area}</option>)}</select></label>
            <label>Frequency<input value={frequency} onChange={(event) => setFrequency(event.currentTarget.value)} /></label>
            <textarea value={action} onChange={(event) => setAction(event.currentTarget.value)} placeholder="Specific action" />
            <textarea value={criteria} onChange={(event) => setCriteria(event.currentTarget.value)} placeholder="Success criteria" />
            <button className="btn-primary" onClick={addPlan}>Add Action</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ActionPlanPage;
