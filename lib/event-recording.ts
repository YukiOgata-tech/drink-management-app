import * as DrinkLogsAPI from './drink-logs';
import { addPendingEventDrinkLog } from './storage/eventDrinkLogs';
import { EventRecordingRule } from '@/types';

/**
 * 記録ルールに応じたイベント飲酒記録の初期ステータス。
 * consensus のみ承認待ち（pending）、それ以外は即確定（approved）。
 */
export function initialDrinkLogStatus(rule: EventRecordingRule): 'pending' | 'approved' {
  return rule === 'consensus' ? 'pending' : 'approved';
}

export interface EventDrinkLogInput {
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
  status: 'pending' | 'approved';
}

export type PersistOutcome = 'online' | 'offline' | 'offline_fallback';

async function queueOffline(data: EventDrinkLogInput): Promise<void> {
  await addPendingEventDrinkLog({
    localId: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    ...data,
    recordedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
}

/**
 * イベント飲酒記録を永続化する（記録ロジックの集約）。
 * - オフライン       → ローカルキューへ           ('offline')
 * - オンライン成功   → Supabaseへ                 ('online')
 * - オンライン失敗   → ローカルキューへフォールバック ('offline_fallback')
 * - キューも失敗     → outcome=null + error
 *
 * XP付与・アラート・画面遷移は呼び出し側（UI）の責務。
 */
export async function persistEventDrinkLog(
  data: EventDrinkLogInput,
  opts: { isOnline: boolean }
): Promise<{ outcome: PersistOutcome | null; error: { message: string } | null }> {
  if (!opts.isOnline) {
    try {
      await queueOffline(data);
      return { outcome: 'offline', error: null };
    } catch (e: any) {
      return { outcome: null, error: { message: e?.message || 'ローカル保存に失敗しました' } };
    }
  }

  const { error } = await DrinkLogsAPI.createDrinkLog(data);
  if (error) {
    // サーバー失敗時はオフラインキューへフォールバック
    try {
      await queueOffline(data);
      return { outcome: 'offline_fallback', error: null };
    } catch {
      return { outcome: null, error: { message: error.message || '記録の追加に失敗しました' } };
    }
  }

  return { outcome: 'online', error: null };
}
