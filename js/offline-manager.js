/**
 * OfflineManager - Handles offline support and operation queuing
 * Manages online/offline detection and syncs queued operations when online
 */

class OfflineManager {
    constructor() {
        this.queue = this.loadQueue();
        // Check if navigator exists and has onLine property
        if (typeof navigator !== 'undefined' && typeof navigator.onLine !== 'undefined') {
            this.isOnline = navigator.onLine;
        } else {
            this.isOnline = true; // Default to online
        }
        this.listeners = [];
        
        // Setup online/offline event listeners (only in browser)
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.handleOnline());
            window.addEventListener('offline', () => this.handleOffline());
        }
    }

    /**
     * Load queue from localStorage
     * @returns {Array} Array of queued operations
     */
    loadQueue() {
        try {
            // Check if localStorage is available (browser environment)
            if (typeof localStorage === 'undefined') {
                return [];
            }
            const stored = localStorage.getItem('offlineQueue');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load offline queue:', error);
            return [];
        }
    }

    /**
     * Save queue to localStorage
     */
    saveQueue() {
        try {
            // Check if localStorage is available (browser environment)
            if (typeof localStorage === 'undefined') {
                return;
            }
            localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
        } catch (error) {
            console.error('Failed to save offline queue:', error);
        }
    }

    /**
     * Add operation to queue
     * @param {Object} operation - Operation object with table, action, data
     */
    addToQueue(operation) {
        this.queue.push({
            ...operation,
            timestamp: new Date().toISOString(),
            id: this.generateOperationId()
        });
        this.saveQueue();
    }

    /**
     * Generate unique operation ID
     * @returns {string} Unique ID
     */
    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get current queue
     * @returns {Array} Array of queued operations
     */
    getQueue() {
        return [...this.queue];
    }

    /**
     * Get queue length
     * @returns {number} Number of operations in queue
     */
    getQueueLength() {
        return this.queue.length;
    }

    /**
     * Clear the queue
     */
    clearQueue() {
        this.queue = [];
        this.saveQueue();
    }

    /**
     * Check if online
     * @returns {boolean} True if online
     */
    isOnlineStatus() {
        return this.isOnline;
    }

    /**
     * Handle online event
     */
    async handleOnline() {
        console.log('Application is now online');
        this.isOnline = true;
        this.notifyListeners('online');
        
        // Process queued operations
        if (this.queue.length > 0) {
            console.log(`Processing ${this.queue.length} queued operations...`);
            await this.processQueue();
        }
    }

    /**
     * Handle offline event
     */
    handleOffline() {
        console.log('Application is now offline');
        this.isOnline = false;
        this.notifyListeners('offline');
    }

    /**
     * Process all queued operations
     * @returns {Promise<Object>} Result with success and failure counts
     */
    async processQueue() {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Process operations in order
        while (this.queue.length > 0 && this.isOnline) {
            const operation = this.queue[0];
            
            try {
                await this.executeOperation(operation);
                this.queue.shift(); // Remove from queue on success
                this.saveQueue();
                results.success++;
            } catch (error) {
                console.error('Failed to process queued operation:', error);
                results.failed++;
                results.errors.push({
                    operation,
                    error: error.message
                });
                
                // Stop processing on error to maintain order
                break;
            }
        }

        console.log(`Queue processing complete: ${results.success} succeeded, ${results.failed} failed`);
        return results;
    }

    /**
     * Execute a single operation
     * @param {Object} operation - Operation to execute
     * @returns {Promise<any>} Result of operation
     */
    async executeOperation(operation) {
        const { table, action, data } = operation;
        
        // Import supabase client dynamically to avoid circular dependencies
        const { default: getSupabaseClient } = await import('./supabase-client.js');
        const supabase = getSupabaseClient();

        switch (action) {
            case 'insert':
                const { data: insertData, error: insertError } = await supabase
                    .from(table)
                    .insert([data]);
                if (insertError) throw insertError;
                return insertData;

            case 'update':
                const { data: updateData, error: updateError } = await supabase
                    .from(table)
                    .update(data)
                    .eq('id', data.id);
                if (updateError) throw updateError;
                return updateData;

            case 'delete':
                const { error: deleteError } = await supabase
                    .from(table)
                    .delete()
                    .eq('id', data.id);
                if (deleteError) throw deleteError;
                return null;

            case 'upsert':
                const { data: upsertData, error: upsertError } = await supabase
                    .from(table)
                    .upsert([data]);
                if (upsertError) throw upsertError;
                return upsertData;

            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    /**
     * Add listener for online/offline events
     * @param {Function} callback - Callback function
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Remove listener
     * @param {Function} callback - Callback function to remove
     */
    removeListener(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    /**
     * Notify all listeners
     * @param {string} event - Event type ('online' or 'offline')
     */
    notifyListeners(event) {
        this.listeners.forEach(callback => {
            try {
                callback(event, this.isOnline);
            } catch (error) {
                console.error('Error in offline manager listener:', error);
            }
        });
    }

    /**
     * Cleanup - remove event listeners
     */
    cleanup() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnline);
            window.removeEventListener('offline', this.handleOffline);
        }
        this.listeners = [];
    }
}

// Create and export singleton instance
const offlineManager = new OfflineManager();
export default offlineManager;

// Also export the class for testing
export { OfflineManager };
