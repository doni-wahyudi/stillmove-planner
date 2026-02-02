/**
 * CanvasView - Controller for the Canvas View feature
 * 
 * Manages the canvas drawing interface, document list, and integrates
 * all canvas-related managers (StrokeManager, UndoManager, ToolManager).
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.4
 */

import StrokeManager from '../js/stroke-manager.js';
import UndoManager from '../js/undo-manager.js';
import ToolManager from '../js/tool-manager.js';
import PointerEventHandler from '../js/pointer-event-handler.js';
import CanvasRenderer from '../js/canvas-renderer.js';
import dataService from '../js/data-service.js';

/**
 * CanvasView controller class
 */
class CanvasView {
    /**
     * Auto-save debounce delay in milliseconds
     * @type {number}
     */
    static AUTO_SAVE_DELAY = 2000;

    /**
     * Create a CanvasView instance
     * @param {Object} stateManager - Application state manager
     */
    constructor(stateManager) {
        /** @type {Object} Application state manager */
        this.stateManager = stateManager;
        
        /** @type {Array<Object>} List of canvas documents */
        this.documents = [];
        
        /** @type {Object|null} Currently open document */
        this.currentDocument = null;
        
        /** @type {StrokeManager|null} Stroke manager instance */
        this.strokeManager = null;
        
        /** @type {UndoManager|null} Undo manager instance */
        this.undoManager = null;

        /** @type {ToolManager|null} Tool manager instance */
        this.toolManager = null;
        
        /** @type {PointerEventHandler|null} Pointer event handler */
        this.pointerHandler = null;
        
        /** @type {CanvasRenderer|null} Canvas renderer */
        this.renderer = null;
        
        /** @type {HTMLElement|null} Container element */
        this.container = null;
        
        /** @type {number|null} Auto-save timeout ID */
        this.autoSaveTimeout = null;
        
        /** @type {boolean} Whether there are unsaved changes */
        this.hasUnsavedChanges = false;
        
        /** @type {string|null} ID of document pending deletion */
        this.pendingDeleteId = null;
        
        // Bind methods
        this._handleStrokeStart = this._handleStrokeStart.bind(this);
        this._handleStrokeMove = this._handleStrokeMove.bind(this);
        this._handleStrokeEnd = this._handleStrokeEnd.bind(this);
        this._handleHover = this._handleHover.bind(this);
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleResize = this._handleResize.bind(this);
    }

    /**
     * Initialize the canvas view
     * @param {HTMLElement} container - Container element to render into
     */
    async init(container) {
        this.container = container;
        
        // Load HTML template
        await this._loadTemplate();
        
        // Cache DOM references
        this._cacheDOMReferences();
        
        // Initialize managers
        this._initializeManagers();
        
        // Setup event listeners
        this._setupEventListeners();
        
        // Load document list
        await this._loadDocuments();
        
        // Setup resize observer
        this._setupResizeObserver();
    }

    /**
     * Load the HTML template
     * @private
     */
    async _loadTemplate() {
        try {
            const response = await fetch('views/canvas-view.html');
            const html = await response.text();
            this.container.innerHTML = html;
        } catch (error) {
            console.error('CanvasView: Failed to load template', error);
            this.container.innerHTML = '<div class="error">Failed to load Canvas View</div>';
        }
    }

    /**
     * Cache DOM element references
     * @private
     */
    _cacheDOMReferences() {
        // Canvases
        this.staticCanvas = document.getElementById('static-canvas');
        this.activeCanvas = document.getElementById('active-canvas');
        this.canvasContainer = document.getElementById('canvas-container');
        
        // Sidebar
        this.documentList = document.getElementById('document-list');
        this.newCanvasBtn = document.getElementById('new-canvas-btn');
        
        // Toolbar
        this.toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
        this.colorPreview = document.getElementById('color-preview');
        this.colorSwatch = document.getElementById('color-swatch');
        this.colorDropdown = document.getElementById('color-dropdown');
        this.colorPresets = document.querySelectorAll('.color-preset');
        this.customColorInput = document.getElementById('custom-color-input');
        this.widthSlider = document.getElementById('width-slider');
        this.widthValue = document.getElementById('width-value');
        this.undoBtn = document.getElementById('undo-btn');
        this.redoBtn = document.getElementById('redo-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.exportBtn = document.getElementById('export-btn');
        
        // Title bar
        this.titleBar = document.getElementById('canvas-title-bar');
        this.titleInput = document.getElementById('canvas-title-input');
        this.saveIndicator = document.getElementById('save-indicator');
        
        // Empty state
        this.emptyState = document.getElementById('canvas-empty-state');
        this.emptyNewCanvasBtn = document.getElementById('empty-new-canvas-btn');
        
        // Modals
        this.clearModal = document.getElementById('clear-confirm-modal');
        this.deleteModal = document.getElementById('delete-confirm-modal');
    }

    /**
     * Initialize manager instances
     * @private
     */
    _initializeManagers() {
        // Initialize stroke manager
        this.strokeManager = new StrokeManager(this.staticCanvas, this.activeCanvas);
        
        // Initialize undo manager
        this.undoManager = new UndoManager();
        this.undoManager.setStateChangeCallback((state) => {
            this._updateUndoRedoButtons(state);
        });
        
        // Initialize tool manager
        this.toolManager = new ToolManager();
        this.toolManager.setStateChangeCallback((state) => {
            this._updateToolUI(state);
        });
        
        // Initialize renderer
        this.renderer = new CanvasRenderer(this.staticCanvas, this.activeCanvas);
        
        // Initialize pointer handler
        this.pointerHandler = new PointerEventHandler(this.activeCanvas, {
            onStrokeStart: this._handleStrokeStart,
            onStrokeMove: this._handleStrokeMove,
            onStrokeEnd: this._handleStrokeEnd,
            onHover: this._handleHover
        });
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        // New canvas buttons
        this.newCanvasBtn?.addEventListener('click', () => this._createNewDocument());
        this.emptyNewCanvasBtn?.addEventListener('click', () => this._createNewDocument());
        
        // Tool buttons
        this.toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                this.toolManager.setTool(tool);
                this._updateToolButtonStates(tool);
            });
        });
        
        // Color picker
        this.colorPreview?.addEventListener('click', () => this._toggleColorDropdown());
        this.colorPresets.forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                this.toolManager.setColor(color);
                this._updateColorSwatch(color);
                this._hideColorDropdown();
            });
        });
        this.customColorInput?.addEventListener('input', (e) => {
            this.toolManager.setColor(e.target.value);
            this._updateColorSwatch(e.target.value);
        });
        
        // Width slider
        this.widthSlider?.addEventListener('input', (e) => {
            const width = parseInt(e.target.value, 10);
            this.toolManager.setWidth(width);
            this.widthValue.textContent = width;
        });
        
        // Undo/Redo
        this.undoBtn?.addEventListener('click', () => this._undo());
        this.redoBtn?.addEventListener('click', () => this._redo());
        
        // Clear/Export
        this.clearBtn?.addEventListener('click', () => this._showClearModal());
        this.exportBtn?.addEventListener('click', () => this._exportToPNG());
        
        // Title input - update on change (blur) and input (real-time)
        this.titleInput?.addEventListener('change', () => this._updateDocumentTitle());
        this.titleInput?.addEventListener('input', () => {
            // Update local title immediately for UI feedback
            if (this.currentDocument && this.titleInput) {
                this.currentDocument.title = this.titleInput.value.trim() || 'Untitled Canvas';
            }
        });
        
        // Modal buttons
        const clearCancelBtn = document.getElementById('clear-cancel-btn');
        const clearConfirmBtn = document.getElementById('clear-confirm-btn');
        const deleteCancelBtn = document.getElementById('delete-cancel-btn');
        const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
        
        console.log('CanvasView: Setting up modal buttons', {
            clearCancelBtn: !!clearCancelBtn,
            clearConfirmBtn: !!clearConfirmBtn,
            deleteCancelBtn: !!deleteCancelBtn,
            deleteConfirmBtn: !!deleteConfirmBtn
        });
        
        clearCancelBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('CanvasView: Clear cancel clicked');
            this._hideClearModal();
        });
        clearConfirmBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('CanvasView: Clear confirm clicked');
            this._confirmClear();
        });
        deleteCancelBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('CanvasView: Delete cancel clicked');
            this._hideDeleteModal();
        });
        deleteConfirmBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('CanvasView: Delete confirm clicked');
            this._confirmDelete();
        });
        
        // Modal backdrop click to close
        this.clearModal?.querySelector('.modal-backdrop')?.addEventListener('click', () => this._hideClearModal());
        this.deleteModal?.querySelector('.modal-backdrop')?.addEventListener('click', () => this._hideDeleteModal());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this._handleKeyDown);
        
        // Click outside color dropdown to close
        document.addEventListener('click', (e) => {
            if (!this.colorPreview?.contains(e.target) && !this.colorDropdown?.contains(e.target)) {
                this._hideColorDropdown();
            }
        });
    }

    /**
     * Setup resize observer for canvas sizing
     * @private
     */
    _setupResizeObserver() {
        if (!this.canvasContainer) return;
        
        const resizeObserver = new ResizeObserver(this._handleResize);
        resizeObserver.observe(this.canvasContainer);
        
        // Initial resize
        this._handleResize();
    }

    /**
     * Handle container resize
     * @private
     */
    _handleResize() {
        if (!this.canvasContainer || !this.staticCanvas || !this.activeCanvas) return;
        
        const rect = this.canvasContainer.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        
        if (width > 0 && height > 0) {
            this.renderer.setSize(width, height);
            this.strokeManager.renderAll();
        }
    }

    /**
     * Get the current user ID from state manager
     * @returns {string|null} User ID or null
     * @private
     */
    _getUserId() {
        const authState = this.stateManager?.getState?.('auth');
        return authState?.user?.id || null;
    }

    /**
     * Load canvas documents from data service
     * @private
     */
    async _loadDocuments() {
        try {
            const userId = this._getUserId();
            if (!userId) {
                console.warn('CanvasView: No user ID available');
                return;
            }
            
            // Use data service to fetch documents (RLS handles user filtering)
            if (dataService?.getCanvasDocuments) {
                this.documents = await dataService.getCanvasDocuments();
            } else {
                this.documents = [];
            }
            
            this._renderDocumentList();
        } catch (error) {
            console.error('CanvasView: Failed to load documents', error);
            this.documents = [];
            this._renderDocumentList();
        }
    }

    /**
     * Render the document list in the sidebar
     * @private
     */
    _renderDocumentList() {
        if (!this.documentList) return;
        
        if (this.documents.length === 0) {
            this.documentList.innerHTML = `
                <div class="document-list-empty">
                    <p>No canvas documents yet.</p>
                </div>
            `;
            return;
        }
        
        this.documentList.innerHTML = this.documents.map(doc => `
            <div class="document-item ${doc.id === this.currentDocument?.id ? 'active' : ''}" 
                 data-id="${doc.id}" 
                 role="listitem"
                 tabindex="0">
                <div class="document-thumbnail">
                    ${doc.thumbnail_url 
                        ? `<img src="${doc.thumbnail_url}" alt="" loading="lazy">`
                        : '<div class="thumbnail-placeholder"></div>'
                    }
                </div>
                <div class="document-info">
                    <span class="document-title" data-id="${doc.id}">${this._escapeHtml(doc.title || 'Untitled')}</span>
                    <input type="text" class="document-title-input" data-id="${doc.id}" value="${this._escapeHtml(doc.title || 'Untitled')}" hidden>
                    <span class="document-date">${this._formatDate(doc.updated_at)}</span>
                </div>
                <div class="document-actions">
                    <button class="document-edit-btn" data-id="${doc.id}" aria-label="Rename document">
                        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                    </button>
                    <button class="document-delete-btn" data-id="${doc.id}" aria-label="Delete document">
                        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        this.documentList.querySelectorAll('.document-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.document-delete-btn') && !e.target.closest('.document-edit-btn') && !e.target.closest('.document-title-input')) {
                    this._selectDocument(item.dataset.id);
                }
            });
        });
        
        this.documentList.querySelectorAll('.document-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showDeleteModal(btn.dataset.id);
            });
        });
        
        // Add edit button handlers
        this.documentList.querySelectorAll('.document-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._startInlineEdit(btn.dataset.id);
            });
        });
        
        // Add inline edit input handlers
        this.documentList.querySelectorAll('.document-title-input').forEach(input => {
            input.addEventListener('blur', (e) => {
                this._finishInlineEdit(input.dataset.id, input.value);
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this._cancelInlineEdit(input.dataset.id);
                }
            });
        });
    }
    
    /**
     * Start inline editing of document title
     * @param {string} documentId - Document ID
     * @private
     */
    _startInlineEdit(documentId) {
        const item = this.documentList.querySelector(`.document-item[data-id="${documentId}"]`);
        if (!item) return;
        
        const titleSpan = item.querySelector('.document-title');
        const titleInput = item.querySelector('.document-title-input');
        
        if (titleSpan && titleInput) {
            titleSpan.hidden = true;
            titleInput.hidden = false;
            titleInput.focus();
            titleInput.select();
        }
    }
    
    /**
     * Finish inline editing and save
     * @param {string} documentId - Document ID
     * @param {string} newTitle - New title value
     * @private
     */
    async _finishInlineEdit(documentId, newTitle) {
        const doc = this.documents.find(d => d.id === documentId);
        if (!doc) return;
        
        const trimmedTitle = newTitle.trim() || 'Untitled Canvas';
        
        // Update local document
        doc.title = trimmedTitle;
        
        // Update current document if it's the same
        if (this.currentDocument?.id === documentId) {
            this.currentDocument.title = trimmedTitle;
            if (this.titleInput) {
                this.titleInput.value = trimmedTitle;
            }
        }
        
        // Save to server
        try {
            if (dataService?.updateCanvasDocument) {
                await dataService.updateCanvasDocument(documentId, { title: trimmedTitle });
            }
        } catch (error) {
            console.error('CanvasView: Failed to update title', error);
        }
        
        // Re-render list to show updated title
        this._renderDocumentList();
    }
    
    /**
     * Cancel inline editing
     * @param {string} documentId - Document ID
     * @private
     */
    _cancelInlineEdit(documentId) {
        const doc = this.documents.find(d => d.id === documentId);
        if (!doc) return;
        
        const item = this.documentList.querySelector(`.document-item[data-id="${documentId}"]`);
        if (!item) return;
        
        const titleSpan = item.querySelector('.document-title');
        const titleInput = item.querySelector('.document-title-input');
        
        if (titleSpan && titleInput) {
            titleInput.value = doc.title || 'Untitled';
            titleInput.hidden = true;
            titleSpan.hidden = false;
        }
    }

    /**
     * Select and load a document
     * @param {string} documentId - Document ID to select
     * @private
     */
    async _selectDocument(documentId) {
        console.log('CanvasView: _selectDocument called with id:', documentId);
        const doc = this.documents.find(d => d.id === documentId);
        if (!doc) {
            console.warn('CanvasView: Document not found in list:', documentId);
            return;
        }
        console.log('CanvasView: Found document:', doc.title);
        
        // Save current document if needed
        if (this.hasUnsavedChanges && this.currentDocument) {
            await this._saveCurrentDocument();
        }
        
        this.currentDocument = doc;
        
        // Load stroke data
        if (doc.stroke_data) {
            this.strokeManager.fromJSON(doc.stroke_data);
        } else {
            this.strokeManager.clear();
        }
        
        // Reset undo history
        this.undoManager.clear();
        
        // Update UI
        this._updateDocumentUI();
        this._renderDocumentList();
        
        // Attach pointer handler
        this.pointerHandler.attach();
    }

    /**
     * Create a new canvas document
     * @private
     */
    async _createNewDocument() {
        try {
            const userId = this._getUserId();
            if (!userId) {
                console.warn('CanvasView: No user ID available');
                return;
            }
            
            const newDoc = {
                title: 'Untitled Canvas',
                stroke_data: { version: 1, strokes: [] },
                thumbnail_url: null
            };
            
            if (dataService?.createCanvasDocument) {
                const created = await dataService.createCanvasDocument(newDoc);
                this.documents.unshift(created);
                await this._selectDocument(created.id);
            }
        } catch (error) {
            console.error('CanvasView: Failed to create document', error);
        }
    }

    /**
     * Update the document UI state
     * @private
     */
    _updateDocumentUI() {
        const hasDocument = !!this.currentDocument;
        console.log('CanvasView: _updateDocumentUI called, hasDocument:', hasDocument, 'currentDocument:', this.currentDocument?.id);
        
        // Show/hide empty state
        if (this.emptyState) {
            this.emptyState.hidden = hasDocument;
            console.log('CanvasView: emptyState.hidden set to:', hasDocument);
        } else {
            console.warn('CanvasView: emptyState element not found');
        }
        
        // Show/hide title bar
        if (this.titleBar) {
            this.titleBar.hidden = !hasDocument;
        } else {
            console.warn('CanvasView: titleBar element not found');
        }
        
        // Update title input
        if (this.titleInput && this.currentDocument) {
            this.titleInput.value = this.currentDocument.title || '';
        }
        
        // Enable/disable canvas
        if (this.staticCanvas) {
            this.staticCanvas.style.display = hasDocument ? 'block' : 'none';
        } else {
            console.warn('CanvasView: staticCanvas element not found');
        }
        if (this.activeCanvas) {
            this.activeCanvas.style.display = hasDocument ? 'block' : 'none';
        } else {
            console.warn('CanvasView: activeCanvas element not found');
        }
    }

    /**
     * Handle stroke start
     * @param {Object} point - Starting point
     * @private
     */
    _handleStrokeStart(point) {
        if (!this.currentDocument) return;
        
        if (this.toolManager.isEraser()) {
            // Eraser mode - find and highlight strokes
            this._handleEraserStart(point);
        } else {
            // Drawing mode
            const style = this.toolManager.getStrokeStyle();
            this.renderer.beginStroke(style, point);
        }
    }

    /**
     * Handle stroke move
     * @param {Object} point - Current point
     * @private
     */
    _handleStrokeMove(point) {
        if (!this.currentDocument) return;
        
        if (this.toolManager.isEraser()) {
            this._handleEraserMove(point);
        } else {
            this.renderer.addPoint(point);
        }
    }

    /**
     * Handle stroke end
     * @param {Object} point - End point
     * @param {PointerEvent} event - Original event
     * @param {boolean} cancelled - Whether stroke was cancelled
     * @private
     */
    _handleStrokeEnd(point, event, cancelled = false) {
        if (!this.currentDocument) return;
        
        if (this.toolManager.isEraser()) {
            this._handleEraserEnd();
        } else if (!cancelled) {
            const stroke = this.renderer.endStroke();
            if (stroke && stroke.points.length > 0) {
                this.strokeManager.addStroke(stroke);
                this.undoManager.push({ type: 'add', strokes: [stroke] });
                this._scheduleAutoSave();
            }
        } else {
            this.renderer.cancelStroke();
        }
    }

    /**
     * Handle hover (for eraser preview)
     * @param {Object} point - Current point
     * @private
     */
    _handleHover(point) {
        if (this.toolManager.isEraser()) {
            this.renderer.clearActiveCanvas();
            this.renderer.renderEraserCursor(point.x, point.y, this.toolManager.getEffectiveWidth());
            
            const hitStrokes = this.strokeManager.getStrokesAtPoint(point.x, point.y);
            if (hitStrokes.length > 0) {
                this.renderer.highlightStrokes(hitStrokes);
            }
        }
    }

    /**
     * Handle eraser start
     * @param {Object} point - Starting point
     * @private
     */
    _handleEraserStart(point) {
        this._eraserPath = [point];
        this._erasedStrokes = [];
    }

    /**
     * Handle eraser move
     * @param {Object} point - Current point
     * @private
     */
    _handleEraserMove(point) {
        if (!this._eraserPath) return;
        
        this._eraserPath.push(point);
        
        // Find strokes along path
        const hitStrokes = this.strokeManager.getStrokesAlongPath(this._eraserPath);
        
        // Remove hit strokes
        for (const stroke of hitStrokes) {
            if (!this._erasedStrokes.find(s => s.id === stroke.id)) {
                this.strokeManager.removeStroke(stroke.id);
                this._erasedStrokes.push(stroke);
            }
        }
        
        // Update eraser cursor
        this.renderer.clearActiveCanvas();
        this.renderer.renderEraserCursor(point.x, point.y, this.toolManager.getEffectiveWidth());
    }

    /**
     * Handle eraser end
     * @private
     */
    _handleEraserEnd() {
        if (this._erasedStrokes && this._erasedStrokes.length > 0) {
            this.undoManager.push({ type: 'remove', strokes: this._erasedStrokes });
            this._scheduleAutoSave();
        }
        
        this._eraserPath = null;
        this._erasedStrokes = [];
        this.renderer.clearActiveCanvas();
    }

    /**
     * Undo last action
     * @private
     */
    _undo() {
        const action = this.undoManager.undo();
        if (!action) return;
        
        if (action.type === 'add') {
            // Remove added strokes
            for (const stroke of action.strokes) {
                this.strokeManager.removeStroke(stroke.id);
            }
        } else if (action.type === 'remove') {
            // Restore removed strokes
            for (const stroke of action.strokes) {
                this.strokeManager.addStroke(stroke);
            }
        } else if (action.type === 'clear') {
            // Restore all cleared strokes
            for (const stroke of action.strokes) {
                this.strokeManager.addStroke(stroke);
            }
        }
        
        this._scheduleAutoSave();
    }

    /**
     * Redo last undone action
     * @private
     */
    _redo() {
        const action = this.undoManager.redo();
        if (!action) return;
        
        if (action.type === 'add') {
            // Re-add strokes
            for (const stroke of action.strokes) {
                this.strokeManager.addStroke(stroke);
            }
        } else if (action.type === 'remove') {
            // Re-remove strokes
            for (const stroke of action.strokes) {
                this.strokeManager.removeStroke(stroke.id);
            }
        } else if (action.type === 'clear') {
            // Re-clear all strokes
            this.strokeManager.clear();
        }
        
        this._scheduleAutoSave();
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} event
     * @private
     */
    _handleKeyDown(event) {
        // Only handle if canvas view is active
        if (!this.container?.contains(document.activeElement) && 
            document.activeElement !== document.body) {
            return;
        }
        
        if (event.ctrlKey || event.metaKey) {
            if (event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                this._undo();
            } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
                event.preventDefault();
                this._redo();
            }
        }
    }

    /**
     * Schedule auto-save with debouncing
     * @private
     */
    _scheduleAutoSave() {
        this.hasUnsavedChanges = true;
        this._updateSaveIndicator('Saving...');
        
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            this._saveCurrentDocument();
        }, CanvasView.AUTO_SAVE_DELAY);
    }

    /**
     * Save the current document
     * @private
     */
    async _saveCurrentDocument() {
        if (!this.currentDocument) return;
        
        try {
            const strokeData = this.strokeManager.toJSON();
            const thumbnail = this.renderer.generateThumbnail();
            
            const updates = {
                stroke_data: strokeData,
                thumbnail_url: thumbnail,
                updated_at: new Date().toISOString()
            };
            
            if (dataService?.updateCanvasDocument) {
                await dataService.updateCanvasDocument(this.currentDocument.id, updates);
                
                // Update local document
                Object.assign(this.currentDocument, updates);
                
                // Update document list
                const index = this.documents.findIndex(d => d.id === this.currentDocument.id);
                if (index !== -1) {
                    this.documents[index] = this.currentDocument;
                }
                
                this._renderDocumentList();
            }
            
            this.hasUnsavedChanges = false;
            this._updateSaveIndicator('Saved');
        } catch (error) {
            console.error('CanvasView: Failed to save document', error);
            this._updateSaveIndicator('Save failed');
        }
    }

    /**
     * Update document title
     * @private
     */
    async _updateDocumentTitle() {
        if (!this.currentDocument || !this.titleInput) return;
        
        const newTitle = this.titleInput.value.trim() || 'Untitled Canvas';
        this.currentDocument.title = newTitle;
        
        this._scheduleAutoSave();
    }

    /**
     * Show clear confirmation modal
     * @private
     */
    _showClearModal() {
        if (this.clearModal) {
            this.clearModal.hidden = false;
        }
    }

    /**
     * Hide clear confirmation modal
     * @private
     */
    _hideClearModal() {
        if (this.clearModal) {
            this.clearModal.hidden = true;
        }
    }

    /**
     * Confirm and execute clear
     * @private
     */
    _confirmClear() {
        const clearedStrokes = this.strokeManager.clear();
        
        if (clearedStrokes.length > 0) {
            this.undoManager.push({ type: 'clear', strokes: clearedStrokes });
            this._scheduleAutoSave();
        }
        
        this._hideClearModal();
    }

    /**
     * Show delete confirmation modal
     * @param {string} documentId - Document ID to delete
     * @private
     */
    _showDeleteModal(documentId) {
        console.log('CanvasView: _showDeleteModal called with id:', documentId);
        this.pendingDeleteId = documentId;
        if (this.deleteModal) {
            this.deleteModal.hidden = false;
            console.log('CanvasView: Delete modal shown');
        } else {
            console.warn('CanvasView: deleteModal element not found');
        }
    }

    /**
     * Hide delete confirmation modal
     * @private
     */
    _hideDeleteModal() {
        this.pendingDeleteId = null;
        if (this.deleteModal) {
            this.deleteModal.hidden = true;
        }
    }

    /**
     * Confirm and execute delete
     * @private
     */
    async _confirmDelete() {
        if (!this.pendingDeleteId) return;
        
        try {
            if (dataService?.deleteCanvasDocument) {
                await dataService.deleteCanvasDocument(this.pendingDeleteId);
            }
            
            // Remove from local list
            this.documents = this.documents.filter(d => d.id !== this.pendingDeleteId);
            
            // Clear current document if it was deleted
            if (this.currentDocument?.id === this.pendingDeleteId) {
                this.currentDocument = null;
                this.strokeManager.clear();
                this.undoManager.clear();
                this.pointerHandler.detach();
                this._updateDocumentUI();
            }
            
            this._renderDocumentList();
        } catch (error) {
            console.error('CanvasView: Failed to delete document', error);
        }
        
        this._hideDeleteModal();
    }

    /**
     * Export canvas to PNG
     * @private
     */
    _exportToPNG() {
        if (!this.currentDocument) return;
        
        const dataUrl = this.renderer.exportToPNG();
        if (!dataUrl) return;
        
        // Create download link
        const link = document.createElement('a');
        const title = this.currentDocument.title || 'canvas';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `${title}-${timestamp}.png`;
        link.href = dataUrl;
        link.click();
    }

    /**
     * Toggle color dropdown visibility
     * @private
     */
    _toggleColorDropdown() {
        if (this.colorDropdown) {
            this.colorDropdown.hidden = !this.colorDropdown.hidden;
        }
    }

    /**
     * Hide color dropdown
     * @private
     */
    _hideColorDropdown() {
        if (this.colorDropdown) {
            this.colorDropdown.hidden = true;
        }
    }

    /**
     * Update color swatch display
     * @param {string} color - Hex color
     * @private
     */
    _updateColorSwatch(color) {
        if (this.colorSwatch) {
            this.colorSwatch.style.backgroundColor = color;
        }
        if (this.customColorInput) {
            this.customColorInput.value = color;
        }
    }

    /**
     * Update tool button states
     * @param {string} activeTool - Currently active tool
     * @private
     */
    _updateToolButtonStates(activeTool) {
        this.toolButtons.forEach(btn => {
            const isActive = btn.dataset.tool === activeTool;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive);
        });
    }

    /**
     * Update undo/redo button states
     * @param {Object} state - Undo manager state
     * @private
     */
    _updateUndoRedoButtons(state) {
        if (this.undoBtn) {
            this.undoBtn.disabled = !state.canUndo;
        }
        if (this.redoBtn) {
            this.redoBtn.disabled = !state.canRedo;
        }
    }

    /**
     * Update tool UI based on state
     * @param {Object} state - Tool manager state
     * @private
     */
    _updateToolUI(state) {
        this._updateToolButtonStates(state.tool);
        this._updateColorSwatch(state.color);
        
        if (this.widthSlider) {
            this.widthSlider.value = state.baseWidth;
        }
        if (this.widthValue) {
            this.widthValue.textContent = state.baseWidth;
        }
    }

    /**
     * Update save indicator
     * @param {string} text - Indicator text
     * @private
     */
    _updateSaveIndicator(text) {
        if (this.saveIndicator) {
            this.saveIndicator.textContent = text;
        }
    }

    /**
     * Format date for display
     * @param {string} dateStr - ISO date string
     * @returns {string} Formatted date
     * @private
     */
    _formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Escape HTML for safe rendering
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     * @private
     */
    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Cleanup and dispose resources
     */
    dispose() {
        // Clear auto-save timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        // Detach pointer handler
        this.pointerHandler?.detach();
        
        // Dispose renderer
        this.renderer?.dispose();
        
        // Remove keyboard listener
        document.removeEventListener('keydown', this._handleKeyDown);
    }
}

// Export the class
export default CanvasView;
