import { supabase } from './supabase';
import { PersonalDrinkLog, DrinkCategory } from '@/types';

export interface PersonalLogApiError {
  message: string;
  code?: string;
}

/**
 * 個人記録をSupabaseに作成（event_id = null）
 */
export async function createPersonalLogInSupabase(
  log: PersonalDrinkLog,
  userId: string
): Promise<{ supabaseId: string | null; error: PersonalLogApiError | null }> {
  try {
    const { data, error } = await supabase
      .from('drink_logs')
      .insert({
        user_id: userId,
        event_id: null, // 個人記録なのでevent_idはnull
        drink_id: log.drinkId || null,
        drink_name: log.drinkName,
        ml: log.ml,
        abv: log.abv,
        pure_alcohol_g: log.pureAlcoholG,
        count: log.count,
        memo: log.memo || null,
        recorded_by_id: userId,
        status: 'approved', // 個人記録は即時承認
        recorded_at: log.recordedAt,
      })
      .select('id')
      .single();

    if (error) {
      return { supabaseId: null, error: { message: error.message, code: error.code } };
    }

    return { supabaseId: data.id, error: null };
  } catch (err: any) {
    return { supabaseId: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * Supabaseから個人記録を取得
 */
export async function fetchPersonalLogsFromSupabase(
  userId: string,
  limit: number = 100
): Promise<{ logs: PersonalDrinkLog[]; error: PersonalLogApiError | null }> {
  try {
    const { data, error } = await supabase
      .from('drink_logs')
      .select('*')
      .eq('user_id', userId)
      .is('event_id', null) // 個人記録のみ取得
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { logs: [], error: { message: error.message, code: error.code } };
    }

    const logs: PersonalDrinkLog[] = data.map((row) => ({
      id: row.id, // Supabase IDをそのまま使用
      userId: row.user_id,
      drinkId: row.drink_id || undefined,
      drinkName: row.drink_name,
      drinkCategory: 'other' as DrinkCategory, // DBにはカテゴリがないのでデフォルト
      ml: row.ml,
      abv: parseFloat(row.abv),
      pureAlcoholG: parseFloat(row.pure_alcohol_g),
      count: row.count,
      memo: row.memo || undefined,
      recordedAt: row.recorded_at,
      isCustomDrink: !row.drink_id, // drink_idがなければカスタム
      supabaseId: row.id,
      syncStatus: 'synced' as const,
    }));

    return { logs, error: null };
  } catch (err: any) {
    return { logs: [], error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 個人記録をSupabaseから削除
 */
export async function deletePersonalLogFromSupabase(
  supabaseId: string
): Promise<{ error: PersonalLogApiError | null }> {
  try {
    const { error } = await supabase
      .from('drink_logs')
      .delete()
      .eq('id', supabaseId)
      .is('event_id', null); // 安全のため個人記録のみ削除可能

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 複数の個人記録をSupabaseに一括同期
 */
export async function syncPendingLogsToSupabase(
  logs: PersonalDrinkLog[],
  userId: string
): Promise<{
  results: { localId: string; supabaseId: string | null; error: PersonalLogApiError | null }[];
}> {
  const results = await Promise.all(
    logs.map(async (log) => {
      const { supabaseId, error } = await createPersonalLogInSupabase(log, userId);
      return { localId: log.id, supabaseId, error };
    })
  );

  return { results };
}

/**
 * 当日の記録があるか確認（デイリーボーナス判定用）
 * 日本時間（JST）基準で判定
 */
export async function hasRecordedToday(userId: string): Promise<{
  hasRecorded: boolean;
  error: PersonalLogApiError | null;
}> {
  try {
    // 日本時間で今日の開始と終了を計算
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const localOffset = now.getTimezoneOffset();
    const jstNow = new Date(now.getTime() + (jstOffset + localOffset) * 60 * 1000);

    const todayStart = new Date(jstNow);
    todayStart.setHours(0, 0, 0, 0);
    // JSTからUTCに戻す
    const todayStartUTC = new Date(todayStart.getTime() - (jstOffset + localOffset) * 60 * 1000);

    const tomorrowStartUTC = new Date(todayStartUTC);
    tomorrowStartUTC.setDate(tomorrowStartUTC.getDate() + 1);

    const { data, error } = await supabase
      .from('drink_logs')
      .select('id')
      .eq('user_id', userId)
      .gte('recorded_at', todayStartUTC.toISOString())
      .lt('recorded_at', tomorrowStartUTC.toISOString())
      .limit(1);

    if (error) {
      return { hasRecorded: false, error: { message: error.message, code: error.code } };
    }

    return { hasRecorded: data.length > 0, error: null };
  } catch (err: any) {
    return { hasRecorded: false, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}
