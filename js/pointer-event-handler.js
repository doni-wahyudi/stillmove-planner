/**
 * PointerEventHandler - Handles unified pointer input for Canvas View
 * 
 * Provides unified handling of mouse, touch, and stylus input with:
 * - Pressure sensitivity support
 * - Palm rejection during stylus input
 * - Stroke smoothing
 * - Coordinate normalization (0-1 range)
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6
 */

/**
 * @typedef {Object} NormalizedPoint
 * @property {number} x - X coordinate (0-1)
 * @property {number} y - Y coordinate (0-1)
 * @property {number} pressure - Pressure value (0-1)
 * @property {number} timestamp - Unix timestamp
 */

/**
 * @typedef {Object} PointerCallbacks
 * @property {Function} onStrokeStart - Called when a stroke begins
 * @property {Function} onStrokeMove - Called when stroke continues
 * @property {Function} onStrokeEnd - Called when stroke ends
 * @property {Function} [onHover] - Called on pointer move without drawing
 */

/**
 * PointerEventHandler class for managing canvas pointer input
 */
class PointerEventHandler {
    /**
     * Default pressure when not available from device
     * @type {number}
     */
    static DEFAULT_PRESSURE = 0.5;

    /**
     * Time window for palm rejection (ms)
     * @type {number}
     */
    static PALM_REJECTION_WINDOW = 100;

    /**
     * Smoothing factor for stroke smoothing (0-1)
     * Higher values = more smoothing
     * @type {number}
     */
    static SMOOTHING_FACTOR = 0.3;

    /**
     * Create a PointerEventHandler instance
     * @param {HTMLCanvasElement} canvas - Canvas element to handle events for
     * @param {PointerCallbacks} callbacks - Event callbacks
     */
    constructor(canvas, callbacks) {
        /** @type {HTMLCanvasElement} Target canvas */
        this.canvas = canvas;
        
        /** @type {PointerCallbacks} Event callbacks */
        this.callbacks = callbacks || {};
        
        /** @type {number|null} ID of the active pointer */
        this.activePointerId = null;
        
        /** @type {string|null} Type of the active pointer */
        this.activePointerType = null;
        
        /** @type {number} Timestamp of last stylus event */
        this.lastStylusTime = 0;
        
        /** @type {number} Palm rejection time window */
        this.palmRejectionWindow = PointerEventHandler.PALM_REJECTION_WINDOW;
        
        /** @type {Array<NormalizedPoint>} Recent points for smoothing */
        this.recentPoints = [];
        
        /** @type {boolean} Whether smoothing is enabled */
        this.smoothingEnabled = true;
        
        /** @type {boolean} Whether the handler is active */
        this.isActive = false;
        
        // Bind event handlers
        this._handlePointerDown = this._handlePointerDown.bind(this);
        this._handlePointerMove = this._handlePointerMove.bind(this);
        this._handlePointerUp = this._handlePointerUp.bind(this);
        this._handlePointerCancel = this._handlePointerCancel.bind(this);
        this._handlePointerLeave = this._handlePointerLeave.bind(this);
    }

    /**
     * Attach event listeners to the canvas
     */
    attach() {
        if (this.isActive || !this.canvas) {
            return;
        }
        
        this.canvas.addEventListener('pointerdown', this._handlePointerDown);
        this.canvas.addEventListener('pointermove', this._handlePointerMove);
        this.canvas.addEventListener('pointerup', this._handlePointerUp);
        this.canvas.addEventListener('pointercancel', this._handlePointerCancel);
        this.canvas.addEventListener('pointerleave', this._handlePointerLeave);
        
        // Prevent default touch behaviors
        this.canvas.style.touchAction = 'none';
        
        this.isActive = true;
    }

    /**
     * Detach event listeners from the canvas
     */
    detach() {
        if (!this.isActive || !this.canvas) {
            return;
        }
        
        this.canvas.removeEventListener('pointerdown', this._handlePointerDown);
        this.canvas.removeEventListener('pointermove', this._handlePointerMove);
        this.canvas.removeEventListener('pointerup', this._handlePointerUp);
        this.canvas.removeEventListener('pointercancel', this._handlePointerCancel);
        this.canvas.removeEventListener('pointerleave', this._handlePointerLeave);
        
        this.isActive = false;
        this._resetState();
    }

    /**
     * Handle pointer down event
     * @param {PointerEvent} event
     * @private
     */
    _handlePointerDown(event) {
        // Check for palm rejection
        if (this.isPalmTouch(event)) {
            return;
        }
        
        // Only track one pointer at a time
        if (this.activePointerId !== null) {
            return;
        }
        
        // Capture the pointer
        this.canvas.setPointerCapture(event.pointerId);
        
        this.activePointerId = event.pointerId;
        this.activePointerType = event.pointerType;
        
        // Update stylus timestamp for palm rejection
        if (event.pointerType === 'pen') {
            this.lastStylusTime = Date.now();
        }
        
        // Reset smoothing buffer
        this.recentPoints = [];
        
        // Get normalized point
        const point = this.normalizePoint(event);
        this.recentPoints.push(point);
        
        // Notify callback
        if (typeof this.callbacks.onStrokeStart === 'function') {
            this.callbacks.onStrokeStart(point, event);
        }
    }

    /**
     * Handle pointer move event
     * @param {PointerEvent} event
     * @private
     */
    _handlePointerMove(event) {
        // If not drawing, handle hover
        if (this.activePointerId === null) {
            if (typeof this.callbacks.onHover === 'function') {
                const point = this.normalizePoint(event);
                this.callbacks.onHover(point, event);
            }
            return;
        }
        
        // Only handle the active pointer
        if (event.pointerId !== this.activePointerId) {
            return;
        }
        
        // Update stylus timestamp
        if (event.pointerType === 'pen') {
            this.lastStylusTime = Date.now();
        }
        
        // Get normalized point
        let point = this.normalizePoint(event);
        
        // Apply smoothing if enabled
        if (this.smoothingEnabled && this.recentPoints.length > 0) {
            point = this.smoothPoint(point, this.recentPoints);
        }
        
        this.recentPoints.push(point);
        
        // Keep only recent points for smoothing
        if (this.recentPoints.length > 5) {
            this.recentPoints.shift();
        }
        
        // Notify callback
        if (typeof this.callbacks.onStrokeMove === 'function') {
            this.callbacks.onStrokeMove(point, event);
        }
    }

    /**
     * Handle pointer up event
     * @param {PointerEvent} event
     * @private
     */
    _handlePointerUp(event) {
        if (event.pointerId !== this.activePointerId) {
            return;
        }
        
        // Release pointer capture
        this.canvas.releasePointerCapture(event.pointerId);
        
        // Get final point
        const point = this.normalizePoint(event);
        
        // Notify callback
        if (typeof this.callbacks.onStrokeEnd === 'function') {
            this.callbacks.onStrokeEnd(point, event);
        }
        
        this._resetState();
    }

    /**
     * Handle pointer cancel event
     * @param {PointerEvent} event
     * @private
     */
    _handlePointerCancel(event) {
        if (event.pointerId !== this.activePointerId) {
            return;
        }
        
        // Notify callback with cancel flag
        if (typeof this.callbacks.onStrokeEnd === 'function') {
            const point = this.normalizePoint(event);
            this.callbacks.onStrokeEnd(point, event, true);
        }
        
        this._resetState();
    }

    /**
     * Handle pointer leave event
     * @param {PointerEvent} event
     * @private
     */
    _handlePointerLeave(event) {
        // Only end stroke if this is the active pointer
        if (event.pointerId === this.activePointerId) {
            this._handlePointerUp(event);
        }
    }

    /**
     * Reset internal state
     * @private
     */
    _resetState() {
        this.activePointerId = null;
        this.activePointerType = null;
        this.recentPoints = [];
    }

    /**
     * Check if a touch event should be rejected as palm input
     * @param {PointerEvent} event
     * @returns {boolean} True if the event should be rejected
     */
    isPalmTouch(event) {
        // Only reject touch events, not pen or mouse
        if (event.pointerType !== 'touch') {
            return false;
        }
        
        // If a stylus stroke is active, reject touch
        if (this.activePointerType === 'pen') {
            return true;
        }
        
        // If stylus was used recently, reject touch
        const timeSinceStylus = Date.now() - this.lastStylusTime;
        if (timeSinceStylus < this.palmRejectionWindow) {
            return true;
        }
        
        return false;
    }

    /**
     * Normalize a pointer event to canvas coordinates (0-1 range)
     * @param {PointerEvent} event
     * @returns {NormalizedPoint} Normalized point data
     */
    normalizePoint(event) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Calculate position relative to canvas
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        
        // Clamp to valid range
        const clampedX = Math.max(0, Math.min(1, x));
        const clampedY = Math.max(0, Math.min(1, y));
        
        // Get pressure (default if not available)
        let pressure = event.pressure;
        if (pressure === 0 && event.pointerType !== 'pen') {
            // Mouse and touch often report 0 pressure when actually pressed
            pressure = PointerEventHandler.DEFAULT_PRESSURE;
        }
        pressure = Math.max(0, Math.min(1, pressure));
        
        return {
            x: clampedX,
            y: clampedY,
            pressure: pressure,
            timestamp: Date.now()
        };
    }

    /**
     * Apply smoothing to a point based on recent points
     * Uses exponential moving average for smooth curves
     * @param {NormalizedPoint} point - Current point
     * @param {Array<NormalizedPoint>} previousPoints - Recent points
     * @returns {NormalizedPoint} Smoothed point
     */
    smoothPoint(point, previousPoints) {
        if (!previousPoints || previousPoints.length === 0) {
            return point;
        }
        
        const lastPoint = previousPoints[previousPoints.length - 1];
        const factor = PointerEventHandler.SMOOTHING_FACTOR;
        
        return {
            x: lastPoint.x * factor + point.x * (1 - factor),
            y: lastPoint.y * factor + point.y * (1 - factor),
            pressure: lastPoint.pressure * factor + point.pressure * (1 - factor),
            timestamp: point.timestamp
        };
    }

    /**
     * Enable or disable stroke smoothing
     * @param {boolean} enabled
     */
    setSmoothingEnabled(enabled) {
        this.smoothingEnabled = !!enabled;
    }

    /**
     * Set the palm rejection time window
     * @param {number} ms - Time window in milliseconds
     */
    setPalmRejectionWindow(ms) {
        this.palmRejectionWindow = Math.max(0, ms);
    }

    /**
     * Check if currently drawing
     * @returns {boolean} True if a stroke is in progress
     */
    isDrawing() {
        return this.activePointerId !== null;
    }

    /**
     * Get the current pointer type
     * @returns {string|null} Pointer type or null if not drawing
     */
    getPointerType() {
        return this.activePointerType;
    }
}

// Export the class
export default PointerEventHandler;
