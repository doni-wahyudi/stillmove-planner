/**
 * UndoManager - Manages undo/redo history for Canvas View
 * 
 * Maintains stacks of actions that can be undone and redone.
 * Enforces a maximum history limit to prevent memory issues.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

/**
 * @typedef {Object} UndoAction
 * @property {'add'|'remove'|'clear'} type - Type of action
 * @property {Array<Object>} strokes - Affected strokes
 */

/**
 * UndoManager class for managing undo/redo operations
 */
class UndoManager {
    /**
     * Default maximum history size
     * @type {number}
     */
    static DEFAULT_MAX_HISTORY = 50;

    /**
     * Create an UndoManager instance
     * @param {number} [maxHistory=50] - Maximum number of actions to keep in history
     */
    constructor(maxHistory = UndoManager.DEFAULT_MAX_HISTORY) {
        /** @type {Array<UndoAction>} Stack of actions that can be undone */
        this.undoStack = [];
        
        /** @type {Array<UndoAction>} Stack of actions that can be redone */
        this.redoStack = [];
        
        /** @type {number} Maximum history size */
        this.maxHistory = Math.max(1, maxHistory);
        
        /** @type {Function|null} Callback when undo/redo state changes */
        this.onStateChange = null;
    }

    /**
     * Push a new action onto the undo stack
     * Clears the redo stack (new action invalidates redo history)
     * @param {UndoAction} action - Action to push
     */
    push(action) {
        if (!action || typeof action !== 'object') {
            console.warn('UndoManager.push: Invalid action');
            return;
        }

        // Add to undo stack
        this.undoStack.push(action);
        
        // Enforce max history limit
        while (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        
        // Clear redo stack - new action invalidates redo history
        this.redoStack = [];
        
        this._notifyStateChange();
    }

    /**
     * Undo the most recent action
     * @returns {UndoAction|null} The undone action, or null if nothing to undo
     */
    undo() {
        if (!this.canUndo()) {
            return null;
        }
        
        const action = this.undoStack.pop();
        this.redoStack.push(action);
        
        this._notifyStateChange();
        
        return action;
    }

    /**
     * Redo the most recently undone action
     * @returns {UndoAction|null} The redone action, or null if nothing to redo
     */
    redo() {
        if (!this.canRedo()) {
            return null;
        }
        
        const action = this.redoStack.pop();
        this.undoStack.push(action);
        
        this._notifyStateChange();
        
        return action;
    }

    /**
     * Check if undo is available
     * @returns {boolean} True if there are actions to undo
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean} True if there are actions to redo
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Get the number of actions in the undo stack
     * @returns {number} Number of undoable actions
     */
    getUndoCount() {
        return this.undoStack.length;
    }

    /**
     * Get the number of actions in the redo stack
     * @returns {number} Number of redoable actions
     */
    getRedoCount() {
        return this.redoStack.length;
    }

    /**
     * Clear both undo and redo stacks
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        
        this._notifyStateChange();
    }

    /**
     * Set callback for state changes
     * @param {Function} callback - Function to call when undo/redo state changes
     */
    setStateChangeCallback(callback) {
        this.onStateChange = callback;
    }

    /**
     * Notify listeners of state change
     * @private
     */
    _notifyStateChange() {
        if (typeof this.onStateChange === 'function') {
            this.onStateChange({
                canUndo: this.canUndo(),
                canRedo: this.canRedo(),
                undoCount: this.getUndoCount(),
                redoCount: this.getRedoCount()
            });
        }
    }

    /**
     * Peek at the next action to be undone without removing it
     * @returns {UndoAction|null} The next undoable action, or null
     */
    peekUndo() {
        if (!this.canUndo()) {
            return null;
        }
        return this.undoStack[this.undoStack.length - 1];
    }

    /**
     * Peek at the next action to be redone without removing it
     * @returns {UndoAction|null} The next redoable action, or null
     */
    peekRedo() {
        if (!this.canRedo()) {
            return null;
        }
        return this.redoStack[this.redoStack.length - 1];
    }
}

// Export the class
export default UndoManager;
