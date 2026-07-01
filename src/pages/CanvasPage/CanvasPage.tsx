import { useCallback, useEffect, useRef, useState } from 'react';
import dataService from '@/services/DataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/Toast/Toast';
import '../PlannerPages.css';

type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string; width: number };

function emptyStrokeData() {
  return { version: 1, strokes: [] as Stroke[] };
}

export function CanvasPage() {
  const { activeProfile } = useProfile();
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [title, setTitle] = useState('Untitled Canvas');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState('#1f2937');
  const [width, setWidth] = useState(4);
  const [isLoading, setIsLoading] = useState(true);

  const selectedDoc = documents.find((doc) => doc.id === selectedId);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(rect.width * ratio) || canvas.height !== Math.floor(rect.height * ratio)) {
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      ctx.scale(ratio, ratio);
    }

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    });
  }, [strokes]);

  const loadDocuments = useCallback(async () => {
    if (!activeProfile) return;

    setIsLoading(true);
    try {
      const docs = await dataService.getCanvasDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !selectedId) {
        setSelectedId(docs[0].id);
      }
    } catch (error) {
      console.error('Failed to load canvas documents:', error);
      showToast('Failed to load canvas documents', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, selectedId, showToast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (!selectedDoc) {
      setTitle('Untitled Canvas');
      setStrokes([]);
      return;
    }

    setTitle(selectedDoc.title || 'Untitled Canvas');
    setStrokes(Array.isArray(selectedDoc.stroke_data?.strokes) ? selectedDoc.stroke_data.strokes : []);
  }, [selectedDoc]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    currentStrokeRef.current = { color, width, points: [canvasPoint(event)] };
    setStrokes((prev) => [...prev, currentStrokeRef.current as Stroke]);
  };

  const moveDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    currentStrokeRef.current.points.push(canvasPoint(event));
    setStrokes((prev) => [...prev.slice(0, -1), currentStrokeRef.current as Stroke]);
  };

  const endDrawing = () => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    drawingRef.current = false;
    currentStrokeRef.current = null;
  };

  const createDocument = async () => {
    try {
      const created = await dataService.createCanvasDocument({
        title: 'Untitled Canvas',
        stroke_data: emptyStrokeData(),
      });
      setDocuments((prev) => [created, ...prev]);
      setSelectedId(created.id);
    } catch (error) {
      console.error('Failed to create canvas document:', error);
      showToast('Failed to create canvas', 'error');
    }
  };

  const saveDocument = async () => {
    if (!selectedId) return;
    try {
      const updated = await dataService.updateCanvasDocument(selectedId, {
        title,
        stroke_data: { version: 1, strokes },
      });
      setDocuments((prev) => prev.map((doc) => doc.id === selectedId ? updated : doc));
      showToast('Canvas saved', 'success');
    } catch (error) {
      console.error('Failed to save canvas:', error);
      showToast('Failed to save canvas', 'error');
    }
  };

  const clearCanvas = () => {
    setStrokes([]);
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading canvas...</p>
      </div>
    );
  }

  return (
    <div className="planner-page">
      <header className="planner-header">
        <div>
          <h2>Canvas Documents</h2>
          <p>Sketch, write, and save simple freehand canvas notes.</p>
        </div>
        <div className="planner-header-actions">
          <button className="btn-secondary" onClick={createDocument}>New Canvas</button>
          <button className="btn-primary" onClick={saveDocument} disabled={!selectedId}>Save</button>
        </div>
      </header>

      <div className="planner-canvas-shell">
        <aside className="planner-card">
          <div className="planner-card-header">
            <h3>Documents</h3>
          </div>
          <div className="planner-list">
            {documents.length === 0 ? <p className="planner-empty">No canvas documents.</p> : documents.map((doc) => (
              <button
                className="planner-row"
                key={doc.id}
                onClick={() => setSelectedId(doc.id)}
                style={{ border: doc.id === selectedId ? '2px solid #2563eb' : undefined, textAlign: 'left' }}
              >
                <strong>{doc.title}</strong>
                <small>{new Date(doc.updated_at || doc.created_at).toLocaleString()}</small>
              </button>
            ))}
          </div>
        </aside>

        <main className="planner-card">
          <div className="planner-card-header">
            <h3>Drawing Surface</h3>
            <span className="planner-muted">{strokes.length} strokes</span>
          </div>
          <div className="planner-form">
            <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} placeholder="Document title" />
            <div className="planner-form-row">
              <label>Color<input type="color" value={color} onChange={(event) => setColor(event.currentTarget.value)} /></label>
              <label>Width<input type="range" min={1} max={16} value={width} onChange={(event) => setWidth(Number(event.currentTarget.value))} /></label>
            </div>
            <div className="planner-actions">
              <button className="btn-secondary" onClick={clearCanvas}>Clear</button>
              <button className="btn-primary" onClick={saveDocument} disabled={!selectedId}>Save Drawing</button>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            className="planner-canvas"
            onPointerDown={startDrawing}
            onPointerMove={moveDrawing}
            onPointerUp={endDrawing}
            onPointerCancel={endDrawing}
          />
        </main>
      </div>
    </div>
  );
}

export default CanvasPage;
