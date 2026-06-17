-- ===== イベント完了XPのサーバー側一括付与（本番 ctwpnaizwsrffrkkbuig 適用済み）=====
-- 1) 離脱メンバー(left_at IS NOT NULL)には付与しない
-- 2) 重複付与をDBで防止（event_xp_claims）
-- 3) 参加人数はアクティブ会員のみでカウント
-- 4) イベント終了時（手動 + cron自動終了）にクライアント不要で付与

create table if not exists public.event_xp_claims (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  base_xp integer not null default 0,
  participant_bonus integer not null default 0,
  ranking_bonus integer not null default 0,
  drink_logs_xp integer not null default 0,
  total_xp integer not null default 0,
  participant_count integer not null default 0,
  drink_count integer not null default 0,
  rank integer,
  leveled_up boolean not null default false,
  new_level integer,
  debt_paid integer not null default 0,
  claimed_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_xp_claims enable row level security;

drop policy if exists "Users can view own event xp claims" on public.event_xp_claims;
create policy "Users can view own event xp claims"
  on public.event_xp_claims for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.xp_for_level(p_level integer)
returns integer language sql immutable as $$
  select case when p_level <= 1 then 0 else floor(50 * power(p_level, 1.5))::integer end;
$$;

create or replace function public.calculate_level(p_total_xp integer)
returns integer language plpgsql immutable as $$
declare v_level integer := 1;
begin
  if p_total_xp < 0 then return 1; end if;
  while public.xp_for_level(v_level + 1) <= p_total_xp loop
    v_level := v_level + 1;
  end loop;
  return v_level;
end;
$$;

create or replace function public.award_event_completion_xp(p_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_event public.events;
  v_active_count integer;
  v_participant_bonus integer;
  v_base integer := 30;
  m record;
  v_alcohol numeric;
  v_drink_xp integer;
  v_drink_count integer;
  v_rank integer;
  v_ranking_bonus integer;
  v_total integer;
  v_old_xp integer; v_neg integer; v_debt integer; v_eff integer;
  v_new_xp integer; v_old_level integer; v_new_level integer;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found or v_event.ended_at is null then return; end if;

  select count(*) into v_active_count
  from public.event_members where event_id = p_event_id and left_at is null;

  v_participant_bonus := least(greatest(v_active_count - 1, 0) * 5, 50);

  for m in
    select em.user_id
    from public.event_members em
    where em.event_id = p_event_id and em.left_at is null
      and not exists (
        select 1 from public.event_xp_claims c
        where c.event_id = p_event_id and c.user_id = em.user_id
      )
  loop
    select coalesce(sum(dl.pure_alcohol_g), 0), coalesce(sum(dl.count), 0)
      into v_alcohol, v_drink_count
    from public.drink_logs dl
    where dl.event_id = p_event_id and dl.user_id = m.user_id and dl.status = 'approved';

    v_drink_xp := floor(v_alcohol)::integer;

    select r.rnk into v_rank from (
      select em2.user_id,
             rank() over (order by coalesce(s.total_alc, 0) desc) as rnk,
             coalesce(s.total_alc, 0) as total_alc
      from public.event_members em2
      left join (
        select user_id, sum(pure_alcohol_g) as total_alc
        from public.drink_logs
        where event_id = p_event_id and status = 'approved'
        group by user_id
      ) s on s.user_id = em2.user_id
      where em2.event_id = p_event_id and em2.left_at is null
    ) r
    where r.user_id = m.user_id and r.total_alc > 0;

    v_ranking_bonus := case v_rank when 1 then 100 when 2 then 50 when 3 then 30 else 0 end;
    v_total := v_base + v_participant_bonus + v_ranking_bonus + v_drink_xp;

    select coalesce(total_xp, 0), coalesce(negative_xp, 0)
      into v_old_xp, v_neg
    from public.profiles where id = m.user_id for update;

    v_debt := least(v_total, v_neg);
    v_eff := v_total - v_debt;
    v_new_xp := v_old_xp + v_eff;
    v_old_level := public.calculate_level(v_old_xp);
    v_new_level := public.calculate_level(v_new_xp);

    update public.profiles
      set total_xp = v_new_xp, negative_xp = v_neg - v_debt, level = v_new_level
    where id = m.user_id;

    insert into public.event_xp_claims (
      event_id, user_id, base_xp, participant_bonus, ranking_bonus, drink_logs_xp,
      total_xp, participant_count, drink_count, rank, leveled_up, new_level, debt_paid
    ) values (
      p_event_id, m.user_id, v_base, v_participant_bonus, v_ranking_bonus, v_drink_xp,
      v_total, v_active_count, v_drink_count, v_rank, (v_new_level > v_old_level), v_new_level, v_debt
    ) on conflict (event_id, user_id) do nothing;
  end loop;
end;
$$;

comment on function public.award_event_completion_xp is 'イベント終了時に在籍メンバーへ完了XPを付与（離脱者除外・重複防止・借金XP相殺）';

create or replace function public.on_event_ended()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.ended_at is null and new.ended_at is not null then
    perform public.award_event_completion_xp(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_event_ended on public.events;
create trigger trg_event_ended
  after update on public.events
  for each row execute function public.on_event_ended();
