/**
 * ToolManager - Manages drawing tool state for Canvas View
 * 
 * Handles tool switching, color selection, and stroke width settings.
 * Provides stroke style configuration for new strokes.
 * 
 * Requirements: 3.1, 3.2, 3.4, 4.2, 4.3, 4.4, 4.5
 */

/**
 * @typedef {'pen'|'highlighter'|'eraser'} ToolType
 */

/**
 * @typedef {Object} ToolConfig
 * @property {number} opacity - Stroke opacity (0-1)
 * @property {number} widthMultiplier - Multiplier for base width
 * @property {string} [mode] - Special mode (e.g., 'stroke' for eraser)
 */

/**
 * @typedef {Object} StrokeStyle
 * @property {string} tool - Tool type ('pen' or 'highlighter')
 * @property {string} color - Hex color string
 * @property {number} baseWidth - Base stroke width in pixels
 * @property {number} opacity - Stroke opacity (0-1)
 */

/**
 * ToolManager class for managing drawing tool state
 */
class ToolManager {
    /**
     * Minimum allowed stroke width
     * @type {number}
     */
    static MIN_WIDTH = 1;

    /**
     * Maximum allowed stroke width
     * @type {number}
     */
    static MAX_WIDTH = 20;

    /**
     * Default tool configurations
     * @type {Object<string, ToolConfig>}
     */
    static TOOL_CONFIGS = {
        pen: {
            opacity: 1.0,
            widthMultiplier: 1.0
        },
        highlighter: {
            opacity: 0.4,
            widthMultiplier: 3.0
        },
        eraser: {
            opacity: 1.0,
            widthMultiplier: 2.0,
            mode: 'stroke'
        }
    };

    /**
     * Preset colors for quick selection
     * @type {Array<string>}
     */
    static PRESET_COLORS = [
        '#000000', // Black
        '#ffffff', // White
        '#ff0000', // Red
        '#00ff00', // Green
        '#0000ff', // Blue
        '#ffff00', // Yellow
        '#ff00ff', // Magenta
        '#00ffff', // Cyan
        '#ff8000', // Orange
        '#8000ff', // Purple
        '#808080', // Gray
        '#804000'  // Brown
    ];

    /**
     * Create a ToolManager instance
     */
    constructor() {
        /** @type {ToolType} Currently selected tool */
        this.currentTool = 'pen';
        
        /** @type {string} Current stroke color (hex) */
        this.color = '#000000';
        
        /** @type {number} Base stroke width in pixels */
        this.baseWidth = 3;
        
        /** @type {Object<string, ToolConfig>} Tool configurations */
        this.tools = { ...ToolManager.TOOL_CONFIGS };
        
        /** @type {Function|null} Callback when tool state changes */
        this.onStateChange = null;
    }

    /**
     * Set the active drawing tool
     * @param {ToolType} toolName - Name of the tool to activate
     * @returns {boolean} True if tool was changed successfully
     */
    setTool(toolName) {
        if (!this.tools[toolName]) {
            console.warn(`ToolManager.setTool: Unknown tool "${toolName}"`);
            return false;
        }
        
        const previousTool = this.currentTool;
        this.currentTool = toolName;
        
        if (previousTool !== toolName) {
            this._notifyStateChange();
        }
        
        return true;
    }

    /**
     * Get the current tool name
     * @returns {ToolType} Current tool name
     */
    getTool() {
        return this.currentTool;
    }

    /**
     * Check if the current tool is the eraser
     * @returns {boolean} True if eraser is active
     */
    isEraser() {
        return this.currentTool === 'eraser';
    }

    /**
     * Set the stroke color
     * @param {string} color - Hex color string (e.g., '#ff0000')
     * @returns {boolean} True if color was set successfully
     */
    setColor(color) {
        if (!this.isValidColor(color)) {
            console.warn(`ToolManager.setColor: Invalid color "${color}"`);
            return false;
        }
        
        const previousColor = this.color;
        this.color = color.toLowerCase();
        
        if (previousColor !== this.color) {
            this._notifyStateChange();
        }
        
        return true;
    }

    /**
     * Get the current stroke color
     * @returns {string} Current hex color
     */
    getColor() {
        return this.color;
    }

    /**
     * Validate a hex color string
     * @param {string} color - Color to validate
     * @returns {boolean} True if valid hex color
     */
    isValidColor(color) {
        if (typeof color !== 'string') {
            return false;
        }
        // Match #RGB, #RRGGBB, or #RRGGBBAA
        return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color);
    }

    /**
     * Set the base stroke width
     * Width is clamped to the valid range [1, 20]
     * @param {number} width - Desired stroke width in pixels
     * @returns {number} The actual width that was set (after clamping)
     */
    setWidth(width) {
        if (typeof width !== 'number' || isNaN(width)) {
            console.warn(`ToolManager.setWidth: Invalid width "${width}"`);
            return this.baseWidth;
        }
        
        const previousWidth = this.baseWidth;
        this.baseWidth = this.clampWidth(width);
        
        if (previousWidth !== this.baseWidth) {
            this._notifyStateChange();
        }
        
        return this.baseWidth;
    }

    /**
     * Get the current base stroke width
     * @returns {number} Current base width in pixels
     */
    getWidth() {
        return this.baseWidth;
    }

    /**
     * Clamp a width value to the valid range
     * @param {number} width - Width to clamp
     * @returns {number} Clamped width
     */
    clampWidth(width) {
        return Math.max(ToolManager.MIN_WIDTH, Math.min(ToolManager.MAX_WIDTH, width));
    }

    /**
     * Get the stroke style for creating new strokes
     * Returns the current tool settings formatted for stroke creation
     * @returns {StrokeStyle} Current stroke style configuration
     */
    getStrokeStyle() {
        const toolConfig = this.tools[this.currentTool];
        
        // Eraser doesn't create strokes, but return pen style as fallback
        const tool = this.currentTool === 'eraser' ? 'pen' : this.currentTool;
        
        return {
            tool: tool,
            color: this.color,
            baseWidth: this.baseWidth * toolConfig.widthMultiplier,
            opacity: toolConfig.opacity
        };
    }

    /**
     * Get the effective width for the current tool
     * Accounts for tool-specific width multipliers
     * @returns {number} Effective stroke width
     */
    getEffectiveWidth() {
        const toolConfig = this.tools[this.currentTool];
        return this.baseWidth * toolConfig.widthMultiplier;
    }

    /**
     * Get the opacity for the current tool
     * @returns {number} Tool opacity (0-1)
     */
    getOpacity() {
        return this.tools[this.currentTool].opacity;
    }

    /**
     * Get the eraser mode
     * @returns {string} Eraser mode ('stroke' for stroke-based erasing)
     */
    getEraserMode() {
        return this.tools.eraser.mode;
    }

    /**
     * Get all preset colors
     * @returns {Array<string>} Array of preset hex colors
     */
    getPresetColors() {
        return [...ToolManager.PRESET_COLORS];
    }

    /**
     * Get the current tool state
     * @returns {Object} Current tool state
     */
    getState() {
        return {
            tool: this.currentTool,
            color: this.color,
            baseWidth: this.baseWidth,
            effectiveWidth: this.getEffectiveWidth(),
            opacity: this.getOpacity(),
            isEraser: this.isEraser()
        };
    }

    /**
     * Set callback for state changes
     * @param {Function} callback - Function to call when state changes
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
            this.onStateChange(this.getState());
        }
    }

    /**
     * Reset to default settings
     */
    reset() {
        this.currentTool = 'pen';
        this.color = '#000000';
        this.baseWidth = 3;
        this._notifyStateChange();
    }

    /**
     * Load settings from a saved state
     * @param {Object} state - Saved state object
     */
    loadState(state) {
        if (!state || typeof state !== 'object') {
            return;
        }
        
        if (state.tool && this.tools[state.tool]) {
            this.currentTool = state.tool;
        }
        
        if (state.color && this.isValidColor(state.color)) {
            this.color = state.color;
        }
        
        if (typeof state.baseWidth === 'number') {
            this.baseWidth = this.clampWidth(state.baseWidth);
        }
        
        this._notifyStateChange();
    }

    /**
     * Save current settings to a state object
     * @returns {Object} State object for persistence
     */
    saveState() {
        return {
            tool: this.currentTool,
            color: this.color,
            baseWidth: this.baseWidth
        };
    }
}

// Export the class
export default ToolManager;
