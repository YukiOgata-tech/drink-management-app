import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import { getPendingEventDrinkLogs, getPendingCount, getFailedCount } from '@/lib/storage/eventDrinkLogs';
import { getPendingSyncLogs } from '@/lib/storage/personalLogs';
import { syncAllPendingData, SyncResult, startAutoSync, stopAutoSync } from '@/lib/sync';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

interface SyncState {
  status: SyncStatus;
  isOnline: boolean;
  pendingPersonalLogs: number;
  pendingEventLogs: number;
  failedEventLogs: number;  // 失敗して復旧待ちのログ数
  lastSyncAt: string | null;
  lastSyncResult: SyncResult | null;
  error: string | null;

  // Actions
  initialize: () => () => void;
  refreshPendingCounts: () => Promise<void>;
  sync: () => Promise<SyncResult | null>;
  setOnline: (isOnline: boolean) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  isOnline: true,
  pendingPersonalLogs: 0,
  pendingEventLogs: 0,
  failedEventLogs: 0,
  lastSyncAt: null,
  lastSyncResult: null,
  error: null,

  initialize: () => {
    // 初期状態を取得
    NetInfo.fetch().then((state) => {
      set({ isOnline: state.isConnected ?? true });
    });

    // 保留中のカウントを更新
    get().refreshPendingCounts();

    // ネットワーク状態の監視
    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      const wasOnline = get().isOnline;
      const isNowOnline = state.isConnected ?? false;

      set({ isOnline: isNowOnline });

      // オフラインになったら status を offline に
      if (!isNowOnline) {
        set({ status: 'offline' });
      } else if (wasOnline === false && isNowOnline) {
        // オンラインに復帰したら自動同期
        console.log('[SyncStore] Online - triggering sync');
        set({ status: 'idle' });
        get().sync();
      }
    });

    // 自動同期を開始
    const unsubscribeAutoSync = startAutoSync();

    return () => {
      unsubscribeNetwork();
      if (unsubscribeAutoSync) unsubscribeAutoSync();
    };
  },

  refreshPendingCounts: async () => {
    try {
      const [personalLogs, eventCount, failedCount] = await Promise.all([
        getPendingSyncLogs(),
        getPendingCount(),
        getFailedCount(),
      ]);

      set({
        pendingPersonalLogs: personalLogs.length,
        pendingEventLogs: eventCount,
        failedEventLogs: failedCount,
      });
    } catch (error) {
      console.error('[SyncStore] Error refreshing pending counts:', error);
    }
  },

  sync: async () => {
    const { isOnline, status } = get();

    if (!isOnline) {
      set({ status: 'offline' });
      return null;
    }

    if (status === 'syncing') {
      console.log('[SyncStore] Sync already in progress');
      return null;
    }

    set({ status: 'syncing', error: null });

    try {
      const result = await syncAllPendingData();

      set({
        status: 'success',
        lastSyncAt: new Date().toISOString(),
        lastSyncResult: result,
      });

      // カウントを更新
      await get().refreshPendingCounts();

      // 3秒後に idle に戻す
      setTimeout(() => {
        if (get().status === 'success') {
          set({ status: 'idle' });
        }
      }, 3000);

      return result;
    } catch (error: any) {
      set({
        status: 'error',
        error: error.message || 'Sync failed',
      });
      return null;
    }
  },

  setOnline: (isOnline) => {
    set({ isOnline });
  },
}));
