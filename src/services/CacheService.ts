/**
 * Cache Service - IndexedDB-based caching for offline support
 * Implements cache-first strategy with background sync
 */

const DB_NAME = 'DailyPlannerCache';
const DB_VERSION = 6; // Incremented to 6 to add pomodoro sessions store
const SYNC_KEY = 'stillmove_last_sync';
const CACHE_METADATA_KEY = 'stillmove_cache_metadata';

// Cache TTL (time-to-live) in milliseconds for different data types
export const CACHE_TTL: Record<string, number> = {
  goals: 24 * 60 * 60 * 1000,           // 24 hours - goals change infrequently
  habits: 12 * 60 * 60 * 1000,          // 12 hours - habits are fairly stable
  habitLogs: 5 * 60 * 1000,             // 5 minutes - logs change frequently
  timeBlocks: 5 * 60 * 1000,            // 5 minutes - time blocks change often
  categories: 24 * 60 * 60 * 1000,      // 24 hours - categories rarely change
  readingList: 12 * 60 * 60 * 1000,     // 12 hours
  userProfile: 24 * 60 * 60 * 1000,     // 24 hours
  subProfiles: 24 * 60 * 60 * 1000,     // 24 hours
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
  pomodoroSessions: 5 * 60 * 1000,           // 5 minutes
  default: 10 * 60 * 1000               // 10 minutes default
};

// Store names matching data-service tables
export const STORES = {
  goals: 'goals',
  habits: 'habits',
  habitLogs: 'habit_logs',
  timeBlocks: 'time_blocks',
  categories: 'categories',
  readingList: 'reading_list',
  userProfile: 'user_profile',
  subProfiles: 'sub_profiles',
  pendingSync: 'pending_sync',
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
  challengeCompletions: 'challenge_completions',
  pomodoroSessions: 'pomodoro_sessions'
};

export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  store: string;
  data?: any;
  itemId?: string;
  timestamp: string;
}

export class CacheService {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private cacheMetadata: Record<string, number> = {};

  constructor() {
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
  private loadCacheMetadata(): Record<string, number> {
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
  private saveCacheMetadata(): void {
    try {
      localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(this.cacheMetadata));
    } catch (e) {
      console.warn('[Cache] Failed to save cache metadata:', e);
    }
  }

  /**
   * Check if cache for a store is still fresh
   */
  public isCacheFresh(storeName: string): boolean {
    const lastUpdated = this.cacheMetadata[storeName];
    if (!lastUpdated) return false;

    const ttl = CACHE_TTL[storeName] || CACHE_TTL.default;
    const age = Date.now() - lastUpdated;

    return age < ttl;
  }

  /**
   * Get cache age in human-readable format
   */
  public getCacheAge(storeName: string): string {
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
   */
  public markCacheUpdated(storeName: string): void {
    this.cacheMetadata[storeName] = Date.now();
    this.saveCacheMetadata();
  }

  /**
   * Invalidate cache for a store
   */
  public invalidateCache(storeName: string): void {
    delete this.cacheMetadata[storeName];
    this.saveCacheMetadata();
  }

  /**
   * Invalidate all caches
   */
  public invalidateAllCaches(): void {
    this.cacheMetadata = {};
    this.saveCacheMetadata();
  }

  /**
   * Force refresh data from server if online
   */
  public async forceRefresh(storeName: string): Promise<boolean> {
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
  public async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

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

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;

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
  public async getAll(storeName: string): Promise<any[]> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(storeName)) {
          console.warn(`[Cache] Store '${storeName}' not found, reinitializing database...`);
          this.db = null;
          this.init().then((newDb) => {
            if (newDb.objectStoreNames.contains(storeName)) {
              const transaction = newDb.transaction(storeName, 'readonly');
              const store = transaction.objectStore(storeName);
              const request = store.getAll();
              request.onsuccess = () => {
                let result = request.result || [];
                if (storeName !== STORES.subProfiles && storeName !== STORES.userProfile && storeName !== STORES.pendingSync) {
                  const activeProfileId = localStorage.getItem('stillmove_active_profile_id');
                  if (activeProfileId) {
                    result = result.filter((item: any) => item.profile_id === activeProfileId);
                  }
                }
                resolve(result);
              };
              request.onerror = () => reject(request.error);
            } else {
              console.warn(`[Cache] Store '${storeName}' still not found after reinit, returning empty array`);
              resolve([]);
            }
          }).catch(reject);
          return;
        }

        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          let result = request.result || [];
          if (storeName !== STORES.subProfiles && storeName !== STORES.userProfile && storeName !== STORES.pendingSync) {
            const activeProfileId = localStorage.getItem('stillmove_active_profile_id');
            if (activeProfileId) {
              result = result.filter((item: any) => item.profile_id === activeProfileId);
            }
          }
          resolve(result);
        };
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`[Cache] Error in getAll for ${storeName}:`, error);
        this.db = null;
        resolve([]);
      }
    });
  }

  /**
   * Get a single item by ID
   */
  public async get(storeName: string, id: string): Promise<any | null> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(storeName)) {
          console.warn(`[Cache] Store '${storeName}' not found in get, returning null`);
          resolve(null);
          return;
        }

        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
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
  public async put(storeName: string, item: any): Promise<any> {
    const db = await this.init();

    // Auto-inject active profile ID if not a global store and not present
    if (item && !item.profile_id && storeName !== STORES.subProfiles && storeName !== STORES.userProfile && storeName !== STORES.pendingSync) {
      const activeProfileId = localStorage.getItem('stillmove_active_profile_id');
      if (activeProfileId) {
        item.profile_id = activeProfileId;
      }
    }

    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(storeName)) {
          console.warn(`[Cache] Store '${storeName}' not found in put, skipping`);
          resolve(null);
          return;
        }

        const transaction = db.transaction(storeName, 'readwrite');
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
  public async putAll(storeName: string, items: any[]): Promise<void> {
    const db = await this.init();
    if (!items || items.length === 0) return;

    // Inject active profile ID
    const activeProfileId = localStorage.getItem('stillmove_active_profile_id');
    if (activeProfileId && storeName !== STORES.subProfiles && storeName !== STORES.userProfile && storeName !== STORES.pendingSync) {
      items.forEach(item => {
        if (item && !item.profile_id) {
          item.profile_id = activeProfileId;
        }
      });
    }

    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(storeName)) {
          console.warn(`[Cache] Store '${storeName}' not found in putAll, skipping`);
          resolve();
          return;
        }

        const transaction = db.transaction(storeName, 'readwrite');
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
  public async delete(storeName: string, id: string): Promise<void> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve();
        return;
      }
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear a store
   */
  public async clear(storeName: string): Promise<void> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve();
        return;
      }
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add operation to pending sync queue
   */
  public async addPendingSync(operation: Omit<PendingOperation, 'id' | 'timestamp'>): Promise<PendingOperation> {
    const pending: PendingOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      ...operation,
      timestamp: new Date().toISOString()
    };
    await this.put(STORES.pendingSync, pending);
    return pending;
  }

  /**
   * Get all pending sync operations
   */
  public async getPendingSync(): Promise<PendingOperation[]> {
    return this.getAll(STORES.pendingSync);
  }

  /**
   * Remove a pending sync operation
   */
  public async removePendingSync(id: string): Promise<void> {
    return this.delete(STORES.pendingSync, id);
  }

  /**
   * Get last sync timestamp
   */
  public getLastSync(): string | null {
    return localStorage.getItem(SYNC_KEY);
  }

  /**
   * Set last sync timestamp
   */
  public setLastSync(timestamp: string): void {
    localStorage.setItem(SYNC_KEY, timestamp);
  }

  /**
   * Handle coming online
   */
  private handleOnline(): void {
    console.log('[Cache] Back online');
    this.isOnline = true;
    this.syncWithServer();
  }

  /**
   * Handle going offline
   */
  private handleOffline(): void {
    console.log('[Cache] Gone offline');
    this.isOnline = false;
  }

  /**
   * Sync pending changes with server
   */
  public async syncWithServer(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    console.log('[Cache] Starting sync...');

    try {
      const pending = await this.getPendingSync();

      if (pending.length > 0) {
        console.log(`[Cache] Processing ${pending.length} pending operations`);

        // Import DataService dynamically to avoid circular dependency
        const { default: dataService } = await import('./DataService');

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
  private async processPendingOperation(dataService: any, op: PendingOperation): Promise<void> {
    const { type, store, data, itemId } = op;

    switch (type) {
      case 'create':
        await dataService.createDirect(store, data);
        break;
      case 'update':
        if (!itemId) throw new Error('itemId required for update operation');
        await dataService.updateDirect(store, itemId, data);
        break;
      case 'delete':
        if (!itemId) throw new Error('itemId required for delete operation');
        await dataService.deleteDirect(store, itemId);
        break;
      default:
        console.warn('[Cache] Unknown operation type:', type);
    }
  }

  /**
   * Check if we're online
   */
  public get online(): boolean {
    return this.isOnline;
  }
}

// Export singleton
const cacheService = new CacheService();
export default cacheService;
