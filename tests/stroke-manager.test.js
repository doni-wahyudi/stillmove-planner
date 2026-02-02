/**
 * StrokeManager Unit Tests
 * Tests for js/stroke-manager.js
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import StrokeManager, { generateStrokeId } from '../js/stroke-manager.js';

// Mock canvas and context for testing
function createMockCanvas(width = 1000, height = 800) {
    const canvas = {
        width,
        height,
        getContext: jest.fn(() => createMockContext(canvas))
    };
    return canvas;
}

function createMockContext(canvas) {
    return {
        canvas,
        clearRect: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        quadraticCurveTo: jest.fn(),
        stroke: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        strokeStyle: '',
        fillStyle: '',
        globalAlpha: 1,
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter'
    };
}

// Helper to create a valid stroke
function createValidStroke(overrides = {}) {
    return {
        id: overrides.id || generateStrokeId(),
        tool: overrides.tool || 'pen',
        color: overrides.color || '#000000',
        baseWidth: overrides.baseWidth || 3,
        opacity: overrides.opacity || 1.0,
        points: overrides.points || [
            { x: 0.1, y: 0.1, pressure: 0.5, timestamp: Date.now() },
            { x: 0.2, y: 0.2, pressure: 0.6, timestamp: Date.now() + 10 },
            { x: 0.3, y: 0.3, pressure: 0.7, timestamp: Date.now() + 20 }
        ],
        createdAt: overrides.createdAt || Date.now()
    };
}

describe('StrokeManager', () => {
    let staticCanvas;
    let activeCanvas;
    let strokeManager;

    beforeEach(() => {
        staticCanvas = createMockCanvas();
        activeCanvas = createMockCanvas();
        strokeManager = new StrokeManager(staticCanvas, activeCanvas);
    });

    describe('constructor', () => {
        test('initializes with empty strokes array', () => {
            expect(strokeManager.strokes).toEqual([]);
            expect(strokeManager.getStrokeCount()).toBe(0);
        });

        test('stores canvas references', () => {
            expect(strokeManager.staticCanvas).toBe(staticCanvas);
            expect(strokeManager.activeCanvas).toBe(activeCanvas);
        });

        test('handles null canvases gracefully', () => {
            const manager = new StrokeManager(null, null);
            expect(manager.staticCtx).toBeNull();
            expect(manager.activeCtx).toBeNull();
        });
    });

    describe('addStroke', () => {
        test('adds stroke to collection', () => {
            const stroke = createValidStroke();
            strokeManager.addStroke(stroke);
            
            expect(strokeManager.getStrokeCount()).toBe(1);
            expect(strokeManager.strokes[0]).toBe(stroke);
        });

        test('generates ID if not provided', () => {
            const stroke = createValidStroke();
            delete stroke.id;
            
            const added = strokeManager.addStroke(stroke);
            
            expect(added.id).toBeDefined();
            expect(added.id).toMatch(/^stroke-/);
        });

        test('generates createdAt if not provided', () => {
            const stroke = createValidStroke();
            delete stroke.createdAt;
            
            const added = strokeManager.addStroke(stroke);
            
            expect(added.createdAt).toBeDefined();
            expect(typeof added.createdAt).toBe('number');
        });

        test('triggers renderAll after adding', () => {
            const renderSpy = jest.spyOn(strokeManager, 'renderAll');
            strokeManager.addStroke(createValidStroke());
            
            expect(renderSpy).toHaveBeenCalled();
        });

        test('returns the added stroke', () => {
            const stroke = createValidStroke();
            const result = strokeManager.addStroke(stroke);
            
            expect(result).toBe(stroke);
        });
    });

    describe('removeStroke', () => {
        test('removes stroke by ID', () => {
            const stroke1 = createValidStroke({ id: 'stroke-1' });
            const stroke2 = createValidStroke({ id: 'stroke-2' });
            
            strokeManager.addStroke(stroke1);
            strokeManager.addStroke(stroke2);
            
            const removed = strokeManager.removeStroke('stroke-1');
            
            expect(removed).toBe(stroke1);
            expect(strokeManager.getStrokeCount()).toBe(1);
            expect(strokeManager.strokes[0].id).toBe('stroke-2');
        });

        test('returns null for non-existent ID', () => {
            strokeManager.addStroke(createValidStroke({ id: 'stroke-1' }));
            
            const removed = strokeManager.removeStroke('non-existent');
            
            expect(removed).toBeNull();
            expect(strokeManager.getStrokeCount()).toBe(1);
        });

        test('triggers renderAll after removing', () => {
            strokeManager.addStroke(createValidStroke({ id: 'stroke-1' }));
            const renderSpy = jest.spyOn(strokeManager, 'renderAll');
            
            strokeManager.removeStroke('stroke-1');
            
            expect(renderSpy).toHaveBeenCalled();
        });
    });

    describe('removeStrokes', () => {
        test('removes multiple strokes by IDs', () => {
            strokeManager.addStroke(createValidStroke({ id: 'stroke-1' }));
            strokeManager.addStroke(createValidStroke({ id: 'stroke-2' }));
            strokeManager.addStroke(createValidStroke({ id: 'stroke-3' }));
            
            const removed = strokeManager.removeStrokes(['stroke-1', 'stroke-3']);
            
            expect(removed.length).toBe(2);
            expect(strokeManager.getStrokeCount()).toBe(1);
            expect(strokeManager.strokes[0].id).toBe('stroke-2');
        });

        test('returns empty array when no strokes match', () => {
            strokeManager.addStroke(createValidStroke({ id: 'stroke-1' }));
            
            const removed = strokeManager.removeStrokes(['non-existent']);
            
            expect(removed).toEqual([]);
            expect(strokeManager.getStrokeCount()).toBe(1);
        });
    });

    describe('clear', () => {
        test('removes all strokes', () => {
            strokeManager.addStroke(createValidStroke({ id: 'stroke-1' }));
            strokeManager.addStroke(createValidStroke({ id: 'stroke-2' }));
            
            const removed = strokeManager.clear();
            
            expect(removed.length).toBe(2);
            expect(strokeManager.getStrokeCount()).toBe(0);
        });

        test('returns empty array when already empty', () => {
            const removed = strokeManager.clear();
            
            expect(removed).toEqual([]);
        });
    });

    describe('getStrokes', () => {
        test('returns copy of strokes array', () => {
            const stroke = createValidStroke();
            strokeManager.addStroke(stroke);
            
            const strokes = strokeManager.getStrokes();
            
            expect(strokes).toEqual([stroke]);
            expect(strokes).not.toBe(strokeManager.strokes);
        });
    });

    describe('toJSON', () => {
        test('serializes stroke data with version', () => {
            const stroke = createValidStroke({ id: 'test-stroke' });
            strokeManager.addStroke(stroke);
            
            const json = strokeManager.toJSON();
            
            expect(json.version).toBe(1);
            expect(json.strokes.length).toBe(1);
            expect(json.strokes[0].id).toBe('test-stroke');
        });

        test('serializes all stroke properties', () => {
            const stroke = createValidStroke({
                id: 'test-stroke',
                tool: 'highlighter',
                color: '#ff0000',
                baseWidth: 5,
                opacity: 0.5
            });
            strokeManager.addStroke(stroke);
            
            const json = strokeManager.toJSON();
            const serialized = json.strokes[0];
            
            expect(serialized.tool).toBe('highlighter');
            expect(serialized.color).toBe('#ff0000');
            expect(serialized.baseWidth).toBe(5);
            expect(serialized.opacity).toBe(0.5);
        });

        test('serializes all point properties', () => {
            const points = [
                { x: 0.25, y: 0.75, pressure: 0.8, timestamp: 12345 }
            ];
            const stroke = createValidStroke({ points });
            strokeManager.addStroke(stroke);
            
            const json = strokeManager.toJSON();
            const serializedPoint = json.strokes[0].points[0];
            
            expect(serializedPoint.x).toBe(0.25);
            expect(serializedPoint.y).toBe(0.75);
            expect(serializedPoint.pressure).toBe(0.8);
            expect(serializedPoint.timestamp).toBe(12345);
        });
    });

    describe('fromJSON', () => {
        test('deserializes stroke data from object', () => {
            const data = {
                version: 1,
                strokes: [createValidStroke({ id: 'loaded-stroke' })]
            };
            
            const result = strokeManager.fromJSON(data);
            
            expect(result).toBe(true);
            expect(strokeManager.getStrokeCount()).toBe(1);
            expect(strokeManager.strokes[0].id).toBe('loaded-stroke');
        });

        test('deserializes stroke data from JSON string', () => {
            const data = {
                version: 1,
                strokes: [createValidStroke({ id: 'loaded-stroke' })]
            };
            
            const result = strokeManager.fromJSON(JSON.stringify(data));
            
            expect(result).toBe(true);
            expect(strokeManager.getStrokeCount()).toBe(1);
        });

        test('handles empty strokes array', () => {
            const data = { version: 1, strokes: [] };
            
            const result = strokeManager.fromJSON(data);
            
            expect(result).toBe(true);
            expect(strokeManager.getStrokeCount()).toBe(0);
        });

        test('handles missing strokes property', () => {
            const data = { version: 1 };
            
            const result = strokeManager.fromJSON(data);
            
            expect(result).toBe(true);
            expect(strokeManager.getStrokeCount()).toBe(0);
        });

        test('filters out invalid strokes', () => {
            const data = {
                version: 1,
                strokes: [
                    createValidStroke({ id: 'valid-stroke' }),
                    { id: 'invalid-stroke', tool: 'invalid' } // Invalid tool
                ]
            };
            
            const result = strokeManager.fromJSON(data);
            
            expect(result).toBe(true);
            expect(strokeManager.getStrokeCount()).toBe(1);
            expect(strokeManager.strokes[0].id).toBe('valid-stroke');
        });

        test('returns false for invalid data', () => {
            const result = strokeManager.fromJSON(null);
            
            expect(result).toBe(false);
        });

        test('returns false for invalid JSON string', () => {
            const result = strokeManager.fromJSON('not valid json');
            
            expect(result).toBe(false);
        });
    });

    describe('isValidStroke', () => {
        test('returns true for valid stroke', () => {
            const stroke = createValidStroke();
            
            expect(strokeManager.isValidStroke(stroke)).toBe(true);
        });

        test('returns false for null', () => {
            expect(strokeManager.isValidStroke(null)).toBe(false);
        });

        test('returns false for invalid tool', () => {
            const stroke = createValidStroke({ tool: 'invalid' });
            
            expect(strokeManager.isValidStroke(stroke)).toBe(false);
        });

        test('returns false for invalid baseWidth', () => {
            expect(strokeManager.isValidStroke(createValidStroke({ baseWidth: 0 }))).toBe(false);
            expect(strokeManager.isValidStroke(createValidStroke({ baseWidth: 21 }))).toBe(false);
        });

        test('returns false for invalid opacity', () => {
            expect(strokeManager.isValidStroke(createValidStroke({ opacity: -0.1 }))).toBe(false);
            expect(strokeManager.isValidStroke(createValidStroke({ opacity: 1.1 }))).toBe(false);
        });

        test('returns false for empty points array', () => {
            const stroke = createValidStroke({ points: [] });
            
            expect(strokeManager.isValidStroke(stroke)).toBe(false);
        });
    });

    describe('isValidPoint', () => {
        test('returns true for valid point', () => {
            const point = { x: 0.5, y: 0.5, pressure: 0.5, timestamp: Date.now() };
            
            expect(strokeManager.isValidPoint(point)).toBe(true);
        });

        test('returns false for out-of-range x', () => {
            expect(strokeManager.isValidPoint({ x: -0.1, y: 0.5, pressure: 0.5, timestamp: 1 })).toBe(false);
            expect(strokeManager.isValidPoint({ x: 1.1, y: 0.5, pressure: 0.5, timestamp: 1 })).toBe(false);
        });

        test('returns false for out-of-range y', () => {
            expect(strokeManager.isValidPoint({ x: 0.5, y: -0.1, pressure: 0.5, timestamp: 1 })).toBe(false);
            expect(strokeManager.isValidPoint({ x: 0.5, y: 1.1, pressure: 0.5, timestamp: 1 })).toBe(false);
        });

        test('returns false for out-of-range pressure', () => {
            expect(strokeManager.isValidPoint({ x: 0.5, y: 0.5, pressure: -0.1, timestamp: 1 })).toBe(false);
            expect(strokeManager.isValidPoint({ x: 0.5, y: 0.5, pressure: 1.1, timestamp: 1 })).toBe(false);
        });
    });

    describe('getStrokesAtPoint', () => {
        test('returns strokes that intersect with point', () => {
            const stroke = createValidStroke({
                id: 'hit-stroke',
                points: [
                    { x: 0.5, y: 0.5, pressure: 0.5, timestamp: 1 }
                ]
            });
            strokeManager.addStroke(stroke);
            
            const hits = strokeManager.getStrokesAtPoint(0.5, 0.5);
            
            expect(hits.length).toBe(1);
            expect(hits[0].id).toBe('hit-stroke');
        });

        test('returns empty array when no strokes intersect', () => {
            const stroke = createValidStroke({
                points: [
                    { x: 0.1, y: 0.1, pressure: 0.5, timestamp: 1 }
                ]
            });
            strokeManager.addStroke(stroke);
            
            const hits = strokeManager.getStrokesAtPoint(0.9, 0.9);
            
            expect(hits).toEqual([]);
        });

        test('respects tolerance parameter', () => {
            const stroke = createValidStroke({
                id: 'near-stroke',
                points: [
                    { x: 0.5, y: 0.5, pressure: 0.5, timestamp: 1 }
                ]
            });
            strokeManager.addStroke(stroke);
            
            // Should miss with small tolerance
            expect(strokeManager.getStrokesAtPoint(0.55, 0.55, 0.01)).toEqual([]);
            
            // Should hit with larger tolerance
            expect(strokeManager.getStrokesAtPoint(0.55, 0.55, 0.1).length).toBe(1);
        });
    });

    describe('getStrokesAlongPath', () => {
        test('returns unique strokes along path', () => {
            const stroke1 = createValidStroke({
                id: 'stroke-1',
                points: [{ x: 0.2, y: 0.2, pressure: 0.5, timestamp: 1 }]
            });
            const stroke2 = createValidStroke({
                id: 'stroke-2',
                points: [{ x: 0.8, y: 0.8, pressure: 0.5, timestamp: 1 }]
            });
            strokeManager.addStroke(stroke1);
            strokeManager.addStroke(stroke2);
            
            const path = [
                { x: 0.2, y: 0.2 },
                { x: 0.5, y: 0.5 },
                { x: 0.8, y: 0.8 }
            ];
            
            const hits = strokeManager.getStrokesAlongPath(path);
            
            expect(hits.length).toBe(2);
        });

        test('does not return duplicate strokes', () => {
            const stroke = createValidStroke({
                id: 'long-stroke',
                points: [
                    { x: 0.1, y: 0.1, pressure: 0.5, timestamp: 1 },
                    { x: 0.2, y: 0.2, pressure: 0.5, timestamp: 2 },
                    { x: 0.3, y: 0.3, pressure: 0.5, timestamp: 3 }
                ]
            });
            strokeManager.addStroke(stroke);
            
            // Path that crosses the stroke multiple times
            const path = [
                { x: 0.1, y: 0.1 },
                { x: 0.2, y: 0.2 },
                { x: 0.3, y: 0.3 }
            ];
            
            const hits = strokeManager.getStrokesAlongPath(path);
            
            expect(hits.length).toBe(1);
        });
    });

    describe('renderStroke', () => {
        test('handles single point stroke', () => {
            const ctx = createMockContext(staticCanvas);
            const stroke = createValidStroke({
                points: [{ x: 0.5, y: 0.5, pressure: 0.5, timestamp: 1 }]
            });
            
            strokeManager.renderStroke(stroke, ctx);
            
            expect(ctx.arc).toHaveBeenCalled();
            expect(ctx.fill).toHaveBeenCalled();
        });

        test('handles multi-point stroke', () => {
            const ctx = createMockContext(staticCanvas);
            const stroke = createValidStroke();
            
            strokeManager.renderStroke(stroke, ctx);
            
            expect(ctx.beginPath).toHaveBeenCalled();
            expect(ctx.stroke).toHaveBeenCalled();
        });

        test('handles null context gracefully', () => {
            const stroke = createValidStroke();
            
            // Should not throw
            expect(() => strokeManager.renderStroke(stroke, null)).not.toThrow();
        });

        test('handles empty points array gracefully', () => {
            const ctx = createMockContext(staticCanvas);
            const stroke = { ...createValidStroke(), points: [] };
            
            // Should not throw
            expect(() => strokeManager.renderStroke(stroke, ctx)).not.toThrow();
        });
    });

    describe('clearActiveCanvas', () => {
        test('clears the active canvas', () => {
            strokeManager.clearActiveCanvas();
            
            expect(strokeManager.activeCtx.clearRect).toHaveBeenCalledWith(
                0, 0, activeCanvas.width, activeCanvas.height
            );
        });

        test('handles null active canvas gracefully', () => {
            const manager = new StrokeManager(staticCanvas, null);
            
            // Should not throw
            expect(() => manager.clearActiveCanvas()).not.toThrow();
        });
    });
});

describe('generateStrokeId', () => {
    test('generates unique IDs', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
            ids.add(generateStrokeId());
        }
        
        expect(ids.size).toBe(100);
    });

    test('generates IDs with stroke- prefix', () => {
        const id = generateStrokeId();
        
        expect(id).toMatch(/^stroke-/);
    });
});
