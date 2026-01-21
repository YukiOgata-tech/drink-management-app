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
 * イベントを作成
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
    const { data, error } = await supabase
      .from('events')
      .insert({
        title: params.title,
        description: params.description,
        recording_rule: params.recordingRule,
        required_approvals: params.requiredApprovals || 1,
        started_at: params.startedAt,
        host_id: params.hostId,
      })
      .select()
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
 * イベント一覧を取得
 */
export async function getEvents(userId: string): Promise<{ events: Event[]; error: DatabaseError | null }> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_members!inner(user_id)
      `)
      .eq('event_members.user_id', userId)
      .order('started_at', { ascending: false });

    if (error) {
      return { events: [], error: { message: error.message, code: error.code } };
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

    return { events, error: null };
  } catch (err: any) {
    return { events: [], error: { message: err.message || '予期しないエラーが発生しました' } };
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
 * イベントメンバーを追加
 */
export async function addEventMember(params: {
  eventId: string;
  userId: string;
  role: 'host' | 'manager' | 'member';
}): Promise<{ error: DatabaseError | null }> {
  try {
    const { error } = await supabase
      .from('event_members')
      .insert({
        event_id: params.eventId,
        user_id: params.userId,
        role: params.role,
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
          avatar_url
        )
      `)
      .eq('event_id', eventId)
      .order('joined_at', { ascending: true });

    if (error) {
      return { members: [], error: { message: error.message, code: error.code } };
    }

    const members: EventMember[] = data.map((item: any) => ({
      eventId: item.event_id,
      userId: item.user_id,
      role: item.role,
      joinedAt: item.joined_at,
      leftAt: item.left_at,
      displayName: item.profiles?.display_name || '名無し',
      avatar: item.profiles?.avatar_url,
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
