/**
 * Cache Service - IndexedDB-based caching for offline support
 * Implements cache-first strategy with background sync
 */

const DB_NAME = 'DailyPlannerCache';
const DB_VERSION = 4; // Incremented to add kanban card enhancement stores (checklist, attachments, comments, activity log)
const SYNC_KEY = 'stillmove_last_sync';
const CACHE_METADATA_KEY = 'stillmove_cache_metadata';

// Cache TTL (time-to-live) in milliseconds for different data types
const CACHE_TTL = {
  goals: 24 * 60 * 60 * 1000,           // 24 hours - goals change infrequently
  habits: 12 * 60 * 60 * 1000,          // 12 hours - habits are fairly stable
  habitLogs: 5 * 60 * 1000,             // 5 minutes - logs change frequently
  timeBlocks: 5 * 60 * 1000,            // 5 minutes - time blocks change often
  categories: 24 * 60 * 60 * 1000,      // 24 hours - categories rarely change
  readingList: 12 * 60 * 60 * 1000,     // 12 hours
  userProfile: 24 * 60 * 60 * 1000,     // 24 hours
  weeklyGoals: 12 * 60 * 60 * 1000,     // 12 hours
  weeklyHabits: 12 * 60 * 60 * 1000,    // 12 hours
  weeklyHabitLogs: 5 * 60 * 1000,       // 5 minutes
  monthlyData: 30 * 60 * 1000,          // 30 minutes
  dailyEntries: 5 * 60 * 1000,          // 5 minutes
  actionPlans: 30 * 60 * 1000,          // 30 minutes
  moodEntries: 5 * 60 * 1000,           // 5 minutes
  sleepEntries: 5 * 60 * 1000,          // 5 minutes
  waterEntries: 5 * 60 * 1000,          // 5 minutes
  calendarEvents: 5 * 60 * 1000,        // 5 minutes - calendar events
  canvasDocuments: 30 * 60 * 1000,      // 30 minutes - canvas documents
  kanbanBoards: 30 * 60 * 1000,         // 30 minutes - kanban boards
  kanbanColumns: 30 * 60 * 1000,        // 30 minutes - kanban columns
  kanbanCards: 5 * 60 * 1000,           // 5 minutes - kanban cards change frequently
  checklistItems: 5 * 60 * 1000,        // 5 minutes - checklist items change frequently
  attachments: 30 * 60 * 1000,          // 30 minutes - attachment metadata only
  comments: 5 * 60 * 1000,              // 5 minutes - comments change frequently
  activityLog: 5 * 60 * 1000,           // 5 minutes - activity log entries
  intervalChallenges: 12 * 60 * 60 * 1000, // 12 hours
  challengeHabits: 12 * 60 * 60 * 1000,    // 12 hours
  challengeCompletions: 5 * 60 * 1000,      // 5 minutes
  default: 10 * 60 * 1000               // 10 minutes default
};

// Store names matching data-service tables
const STORES = {
  goals: 'goals',
  habits: 'habits',
  habitLogs: 'habit_logs',
  timeBlocks: 'time_blocks',
  categories: 'categories',
  readingList: 'reading_list',
  userProfile: 'user_profile',
  pendingSync: 'pending_sync',
  // Additional stores
  weeklyGoals: 'weekly_goals',
  weeklyHabits: 'weekly_habits',
  weeklyHabitLogs: 'weekly_habit_logs',
  monthlyData: 'monthly_data',
  dailyEntries: 'daily_entries',
  actionPlans: 'action_plans',
  moodEntries: 'mood_entries',
  sleepEntries: 'sleep_entries',
  waterEntries: 'water_entries',
  calendarEvents: 'calendar_events',
  canvasDocuments: 'canvas_documents',
  kanbanBoards: 'kanban_boards',
  kanbanColumns: 'kanban_columns',
  kanbanCards: 'kanban_cards',
  checklistItems: 'checklist_items',
  attachments: 'attachments',           // Metadata only, not file contents
  comments: 'comments',
  activityLog: 'activity_log',
  intervalChallenges: 'interval_challenges',
  challengeHabits: 'challenge_habits',
  challengeCompletions: 'challenge_completions'
};

class CacheService {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.cacheMetadata = this.loadCacheMetadata();

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_REQUIRED') {
          this.syncWithServer();
        }
      });
    }
  }

  /**
   * Load cache metadata from localStorage
   */
  loadCacheMetadata() {
    try {
      const stored = localStorage.getItem(CACHE_METADATA_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn('[Cache] Failed to load cache metadata:', e);
      return {};
    }
  }

  /**
   * Save cache metadata to localStorage
   */
  saveCacheMetadata() {
    try {
      localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(this.cacheMetadata));
    } catch (e) {
      console.warn('[Cache] Failed to save cache metadata:', e);
    }
  }

  /**
   * Check if cache for a store is still fresh
   * @param {string} storeName - Name of the store
   * @returns {boolean} True if cache is fresh, false if stale
   */
  isCacheFresh(storeName) {
    const lastUpdated = this.cacheMetadata[storeName];
    if (!lastUpdated) return false;

    const ttl = CACHE_TTL[storeName] || CACHE_TTL.default;
    const age = Date.now() - lastUpdated;

    return age < ttl;
  }

  /**
   * Get cache age in human-readable format
   * @param {string} storeName - Name of the store
   * @returns {string} Human-readable age string
   */
  getCacheAge(storeName) {
    const lastUpdated = this.cacheMetadata[storeName];
    if (!lastUpdated) return 'never cached';

    const age = Date.now() - lastUpdated;
    const minutes = Math.floor(age / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  /**
   * Mark cache as updated for a store
   * @param {string} storeName - Name of the store
   */
  markCacheUpdated(storeName) {
    this.cacheMetadata[storeName] = Date.now();
    this.saveCacheMetadata();
  }

  /**
   * Invalidate cache for a store
   * @param {string} storeName - Name of the store
   */
  invalidateCache(storeName) {
    delete this.cacheMetadata[storeName];
    this.saveCacheMetadata();
  }

  /**
   * Invalidate all caches
   */
  invalidateAllCaches() {
    this.cacheMetadata = {};
    this.saveCacheMetadata();
  }

  /**
   * Force refresh data from server if online
   * @param {string} storeName - Name of the store to refresh
   * @returns {boolean} True if refresh was triggered
   */
  async forceRefresh(storeName) {
    if (!this.isOnline) {
      console.log('[Cache] Cannot force refresh while offline');
      return false;
    }

    this.invalidateCache(storeName);
    console.log(`[Cache] Force refresh triggered for ${storeName}`);
    return true;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[Cache] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[Cache] IndexedDB initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores for each data type
        Object.values(STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('updated_at', 'updated_at', { unique: false });
            console.log(`[Cache] Created store: ${storeName}`);
          }
        });
      };
    });
  }

  /**
   * Get all items from a store
   */
  async getAll(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      try {
        // Check if the store exists before creating transaction
        if (!this.db.objectStoreNames.contains(storeName)) {
          console.warn(`[Cache] Store '${storeName}' not found, reinitializing database...`);
          // Close current connection and reinitialize
          this.db.close();
          this.db = null;
          this.init().then(() => {
            // Retry after reinit
            if (this.db.objectStoreNames.contains(storeName)) {
              const transaction = this.db.transaction(storeName, 'readonly');
              const store = transaction.objectStore(storeName);
              const request = store.getAll();
              request.onsuccess = () => resolve(request.result || []);
              request.onerror = () => reject(request.error);
            } else {
              // Store still doesn't exist, return empty array
              console.warn(`[Cache] Store '${storeName}' still not found after reinit, returning empty array`);
              resolve([]);
            }
          }).catch(reject);
          return;
        }

        const transaction = this.db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`[Cache] Error in getAll for ${storeName}:`, error);
        // If there's an error, try to reinitialize and return empty
        this.db = null;
        resolve([]);
      }
    });
  }

  /**
   * Get a single item by ID
   */
  async get(storeName, id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      try {
        // Check if the store exists
        if (!this.db.objectStoreNames.contains(storeName)) {
          console.warn(`[Cache] Store '${storeName}' not found in get, returning null`);
          resolve(null);
          return;
        }

        const transaction = this.db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`[Cache] Error in get for ${storeName}:`, error);
        resolve(null);
      }
    });
  }

  /**
   * Put an item (insert or update)
   */
  async put(storeName, item) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      try {
        if (!this.db.objectStoreNames.contains(storeName)) {
          console.warn(`[Cache] Store '${storeName}' not found in put, skipping`);
          resolve(null);
          return;
        }

        const transaction = this.db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`[Cache] Error in put for ${storeName}:`, error);
        resolve(null);
      }
    });
  }

  /**
   * Put multiple items
   */
  async putAll(storeName, items) {
    if (!this.db) await this.init();
    if (!items || items.length === 0) return;

    return new Promise((resolve, reject) => {
      try {
        if (!this.db.objectStoreNames.contains(storeName)) {
          console.warn(`[Cache] Store '${storeName}' not found in putAll, skipping`);
          resolve();
          return;
        }

        const transaction = this.db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        items.forEach((item) => {
          if (item && item.id) {
            store.put(item);
          }
        });

        transaction.oncomplete = () => {
          this.markCacheUpdated(storeName);
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      } catch (error) {
        console.error(`[Cache] Error in putAll for ${storeName}:`, error);
        resolve();
      }
    });
  }

  /**
   * Delete an item
   */
  async delete(storeName, id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear a store
   */
  async clear(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add operation to pending sync queue
   */
  async addPendingSync(operation) {
    const pending = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...operation,
      timestamp: new Date().toISOString()
    };
    await this.put(STORES.pendingSync, pending);
    return pending;
  }

  /**
   * Get all pending sync operations
   */
  async getPendingSync() {
    return this.getAll(STORES.pendingSync);
  }

  /**
   * Remove a pending sync operation
   */
  async removePendingSync(id) {
    return this.delete(STORES.pendingSync, id);
  }

  /**
   * Get last sync timestamp
   */
  getLastSync() {
    return localStorage.getItem(SYNC_KEY);
  }

  /**
   * Set last sync timestamp
   */
  setLastSync(timestamp) {
    localStorage.setItem(SYNC_KEY, timestamp);
  }

  /**
   * Handle coming online
   */
  handleOnline() {
    console.log('[Cache] Back online');
    this.isOnline = true;
    this.syncWithServer();

    if (window.Toast) {
      window.Toast.success('Back online - syncing data...');
    }
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    console.log('[Cache] Gone offline');
    this.isOnline = false;

    if (window.Toast) {
      window.Toast.warning('You are offline. Changes will sync when back online.');
    }
  }

  /**
   * Sync pending changes with server
   */
  async syncWithServer() {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    console.log('[Cache] Starting sync...');

    try {
      const pending = await this.getPendingSync();

      if (pending.length > 0) {
        console.log(`[Cache] Processing ${pending.length} pending operations`);

        // Import dataService dynamically to avoid circular dependency
        const { default: dataService } = await import('./data-service.js');

        for (const op of pending) {
          try {
            await this.processPendingOperation(dataService, op);
            await this.removePendingSync(op.id);
          } catch (error) {
            console.error('[Cache] Failed to sync operation:', op, error);
            // Keep in queue for retry
          }
        }
      }

      this.setLastSync(new Date().toISOString());
      console.log('[Cache] Sync complete');
    } catch (error) {
      console.error('[Cache] Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process a single pending operation
   */
  async processPendingOperation(dataService, op) {
    const { type, store, data, itemId } = op;

    switch (type) {
      case 'create':
        await dataService.createDirect(store, data);
        break;
      case 'update':
        await dataService.updateDirect(store, itemId, data);
        break;
      case 'delete':
        await dataService.deleteDirect(store, itemId);
        break;
      default:
        console.warn('[Cache] Unknown operation type:', type);
    }
  }

  /**
   * Check if we're online
   */
  get online() {
    return this.isOnline;
  }
}

// Export singleton
const cacheService = new CacheService();
export default cacheService;
export { STORES, CACHE_TTL };
