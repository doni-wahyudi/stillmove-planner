/**
 * Cache Service - IndexedDB-based caching for offline support
 * Implements cache-first strategy with background sync
 */

const DB_NAME = 'DailyPlannerCache';
const DB_VERSION = 2;
const SYNC_KEY = 'stillmove_last_sync';

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
  waterEntries: 'water_entries'
};

class CacheService {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    
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
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a single item by ID
   */
  async get(storeName, id) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Put an item (insert or update)
   */
  async put(storeName, item) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Put multiple items
   */
  async putAll(storeName, items) {
    if (!this.db) await this.init();
    if (!items || items.length === 0) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      items.forEach((item) => {
        if (item && item.id) {
          store.put(item);
        }
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
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
export { STORES };
