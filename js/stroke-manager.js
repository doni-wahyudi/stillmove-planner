/**
 * StrokeManager - Manages stroke collection and rendering for Canvas View
 * 
 * Handles stroke storage, serialization, rendering, and hit testing for eraser functionality.
 * Strokes are stored with normalized coordinates (0-1) for resolution independence.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

/**
 * Generate a unique stroke ID
 * @returns {string} UUID-like string
 */
function generateStrokeId() {
    return 'stroke-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 11);
}

/**
 * StrokeManager class for managing canvas strokes
 */
class StrokeManager {
    /**
     * Current stroke data schema version
     * @type {number}
     */
    static SCHEMA_VERSION = 1;

    /**
     * Create a StrokeManager instance
     * @param {HTMLCanvasElement} staticCanvas - Canvas for completed strokes
     * @param {HTMLCanvasElement} activeCanvas - Canvas for current stroke being drawn
     */
    constructor(staticCanvas, activeCanvas) {
        /** @type {Array<Object>} Collection of completed strokes */
        this.strokes = [];
        
        /** @type {HTMLCanvasElement} Canvas for completed strokes */
        this.staticCanvas = staticCanvas;
        
        /** @type {HTMLCanvasElement} Canvas for active stroke */
        this.activeCanvas = activeCanvas;
        
        /** @type {CanvasRenderingContext2D|null} Context for static canvas */
        this.staticCtx = staticCanvas ? staticCanvas.getContext('2d') : null;
        
        /** @type {CanvasRenderingContext2D|null} Context for active canvas */
        this.activeCtx = activeCanvas ? activeCanvas.getContext('2d') : null;
    }

    /**
     * Add a stroke to the collection and re-render
     * @param {Object} stroke - Stroke object to add
     * @returns {Object} The added stroke with generated ID if not present
     */
    addStroke(stroke) {
        // Ensure stroke has an ID
        if (!stroke.id) {
            stroke.id = generateStrokeId();
        }
        
        // Ensure stroke has a creation timestamp
        if (!stroke.createdAt) {
            stroke.createdAt = Date.now();
        }
        
        this.strokes.push(stroke);
        this.renderAll();
        
        return stroke;
    }

    /**
     * Remove a stroke by ID
     * @param {string} strokeId - ID of the stroke to remove
     * @returns {Object|null} The removed stroke, or null if not found
     */
    removeStroke(strokeId) {
        const index = this.strokes.findIndex(s => s.id === strokeId);
        
        if (index === -1) {
            return null;
        }
        
        const removed = this.strokes.splice(index, 1)[0];
        this.renderAll();
        
        return removed;
    }

    /**
     * Remove multiple strokes by their IDs
     * @param {Array<string>} strokeIds - Array of stroke IDs to remove
     * @returns {Array<Object>} Array of removed strokes
     */
    removeStrokes(strokeIds) {
        const removed = [];
        const idsSet = new Set(strokeIds);
        
        this.strokes = this.strokes.filter(stroke => {
            if (idsSet.has(stroke.id)) {
                removed.push(stroke);
                return false;
            }
            return true;
        });
        
        if (removed.length > 0) {
            this.renderAll();
        }
        
        return removed;
    }

    /**
     * Clear all strokes
     * @returns {Array<Object>} Array of all removed strokes
     */
    clear() {
        const removed = [...this.strokes];
        this.strokes = [];
        this.renderAll();
        return removed;
    }

    /**
     * Get all strokes
     * @returns {Array<Object>} Copy of the strokes array
     */
    getStrokes() {
        return [...this.strokes];
    }

    /**
     * Get stroke count
     * @returns {number} Number of strokes
     */
    getStrokeCount() {
        return this.strokes.length;
    }

    /**
     * Serialize stroke data to JSON-compatible object
     * @returns {Object} StrokeData object with version and strokes
     */
    toJSON() {
        return {
            version: StrokeManager.SCHEMA_VERSION,
            strokes: this.strokes.map(stroke => ({
                id: stroke.id,
                tool: stroke.tool,
                color: stroke.color,
                baseWidth: stroke.baseWidth,
                opacity: stroke.opacity,
                points: stroke.points.map(point => ({
                    x: point.x,
                    y: point.y,
                    pressure: point.pressure,
                    timestamp: point.timestamp
                })),
                createdAt: stroke.createdAt
            }))
        };
    }

    /**
     * Deserialize stroke data from JSON and load into manager
     * @param {Object|string} data - StrokeData object or JSON string
     * @returns {boolean} True if successful, false if data is invalid
     */
    fromJSON(data) {
        try {
            // Parse if string
            const strokeData = typeof data === 'string' ? JSON.parse(data) : data;
            
            // Validate basic structure
            if (!strokeData || typeof strokeData !== 'object') {
                console.warn('StrokeManager.fromJSON: Invalid data format');
                return false;
            }
            
            // Handle empty or missing strokes array
            if (!strokeData.strokes || !Array.isArray(strokeData.strokes)) {
                this.strokes = [];
                this.renderAll();
                return true;
            }
            
            // Validate and load strokes
            this.strokes = strokeData.strokes
                .filter(stroke => this.isValidStroke(stroke))
                .map(stroke => ({
                    id: stroke.id || generateStrokeId(),
                    tool: stroke.tool,
                    color: stroke.color,
                    baseWidth: stroke.baseWidth,
                    opacity: stroke.opacity,
                    points: stroke.points.map(point => ({
                        x: point.x,
                        y: point.y,
                        pressure: point.pressure,
                        timestamp: point.timestamp
                    })),
                    createdAt: stroke.createdAt || Date.now()
                }));
            
            this.renderAll();
            return true;
        } catch (error) {
            console.error('StrokeManager.fromJSON: Error parsing data', error);
            return false;
        }
    }

    /**
     * Validate a stroke object has required properties
     * @param {Object} stroke - Stroke to validate
     * @returns {boolean} True if valid
     */
    isValidStroke(stroke) {
        if (!stroke || typeof stroke !== 'object') {
            return false;
        }
        
        // Check required properties
        if (!stroke.tool || !['pen', 'highlighter'].includes(stroke.tool)) {
            return false;
        }
        
        if (typeof stroke.color !== 'string') {
            return false;
        }
        
        if (typeof stroke.baseWidth !== 'number' || stroke.baseWidth < 1 || stroke.baseWidth > 20) {
            return false;
        }
        
        if (typeof stroke.opacity !== 'number' || stroke.opacity < 0 || stroke.opacity > 1) {
            return false;
        }
        
        if (!Array.isArray(stroke.points) || stroke.points.length === 0) {
            return false;
        }
        
        // Validate points
        return stroke.points.every(point => this.isValidPoint(point));
    }

    /**
     * Validate a point object
     * @param {Object} point - Point to validate
     * @returns {boolean} True if valid
     */
    isValidPoint(point) {
        if (!point || typeof point !== 'object') {
            return false;
        }
        
        return (
            typeof point.x === 'number' && point.x >= 0 && point.x <= 1 &&
            typeof point.y === 'number' && point.y >= 0 && point.y <= 1 &&
            typeof point.pressure === 'number' && point.pressure >= 0 && point.pressure <= 1 &&
            typeof point.timestamp === 'number'
        );
    }

    /**
     * Render all strokes to the static canvas
     */
    renderAll() {
        if (!this.staticCtx || !this.staticCanvas) {
            return;
        }
        
        // Clear the canvas
        this.staticCtx.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
        
        // Render each stroke
        for (const stroke of this.strokes) {
            this.renderStroke(stroke, this.staticCtx);
        }
    }

    /**
     * Render a single stroke to a canvas context
     * @param {Object} stroke - Stroke to render
     * @param {CanvasRenderingContext2D} ctx - Canvas context to render to
     */
    renderStroke(stroke, ctx) {
        if (!ctx || !stroke || !stroke.points || stroke.points.length === 0) {
            return;
        }
        
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.save();
        
        // Set stroke style
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // For single point, draw a dot
        if (stroke.points.length === 1) {
            const point = stroke.points[0];
            const x = point.x * width;
            const y = point.y * height;
            const radius = (stroke.baseWidth * point.pressure) / 2;
            
            ctx.beginPath();
            ctx.arc(x, y, Math.max(radius, 0.5), 0, Math.PI * 2);
            ctx.fillStyle = stroke.color;
            ctx.fill();
            ctx.restore();
            return;
        }
        
        // Draw stroke with variable width based on pressure
        // Use quadratic curves for smoothness
        for (let i = 0; i < stroke.points.length - 1; i++) {
            const p0 = stroke.points[i];
            const p1 = stroke.points[i + 1];
            
            const x0 = p0.x * width;
            const y0 = p0.y * height;
            const x1 = p1.x * width;
            const y1 = p1.y * height;
            
            // Calculate line width based on average pressure of the two points
            const avgPressure = (p0.pressure + p1.pressure) / 2;
            ctx.lineWidth = stroke.baseWidth * avgPressure;
            
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            
            // Use midpoint for smoother curves when we have enough points
            if (i < stroke.points.length - 2) {
                const p2 = stroke.points[i + 2];
                const midX = (x1 + p2.x * width) / 2;
                const midY = (y1 + p2.y * height) / 2;
                ctx.quadraticCurveTo(x1, y1, midX, midY);
            } else {
                ctx.lineTo(x1, y1);
            }
            
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Clear the active canvas (used during drawing)
     */
    clearActiveCanvas() {
        if (this.activeCtx && this.activeCanvas) {
            this.activeCtx.clearRect(0, 0, this.activeCanvas.width, this.activeCanvas.height);
        }
    }

    /**
     * Get all strokes that intersect with a given point
     * Used for eraser hit testing
     * @param {number} x - X coordinate (normalized 0-1)
     * @param {number} y - Y coordinate (normalized 0-1)
     * @param {number} [tolerance=0.02] - Hit tolerance (normalized, default ~20px at 1000px canvas)
     * @returns {Array<Object>} Array of strokes that intersect with the point
     */
    getStrokesAtPoint(x, y, tolerance = 0.02) {
        const hitStrokes = [];
        
        for (const stroke of this.strokes) {
            if (this.strokeIntersectsPoint(stroke, x, y, tolerance)) {
                hitStrokes.push(stroke);
            }
        }
        
        return hitStrokes;
    }

    /**
     * Check if a stroke intersects with a point
     * @param {Object} stroke - Stroke to check
     * @param {number} x - X coordinate (normalized 0-1)
     * @param {number} y - Y coordinate (normalized 0-1)
     * @param {number} tolerance - Hit tolerance (normalized)
     * @returns {boolean} True if stroke intersects point
     */
    strokeIntersectsPoint(stroke, x, y, tolerance) {
        if (!stroke || !stroke.points || stroke.points.length === 0) {
            return false;
        }
        
        // Check each point in the stroke
        for (const point of stroke.points) {
            const dx = point.x - x;
            const dy = point.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Account for stroke width in tolerance
            const strokeTolerance = tolerance + (stroke.baseWidth / 1000);
            
            if (distance <= strokeTolerance) {
                return true;
            }
        }
        
        // Check line segments between points
        for (let i = 0; i < stroke.points.length - 1; i++) {
            const p0 = stroke.points[i];
            const p1 = stroke.points[i + 1];
            
            if (this.pointToSegmentDistance(x, y, p0.x, p0.y, p1.x, p1.y) <= tolerance) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Calculate distance from a point to a line segment
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {number} x1 - Segment start X
     * @param {number} y1 - Segment start Y
     * @param {number} x2 - Segment end X
     * @param {number} y2 - Segment end Y
     * @returns {number} Distance from point to segment
     */
    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) {
            // Segment is a point
            return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        }
        
        // Project point onto line segment
        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        
        return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    }

    /**
     * Get strokes along a path (for eraser drag)
     * @param {Array<{x: number, y: number}>} path - Array of points along the eraser path
     * @param {number} [tolerance=0.02] - Hit tolerance
     * @returns {Array<Object>} Array of unique strokes that intersect with the path
     */
    getStrokesAlongPath(path, tolerance = 0.02) {
        const hitStrokeIds = new Set();
        const hitStrokes = [];
        
        for (const point of path) {
            const strokes = this.getStrokesAtPoint(point.x, point.y, tolerance);
            for (const stroke of strokes) {
                if (!hitStrokeIds.has(stroke.id)) {
                    hitStrokeIds.add(stroke.id);
                    hitStrokes.push(stroke);
                }
            }
        }
        
        return hitStrokes;
    }
}

// Export the class
export default StrokeManager;
export { generateStrokeId };
