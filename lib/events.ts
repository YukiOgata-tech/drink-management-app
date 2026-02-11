import { supabase } from './supabase';
import { Event, EventMember, EventRecordingRule } from '@/types';

export interface DatabaseError {
  message: string;
  code?: string;
}

// =====================================================
// イベント関連
// =====================================================

/**
 * イベントを作成（RPC関数を使用）
 */
export async function createEvent(params: {
  title: string;
  description?: string;
  recordingRule: EventRecordingRule;
  requiredApprovals?: number;
  startedAt: string;
  hostId: string;
}): Promise<{ event: Event | null; error: DatabaseError | null }> {
  try {
    // RPC関数でイベントを作成（RLSをバイパス、イベントデータを直接返す）
    const { data, error: rpcError } = await supabase.rpc('create_event_with_host', {
      p_title: params.title,
      p_description: params.description || null,
      p_recording_rule: params.recordingRule,
      p_required_approvals: params.requiredApprovals || 1,
      p_started_at: params.startedAt,
    });

    if (rpcError) {
      return { event: null, error: { message: rpcError.message, code: rpcError.code } };
    }

    if (!data) {
      return { event: null, error: { message: 'イベントの作成に失敗しました（データが返されませんでした）' } };
    }

    // デバッグ: RPC関数から返されたデータを確認
    console.log('createEvent RPC response:', JSON.stringify(data, null, 2));

    if (!data.invite_code) {
      console.warn('Warning: invite_code is missing from RPC response');
    }

    const event: Event = {
      id: data.id,
      title: data.title,
      description: data.description,
      recordingRule: data.recording_rule,
      requiredApprovals: data.required_approvals,
      inviteCode: data.invite_code,
      hostId: data.host_id,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { event, error: null };
  } catch (err: any) {
    return { event: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * イベント一覧を取得（ページネーション対応）
 */
export async function getEvents(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ events: Event[]; totalCount: number; error: DatabaseError | null }> {
  try {
    // まず総件数を取得
    const { count, error: countError } = await supabase
      .from('events')
      .select(`*, event_members!inner(user_id)`, { count: 'exact', head: true })
      .eq('event_members.user_id', userId);

    if (countError) {
      return { events: [], totalCount: 0, error: { message: countError.message, code: countError.code } };
    }

    // イベントを取得
    let query = supabase
      .from('events')
      .select(`
        *,
        event_members!inner(user_id)
      `)
      .eq('event_members.user_id', userId)
      .order('started_at', { ascending: false });

    // ページネーション
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { events: [], totalCount: 0, error: { message: error.message, code: error.code } };
    }

    const events: Event[] = data.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      recordingRule: item.recording_rule,
      requiredApprovals: item.required_approvals,
      inviteCode: item.invite_code,
      hostId: item.host_id,
      startedAt: item.started_at,
      endedAt: item.ended_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return { events, totalCount: count || 0, error: null };
  } catch (err: any) {
    return { events: [], totalCount: 0, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * イベントIDでイベントを取得
 */
export async function getEventById(eventId: string): Promise<{ event: Event | null; error: DatabaseError | null }> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      return { event: null, error: { message: error.message, code: error.code } };
    }

    const event: Event = {
      id: data.id,
      title: data.title,
      description: data.description,
      recordingRule: data.recording_rule,
      requiredApprovals: data.required_approvals,
      inviteCode: data.invite_code,
      hostId: data.host_id,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { event, error: null };
  } catch (err: any) {
    return { event: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 招待コードでイベントを取得
 */
export async function getEventByInviteCode(inviteCode: string): Promise<{ event: Event | null; error: DatabaseError | null }> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (error) {
      return { event: null, error: { message: error.message, code: error.code } };
    }

    const event: Event = {
      id: data.id,
      title: data.title,
      description: data.description,
      recordingRule: data.recording_rule,
      requiredApprovals: data.required_approvals,
      inviteCode: data.invite_code,
      hostId: data.host_id,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { event, error: null };
  } catch (err: any) {
    return { event: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * イベントを更新
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<Pick<Event, 'title' | 'description' | 'endedAt'>>
): Promise<{ error: DatabaseError | null }> {
  try {
    const { error } = await supabase
      .from('events')
      .update({
        title: updates.title,
        description: updates.description,
        ended_at: updates.endedAt,
      })
      .eq('id', eventId);

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * イベントを終了
 */
export async function endEvent(eventId: string): Promise<{ error: DatabaseError | null }> {
  return updateEvent(eventId, { endedAt: new Date().toISOString() });
}

/**
 * イベントを削除
 */
export async function deleteEvent(eventId: string): Promise<{ error: DatabaseError | null }> {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

// =====================================================
// イベントメンバー関連
// =====================================================

/**
 * ユーザーがイベントのメンバーかどうかを確認
 */
export async function isEventMember(
  eventId: string,
  userId: string
): Promise<{ isMember: boolean; error: DatabaseError | null }> {
  try {
    const { data, error } = await supabase
      .from('event_members')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { isMember: false, error: { message: error.message, code: error.code } };
    }

    return { isMember: !!data, error: null };
  } catch (err: any) {
    return { isMember: false, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * イベント参加の事前検証
 * - イベントが存在するか
 * - イベントが終了していないか
 * - 既に参加していないか
 */
export async function validateEventJoin(
  eventId: string,
  userId: string
): Promise<{
  canJoin: boolean;
  error: string | null;
  errorCode?: 'EVENT_NOT_FOUND' | 'EVENT_ALREADY_ENDED' | 'ALREADY_MEMBER' | 'UNKNOWN';
}> {
  try {
    // イベントを取得
    const { event, error: eventError } = await getEventById(eventId);

    if (eventError || !event) {
      return {
        canJoin: false,
        error: 'イベントが見つかりません',
        errorCode: 'EVENT_NOT_FOUND',
      };
    }

    // イベントが終了していないか確認
    if (event.endedAt) {
      return {
        canJoin: false,
        error: 'このイベントは既に終了しています',
        errorCode: 'EVENT_ALREADY_ENDED',
      };
    }

    // 既に参加しているか確認
    const { isMember, error: memberError } = await isEventMember(eventId, userId);

    if (memberError) {
      return {
        canJoin: false,
        error: '参加状態の確認に失敗しました',
        errorCode: 'UNKNOWN',
      };
    }

    if (isMember) {
      return {
        canJoin: false,
        error: '既にこのイベントに参加しています',
        errorCode: 'ALREADY_MEMBER',
      };
    }

    return { canJoin: true, error: null };
  } catch (err: any) {
    return {
      canJoin: false,
      error: err.message || '予期しないエラーが発生しました',
      errorCode: 'UNKNOWN',
    };
  }
}

/**
 * イベントメンバーを追加（検証付き）
 */
export async function addEventMember(params: {
  eventId: string;
  userId: string;
  role: 'host' | 'manager' | 'member';
  skipValidation?: boolean;
}): Promise<{ error: DatabaseError | null; errorCode?: string }> {
  try {
    // 検証をスキップしない場合は事前チェック
    if (!params.skipValidation) {
      const validation = await validateEventJoin(params.eventId, params.userId);
      if (!validation.canJoin) {
        return {
          error: { message: validation.error || '参加できません' },
          errorCode: validation.errorCode,
        };
      }
    }

    const { error } = await supabase
      .from('event_members')
      .insert({
        event_id: params.eventId,
        user_id: params.userId,
        role: params.role,
      });

    if (error) {
      // 重複エラーの場合は特別なメッセージ
      if (error.code === '23505') {
        return {
          error: { message: '既にこのイベントに参加しています', code: error.code },
          errorCode: 'ALREADY_MEMBER',
        };
      }
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * イベントメンバー一覧を取得（プロフィール情報付き）
 */
export async function getEventMembers(eventId: string): Promise<{ members: EventMember[]; error: DatabaseError | null }> {
  try {
    const { data, error } = await supabase
      .from('event_members')
      .select(`
        *,
        profiles:user_id (
          display_name,
          avatar
        )
      `)
      .eq('event_id', eventId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('getEventMembers error:', error);
      return { members: [], error: { message: error.message, code: error.code } };
    }

    const members: EventMember[] = (data || []).map((item: any) => ({
      eventId: item.event_id,
      userId: item.user_id,
      role: item.role,
      joinedAt: item.joined_at,
      leftAt: item.left_at,
      displayName: item.profiles?.display_name || '名無し',
      avatar: item.profiles?.avatar,
    }));

    return { members, error: null };
  } catch (err: any) {
    return { members: [], error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * イベントメンバーを更新（役割変更・離脱）
 */
export async function updateEventMember(
  eventId: string,
  userId: string,
  updates: Partial<Pick<EventMember, 'role' | 'leftAt'>>
): Promise<{ error: DatabaseError | null }> {
  try {
    const { error } = await supabase
      .from('event_members')
      .update({
        role: updates.role,
        left_at: updates.leftAt,
      })
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * イベントメンバーを削除
 */
export async function removeEventMember(
  eventId: string,
  userId: string
): Promise<{ error: DatabaseError | null }> {
  try {
    const { error } = await supabase
      .from('event_members')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * イベントから離脱
 */
export async function leaveEvent(eventId: string, userId: string): Promise<{ error: DatabaseError | null }> {
  return updateEventMember(eventId, userId, { leftAt: new Date().toISOString() });
}
