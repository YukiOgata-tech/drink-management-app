import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** 開催中イベントがこの数を超えたらリアルタイムを停止し手動更新モードにする */
export const REALTIME_ACTIVE_EVENT_CAP = 40;

export type EventRealtimeStatus =
  | 'disabled' // 終了イベント等、購読不要
  | 'connecting'
  | 'live' // 購読中
  | 'capped'; // 上限超過のため手動更新モード

/**
 * イベント詳細画面用のリアルタイム購読フック。
 *
 * - 購読は「開催中イベントを開いている間だけ」。画面を離れると必ず unsubscribe。
 * - 購読前に count_active_events() で開催中イベント数を確認し、上限超過時は購読せず
 *   'capped' を返す（= 従量課金を避け、手動更新へフォールバック）。
 * - drink_logs（status更新含む）の変更を検知して onChange を呼ぶ。
 */
export function useEventRealtime(params: {
  eventId: string;
  enabled: boolean;
  onChange: () => void;
}): EventRealtimeStatus {
  const { eventId, enabled, onChange } = params;
  const [status, setStatus] = useState<EventRealtimeStatus>('disabled');

  // onChange の最新参照を保持（依存配列に入れず再購読を防ぐ）
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !eventId) {
      setStatus('disabled');
      return;
    }

    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    setStatus('connecting');

    (async () => {
      // 同時上限ゲート（開催中イベント数）
      const { data, error } = await supabase.rpc('count_active_events');
      if (cancelled) return;

      if (!error && typeof data === 'number' && data > REALTIME_ACTIVE_EVENT_CAP) {
        setStatus('capped');
        return; // 購読しない
      }

      channel = supabase
        .channel(`event-drink-logs-${eventId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'drink_logs',
            filter: `event_id=eq.${eventId}`,
          },
          () => onChangeRef.current()
        )
        .subscribe((channelStatus) => {
          if (cancelled) return;
          if (channelStatus === 'SUBSCRIBED') setStatus('live');
          else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
            setStatus('capped'); // 接続失敗時も手動更新へ寄せる
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [eventId, enabled]);

  return status;
}
