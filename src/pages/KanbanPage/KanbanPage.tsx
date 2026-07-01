import { useCallback, useEffect, useState } from 'react';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/Toast/Toast';
import '../PlannerPages.css';

const DEFAULT_COLUMNS = ['Backlog', 'In Progress', 'Done'];

export function KanbanPage() {
  const { activeProfile } = useProfile();
  const { showToast } = useToast();
  const [boards, setBoards] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [columns, setColumns] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [boardTitle, setBoardTitle] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [cardColumnId, setCardColumnId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isLoading, setIsLoading] = useState(true);

  const loadBoards = useCallback(async () => {
    if (!activeProfile) return;
    setIsLoading(true);
    try {
      const nextBoards = await dataService.getKanbanBoards();
      setBoards(nextBoards);
      setSelectedBoardId((current) => current || nextBoards[0]?.id || '');
    } catch (error) {
      console.error('Failed to load kanban boards:', error);
      showToast('Failed to load kanban boards', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, showToast]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const loadBoardData = useCallback(async () => {
    if (!selectedBoardId) {
      setColumns([]);
      setCards([]);
      return;
    }

    try {
      const [nextColumns, nextCards] = await Promise.all([
        dataService.getKanbanColumns(selectedBoardId),
        dataService.getKanbanCards(selectedBoardId),
      ]);
      setColumns(nextColumns);
      setCards(nextCards);
      setCardColumnId((current) => current || nextColumns[0]?.id || '');
    } catch (error) {
      console.error('Failed to load kanban board data:', error);
      showToast('Failed to load board details', 'error');
    }
  }, [selectedBoardId, showToast]);

  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  const createBoard = async () => {
    if (!boardTitle.trim()) return;
    try {
      const board = await dataService.createKanbanBoard({
        title: boardTitle.trim(),
        description: '',
        settings: {},
      });
      const createdColumns = [];
      for (let index = 0; index < DEFAULT_COLUMNS.length; index += 1) {
        createdColumns.push(await dataService.createKanbanColumn({
          board_id: board.id,
          title: DEFAULT_COLUMNS[index],
          order_index: index,
        }));
      }
      setBoards((prev) => [board, ...prev]);
      setSelectedBoardId(board.id);
      setColumns(createdColumns);
      setCards([]);
      setCardColumnId(createdColumns[0]?.id || '');
      setBoardTitle('');
    } catch (error) {
      console.error('Failed to create kanban board:', error);
      showToast('Failed to create board', 'error');
    }
  };

  const ensureDefaultColumns = async () => {
    if (!selectedBoardId) return;
    try {
      const created = [];
      for (let index = 0; index < DEFAULT_COLUMNS.length; index += 1) {
        created.push(await dataService.createKanbanColumn({
          board_id: selectedBoardId,
          title: DEFAULT_COLUMNS[index],
          order_index: index,
        }));
      }
      setColumns(created);
      setCardColumnId(created[0]?.id || '');
    } catch (error) {
      console.error('Failed to create columns:', error);
      showToast('Failed to create columns', 'error');
    }
  };

  const addCard = async () => {
    if (!selectedBoardId || !cardColumnId || !cardTitle.trim()) return;
    try {
      const created = await dataService.createKanbanCard({
        board_id: selectedBoardId,
        column_id: cardColumnId,
        title: cardTitle.trim(),
        priority,
        order_index: cards.filter((card) => card.column_id === cardColumnId).length,
        labels: [],
        is_backlog: false,
      });
      setCards((prev) => [...prev, created]);
      setCardTitle('');
    } catch (error) {
      console.error('Failed to create kanban card:', error);
      showToast('Failed to add card', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading kanban...</p>
      </div>
    );
  }

  return (
    <div className="planner-page">
      <header className="planner-header">
        <div>
          <h2>Kanban Boards</h2>
          <p>Board, columns, and cards migrated to React.</p>
        </div>
        <div className="planner-header-actions">
          <select className="planner-select" value={selectedBoardId} onChange={(event) => setSelectedBoardId(event.currentTarget.value)}>
            <option value="">Select board</option>
            {boards.map((board) => <option value={board.id} key={board.id}>{board.title}</option>)}
          </select>
        </div>
      </header>

      <div className="planner-grid">
        <section className="planner-card">
          <div className="planner-card-header"><h3>Create Board</h3></div>
          <div className="planner-form">
            <input value={boardTitle} onChange={(event) => setBoardTitle(event.currentTarget.value)} placeholder="Board title" />
            <button className="btn-primary" onClick={createBoard}>Create Board</button>
          </div>
        </section>

        <section className="planner-card planner-card--wide">
          <div className="planner-card-header">
            <h3>Add Card</h3>
            {selectedBoardId && columns.length === 0 && <button className="btn-secondary" onClick={ensureDefaultColumns}>Create Columns</button>}
          </div>
          <div className="planner-form">
            <input value={cardTitle} onChange={(event) => setCardTitle(event.currentTarget.value)} placeholder="Card title" />
            <div className="planner-form-row">
              <select value={cardColumnId} onChange={(event) => setCardColumnId(event.currentTarget.value)}>
                <option value="">Column</option>
                {columns.map((column) => <option value={column.id} key={column.id}>{column.title}</option>)}
              </select>
              <select value={priority} onChange={(event) => setPriority(event.currentTarget.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <button className="btn-primary" onClick={addCard}>Add Card</button>
          </div>
        </section>

        <section className="planner-card planner-card--full">
          <div className="planner-card-header">
            <h3>{boards.find((board) => board.id === selectedBoardId)?.title || 'Board'}</h3>
            <span className="planner-muted">{cards.length} cards</span>
          </div>
          {selectedBoardId ? (
            <div className="planner-board">
              {columns.map((column) => (
                <div className="planner-column" key={column.id}>
                  <h4>{column.title}</h4>
                  {cards.filter((card) => card.column_id === column.id).map((card) => (
                    <div className="planner-card-item" key={card.id}>
                      <strong>{card.title}</strong>
                      <small>{card.priority || 'medium'} priority</small>
                      <select value={card.column_id || ''} onChange={async (event) => {
                        const columnId = event.currentTarget.value;
                        setCards((prev) => prev.map((item) => item.id === card.id ? { ...item, column_id: columnId } : item));
                        await dataService.updateKanbanCard(card.id, { column_id: columnId });
                      }}>
                        {columns.map((option) => <option value={option.id} key={option.id}>{option.title}</option>)}
                      </select>
                      <button className="planner-danger" onClick={async () => {
                        await dataService.deleteKanbanCard(card.id);
                        setCards((prev) => prev.filter((item) => item.id !== card.id));
                      }}>Delete</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="planner-empty">Create or select a board.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default KanbanPage;
