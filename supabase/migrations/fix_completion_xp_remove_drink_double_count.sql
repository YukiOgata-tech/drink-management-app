-- 完了XPの二重計上を解消（本番 ctwpnaizwsrffrkkbuig 適用済み）
-- 飲酒記録XPは「記録時」に付与済みのため、完了XPの合計からは drinkLogsXP を除外する。
-- total = base(30) + 参加人数ボーナス + 順位ボーナス。drink_count は表示用に保持、drink_logs_xp=0。
create or replace function public.award_event_completion_xp(p_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_event public.events;
  v_active_count integer;
  v_participant_bonus integer;
  v_base integer := 30;
  m record;
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
    select coalesce(sum(dl.count), 0) into v_drink_count
    from public.drink_logs dl
    where dl.event_id = p_event_id and dl.user_id = m.user_id and dl.status = 'approved';

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
    v_total := v_base + v_participant_bonus + v_ranking_bonus;

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
      p_event_id, m.user_id, v_base, v_participant_bonus, v_ranking_bonus, 0,
      v_total, v_active_count, v_drink_count, v_rank, (v_new_level > v_old_level), v_new_level, v_debt
    ) on conflict (event_id, user_id) do nothing;
  end loop;
end;
$$;
