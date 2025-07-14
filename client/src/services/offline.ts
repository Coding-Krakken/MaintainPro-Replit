import { OfflineAction, NetworkStatus } from '../types';
import { LOCAL_STORAGE_KEYS, OFFLINE_CONFIG } from '../utils/constants';

class OfflineService {
  private static instance: OfflineService;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  private setupEventListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Monitor network connection quality
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', this.handleConnectionChange.bind(this));
    }
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.syncOfflineActions();
    this.notifyNetworkStatusChange();
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.notifyNetworkStatusChange();
  }

  private handleConnectionChange(): void {
    this.notifyNetworkStatusChange();
  }

  private notifyNetworkStatusChange(): void {
    const event = new CustomEvent('networkStatusChange', {
      detail: this.getNetworkStatus(),
    });
    window.dispatchEvent(event);
  }

  getNetworkStatus(): NetworkStatus {
    const connection = (navigator as any).connection;
    
    return {
      isOnline: this.isOnline,
      isSlowConnection: connection ? connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' : false,
      effectiveType: connection?.effectiveType,
    };
  }

  // Queue an action for offline sync
  queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced'>): void {
    const offlineAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      synced: false,
    };

    const actions = this.getOfflineActions();
    actions.push(offlineAction);

    // Limit the number of stored actions
    if (actions.length > OFFLINE_CONFIG.MAX_OFFLINE_ACTIONS) {
      actions.splice(0, actions.length - OFFLINE_CONFIG.MAX_OFFLINE_ACTIONS);
    }

    this.saveOfflineActions(actions);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncOfflineActions();
    }
  }

  private getOfflineActions(): OfflineAction[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.OFFLINE_ACTIONS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveOfflineActions(actions: OfflineAction[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.OFFLINE_ACTIONS, JSON.stringify(actions));
    } catch (error) {
      console.error('Failed to save offline actions:', error);
    }
  }

  private async syncOfflineActions(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    const actions = this.getOfflineActions();
    const unsyncedActions = actions.filter(action => !action.synced);

    if (unsyncedActions.length === 0) {
      this.syncInProgress = false;
      return;
    }

    console.log(`Syncing ${unsyncedActions.length} offline actions...`);

    for (const action of unsyncedActions) {
      try {
        await this.syncSingleAction(action);
        
        // Mark as synced
        action.synced = true;
        this.saveOfflineActions(actions);
        
        // Clear any retry timeout
        const timeoutId = this.retryTimeouts.get(action.id);
        if (timeoutId) {
          clearTimeout(timeoutId);
          this.retryTimeouts.delete(action.id);
        }
        
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error);
        this.scheduleRetry(action);
      }
    }

    // Clean up synced actions
    const remainingActions = actions.filter(action => !action.synced);
    this.saveOfflineActions(remainingActions);

    this.syncInProgress = false;
    this.updateLastSyncTime();

    // Notify about sync completion
    const event = new CustomEvent('offlineSyncComplete', {
      detail: {
        syncedCount: unsyncedActions.length - remainingActions.length,
        failedCount: remainingActions.length,
      },
    });
    window.dispatchEvent(event);
  }

  private async syncSingleAction(action: OfflineAction): Promise<void> {
    const { type, table, data } = action;
    
    let url: string;
    let method: string;
    let body: any = data;

    switch (type) {
      case 'create':
        url = `/api/${this.getApiEndpoint(table)}`;
        method = 'POST';
        break;
      case 'update':
        url = `/api/${this.getApiEndpoint(table)}/${data.id}`;
        method = 'PATCH';
        break;
      case 'delete':
        url = `/api/${this.getApiEndpoint(table)}/${data.id}`;
        method = 'DELETE';
        body = undefined;
        break;
      default:
        throw new Error(`Unknown action type: ${type}`);
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': localStorage.getItem(LOCAL_STORAGE_KEYS.USER_ID) || '',
        'x-warehouse-id': localStorage.getItem(LOCAL_STORAGE_KEYS.WAREHOUSE_ID) || '',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private getApiEndpoint(table: string): string {
    const endpoints: Record<string, string> = {
      work_orders: 'work-orders',
      equipment: 'equipment',
      parts: 'parts',
      vendors: 'vendors',
      pm_templates: 'pm-templates',
      notifications: 'notifications',
      attachments: 'attachments',
    };

    return endpoints[table] || table;
  }

  private scheduleRetry(action: OfflineAction): void {
    const existingTimeout = this.retryTimeouts.get(action.id);
    if (existingTimeout) return; // Already scheduled

    const timeoutId = setTimeout(() => {
      if (this.isOnline) {
        this.syncSingleAction(action)
          .then(() => {
            action.synced = true;
            const actions = this.getOfflineActions();
            this.saveOfflineActions(actions);
            this.retryTimeouts.delete(action.id);
          })
          .catch(() => {
            // Will be retried in next sync cycle
            this.retryTimeouts.delete(action.id);
          });
      }
    }, OFFLINE_CONFIG.SYNC_RETRY_DELAY);

    this.retryTimeouts.set(action.id, timeoutId);
  }

  private updateLastSyncTime(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('Failed to update last sync time:', error);
    }
  }

  getLastSyncTime(): Date | null {
    try {
      const lastSync = localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_SYNC);
      return lastSync ? new Date(lastSync) : null;
    } catch {
      return null;
    }
  }

  getPendingActionsCount(): number {
    return this.getOfflineActions().filter(action => !action.synced).length;
  }

  clearOfflineActions(): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.OFFLINE_ACTIONS);
      
      // Clear all retry timeouts
      this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
      this.retryTimeouts.clear();
    } catch (error) {
      console.error('Failed to clear offline actions:', error);
    }
  }

  // Force sync (useful for manual sync buttons)
  forcSync(): Promise<void> {
    return this.syncOfflineActions();
  }
}

export const offlineService = OfflineService.getInstance();

// Utility hook for React components
export function useOfflineService() {
  return {
    queueAction: offlineService.queueAction.bind(offlineService),
    getNetworkStatus: offlineService.getNetworkStatus.bind(offlineService),
    getPendingActionsCount: offlineService.getPendingActionsCount.bind(offlineService),
    getLastSyncTime: offlineService.getLastSyncTime.bind(offlineService),
    forceSync: offlineService.forcSync.bind(offlineService),
    clearOfflineActions: offlineService.clearOfflineActions.bind(offlineService),
  };
}

// Initialize offline service
export default offlineService;
