/**
 * CanvasRenderer - Dual-canvas rendering system for Canvas View
 * 
 * Uses two canvas layers:
 * - Static canvas: Renders completed strokes (cached)
 * - Active canvas: Renders current stroke being drawn (real-time)
 * 
 * This separation allows smooth 60fps drawing while maintaining
 * performance with many completed strokes.
 * 
 * Requirements: 9.1, 9.3, 2.4, 3.1, 3.2
 */

/**
 * CanvasRenderer class for managing dual-canvas rendering
 */
class CanvasRenderer {
    /**
     * Create a CanvasRenderer instance
     * @param {HTMLCanvasElement} staticCanvas - Canvas for completed strokes
     * @param {HTMLCanvasElement} activeCanvas - Canvas for current stroke
     */
    constructor(staticCanvas, activeCanvas) {
        /** @type {HTMLCanvasElement} Canvas for completed strokes */
        this.staticCanvas = staticCanvas;
        
        /** @type {HTMLCanvasElement} Canvas for active stroke */
        this.activeCanvas = activeCanvas;
        
        /** @type {CanvasRenderingContext2D|null} Context for static canvas */
        this.staticCtx = staticCanvas ? staticCanvas.getContext('2d') : null;
        
        /** @type {CanvasRenderingContext2D|null} Context for active canvas */
        this.activeCtx = activeCanvas ? activeCanvas.getContext('2d') : null;
        
        /** @type {number|null} Current animation frame request ID */
        this.animationFrameId = null;
        
        /** @type {boolean} Whether a render is pending */
        this.renderPending = false;
        
        /** @type {Object|null} Current stroke being drawn */
        this.currentStroke = null;
        
        /** @type {Array<Object>} Points in the current stroke */
        this.currentPoints = [];
    }

    /**
     * Set canvas dimensions
     * @param {number} width - Canvas width in pixels
     * @param {number} height - Canvas height in pixels
     */
    setSize(width, height) {
        if (this.staticCanvas) {
            this.staticCanvas.width = width;
            this.staticCanvas.height = height;
        }
        if (this.activeCanvas) {
            this.activeCanvas.width = width;
            this.activeCanvas.height = height;
        }
    }

    /**
     * Get canvas dimensions
     * @returns {{width: number, height: number}} Canvas dimensions
     */
    getSize() {
        return {
            width: this.staticCanvas ? this.staticCanvas.width : 0,
            height: this.staticCanvas ? this.staticCanvas.height : 0
        };
    }

    /**
     * Begin a new stroke
     * @param {Object} style - Stroke style (tool, color, baseWidth, opacity)
     * @param {Object} point - First point of the stroke
     */
    beginStroke(style, point) {
        this.currentStroke = { ...style };
        this.currentPoints = [point];
        this.clearActiveCanvas();
    }

    /**
     * Add a point to the current stroke
     * @param {Object} point - Point to add
     */
    addPoint(point) {
        if (!this.currentStroke) {
            return;
        }
        
        this.currentPoints.push(point);
        this.requestRender();
    }

    /**
     * End the current stroke
     * @returns {Object|null} The completed stroke object, or null
     */
    endStroke() {
        if (!this.currentStroke || this.currentPoints.length === 0) {
            this.currentStroke = null;
            this.currentPoints = [];
            this.clearActiveCanvas();
            return null;
        }
        
        const stroke = {
            ...this.currentStroke,
            points: [...this.currentPoints]
        };
        
        this.currentStroke = null;
        this.currentPoints = [];
        this.clearActiveCanvas();
        
        return stroke;
    }

    /**
     * Cancel the current stroke
     */
    cancelStroke() {
        this.currentStroke = null;
        this.currentPoints = [];
        this.clearActiveCanvas();
    }

    /**
     * Request a render on the next animation frame
     */
    requestRender() {
        if (this.renderPending) {
            return;
        }
        
        this.renderPending = true;
        this.animationFrameId = requestAnimationFrame(() => {
            this.renderPending = false;
            this.renderActiveStroke();
        });
    }

    /**
     * Render the current stroke to the active canvas
     */
    renderActiveStroke() {
        if (!this.activeCtx || !this.currentStroke || this.currentPoints.length === 0) {
            return;
        }
        
        this.clearActiveCanvas();
        this.renderStroke(this.currentStroke, this.currentPoints, this.activeCtx);
    }

    /**
     * Render all strokes to the static canvas
     * @param {Array<Object>} strokes - Array of stroke objects
     */
    renderAllStrokes(strokes) {
        if (!this.staticCtx) {
            return;
        }
        
        this.clearStaticCanvas();
        
        for (const stroke of strokes) {
            this.renderStroke(stroke, stroke.points, this.staticCtx);
        }
    }

    /**
     * Render a single stroke to a canvas context
     * @param {Object} style - Stroke style
     * @param {Array<Object>} points - Stroke points
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderStroke(style, points, ctx) {
        if (!ctx || !points || points.length === 0) {
            return;
        }
        
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.save();
        
        // Set stroke style
        ctx.strokeStyle = style.color;
        ctx.globalAlpha = style.opacity;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // For single point, draw a dot
        if (points.length === 1) {
            const point = points[0];
            const x = point.x * width;
            const y = point.y * height;
            const radius = (style.baseWidth * point.pressure) / 2;
            
            ctx.beginPath();
            ctx.arc(x, y, Math.max(radius, 0.5), 0, Math.PI * 2);
            ctx.fillStyle = style.color;
            ctx.fill();
            ctx.restore();
            return;
        }
        
        // Draw stroke with variable width based on pressure
        this.renderVariableWidthStroke(style, points, ctx, width, height);
        
        ctx.restore();
    }

    /**
     * Render a stroke with variable width based on pressure
     * @param {Object} style - Stroke style
     * @param {Array<Object>} points - Stroke points
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    renderVariableWidthStroke(style, points, ctx, canvasWidth, canvasHeight) {
        // Draw segments with varying width
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            
            const x0 = p0.x * canvasWidth;
            const y0 = p0.y * canvasHeight;
            const x1 = p1.x * canvasWidth;
            const y1 = p1.y * canvasHeight;
            
            // Calculate line width based on average pressure
            const avgPressure = (p0.pressure + p1.pressure) / 2;
            ctx.lineWidth = style.baseWidth * avgPressure;
            
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            
            // Use quadratic curves for smoother lines
            if (i < points.length - 2) {
                const p2 = points[i + 2];
                const midX = (x1 + p2.x * canvasWidth) / 2;
                const midY = (y1 + p2.y * canvasHeight) / 2;
                ctx.quadraticCurveTo(x1, y1, midX, midY);
            } else {
                ctx.lineTo(x1, y1);
            }
            
            ctx.stroke();
        }
    }

    /**
     * Clear the static canvas
     */
    clearStaticCanvas() {
        if (this.staticCtx && this.staticCanvas) {
            this.staticCtx.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
        }
    }

    /**
     * Clear the active canvas
     */
    clearActiveCanvas() {
        if (this.activeCtx && this.activeCanvas) {
            this.activeCtx.clearRect(0, 0, this.activeCanvas.width, this.activeCanvas.height);
        }
    }

    /**
     * Clear both canvases
     */
    clearAll() {
        this.clearStaticCanvas();
        this.clearActiveCanvas();
    }

    /**
     * Render eraser cursor/indicator
     * @param {number} x - X coordinate (normalized 0-1)
     * @param {number} y - Y coordinate (normalized 0-1)
     * @param {number} size - Eraser size in pixels
     */
    renderEraserCursor(x, y, size) {
        if (!this.activeCtx || !this.activeCanvas) {
            return;
        }
        
        const ctx = this.activeCtx;
        const canvasX = x * this.activeCanvas.width;
        const canvasY = y * this.activeCanvas.height;
        
        ctx.save();
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, size / 2, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * Highlight strokes for eraser preview
     * @param {Array<Object>} strokes - Strokes to highlight
     */
    highlightStrokes(strokes) {
        if (!this.activeCtx || strokes.length === 0) {
            return;
        }
        
        const ctx = this.activeCtx;
        
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        
        for (const stroke of strokes) {
            this.renderStrokeOutline(stroke, ctx);
        }
        
        ctx.restore();
    }

    /**
     * Render stroke outline for highlighting
     * @param {Object} stroke - Stroke to outline
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderStrokeOutline(stroke, ctx) {
        if (!stroke.points || stroke.points.length === 0) {
            return;
        }
        
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        
        ctx.beginPath();
        
        const firstPoint = stroke.points[0];
        ctx.moveTo(firstPoint.x * width, firstPoint.y * height);
        
        for (let i = 1; i < stroke.points.length; i++) {
            const point = stroke.points[i];
            ctx.lineTo(point.x * width, point.y * height);
        }
        
        ctx.stroke();
    }

    /**
     * Generate a thumbnail of the current canvas content
     * @param {number} maxWidth - Maximum thumbnail width
     * @param {number} maxHeight - Maximum thumbnail height
     * @returns {string} Data URL of the thumbnail
     */
    generateThumbnail(maxWidth = 200, maxHeight = 150) {
        if (!this.staticCanvas) {
            return '';
        }
        
        // Calculate thumbnail dimensions maintaining aspect ratio
        const aspectRatio = this.staticCanvas.width / this.staticCanvas.height;
        let thumbWidth = maxWidth;
        let thumbHeight = maxWidth / aspectRatio;
        
        if (thumbHeight > maxHeight) {
            thumbHeight = maxHeight;
            thumbWidth = maxHeight * aspectRatio;
        }
        
        // Create thumbnail canvas
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        
        const thumbCtx = thumbCanvas.getContext('2d');
        
        // Fill with white background
        thumbCtx.fillStyle = '#ffffff';
        thumbCtx.fillRect(0, 0, thumbWidth, thumbHeight);
        
        // Draw scaled content
        thumbCtx.drawImage(
            this.staticCanvas,
            0, 0, this.staticCanvas.width, this.staticCanvas.height,
            0, 0, thumbWidth, thumbHeight
        );
        
        return thumbCanvas.toDataURL('image/png');
    }

    /**
     * Export canvas content as PNG data URL
     * @returns {string} PNG data URL
     */
    exportToPNG() {
        if (!this.staticCanvas) {
            return '';
        }
        
        // Create export canvas with white background
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.staticCanvas.width;
        exportCanvas.height = this.staticCanvas.height;
        
        const exportCtx = exportCanvas.getContext('2d');
        
        // Fill with white background
        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // Draw content
        exportCtx.drawImage(this.staticCanvas, 0, 0);
        
        return exportCanvas.toDataURL('image/png');
    }

    /**
     * Cancel any pending animation frame
     */
    cancelPendingRender() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            this.renderPending = false;
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.cancelPendingRender();
        this.currentStroke = null;
        this.currentPoints = [];
    }
}

// Export the class
export default CanvasRenderer;
