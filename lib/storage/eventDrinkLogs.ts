import { eventLogsStorage } from './index';
import { DrinkLogStatus } from '@/types';

const EVENT_LOGS_KEY = 'pending_event_drink_logs';
const FAILED_LOGS_KEY = 'failed_event_drink_logs';

// リトライ設定
export const MAX_RETRY_COUNT = 5;

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
  retryCount: number;        // リトライ回数
  lastError?: string;        // 最後のエラーメッセージ
  lastRetryAt?: string;      // 最後のリトライ日時
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
export async function addPendingEventDrinkLog(
  log: Omit<EventDrinkLogPending, 'retryCount' | 'lastError' | 'lastRetryAt'>
): Promise<void> {
  try {
    const logs = await getPendingEventDrinkLogs();
    const newLog: EventDrinkLogPending = {
      ...log,
      retryCount: 0,
    };
    logs.push(newLog);
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
 * リトライ回数をインクリメントし、エラー情報を記録
 */
export async function incrementRetryCount(
  localId: string,
  errorMessage: string
): Promise<{ shouldRemove: boolean }> {
  try {
    const logs = await getPendingEventDrinkLogs();
    const index = logs.findIndex((l) => l.localId === localId);

    if (index === -1) {
      return { shouldRemove: false };
    }

    logs[index].retryCount = (logs[index].retryCount || 0) + 1;
    logs[index].lastError = errorMessage;
    logs[index].lastRetryAt = new Date().toISOString();

    const shouldRemove = logs[index].retryCount >= MAX_RETRY_COUNT;

    if (shouldRemove) {
      // 最大リトライ回数に達した → 失敗ログに移動
      const failedLog = logs[index];
      await moveToFailedLogs(failedLog);
      logs.splice(index, 1);
      console.log(`[OfflineQueue] Log ${localId} moved to failed after ${MAX_RETRY_COUNT} retries`);
    }

    await eventLogsStorage.set(EVENT_LOGS_KEY, JSON.stringify(logs));
    return { shouldRemove };
  } catch (error) {
    console.error('Error incrementing retry count:', error);
    return { shouldRemove: false };
  }
}

/**
 * 失敗したログを保存（ユーザーに通知・復旧用）
 */
async function moveToFailedLogs(log: EventDrinkLogPending): Promise<void> {
  try {
    const failedLogs = await getFailedEventDrinkLogs();
    failedLogs.push(log);
    await eventLogsStorage.set(FAILED_LOGS_KEY, JSON.stringify(failedLogs));
  } catch (error) {
    console.error('Error moving to failed logs:', error);
  }
}

/**
 * 失敗したログを取得
 */
export async function getFailedEventDrinkLogs(): Promise<EventDrinkLogPending[]> {
  try {
    const json = await eventLogsStorage.getString(FAILED_LOGS_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch (error) {
    console.error('Error getting failed event logs:', error);
    return [];
  }
}

/**
 * 失敗したログの件数を取得
 */
export async function getFailedCount(): Promise<number> {
  try {
    const logs = await getFailedEventDrinkLogs();
    return logs.length;
  } catch (error) {
    return 0;
  }
}

/**
 * 失敗したログをリトライキューに戻す
 */
export async function retryFailedLogs(): Promise<number> {
  try {
    const failedLogs = await getFailedEventDrinkLogs();
    if (failedLogs.length === 0) return 0;

    const pendingLogs = await getPendingEventDrinkLogs();

    // リトライカウントをリセットしてペンディングに戻す
    for (const log of failedLogs) {
      log.retryCount = 0;
      log.lastError = undefined;
      log.lastRetryAt = undefined;
      pendingLogs.push(log);
    }

    await eventLogsStorage.set(EVENT_LOGS_KEY, JSON.stringify(pendingLogs));
    await eventLogsStorage.delete(FAILED_LOGS_KEY);

    console.log(`[OfflineQueue] ${failedLogs.length} failed logs moved back to pending`);
    return failedLogs.length;
  } catch (error) {
    console.error('Error retrying failed logs:', error);
    return 0;
  }
}

/**
 * 失敗したログを完全に削除
 */
export async function clearFailedEventLogs(): Promise<void> {
  try {
    await eventLogsStorage.delete(FAILED_LOGS_KEY);
  } catch (error) {
    console.error('Error clearing failed event logs:', error);
  }
}
