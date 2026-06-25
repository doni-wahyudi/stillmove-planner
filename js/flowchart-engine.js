/**
 * FlowchartEngine - Handles SVG-based infinite canvas for flowcharts
 * Manages shapes, edges, panning, zooming, and interactions.
 */

import dataService from './data-service.js';

export class FlowchartEngine {
    constructor(svgElement, containerElement, toolbarElement) {
        this.svg = svgElement;
        this.container = containerElement;
        this.toolbar = toolbarElement;

        // Layers
        this.viewport = this.svg.querySelector('#fc-viewport');
        this.edgesLayer = this.viewport.querySelector('#fc-edges-layer');
        this.nodesLayer = this.viewport.querySelector('#fc-nodes-layer');
        this.gridBg = this.svg.querySelector('#fc-grid-bg');

        // State
        this.flowchartId = null;
        this.nodes = [];
        this.edges = [];
        this.viewState = { x: 0, y: 0, zoom: 1 };

        // Interaction state
        this.currentTool = 'select'; // select, rectangle, diamond, capsule, edge
        this.isPanning = false;
        this.isDraggingNode = false;
        this.isDrawingEdge = false;
        this.selectedNodeIds = new Set();
        this.selectedEdgeIds = new Set();
        this.dragNodeCache = [];
        this.tempEdge = null;
        this.mousePos = { x: 0, y: 0 };
        this.lastMousePos = { x: 0, y: 0 };

        // Undo/Redo stack
        this.undoStack = [];
        this.redoStack = [];

        // Double click tracker
        this.lastClick = null;

        // Bindings
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onWheel = this._onWheel.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onDoubleClick = this._onDoubleClick.bind(this);

        this.init();
    }

    init() {
        this._setupEventListeners();
        this._updateTransform();
    }

    _setupEventListeners() {
        this.svg.addEventListener('mousedown', this._onMouseDown);
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);
        this.svg.addEventListener('wheel', this._onWheel, { passive: false });
        document.addEventListener('keydown', this._onKeyDown);
    }

    dispose() {
        this.svg.removeEventListener('mousedown', this._onMouseDown);
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mouseup', this._onMouseUp);
        this.svg.removeEventListener('wheel', this._onWheel);
        document.removeEventListener('keydown', this._onKeyDown);
        this.clear();
    }

    clear() {
        this.nodes = [];
        this.edges = [];
        this.nodesLayer.innerHTML = '';
        this.edgesLayer.innerHTML = '';
        this.selectedNodeIds.clear();
        this.selectedEdgeIds.clear();
        this.undoStack = [];
        this.redoStack = [];
    }

    setTool(toolName) {
        this.currentTool = toolName;
        if (toolName !== 'select') {
            this.svg.style.cursor = 'crosshair';
            this._clearSelection();
        } else {
            this.svg.style.cursor = 'default';
        }
    }

    async loadFlowchart(doc) {
        this.clear();
        this.flowchartId = doc.id;

        if (doc.viewport) {
            this.viewState = { ...doc.viewport };
            this._updateTransform();
        }

        try {
            const [nodes, edges] = await Promise.all([
                dataService.getFlowchartNodes(doc.id),
                dataService.getFlowchartEdges(doc.id)
            ]);

            this.nodes = nodes || [];
            this.edges = edges || [];
            this._renderAll();
        } catch (error) {
            console.error('Failed to load flowchart data', error);
        }
    }

    // ==========================================
    // RENDERING
    // ==========================================

    _renderAll() {
        this.edgesLayer.innerHTML = '';
        this.nodesLayer.innerHTML = '';

        this.edges.forEach(edge => this._renderEdge(edge));
        this.nodes.forEach(node => this._renderNode(node));
    }

    _renderNode(node) {
        let g = this.nodesLayer.querySelector(`g[data-id="${node.id}"]`);
        if (!g) {
            g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'fc-node');
            g.setAttribute('data-id', node.id);
            this.nodesLayer.appendChild(g);
        }

        const isSelected = this.selectedNodeIds.has(node.id);
        const strokeWidth = isSelected ? 2 : 1.5;
        const strokeColor = isSelected ? '#3b82f6' : (node.color || '#475569');
        const bgColor = node.bg_color || '#ffffff';

        g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

        // Shape path
        let pathD = '';
        const w = node.width;
        const h = node.height;
        const hw = w / 2;
        const hh = h / 2;

        switch (node.type) {
            case 'diamond':
                pathD = `M ${hw} 0 L ${w} ${hh} L ${hw} ${h} L 0 ${hh} Z`;
                break;
            case 'capsule':
                const r = Math.min(hw, hh);
                pathD = `M ${r} 0 h ${w - 2 * r} a ${r} ${r} 0 0 1 ${r} ${r} v ${h - 2 * r} a ${r} ${r} 0 0 1 -${r} ${r} h -${w - 2 * r} a ${r} ${r} 0 0 1 -${r} -${r} v -${h - 2 * r} a ${r} ${r} 0 0 1 ${r} -${r} z`;
                break;
            case 'parallelogram':
                const offset = h * 0.3;
                pathD = `M ${offset} 0 L ${w} 0 L ${w - offset} ${h} L 0 ${h} Z`;
                break;
            case 'rectangle':
            default:
                pathD = `M 0 0 h ${w} v ${h} h -${w} Z`;
                break;
        }

        g.innerHTML = `
            <path d="${pathD}" fill="${bgColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" 
                  class="fc-shape" filter="${isSelected ? 'drop-shadow(0 2px 4px rgba(59,130,246,0.3))' : ''}" />
            <foreignObject x="4" y="4" width="${w - 8}" height="${h - 8}" style="pointer-events: none;">
                <div xmlns="http://www.w3.org/1999/xhtml" class="fc-node-text"
                     style="color: ${node.text_color || '#0f172a'}; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; text-align: center; font-size: 13px; font-weight: 500; font-family: inherit; overflow: hidden; pointer-events: none;">
                    ${this._escapeHtml(node.label || '')}
                </div>
            </foreignObject>
            ${isSelected ? this._renderSelectionHandles(w, h) : ''}
        `;
    }

    _renderSelectionHandles(w, h) {
        // Selection box with edge dragging handles and quick add buttons
        return `
            <rect x="-4" y="-4" width="${w + 8}" height="${h + 8}" fill="none" stroke="#3b82f6" stroke-width="1" stroke-dasharray="4" pointer-events="none"/>
            <circle cx="0" cy="${h / 2}" r="5" fill="#fff" stroke="#3b82f6" stroke-width="2" class="fc-handle left" data-handle="left"/>
            <circle cx="${w}" cy="${h / 2}" r="5" fill="#fff" stroke="#3b82f6" stroke-width="2" class="fc-handle right" data-handle="right"/>
            <circle cx="${w / 2}" cy="0" r="5" fill="#fff" stroke="#3b82f6" stroke-width="2" class="fc-handle top" data-handle="top"/>
            <circle cx="${w / 2}" cy="${h}" r="5" fill="#fff" stroke="#3b82f6" stroke-width="2" class="fc-handle bottom" data-handle="bottom"/>
            
            <g class="fc-quick-add" transform="translate(-20, ${h / 2})" data-dir="left" style="cursor: pointer;">
                <circle cx="0" cy="0" r="8" fill="#3b82f6" />
                <path d="M -4 0 L 4 0 M 0 -4 L 0 4" stroke="#fff" stroke-width="1.5" />
            </g>
            <g class="fc-quick-add" transform="translate(${w + 20}, ${h / 2})" data-dir="right" style="cursor: pointer;">
                <circle cx="0" cy="0" r="8" fill="#3b82f6" />
                <path d="M -4 0 L 4 0 M 0 -4 L 0 4" stroke="#fff" stroke-width="1.5" />
            </g>
            <g class="fc-quick-add" transform="translate(${w / 2}, -20)" data-dir="top" style="cursor: pointer;">
                <circle cx="0" cy="0" r="8" fill="#3b82f6" />
                <path d="M -4 0 L 4 0 M 0 -4 L 0 4" stroke="#fff" stroke-width="1.5" />
            </g>
            <g class="fc-quick-add" transform="translate(${w / 2}, ${h + 20})" data-dir="bottom" style="cursor: pointer;">
                <circle cx="0" cy="0" r="8" fill="#3b82f6" />
                <path d="M -4 0 L 4 0 M 0 -4 L 0 4" stroke="#fff" stroke-width="1.5" />
            </g>
        `;
    }

    _renderEdge(edge) {
        let g = this.edgesLayer.querySelector(`g[data-id="${edge.id}"]`);
        if (!g) {
            g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'fc-edge');
            g.setAttribute('data-id', edge.id);
            this.edgesLayer.appendChild(g);
        }

        const source = this.nodes.find(n => n.id === edge.source_node_id);
        const target = this.nodes.find(n => n.id === edge.target_node_id);
        if (!source || !target) return;

        const isSelected = this.selectedEdgeIds.has(edge.id);
        const strokeColor = isSelected ? '#3b82f6' : (edge.color || '#94a3b8');
        const strokeWidth = isSelected ? 3 : 2;

        const style = edge.style || 'orthogonal';
        const arrowType = edge.arrow_type || 'forward';

        let pathD, labelPt;
        if (style === 'straight') {
            const p1 = this._getHandlePoint(source, edge.source_handle || 'right');
            const p2 = this._getHandlePoint(target, edge.target_handle || 'left');
            pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
            labelPt = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        } else {
            const result = this._getOrthogonalPath(source, target, edge.source_handle, edge.target_handle);
            pathD = result.pathD;
            labelPt = result.labelPt;
        }

        const markerStart = arrowType === 'both' ? `marker-start="url(#fc-arrowhead-start-${isSelected ? 'selected' : 'default'})"` : '';
        const markerEnd = arrowType !== 'none' ? `marker-end="url(#fc-arrowhead-${isSelected ? 'selected' : 'default'})"` : '';

        g.innerHTML = `
            <path d="${pathD}" fill="none" class="fc-edge-bg" stroke="transparent" stroke-width="12" style="cursor: pointer;" />
            <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" 
                  ${markerStart}
                  ${markerEnd}
                  stroke-dasharray="${edge.dashed ? '6,6' : 'none'}" style="pointer-events: none;" />
            ${edge.label ? `
            <g transform="translate(${labelPt.x}, ${labelPt.y})" style="pointer-events: none;">
                <rect x="-20" y="-10" width="40" height="20" fill="#fff" rx="4" style="pointer-events: none;" />
                <text x="0" y="4" text-anchor="middle" font-size="11" fill="#475569" style="pointer-events: none;">${this._escapeHtml(edge.label)}</text>
            </g>` : ''}
        `;
    }

    _renderTempEdge(p1, p2) {
        let g = this.edgesLayer.querySelector('#fc-temp-edge');
        if (!g) {
            g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('id', 'fc-temp-edge');
            this.edgesLayer.appendChild(g);
        }

        // Simple straight dashed line for dragging
        g.innerHTML = `
            <path d="M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4" marker-end="url(#fc-arrowhead-selected)"/>
        `;
    }

    // ==========================================
    // EVENTS & INTERACTIONS
    // ==========================================

    // Helper: walk parentNode to find an ancestor with a given class.
    // Unlike closest(), this crosses the SVG ↔ HTML (foreignObject) namespace boundary.
    _findAncestor(el, className) {
        let cur = el;
        while (cur && cur !== this.svg && cur !== document) {
            if (cur.classList && cur.classList.contains(className)) return cur;
            cur = cur.parentNode;
        }
        return null;
    }

    _onMouseDown(e) {
        if (e.button !== 0) return; // Only left click

        const svgPt = this._screenToSVG(e.clientX, e.clientY);
        this.lastMousePos = { x: e.clientX, y: e.clientY };

        // Use _findAncestor instead of closest() to cross the SVG/HTML namespace boundary
        const targetNode = this._findAncestor(e.target, 'fc-node');
        const targetHandle = this._findAncestor(e.target, 'fc-handle');
        const targetEdge = this._findAncestor(e.target, 'fc-edge');
        const targetQuickAdd = this._findAncestor(e.target, 'fc-quick-add');

        // Custom Double Click Tracker (bypasses SVG dblclick bugs)
        // Check ANY interactive element — after first click selects a node and re-renders,
        // the second click often lands on a selection handle or quick-add button overlaying the shape.
        const clickedId = targetNode ? targetNode.dataset.id
            : targetEdge ? targetEdge.dataset.id
                : targetHandle ? this._findAncestor(targetHandle, 'fc-node')?.dataset?.id
                    : targetQuickAdd ? this._findAncestor(targetQuickAdd, 'fc-node')?.dataset?.id
                        : null;

        if (clickedId) {
            const now = Date.now();
            if (this.lastClick && this.lastClick.id === clickedId && (now - this.lastClick.time < 500)) {
                // Find the actual node or edge data
                const node = this.nodes.find(n => n.id === clickedId);
                const edge = this.edges.find(e => e.id === clickedId);
                if (node) {
                    this._editLabel(node, 'node', e.clientX, e.clientY);
                } else if (edge) {
                    this._editLabel(edge, 'edge', e.clientX, e.clientY);
                }
                this.lastClick = null;
                return; // Consume the click entirely
            } else {
                this.lastClick = { id: clickedId, time: now };
            }
        }

        // Pan with Space or Middle click (handled implicitly by button !== 0 above usually, but just in case)
        if (e.altKey || this.currentTool === 'pan' || (!targetNode && !targetHandle && !targetEdge && !targetQuickAdd && this.currentTool === 'select')) {
            this.isPanning = true;
            this._clearSelection();
            return;
        }

        if (this.currentTool !== 'select' && this.currentTool !== 'edge') {
            // Create new node mode
            this._createNode(this.currentTool, svgPt.x - 60, svgPt.y - 30);
            this.setTool('select');
            return;
        }

        if (targetQuickAdd) {
            e.stopPropagation();
            const sourceNodeId = this._findAncestor(targetQuickAdd, 'fc-node').dataset.id;
            this._quickAddNode(sourceNodeId, targetQuickAdd.dataset.dir);
            return;
        }

        if (targetHandle) {
            // Start drawing edge from handle
            this.isDrawingEdge = true;
            const nodeId = this._findAncestor(targetHandle, 'fc-node').dataset.id;
            const handleId = targetHandle.dataset.handle;
            this.tempEdge = { sourceId: nodeId, sourceHandle: handleId, startPt: this._getHandlePoint(this.nodes.find(n => n.id === nodeId), handleId) };
            return;
        }

        if (targetNode) {
            const nodeId = targetNode.dataset.id;
            // Select node
            if (!e.shiftKey && !this.selectedNodeIds.has(nodeId)) {
                this._clearSelection();
            }
            this.selectedNodeIds.add(nodeId);
            this._renderAll(); // Re-render to show selection

            // Start dragging node
            this.isDraggingNode = true;
            this.svg.style.cursor = 'move';
            this.dragStartSvgPt = svgPt;
            this.dragNodeCache = Array.from(this.selectedNodeIds).map(id => {
                const n = this.nodes.find(node => node.id === id);
                return { id, startX: n.x, startY: n.y };
            });
            return;
        }

        if (targetEdge) {
            const edgeId = targetEdge.dataset.id;
            this._clearSelection();
            this.selectedEdgeIds.add(edgeId);
            this._renderAll();
        }
    }

    _onMouseMove(e) {
        if (this.isPanning) {
            const dx = (e.clientX - this.lastMousePos.x) / this.viewState.zoom;
            const dy = (e.clientY - this.lastMousePos.y) / this.viewState.zoom;
            this.viewState.x += dx;
            this.viewState.y += dy;
            this._updateTransform();
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            return;
        }

        const svgPt = this._screenToSVG(e.clientX, e.clientY);

        if (this.isDraggingNode) {
            const dx = svgPt.x - this.dragStartSvgPt.x;
            const dy = svgPt.y - this.dragStartSvgPt.y;

            // Clear old snap lines
            this.svg.querySelectorAll('.fc-snap-line').forEach(el => el.remove());

            this.dragNodeCache.forEach(cache => {
                const node = this.nodes.find(n => n.id === cache.id);
                if (node) {
                    node.x = cache.startX + dx;
                    node.y = cache.startY + dy;

                    // Smart Snapping (only if single node dragged for simplicity)
                    if (this.dragNodeCache.length === 1 && !e.altKey) {
                        const snapDist = 6;
                        const centerX = node.x + node.width / 2;
                        const centerY = node.y + node.height / 2;

                        for (const other of this.nodes) {
                            if (other.id === node.id) continue;
                            const otherCenterX = other.x + other.width / 2;
                            const otherCenterY = other.y + other.height / 2;

                            // X Align
                            if (Math.abs(centerX - otherCenterX) < snapDist) {
                                node.x = otherCenterX - node.width / 2;
                                this._drawSnapLine(otherCenterX, 0, otherCenterX, 2000); // vertical line
                            } else if (Math.abs(node.x - other.x) < snapDist) {
                                node.x = other.x;
                                this._drawSnapLine(other.x, 0, other.x, 2000);
                            } else if (Math.abs(node.x + node.width - (other.x + other.width)) < snapDist) {
                                node.x = other.x + other.width - node.width;
                                this._drawSnapLine(other.x + other.width, 0, other.x + other.width, 2000);
                            }

                            // Y Align
                            if (Math.abs(centerY - otherCenterY) < snapDist) {
                                node.y = otherCenterY - node.height / 2;
                                this._drawSnapLine(0, otherCenterY, 2000, otherCenterY); // horizontal line
                            } else if (Math.abs(node.y - other.y) < snapDist) {
                                node.y = other.y;
                                this._drawSnapLine(0, other.y, 2000, other.y);
                            } else if (Math.abs(node.y + node.height - (other.y + other.height)) < snapDist) {
                                node.y = other.y + other.height - node.height;
                                this._drawSnapLine(0, other.y + other.height, 2000, other.y + other.height);
                            }
                        }
                    }
                }
            });

            // Re-render edges connected to these nodes
            this.dragNodeCache.forEach(cache => {
                this._updateConnectedEdges(cache.id);
                this._renderNode(this.nodes.find(n => n.id === cache.id));
            });

            this.lastMousePos = { x: e.clientX, y: e.clientY };
        }

        if (this.isDrawingEdge) {
            this._renderTempEdge(this.tempEdge.startPt, svgPt);
        }
    }

    _drawSnapLine(x1, y1, x2, y2) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', '#0ea5e9'); // light blue
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '4');
        line.setAttribute('class', 'fc-snap-line');
        line.setAttribute('pointer-events', 'none');
        this.edgesLayer.appendChild(line);
    }

    async _onMouseUp(e) {
        this.svg.style.cursor = 'default';

        if (this.isPanning) {
            this.isPanning = false;
            this._scheduleViewportSave();
        }

        if (this.isDraggingNode) {
            this.isDraggingNode = false;
            this.svg.querySelectorAll('.fc-snap-line').forEach(el => el.remove());

            // Snap to grid
            this.dragNodeCache.forEach(cache => {
                const node = this.nodes.find(n => n.id === cache.id);
                if (node) {
                    node.x = Math.round(node.x / 10) * 10;
                    node.y = Math.round(node.y / 10) * 10;
                    this._renderNode(node);
                    this._updateConnectedEdges(node.id);
                }
            });

            // Save positions to DB
            const updates = this.dragNodeCache.map(cache => {
                const n = this.nodes.find(node => node.id === cache.id);
                return { id: n.id, x: n.x, y: n.y };
            });
            if (updates.length > 0) {
                // Background save
                dataService.batchUpdateFlowchartNodes(updates).catch(err => console.error(err));
            }
        }

        if (this.isDrawingEdge) {
            this.isDrawingEdge = false;
            const tempLayer = this.edgesLayer.querySelector('#fc-temp-edge');
            if (tempLayer) tempLayer.remove();

            // Check what we dropped on
            const svgDropPt = this._screenToSVG(e.clientX, e.clientY);

            // Spatial hit test for node bounding boxes
            const targetNode = [...this.nodes].reverse().find(n =>
                svgDropPt.x >= n.x && svgDropPt.x <= (n.x + n.width) &&
                svgDropPt.y >= n.y && svgDropPt.y <= (n.y + n.height)
            );

            if (targetNode) {
                const targetId = targetNode.id;
                let targetHandle = 'left';
                const dx = svgDropPt.x - (targetNode.x + targetNode.width / 2);
                const dy = svgDropPt.y - (targetNode.y + targetNode.height / 2);
                if (Math.abs(dx) > Math.abs(dy)) {
                    targetHandle = dx > 0 ? 'right' : 'left';
                } else {
                    targetHandle = dy > 0 ? 'bottom' : 'top';
                }

                if (targetId && targetId !== this.tempEdge.sourceId) {
                    this._createEdge(this.tempEdge.sourceId, targetId, this.tempEdge.sourceHandle, targetHandle);
                }
            }
            this.tempEdge = null;
        }
    }

    _onWheel(e) {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const pt = this._screenToSVG(e.clientX, e.clientY);
            const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
            this._zoom(zoomDelta, pt);
        } else {
            // Panning
            this.viewState.x -= e.deltaX / this.viewState.zoom;
            this.viewState.y -= e.deltaY / this.viewState.zoom;
            this._updateTransform();
            this._scheduleViewportSave();
        }
    }

    _onDoubleClick(e) {
        // Implement inline editing
        let targetNode = null;
        let targetEdge = null;

        // Traverse up the DOM from the target to find the group element
        let current = e.target;
        while (current && current !== this.svg) {
            if (current.classList && current.classList.contains('fc-node')) {
                targetNode = current;
                break;
            }
            if (current.classList && current.classList.contains('fc-edge')) {
                targetEdge = current;
                break;
            }
            current = current.parentNode;
        }

        if (targetNode) {
            const id = targetNode.dataset.id;
            const node = this.nodes.find(n => n.id === id);
            this._editLabel(node, 'node', e.clientX, e.clientY);
        } else if (targetEdge) {
            const id = targetEdge.dataset.id;
            const edge = this.edges.find(e => e.id === id);
            this._editLabel(edge, 'edge', e.clientX, e.clientY);
        }
    }

    _onKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // Delete
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this._deleteSelected();
        }

        // Edit on Enter
        if (e.key === 'Enter' && !e.shiftKey) {
            if (this.selectedNodeIds.size === 1) {
                const id = Array.from(this.selectedNodeIds)[0];
                const node = this.nodes.find(n => n.id === id);
                if (node) this._editLabel(node, 'node', null, null);
            } else if (this.selectedEdgeIds.size === 1) {
                const id = Array.from(this.selectedEdgeIds)[0];
                const edge = this.edges.find(e => e.id === id);
                if (edge) this._editLabel(edge, 'edge', null, null);
            }
        }
    }

    // ==========================================
    // ACTIONS & MATH
    // ==========================================

    _clearSelection() {
        if (this.selectedNodeIds.size === 0 && this.selectedEdgeIds.size === 0) return;

        const nodesToReRender = Array.from(this.selectedNodeIds);
        const edgesToReRender = Array.from(this.selectedEdgeIds);

        this.selectedNodeIds.clear();
        this.selectedEdgeIds.clear();

        nodesToReRender.forEach(id => {
            const n = this.nodes.find(x => x.id === id);
            if (n) this._renderNode(n);
        });
        edgesToReRender.forEach(id => {
            const e = this.edges.find(x => x.id === id);
            if (e) this._renderEdge(e);
        });
    }

    async _createNode(type, x, y) {
        let user;
        try {
            const authStr = localStorage.getItem('sb-qoubdtqujluxqfkwleuh-auth-token');
            if (authStr) {
                user = JSON.parse(authStr).user;
            } else {
                const { data } = await dataService.supabase.auth.getUser();
                user = data?.user;
            }
        } catch (e) {
            console.error('Failed to get user', e);
        }

        const nodeData = {
            flowchart_id: this.flowchartId,
            user_id: user?.id,
            type: type,
            label: type.charAt(0).toUpperCase() + type.slice(1),
            x: Math.round(x / 10) * 10,
            y: Math.round(y / 10) * 10,
            width: 120,
            height: 60
        };

        // UI Optimism
        const tempId = 'temp_' + Date.now();
        const optimisticNode = { ...nodeData, id: tempId };
        this.nodes.push(optimisticNode);
        this._renderNode(optimisticNode);

        try {
            const savedNode = await dataService.createFlowchartNode(nodeData);
            this.nodes = this.nodes.filter(n => n.id !== tempId); // replace temp
            this.nodes.push(savedNode);
            this._renderAll();

            // Auto open editor
            setTimeout(() => this._editLabel(savedNode, 'node', null, null), 50);

            return savedNode;
        } catch (error) {
            console.error('Failed to create node', error);
            this.nodes = this.nodes.filter(n => n.id !== tempId);
            this._renderAll();
            return null;
        }
    }

    async _quickAddNode(sourceId, dir) {
        const sourceNode = this.nodes.find(n => n.id === sourceId);
        if (!sourceNode) return;

        const spacing = 100; // Layout distance
        let nx = sourceNode.x;
        let ny = sourceNode.y;

        if (dir === 'left') nx -= sourceNode.width + spacing;
        if (dir === 'right') nx += sourceNode.width + spacing;
        if (dir === 'top') ny -= sourceNode.height + spacing;
        if (dir === 'bottom') ny += sourceNode.height + spacing;

        const newNode = await this._createNode(sourceNode.type, nx, ny);
        if (newNode) {
            let sHandle = 'right', tHandle = 'left';
            if (dir === 'left') { sHandle = 'left'; tHandle = 'right'; }
            if (dir === 'right') { sHandle = 'right'; tHandle = 'left'; }
            if (dir === 'top') { sHandle = 'top'; tHandle = 'bottom'; }
            if (dir === 'bottom') { sHandle = 'bottom'; tHandle = 'top'; }

            this._createEdge(sourceId, newNode.id, sHandle, tHandle);

            // Auto Select new node
            this._clearSelection();
            this.selectedNodeIds.add(newNode.id);
            this._renderAll();

            // Auto open editor
            setTimeout(() => this._editLabel(newNode, 'node', null, null), 50);
        }
    }

    async _createEdge(sourceId, targetId, sourceHandle = 'right', targetHandle = 'left') {
        // Prevent duplicate straight edges
        if (this.edges.some(e => e.source_node_id === sourceId && e.target_node_id === targetId)) {
            return;
        }

        let user;
        try {
            const authStr = localStorage.getItem('sb-qoubdtqujluxqfkwleuh-auth-token');
            if (authStr) {
                user = JSON.parse(authStr).user;
            } else {
                const { data } = await dataService.supabase.auth.getUser();
                user = data?.user;
            }
        } catch (e) {
            console.error('Failed to get user', e);
        }

        const lineStyleSelect = document.getElementById('fc-line-style');
        const arrowTypeSelect = document.getElementById('fc-arrow-type');

        const edgeData = {
            flowchart_id: this.flowchartId,
            user_id: user?.id,
            source_node_id: sourceId,
            target_node_id: targetId,
            source_handle: sourceHandle,
            target_handle: targetHandle,
            style: lineStyleSelect ? lineStyleSelect.value : 'orthogonal',
            arrow_type: arrowTypeSelect ? arrowTypeSelect.value : 'forward'
        };

        const tempId = 'temp_e_' + Date.now();
        const optimisticEdge = { ...edgeData, id: tempId };
        this.edges.push(optimisticEdge);
        this._renderEdge(optimisticEdge);

        try {
            const savedEdge = await dataService.createFlowchartEdge(edgeData);
            this.edges = this.edges.filter(e => e.id !== tempId);
            this.edges.push(savedEdge);
            this._renderEdge(savedEdge);

            // Auto open editor
            setTimeout(() => this._editLabel(savedEdge, 'edge', null, null), 50);
        } catch (error) {
            this.edges = this.edges.filter(e => e.id !== tempId);
            this._renderAll();
        }
    }

    async _deleteSelected() {
        // Implement deletion logic
        const nodesToDelete = Array.from(this.selectedNodeIds);
        const edgesToDelete = Array.from(this.selectedEdgeIds);

        // Remove locally immediately
        this.nodes = this.nodes.filter(n => !nodesToDelete.includes(n.id));
        this.edges = this.edges.filter(e => !edgesToDelete.includes(e.id) && !nodesToDelete.includes(e.source_node_id) && !nodesToDelete.includes(e.target_node_id));

        this._clearSelection();
        this._renderAll();

        // Background APIs
        for (const id of edgesToDelete) dataService.deleteFlowchartEdge(id).catch(console.error);
        for (const id of nodesToDelete) dataService.deleteFlowchartNode(id).catch(console.error);
    }

    updateSelectedEdges(updates) {
        if (this.selectedEdgeIds.size === 0) return;

        const edgeIds = Array.from(this.selectedEdgeIds);
        edgeIds.forEach(id => {
            const edge = this.edges.find(e => e.id === id);
            if (edge) {
                Object.assign(edge, updates);
                this._renderEdge(edge);
                dataService.updateFlowchartEdge(id, updates).catch(console.error);
            }
        });
    }

    updateSelectedNodes(updates) {
        if (this.selectedNodeIds.size === 0) return;

        const nodeIds = Array.from(this.selectedNodeIds);

        // Map abstract styling updates to db fields
        const dbUpdates = { ...updates };
        if (updates.color !== undefined) {
            dbUpdates.bg_color = updates.color; // We use bg_color for the fill
            delete dbUpdates.color;
        }

        nodeIds.forEach(id => {
            const node = this.nodes.find(n => n.id === id);
            if (node) {
                Object.assign(node, dbUpdates);
                this._renderNode(node);
                dataService.updateFlowchartNode(id, dbUpdates).catch(console.error);
            }
        });
    }

    async autoLayout() {
        if (this.nodes.length === 0) return;

        // 1. Find roots (nodes with no incoming edges)
        const incomingCount = {};
        this.nodes.forEach(n => incomingCount[n.id] = 0);
        this.edges.forEach(e => {
            if (incomingCount[e.target_node_id] !== undefined) {
                incomingCount[e.target_node_id]++;
            }
        });

        let roots = this.nodes.filter(n => incomingCount[n.id] === 0);
        if (roots.length === 0) roots = [this.nodes[0]]; // fallback if cycle

        // 2. Assign levels via BFS
        const levels = [];
        const visited = new Set();
        let currentLevelNodes = [...roots];

        while (currentLevelNodes.length > 0) {
            levels.push(currentLevelNodes);
            currentLevelNodes.forEach(n => visited.add(n.id));

            const nextLevelNodes = [];
            currentLevelNodes.forEach(node => {
                const outEdges = this.edges.filter(e => e.source_node_id === node.id);
                outEdges.forEach(e => {
                    const targetNode = this.nodes.find(n => n.id === e.target_node_id);
                    if (targetNode && !visited.has(targetNode.id) && !nextLevelNodes.includes(targetNode)) {
                        nextLevelNodes.push(targetNode);
                    }
                });
            });
            currentLevelNodes = nextLevelNodes;
        }

        // Place remaining disconnected nodes in a new level
        const unvisited = this.nodes.filter(n => !visited.has(n.id));
        if (unvisited.length > 0) {
            levels.push(unvisited);
        }

        // 3. Apply coordinates
        const startX = 100;
        let startY = 100;
        const xSpacing = 250;
        const ySpacing = 150;

        const updates = [];

        levels.forEach((levelNodes, colIndex) => {
            let currentY = startY;
            levelNodes.forEach((node) => {
                node.x = startX + (colIndex * xSpacing);
                node.y = currentY;
                currentY += Math.max(80, node.height) + ySpacing;
                updates.push({ id: node.id, x: node.x, y: node.y });
            });
        });

        this._renderAll();

        // Background save
        if (updates.length > 0) {
            dataService.batchUpdateFlowchartNodes(updates).catch(err => console.error(err));
        }
    }

    _editLabel(item, type, clientX, clientY) {
        const editor = document.getElementById('fc-inline-editor');
        const textarea = document.getElementById('fc-inline-textarea');
        if (!editor || !textarea) return;

        // Position editor
        let svgPt;
        if (type === 'node') {
            svgPt = { x: item.x + item.width / 2, y: item.y + item.height / 2 };
        } else {
            // Find label point for edge
            const source = this.nodes.find(n => n.id === item.source_node_id);
            const target = this.nodes.find(n => n.id === item.target_node_id);
            if (source && target) {
                const style = item.style || 'orthogonal';
                if (style === 'straight') {
                    const p1 = this._getHandlePoint(source, item.source_handle || 'right');
                    const p2 = this._getHandlePoint(target, item.target_handle || 'left');
                    svgPt = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
                } else {
                    const result = this._getOrthogonalPath(source, target, item.source_handle, item.target_handle);
                    svgPt = result.labelPt;
                }
            } else {
                svgPt = { x: 0, y: 0 };
            }
        }

        // Convert SVG point to Client point respecting zoom/pan
        const ctm = this.viewport.getScreenCTM();
        const screenX = (svgPt.x * ctm.a) + ctm.e;
        const screenY = (svgPt.y * ctm.d) + ctm.f;

        // Container bounding box to make it relative to container not page
        const containerRect = this.container.getBoundingClientRect();

        const editorWidth = Math.max(120, item.width || 120);
        const editorHeight = Math.max(40, item.height || 40);

        editor.style.display = 'block';
        editor.style.left = `${screenX - containerRect.left - editorWidth / 2}px`;
        editor.style.top = `${screenY - containerRect.top - editorHeight / 2}px`;
        editor.style.width = `${editorWidth}px`;
        editor.style.height = `${editorHeight}px`;

        textarea.value = item.label || '';
        textarea.focus();

        // Move cursor to the end of the text instead of selecting all
        textarea.selectionStart = textarea.value.length;
        textarea.selectionEnd = textarea.value.length;

        // Hide the underlying text on the shape so it doesn't overlap with the editor
        let hiddenTextEl = null;
        if (type === 'node') {
            const nodeG = this.nodesLayer.querySelector(`[data-id="${item.id}"]`);
            if (nodeG) {
                hiddenTextEl = nodeG.querySelector('foreignObject');
                if (hiddenTextEl) hiddenTextEl.style.opacity = '0';
            }
        }

        // Save logic
        let isSaving = false;

        const saveEdit = () => {
            if (isSaving) return;
            isSaving = true;

            const newLabel = textarea.value.trim();
            editor.style.display = 'none';

            if (newLabel !== item.label && newLabel !== '') {
                item.label = newLabel;

                if (type === 'node') {
                    // Auto-resize logic
                    const lines = newLabel.split('\n');
                    let maxLineLength = 0;
                    lines.forEach(l => {
                        if (l.length > maxLineLength) maxLineLength = l.length;
                    });

                    // Approximate 8px per character + 40px padding
                    const newWidth = Math.max(120, maxLineLength * 8 + 40);
                    // Base 60 height + 20px per line beyond the first
                    const newHeight = Math.max(60, 40 + lines.length * 20);

                    item.width = newWidth;
                    item.height = newHeight;

                    this._renderNode(item);
                    this._updateConnectedEdges(item.id);
                    dataService.updateFlowchartNode(item.id, { label: newLabel, width: newWidth, height: newHeight }).catch(console.error);
                } else {
                    this._renderEdge(item);
                    dataService.updateFlowchartEdge(item.id, { label: newLabel }).catch(console.error);
                }
            }

            // Restore text visibility (the re-render above handles the updated text)
            if (hiddenTextEl) hiddenTextEl.style.opacity = '1';

            // Clean up listeners
            textarea.removeEventListener('blur', blurHook);
            textarea.removeEventListener('keydown', keydownHook);

            // Set tool back to select to avoid accidental double placing
            this.setTool('select');
        };

        const blurHook = () => {
            if (!isSaving) saveEdit();
        };

        const keydownHook = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                isSaving = true;
                editor.style.display = 'none';
                if (hiddenTextEl) hiddenTextEl.style.opacity = '1';
                textarea.removeEventListener('blur', blurHook);
                textarea.removeEventListener('keydown', keydownHook);
                this.setTool('select');
            }
        };

        textarea.addEventListener('blur', blurHook);
        textarea.addEventListener('keydown', keydownHook);
    }

    _updateConnectedEdges(nodeId) {
        this.edges.filter(e => e.source_node_id === nodeId || e.target_node_id === nodeId).forEach(edge => {
            this._renderEdge(edge);
        });
    }

    _getZoomTransformOffset(pt, zDelta) {
        const transform = this.viewport.getScreenCTM().inverse();
        const ptDOM = new DOMPoint(pt.x, pt.y);
        const ptLocal = ptDOM.matrixTransform(transform);
        const ratio = 1 - zDelta;
        return {
            x: ptLocal.x * ratio * this.viewState.zoom,
            y: ptLocal.y * ratio * this.viewState.zoom
        };
    }

    _zoom(zDelta, svgPt) {
        const offset = this._getZoomTransformOffset({ x: svgPt.x, y: svgPt.y }, zDelta);
        this.viewState.zoom = Math.max(0.1, Math.min(5, this.viewState.zoom * zDelta));
        this.viewState.x += offset.x / this.viewState.zoom;
        this.viewState.y += offset.y / this.viewState.zoom;
        this._updateTransform();
        this._scheduleViewportSave();
    }

    _updateTransform() {
        // Grid shifting
        const gridPanX = (this.viewState.x * this.viewState.zoom) % 100;
        const gridPanY = (this.viewState.y * this.viewState.zoom) % 100;
        this.gridBg.setAttribute('transform', `translate(${gridPanX}, ${gridPanY}) scale(${this.viewState.zoom})`);

        this.viewport.setAttribute('transform', `translate(${this.viewState.x * this.viewState.zoom}, ${this.viewState.y * this.viewState.zoom}) scale(${this.viewState.zoom})`);
    }

    _screenToSVG(x, y) {
        const pt = this.svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        const curTransform = this.viewport.getScreenCTM().inverse();
        const localPt = pt.matrixTransform(curTransform);
        return { x: localPt.x, y: localPt.y };
    }

    _getHandlePoint(node, handle) {
        switch (handle) {
            case 'left': return { x: node.x, y: node.y + node.height / 2 };
            case 'right': return { x: node.x + node.width, y: node.y + node.height / 2 };
            case 'top': return { x: node.x + node.width / 2, y: node.y };
            case 'bottom': return { x: node.x + node.width / 2, y: node.y + node.height };
        }
        return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    }

    _getOrthogonalPath(source, target, sourceHandle = 'right', targetHandle = 'left') {
        const p1 = this._getHandlePoint(source, sourceHandle);
        const p2 = this._getHandlePoint(target, targetHandle);

        let pathD = `M ${p1.x} ${p1.y}`;
        const minGap = 20;

        const isHorizontal1 = sourceHandle === 'left' || sourceHandle === 'right';
        const isHorizontal2 = targetHandle === 'left' || targetHandle === 'right';

        let p1Out = {
            x: p1.x + (sourceHandle === 'right' ? minGap : sourceHandle === 'left' ? -minGap : 0),
            y: p1.y + (sourceHandle === 'bottom' ? minGap : sourceHandle === 'top' ? -minGap : 0)
        };
        let p2Out = {
            x: p2.x + (targetHandle === 'right' ? minGap : targetHandle === 'left' ? -minGap : 0),
            y: p2.y + (targetHandle === 'bottom' ? minGap : targetHandle === 'top' ? -minGap : 0)
        };

        // Very basic routing with padding points to avoid clipping original shapes immediately
        if (isHorizontal1 && isHorizontal2) {
            const midX = (p1Out.x + p2Out.x) / 2;
            pathD += ` L ${p1Out.x} ${p1Out.y} L ${midX} ${p1Out.y} L ${midX} ${p2Out.y} L ${p2Out.x} ${p2Out.y} L ${p2.x} ${p2.y}`;
        } else if (!isHorizontal1 && !isHorizontal2) {
            const midY = (p1Out.y + p2Out.y) / 2;
            pathD += ` L ${p1Out.x} ${p1Out.y} L ${p1Out.x} ${midY} L ${p2Out.x} ${midY} L ${p2Out.x} ${p2Out.y} L ${p2.x} ${p2.y}`;
        } else if (isHorizontal1 && !isHorizontal2) {
            pathD += ` L ${p1Out.x} ${p1Out.y} L ${p2Out.x} ${p1Out.y} L ${p2Out.x} ${p2.y}`;
        } else {
            pathD += ` L ${p1Out.x} ${p1Out.y} L ${p1Out.x} ${p2Out.y} L ${p2Out.x} ${p2Out.y} L ${p2.x} ${p2.y}`;
        }

        const labelPt = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        return { pathD, labelPt };
    }

    _escapeHtml(unsafe) {
        return (unsafe || '').toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    _scheduleViewportSave() {
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => {
            if (this.flowchartId) {
                dataService.updateFlowchart(this.flowchartId, { viewport: this.viewState })
                    .catch(e => console.error('Error saving flowchart viewport:', e));
            }
        }, 1000);
    }
}
