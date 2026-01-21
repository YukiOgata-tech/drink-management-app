import NetInfo from '@react-native-community/netinfo';
import { usePersonalLogsStore } from '@/stores/personalLogs';
import { useNetworkStore } from '@/stores/network';
import { useUserStore } from '@/stores/user';
import { getPendingEventDrinkLogs, syncEventDrinkLog, markEventLogAsSynced, EventDrinkLogPending } from './storage/eventDrinkLogs';
import { createDrinkLog } from './drink-logs';

export type SyncResult = {
  personalLogs: { synced: number; failed: number };
  eventLogs: { synced: number; failed: number };
};

/**
 * 保留中のすべてのデータを同期
 */
export async function syncAllPendingData(): Promise<SyncResult> {
  const result: SyncResult = {
    personalLogs: { synced: 0, failed: 0 },
    eventLogs: { synced: 0, failed: 0 },
  };

  const userState = useUserStore.getState();
  if (userState.isGuest || !userState.user) {
    console.log('[Sync] Skipping sync - user is guest or not logged in');
    return result;
  }

  // ネットワーク接続を確認
  const networkState = await NetInfo.fetch();
  if (!networkState.isConnected) {
    console.log('[Sync] Skipping sync - no network connection');
    return result;
  }

  console.log('[Sync] Starting sync...');

  // 1. 個人飲酒記録を同期
  try {
    const personalLogsStore = usePersonalLogsStore.getState();
    await personalLogsStore.syncToSupabase();
    // TODO: 同期結果を取得
  } catch (error) {
    console.error('[Sync] Personal logs sync failed:', error);
  }

  // 2. イベント飲酒記録を同期
  try {
    const pendingEventLogs = await getPendingEventDrinkLogs();
    console.log(`[Sync] Found ${pendingEventLogs.length} pending event logs`);

    for (const pendingLog of pendingEventLogs) {
      const { drinkLog, error } = await createDrinkLog({
        userId: pendingLog.userId,
        eventId: pendingLog.eventId,
        drinkId: pendingLog.drinkId,
        drinkName: pendingLog.drinkName,
        ml: pendingLog.ml,
        abv: pendingLog.abv,
        pureAlcoholG: pendingLog.pureAlcoholG,
        count: pendingLog.count,
        memo: pendingLog.memo,
        recordedById: pendingLog.recordedById,
        status: pendingLog.status,
      });

      if (drinkLog && !error) {
        await markEventLogAsSynced(pendingLog.localId);
        result.eventLogs.synced++;
        console.log(`[Sync] Event log ${pendingLog.localId} synced successfully`);
      } else {
        result.eventLogs.failed++;
        console.error(`[Sync] Failed to sync event log ${pendingLog.localId}:`, error);
      }
    }
  } catch (error) {
    console.error('[Sync] Event logs sync failed:', error);
  }

  console.log('[Sync] Sync complete:', result);
  return result;
}

/**
 * ネットワーク復帰時に自動同期を開始するリスナー
 */
let syncSubscription: (() => void) | null = null;

export function startAutoSync(): () => void {
  if (syncSubscription) {
    console.log('[Sync] Auto sync already running');
    return syncSubscription;
  }

  console.log('[Sync] Starting auto sync listener');

  let wasConnected = true;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const isNowConnected = state.isConnected ?? false;

    // オフライン → オンラインの遷移を検出
    if (!wasConnected && isNowConnected) {
      console.log('[Sync] Network restored - triggering auto sync');
      syncAllPendingData();
    }

    wasConnected = isNowConnected;
  });

  syncSubscription = () => {
    unsubscribe();
    syncSubscription = null;
  };

  return syncSubscription;
}

/**
 * 自動同期を停止
 */
export function stopAutoSync(): void {
  if (syncSubscription) {
    syncSubscription();
    syncSubscription = null;
    console.log('[Sync] Auto sync stopped');
  }
}

/**
 * 手動で同期を実行
 */
export async function manualSync(): Promise<SyncResult> {
  console.log('[Sync] Manual sync triggered');
  return syncAllPendingData();
}
