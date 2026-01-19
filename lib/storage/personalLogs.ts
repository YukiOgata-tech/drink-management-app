import { personalLogsStorage } from './index';
import { PersonalDrinkLog, PersonalLogSyncStatus } from '@/types';

const PERSONAL_LOGS_KEY = 'personal_logs';

/**
 * すべての個人飲酒記録を取得
 */
export async function getPersonalLogs(): Promise<PersonalDrinkLog[]> {
  try {
    const json = await personalLogsStorage.getString(PERSONAL_LOGS_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch (error) {
    console.error('Error getting personal logs:', error);
    return [];
  }
}

/**
 * 個人飲酒記録を追加
 */
export async function addPersonalLog(log: PersonalDrinkLog): Promise<void> {
  try {
    const logs = await getPersonalLogs();
    logs.push(log);
    // 日付降順でソート
    logs.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    await personalLogsStorage.set(PERSONAL_LOGS_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Error adding personal log:', error);
    throw error;
  }
}

/**
 * 個人飲酒記録を更新
 */
export async function updatePersonalLog(id: string, updates: Partial<PersonalDrinkLog>): Promise<void> {
  try {
    const logs = await getPersonalLogs();
    const index = logs.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new Error('Personal log not found');
    }
    logs[index] = { ...logs[index], ...updates };
    await personalLogsStorage.set(PERSONAL_LOGS_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Error updating personal log:', error);
    throw error;
  }
}

/**
 * 個人飲酒記録を削除
 */
export async function deletePersonalLog(id: string): Promise<void> {
  try {
    const logs = await getPersonalLogs();
    const filtered = logs.filter((l) => l.id !== id);
    await personalLogsStorage.set(PERSONAL_LOGS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting personal log:', error);
    throw error;
  }
}

/**
 * 特定日の個人飲酒記録を取得
 */
export async function getPersonalLogsByDate(date: string): Promise<PersonalDrinkLog[]> {
  try {
    const logs = await getPersonalLogs();
    return logs.filter((l) => l.recordedAt.startsWith(date));
  } catch (error) {
    console.error('Error getting personal logs by date:', error);
    return [];
  }
}

/**
 * 今日の個人飲酒記録を取得
 */
export async function getTodayPersonalLogs(): Promise<PersonalDrinkLog[]> {
  const today = new Date().toISOString().split('T')[0];
  return getPersonalLogsByDate(today);
}

/**
 * 期間内の個人飲酒記録を取得
 */
export async function getPersonalLogsByDateRange(startDate: string, endDate: string): Promise<PersonalDrinkLog[]> {
  try {
    const logs = await getPersonalLogs();
    return logs.filter((l) => {
      const recordedDate = l.recordedAt.split('T')[0];
      return recordedDate >= startDate && recordedDate <= endDate;
    });
  } catch (error) {
    console.error('Error getting personal logs by date range:', error);
    return [];
  }
}

// =====================================================
// 同期関連の関数
// =====================================================

/**
 * 記録をSynced状態にマーク
 */
export async function markLogAsSynced(localId: string, supabaseId: string): Promise<void> {
  try {
    await updatePersonalLog(localId, {
      supabaseId,
      syncStatus: 'synced' as PersonalLogSyncStatus,
    });
  } catch (error) {
    console.error('Error marking log as synced:', error);
    throw error;
  }
}

/**
 * 同期待ちの記録を取得
 */
export async function getPendingSyncLogs(): Promise<PersonalDrinkLog[]> {
  try {
    const logs = await getPersonalLogs();
    return logs.filter((l) => l.syncStatus === 'pending' || !l.syncStatus);
  } catch (error) {
    console.error('Error getting pending sync logs:', error);
    return [];
  }
}

/**
 * 今日記録があるか確認（デイリーボーナス判定用）
 */
export async function hasLocalRecordToday(): Promise<boolean> {
  try {
    const todayLogs = await getTodayPersonalLogs();
    return todayLogs.length > 0;
  } catch (error) {
    console.error('Error checking today records:', error);
    return false;
  }
}

/**
 * ローカル記録をSupabaseの記録で置き換え
 */
export async function replaceLogsWithSupabase(supabaseLogs: PersonalDrinkLog[]): Promise<void> {
  try {
    await personalLogsStorage.set(PERSONAL_LOGS_KEY, JSON.stringify(supabaseLogs));
  } catch (error) {
    console.error('Error replacing logs with supabase:', error);
    throw error;
  }
}

/**
 * 全ての記録をクリア（ログアウト時用）
 */
export async function clearAllPersonalLogs(): Promise<void> {
  try {
    await personalLogsStorage.delete(PERSONAL_LOGS_KEY);
  } catch (error) {
    console.error('Error clearing personal logs:', error);
    throw error;
  }
}
