/**
 * MindmapEngine - SVG-based mindmap rendering and interaction engine
 * 
 * Features: node CRUD, drag-to-reposition, pan & zoom, 
 * parent-child connections, color coding, collapse/expand, auto-layout, auto-save.
 */

import dataService from './data-service.js';
import { getSupabaseClient } from './supabase-client.js';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 44;
const NODE_PADDING = 12;
const NODE_RADIUS = 10;
const EDGE_CURVE = 40;
const AUTO_SAVE_DELAY = 2000;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;
const LAYOUT_H_GAP = 80;
const LAYOUT_V_GAP = 24;
const DRAG_THRESHOLD = 5; // pixels before drag starts

// Color palette
const NODE_COLORS = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#64748b', // Slate
    '#06b6d4', // Cyan
    '#84cc16', // Lime
];

class MindmapEngine {
    constructor() {
        /** @type {Object|null} Current mindmap document */
        this.currentMindmap = null;

        /** @type {Array<Object>} All nodes for current mindmap */
        this.nodes = [];

        /** @type {Object|null} Currently selected node */
        this.selectedNode = null;

        // Viewport state
        this.viewportX = 0;
        this.viewportY = 0;
        this.zoom = 1;

        // Interaction state
        this._isPanning = false;
        this._isDragging = false;
        this._hasDragged = false;
        this._dragNode = null;
        this._panStartX = 0;
        this._panStartY = 0;
        this._dragStartX = 0;
        this._dragStartY = 0;
        this._dragNodeStartX = 0;
        this._dragNodeStartY = 0;
        this._isEditing = false;

        // Custom double-click detection (native dblclick breaks because render() destroys DOM)
        this._lastClickNodeId = null;
        this._lastClickTime = 0;
        this._dblClickDelay = 400; // ms

        // Multi-select
        this._selectedNodes = new Set();

        // Drag re-parent
        this._dropTarget = null;

        // Undo/redo
        this._undoStack = [];
        this._redoStack = [];
        this._maxUndoSteps = 50;

        // Search
        this._searchQuery = '';
        this._searchResults = new Set();

        // Auto-save
        this._autoSaveTimeout = null;
        this._viewportSaveTimeout = null;
        this._hasUnsavedChanges = false;

        // DOM references
        this.svg = null;
        this.viewport = null;
        this.nodesLayer = null;
        this.edgesLayer = null;
        this.contextMenu = null;
        this.titleInput = null;
        this.titleBar = null;
        this.saveIndicator = null;
        this.emptyState = null;
        this.zoomLabel = null;
        this.deleteBtn = null;
        this.addChildBtn = null;
        this.notesPanel = null;
        this.notesTextarea = null;

        // Bind methods
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onWheel = this._onWheel.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this);
        this._hideContextMenu = this._hideContextMenu.bind(this);

        // Touch state
        this._lastTouchDist = 0;
        this._touchStartTime = 0;
    }

    /**
     * Initialize the engine, cache DOM references, setup listeners
     */
    init() {
        // Cache DOM
        this.svg = document.getElementById('mindmap-svg');
        this.viewport = document.getElementById('mm-viewport');
        this.nodesLayer = document.getElementById('mm-nodes-layer');
        this.edgesLayer = document.getElementById('mm-edges-layer');
        this.contextMenu = document.getElementById('mindmap-context-menu');
        this.titleInput = document.getElementById('mindmap-title-input');
        this.titleBar = document.getElementById('mindmap-title-bar');
        this.saveIndicator = document.getElementById('mm-save-indicator');
        this.emptyState = document.getElementById('mindmap-empty-state');
        this.zoomLabel = document.getElementById('mm-zoom-level');
        this.deleteBtn = document.getElementById('mm-delete-node-btn');
        this.addChildBtn = document.getElementById('mm-add-child-btn');
        this.notesPanel = document.getElementById('mm-notes-panel');
        this.notesTextarea = document.getElementById('mm-notes-textarea');

        if (!this.svg) return;

        this._setupEventListeners();
        this._updateViewportTransform();
    }

    _setupEventListeners() {
        // SVG interactions - NO dblclick (render() destroys DOM between clicks)
        this.svg.addEventListener('mousedown', this._onMouseDown);
        this.svg.addEventListener('mousemove', this._onMouseMove);
        this.svg.addEventListener('mouseup', this._onMouseUp);
        this.svg.addEventListener('mouseleave', this._onMouseUp);
        this.svg.addEventListener('wheel', this._onWheel, { passive: false });
        this.svg.addEventListener('contextmenu', this._onContextMenu);

        // Touch events
        this.svg.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
        this.svg.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
        this.svg.addEventListener('touchend', this._onTouchEnd.bind(this));

        // Close context menu on click elsewhere
        document.addEventListener('mousedown', (e) => {
            if (this.contextMenu && !this.contextMenu.hidden && !this.contextMenu.contains(e.target)) {
                this._hideContextMenu();
            }
        });

        // Keyboard
        document.addEventListener('keydown', this._onKeyDown);

        // Toolbar buttons
        document.getElementById('mm-add-node-btn')?.addEventListener('click', () => this.addNodeAtCenter());
        this.addChildBtn?.addEventListener('click', () => this.addChildToSelected());
        document.getElementById('mm-auto-layout-btn')?.addEventListener('click', () => this.autoLayout());
        document.getElementById('mm-center-btn')?.addEventListener('click', () => this.centerView());
        document.getElementById('mm-zoom-in-btn')?.addEventListener('click', () => this.zoomTo(this.zoom + ZOOM_STEP));
        document.getElementById('mm-zoom-out-btn')?.addEventListener('click', () => this.zoomTo(this.zoom - ZOOM_STEP));
        this.deleteBtn?.addEventListener('click', () => this.deleteSelected());
        document.getElementById('mm-empty-new-btn')?.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('mindmap-create-new'));
        });

        // Undo/Redo
        document.getElementById('mm-undo-btn')?.addEventListener('click', () => this.undo());
        document.getElementById('mm-redo-btn')?.addEventListener('click', () => this.redo());

        // Export
        document.getElementById('mm-export-png-btn')?.addEventListener('click', () => this.exportAsPNG());
        document.getElementById('mm-export-svg-btn')?.addEventListener('click', () => this.exportAsSVG());

        // Search
        const searchInput = document.getElementById('mm-search-input');
        const searchClear = document.getElementById('mm-search-clear');
        searchInput?.addEventListener('input', (e) => {
            this._searchQuery = e.target.value.trim().toLowerCase();
            if (searchClear) searchClear.hidden = !this._searchQuery;
            this._applySearch();
        });
        searchClear?.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            this._searchQuery = '';
            if (searchClear) searchClear.hidden = true;
            this._applySearch();
        });

        // Notes panel
        document.getElementById('mm-notes-close')?.addEventListener('click', () => this._hideNotesPanel());
        this.notesTextarea?.addEventListener('input', () => this._saveNotes());

        // Context menu actions
        this.contextMenu?.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleContextAction(item.dataset.action);
            });
        });

        // Color dots in context menu
        this.contextMenu?.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (this.selectedNode) this._updateNodeColor(this.selectedNode.id, dot.dataset.color);
                this._hideContextMenu();
            });
        });

        // Emoji items in context menu
        this.contextMenu?.querySelectorAll('.emoji-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.selectedNode) this._updateNodeEmoji(this.selectedNode.id, item.dataset.emoji);
                this._hideContextMenu();
            });
        });

        // Title input
        this.titleInput?.addEventListener('change', () => this._updateTitle());
    }


    // ========================================================================
    // DOCUMENT MANAGEMENT
    // ========================================================================

    /**
     * Load a mindmap and its nodes
     */
    async loadMindmap(mindmap) {
        this.currentMindmap = mindmap;
        this.viewportX = mindmap.viewport?.x || 0;
        this.viewportY = mindmap.viewport?.y || 0;
        this.zoom = mindmap.viewport?.zoom || 1;

        // Fetch nodes
        this.nodes = await dataService.getMindmapNodes(mindmap.id);

        // Update UI
        if (this.titleInput) this.titleInput.value = mindmap.title || '';
        if (this.titleBar) this.titleBar.hidden = false;
        if (this.emptyState) this.emptyState.hidden = true;

        this._updateViewportTransform();
        this.render();
        this._selectNode(null);
    }

    /**
     * Clear the current mindmap
     */
    clear() {
        this.currentMindmap = null;
        this.nodes = [];
        this.selectedNode = null;
        if (this.nodesLayer) this.nodesLayer.innerHTML = '';
        if (this.edgesLayer) this.edgesLayer.innerHTML = '';
        if (this.titleBar) this.titleBar.hidden = true;
        if (this.emptyState) this.emptyState.hidden = false;
    }

    async _updateTitle() {
        if (!this.currentMindmap || !this.titleInput) return;
        const title = this.titleInput.value.trim() || 'Untitled Mindmap';
        this.currentMindmap.title = title;
        await dataService.updateMindmap(this.currentMindmap.id, { title });
        document.dispatchEvent(new CustomEvent('mindmap-title-changed', { detail: { id: this.currentMindmap.id, title } }));
    }

    // ========================================================================
    // RENDERING
    // ========================================================================

    render() {
        if (!this.nodesLayer || !this.edgesLayer) return;
        this.nodesLayer.innerHTML = '';
        this.edgesLayer.innerHTML = '';

        // Build parent→children map to handle collapsed state
        const visibleIds = this._getVisibleNodeIds();

        // Render edges first (below nodes)
        for (const node of this.nodes) {
            if (node.parent_id && visibleIds.has(node.id) && visibleIds.has(node.parent_id)) {
                const parent = this.nodes.find(n => n.id === node.parent_id);
                if (parent) {
                    this._renderEdge(parent, node);
                }
            }
        }

        // Render nodes
        for (const node of this.nodes) {
            if (visibleIds.has(node.id)) {
                this._renderNode(node);
            }
        }

        // Render inline color picker if a node is selected and not editing
        if (this.selectedNode && !this._isEditing) {
            this._renderColorBar(this.selectedNode);
        }
    }

    _getVisibleNodeIds() {
        const visible = new Set();
        const collapsedIds = new Set(this.nodes.filter(n => n.collapsed).map(n => n.id));

        for (const node of this.nodes) {
            let hidden = false;
            let currentParent = node.parent_id;
            while (currentParent) {
                if (collapsedIds.has(currentParent)) {
                    hidden = true;
                    break;
                }
                const parentNode = this.nodes.find(n => n.id === currentParent);
                currentParent = parentNode?.parent_id || null;
            }
            if (!hidden) visible.add(node.id);
        }
        return visible;
    }

    _renderNode(node) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const isSelected = node.id === this.selectedNode?.id;
        const isMultiSelected = this._selectedNodes.has(node.id);
        const isDropTarget = this._dropTarget?.id === node.id;
        const isSearchHit = this._searchQuery && this._searchResults.has(node.id);
        const isSearchDimmed = this._searchQuery && !this._searchResults.has(node.id);

        g.setAttribute('class', `mm-node ${isSelected ? 'mm-node--selected' : ''} ${isMultiSelected ? 'mm-node--multi' : ''} ${isDropTarget ? 'mm-node--drop-target' : ''}`);
        g.setAttribute('data-id', node.id);
        g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
        if (isSearchDimmed) g.setAttribute('opacity', '0.3');

        // Build display label with emoji
        const displayLabel = node.emoji ? `${node.emoji} ${node.label}` : node.label;
        const textWidth = this._measureText(displayLabel);
        const w = Math.max(NODE_WIDTH, textWidth + NODE_PADDING * 2 + 24);
        const h = NODE_HEIGHT;

        // Drop shadow
        const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        shadow.setAttribute('x', 2); shadow.setAttribute('y', 3);
        shadow.setAttribute('width', w); shadow.setAttribute('height', h);
        shadow.setAttribute('rx', NODE_RADIUS);
        shadow.setAttribute('fill', 'rgba(0,0,0,0.1)');
        g.appendChild(shadow);

        // Background rect
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', 0); rect.setAttribute('y', 0);
        rect.setAttribute('width', w); rect.setAttribute('height', h);
        rect.setAttribute('rx', NODE_RADIUS); rect.setAttribute('ry', NODE_RADIUS);
        rect.setAttribute('fill', node.color || '#6366f1');
        rect.setAttribute('class', 'mm-node-bg');

        if (isDropTarget) {
            rect.setAttribute('stroke', '#10b981'); rect.setAttribute('stroke-width', '3');
            rect.setAttribute('stroke-dasharray', '6 3');
        } else if (isSelected) {
            rect.setAttribute('stroke', '#ffffff'); rect.setAttribute('stroke-width', '3');
        } else if (isMultiSelected) {
            rect.setAttribute('stroke', '#fbbf24'); rect.setAttribute('stroke-width', '2.5');
        } else if (isSearchHit) {
            rect.setAttribute('stroke', '#f59e0b'); rect.setAttribute('stroke-width', '2.5');
        }
        g.appendChild(rect);

        // Label text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', w / 2); text.setAttribute('y', h / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('class', 'mm-node-label');
        text.setAttribute('fill', this._getContrastColor(node.color || '#6366f1'));
        text.textContent = displayLabel;
        g.appendChild(text);

        // Notes badge (📝 indicator in top-right corner)
        if (node.notes) {
            const badge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            badge.setAttribute('x', w - 6); badge.setAttribute('y', 4);
            badge.setAttribute('text-anchor', 'end'); badge.setAttribute('dominant-baseline', 'hanging');
            badge.style.fontSize = '10px';
            badge.textContent = '📝';
            g.appendChild(badge);
        }

        // Collapse/expand indicator if has children
        const children = this.nodes.filter(n => n.parent_id === node.id);
        if (children.length > 0) {
            const badgeSize = 18;
            const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            badgeG.setAttribute('class', 'mm-collapse-btn');
            badgeG.setAttribute('transform', `translate(${w - 1}, ${h / 2})`);

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', 0); circle.setAttribute('cy', 0);
            circle.setAttribute('r', badgeSize / 2);
            circle.setAttribute('fill', this._darkenColor(node.color || '#6366f1', 0.2));
            circle.setAttribute('stroke', '#fff'); circle.setAttribute('stroke-width', '1.5');
            badgeG.appendChild(circle);

            const sign = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            sign.setAttribute('x', 0); sign.setAttribute('y', 0.5);
            sign.setAttribute('text-anchor', 'middle');
            sign.setAttribute('dominant-baseline', 'central');
            sign.setAttribute('class', 'mm-collapse-sign');
            sign.setAttribute('fill', '#fff');
            sign.textContent = node.collapsed ? `+${children.length}` : '−';
            sign.style.fontSize = '11px'; sign.style.fontWeight = '700';
            badgeG.appendChild(sign);
            g.appendChild(badgeG);
        }

        node._width = w;
        node._height = h;
        this.nodesLayer.appendChild(g);
    }


    /**
     * Render an inline color bar below the selected node
     */
    _renderColorBar(node) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'mm-color-bar');

        const w = node._width || NODE_WIDTH;
        const barY = node.y + (node._height || NODE_HEIGHT) + 8;
        const dotSize = 14;
        const dotGap = 4;
        const totalWidth = NODE_COLORS.length * (dotSize + dotGap) - dotGap;
        const startX = node.x + (w - totalWidth) / 2;

        // Background pill
        const bgPadding = 6;
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', startX - bgPadding);
        bg.setAttribute('y', barY - bgPadding);
        bg.setAttribute('width', totalWidth + bgPadding * 2);
        bg.setAttribute('height', dotSize + bgPadding * 2);
        bg.setAttribute('rx', dotSize);
        bg.setAttribute('fill', 'var(--bg-secondary, #f8fafc)');
        bg.setAttribute('stroke', 'var(--border-color, #e2e8f0)');
        bg.setAttribute('stroke-width', '1');
        bg.setAttribute('class', 'mm-color-bar-bg');
        g.appendChild(bg);

        NODE_COLORS.forEach((color, i) => {
            const cx = startX + i * (dotSize + dotGap) + dotSize / 2;
            const cy = barY + dotSize / 2;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', dotSize / 2);
            circle.setAttribute('fill', color);
            circle.setAttribute('class', 'mm-color-dot');
            circle.setAttribute('data-color', color);

            // Highlight current color
            if (color === (node.color || '#6366f1')) {
                circle.setAttribute('stroke', '#fff');
                circle.setAttribute('stroke-width', '2');
                circle.setAttribute('r', dotSize / 2 + 1);
            }

            circle.style.cursor = 'pointer';
            circle.addEventListener('click', (e) => {
                e.stopPropagation();
                this._updateNodeColor(node.id, color);
            });

            g.appendChild(circle);
        });

        this.nodesLayer.appendChild(g);
    }

    _renderEdge(parent, child) {
        const pw = parent._width || NODE_WIDTH;
        const ph = parent._height || NODE_HEIGHT;

        // Start point: right edge of parent
        const x1 = parent.x + pw;
        const y1 = parent.y + ph / 2;

        // End point: left edge of child
        const x2 = child.x;
        const y2 = child.y + (child._height || NODE_HEIGHT) / 2;

        // Bezier control points
        const dx = Math.abs(x2 - x1) * 0.4;
        const cx1 = x1 + dx;
        const cy1 = y1;
        const cx2 = x2 - dx;
        const cy2 = y2;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`);
        path.setAttribute('class', 'mm-edge');
        path.setAttribute('stroke', parent.color || '#6366f1');
        path.setAttribute('data-from', parent.id);
        path.setAttribute('data-to', child.id);
        this.edgesLayer.appendChild(path);
    }

    _measureText(text) {
        if (!this._measureCanvas) {
            this._measureCanvas = document.createElement('canvas');
            this._measureCtx = this._measureCanvas.getContext('2d');
        }
        this._measureCtx.font = '14px Inter, system-ui, -apple-system, sans-serif';
        return this._measureCtx.measureText(text).width;
    }

    _getContrastColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.55 ? '#1e293b' : '#ffffff';
    }

    _darkenColor(hex, amount) {
        const r = Math.max(0, parseInt(hex.slice(1, 3), 16) * (1 - amount));
        const g = Math.max(0, parseInt(hex.slice(3, 5), 16) * (1 - amount));
        const b = Math.max(0, parseInt(hex.slice(5, 7), 16) * (1 - amount));
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }

    // ========================================================================
    // VIEWPORT (PAN & ZOOM)
    // ========================================================================

    _updateViewportTransform() {
        if (!this.viewport) return;
        this.viewport.setAttribute('transform', `translate(${this.viewportX}, ${this.viewportY}) scale(${this.zoom})`);
        if (this.zoomLabel) this.zoomLabel.textContent = `${Math.round(this.zoom * 100)}%`;

        // Update grid pattern with zoom
        const gridBg = document.getElementById('mm-grid-bg');
        if (gridBg) {
            gridBg.setAttribute('transform', `translate(${this.viewportX}, ${this.viewportY}) scale(${this.zoom})`);
            gridBg.setAttribute('width', `${100 / this.zoom}%`);
            gridBg.setAttribute('height', `${100 / this.zoom}%`);
        }
    }

    zoomTo(newZoom) {
        this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
        this._updateViewportTransform();
        this._scheduleViewportSave();
    }

    centerView() {
        if (this.nodes.length === 0) {
            this.viewportX = 0;
            this.viewportY = 0;
            this.zoom = 1;
            this._updateViewportTransform();
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const node of this.nodes) {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + (node._width || NODE_WIDTH));
            maxY = Math.max(maxY, node.y + (node._height || NODE_HEIGHT));
        }

        const svgRect = this.svg.getBoundingClientRect();
        const contentW = maxX - minX;
        const contentH = maxY - minY;
        const paddingFactor = 0.8;

        this.zoom = Math.min(
            (svgRect.width * paddingFactor) / contentW,
            (svgRect.height * paddingFactor) / contentH,
            1.5
        );
        this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.zoom));

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        this.viewportX = svgRect.width / 2 - centerX * this.zoom;
        this.viewportY = svgRect.height / 2 - centerY * this.zoom;

        this._updateViewportTransform();
        this._scheduleViewportSave();
    }

    // ========================================================================
    // MOUSE/TOUCH INTERACTIONS
    // ========================================================================

    _onMouseDown(e) {
        if (e.button === 2) return;
        if (this._isEditing) return;

        const nodeEl = e.target.closest('.mm-node');
        const collapseBtn = e.target.closest('.mm-collapse-btn');
        const colorDot = e.target.closest('.mm-color-dot');

        if (colorDot) return; // handled by its own click listener

        if (collapseBtn) {
            const nodeId = collapseBtn.closest('.mm-node')?.dataset.id;
            if (nodeId) this._toggleCollapse(nodeId);
            return;
        }

        if (nodeEl) {
            const nodeId = nodeEl.dataset.id;
            const node = this.nodes.find(n => n.id === nodeId);
            if (node) {
                // Multi-select with Shift
                if (e.shiftKey) {
                    if (this._selectedNodes.has(nodeId)) {
                        this._selectedNodes.delete(nodeId);
                    } else {
                        this._selectedNodes.add(nodeId);
                    }
                    this.selectedNode = node;
                    this.render();
                } else {
                    if (!this._selectedNodes.has(nodeId)) {
                        this._selectedNodes.clear();
                    }
                    this._selectedNodes.add(nodeId);
                    this._selectNode(node);
                }

                // Prepare drag
                this._isDragging = true;
                this._hasDragged = false;
                this._dragNode = node;
                this._dragStartX = e.clientX;
                this._dragStartY = e.clientY;
                this._dragNodeStartX = node.x;
                this._dragNodeStartY = node.y;
                // Store start positions for all selected nodes (multi-drag)
                this._dragStartPositions = {};
                for (const id of this._selectedNodes) {
                    const n = this.nodes.find(nd => nd.id === id);
                    if (n) this._dragStartPositions[id] = { x: n.x, y: n.y };
                }
            }
        } else {
            if (e.target.closest('.mm-color-bar') || e.target.closest('.mm-color-bar-bg')) return;

            this._selectedNodes.clear();
            this._selectNode(null);
            this._isPanning = true;
            this._panStartX = e.clientX - this.viewportX;
            this._panStartY = e.clientY - this.viewportY;
            this.svg.style.cursor = 'grabbing';
        }
    }

    _onMouseMove(e) {
        if (this._isDragging && this._dragNode) {
            const dx = e.clientX - this._dragStartX;
            const dy = e.clientY - this._dragStartY;

            if (!this._hasDragged && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
                this._hasDragged = true;
                this.svg.style.cursor = 'grabbing';
            }

            if (this._hasDragged) {
                const ddx = dx / this.zoom;
                const ddy = dy / this.zoom;
                // Move all selected nodes
                for (const id of this._selectedNodes) {
                    const start = this._dragStartPositions?.[id];
                    const n = this.nodes.find(nd => nd.id === id);
                    if (n && start) {
                        n.x = start.x + ddx;
                        n.y = start.y + ddy;
                    }
                }

                // Detect drop target for re-parenting
                const dragPt = this._screenToSVG(e.clientX, e.clientY);
                this._dropTarget = null;
                for (const n of this.nodes) {
                    if (this._selectedNodes.has(n.id)) continue;
                    const w = n._width || NODE_WIDTH;
                    const h = n._height || NODE_HEIGHT;
                    if (dragPt.x >= n.x && dragPt.x <= n.x + w && dragPt.y >= n.y && dragPt.y <= n.y + h) {
                        this._dropTarget = n;
                        break;
                    }
                }

                this.render();
            }
        } else if (this._isPanning) {
            this.viewportX = e.clientX - this._panStartX;
            this.viewportY = e.clientY - this._panStartY;
            this._updateViewportTransform();
        }
    }

    _onMouseUp(e) {
        if (this._isDragging && this._dragNode) {
            if (this._hasDragged) {
                // Check for re-parent drop
                if (this._dropTarget && this._selectedNodes.size === 1) {
                    const dragNodeId = [...this._selectedNodes][0];
                    const dragNode = this.nodes.find(n => n.id === dragNodeId);
                    if (dragNode && this._dropTarget.id !== dragNode.parent_id) {
                        this._reparentNode(dragNode, this._dropTarget);
                    }
                }
                this._dropTarget = null;

                // Save positions for all dragged nodes
                for (const id of this._selectedNodes) {
                    const n = this.nodes.find(nd => nd.id === id);
                    if (n) this._scheduleNodeSave(n);
                }
            } else {
                // No drag occurred — this is a click. Check for double-click.
                const nodeId = this._dragNode.id;
                const now = Date.now();
                if (this._lastClickNodeId === nodeId && (now - this._lastClickTime) < this._dblClickDelay) {
                    // DOUBLE-CLICK detected!
                    this._lastClickNodeId = null;
                    this._lastClickTime = 0;
                    this._startEditLabel(this._dragNode);
                } else {
                    this._lastClickNodeId = nodeId;
                    this._lastClickTime = now;
                }
            }
            this._isDragging = false;
            this._dragNode = null;
        } else if (!this._isDragging && !this._isPanning) {
            // Click on empty area — check for double-click to add node
            const now = Date.now();
            if (this._lastClickNodeId === '__bg__' && (now - this._lastClickTime) < this._dblClickDelay) {
                this._lastClickNodeId = null;
                const pt = this._screenToSVG(e.clientX, e.clientY);
                if (pt) this.addNodeAt(pt.x - NODE_WIDTH / 2, pt.y - NODE_HEIGHT / 2);
            } else {
                this._lastClickNodeId = '__bg__';
                this._lastClickTime = Date.now();
            }
        }
        if (this._isPanning) {
            this._isPanning = false;
            this._scheduleViewportSave();
        }
        this.svg.style.cursor = '';
    }


    _onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;

        const rect = this.svg.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const oldZoom = this.zoom;
        this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.zoom + delta));

        const zoomRatio = this.zoom / oldZoom;
        this.viewportX = mx - (mx - this.viewportX) * zoomRatio;
        this.viewportY = my - (my - this.viewportY) * zoomRatio;

        this._updateViewportTransform();
        this._scheduleViewportSave();
    }

    // Touch events
    _onTouchStart(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            this._lastTouchDist = this._getTouchDist(e.touches);
            return;
        }
        if (e.touches.length === 1) {
            this._touchStartTime = Date.now();
            const touch = e.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            this._onMouseDown({ clientX: touch.clientX, clientY: touch.clientY, button: 0, target, preventDefault: () => { } });
        }
    }

    _onTouchMove(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = this._getTouchDist(e.touches);
            const factor = dist / this._lastTouchDist;
            this.zoomTo(this.zoom * factor);
            this._lastTouchDist = dist;
            return;
        }
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this._onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    _onTouchEnd(e) {
        this._onMouseUp({});
    }

    _getTouchDist(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }



    _onContextMenu(e) {
        e.preventDefault();
        const nodeEl = e.target.closest('.mm-node');
        if (!nodeEl) {
            this._hideContextMenu();
            return;
        }

        const nodeId = nodeEl.dataset.id;
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            this._selectNode(node);
            this._showContextMenu(e.clientX, e.clientY);
        }
    }

    _showContextMenu(x, y) {
        if (!this.contextMenu) return;

        // Ensure menu stays within viewport
        const menuWidth = 200;
        const menuHeight = 300;
        const maxX = window.innerWidth - menuWidth;
        const maxY = window.innerHeight - menuHeight;

        this.contextMenu.hidden = false;
        this.contextMenu.style.left = `${Math.min(x, maxX)}px`;
        this.contextMenu.style.top = `${Math.min(y, maxY)}px`;

        // Reset color picker
        const colorPicker = this.contextMenu.querySelector('.context-menu-color-picker');
        if (colorPicker) colorPicker.hidden = true;
    }

    _hideContextMenu() {
        if (this.contextMenu) this.contextMenu.hidden = true;
    }

    _handleContextAction(action) {
        if (!this.selectedNode) return;

        switch (action) {
            case 'add-child':
                this.addChildToSelected();
                this._hideContextMenu();
                break;
            case 'edit':
                this._startEditLabel(this.selectedNode);
                this._hideContextMenu();
                break;
            case 'color': {
                const picker = this.contextMenu?.querySelector('.context-menu-color-picker');
                const emojiPicker = document.getElementById('mm-emoji-picker');
                if (emojiPicker) emojiPicker.hidden = true;
                if (picker) picker.hidden = !picker.hidden;
                return;
            }
            case 'emoji': {
                const emojiPicker = document.getElementById('mm-emoji-picker');
                const colorPicker = this.contextMenu?.querySelector('.context-menu-color-picker');
                if (colorPicker) colorPicker.hidden = true;
                if (emojiPicker) emojiPicker.hidden = !emojiPicker.hidden;
                return;
            }
            case 'notes':
                this._showNotesPanel(this.selectedNode);
                this._hideContextMenu();
                break;
            case 'collapse':
                this._toggleCollapse(this.selectedNode.id);
                this._hideContextMenu();
                break;
            case 'delete':
                this.deleteSelected();
                this._hideContextMenu();
                break;
        }
    }

    _screenToSVG(clientX, clientY) {
        const rect = this.svg.getBoundingClientRect();
        return {
            x: (clientX - rect.left - this.viewportX) / this.zoom,
            y: (clientY - rect.top - this.viewportY) / this.zoom
        };
    }

    // ========================================================================
    // NODE OPERATIONS
    // ========================================================================

    _selectNode(node) {
        this.selectedNode = node;
        if (this.deleteBtn) this.deleteBtn.disabled = !node;
        if (this.addChildBtn) this.addChildBtn.disabled = !node;
        this.render();
    }

    async addNodeAtCenter() {
        if (!this.currentMindmap) return;
        const svgRect = this.svg.getBoundingClientRect();
        const cx = (svgRect.width / 2 - this.viewportX) / this.zoom - NODE_WIDTH / 2;
        const cy = (svgRect.height / 2 - this.viewportY) / this.zoom - NODE_HEIGHT / 2;
        await this.addNodeAt(cx, cy);
    }

    async addNodeAt(x, y, parentId = null, label = 'New Node') {
        if (!this.currentMindmap) return;

        // Get current user ID
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const nodeData = {
            mindmap_id: this.currentMindmap.id,
            user_id: user.id,
            parent_id: parentId,
            label,
            x: Math.round(x),
            y: Math.round(y),
            color: parentId ? (this.nodes.find(n => n.id === parentId)?.color || '#6366f1') : '#6366f1',
            order_index: this.nodes.length
        };

        try {
            const created = await dataService.createMindmapNode(nodeData);
            if (created) {
                this.nodes.push(created);
                this.render();
                this._selectNode(created);
                this._startEditLabel(created);
                this._showSaveIndicator();
            }
        } catch (error) {
            console.error('MindmapEngine: Failed to create node', error);
        }
    }

    async addChildToSelected() {
        if (!this.selectedNode) return;
        const parent = this.selectedNode;

        // Position child to the right of parent
        const siblings = this.nodes.filter(n => n.parent_id === parent.id);
        const offsetY = siblings.length * (NODE_HEIGHT + LAYOUT_V_GAP);
        const x = parent.x + (parent._width || NODE_WIDTH) + LAYOUT_H_GAP;
        const y = parent.y + offsetY;

        // Uncollapse parent if collapsed
        if (parent.collapsed) {
            parent.collapsed = false;
            await dataService.updateMindmapNode(parent.id, { collapsed: false });
        }

        await this.addNodeAt(x, y, parent.id);
    }

    async deleteSelected() {
        if (!this.selectedNode) return;
        const nodeId = this.selectedNode.id;

        const toDelete = this._getDescendantIds(nodeId);
        toDelete.push(nodeId);

        try {
            for (const id of toDelete.reverse()) {
                await dataService.deleteMindmapNode(id);
            }
            this.nodes = this.nodes.filter(n => !toDelete.includes(n.id));
            this._selectNode(null);
            this.render();
            this._showSaveIndicator();
        } catch (error) {
            console.error('MindmapEngine: Failed to delete node', error);
        }
    }

    _getDescendantIds(nodeId) {
        const children = this.nodes.filter(n => n.parent_id === nodeId);
        let ids = [];
        for (const child of children) {
            ids.push(child.id);
            ids = ids.concat(this._getDescendantIds(child.id));
        }
        return ids;
    }

    async _updateNodeColor(nodeId, color) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        const oldColor = node.color;
        node.color = color;
        this.render();
        this._pushUndo({ type: 'color', nodeId, oldColor, newColor: color });

        try {
            await dataService.updateMindmapNode(nodeId, { color });
            this._showSaveIndicator();
        } catch (error) {
            console.error('MindmapEngine: Failed to update color', error);
        }
    }

    async _toggleCollapse(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        node.collapsed = !node.collapsed;
        this.render();

        try {
            await dataService.updateMindmapNode(nodeId, { collapsed: node.collapsed });
        } catch (error) {
            console.error('MindmapEngine: Failed to toggle collapse', error);
        }
    }

    // ========================================================================
    // INLINE LABEL EDITING
    // ========================================================================

    _startEditLabel(node) {
        if (this._isEditing) return;
        this._isEditing = true;

        const w = node._width || NODE_WIDTH;
        const h = node._height || NODE_HEIGHT;

        // Create a foreignObject for text editing
        const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        fo.setAttribute('x', node.x - 2);
        fo.setAttribute('y', node.y - 2);
        fo.setAttribute('width', w + 4);
        fo.setAttribute('height', h + 4);
        fo.setAttribute('class', 'mm-edit-fo');

        // Create a container div (needed for foreignObject)
        const div = document.createElement('div');
        div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        div.style.cssText = `
            width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
        `;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = node.label;
        input.style.cssText = `
            width: calc(100% - 16px); border: 2px solid #fff; outline: none;
            background: ${node.color || '#6366f1'}; text-align: center; font-size: 14px;
            font-family: Inter, system-ui, -apple-system, sans-serif;
            font-weight: 500;
            color: ${this._getContrastColor(node.color || '#6366f1')};
            padding: 6px 8px; box-sizing: border-box;
            border-radius: ${NODE_RADIUS}px;
            box-shadow: 0 0 0 3px rgba(99,102,241,0.3);
        `;

        div.appendChild(input);
        fo.appendChild(div);
        this.viewport.appendChild(fo);

        // Focus after DOM insertion
        requestAnimationFrame(() => {
            input.focus();
            input.select();
        });

        let finished = false;
        const finish = async () => {
            if (finished) return;
            finished = true;
            this._isEditing = false;

            const newLabel = input.value.trim() || 'New Node';
            node.label = newLabel;
            fo.remove();
            this.render();

            try {
                await dataService.updateMindmapNode(node.id, { label: newLabel });
                this._showSaveIndicator();
            } catch (error) {
                console.error('MindmapEngine: Failed to update label', error);
            }
        };

        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') {
                input.value = node.label;
                input.blur();
            }
            e.stopPropagation();
        });
        // Prevent clicks inside input from propagating to SVG
        input.addEventListener('mousedown', (e) => e.stopPropagation());
        input.addEventListener('dblclick', (e) => e.stopPropagation());
    }

    // ========================================================================
    // AUTO-LAYOUT
    // ========================================================================

    async autoLayout() {
        if (this.nodes.length === 0) return;

        // Find root nodes (no parent)
        const roots = this.nodes.filter(n => !n.parent_id);
        if (roots.length === 0) {
            roots.push(this.nodes[0]);
        }

        let startY = 0;
        for (const root of roots) {
            this._layoutTree(root, 100, startY);
            startY += this._getSubtreeHeight(root) + LAYOUT_V_GAP * 3;
        }

        this.render();

        // Batch save all positions
        const updates = this.nodes.map(n => ({
            id: n.id,
            x: Math.round(n.x),
            y: Math.round(n.y)
        }));

        try {
            await dataService.batchUpdateMindmapNodes(updates);
            this._showSaveIndicator();
        } catch (error) {
            console.error('MindmapEngine: Failed to save layout', error);
        }

        this.centerView();
    }

    _layoutTree(node, x, y) {
        node.x = x;
        node.y = y;

        const children = this.nodes
            .filter(n => n.parent_id === node.id)
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        if (children.length === 0) return;

        const totalHeight = this._getChildrenTotalHeight(node);
        let currentY = y - totalHeight / 2 + (node._height || NODE_HEIGHT) / 2;
        const childX = x + (node._width || NODE_WIDTH) + LAYOUT_H_GAP;

        for (const child of children) {
            const childHeight = this._getSubtreeHeight(child);
            this._layoutTree(child, childX, currentY + childHeight / 2 - (child._height || NODE_HEIGHT) / 2);
            currentY += childHeight + LAYOUT_V_GAP;
        }
    }

    _getSubtreeHeight(node) {
        const children = this.nodes.filter(n => n.parent_id === node.id);
        if (children.length === 0) return node._height || NODE_HEIGHT;

        let total = 0;
        for (const child of children) {
            total += this._getSubtreeHeight(child);
        }
        total += (children.length - 1) * LAYOUT_V_GAP;
        return Math.max(total, node._height || NODE_HEIGHT);
    }

    _getChildrenTotalHeight(node) {
        const children = this.nodes.filter(n => n.parent_id === node.id);
        if (children.length === 0) return 0;

        let total = 0;
        for (const child of children) {
            total += this._getSubtreeHeight(child);
        }
        total += (children.length - 1) * LAYOUT_V_GAP;
        return total;
    }

    // ========================================================================
    // KEYBOARD
    // ========================================================================

    _onKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (!this.currentMindmap) return;

        // Ctrl shortcuts
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); return; }
            if (e.key === 'z' && e.shiftKey) { e.preventDefault(); this.redo(); return; }
            if (e.key === 'y') { e.preventDefault(); this.redo(); return; }
            if (e.key === 'f') {
                e.preventDefault();
                document.getElementById('mm-search-input')?.focus();
                return;
            }
        }

        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                if (this.selectedNode) { e.preventDefault(); this.deleteSelected(); }
                break;
            case 'Tab':
                if (this.selectedNode) { e.preventDefault(); this.addChildToSelected(); }
                break;
            case 'Enter':
            case 'F2':
                if (this.selectedNode) { e.preventDefault(); this._startEditLabel(this.selectedNode); }
                break;
            case 'Escape':
                this._selectedNodes.clear();
                this._selectNode(null);
                this._hideContextMenu();
                this._hideNotesPanel();
                break;
        }
    }

    // ========================================================================
    // AUTO-SAVE
    // ========================================================================

    _scheduleNodeSave(node) {
        clearTimeout(this._autoSaveTimeout);
        this._autoSaveTimeout = setTimeout(async () => {
            try {
                await dataService.updateMindmapNode(node.id, {
                    x: Math.round(node.x),
                    y: Math.round(node.y)
                });
                this._showSaveIndicator();
            } catch (error) {
                console.error('MindmapEngine: Auto-save failed', error);
            }
        }, AUTO_SAVE_DELAY);
    }

    _scheduleViewportSave() {
        clearTimeout(this._viewportSaveTimeout);
        this._viewportSaveTimeout = setTimeout(async () => {
            if (!this.currentMindmap) return;
            try {
                await dataService.updateMindmap(this.currentMindmap.id, {
                    viewport: { x: this.viewportX, y: this.viewportY, zoom: this.zoom }
                });
            } catch (error) {
                console.error('MindmapEngine: Viewport save failed', error);
            }
        }, AUTO_SAVE_DELAY);
    }

    _showSaveIndicator() {
        if (!this.saveIndicator) return;
        this.saveIndicator.textContent = 'Saved ✓';
        this.saveIndicator.classList.add('saved');
        setTimeout(() => this.saveIndicator.classList.remove('saved'), 2000);
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================

    dispose() {
        if (this.svg) {
            this.svg.removeEventListener('mousedown', this._onMouseDown);
            this.svg.removeEventListener('mousemove', this._onMouseMove);
            this.svg.removeEventListener('mouseup', this._onMouseUp);
            this.svg.removeEventListener('mouseleave', this._onMouseUp);
            this.svg.removeEventListener('wheel', this._onWheel);
            this.svg.removeEventListener('contextmenu', this._onContextMenu);
        }
        document.removeEventListener('keydown', this._onKeyDown);
        clearTimeout(this._autoSaveTimeout);
        clearTimeout(this._viewportSaveTimeout);
    }

    // ========================================================================
    // UNDO / REDO
    // ========================================================================

    _pushUndo(action) {
        this._undoStack.push(action);
        if (this._undoStack.length > this._maxUndoSteps) this._undoStack.shift();
        this._redoStack = [];
        this._updateUndoButtons();
    }

    _updateUndoButtons() {
        const undoBtn = document.getElementById('mm-undo-btn');
        const redoBtn = document.getElementById('mm-redo-btn');
        if (undoBtn) undoBtn.disabled = this._undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = this._redoStack.length === 0;
    }

    async undo() {
        if (this._undoStack.length === 0) return;
        const action = this._undoStack.pop();
        this._redoStack.push(action);
        await this._applyUndoAction(action, true);
        this._updateUndoButtons();
    }

    async redo() {
        if (this._redoStack.length === 0) return;
        const action = this._redoStack.pop();
        this._undoStack.push(action);
        await this._applyUndoAction(action, false);
        this._updateUndoButtons();
    }

    async _applyUndoAction(action, isUndo) {
        switch (action.type) {
            case 'move': {
                const pos = isUndo ? action.oldPos : action.newPos;
                const node = this.nodes.find(n => n.id === action.nodeId);
                if (node) {
                    node.x = pos.x; node.y = pos.y;
                    this.render();
                    await dataService.updateMindmapNode(node.id, { x: pos.x, y: pos.y });
                }
                break;
            }
            case 'color': {
                const color = isUndo ? action.oldColor : action.newColor;
                const node = this.nodes.find(n => n.id === action.nodeId);
                if (node) {
                    node.color = color;
                    this.render();
                    await dataService.updateMindmapNode(node.id, { color });
                }
                break;
            }
            case 'label': {
                const label = isUndo ? action.oldLabel : action.newLabel;
                const node = this.nodes.find(n => n.id === action.nodeId);
                if (node) {
                    node.label = label;
                    this.render();
                    await dataService.updateMindmapNode(node.id, { label });
                }
                break;
            }
            case 'delete': {
                if (isUndo) {
                    // Re-create deleted nodes
                    for (const nd of action.deletedNodes) {
                        const created = await dataService.createMindmapNode(nd);
                        if (created) this.nodes.push(created);
                    }
                } else {
                    for (const nd of action.deletedNodes) {
                        await dataService.deleteMindmapNode(nd.id);
                        this.nodes = this.nodes.filter(n => n.id !== nd.id);
                    }
                }
                this.render();
                break;
            }
            case 'create': {
                if (isUndo) {
                    await dataService.deleteMindmapNode(action.node.id);
                    this.nodes = this.nodes.filter(n => n.id !== action.node.id);
                } else {
                    const created = await dataService.createMindmapNode(action.node);
                    if (created) this.nodes.push(created);
                }
                this.render();
                break;
            }
        }
        this._showSaveIndicator();
    }

    // ========================================================================
    // SEARCH
    // ========================================================================

    _applySearch() {
        this._searchResults.clear();
        if (this._searchQuery) {
            for (const node of this.nodes) {
                if (node.label.toLowerCase().includes(this._searchQuery) ||
                    (node.notes && node.notes.toLowerCase().includes(this._searchQuery))) {
                    this._searchResults.add(node.id);
                }
            }
        }
        this.render();
    }

    // ========================================================================
    // EXPORT
    // ========================================================================

    exportAsSVG() {
        if (!this.svg) return;
        const clone = this.svg.cloneNode(true);
        // Remove grid background
        const grid = clone.querySelector('#mm-grid-bg');
        if (grid) grid.remove();
        // Set white background
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%');
        bg.setAttribute('fill', '#ffffff');
        clone.insertBefore(bg, clone.firstChild);

        const svgData = new XMLSerializer().serializeToString(clone);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        this._downloadBlob(blob, `${this.currentMindmap?.title || 'mindmap'}.svg`);
    }

    exportAsPNG() {
        if (!this.svg) return;
        const clone = this.svg.cloneNode(true);
        const grid = clone.querySelector('#mm-grid-bg');
        if (grid) grid.remove();

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%');
        bg.setAttribute('fill', '#ffffff');
        clone.insertBefore(bg, clone.firstChild);

        const svgData = new XMLSerializer().serializeToString(clone);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width * 2;
            canvas.height = img.height * 2;
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                this._downloadBlob(blob, `${this.currentMindmap?.title || 'mindmap'}.png`);
            }, 'image/png');
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }

    _downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ========================================================================
    // EMOJI
    // ========================================================================

    async _updateNodeEmoji(nodeId, emoji) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;
        node.emoji = emoji || null;
        this.render();
        try {
            await dataService.updateMindmapNode(nodeId, { emoji: emoji || null });
            this._showSaveIndicator();
        } catch (error) {
            console.error('MindmapEngine: Failed to update emoji', error);
        }
    }

    // ========================================================================
    // NOTES PANEL
    // ========================================================================

    _showNotesPanel(node) {
        if (!this.notesPanel || !this.notesTextarea) return;
        this._notesNodeId = node.id;
        const label = document.getElementById('mm-notes-node-label');
        if (label) label.textContent = `${node.emoji || ''} ${node.label}`.trim();
        this.notesTextarea.value = node.notes || '';
        this.notesPanel.hidden = false;
    }

    _hideNotesPanel() {
        if (this.notesPanel) this.notesPanel.hidden = true;
        this._notesNodeId = null;
    }

    _saveNotes() {
        if (!this._notesNodeId || !this.notesTextarea) return;
        const node = this.nodes.find(n => n.id === this._notesNodeId);
        if (!node) return;
        node.notes = this.notesTextarea.value;
        clearTimeout(this._notesSaveTimeout);
        this._notesSaveTimeout = setTimeout(async () => {
            try {
                await dataService.updateMindmapNode(node.id, { notes: node.notes });
                this._showSaveIndicator();
            } catch (error) {
                console.error('MindmapEngine: Failed to save notes', error);
            }
        }, 1000);
        this.render(); // Update notes badge
    }

    // ========================================================================
    // RE-PARENT
    // ========================================================================

    async _reparentNode(node, newParent) {
        // Prevent circular reference
        const descendants = this._getDescendantIds(node.id);
        if (descendants.includes(newParent.id)) return;

        const oldParentId = node.parent_id;
        node.parent_id = newParent.id;
        this.render();

        this._pushUndo({ type: 'reparent', nodeId: node.id, oldParentId, newParentId: newParent.id });

        try {
            await dataService.updateMindmapNode(node.id, { parent_id: newParent.id });
            this._showSaveIndicator();
        } catch (error) {
            console.error('MindmapEngine: Failed to reparent node', error);
            node.parent_id = oldParentId;
            this.render();
        }
    }
}

export default MindmapEngine;
