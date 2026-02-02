/**
 * UndoManager Unit Tests
 * Tests for js/undo-manager.js
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import UndoManager from '../js/undo-manager.js';

// Helper to create a test action
function createAction(type = 'add', strokes = []) {
    return { type, strokes };
}

describe('UndoManager', () => {
    let undoManager;

    beforeEach(() => {
        undoManager = new UndoManager();
    });

    describe('constructor', () => {
        test('initializes with empty stacks', () => {
            expect(undoManager.getUndoCount()).toBe(0);
            expect(undoManager.getRedoCount()).toBe(0);
        });

        test('uses default max history of 50', () => {
            expect(undoManager.maxHistory).toBe(50);
        });

        test('accepts custom max history', () => {
            const manager = new UndoManager(100);
            expect(manager.maxHistory).toBe(100);
        });

        test('enforces minimum max history of 1', () => {
            const manager = new UndoManager(0);
            expect(manager.maxHistory).toBe(1);
        });
    });

    describe('push', () => {
        test('adds action to undo stack', () => {
            const action = createAction('add');
            undoManager.push(action);
            
            expect(undoManager.getUndoCount()).toBe(1);
            expect(undoManager.canUndo()).toBe(true);
        });

        test('clears redo stack on push', () => {
            // Setup: push, undo, then push again
            undoManager.push(createAction('add'));
            undoManager.undo();
            expect(undoManager.canRedo()).toBe(true);
            
            undoManager.push(createAction('add'));
            
            expect(undoManager.canRedo()).toBe(false);
            expect(undoManager.getRedoCount()).toBe(0);
        });

        test('enforces max history limit', () => {
            const manager = new UndoManager(5);
            
            for (let i = 0; i < 10; i++) {
                manager.push(createAction('add', [{ id: `stroke-${i}` }]));
            }
            
            expect(manager.getUndoCount()).toBe(5);
        });

        test('ignores null action', () => {
            undoManager.push(null);
            
            expect(undoManager.getUndoCount()).toBe(0);
        });

        test('ignores non-object action', () => {
            undoManager.push('invalid');
            
            expect(undoManager.getUndoCount()).toBe(0);
        });
    });

    describe('undo', () => {
        test('removes action from undo stack', () => {
            undoManager.push(createAction('add'));
            undoManager.push(createAction('add'));
            
            undoManager.undo();
            
            expect(undoManager.getUndoCount()).toBe(1);
        });

        test('adds action to redo stack', () => {
            undoManager.push(createAction('add'));
            
            undoManager.undo();
            
            expect(undoManager.getRedoCount()).toBe(1);
            expect(undoManager.canRedo()).toBe(true);
        });

        test('returns the undone action', () => {
            const action = createAction('add', [{ id: 'test-stroke' }]);
            undoManager.push(action);
            
            const result = undoManager.undo();
            
            expect(result).toBe(action);
        });

        test('returns null when nothing to undo', () => {
            const result = undoManager.undo();
            
            expect(result).toBeNull();
        });

        test('undoes in LIFO order', () => {
            const action1 = createAction('add', [{ id: 'stroke-1' }]);
            const action2 = createAction('add', [{ id: 'stroke-2' }]);
            
            undoManager.push(action1);
            undoManager.push(action2);
            
            expect(undoManager.undo()).toBe(action2);
            expect(undoManager.undo()).toBe(action1);
        });
    });

    describe('redo', () => {
        test('removes action from redo stack', () => {
            undoManager.push(createAction('add'));
            undoManager.undo();
            
            undoManager.redo();
            
            expect(undoManager.getRedoCount()).toBe(0);
        });

        test('adds action back to undo stack', () => {
            undoManager.push(createAction('add'));
            undoManager.undo();
            
            undoManager.redo();
            
            expect(undoManager.getUndoCount()).toBe(1);
        });

        test('returns the redone action', () => {
            const action = createAction('add', [{ id: 'test-stroke' }]);
            undoManager.push(action);
            undoManager.undo();
            
            const result = undoManager.redo();
            
            expect(result).toBe(action);
        });

        test('returns null when nothing to redo', () => {
            const result = undoManager.redo();
            
            expect(result).toBeNull();
        });

        test('redoes in LIFO order', () => {
            const action1 = createAction('add', [{ id: 'stroke-1' }]);
            const action2 = createAction('add', [{ id: 'stroke-2' }]);
            
            undoManager.push(action1);
            undoManager.push(action2);
            undoManager.undo();
            undoManager.undo();
            
            expect(undoManager.redo()).toBe(action1);
            expect(undoManager.redo()).toBe(action2);
        });
    });

    describe('canUndo', () => {
        test('returns false when undo stack is empty', () => {
            expect(undoManager.canUndo()).toBe(false);
        });

        test('returns true when undo stack has actions', () => {
            undoManager.push(createAction('add'));
            
            expect(undoManager.canUndo()).toBe(true);
        });
    });

    describe('canRedo', () => {
        test('returns false when redo stack is empty', () => {
            expect(undoManager.canRedo()).toBe(false);
        });

        test('returns true when redo stack has actions', () => {
            undoManager.push(createAction('add'));
            undoManager.undo();
            
            expect(undoManager.canRedo()).toBe(true);
        });
    });

    describe('clear', () => {
        test('clears both stacks', () => {
            undoManager.push(createAction('add'));
            undoManager.push(createAction('add'));
            undoManager.undo();
            
            undoManager.clear();
            
            expect(undoManager.getUndoCount()).toBe(0);
            expect(undoManager.getRedoCount()).toBe(0);
        });
    });

    describe('peekUndo', () => {
        test('returns next undoable action without removing', () => {
            const action = createAction('add');
            undoManager.push(action);
            
            const peeked = undoManager.peekUndo();
            
            expect(peeked).toBe(action);
            expect(undoManager.getUndoCount()).toBe(1);
        });

        test('returns null when nothing to undo', () => {
            expect(undoManager.peekUndo()).toBeNull();
        });
    });

    describe('peekRedo', () => {
        test('returns next redoable action without removing', () => {
            const action = createAction('add');
            undoManager.push(action);
            undoManager.undo();
            
            const peeked = undoManager.peekRedo();
            
            expect(peeked).toBe(action);
            expect(undoManager.getRedoCount()).toBe(1);
        });

        test('returns null when nothing to redo', () => {
            expect(undoManager.peekRedo()).toBeNull();
        });
    });

    describe('state change callback', () => {
        test('calls callback on push', () => {
            const callback = jest.fn();
            undoManager.setStateChangeCallback(callback);
            
            undoManager.push(createAction('add'));
            
            expect(callback).toHaveBeenCalledWith({
                canUndo: true,
                canRedo: false,
                undoCount: 1,
                redoCount: 0
            });
        });

        test('calls callback on undo', () => {
            undoManager.push(createAction('add'));
            
            const callback = jest.fn();
            undoManager.setStateChangeCallback(callback);
            
            undoManager.undo();
            
            expect(callback).toHaveBeenCalledWith({
                canUndo: false,
                canRedo: true,
                undoCount: 0,
                redoCount: 1
            });
        });

        test('calls callback on redo', () => {
            undoManager.push(createAction('add'));
            undoManager.undo();
            
            const callback = jest.fn();
            undoManager.setStateChangeCallback(callback);
            
            undoManager.redo();
            
            expect(callback).toHaveBeenCalledWith({
                canUndo: true,
                canRedo: false,
                undoCount: 1,
                redoCount: 0
            });
        });

        test('calls callback on clear', () => {
            undoManager.push(createAction('add'));
            
            const callback = jest.fn();
            undoManager.setStateChangeCallback(callback);
            
            undoManager.clear();
            
            expect(callback).toHaveBeenCalledWith({
                canUndo: false,
                canRedo: false,
                undoCount: 0,
                redoCount: 0
            });
        });
    });

    describe('undo-redo round-trip', () => {
        test('undo then redo restores exact action', () => {
            const action = createAction('add', [
                { id: 'stroke-1', color: '#ff0000' }
            ]);
            undoManager.push(action);
            
            const undone = undoManager.undo();
            const redone = undoManager.redo();
            
            expect(redone).toBe(undone);
            expect(redone).toBe(action);
        });

        test('multiple undo-redo cycles preserve actions', () => {
            const action = createAction('add', [{ id: 'test' }]);
            undoManager.push(action);
            
            for (let i = 0; i < 5; i++) {
                undoManager.undo();
                undoManager.redo();
            }
            
            expect(undoManager.peekUndo()).toBe(action);
        });
    });

    describe('history capacity', () => {
        test('maintains at least 50 actions', () => {
            for (let i = 0; i < 60; i++) {
                undoManager.push(createAction('add', [{ id: `stroke-${i}` }]));
            }
            
            expect(undoManager.getUndoCount()).toBe(50);
        });

        test('oldest actions are removed first', () => {
            const manager = new UndoManager(3);
            
            manager.push(createAction('add', [{ id: 'oldest' }]));
            manager.push(createAction('add', [{ id: 'middle' }]));
            manager.push(createAction('add', [{ id: 'newest' }]));
            manager.push(createAction('add', [{ id: 'extra' }]));
            
            // Undo all and check order
            const actions = [];
            while (manager.canUndo()) {
                actions.push(manager.undo());
            }
            
            expect(actions[0].strokes[0].id).toBe('extra');
            expect(actions[1].strokes[0].id).toBe('newest');
            expect(actions[2].strokes[0].id).toBe('middle');
            // 'oldest' should have been removed
        });
    });
});
