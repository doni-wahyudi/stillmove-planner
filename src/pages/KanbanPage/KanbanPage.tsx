import { DragEvent, useCallback, useEffect, useMemo, useState } from 'react';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/Toast/Toast';
import '../PlannerPages.css';

const DEFAULT_COLUMNS = ['To do', 'In progress', 'Done'];

interface KanbanBoard {
  id: string;
  title: string;
  description?: string;
  settings?: any;
}

interface KanbanColumn {
  id: string;
  board_id: string;
  title: string;
  order_index: number;
  wip_limit?: number | null;
  color?: string;
}

interface KanbanCard {
  id: string;
  board_id: string;
  column_id: string | null;
  title: string;
  description?: string | null;
  priority: 'high' | 'medium' | 'low';
  labels?: string[];
  due_date?: string | null;
  is_backlog: boolean;
  order_index: number;
  created_at?: string;
}

interface ChecklistItem {
  id: string;
  card_id: string;
  text: string;
  is_completed: boolean;
  order_index?: number;
}

interface CardComment {
  id: string;
  card_id: string;
  text: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  card_id: string;
  action_type: string;
  action_data?: any;
  created_at: string;
}

export function KanbanPage() {
  const { activeProfile } = useProfile();
  const { showToast } = useToast();

  // Boards & structure state
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [boardId, setBoardId] = useState<string>('');
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Board management modal state
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [showEditBoardModal, setShowEditBoardModal] = useState(false);
  const [boardTitleInput, setBoardTitleInput] = useState('');
  const [boardDescInput, setBoardDescInput] = useState('');

  // Column management state
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnWip, setNewColumnWip] = useState<number | ''>('');

  // Quick card add state per column
  const [quickAddColumnId, setQuickAddColumnId] = useState<string | 'backlog' | null>(null);
  const [quickCardTitle, setQuickCardTitle] = useState('');

  // Backlog state
  const [isBacklogExpanded, setIsBacklogExpanded] = useState(true);

  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [dueDateFilter, setDueDateFilter] = useState<'all' | 'overdue' | 'today' | 'week' | 'none'>('all');

  // Drag state
  const [dragCardId, setDragCardId] = useState<string>('');
  const [dragColumnId, setDragColumnId] = useState<string>('');

  // Card detail modal state
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const [cardTitle, setCardTitle] = useState('');
  const [cardDesc, setCardDesc] = useState('');
  const [cardPriority, setCardPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [cardDueDate, setCardDueDate] = useState<string>('');
  const [cardColumnId, setCardColumnId] = useState<string | null>(null);
  const [cardIsBacklog, setCardIsBacklog] = useState(false);
  const [cardLabels, setCardLabels] = useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckText, setNewCheckText] = useState('');
  const [comments, setComments] = useState<CardComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [activity, setActivity] = useState<ActivityLog[]>([]);

  // Load Boards
  const loadBoards = useCallback(async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const data = await dataService.getKanbanBoards();
      setBoards(data || []);
      if (data && data.length > 0) {
        setBoardId((current) => current || data[0].id);
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
      showToast('Failed to load Kanban boards', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeProfile, showToast]);

  // Load single board data (columns + cards)
  const loadBoardData = useCallback(async (id: string) => {
    if (!id) {
      setColumns([]);
      setCards([]);
      return;
    }
    try {
      const [nextColumns, nextCards] = await Promise.all([
        dataService.getKanbanColumns(id),
        dataService.getKanbanCards(id),
      ]);
      setColumns(nextColumns || []);
      setCards(nextCards || []);
    } catch (error) {
      console.error('Failed to load board data:', error);
      showToast('Failed to load board data', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    if (boardId) {
      loadBoardData(boardId);
    }
  }, [boardId, loadBoardData]);

  // Available labels in active board
  const allLabels = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => {
      if (Array.isArray(c.labels)) {
        c.labels.forEach((l) => l.trim() && set.add(l.trim()));
      }
    });
    return Array.from(set).sort();
  }, [cards]);

  // Filtered cards calculation
  const filteredCards = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeekStr = nextWeekDate.toISOString().split('T')[0];

    return cards.filter((c) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesDesc = (c.description || '').toLowerCase().includes(q);
        const matchesLabel = Array.isArray(c.labels) && c.labels.some((l) => l.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesLabel) return false;
      }

      // 2. Priority
      if (priorityFilter !== 'all' && c.priority !== priorityFilter) {
        return false;
      }

      // 3. Label
      if (labelFilter !== 'all' && (!Array.isArray(c.labels) || !c.labels.includes(labelFilter))) {
        return false;
      }

      // 4. Due Date
      if (dueDateFilter === 'overdue') {
        if (!c.due_date || c.due_date >= todayStr) return false;
      } else if (dueDateFilter === 'today') {
        if (c.due_date !== todayStr) return false;
      } else if (dueDateFilter === 'week') {
        if (!c.due_date || c.due_date < todayStr || c.due_date > nextWeekStr) return false;
      } else if (dueDateFilter === 'none') {
        if (c.due_date) return false;
      }

      return true;
    });
  }, [cards, dueDateFilter, labelFilter, priorityFilter, searchQuery]);

  // Board CRUD
  const handleCreateBoard = async () => {
    if (!boardTitleInput.trim()) {
      showToast('Please enter a board title', 'warning');
      return;
    }
    try {
      const board = await dataService.createKanbanBoard({
        title: boardTitleInput.trim(),
        description: boardDescInput.trim() || null,
        settings: {},
      });
      const newCols = await Promise.all(
        DEFAULT_COLUMNS.map((title, order_index) =>
          dataService.createKanbanColumn({ board_id: board.id, title, order_index })
        )
      );
      setBoards((prev) => [board, ...prev]);
      setBoardId(board.id);
      setColumns(newCols);
      setCards([]);
      setShowCreateBoardModal(false);
      setBoardTitleInput('');
      setBoardDescInput('');
      showToast('Board created with default columns', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to create board', 'error');
    }
  };

  const handleUpdateBoard = async () => {
    if (!boardTitleInput.trim() || !boardId) return;
    try {
      const updated = await dataService.updateKanbanBoard(boardId, {
        title: boardTitleInput.trim(),
        description: boardDescInput.trim() || null,
      });
      setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, ...updated } : b)));
      setShowEditBoardModal(false);
      showToast('Board updated', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update board', 'error');
    }
  };

  const handleDeleteBoard = async () => {
    if (!boardId) return;
    if (!window.confirm('Delete this entire board and all its cards? This cannot be undone.')) return;
    try {
      await dataService.deleteKanbanBoard(boardId);
      const remaining = boards.filter((b) => b.id !== boardId);
      setBoards(remaining);
      setBoardId(remaining[0]?.id || '');
      setShowEditBoardModal(false);
      showToast('Board deleted', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete board', 'error');
    }
  };

  // Column CRUD
  const handleAddColumn = async () => {
    if (!newColumnTitle.trim() || !boardId) return;
    try {
      const created = await dataService.createKanbanColumn({
        board_id: boardId,
        title: newColumnTitle.trim(),
        order_index: columns.length,
        wip_limit: newColumnWip === '' ? null : Number(newColumnWip),
      });
      setColumns((prev) => [...prev, created]);
      setNewColumnTitle('');
      setNewColumnWip('');
      setShowAddColumn(false);
      showToast('Column added', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to add column', 'error');
    }
  };

  const handleDeleteColumn = async (colId: string) => {
    const colCards = cards.filter((c) => c.column_id === colId && !c.is_backlog);
    const msg = colCards.length > 0
      ? `Delete column "${columns.find((c) => c.id === colId)?.title}"? ${colCards.length} card(s) will be moved to the backlog.`
      : 'Delete this column?';
    if (!window.confirm(msg)) return;

    try {
      // Move existing cards to backlog
      if (colCards.length > 0) {
        await Promise.all(
          colCards.map((c) => dataService.updateKanbanCard(c.id, { column_id: null, is_backlog: true }))
        );
        setCards((prev) =>
          prev.map((c) => (c.column_id === colId ? { ...c, column_id: null, is_backlog: true } : c))
        );
      }
      await dataService.deleteKanbanColumn(colId);
      setColumns((prev) => prev.filter((c) => c.id !== colId));
      showToast('Column deleted', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete column', 'error');
    }
  };

  const handleUpdateColumnWip = async (colId: string, limitStr: string) => {
    const limit = limitStr.trim() === '' ? null : Math.max(0, parseInt(limitStr, 10));
    try {
      await dataService.updateKanbanColumn(colId, { wip_limit: limit });
      setColumns((prev) => prev.map((c) => (c.id === colId ? { ...c, wip_limit: limit } : c)));
      showToast('WIP limit updated', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update WIP limit', 'error');
    }
  };

  // Quick Card Add
  const handleQuickAddCard = async (columnId: string | null, isBacklog: boolean) => {
    if (!quickCardTitle.trim() || !boardId) return;
    try {
      const order_index = cards.filter((c) => c.column_id === columnId && c.is_backlog === isBacklog).length;
      const created = await dataService.createKanbanCard({
        board_id: boardId,
        column_id: columnId,
        title: quickCardTitle.trim(),
        description: '',
        priority: 'medium',
        labels: [],
        is_backlog: isBacklog,
        order_index,
      });
      setCards((prev) => [...prev, created]);
      setQuickCardTitle('');
      setQuickAddColumnId(null);
      await dataService.createKanbanActivity({
        card_id: created.id,
        action_type: 'created',
        action_data: { title: created.title },
      });
      showToast('Card added', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to add card', 'error');
    }
  };

  // Drag and Drop Cards
  const handleDropCard = async (targetColumnId: string | null, targetIsBacklog: boolean) => {
    if (!dragCardId) return;
    const moving = cards.find((c) => c.id === dragCardId);
    if (!moving) return;

    if (moving.column_id === targetColumnId && moving.is_backlog === targetIsBacklog) {
      setDragCardId('');
      return;
    }

    const nextCards = cards.map((c) =>
      c.id === dragCardId
        ? { ...c, column_id: targetColumnId, is_backlog: targetIsBacklog }
        : c
    );
    setCards(nextCards);

    try {
      await dataService.updateKanbanCard(moving.id, {
        column_id: targetColumnId,
        is_backlog: targetIsBacklog,
      });
      await dataService.createKanbanActivity({
        card_id: moving.id,
        action_type: 'moved',
        action_data: { column_id: targetColumnId, is_backlog: targetIsBacklog },
      });
    } catch (error) {
      console.error(error);
      showToast('Failed to move card', 'error');
      loadBoardData(boardId);
    } finally {
      setDragCardId('');
    }
  };

  // Drag and Drop Columns (Reorder)
  const handleDropColumn = async (targetColId: string) => {
    if (!dragColumnId || dragColumnId === targetColId) {
      setDragColumnId('');
      return;
    }
    const next = [...columns];
    const movingIdx = next.findIndex((c) => c.id === dragColumnId);
    const targetIdx = next.findIndex((c) => c.id === targetColId);
    if (movingIdx === -1 || targetIdx === -1) return;

    const [moving] = next.splice(movingIdx, 1);
    next.splice(targetIdx, 0, moving);
    const ordered = next.map((c, i) => ({ ...c, order_index: i }));
    setColumns(ordered);

    try {
      await Promise.all(ordered.map((c) => dataService.updateKanbanColumn(c.id, { order_index: c.order_index })));
    } catch (error) {
      console.error(error);
      showToast('Failed to reorder columns', 'error');
      loadBoardData(boardId);
    } finally {
      setDragColumnId('');
    }
  };

  // Open Card Detail Modal
  const openCardDetail = async (c: KanbanCard) => {
    setSelectedCard(c);
    setCardTitle(c.title);
    setCardDesc(c.description || '');
    setCardPriority(c.priority || 'medium');
    setCardDueDate(c.due_date || '');
    setCardColumnId(c.column_id);
    setCardIsBacklog(c.is_backlog);
    setCardLabels(Array.isArray(c.labels) ? [...c.labels] : []);
    setNewLabelInput('');
    setChecklist([]);
    setComments([]);
    setActivity([]);

    try {
      const [items, nextComments, nextActivity] = await Promise.all([
        dataService.getKanbanChecklistItems(c.id),
        dataService.getKanbanComments(c.id),
        dataService.getKanbanActivity(c.id),
      ]);
      setChecklist(items || []);
      setComments(nextComments || []);
      setActivity(nextActivity || []);
    } catch (error) {
      console.error('Failed to load card details:', error);
    }
  };

  // Save Card Details
  const handleSaveCard = async () => {
    if (!selectedCard || !cardTitle.trim()) return;
    try {
      const updates = {
        title: cardTitle.trim(),
        description: cardDesc.trim() || null,
        priority: cardPriority,
        due_date: cardDueDate || null,
        column_id: cardIsBacklog ? null : cardColumnId,
        is_backlog: cardIsBacklog,
        labels: cardLabels,
      };
      await dataService.updateKanbanCard(selectedCard.id, updates);
      setCards((prev) => prev.map((c) => (c.id === selectedCard.id ? { ...c, ...updates } : c)));
      await dataService.createKanbanActivity({
        card_id: selectedCard.id,
        action_type: 'updated',
        action_data: {},
      });
      setSelectedCard(null);
      showToast('Card saved', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to save card', 'error');
    }
  };

  // Delete Card
  const handleDeleteCard = async () => {
    if (!selectedCard) return;
    if (!window.confirm('Delete this card?')) return;
    try {
      await dataService.deleteKanbanCard(selectedCard.id);
      setCards((prev) => prev.filter((c) => c.id !== selectedCard.id));
      setSelectedCard(null);
      showToast('Card deleted', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete card', 'error');
    }
  };

  // Checklists
  const handleAddChecklistItem = async () => {
    if (!selectedCard || !newCheckText.trim()) return;
    try {
      const item = await dataService.createKanbanChecklistItem({
        card_id: selectedCard.id,
        text: newCheckText.trim(),
        is_completed: false,
        order_index: checklist.length,
      });
      setChecklist((prev) => [...prev, item]);
      setNewCheckText('');
    } catch (error) {
      console.error(error);
      showToast('Failed to add checklist item', 'error');
    }
  };

  const handleToggleChecklist = async (id: string, currentVal: boolean) => {
    try {
      await dataService.updateKanbanChecklistItem(id, { is_completed: !currentVal });
      setChecklist((prev) => prev.map((i) => (i.id === id ? { ...i, is_completed: !currentVal } : i)));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteChecklistItem = async (id: string) => {
    try {
      await dataService.deleteKanbanChecklistItem(id);
      setChecklist((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  // Comments
  const handleAddComment = async () => {
    if (!selectedCard || !newCommentText.trim()) return;
    try {
      const item = await dataService.createKanbanComment({
        card_id: selectedCard.id,
        text: newCommentText.trim(),
      });
      setComments((prev) => [item, ...prev]);
      setNewCommentText('');
    } catch (error) {
      console.error(error);
      showToast('Failed to post comment', 'error');
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await dataService.deleteKanbanComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  // Labels inside modal
  const handleAddLabel = () => {
    const trimmed = newLabelInput.trim();
    if (trimmed && !cardLabels.includes(trimmed)) {
      setCardLabels((prev) => [...prev, trimmed]);
      setNewLabelInput('');
    }
  };

  const handleRemoveLabel = (label: string) => {
    setCardLabels((prev) => prev.filter((l) => l !== label));
  };

  // Deep Link Copy
  const handleCopyCardLink = () => {
    if (!selectedCard) return;
    const url = `${window.location.origin}${window.location.pathname}#/kanban?board=${boardId}&card=${selectedCard.id}`;
    navigator.clipboard.writeText(url);
    showToast('Card link copied to clipboard!', 'success');
  };

  const activeBoard = boards.find((b) => b.id === boardId);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading Kanban Boards...</p>
      </div>
    );
  }

  return (
    <div className="planner-page kanban-page">
      {/* Header with Board Selection & Actions */}
      <header className="planner-header kanban-header">
        <div className="kanban-header__left">
          <h2>Kanban Boards</h2>
          <p>{activeBoard?.description || 'Move work across columns and track details.'}</p>
        </div>
        <div className="kanban-header__actions">
          <select
            className="planner-select kanban-board-select"
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
          {activeBoard && (
            <button
              className="btn-secondary"
              title="Edit Board Title/Description"
              onClick={() => {
                setBoardTitleInput(activeBoard.title);
                setBoardDescInput(activeBoard.description || '');
                setShowEditBoardModal(true);
              }}
            >
              ⚙️ Manage Board
            </button>
          )}
          <button
            className="btn-primary"
            onClick={() => {
              setBoardTitleInput('');
              setBoardDescInput('');
              setShowCreateBoardModal(true);
            }}
          >
            + New Board
          </button>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <section className="planner-card kanban-filter-bar">
        <div className="kanban-filter-row">
          {/* Search input */}
          <div className="kanban-search-box">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search cards by title, description, or label..."
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                ×
              </button>
            )}
          </div>

          {/* Priority filter */}
          <div className="kanban-filter-group">
            <label>Priority:</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
            >
              <option value="all">All Priorities</option>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>

          {/* Label filter */}
          {allLabels.length > 0 && (
            <div className="kanban-filter-group">
              <label>Tag:</label>
              <select value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}>
                <option value="all">All Tags</option>
                {allLabels.map((l) => (
                  <option key={l} value={l}>
                    🏷️ {l}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Due date filter */}
          <div className="kanban-filter-group">
            <label>Due:</label>
            <select
              value={dueDateFilter}
              onChange={(e) => setDueDateFilter(e.target.value as any)}
            >
              <option value="all">All Dates</option>
              <option value="overdue">⚠️ Overdue</option>
              <option value="today">📅 Due Today</option>
              <option value="week">🗓️ Due This Week</option>
              <option value="none">No Due Date</option>
            </select>
          </div>

          {/* Reset button */}
          {(searchQuery || priorityFilter !== 'all' || labelFilter !== 'all' || dueDateFilter !== 'all') && (
            <button
              className="btn-secondary clear-filters-btn"
              onClick={() => {
                setSearchQuery('');
                setPriorityFilter('all');
                setLabelFilter('all');
                setDueDateFilter('all');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </section>

      {/* Main Kanban Workspace: Backlog Drawer + Columns */}
      {boardId && (
        <div className="kanban-workspace">
          {/* Collapsible Backlog Drawer */}
          <aside className={`kanban-backlog ${isBacklogExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="kanban-backlog-header" onClick={() => setIsBacklogExpanded(!isBacklogExpanded)}>
              <div className="backlog-title-wrap">
                <span className="backlog-chevron">{isBacklogExpanded ? '▼' : '▶'}</span>
                <h3>Backlog</h3>
              </div>
              <span className="kanban-badge">
                {filteredCards.filter((c) => c.is_backlog).length}
              </span>
            </div>

            {isBacklogExpanded && (
              <div
                className="kanban-backlog-body"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropCard(null, true)}
              >
                {/* Cards in Backlog */}
                <div className="kanban-cards-stack">
                  {filteredCards
                    .filter((c) => c.is_backlog)
                    .map((c) => (
                      <KanbanCardItem
                        key={c.id}
                        card={c}
                        onOpen={() => openCardDetail(c)}
                        onDragStart={() => setDragCardId(c.id)}
                      />
                    ))}
                </div>

                {/* Quick Add to Backlog */}
                {quickAddColumnId === 'backlog' ? (
                  <div className="kanban-quick-add-form">
                    <input
                      type="text"
                      value={quickCardTitle}
                      onChange={(e) => setQuickCardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAddCard(null, true);
                        if (e.key === 'Escape') setQuickAddColumnId(null);
                      }}
                      placeholder="Card title..."
                      autoFocus
                    />
                    <div className="quick-add-actions">
                      <button className="btn-primary btn-sm" onClick={() => handleQuickAddCard(null, true)}>
                        Add
                      </button>
                      <button className="btn-secondary btn-sm" onClick={() => setQuickAddColumnId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn-secondary kanban-add-card-trigger"
                    onClick={() => {
                      setQuickAddColumnId('backlog');
                      setQuickCardTitle('');
                    }}
                  >
                    + Add to Backlog
                  </button>
                )}
              </div>
            )}
          </aside>

          {/* Kanban Columns List */}
          <main className="kanban-columns-container">
            {columns.map((col) => {
              const colCards = filteredCards.filter((c) => c.column_id === col.id && !c.is_backlog);
              const isOverWip = col.wip_limit ? colCards.length > col.wip_limit : false;

              return (
                <section
                  key={col.id}
                  className={`kanban-column-rich ${isOverWip ? 'over-wip' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragColumnId) handleDropColumn(col.id);
                    else handleDropCard(col.id, false);
                  }}
                >
                  {/* Column Header */}
                  <div
                    className="kanban-column-header"
                    draggable
                    onDragStart={() => setDragColumnId(col.id)}
                    title="Drag header to reorder column"
                  >
                    <div className="column-header-title">
                      <h4>{col.title}</h4>
                      <span className={`wip-indicator ${isOverWip ? 'warning' : ''}`}>
                        {colCards.length}
                        {col.wip_limit ? ` / ${col.wip_limit}` : ''}
                      </span>
                    </div>

                    <div className="column-header-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="col-action-btn"
                        title="Set WIP limit"
                        onClick={() => {
                          const val = window.prompt('Set WIP limit (leave blank for none):', String(col.wip_limit || ''));
                          if (val !== null) handleUpdateColumnWip(col.id, val);
                        }}
                      >
                        ⚡
                      </button>
                      <button
                        className="col-action-btn col-action-btn--delete"
                        title="Delete Column"
                        onClick={() => handleDeleteColumn(col.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Cards inside Column */}
                  <div className="kanban-cards-stack">
                    {colCards.map((c) => (
                      <KanbanCardItem
                        key={c.id}
                        card={c}
                        onOpen={() => openCardDetail(c)}
                        onDragStart={() => setDragCardId(c.id)}
                      />
                    ))}
                  </div>

                  {/* Quick Add Card */}
                  {quickAddColumnId === col.id ? (
                    <div className="kanban-quick-add-form">
                      <input
                        type="text"
                        value={quickCardTitle}
                        onChange={(e) => setQuickCardTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleQuickAddCard(col.id, false);
                          if (e.key === 'Escape') setQuickAddColumnId(null);
                        }}
                        placeholder="Card title..."
                        autoFocus
                      />
                      <div className="quick-add-actions">
                        <button className="btn-primary btn-sm" onClick={() => handleQuickAddCard(col.id, false)}>
                          Add
                        </button>
                        <button className="btn-secondary btn-sm" onClick={() => setQuickAddColumnId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn-secondary kanban-add-card-trigger"
                      onClick={() => {
                        setQuickAddColumnId(col.id);
                        setQuickCardTitle('');
                      }}
                    >
                      + Add Card
                    </button>
                  )}
                </section>
              );
            })}

            {/* Add Column Button / Form */}
            {showAddColumn ? (
              <div className="kanban-column-rich kanban-add-column-card">
                <h4>New Column</h4>
                <div className="planner-form">
                  <label>
                    Column Title
                    <input
                      type="text"
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      placeholder="e.g., Code Review"
                      autoFocus
                    />
                  </label>
                  <label>
                    WIP Limit (optional)
                    <input
                      type="number"
                      min="1"
                      value={newColumnWip}
                      onChange={(e) => setNewColumnWip(e.target.value ? Number(e.target.value) : '')}
                      placeholder="None"
                    />
                  </label>
                  <div className="planner-actions">
                    <button className="btn-primary" onClick={handleAddColumn}>
                      Add Column
                    </button>
                    <button className="btn-secondary" onClick={() => setShowAddColumn(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button className="kanban-add-column-btn" onClick={() => setShowAddColumn(true)}>
                + Add Column
              </button>
            )}
          </main>
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="planner-modal-backdrop" onMouseDown={() => setSelectedCard(null)}>
          <section
            className="planner-modal kanban-card-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="planner-card-header">
              <div className="modal-title-wrap">
                <span className={`kanban-priority-badge priority-${cardPriority}`}>
                  {cardPriority.toUpperCase()}
                </span>
                <h3>Card Details</h3>
              </div>
              <div className="modal-top-actions">
                <button className="btn-secondary btn-sm" onClick={handleCopyCardLink} title="Copy direct link to card">
                  🔗 Link
                </button>
                <button className="planner-danger" onClick={() => setSelectedCard(null)}>
                  ×
                </button>
              </div>
            </div>

            <div className="planner-form">
              <label>
                Title
                <input
                  type="text"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  placeholder="Card title..."
                />
              </label>

              <label>
                Description
                <textarea
                  rows={3}
                  value={cardDesc}
                  onChange={(e) => setCardDesc(e.target.value)}
                  placeholder="Add detailed task description..."
                />
              </label>

              <div className="planner-form-row">
                <label>
                  Column / Placement
                  <select
                    value={cardIsBacklog ? 'backlog' : cardColumnId || ''}
                    onChange={(e) => {
                      if (e.target.value === 'backlog') {
                        setCardIsBacklog(true);
                        setCardColumnId(null);
                      } else {
                        setCardIsBacklog(false);
                        setCardColumnId(e.target.value);
                      }
                    }}
                  >
                    <option value="backlog">📦 Backlog</option>
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        📋 {col.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Priority
                  <select
                    value={cardPriority}
                    onChange={(e) => setCardPriority(e.target.value as any)}
                  >
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </label>

                <label>
                  Due Date
                  <input
                    type="date"
                    value={cardDueDate}
                    onChange={(e) => setCardDueDate(e.target.value)}
                  />
                </label>
              </div>

              {/* Labels Tag Manager */}
              <div className="kanban-labels-manager">
                <label>Tags / Labels</label>
                <div className="labels-chip-list">
                  {cardLabels.map((l) => (
                    <span key={l} className="label-chip">
                      🏷️ {l}
                      <button type="button" onClick={() => handleRemoveLabel(l)}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="label-input-row">
                  <input
                    type="text"
                    value={newLabelInput}
                    onChange={(e) => setNewLabelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLabel();
                      }
                    }}
                    placeholder="Add label and press Enter..."
                  />
                  <button type="button" className="btn-secondary btn-sm" onClick={handleAddLabel}>
                    Add Tag
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist Section */}
            <section className="kanban-detail-section">
              <div className="section-heading-row">
                <h4>Checklist</h4>
                {checklist.length > 0 && (
                  <span className="checklist-ratio">
                    {checklist.filter((i) => i.is_completed).length}/{checklist.length} completed
                  </span>
                )}
              </div>

              {checklist.length > 0 && (
                <div className="checklist-progress-bar">
                  <div
                    className="checklist-progress-fill"
                    style={{
                      width: `${(checklist.filter((i) => i.is_completed).length / checklist.length) * 100}%`,
                    }}
                  />
                </div>
              )}

              <div className="checklist-items-stack">
                {checklist.map((item) => (
                  <div key={item.id} className="kanban-check-item">
                    <label className="kanban-check-label">
                      <input
                        type="checkbox"
                        checked={Boolean(item.is_completed)}
                        onChange={() => handleToggleChecklist(item.id, Boolean(item.is_completed))}
                      />
                      <span className={item.is_completed ? 'completed-text' : ''}>{item.text}</span>
                    </label>
                    <button
                      className="delete-item-btn"
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      title="Delete item"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="add-checklist-input-row">
                <input
                  type="text"
                  value={newCheckText}
                  onChange={(e) => setNewCheckText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddChecklistItem();
                  }}
                  placeholder="New checklist task..."
                />
                <button className="btn-secondary btn-sm" onClick={handleAddChecklistItem}>
                  Add Task
                </button>
              </div>
            </section>

            {/* Comments Section */}
            <section className="kanban-detail-section">
              <h4>Comments & Notes</h4>
              <div className="comments-stack">
                {comments.length === 0 ? (
                  <p className="empty-subtext">No comments on this card yet.</p>
                ) : (
                  comments.map((item) => (
                    <div key={item.id} className="kanban-comment-item">
                      <div className="comment-content">
                        <p>{item.text}</p>
                        <small>{new Date(item.created_at).toLocaleString()}</small>
                      </div>
                      <button
                        className="delete-comment-btn"
                        onClick={() => handleDeleteComment(item.id)}
                        title="Delete comment"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="add-comment-input-row">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddComment();
                  }}
                  placeholder="Write a comment..."
                />
                <button className="btn-secondary btn-sm" onClick={handleAddComment}>
                  Post
                </button>
              </div>
            </section>

            {/* Activity History Timeline */}
            <section className="kanban-detail-section">
              <h4>Activity History</h4>
              <div className="activity-timeline">
                {activity.length === 0 ? (
                  <p className="empty-subtext">No recent activity.</p>
                ) : (
                  activity.slice(0, 6).map((item) => (
                    <div key={item.id} className="activity-row">
                      <span className="activity-bullet">•</span>
                      <span className="activity-action">{item.action_type}</span>
                      <span className="activity-time">{new Date(item.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Modal Bottom Actions */}
            <div className="kanban-modal-bottom-actions">
              <button className="btn-primary" onClick={handleSaveCard}>
                Save Card
              </button>
              <button className="planner-danger" onClick={handleDeleteCard}>
                Delete Card
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Create Board Modal */}
      {showCreateBoardModal && (
        <div className="planner-modal-backdrop" onMouseDown={() => setShowCreateBoardModal(false)}>
          <div className="planner-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="planner-card-header">
              <h3>Create New Kanban Board</h3>
              <button className="planner-danger" onClick={() => setShowCreateBoardModal(false)}>
                ×
              </button>
            </div>
            <div className="planner-form">
              <label>
                Board Title
                <input
                  type="text"
                  value={boardTitleInput}
                  onChange={(e) => setBoardTitleInput(e.target.value)}
                  placeholder="e.g., Sprint Planning, Product Roadmap"
                  autoFocus
                />
              </label>
              <label>
                Description (optional)
                <textarea
                  rows={2}
                  value={boardDescInput}
                  onChange={(e) => setBoardDescInput(e.target.value)}
                  placeholder="Purpose of this board..."
                />
              </label>
              <div className="planner-actions">
                <button className="btn-primary" onClick={handleCreateBoard}>
                  Create Board
                </button>
                <button className="btn-secondary" onClick={() => setShowCreateBoardModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Board Modal */}
      {showEditBoardModal && activeBoard && (
        <div className="planner-modal-backdrop" onMouseDown={() => setShowEditBoardModal(false)}>
          <div className="planner-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="planner-card-header">
              <h3>Manage Board: {activeBoard.title}</h3>
              <button className="planner-danger" onClick={() => setShowEditBoardModal(false)}>
                ×
              </button>
            </div>
            <div className="planner-form">
              <label>
                Board Title
                <input
                  type="text"
                  value={boardTitleInput}
                  onChange={(e) => setBoardTitleInput(e.target.value)}
                />
              </label>
              <label>
                Description
                <textarea
                  rows={2}
                  value={boardDescInput}
                  onChange={(e) => setBoardDescInput(e.target.value)}
                />
              </label>
              <div className="planner-actions" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-primary" onClick={handleUpdateBoard}>
                    Save Changes
                  </button>
                  <button className="btn-secondary" onClick={() => setShowEditBoardModal(false)}>
                    Cancel
                  </button>
                </div>
                <button className="planner-danger" onClick={handleDeleteBoard}>
                  Delete Board
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component: Kanban Card Item
function KanbanCardItem({
  card,
  onOpen,
  onDragStart,
}: {
  card: KanbanCard;
  onOpen: () => void;
  onDragStart: () => void;
}) {
  const isOverdue =
    card.due_date && new Date(card.due_date) < new Date(new Date().toDateString());

  return (
    <button
      className="kanban-card-rich"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onClick={onOpen}
    >
      <div className="kanban-card-top-row">
        <span className={`kanban-priority kanban-priority--${card.priority || 'medium'}`}>
          {card.priority}
        </span>
        {card.due_date && (
          <span className={`kanban-due-date ${isOverdue ? 'overdue' : ''}`}>
            {isOverdue ? '⚠️ ' : '📅 '}
            {card.due_date}
          </span>
        )}
      </div>

      <strong className="kanban-card-title">{card.title}</strong>

      {card.description && (
        <p className="kanban-card-desc-preview">{card.description}</p>
      )}

      {Array.isArray(card.labels) && card.labels.length > 0 && (
        <div className="kanban-card-labels">
          {card.labels.map((l) => (
            <span key={l} className="kanban-card-label-pill">
              {l}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export default KanbanPage;


