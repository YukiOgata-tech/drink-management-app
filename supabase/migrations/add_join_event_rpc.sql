-- イベント参加を原子的に処理する RPC（RLSバイパス、SECURITY DEFINER）。
-- （本番プロジェクト ctwpnaizwsrffrkkbuig に適用済み）
-- - 存在チェック / 終了チェック をサーバー側で実施（TOCTOU回避）
-- - 既に離脱(left_at)済みのメンバーは left_at をクリアして再参加できる
-- - 既にアクティブ参加中なら ALREADY_MEMBER を返す
-- 戻り値: 'JOINED' | 'REJOINED' | 'ALREADY_MEMBER' | 'EVENT_NOT_FOUND' | 'EVENT_ALREADY_ENDED' | 'NOT_AUTHENTICATED'
create or replace function public.join_event(p_event_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events;
  v_existing public.event_members;
begin
  if v_uid is null then
    return 'NOT_AUTHENTICATED';
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    return 'EVENT_NOT_FOUND';
  end if;

  if v_event.ended_at is not null then
    return 'EVENT_ALREADY_ENDED';
  end if;

  select * into v_existing
  from public.event_members
  where event_id = p_event_id and user_id = v_uid;

  if found then
    if v_existing.left_at is null then
      return 'ALREADY_MEMBER';
    end if;
    update public.event_members
    set left_at = null
    where event_id = p_event_id and user_id = v_uid;
    return 'REJOINED';
  end if;

  insert into public.event_members (event_id, user_id, role)
  values (p_event_id, v_uid, 'member');
  return 'JOINED';
end;
$$;

grant execute on function public.join_event(uuid) to authenticated;

comment on function public.join_event is 'イベント参加（再参加対応・終了/存在チェック込み、RLSバイパス）';
