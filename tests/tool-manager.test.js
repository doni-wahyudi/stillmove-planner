/**
 * ToolManager Unit Tests
 * Tests for js/tool-manager.js
 * 
 * Requirements: 3.1, 3.2, 3.4, 4.2, 4.3, 4.4, 4.5
 */

import ToolManager from '../js/tool-manager.js';

describe('ToolManager', () => {
    let toolManager;

    beforeEach(() => {
        toolManager = new ToolManager();
    });

    describe('constructor', () => {
        test('initializes with pen tool', () => {
            expect(toolManager.getTool()).toBe('pen');
        });

        test('initializes with black color', () => {
            expect(toolManager.getColor()).toBe('#000000');
        });

        test('initializes with base width of 3', () => {
            expect(toolManager.getWidth()).toBe(3);
        });
    });

    describe('setTool', () => {
        test('switches to pen tool', () => {
            toolManager.setTool('highlighter');
            const result = toolManager.setTool('pen');
            
            expect(result).toBe(true);
            expect(toolManager.getTool()).toBe('pen');
        });

        test('switches to highlighter tool', () => {
            const result = toolManager.setTool('highlighter');
            
            expect(result).toBe(true);
            expect(toolManager.getTool()).toBe('highlighter');
        });

        test('switches to eraser tool', () => {
            const result = toolManager.setTool('eraser');
            
            expect(result).toBe(true);
            expect(toolManager.getTool()).toBe('eraser');
        });

        test('returns false for unknown tool', () => {
            const result = toolManager.setTool('unknown');
            
            expect(result).toBe(false);
            expect(toolManager.getTool()).toBe('pen');
        });

        test('triggers state change callback', () => {
            const callback = jest.fn();
            toolManager.setStateChangeCallback(callback);
            
            toolManager.setTool('highlighter');
            
            expect(callback).toHaveBeenCalled();
        });
    });

    describe('isEraser', () => {
        test('returns false for pen', () => {
            toolManager.setTool('pen');
            expect(toolManager.isEraser()).toBe(false);
        });

        test('returns false for highlighter', () => {
            toolManager.setTool('highlighter');
            expect(toolManager.isEraser()).toBe(false);
        });

        test('returns true for eraser', () => {
            toolManager.setTool('eraser');
            expect(toolManager.isEraser()).toBe(true);
        });
    });

    describe('setColor', () => {
        test('sets valid hex color', () => {
            const result = toolManager.setColor('#ff0000');
            
            expect(result).toBe(true);
            expect(toolManager.getColor()).toBe('#ff0000');
        });

        test('normalizes color to lowercase', () => {
            toolManager.setColor('#FF00FF');
            
            expect(toolManager.getColor()).toBe('#ff00ff');
        });

        test('accepts 3-digit hex colors', () => {
            const result = toolManager.setColor('#f00');
            
            expect(result).toBe(true);
            expect(toolManager.getColor()).toBe('#f00');
        });

        test('accepts 8-digit hex colors (with alpha)', () => {
            const result = toolManager.setColor('#ff0000ff');
            
            expect(result).toBe(true);
            expect(toolManager.getColor()).toBe('#ff0000ff');
        });

        test('rejects invalid color format', () => {
            const result = toolManager.setColor('red');
            
            expect(result).toBe(false);
            expect(toolManager.getColor()).toBe('#000000');
        });

        test('rejects color without hash', () => {
            const result = toolManager.setColor('ff0000');
            
            expect(result).toBe(false);
        });

        test('triggers state change callback', () => {
            const callback = jest.fn();
            toolManager.setStateChangeCallback(callback);
            
            toolManager.setColor('#ff0000');
            
            expect(callback).toHaveBeenCalled();
        });
    });

    describe('isValidColor', () => {
        test('validates 6-digit hex', () => {
            expect(toolManager.isValidColor('#ff0000')).toBe(true);
        });

        test('validates 3-digit hex', () => {
            expect(toolManager.isValidColor('#f00')).toBe(true);
        });

        test('validates 8-digit hex', () => {
            expect(toolManager.isValidColor('#ff0000ff')).toBe(true);
        });

        test('rejects invalid formats', () => {
            expect(toolManager.isValidColor('red')).toBe(false);
            expect(toolManager.isValidColor('#gg0000')).toBe(false);
            expect(toolManager.isValidColor('#ff00')).toBe(false);
            expect(toolManager.isValidColor(null)).toBe(false);
            expect(toolManager.isValidColor(123)).toBe(false);
        });
    });

    describe('setWidth', () => {
        test('sets valid width', () => {
            const result = toolManager.setWidth(5);
            
            expect(result).toBe(5);
            expect(toolManager.getWidth()).toBe(5);
        });

        test('clamps width to minimum of 1', () => {
            const result = toolManager.setWidth(0);
            
            expect(result).toBe(1);
            expect(toolManager.getWidth()).toBe(1);
        });

        test('clamps width to maximum of 20', () => {
            const result = toolManager.setWidth(25);
            
            expect(result).toBe(20);
            expect(toolManager.getWidth()).toBe(20);
        });

        test('clamps negative width to 1', () => {
            const result = toolManager.setWidth(-5);
            
            expect(result).toBe(1);
        });

        test('handles non-number input', () => {
            toolManager.setWidth(5);
            const result = toolManager.setWidth('invalid');
            
            expect(result).toBe(5); // Returns current width
            expect(toolManager.getWidth()).toBe(5);
        });

        test('handles NaN input', () => {
            toolManager.setWidth(5);
            const result = toolManager.setWidth(NaN);
            
            expect(result).toBe(5);
        });

        test('triggers state change callback', () => {
            const callback = jest.fn();
            toolManager.setStateChangeCallback(callback);
            
            toolManager.setWidth(10);
            
            expect(callback).toHaveBeenCalled();
        });
    });

    describe('clampWidth', () => {
        test('returns value within range unchanged', () => {
            expect(toolManager.clampWidth(10)).toBe(10);
        });

        test('clamps below minimum to 1', () => {
            expect(toolManager.clampWidth(0)).toBe(1);
            expect(toolManager.clampWidth(-10)).toBe(1);
        });

        test('clamps above maximum to 20', () => {
            expect(toolManager.clampWidth(21)).toBe(20);
            expect(toolManager.clampWidth(100)).toBe(20);
        });

        test('handles boundary values', () => {
            expect(toolManager.clampWidth(1)).toBe(1);
            expect(toolManager.clampWidth(20)).toBe(20);
        });
    });

    describe('getStrokeStyle', () => {
        test('returns pen style for pen tool', () => {
            toolManager.setTool('pen');
            toolManager.setColor('#ff0000');
            toolManager.setWidth(5);
            
            const style = toolManager.getStrokeStyle();
            
            expect(style.tool).toBe('pen');
            expect(style.color).toBe('#ff0000');
            expect(style.baseWidth).toBe(5); // 5 * 1.0
            expect(style.opacity).toBe(1.0);
        });

        test('returns highlighter style with multiplied width', () => {
            toolManager.setTool('highlighter');
            toolManager.setWidth(5);
            
            const style = toolManager.getStrokeStyle();
            
            expect(style.tool).toBe('highlighter');
            expect(style.baseWidth).toBe(15); // 5 * 3.0
            expect(style.opacity).toBe(0.4);
        });

        test('returns pen style when eraser is active', () => {
            toolManager.setTool('eraser');
            
            const style = toolManager.getStrokeStyle();
            
            expect(style.tool).toBe('pen');
        });
    });

    describe('getEffectiveWidth', () => {
        test('returns base width for pen', () => {
            toolManager.setTool('pen');
            toolManager.setWidth(5);
            
            expect(toolManager.getEffectiveWidth()).toBe(5);
        });

        test('returns multiplied width for highlighter', () => {
            toolManager.setTool('highlighter');
            toolManager.setWidth(5);
            
            expect(toolManager.getEffectiveWidth()).toBe(15);
        });

        test('returns multiplied width for eraser', () => {
            toolManager.setTool('eraser');
            toolManager.setWidth(5);
            
            expect(toolManager.getEffectiveWidth()).toBe(10); // 5 * 2.0
        });
    });

    describe('getOpacity', () => {
        test('returns 1.0 for pen', () => {
            toolManager.setTool('pen');
            expect(toolManager.getOpacity()).toBe(1.0);
        });

        test('returns 0.4 for highlighter', () => {
            toolManager.setTool('highlighter');
            expect(toolManager.getOpacity()).toBe(0.4);
        });

        test('returns 1.0 for eraser', () => {
            toolManager.setTool('eraser');
            expect(toolManager.getOpacity()).toBe(1.0);
        });
    });

    describe('getEraserMode', () => {
        test('returns stroke mode', () => {
            expect(toolManager.getEraserMode()).toBe('stroke');
        });
    });

    describe('getPresetColors', () => {
        test('returns array of preset colors', () => {
            const colors = toolManager.getPresetColors();
            
            expect(Array.isArray(colors)).toBe(true);
            expect(colors.length).toBeGreaterThan(0);
            expect(colors).toContain('#000000');
            expect(colors).toContain('#ff0000');
        });

        test('returns a copy of the array', () => {
            const colors1 = toolManager.getPresetColors();
            const colors2 = toolManager.getPresetColors();
            
            expect(colors1).not.toBe(colors2);
        });
    });

    describe('getState', () => {
        test('returns current state object', () => {
            toolManager.setTool('highlighter');
            toolManager.setColor('#ff0000');
            toolManager.setWidth(10);
            
            const state = toolManager.getState();
            
            expect(state.tool).toBe('highlighter');
            expect(state.color).toBe('#ff0000');
            expect(state.baseWidth).toBe(10);
            expect(state.effectiveWidth).toBe(30);
            expect(state.opacity).toBe(0.4);
            expect(state.isEraser).toBe(false);
        });
    });

    describe('reset', () => {
        test('resets to default values', () => {
            toolManager.setTool('highlighter');
            toolManager.setColor('#ff0000');
            toolManager.setWidth(15);
            
            toolManager.reset();
            
            expect(toolManager.getTool()).toBe('pen');
            expect(toolManager.getColor()).toBe('#000000');
            expect(toolManager.getWidth()).toBe(3);
        });

        test('triggers state change callback', () => {
            const callback = jest.fn();
            toolManager.setStateChangeCallback(callback);
            
            toolManager.reset();
            
            expect(callback).toHaveBeenCalled();
        });
    });

    describe('saveState / loadState', () => {
        test('saves and loads state correctly', () => {
            toolManager.setTool('highlighter');
            toolManager.setColor('#ff0000');
            toolManager.setWidth(15);
            
            const saved = toolManager.saveState();
            
            toolManager.reset();
            toolManager.loadState(saved);
            
            expect(toolManager.getTool()).toBe('highlighter');
            expect(toolManager.getColor()).toBe('#ff0000');
            expect(toolManager.getWidth()).toBe(15);
        });

        test('loadState handles invalid input', () => {
            toolManager.setColor('#ff0000');
            
            toolManager.loadState(null);
            toolManager.loadState('invalid');
            
            expect(toolManager.getColor()).toBe('#ff0000');
        });

        test('loadState validates values', () => {
            toolManager.loadState({
                tool: 'invalid',
                color: 'invalid',
                baseWidth: 100
            });
            
            expect(toolManager.getTool()).toBe('pen');
            expect(toolManager.getColor()).toBe('#000000');
            expect(toolManager.getWidth()).toBe(20); // Clamped
        });
    });

    describe('tool settings apply to new strokes', () => {
        test('changing tool affects subsequent stroke styles', () => {
            const style1 = toolManager.getStrokeStyle();
            expect(style1.tool).toBe('pen');
            
            toolManager.setTool('highlighter');
            const style2 = toolManager.getStrokeStyle();
            expect(style2.tool).toBe('highlighter');
        });

        test('changing color affects subsequent stroke styles', () => {
            const style1 = toolManager.getStrokeStyle();
            expect(style1.color).toBe('#000000');
            
            toolManager.setColor('#ff0000');
            const style2 = toolManager.getStrokeStyle();
            expect(style2.color).toBe('#ff0000');
        });

        test('changing width affects subsequent stroke styles', () => {
            const style1 = toolManager.getStrokeStyle();
            expect(style1.baseWidth).toBe(3);
            
            toolManager.setWidth(10);
            const style2 = toolManager.getStrokeStyle();
            expect(style2.baseWidth).toBe(10);
        });
    });
});
