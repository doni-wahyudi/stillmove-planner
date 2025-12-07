/**
 * SyncManager - Handles real-time data synchronization with Supabase
 * Manages subscriptions to database changes and updates local state
 */

class SyncManager {
    constructor(supabaseClient = null) {
        this.supabase = supabaseClient;
        this.subscriptions = [];
        this.changeHandlers = new Map();
    }

    /**
     * Subscribe to real-time changes for a specific table
     * @param {string} table - Table name to subscribe to
     * @param {Function} onChange - Callback function for changes
     * @returns {Object} Subscription object
     */
    subscribeToTable(table, onChange) {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        const channel = this.supabase
            .channel(`${table}_changes`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: table
                },
                (payload) => {
                    this.handleChange(table, payload, onChange);
                }
            )
            .subscribe();

        this.subscriptions.push({ table, channel });
        return channel;
    }

    /**
     * Handle database change events
     * @param {string} table - Table name
     * @param {Object} payload - Change payload from Supabase
     * @param {Function} onChange - Callback function
     */
    handleChange(table, payload, onChange) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        // Call the onChange handler with the change details
        if (onChange && typeof onChange === 'function') {
            onChange({
                table,
                eventType,
                newRecord,
                oldRecord
            });
        }

        // Store the change for testing purposes
        if (!this.changeHandlers.has(table)) {
            this.changeHandlers.set(table, []);
        }
        this.changeHandlers.get(table).push({
            eventType,
            newRecord,
            oldRecord,
            timestamp: new Date()
        });
    }

    /**
     * Get all changes received for a table
     * @param {string} table - Table name
     * @returns {Array} Array of changes
     */
    getChangesForTable(table) {
        return this.changeHandlers.get(table) || [];
    }

    /**
     * Clear all recorded changes
     */
    clearChanges() {
        this.changeHandlers.clear();
    }

    /**
     * Unsubscribe from a specific table
     * @param {string} table - Table name
     */
    unsubscribeFromTable(table) {
        const subscription = this.subscriptions.find(sub => sub.table === table);
        if (subscription) {
            subscription.channel.unsubscribe();
            this.subscriptions = this.subscriptions.filter(sub => sub.table !== table);
            this.changeHandlers.delete(table);
        }
    }

    /**
     * Unsubscribe from all tables
     */
    unsubscribeAll() {
        this.subscriptions.forEach(sub => {
            sub.channel.unsubscribe();
        });
        this.subscriptions = [];
        this.changeHandlers.clear();
    }

    /**
     * Check if subscribed to a table
     * @param {string} table - Table name
     * @returns {boolean} True if subscribed
     */
    isSubscribedTo(table) {
        return this.subscriptions.some(sub => sub.table === table);
    }

    /**
     * Get count of active subscriptions
     * @returns {number} Number of active subscriptions
     */
    getSubscriptionCount() {
        return this.subscriptions.length;
    }
}

export default SyncManager;
