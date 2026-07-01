import { useCallback, useEffect, useState } from 'react';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/Toast/Toast';
import '../PlannerPages.css';

export function AnnualPage() {
  const { activeProfile } = useProfile();
  const { showToast } = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [goals, setGoals] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Personal');
  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!activeProfile) return;

    setIsLoading(true);
    try {
      const [nextGoals, nextBooks] = await Promise.all([
        dataService.getAnnualGoals(year),
        dataService.getReadingList(year),
      ]);
      setGoals(nextGoals);
      setBooks(nextBooks);
    } catch (error) {
      console.error('Failed to load annual page:', error);
      showToast('Failed to load annual goals', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, showToast, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addGoal = async () => {
    if (!title.trim()) return;
    try {
      const created = await dataService.createAnnualGoal({
        year,
        title: title.trim(),
        category,
        progress: 0,
        sub_goals: [],
      });
      setGoals((prev) => [...prev, created]);
      setTitle('');
    } catch (error) {
      console.error('Failed to add annual goal:', error);
      showToast('Failed to add goal', 'error');
    }
  };

  const addBook = async () => {
    if (!bookTitle.trim()) return;
    try {
      const created = await dataService.createReadingListEntry({
        year,
        book_title: bookTitle.trim(),
        author: author.trim(),
        completed: false,
        order_index: books.length,
      });
      setBooks((prev) => [...prev, created]);
      setBookTitle('');
      setAuthor('');
    } catch (error) {
      console.error('Failed to add book:', error);
      showToast('Failed to add book', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading annual goals...</p>
      </div>
    );
  }

  return (
    <div className="planner-page">
      <header className="planner-header">
        <div>
          <h2>Annual Goals</h2>
          <p>{year} long-range goals, quarters, and reading progress.</p>
        </div>
        <div className="planner-header-actions">
          <button className="btn-secondary" onClick={() => setYear((value) => value - 1)}>Prev</button>
          <button className="btn-secondary" onClick={() => setYear(new Date().getFullYear())}>This Year</button>
          <button className="btn-secondary" onClick={() => setYear((value) => value + 1)}>Next</button>
        </div>
      </header>

      <div className="planner-grid">
        <section className="planner-card planner-card--wide">
          <div className="planner-card-header">
            <h3>Goals</h3>
            <span className="planner-muted">{goals.length} total</span>
          </div>
          <div className="planner-list">
            {goals.length === 0 ? <p className="planner-empty">No annual goals yet.</p> : goals.map((goal) => (
              <div className="planner-row" key={goal.id}>
                <div>
                  <strong>{goal.title}</strong>
                  <small>{goal.category}</small>
                  <div className="planner-progress"><span style={{ width: `${goal.progress || 0}%` }} /></div>
                </div>
                <button className="planner-danger" onClick={async () => {
                  await dataService.deleteAnnualGoal(goal.id);
                  setGoals((prev) => prev.filter((item) => item.id !== goal.id));
                }}>x</button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={goal.progress || 0}
                  onChange={async (event) => {
                    const progress = Number(event.currentTarget.value);
                    setGoals((prev) => prev.map((item) => item.id === goal.id ? { ...item, progress } : item));
                    await dataService.updateAnnualGoal(goal.id, { progress });
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="planner-card">
          <div className="planner-card-header">
            <h3>Add Goal</h3>
          </div>
          <div className="planner-form">
            <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} placeholder="Goal title" />
            <select value={category} onChange={(event) => setCategory(event.currentTarget.value)}>
              <option>Personal</option>
              <option>Work</option>
              <option>Business</option>
              <option>Family</option>
              <option>Education</option>
              <option>Social</option>
              <option>Project</option>
            </select>
            <button className="btn-primary" onClick={addGoal}>Add Goal</button>
          </div>
        </section>

        <section className="planner-card planner-card--wide">
          <div className="planner-card-header">
            <h3>Reading List</h3>
            <span className="planner-muted">{books.filter((book) => book.completed).length}/{books.length}</span>
          </div>
          <div className="planner-list">
            {books.length === 0 ? <p className="planner-empty">No books added.</p> : books.map((book) => (
              <div className="planner-row" key={book.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(book.completed)}
                    onChange={async (event) => {
                      const completed = event.currentTarget.checked;
                      setBooks((prev) => prev.map((item) => item.id === book.id ? { ...item, completed } : item));
                      await dataService.updateReadingListEntry(book.id, { completed });
                    }}
                  />{' '}
                  <strong>{book.book_title}</strong>
                </label>
                <button className="planner-danger" onClick={async () => {
                  await dataService.deleteReadingListEntry(book.id);
                  setBooks((prev) => prev.filter((item) => item.id !== book.id));
                }}>x</button>
                <small>{book.author || 'Unknown author'}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="planner-card">
          <div className="planner-card-header">
            <h3>Add Book</h3>
          </div>
          <div className="planner-form">
            <input value={bookTitle} onChange={(event) => setBookTitle(event.currentTarget.value)} placeholder="Book title" />
            <input value={author} onChange={(event) => setAuthor(event.currentTarget.value)} placeholder="Author" />
            <button className="btn-primary" onClick={addBook}>Add Book</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AnnualPage;
