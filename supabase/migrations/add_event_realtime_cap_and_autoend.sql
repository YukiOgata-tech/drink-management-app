-- =====================================================
-- イベントのリアルタイム上限ゲート & 放置イベント自動終了
-- （本番プロジェクト ctwpnaizwsrffrkkbuig に適用済み）
-- =====================================================

-- 開催中（ended_at IS NULL）のイベント総数を返す（RLSをバイパス）。
-- リアルタイム購読の同時上限（開催中イベント40件）の判定に使用。
create or replace function public.count_active_events()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int from public.events where ended_at is null;
$$;

grant execute on function public.count_active_events() to anon, authenticated;

comment on function public.count_active_events is '開催中イベント数を返す（リアルタイム同時上限の判定用、RLSバイパス）';

-- 放置イベントの自動終了：最終アクティビティ（開始時刻 or 最新の飲酒記録）から
-- 12時間操作が無い開催中イベントを ended_at = now() で終了する。
-- クライアント不要のサーバー側処理（誰も開いていない放置イベントも閉じる）。
create or replace function public.auto_end_inactive_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with to_end as (
    select e.id
    from public.events e
    where e.ended_at is null
      and greatest(
        e.started_at,
        coalesce(
          (select max(dl.recorded_at) from public.drink_logs dl where dl.event_id = e.id),
          e.started_at
        )
      ) < now() - interval '12 hours'
  )
  update public.events
  set ended_at = now()
  where id in (select id from to_end);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.auto_end_inactive_events is '最終記録から12時間無操作の開催中イベントを自動終了する（pg_cronで毎時実行）';

-- pg_cron を有効化し、毎時0分に自動終了ジョブを実行
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('auto-end-inactive-events');
exception when others then
  null;
end $$;

select cron.schedule(
  'auto-end-inactive-events',
  '0 * * * *',
  $$select public.auto_end_inactive_events();$$
);

-- drink_logs を Realtime 配信対象に追加（イベント詳細のリアルタイム反映用）
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'drink_logs'
  ) then
    alter publication supabase_realtime add table public.drink_logs;
  end if;
end $$;
