import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/Toast/Toast';
import '../PlannerPages.css';

type CanvasMode = 'draw' | 'mindmap' | 'flowchart';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  tool: 'pen' | 'highlighter' | 'eraser';
  points: Point[];
  color: string;
  width: number;
}

interface MindNode {
  id: string;
  label: string;
  x: number;
  y: number;
  parentId?: string;
  color?: string;
}

interface FlowNode {
  id: string;
  label: string;
  x: number;
  y: number;
  shape: 'process' | 'terminal' | 'decision' | 'note';
  color?: string;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface CanvasDocument {
  id: string;
  title: string;
  stroke_data: {
    version?: number;
    mode: CanvasMode;
    strokes?: Stroke[];
    mindNodes?: MindNode[];
    flowNodes?: FlowNode[];
    flowEdges?: FlowEdge[];
  };
  created_at?: string;
  updated_at?: string;
}

const COLOR_PRESETS = [
  '#0f172a', // Slate / Black
  '#2563eb', // Blue
  '#059669', // Green
  '#dc2626', // Red
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#ffffff', // White
];

const NODE_COLORS = [
  { name: 'Blue', bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a' },
  { name: 'Green', bg: '#f0fdf4', border: '#22c55e', text: '#14532d' },
  { name: 'Purple', bg: '#faf5ff', border: '#a855f7', text: '#581c87' },
  { name: 'Amber', bg: '#fffbeb', border: '#f59e0b', text: '#78350f' },
  { name: 'Rose', bg: '#fff1f2', border: '#f43f5e', text: '#881337' },
  { name: 'Slate', bg: '#f8fafc', border: '#64748b', text: '#0f172a' },
];

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function CanvasPage() {
  const { activeProfile } = useProfile();
  const { showToast } = useToast();

  // Documents state
  const [docs, setDocs] = useState<CanvasDocument[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string>('');
  const [docTitle, setDocTitle] = useState('Untitled Canvas');
  const [mode, setMode] = useState<CanvasMode>('draw');
  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [sidebarModeFilter, setSidebarModeFilter] = useState<'all' | CanvasMode>('all');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<Stroke | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawTool, setDrawTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [drawColor, setDrawColor] = useState('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState(4);

  // Mindmap state
  const [mindNodes, setMindNodes] = useState<MindNode[]>([]);
  const [selectedMindNodeId, setSelectedMindNodeId] = useState<string>('');

  // Flowchart state
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);
  const [selectedFlowNodeId, setSelectedFlowNodeId] = useState<string>('');
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);

  // Dragging state for diagram nodes
  const [draggedNode, setDraggedNode] = useState<{ id: string; type: 'mind' | 'flow'; offsetX: number; offsetY: number } | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Undo / Redo history stacks
  const historyRef = useRef<{
    past: { strokes: Stroke[]; mindNodes: MindNode[]; flowNodes: FlowNode[]; flowEdges: FlowEdge[] }[];
    future: { strokes: Stroke[]; mindNodes: MindNode[]; flowNodes: FlowNode[]; flowEdges: FlowEdge[] }[];
  }>({ past: [], future: [] });

  const [, setHistoryVersion] = useState(0);

  // Helper to record history snapshot
  const pushHistory = useCallback(() => {
    historyRef.current.past.push({
      strokes: JSON.parse(JSON.stringify(strokes)),
      mindNodes: JSON.parse(JSON.stringify(mindNodes)),
      flowNodes: JSON.parse(JSON.stringify(flowNodes)),
      flowEdges: JSON.parse(JSON.stringify(flowEdges)),
    });
    // Limit history stack size to 30
    if (historyRef.current.past.length > 30) {
      historyRef.current.past.shift();
    }
    historyRef.current.future = [];
    setHistoryVersion((v) => v + 1);
    setSaveStatus('unsaved');
  }, [flowEdges, flowNodes, mindNodes, strokes]);

  const handleUndo = useCallback(() => {
    if (historyRef.current.past.length === 0) return;
    const previous = historyRef.current.past.pop()!;
    historyRef.current.future.push({
      strokes: JSON.parse(JSON.stringify(strokes)),
      mindNodes: JSON.parse(JSON.stringify(mindNodes)),
      flowNodes: JSON.parse(JSON.stringify(flowNodes)),
      flowEdges: JSON.parse(JSON.stringify(flowEdges)),
    });
    setStrokes(previous.strokes);
    setMindNodes(previous.mindNodes);
    setFlowNodes(previous.flowNodes);
    setFlowEdges(previous.flowEdges);
    setHistoryVersion((v) => v + 1);
    setSaveStatus('unsaved');
  }, [flowEdges, flowNodes, mindNodes, strokes]);

  const handleRedo = useCallback(() => {
    if (historyRef.current.future.length === 0) return;
    const next = historyRef.current.future.pop()!;
    historyRef.current.past.push({
      strokes: JSON.parse(JSON.stringify(strokes)),
      mindNodes: JSON.parse(JSON.stringify(mindNodes)),
      flowNodes: JSON.parse(JSON.stringify(flowNodes)),
      flowEdges: JSON.parse(JSON.stringify(flowEdges)),
    });
    setStrokes(next.strokes);
    setMindNodes(next.mindNodes);
    setFlowNodes(next.flowNodes);
    setFlowEdges(next.flowEdges);
    setHistoryVersion((v) => v + 1);
    setSaveStatus('unsaved');
  }, [flowEdges, flowNodes, mindNodes, strokes]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDocument();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRedo, handleUndo]);

  // Load documents
  const loadDocuments = useCallback(async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const data = await dataService.getCanvasDocuments();
      setDocs(data || []);
      if (data && data.length > 0) {
        setCurrentDocId((curr) => curr || data[0].id);
      }
    } catch (error) {
      console.error('Failed to load canvas documents:', error);
      showToast('Failed to load canvas documents', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeProfile, showToast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Load selected document content
  const selectedDoc = useMemo(() => docs.find((d) => d.id === currentDocId), [docs, currentDocId]);

  useEffect(() => {
    if (!selectedDoc) return;
    const data = selectedDoc.stroke_data || {};
    setDocTitle(selectedDoc.title || 'Untitled Canvas');
    setMode(data.mode || 'draw');
    setStrokes(data.strokes || []);
    setMindNodes(
      data.mindNodes && data.mindNodes.length > 0
        ? data.mindNodes
        : [{ id: uid(), label: 'Central Idea', x: 380, y: 220, color: '#eff6ff' }]
    );
    setFlowNodes(
      data.flowNodes && data.flowNodes.length > 0
        ? data.flowNodes
        : [
            { id: 'start_1', label: 'Start', x: 120, y: 200, shape: 'terminal', color: '#eff6ff' },
            { id: 'proc_1', label: 'Process Step', x: 300, y: 195, shape: 'process', color: '#f0fdf4' },
          ]
    );
    setFlowEdges(data.flowEdges || [{ id: 'e1', source: 'start_1', target: 'proc_1' }]);
    setSelectedMindNodeId('');
    setSelectedFlowNodeId('');
    setLinkingSourceId(null);
    historyRef.current = { past: [], future: [] };
    setSaveStatus('saved');
  }, [selectedDoc]);

  // Canvas Drawing Redraw
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== 'draw') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    ctx.scale(ratio * zoom, ratio * zoom);
    ctx.translate(pan.x / zoom, pan.y / zoom);

    ctx.clearRect(-pan.x / zoom, -pan.y / zoom, rect.width / zoom, rect.height / zoom);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokes.forEach((s) => {
      if (!s.points || s.points.length === 0) return;
      ctx.beginPath();
      ctx.lineWidth = s.width;

      if (s.tool === 'highlighter') {
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 0.35;
      } else if (s.tool === 'eraser') {
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 1;
      }

      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
  }, [mode, pan.x, pan.y, strokes, zoom]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => redrawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  // Save document
  const saveDocument = async () => {
    if (!currentDocId) return;
    setSaveStatus('saving');
    try {
      const updated = await dataService.updateCanvasDocument(currentDocId, {
        title: docTitle.trim() || 'Untitled Canvas',
        stroke_data: {
          version: 2,
          mode,
          strokes,
          mindNodes,
          flowNodes,
          flowEdges,
        },
      });
      setDocs((prev) => prev.map((d) => (d.id === currentDocId ? { ...d, ...updated } : d)));
      setSaveStatus('saved');
      showToast('Document saved', 'success');
    } catch (error) {
      console.error('Failed to save document:', error);
      setSaveStatus('unsaved');
      showToast('Failed to save document', 'error');
    }
  };

  // Create new document
  const handleCreateDocument = async (initialMode: CanvasMode = 'draw') => {
    try {
      const defaultTitle =
        initialMode === 'draw'
          ? 'New Sketch'
          : initialMode === 'mindmap'
          ? 'New Mindmap'
          : 'New Flowchart';

      const initialData = {
        version: 2,
        mode: initialMode,
        strokes: [],
        mindNodes: [{ id: uid(), label: 'Central Idea', x: 380, y: 220, color: '#eff6ff' }],
        flowNodes: [
          { id: 'start_1', label: 'Start', x: 120, y: 200, shape: 'terminal' as const, color: '#eff6ff' },
          { id: 'proc_1', label: 'Process', x: 300, y: 195, shape: 'process' as const, color: '#f0fdf4' },
        ],
        flowEdges: [{ id: 'e1', source: 'start_1', target: 'proc_1' }],
      };

      const doc = await dataService.createCanvasDocument({
        title: defaultTitle,
        stroke_data: initialData,
      });

      setDocs((prev) => [doc, ...prev]);
      setCurrentDocId(doc.id);
      setMode(initialMode);
      showToast('Document created', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to create document', 'error');
    }
  };

  // Duplicate document
  const handleDuplicateDocument = async () => {
    if (!selectedDoc) return;
    try {
      const doc = await dataService.createCanvasDocument({
        title: `${docTitle} (Copy)`,
        stroke_data: {
          version: 2,
          mode,
          strokes,
          mindNodes,
          flowNodes,
          flowEdges,
        },
      });
      setDocs((prev) => [doc, ...prev]);
      setCurrentDocId(doc.id);
      showToast('Document duplicated', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to duplicate document', 'error');
    }
  };

  // Delete document
  const handleDeleteDocument = async (idToDelete: string) => {
    if (!window.confirm('Delete this canvas document permanently?')) return;
    try {
      await dataService.deleteCanvasDocument(idToDelete);
      const remaining = docs.filter((d) => d.id !== idToDelete);
      setDocs(remaining);
      setCurrentDocId(remaining[0]?.id || '');
      showToast('Document deleted', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete document', 'error');
    }
  };

  // Clear Canvas strokes
  const handleClearDrawCanvas = () => {
    if (strokes.length === 0) return;
    if (!window.confirm('Clear all strokes from this drawing?')) return;
    pushHistory();
    setStrokes([]);
  };

  // Export to PNG
  const handleExportPNG = () => {
    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${docTitle.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Exported drawing as PNG', 'success');
    } else {
      // Export SVG element to PNG
      const svgEl = document.querySelector('.diagram-svg-root') as SVGSVGElement | null;
      if (!svgEl) return;
      const xml = new XMLSerializer().serializeToString(svgEl);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const image64 = `data:image/svg+xml;base64,${svg64}`;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const link = document.createElement('a');
          link.download = `${docTitle.replace(/\s+/g, '_')}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          showToast('Exported diagram as PNG', 'success');
        }
      };
      img.src = image64;
    }
  };

  // Export to JSON
  const handleExportJSON = () => {
    const payload = {
      title: docTitle,
      mode,
      version: 2,
      strokes,
      mindNodes,
      flowNodes,
      flowEdges,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${docTitle.replace(/\s+/g, '_')}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported canvas data as JSON', 'success');
  };

  // Import from JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        pushHistory();
        if (data.title) setDocTitle(data.title);
        if (data.mode) setMode(data.mode);
        if (Array.isArray(data.strokes)) setStrokes(data.strokes);
        if (Array.isArray(data.mindNodes)) setMindNodes(data.mindNodes);
        if (Array.isArray(data.flowNodes)) setFlowNodes(data.flowNodes);
        if (Array.isArray(data.flowEdges)) setFlowEdges(data.flowEdges);
        showToast('Canvas JSON imported successfully', 'success');
      } catch (err) {
        console.error(err);
        showToast('Invalid canvas JSON file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Drawing event handlers
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };

  const handlePointerDownDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }
    pushHistory();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = getCanvasPoint(e);
    drawingRef.current = {
      tool: drawTool,
      color: drawColor,
      width: strokeWidth,
      points: [p],
    };
    setStrokes((prev) => [...prev, drawingRef.current!]);
  };

  const handlePointerMoveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning && e.buttons === 1) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }
    if (!drawingRef.current) return;
    const p = getCanvasPoint(e);
    drawingRef.current.points.push(p);
    setStrokes((prev) => [...prev.slice(0, -1), drawingRef.current!]);
  };

  const handlePointerUpDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawingRef.current) {
      drawingRef.current = null;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Mindmap Node Operations
  const handleAddMindChild = () => {
    const parent = mindNodes.find((n) => n.id === selectedMindNodeId) || mindNodes[0];
    if (!parent) return;
    pushHistory();
    const newNode: MindNode = {
      id: uid(),
      label: 'New Idea',
      x: parent.x + 180,
      y: parent.y + (Math.random() * 100 - 50),
      parentId: parent.id,
      color: '#eff6ff',
    };
    setMindNodes((prev) => [...prev, newNode]);
    setSelectedMindNodeId(newNode.id);
  };

  const handleAddMindSibling = () => {
    const selected = mindNodes.find((n) => n.id === selectedMindNodeId);
    if (!selected) {
      handleAddMindChild();
      return;
    }
    pushHistory();
    const newNode: MindNode = {
      id: uid(),
      label: 'New Idea',
      x: selected.x,
      y: selected.y + 70,
      parentId: selected.parentId,
      color: selected.color || '#eff6ff',
    };
    setMindNodes((prev) => [...prev, newNode]);
    setSelectedMindNodeId(newNode.id);
  };

  const handleDeleteMindNode = (idToDelete: string) => {
    pushHistory();
    setMindNodes((prev) => prev.filter((n) => n.id !== idToDelete && n.parentId !== idToDelete));
    if (selectedMindNodeId === idToDelete) setSelectedMindNodeId('');
  };

  // Flowchart Operations
  const handleAddFlowNode = (shape: FlowNode['shape']) => {
    pushHistory();
    const newNode: FlowNode = {
      id: uid(),
      label: shape === 'decision' ? 'Condition?' : shape === 'terminal' ? 'End' : 'Action Step',
      shape,
      x: 300 + (Math.random() * 80 - 40),
      y: 240 + (Math.random() * 80 - 40),
      color: shape === 'decision' ? '#fffbeb' : shape === 'terminal' ? '#eff6ff' : '#f0fdf4',
    };
    setFlowNodes((prev) => [...prev, newNode]);
    setSelectedFlowNodeId(newNode.id);
  };

  const handleStartLink = (sourceId: string) => {
    setLinkingSourceId(sourceId);
    showToast('Click another node to create connector arrow', 'info');
  };

  const handleCompleteLink = (targetId: string) => {
    if (!linkingSourceId || linkingSourceId === targetId) {
      setLinkingSourceId(null);
      return;
    }
    pushHistory();
    const newEdge: FlowEdge = {
      id: uid(),
      source: linkingSourceId,
      target: targetId,
    };
    setFlowEdges((prev) => [...prev, newEdge]);
    setLinkingSourceId(null);
    showToast('Connected steps', 'success');
  };

  const handleDeleteFlowNode = (idToDelete: string) => {
    pushHistory();
    setFlowNodes((prev) => prev.filter((n) => n.id !== idToDelete));
    setFlowEdges((prev) => prev.filter((e) => e.source !== idToDelete && e.target !== idToDelete));
    if (selectedFlowNodeId === idToDelete) setSelectedFlowNodeId('');
  };

  const handleDeleteFlowEdge = (edgeId: string) => {
    pushHistory();
    setFlowEdges((prev) => prev.filter((e) => e.id !== edgeId));
  };

  // Diagram Node Dragging (Mouse / Touch)
  const handleDiagramPointerDown = (
    e: React.PointerEvent,
    id: string,
    type: 'mind' | 'flow',
    currentX: number,
    currentY: number
  ) => {
    e.stopPropagation();
    if (linkingSourceId && type === 'flow') {
      handleCompleteLink(id);
      return;
    }
    if (type === 'mind') setSelectedMindNodeId(id);
    if (type === 'flow') setSelectedFlowNodeId(id);

    const svgRect = (e.currentTarget.closest('svg') as SVGSVGElement)?.getBoundingClientRect();
    if (!svgRect) return;

    setDraggedNode({
      id,
      type,
      offsetX: (e.clientX - svgRect.left) / zoom - currentX,
      offsetY: (e.clientY - svgRect.top) / zoom - currentY,
    });
  };

  const handleDiagramPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggedNode) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = (e.clientX - svgRect.left) / zoom;
    const mouseY = (e.clientY - svgRect.top) / zoom;
    const nextX = Math.max(10, Math.round(mouseX - draggedNode.offsetX));
    const nextY = Math.max(10, Math.round(mouseY - draggedNode.offsetY));

    if (draggedNode.type === 'mind') {
      setMindNodes((prev) =>
        prev.map((n) => (n.id === draggedNode.id ? { ...n, x: nextX, y: nextY } : n))
      );
    } else {
      setFlowNodes((prev) =>
        prev.map((n) => (n.id === draggedNode.id ? { ...n, x: nextX, y: nextY } : n))
      );
    }
  };

  const handleDiagramPointerUp = () => {
    if (draggedNode) {
      pushHistory();
      setDraggedNode(null);
    }
  };

  // Filtered documents list for sidebar
  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      if (sidebarModeFilter !== 'all' && (d.stroke_data?.mode || 'draw') !== sidebarModeFilter) {
        return false;
      }
      if (searchDocQuery.trim()) {
        return d.title.toLowerCase().includes(searchDocQuery.toLowerCase());
      }
      return true;
    });
  }, [docs, searchDocQuery, sidebarModeFilter]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading Canvas Studio...</p>
      </div>
    );
  }

  return (
    <div className="planner-page canvas-page">
      {/* Header */}
      <header className="planner-header canvas-header">
        <div className="canvas-header__left">
          <h2>Canvas Studio</h2>
          <p>Freehand sketching, mindmapping, and flowchart workflow diagrams.</p>
        </div>

        <div className="canvas-header__center">
          <input
            className="canvas-title-input"
            value={docTitle}
            onChange={(e) => {
              setDocTitle(e.target.value);
              setSaveStatus('unsaved');
            }}
            onBlur={saveDocument}
            placeholder="Canvas title..."
          />
          <span className={`canvas-save-badge badge-${saveStatus}`}>
            {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? '⟳ Saving...' : '● Unsaved'}
          </span>
        </div>

        <div className="canvas-header__actions">
          <button className="btn-secondary" onClick={handleDuplicateDocument} title="Duplicate current canvas">
            Duplicate
          </button>
          <button className="btn-primary" onClick={saveDocument} disabled={!currentDocId}>
            Save
          </button>
        </div>
      </header>

      {/* Main Studio Shell */}
      <div className="canvas-shell">
        {/* Left Sidebar: Document Manager */}
        <aside className="canvas-sidebar">
          <div className="canvas-sidebar-header">
            <div className="canvas-mode-tabs">
              {(['all', 'draw', 'mindmap', 'flowchart'] as const).map((m) => (
                <button
                  key={m}
                  className={`mode-filter-tab ${sidebarModeFilter === m ? 'active' : ''}`}
                  onClick={() => setSidebarModeFilter(m)}
                >
                  {m === 'all' ? 'All' : m === 'draw' ? 'Draw' : m === 'mindmap' ? 'Mind' : 'Flow'}
                </button>
              ))}
            </div>

            <div className="canvas-create-actions">
              <button
                className="btn-primary btn-sm"
                onClick={() => handleCreateDocument(sidebarModeFilter === 'all' ? 'draw' : sidebarModeFilter)}
                title="Create new canvas document"
              >
                + New
              </button>
            </div>
          </div>

          <div className="canvas-search-wrap">
            <input
              type="text"
              value={searchDocQuery}
              onChange={(e) => setSearchDocQuery(e.target.value)}
              placeholder="🔍 Search documents..."
            />
          </div>

          <div className="canvas-doc-list">
            {filteredDocs.length === 0 ? (
              <p className="empty-subtext" style={{ padding: '12px' }}>
                No documents found.
              </p>
            ) : (
              filteredDocs.map((d) => {
                const docMode = d.stroke_data?.mode || 'draw';
                return (
                  <div
                    key={d.id}
                    className={`canvas-doc-item ${d.id === currentDocId ? 'active' : ''}`}
                    onClick={() => setCurrentDocId(d.id)}
                  >
                    <div className="doc-item-icon">
                      {docMode === 'draw' ? '✏️' : docMode === 'mindmap' ? '🧠' : '📊'}
                    </div>
                    <div className="doc-item-info">
                      <strong className="doc-item-title">{d.title}</strong>
                      <small className="doc-item-meta">{docMode.toUpperCase()}</small>
                    </div>
                    <button
                      className="doc-delete-btn"
                      title="Delete document"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(d.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Area: Studio Workspace */}
        <main className="canvas-workspace-card">
          {/* Top Mode and Tool Bar */}
          <div className="canvas-toolbar">
            {/* Mode Switcher */}
            <div className="tool-group mode-toggle-group">
              {(['draw', 'mindmap', 'flowchart'] as const).map((item) => (
                <button
                  key={item}
                  className={`tool-btn ${mode === item ? 'active' : ''}`}
                  onClick={() => {
                    setMode(item);
                    setSaveStatus('unsaved');
                  }}
                >
                  {item === 'draw' ? '✏️ Draw' : item === 'mindmap' ? '🧠 Mindmap' : '📊 Flowchart'}
                </button>
              ))}
            </div>

            <div className="toolbar-divider" />

            {/* Mode-Specific Tools */}
            {mode === 'draw' && (
              <div className="tool-group draw-tools-group">
                <button
                  className={`tool-btn ${drawTool === 'pen' ? 'active' : ''}`}
                  onClick={() => setDrawTool('pen')}
                  title="Pen tool"
                >
                  ✏️ Pen
                </button>
                <button
                  className={`tool-btn ${drawTool === 'highlighter' ? 'active' : ''}`}
                  onClick={() => setDrawTool('highlighter')}
                  title="Highlighter tool"
                >
                  🖍️ Highlighter
                </button>
                <button
                  className={`tool-btn ${drawTool === 'eraser' ? 'active' : ''}`}
                  onClick={() => setDrawTool('eraser')}
                  title="Eraser tool"
                >
                  🧹 Eraser
                </button>

                <div className="color-presets-row">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      className={`color-swatch-btn ${drawColor === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setDrawColor(c)}
                    />
                  ))}
                  <input
                    type="color"
                    className="custom-color-input"
                    value={drawColor}
                    onChange={(e) => setDrawColor(e.target.value)}
                    title="Custom Color"
                  />
                </div>

                <div className="stroke-width-wrap">
                  <label>Width: {strokeWidth}px</label>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            {mode === 'mindmap' && (
              <div className="tool-group mindmap-tools-group">
                <button className="btn-secondary btn-sm" onClick={handleAddMindChild} title="Add child branch idea">
                  + Child Idea
                </button>
                <button className="btn-secondary btn-sm" onClick={handleAddMindSibling} title="Add sibling idea">
                  + Sibling Idea
                </button>
                {selectedMindNodeId && (
                  <button
                    className="planner-danger btn-sm"
                    onClick={() => handleDeleteMindNode(selectedMindNodeId)}
                  >
                    Delete Node
                  </button>
                )}
              </div>
            )}

            {mode === 'flowchart' && (
              <div className="tool-group flowchart-tools-group">
                <button className="btn-secondary btn-sm" onClick={() => handleAddFlowNode('process')} title="Add process step">
                  + Process
                </button>
                <button className="btn-secondary btn-sm" onClick={() => handleAddFlowNode('terminal')} title="Add start/end step">
                  + Start/End
                </button>
                <button className="btn-secondary btn-sm" onClick={() => handleAddFlowNode('decision')} title="Add decision step">
                  + Decision
                </button>
                <button className="btn-secondary btn-sm" onClick={() => handleAddFlowNode('note')} title="Add note/sticky">
                  + Note
                </button>
                {selectedFlowNodeId && (
                  <>
                    <button
                      className={`btn-secondary btn-sm ${linkingSourceId ? 'active' : ''}`}
                      onClick={() => handleStartLink(selectedFlowNodeId)}
                    >
                      🔗 Link Arrow
                    </button>
                    <button
                      className="planner-danger btn-sm"
                      onClick={() => handleDeleteFlowNode(selectedFlowNodeId)}
                    >
                      Delete Step
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="toolbar-divider" />

            {/* Undo, Redo, Zoom, Export Actions */}
            <div className="tool-group history-export-group">
              <button
                className="tool-btn"
                onClick={handleUndo}
                disabled={historyRef.current.past.length === 0}
                title="Undo (Ctrl+Z)"
              >
                ↩ Undo
              </button>
              <button
                className="tool-btn"
                onClick={handleRedo}
                disabled={historyRef.current.future.length === 0}
                title="Redo (Ctrl+Y)"
              >
                ↪ Redo
              </button>

              <div className="zoom-controls">
                <button
                  className="tool-btn"
                  onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                  title="Zoom Out"
                >
                  -
                </button>
                <span className="zoom-label">{Math.round(zoom * 100)}%</span>
                <button
                  className="tool-btn"
                  onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  className="tool-btn"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  title="Reset Zoom & Pan"
                >
                  100%
                </button>
              </div>

              <button
                className={`tool-btn ${isPanning ? 'active' : ''}`}
                onClick={() => setIsPanning(!isPanning)}
                title="Toggle Pan mode"
              >
                ✋ Pan
              </button>

              {mode === 'draw' && (
                <button className="tool-btn planner-danger" onClick={handleClearDrawCanvas} title="Clear canvas">
                  Clear
                </button>
              )}

              <button className="tool-btn" onClick={handleExportPNG} title="Download PNG image">
                📷 PNG
              </button>
              <button className="tool-btn" onClick={handleExportJSON} title="Download JSON file">
                📥 JSON
              </button>
              <label className="tool-btn file-import-label" title="Import JSON file">
                📤 Import
                <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Canvas Work Area */}
          <div className="canvas-work-area">
            {mode === 'draw' ? (
              <canvas
                ref={canvasRef}
                className={`drawing-canvas ${isPanning ? 'panning-cursor' : 'drawing-cursor'}`}
                onPointerDown={handlePointerDownDraw}
                onPointerMove={handlePointerMoveDraw}
                onPointerUp={handlePointerUpDraw}
              />
            ) : mode === 'mindmap' ? (
              <div className="diagram-workspace mindmap-workspace">
                <svg
                  className="diagram-svg-root"
                  viewBox="0 0 1200 800"
                  onPointerMove={handleDiagramPointerMove}
                  onPointerUp={handleDiagramPointerUp}
                  style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: '0 0' }}
                >
                  {/* Background grid */}
                  <defs>
                    <pattern id="mind-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                      <circle cx="12" cy="12" r="1" fill="rgba(0,0,0,0.06)" />
                    </pattern>
                  </defs>
                  <rect width="1200" height="800" fill="url(#mind-grid)" />

                  {/* Bézier Link lines */}
                  {mindNodes.map((node) => {
                    if (!node.parentId) return null;
                    const parent = mindNodes.find((p) => p.id === node.parentId);
                    if (!parent) return null;
                    const startX = parent.x + 75;
                    const startY = parent.y + 20;
                    const endX = node.x + 75;
                    const endY = node.y + 20;
                    const midX = (startX + endX) / 2;
                    return (
                      <path
                        key={`link-${node.id}`}
                        d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {/* Mindmap Nodes */}
                  {mindNodes.map((node) => {
                    const isSelected = selectedMindNodeId === node.id;
                    const isRoot = !node.parentId;
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        className="mindmap-node-group"
                        onPointerDown={(e) => handleDiagramPointerDown(e, node.id, 'mind', node.x, node.y)}
                        onClick={() => setSelectedMindNodeId(node.id)}
                      >
                        <rect
                          width="150"
                          height="44"
                          rx={isRoot ? "22" : "8"}
                          fill={node.color || '#eff6ff'}
                          stroke={isSelected ? '#2563eb' : isRoot ? '#3b82f6' : '#cbd5e1'}
                          strokeWidth={isSelected ? '2.5' : '1.5'}
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"
                        />
                        <text
                          x="75"
                          y="26"
                          textAnchor="middle"
                          fill="#1e293b"
                          fontSize="13"
                          fontWeight={isRoot ? '700' : '600'}
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        >
                          {node.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Node Inspector Bar */}
                {selectedMindNodeId && (
                  <div className="diagram-node-inspector">
                    <label>Edit Idea:</label>
                    <input
                      type="text"
                      value={mindNodes.find((n) => n.id === selectedMindNodeId)?.label || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMindNodes((prev) =>
                          prev.map((n) => (n.id === selectedMindNodeId ? { ...n, label: val } : n))
                        );
                        setSaveStatus('unsaved');
                      }}
                      placeholder="Idea name..."
                      autoFocus
                    />
                    <div className="node-color-picker">
                      {NODE_COLORS.map((nc) => (
                        <button
                          key={nc.name}
                          className="node-color-btn"
                          style={{ backgroundColor: nc.border }}
                          title={nc.name}
                          onClick={() => {
                            pushHistory();
                            setMindNodes((prev) =>
                              prev.map((n) => (n.id === selectedMindNodeId ? { ...n, color: nc.bg } : n))
                            );
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Flowchart Mode */
              <div className="diagram-workspace flowchart-workspace">
                <svg
                  className="diagram-svg-root"
                  viewBox="0 0 1200 800"
                  onPointerMove={handleDiagramPointerMove}
                  onPointerUp={handleDiagramPointerUp}
                  style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: '0 0' }}
                >
                  <defs>
                    <pattern id="flow-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
                    </pattern>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="10"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                    </marker>
                  </defs>
                  <rect width="1200" height="800" fill="url(#flow-grid)" />

                  {/* Flow Edges with Arrowhead */}
                  {flowEdges.map((edge) => {
                    const source = flowNodes.find((n) => n.id === edge.source);
                    const target = flowNodes.find((n) => n.id === edge.target);
                    if (!source || !target) return null;

                    const sx = source.x + 70;
                    const sy = source.y + 25;
                    const tx = target.x + 70;
                    const ty = target.y + 25;

                    return (
                      <g key={edge.id} className="flow-edge-group">
                        <line
                          x1={sx}
                          y1={sy}
                          x2={tx}
                          y2={ty}
                          stroke="#475569"
                          strokeWidth="2"
                          markerEnd="url(#arrow)"
                        />
                        <circle
                          cx={(sx + tx) / 2}
                          cy={(sy + ty) / 2}
                          r="6"
                          fill="#ef4444"
                          className="delete-edge-handle"
                          onClick={() => handleDeleteFlowEdge(edge.id)}
                        >
                          <title>Delete connector</title>
                        </circle>
                      </g>
                    );
                  })}

                  {/* Flowchart Steps */}
                  {flowNodes.map((node) => {
                    const isSelected = selectedFlowNodeId === node.id;
                    const isLinkingSource = linkingSourceId === node.id;

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        className="flow-node-group"
                        onPointerDown={(e) => handleDiagramPointerDown(e, node.id, 'flow', node.x, node.y)}
                        onClick={() => setSelectedFlowNodeId(node.id)}
                      >
                        {node.shape === 'terminal' ? (
                          <rect
                            width="140"
                            height="50"
                            rx="25"
                            fill={node.color || '#eff6ff'}
                            stroke={isLinkingSource ? '#10b981' : isSelected ? '#2563eb' : '#94a3b8'}
                            strokeWidth={isSelected || isLinkingSource ? '2.5' : '1.5'}
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"
                          />
                        ) : node.shape === 'decision' ? (
                          <polygon
                            points="70,0 140,25 70,50 0,25"
                            fill={node.color || '#fffbeb'}
                            stroke={isLinkingSource ? '#10b981' : isSelected ? '#2563eb' : '#d97706'}
                            strokeWidth={isSelected || isLinkingSource ? '2.5' : '1.5'}
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"
                          />
                        ) : node.shape === 'note' ? (
                          <polygon
                            points="0,0 120,0 140,20 140,50 0,50"
                            fill="#fef08a"
                            stroke="#ca8a04"
                            strokeWidth="1.5"
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"
                          />
                        ) : (
                          /* Process Rectangle */
                          <rect
                            width="140"
                            height="50"
                            rx="6"
                            fill={node.color || '#f0fdf4'}
                            stroke={isLinkingSource ? '#10b981' : isSelected ? '#2563eb' : '#22c55e'}
                            strokeWidth={isSelected || isLinkingSource ? '2.5' : '1.5'}
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"
                          />
                        )}

                        <text
                          x="70"
                          y="29"
                          textAnchor="middle"
                          fill="#0f172a"
                          fontSize="12"
                          fontWeight="600"
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        >
                          {node.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Node Inspector Bar */}
                {selectedFlowNodeId && (
                  <div className="diagram-node-inspector">
                    <label>Edit Step:</label>
                    <input
                      type="text"
                      value={flowNodes.find((n) => n.id === selectedFlowNodeId)?.label || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFlowNodes((prev) =>
                          prev.map((n) => (n.id === selectedFlowNodeId ? { ...n, label: val } : n))
                        );
                        setSaveStatus('unsaved');
                      }}
                      placeholder="Step label..."
                      autoFocus
                    />
                    <select
                      value={flowNodes.find((n) => n.id === selectedFlowNodeId)?.shape || 'process'}
                      onChange={(e) => {
                        const shape = e.target.value as FlowNode['shape'];
                        pushHistory();
                        setFlowNodes((prev) =>
                          prev.map((n) => (n.id === selectedFlowNodeId ? { ...n, shape } : n))
                        );
                      }}
                    >
                      <option value="process">Rectangle (Process)</option>
                      <option value="terminal">Pill (Start / End)</option>
                      <option value="decision">Diamond (Decision)</option>
                      <option value="note">Sticky (Note)</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default CanvasPage;

