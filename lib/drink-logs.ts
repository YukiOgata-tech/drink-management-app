import { supabase } from './supabase';
import { DrinkLog, DrinkLogApproval, DrinkLogWithUser } from '@/types';

export interface DatabaseError {
  message: string;
  code?: string;
}

// =====================================================
// 飲酒記録関連
// =====================================================

/**
 * 飲酒記録を作成
 */
export async function createDrinkLog(params: {
  userId: string;
  eventId?: string;
  drinkId?: string;
  drinkName: string;
  ml: number;
  abv: number;
  pureAlcoholG: number;
  count: number;
  memo?: string;
  recordedById: string;
  status?: 'pending' | 'approved' | 'rejected';
}): Promise<{ drinkLog: DrinkLog | null; error: DatabaseError | null }> {
  try {
    const { data, error } = await supabase
      .from('drink_logs')
      .insert({
        user_id: params.userId,
        event_id: params.eventId,
        drink_id: params.drinkId,
        drink_name: params.drinkName,
        ml: params.ml,
        abv: params.abv,
        pure_alcohol_g: params.pureAlcoholG,
        count: params.count,
        memo: params.memo,
        recorded_by_id: params.recordedById,
        status: params.status || 'approved',
      })
      .select()
      .single();

    if (error) {
      return { drinkLog: null, error: { message: error.message, code: error.code } };
    }

    const drinkLog: DrinkLog = {
      id: data.id,
      userId: data.user_id,
      eventId: data.event_id,
      drinkId: data.drink_id,
      drinkName: data.drink_name,
      ml: data.ml,
      abv: data.abv,
      pureAlcoholG: data.pure_alcohol_g,
      count: data.count,
      memo: data.memo,
      recordedById: data.recorded_by_id,
      status: data.status,
      recordedAt: data.recorded_at,
      createdAt: data.created_at,
    };

    return { drinkLog, error: null };
  } catch (err: any) {
    return { drinkLog: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * イベントの飲酒記録一覧を取得（プロフィール情報付き）
 */
export async function getDrinkLogsByEvent(eventId: string): Promise<{ drinkLogs: DrinkLogWithUser[]; error: DatabaseError | null }> {
  try {
    const { data, error } = await supabase
      .from('drink_logs')
      .select(`
        *,
        profiles:user_id (
          display_name,
          avatar
        )
      `)
      .eq('event_id', eventId)
      .order('recorded_at', { ascending: false });

    if (error) {
      return { drinkLogs: [], error: { message: error.message, code: error.code } };
    }

    const drinkLogs: DrinkLogWithUser[] = data.map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      eventId: item.event_id,
      drinkId: item.drink_id,
      drinkName: item.drink_name,
      ml: item.ml,
      abv: item.abv,
      pureAlcoholG: item.pure_alcohol_g,
      count: item.count,
      memo: item.memo,
      recordedById: item.recorded_by_id,
      status: item.status,
      recordedAt: item.recorded_at,
      createdAt: item.created_at,
      userName: item.profiles?.display_name || '名無し',
      userAvatar: item.profiles?.avatar,
    }));

    return { drinkLogs, error: null };
  } catch (err: any) {
    return { drinkLogs: [], error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * ユーザーの飲酒記録一覧を取得
 */
export async function getDrinkLogsByUser(
  userId: string,
  eventId?: string
): Promise<{ drinkLogs: DrinkLog[]; error: DatabaseError | null }> {
  try {
    let query = supabase
      .from('drink_logs')
      .select('*')
      .eq('user_id', userId);

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query.order('recorded_at', { ascending: false });

    if (error) {
      return { drinkLogs: [], error: { message: error.message, code: error.code } };
    }

    const drinkLogs: DrinkLog[] = data.map((item) => ({
      id: item.id,
      userId: item.user_id,
      eventId: item.event_id,
      drinkId: item.drink_id,
      drinkName: item.drink_name,
      ml: item.ml,
      abv: item.abv,
      pureAlcoholG: item.pure_alcohol_g,
      count: item.count,
      memo: item.memo,
      recordedById: item.recorded_by_id,
      status: item.status,
      recordedAt: item.recorded_at,
      createdAt: item.created_at,
    }));

    return { drinkLogs, error: null };
  } catch (err: any) {
    return { drinkLogs: [], error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 飲酒記録を削除
 */
export async function deleteDrinkLog(drinkLogId: string): Promise<{ error: DatabaseError | null }> {
  try {
    const { error } = await supabase
      .from('drink_logs')
      .delete()
      .eq('id', drinkLogId);

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

// =====================================================
// 承認関連
// =====================================================

/**
 * 飲酒記録を承認
 */
export async function approveDrinkLog(params: {
  drinkLogId: string;
  approvedByUserId: string;
}): Promise<{ error: DatabaseError | null }> {
  try {
    const { error } = await supabase
      .from('drink_log_approvals')
      .insert({
        drink_log_id: params.drinkLogId,
        approved_by_user_id: params.approvedByUserId,
      });

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 飲酒記録の承認一覧を取得
 */
export async function getDrinkLogApprovals(drinkLogId: string): Promise<{ approvals: DrinkLogApproval[]; error: DatabaseError | null }> {
  try {
    const { data, error } = await supabase
      .from('drink_log_approvals')
      .select('*')
      .eq('drink_log_id', drinkLogId)
      .order('approved_at', { ascending: true });

    if (error) {
      return { approvals: [], error: { message: error.message, code: error.code } };
    }

    const approvals: DrinkLogApproval[] = data.map((item) => ({
      id: item.id,
      drinkLogId: item.drink_log_id,
      approvedByUserId: item.approved_by_user_id,
      approvedAt: item.approved_at,
    }));

    return { approvals, error: null };
  } catch (err: any) {
    return { approvals: [], error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 承認を取り消し
 */
export async function removeApproval(
  drinkLogId: string,
  userId: string
): Promise<{ error: DatabaseError | null }> {
  try {
    const { error } = await supabase
      .from('drink_log_approvals')
      .delete()
      .eq('drink_log_id', drinkLogId)
      .eq('approved_by_user_id', userId);

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 飲酒記録を却下
 */
export async function rejectDrinkLog(drinkLogId: string): Promise<{ error: DatabaseError | null }> {
  try {
    const { error } = await supabase
      .from('drink_logs')
      .update({ status: 'rejected' })
      .eq('id', drinkLogId);

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}
