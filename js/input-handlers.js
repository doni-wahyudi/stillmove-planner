/**
 * Input Handlers with Debouncing
 * Provides debounced input handlers for better performance
 */

import { debounce, throttle } from './performance.js';

/**
 * Create a debounced text input handler
 * @param {Function} callback - Function to call with the input value
 * @param {number} delay - Debounce delay in milliseconds (default: 300)
 * @returns {Function} Event handler function
 */
export function createDebouncedTextHandler(callback, delay = 300) {
    const debouncedFn = debounce((value) => {
        callback(value);
    }, delay);
    
    return function(event) {
        const value = event.target.value;
        debouncedFn(value);
    };
}

/**
 * Create a debounced textarea handler
 * @param {Function} callback - Function to call with the textarea value
 * @param {number} delay - Debounce delay in milliseconds (default: 500)
 * @returns {Function} Event handler function
 */
export function createDebouncedTextareaHandler(callback, delay = 500) {
    const debouncedFn = debounce((value) => {
        callback(value);
    }, delay);
    
    return function(event) {
        const value = event.target.value;
        debouncedFn(value);
    };
}

/**
 * Create a throttled scroll handler
 * @param {Function} callback - Function to call on scroll
 * @param {number} limit - Throttle limit in milliseconds (default: 100)
 * @returns {Function} Event handler function
 */
export function createThrottledScrollHandler(callback, limit = 100) {
    return throttle(callback, limit);
}

/**
 * Create a debounced search handler
 * @param {Function} callback - Function to call with search query
 * @param {number} delay - Debounce delay in milliseconds (default: 400)
 * @returns {Function} Event handler function
 */
export function createDebouncedSearchHandler(callback, delay = 400) {
    const debouncedFn = debounce((query) => {
        callback(query);
    }, delay);
    
    return function(event) {
        const query = event.target.value.trim();
        debouncedFn(query);
    };
}

/**
 * Create a debounced number input handler
 * @param {Function} callback - Function to call with the number value
 * @param {number} delay - Debounce delay in milliseconds (default: 300)
 * @returns {Function} Event handler function
 */
export function createDebouncedNumberHandler(callback, delay = 300) {
    const debouncedFn = debounce((value) => {
        callback(value);
    }, delay);
    
    return function(event) {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            debouncedFn(value);
        }
    };
}

/**
 * Create a debounced slider handler
 * @param {Function} callback - Function to call with slider value
 * @param {number} delay - Debounce delay in milliseconds (default: 200)
 * @returns {Function} Event handler function
 */
export function createDebouncedSliderHandler(callback, delay = 200) {
    const debouncedFn = debounce((value) => {
        callback(value);
    }, delay);
    
    return function(event) {
        const value = parseInt(event.target.value);
        debouncedFn(value);
    };
}

/**
 * Create a throttled resize handler
 * @param {Function} callback - Function to call on resize
 * @param {number} limit - Throttle limit in milliseconds (default: 200)
 * @returns {Function} Event handler function
 */
export function createThrottledResizeHandler(callback, limit = 200) {
    return throttle(callback, limit);
}

/**
 * Attach debounced input handler to element
 * @param {HTMLElement} element - Input element
 * @param {Function} callback - Callback function
 * @param {number} delay - Debounce delay
 */
export function attachDebouncedInput(element, callback, delay = 300) {
    if (!element) return;
    
    const handler = createDebouncedTextHandler(callback, delay);
    element.addEventListener('input', handler);
    
    // Return cleanup function
    return () => {
        element.removeEventListener('input', handler);
    };
}

/**
 * Attach debounced textarea handler to element
 * @param {HTMLElement} element - Textarea element
 * @param {Function} callback - Callback function
 * @param {number} delay - Debounce delay
 */
export function attachDebouncedTextarea(element, callback, delay = 500) {
    if (!element) return;
    
    const handler = createDebouncedTextareaHandler(callback, delay);
    element.addEventListener('input', handler);
    
    // Return cleanup function
    return () => {
        element.removeEventListener('input', handler);
    };
}

/**
 * Batch multiple input changes together
 * Useful for forms with multiple fields
 */
export class FormBatcher {
    constructor(callback, delay = 500) {
        this.callback = callback;
        this.delay = delay;
        this.changes = {};
        this.timeout = null;
    }

    /**
     * Record a field change
     */
    recordChange(fieldName, value) {
        this.changes[fieldName] = value;
        this.scheduleFlush();
    }

    /**
     * Schedule batch flush
     */
    scheduleFlush() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        
        this.timeout = setTimeout(() => {
            this.flush();
        }, this.delay);
    }

    /**
     * Flush all changes
     */
    flush() {
        if (Object.keys(this.changes).length > 0) {
            this.callback(this.changes);
            this.changes = {};
        }
    }

    /**
     * Force immediate flush
     */
    forceFlush() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.flush();
    }
}

/**
 * Create a form batcher for a form element
 * @param {HTMLFormElement} form - Form element
 * @param {Function} callback - Callback with all changes
 * @param {number} delay - Batch delay
 */
export function createFormBatcher(form, callback, delay = 500) {
    const batcher = new FormBatcher(callback, delay);
    
    // Attach listeners to all inputs
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const name = e.target.name || e.target.id;
            const value = e.target.value;
            if (name) {
                batcher.recordChange(name, value);
            }
        });
    });
    
    // Flush on form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        batcher.forceFlush();
    });
    
    return batcher;
}
