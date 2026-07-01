import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dataService from '@/services/DataService';
import { Modal } from '@/components/Modal/Modal';
import { useToast } from '@/components/Toast/Toast';
import './QuickAddFAB.css';

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function QuickAddFAB() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [activity, setActivity] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isSaving, setIsSaving] = useState(false);

  const close = () => setIsOpen(false);

  const addHabit = async () => {
    if (!habitName.trim()) return;
    setIsSaving(true);
    try {
      await dataService.createDailyHabit({
        habit_name: habitName.trim(),
        order_index: Date.now(),
        is_active: true,
      });
      setHabitName('');
      showToast('Habit added', 'success');
      close();
      navigate('/habits');
    } catch (error) {
      console.error('Quick habit failed:', error);
      showToast('Failed to add habit', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addTimeBlock = async () => {
    if (!activity.trim()) return;
    setIsSaving(true);
    try {
      await dataService.createTimeBlock({
        date: toDateKey(new Date()),
        start_time: startTime,
        end_time: endTime,
        activity: activity.trim(),
        category: 'Personal',
      });
      setActivity('');
      showToast('Time block added', 'success');
      close();
      navigate('/weekly');
    } catch (error) {
      console.error('Quick time block failed:', error);
      showToast('Failed to add time block', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button className="quick-add-fab" onClick={() => setIsOpen(true)} aria-label="Quick add">
        +
      </button>
      <Modal isOpen={isOpen} onClose={close} title="Quick Add" size="medium">
        <div className="quick-add-panel">
          <section>
            <h3>Daily Habit</h3>
            <input
              value={habitName}
              onChange={(event) => setHabitName(event.currentTarget.value)}
              placeholder="Habit name"
            />
            <button className="btn-primary" onClick={addHabit} disabled={isSaving}>
              Add Habit
            </button>
          </section>
          <section>
            <h3>Time Block</h3>
            <input
              value={activity}
              onChange={(event) => setActivity(event.currentTarget.value)}
              placeholder="Activity"
            />
            <div className="quick-add-times">
              <input type="time" value={startTime} onChange={(event) => setStartTime(event.currentTarget.value)} />
              <input type="time" value={endTime} onChange={(event) => setEndTime(event.currentTarget.value)} />
            </div>
            <button className="btn-primary" onClick={addTimeBlock} disabled={isSaving}>
              Add Time Block
            </button>
          </section>
          <section>
            <h3>Focus</h3>
            <button className="btn-secondary" onClick={() => { close(); navigate('/pomodoro'); }}>
              Open Pomodoro
            </button>
          </section>
        </div>
      </Modal>
    </>
  );
}

export default QuickAddFAB;
