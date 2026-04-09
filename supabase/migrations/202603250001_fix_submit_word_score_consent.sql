create or replace function public.submit_word_score(
  p_player_id uuid,
  p_theme_id text,
  p_level text,
  p_case_mode text,
  p_duration_sec int,
  p_score int,
  p_accuracy int,
  p_speed_cps numeric,
  p_typed_chars int,
  p_mistyped_count int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_player uuid;
  v_consent boolean;
  v_birth_year int;
  v_birth_month int;
  v_is_adult boolean := false;

  v_rank_status text := 'ranked';
  v_flag_reason text := null;

  v_now timestamptz := now();
  v_today date := (v_now at time zone 'utc')::date;

  v_types text[] := array['daily','weekly','monthly','yearly','alltime'];
  v_type text;
  v_start date;
begin
  if p_player_id is null then
    raise exception 'player_id_required';
  end if;

  -- JWT が付いているなら sub == p_player_id を強制
  v_claim_player := public.request_player_id();
  if v_claim_player is not null and v_claim_player <> p_player_id then
    raise exception 'player_mismatch';
  end if;

  -- 生年月取得
  select c.birth_year, c.birth_month
    into v_birth_year, v_birth_month
  from public.credentials c
  where c.player_id = p_player_id
  limit 1;

  -- 成人判定（signup / login と合わせる）
  if v_birth_year is not null and v_birth_month is not null then
    v_is_adult :=
      (
        extract(year from v_today)::int - v_birth_year
        - case
            when extract(month from v_today)::int < v_birth_month then 1
            else 0
          end
      ) >= 18;
  end if;

  -- 未成年のみ parental_consent=true 必須
  if not v_is_adult then
    select c.parental_consent
      into v_consent
    from public.consents c
    where c.player_id = p_player_id
    limit 1;

    if v_consent is distinct from true then
      raise exception 'parental_consent_required';
    end if;
  end if;

  -- 不正検知（初期版）
  if p_speed_cps > 20 then
    v_rank_status := 'needs_review';
    v_flag_reason := 'speed_cps_over_limit';
  end if;

  -- 生ログ
  insert into public.scores (
    player_id,
    mode,
    theme_id,
    level,
    case_mode,
    duration_sec,
    ended_at,
    score,
    accuracy,
    speed_cps,
    typed_chars,
    mistyped_count,
    rank_status,
    flag_reason
  )
  values (
    p_player_id,
    'word',
    p_theme_id,
    p_level,
    p_case_mode,
    p_duration_sec,
    v_now,
    p_score,
    p_accuracy,
    p_speed_cps,
    p_typed_chars,
    p_mistyped_count,
    v_rank_status,
    v_flag_reason
  );

  -- review はランキング反映しない
  if v_rank_status <> 'ranked' then
    return json_build_object(
      'ok', true,
      'rank_status', v_rank_status,
      'flag_reason', v_flag_reason
    );
  end if;

  -- 期間別キャッシュ更新
  foreach v_type in array v_types loop
    v_start := public.period_start(v_type, v_today);

    insert into public.leaderboard_public_cache (
      period_type,
      period_start,
      mode,
      theme_id,
      level,
      case_mode,
      duration_sec,
      player_id,
      best_score,
      first_achieved_at,
      updated_at
    )
    values (
      v_type,
      v_start,
      'word',
      p_theme_id,
      p_level,
      p_case_mode,
      p_duration_sec,
      p_player_id,
      p_score,
      v_now,
      v_now
    )
    on conflict (
      period_type,
      period_start,
      mode,
      theme_id,
      level,
      case_mode,
      duration_sec,
      player_id
    )
    do update set
      best_score =
        case
          when excluded.best_score > public.leaderboard_public_cache.best_score
            then excluded.best_score
          else public.leaderboard_public_cache.best_score
        end,
      first_achieved_at =
        case
          when excluded.best_score > public.leaderboard_public_cache.best_score
            then excluded.first_achieved_at
          when excluded.best_score = public.leaderboard_public_cache.best_score
            then least(public.leaderboard_public_cache.first_achieved_at, excluded.first_achieved_at)
          else public.leaderboard_public_cache.first_achieved_at
        end,
      updated_at = now();
  end loop;

  return json_build_object(
    'ok', true,
    'rank_status', v_rank_status
  );
end;
$$;

revoke all on function public.submit_word_score(uuid,text,text,text,int,int,int,numeric,int,int) from public;
grant execute on function public.submit_word_score(uuid,text,text,text,int,int,int,numeric,int,int) to service_role;