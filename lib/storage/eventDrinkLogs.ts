import { eventLogsStorage } from './index';
import { DrinkLogStatus } from '@/types';

const EVENT_LOGS_KEY = 'pending_event_drink_logs';

export interface EventDrinkLogPending {
  localId: string;
  userId: string;
  eventId: string;
  drinkId?: string;
  drinkName: string;
  ml: number;
  abv: number;
  pureAlcoholG: number;
  count: number;
  memo?: string;
  recordedById: string;
  status: DrinkLogStatus;
  recordedAt: string;
  createdAt: string;
}

/**
 * 保留中のイベント飲酒記録を取得
 */
export async function getPendingEventDrinkLogs(): Promise<EventDrinkLogPending[]> {
  try {
    const json = await eventLogsStorage.getString(EVENT_LOGS_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch (error) {
    console.error('Error getting pending event logs:', error);
    return [];
  }
}

/**
 * イベント飲酒記録をオフラインキューに追加
 */
export async function addPendingEventDrinkLog(log: EventDrinkLogPending): Promise<void> {
  try {
    const logs = await getPendingEventDrinkLogs();
    logs.push(log);
    await eventLogsStorage.set(EVENT_LOGS_KEY, JSON.stringify(logs));
    console.log('[OfflineQueue] Event drink log added to queue:', log.localId);
  } catch (error) {
    console.error('Error adding pending event log:', error);
    throw error;
  }
}

/**
 * 同期済みの記録をキューから削除
 */
export async function markEventLogAsSynced(localId: string): Promise<void> {
  try {
    const logs = await getPendingEventDrinkLogs();
    const filtered = logs.filter((l) => l.localId !== localId);
    await eventLogsStorage.set(EVENT_LOGS_KEY, JSON.stringify(filtered));
    console.log('[OfflineQueue] Event drink log removed from queue:', localId);
  } catch (error) {
    console.error('Error marking event log as synced:', error);
    throw error;
  }
}

/**
 * 特定イベントの保留中記録を取得
 */
export async function getPendingLogsByEvent(eventId: string): Promise<EventDrinkLogPending[]> {
  try {
    const logs = await getPendingEventDrinkLogs();
    return logs.filter((l) => l.eventId === eventId);
  } catch (error) {
    console.error('Error getting pending logs by event:', error);
    return [];
  }
}

/**
 * 保留中の記録数を取得
 */
export async function getPendingCount(): Promise<number> {
  try {
    const logs = await getPendingEventDrinkLogs();
    return logs.length;
  } catch (error) {
    console.error('Error getting pending count:', error);
    return 0;
  }
}

/**
 * 全ての保留記録をクリア
 */
export async function clearAllPendingEventLogs(): Promise<void> {
  try {
    await eventLogsStorage.delete(EVENT_LOGS_KEY);
  } catch (error) {
    console.error('Error clearing pending event logs:', error);
    throw error;
  }
}

/**
 * イベント飲酒記録を同期
 * （sync.tsから呼ばれる）
 */
export async function syncEventDrinkLog(
  pendingLog: EventDrinkLogPending
): Promise<{ success: boolean; supabaseId?: string; error?: string }> {
  // この関数は sync.ts で createDrinkLog を使って実装される
  // ここでは型定義のみ
  return { success: false, error: 'Not implemented directly - use sync.ts' };
}
