/**
 * Auto-Save Manager
 * Provides debounced auto-save functionality for text inputs
 * Prevents excessive API calls while ensuring data is saved
 */

import { debounce } from './performance.js';

/**
 * AutoSaveManager - Manages debounced auto-save for form inputs
 */
export class AutoSaveManager {
    constructor(options = {}) {
        this.delay = options.delay || 500; // Default 500ms debounce
        this.onSave = options.onSave || (() => {});
        this.onError = options.onError || console.error;
        this.showIndicator = options.showIndicator !== false;
        
        this.pendingSaves = new Map();
        this.saveHandlers = new Map();
        this.indicators = new Map();
        
        // Status tracking
        this.status = 'idle'; // idle, saving, saved, error
    }

    /**
     * Register an input element for auto-save
     * @param {HTMLElement} element - Input or textarea element
     * @param {string} key - Unique key for this input
     * @param {Function} saveCallback - Async function to save the value
     * @param {Object} options - Additional options
     */
    register(element, key, saveCallback, options = {}) {
        if (!element) return;
        
        const delay = options.delay || this.delay;
        
        // Create debounced save handler
        const debouncedSave = debounce(async (value) => {
            await this.performSave(key, value, saveCallback);
        }, delay);
        
        // Input handler
        const inputHandler = (e) => {
            const value = e.target.value;
            this.pendingSaves.set(key, value);
            this.updateIndicator(element, 'pending');
            debouncedSave(value);
        };
        
        // Blur handler - save immediately on blur
        const blurHandler = async (e) => {
            if (this.pendingSaves.has(key)) {
                const value = this.pendingSaves.get(key);
                await this.performSave(key, value, saveCallback);
            }
        };
        
        // Attach listeners
        element.addEventListener('input', inputHandler);
        element.addEventListener('blur', blurHandler);
        
        // Store handlers for cleanup
        this.saveHandlers.set(key, {
            element,
            inputHandler,
            blurHandler,
            saveCallback
        });
        
        // Create indicator if enabled
        if (this.showIndicator) {
            this.createIndicator(element, key);
        }
        
        return () => this.unregister(key);
    }

    /**
     * Perform the actual save operation
     */
    async performSave(key, value, saveCallback) {
        this.status = 'saving';
        const handler = this.saveHandlers.get(key);
        
        try {
            this.updateIndicator(handler?.element, 'saving');
            await saveCallback(value);
            this.pendingSaves.delete(key);
            this.status = 'saved';
            this.updateIndicator(handler?.element, 'saved');
            
            // Reset to idle after showing saved status
            setTimeout(() => {
                if (this.status === 'saved') {
                    this.updateIndicator(handler?.element, 'idle');
                }
            }, 1500);
            
        } catch (error) {
            this.status = 'error';
            this.updateIndicator(handler?.element, 'error');
            this.onError(error, key);
        }
    }

    /**
     * Create save indicator element
     */
    createIndicator(element, key) {
        if (!element || !element.parentElement) return;
        
        const indicator = document.createElement('span');
        indicator.className = 'auto-save-indicator';
        indicator.setAttribute('aria-live', 'polite');
        indicator.style.cssText = `
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.75rem;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
        `;
        
        // Ensure parent has relative positioning
        const parent = element.parentElement;
        if (getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }
        
        parent.appendChild(indicator);
        this.indicators.set(key, indicator);
    }

    /**
     * Update indicator status
     */
    updateIndicator(element, status) {
        if (!element) return;
        
        // Find indicator for this element
        let indicator = null;
        for (const [key, handler] of this.saveHandlers.entries()) {
            if (handler.element === element) {
                indicator = this.indicators.get(key);
                break;
            }
        }
        
        if (!indicator) return;
        
        switch (status) {
            case 'pending':
                indicator.textContent = '•';
                indicator.style.color = 'var(--text-muted)';
                indicator.style.opacity = '1';
                break;
            case 'saving':
                indicator.textContent = '⟳';
                indicator.style.color = 'var(--accent-primary)';
                indicator.style.opacity = '1';
                break;
            case 'saved':
                indicator.textContent = '✓';
                indicator.style.color = '#22c55e';
                indicator.style.opacity = '1';
                break;
            case 'error':
                indicator.textContent = '✗';
                indicator.style.color = '#ef4444';
                indicator.style.opacity = '1';
                break;
            case 'idle':
            default:
                indicator.style.opacity = '0';
                break;
        }
    }

    /**
     * Unregister an input element
     */
    unregister(key) {
        const handler = this.saveHandlers.get(key);
        if (handler) {
            handler.element.removeEventListener('input', handler.inputHandler);
            handler.element.removeEventListener('blur', handler.blurHandler);
            this.saveHandlers.delete(key);
        }
        
        const indicator = this.indicators.get(key);
        if (indicator) {
            indicator.remove();
            this.indicators.delete(key);
        }
        
        this.pendingSaves.delete(key);
    }

    /**
     * Save all pending changes immediately
     */
    async saveAll() {
        const promises = [];
        
        for (const [key, value] of this.pendingSaves.entries()) {
            const handler = this.saveHandlers.get(key);
            if (handler) {
                promises.push(this.performSave(key, value, handler.saveCallback));
            }
        }
        
        await Promise.all(promises);
    }

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        return this.pendingSaves.size > 0;
    }

    /**
     * Get list of pending save keys
     */
    getPendingKeys() {
        return Array.from(this.pendingSaves.keys());
    }

    /**
     * Cleanup all handlers
     */
    destroy() {
        for (const key of this.saveHandlers.keys()) {
            this.unregister(key);
        }
    }
}

/**
 * Create a simple debounced auto-save function
 * @param {Function} saveCallback - Async save function
 * @param {number} delay - Debounce delay in ms
 * @returns {Function} Debounced save function
 */
export function createAutoSave(saveCallback, delay = 500) {
    return debounce(async (value) => {
        try {
            await saveCallback(value);
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }, delay);
}

/**
 * Attach auto-save to a text input
 * @param {HTMLElement} input - Input element
 * @param {Function} saveCallback - Save function
 * @param {number} delay - Debounce delay
 * @returns {Function} Cleanup function
 */
export function attachAutoSave(input, saveCallback, delay = 500) {
    if (!input) return () => {};
    
    const autoSave = createAutoSave(saveCallback, delay);
    
    const handler = (e) => {
        autoSave(e.target.value);
    };
    
    input.addEventListener('input', handler);
    
    // Save on blur immediately
    const blurHandler = async (e) => {
        try {
            await saveCallback(e.target.value);
        } catch (error) {
            console.error('Save on blur failed:', error);
        }
    };
    
    input.addEventListener('blur', blurHandler);
    
    return () => {
        input.removeEventListener('input', handler);
        input.removeEventListener('blur', blurHandler);
    };
}

// Export singleton instance
export const autoSaveManager = new AutoSaveManager();

export default AutoSaveManager;
