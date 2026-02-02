/**
 * PointerEventHandler Unit Tests
 * Tests for js/pointer-event-handler.js
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6
 */

import PointerEventHandler from '../js/pointer-event-handler.js';

// Mock canvas element
function createMockCanvas() {
    return {
        getBoundingClientRect: jest.fn(() => ({
            left: 0,
            top: 0,
            width: 1000,
            height: 800
        })),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        setPointerCapture: jest.fn(),
        releasePointerCapture: jest.fn(),
        style: {}
    };
}

// Create a mock pointer event
function createPointerEvent(type, options = {}) {
    return {
        type,
        pointerId: options.pointerId || 1,
        pointerType: options.pointerType || 'mouse',
        clientX: options.clientX || 500,
        clientY: options.clientY || 400,
        pressure: options.pressure !== undefined ? options.pressure : 0.5,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
    };
}

describe('PointerEventHandler', () => {
    let canvas;
    let callbacks;
    let handler;

    beforeEach(() => {
        canvas = createMockCanvas();
        callbacks = {
            onStrokeStart: jest.fn(),
            onStrokeMove: jest.fn(),
            onStrokeEnd: jest.fn(),
            onHover: jest.fn()
        };
        handler = new PointerEventHandler(canvas, callbacks);
    });

    afterEach(() => {
        handler.detach();
    });

    describe('constructor', () => {
        test('initializes with canvas reference', () => {
            expect(handler.canvas).toBe(canvas);
        });

        test('initializes with callbacks', () => {
            expect(handler.callbacks).toBe(callbacks);
        });

        test('initializes with no active pointer', () => {
            expect(handler.activePointerId).toBeNull();
            expect(handler.isDrawing()).toBe(false);
        });

        test('handles missing callbacks', () => {
            const h = new PointerEventHandler(canvas);
            expect(h.callbacks).toEqual({});
        });
    });

    describe('attach', () => {
        test('adds event listeners to canvas', () => {
            handler.attach();
            
            expect(canvas.addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
            expect(canvas.addEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
            expect(canvas.addEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
            expect(canvas.addEventListener).toHaveBeenCalledWith('pointercancel', expect.any(Function));
            expect(canvas.addEventListener).toHaveBeenCalledWith('pointerleave', expect.any(Function));
        });

        test('sets touch-action to none', () => {
            handler.attach();
            
            expect(canvas.style.touchAction).toBe('none');
        });

        test('sets isActive to true', () => {
            handler.attach();
            
            expect(handler.isActive).toBe(true);
        });

        test('does not attach twice', () => {
            handler.attach();
            handler.attach();
            
            expect(canvas.addEventListener).toHaveBeenCalledTimes(5);
        });
    });

    describe('detach', () => {
        test('removes event listeners from canvas', () => {
            handler.attach();
            handler.detach();
            
            expect(canvas.removeEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
            expect(canvas.removeEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
            expect(canvas.removeEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
        });

        test('sets isActive to false', () => {
            handler.attach();
            handler.detach();
            
            expect(handler.isActive).toBe(false);
        });

        test('resets state', () => {
            handler.attach();
            handler.activePointerId = 1;
            handler.detach();
            
            expect(handler.activePointerId).toBeNull();
        });
    });

    describe('normalizePoint', () => {
        test('normalizes coordinates to 0-1 range', () => {
            const event = createPointerEvent('pointermove', {
                clientX: 500,
                clientY: 400
            });
            
            const point = handler.normalizePoint(event);
            
            expect(point.x).toBe(0.5);
            expect(point.y).toBe(0.5);
        });

        test('clamps coordinates to valid range', () => {
            const event = createPointerEvent('pointermove', {
                clientX: -100,
                clientY: 1000
            });
            
            const point = handler.normalizePoint(event);
            
            expect(point.x).toBe(0);
            expect(point.y).toBe(1);
        });

        test('captures pressure value', () => {
            const event = createPointerEvent('pointermove', {
                pressure: 0.8
            });
            
            const point = handler.normalizePoint(event);
            
            expect(point.pressure).toBe(0.8);
        });

        test('uses default pressure for mouse with 0 pressure', () => {
            const event = createPointerEvent('pointermove', {
                pointerType: 'mouse',
                pressure: 0
            });
            
            const point = handler.normalizePoint(event);
            
            expect(point.pressure).toBe(0.5);
        });

        test('preserves 0 pressure for pen', () => {
            const event = createPointerEvent('pointermove', {
                pointerType: 'pen',
                pressure: 0
            });
            
            const point = handler.normalizePoint(event);
            
            expect(point.pressure).toBe(0);
        });

        test('includes timestamp', () => {
            const event = createPointerEvent('pointermove');
            const before = Date.now();
            
            const point = handler.normalizePoint(event);
            
            expect(point.timestamp).toBeGreaterThanOrEqual(before);
        });

        test('clamps pressure to valid range', () => {
            const event = createPointerEvent('pointermove', {
                pointerType: 'pen',
                pressure: 1.5
            });
            
            const point = handler.normalizePoint(event);
            
            expect(point.pressure).toBe(1);
        });
    });

    describe('isPalmTouch', () => {
        test('returns false for mouse events', () => {
            const event = createPointerEvent('pointerdown', {
                pointerType: 'mouse'
            });
            
            expect(handler.isPalmTouch(event)).toBe(false);
        });

        test('returns false for pen events', () => {
            const event = createPointerEvent('pointerdown', {
                pointerType: 'pen'
            });
            
            expect(handler.isPalmTouch(event)).toBe(false);
        });

        test('returns true for touch during active pen stroke', () => {
            handler.activePointerType = 'pen';
            
            const event = createPointerEvent('pointerdown', {
                pointerType: 'touch'
            });
            
            expect(handler.isPalmTouch(event)).toBe(true);
        });

        test('returns true for touch within palm rejection window', () => {
            handler.lastStylusTime = Date.now();
            
            const event = createPointerEvent('pointerdown', {
                pointerType: 'touch'
            });
            
            expect(handler.isPalmTouch(event)).toBe(true);
        });

        test('returns false for touch after palm rejection window', () => {
            handler.lastStylusTime = Date.now() - 200;
            
            const event = createPointerEvent('pointerdown', {
                pointerType: 'touch'
            });
            
            expect(handler.isPalmTouch(event)).toBe(false);
        });
    });

    describe('smoothPoint', () => {
        test('returns original point when no previous points', () => {
            const point = { x: 0.5, y: 0.5, pressure: 0.5, timestamp: 1 };
            
            const smoothed = handler.smoothPoint(point, []);
            
            expect(smoothed).toBe(point);
        });

        test('applies smoothing based on previous point', () => {
            const previous = [{ x: 0.4, y: 0.4, pressure: 0.4, timestamp: 1 }];
            const point = { x: 0.5, y: 0.5, pressure: 0.5, timestamp: 2 };
            
            const smoothed = handler.smoothPoint(point, previous);
            
            // With 0.3 smoothing factor: 0.4 * 0.3 + 0.5 * 0.7 = 0.47
            expect(smoothed.x).toBeCloseTo(0.47, 2);
            expect(smoothed.y).toBeCloseTo(0.47, 2);
        });

        test('preserves timestamp from current point', () => {
            const previous = [{ x: 0.4, y: 0.4, pressure: 0.4, timestamp: 1 }];
            const point = { x: 0.5, y: 0.5, pressure: 0.5, timestamp: 100 };
            
            const smoothed = handler.smoothPoint(point, previous);
            
            expect(smoothed.timestamp).toBe(100);
        });
    });

    describe('pointer event handling', () => {
        beforeEach(() => {
            handler.attach();
        });

        test('onStrokeStart called on pointer down', () => {
            const event = createPointerEvent('pointerdown');
            handler._handlePointerDown(event);
            
            expect(callbacks.onStrokeStart).toHaveBeenCalled();
            expect(handler.isDrawing()).toBe(true);
        });

        test('onStrokeMove called on pointer move during stroke', () => {
            const downEvent = createPointerEvent('pointerdown');
            handler._handlePointerDown(downEvent);
            
            const moveEvent = createPointerEvent('pointermove');
            handler._handlePointerMove(moveEvent);
            
            expect(callbacks.onStrokeMove).toHaveBeenCalled();
        });

        test('onStrokeEnd called on pointer up', () => {
            const downEvent = createPointerEvent('pointerdown');
            handler._handlePointerDown(downEvent);
            
            const upEvent = createPointerEvent('pointerup');
            handler._handlePointerUp(upEvent);
            
            expect(callbacks.onStrokeEnd).toHaveBeenCalled();
            expect(handler.isDrawing()).toBe(false);
        });

        test('onHover called on move without active stroke', () => {
            const moveEvent = createPointerEvent('pointermove');
            handler._handlePointerMove(moveEvent);
            
            expect(callbacks.onHover).toHaveBeenCalled();
            expect(callbacks.onStrokeMove).not.toHaveBeenCalled();
        });

        test('ignores second pointer during active stroke', () => {
            const event1 = createPointerEvent('pointerdown', { pointerId: 1 });
            handler._handlePointerDown(event1);
            
            const event2 = createPointerEvent('pointerdown', { pointerId: 2 });
            handler._handlePointerDown(event2);
            
            expect(callbacks.onStrokeStart).toHaveBeenCalledTimes(1);
        });

        test('ignores move from different pointer', () => {
            const downEvent = createPointerEvent('pointerdown', { pointerId: 1 });
            handler._handlePointerDown(downEvent);
            
            const moveEvent = createPointerEvent('pointermove', { pointerId: 2 });
            handler._handlePointerMove(moveEvent);
            
            expect(callbacks.onStrokeMove).not.toHaveBeenCalled();
        });

        test('rejects palm touch during stylus stroke', () => {
            const penEvent = createPointerEvent('pointerdown', {
                pointerId: 1,
                pointerType: 'pen'
            });
            handler._handlePointerDown(penEvent);
            
            const touchEvent = createPointerEvent('pointerdown', {
                pointerId: 2,
                pointerType: 'touch'
            });
            handler._handlePointerDown(touchEvent);
            
            expect(callbacks.onStrokeStart).toHaveBeenCalledTimes(1);
        });
    });

    describe('setSmoothingEnabled', () => {
        test('enables smoothing', () => {
            handler.setSmoothingEnabled(true);
            expect(handler.smoothingEnabled).toBe(true);
        });

        test('disables smoothing', () => {
            handler.setSmoothingEnabled(false);
            expect(handler.smoothingEnabled).toBe(false);
        });
    });

    describe('setPalmRejectionWindow', () => {
        test('sets palm rejection window', () => {
            handler.setPalmRejectionWindow(200);
            expect(handler.palmRejectionWindow).toBe(200);
        });

        test('clamps negative values to 0', () => {
            handler.setPalmRejectionWindow(-100);
            expect(handler.palmRejectionWindow).toBe(0);
        });
    });

    describe('getPointerType', () => {
        test('returns null when not drawing', () => {
            expect(handler.getPointerType()).toBeNull();
        });

        test('returns pointer type during stroke', () => {
            handler.attach();
            const event = createPointerEvent('pointerdown', {
                pointerType: 'pen'
            });
            handler._handlePointerDown(event);
            
            expect(handler.getPointerType()).toBe('pen');
        });
    });
});
