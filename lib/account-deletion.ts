import { supabase } from './supabase';

export interface DeletionRequest {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  reason?: string;
  requestedAt: string;
  processedAt?: string;
}

export interface DeletionRequestError {
  message: string;
  code?: string;
}

/**
 * 削除リクエストを作成
 */
export async function createDeletionRequest(
  userId: string,
  reason?: string
): Promise<{ request: DeletionRequest | null; error: DeletionRequestError | null }> {
  try {
    // 既存のリクエストがあるか確認
    const { data: existing } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'approved'])
      .single();

    if (existing) {
      return {
        request: null,
        error: { message: '既に削除リクエストが存在します' },
      };
    }

    // 新規リクエストを作成
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: userId,
        reason: reason || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return { request: null, error: { message: error.message, code: error.code } };
    }

    return {
      request: {
        id: data.id,
        userId: data.user_id,
        status: data.status,
        reason: data.reason,
        requestedAt: data.requested_at,
        processedAt: data.processed_at,
      },
      error: null,
    };
  } catch (err: any) {
    return { request: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 削除リクエストを取得
 */
export async function getDeletionRequest(
  userId: string
): Promise<{ request: DeletionRequest | null; error: DeletionRequestError | null }> {
  try {
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'approved'])
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - no active request
        return { request: null, error: null };
      }
      return { request: null, error: { message: error.message, code: error.code } };
    }

    return {
      request: {
        id: data.id,
        userId: data.user_id,
        status: data.status,
        reason: data.reason,
        requestedAt: data.requested_at,
        processedAt: data.processed_at,
      },
      error: null,
    };
  } catch (err: any) {
    return { request: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 削除リクエストをキャンセル
 */
export async function cancelDeletionRequest(
  userId: string
): Promise<{ success: boolean; error: DeletionRequestError | null }> {
  try {
    const { error } = await supabase
      .from('account_deletion_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) {
      return { success: false, error: { message: error.message, code: error.code } };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}
