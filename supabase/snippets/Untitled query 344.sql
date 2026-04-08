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
as $$
declare
  v_claim_player uuid;
  v_consent boolean;
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

  -- JWTが付いているなら "sub == p_player_id" を強制（なりすまし防止）
  v_claim_player := public.request_player_id();
  if v_claim_player is not null and v_claim_player <> p_player_id then
    raise exception 'player_mismatch';
  end if;

  -- 1) parental_consent=true 必須（falseならDB書き込み禁止）:contentReference[oaicite:6]{index=6}
  select c.parental_consent
    into v_consent
  from public.consents c
  where c.player_id = p_player_id;

  if v_consent is distinct from true then
    raise exception 'parental_consent_required';
  end if;

  -- 2) CPS上限チェック（初期値: speed_cps > 20）:contentReference[oaicite:7]{index=7}
  if p_speed_cps > 20 then
    v_rank_status := 'needs_review';
    v_flag_reason := 'speed_cps_over_limit';
  end if;

  -- 3) scores（生ログ）insert
  insert into public.scores (
    player_id, mode, theme_id, level, case_mode, duration_sec,
    ended_at, score, accuracy, speed_cps, typed_chars, mistyped_count,
    rank_status, flag_reason
  )
  values (
    p_player_id, 'word', p_theme_id, p_level, p_case_mode, p_duration_sec,
    v_now, p_score, p_accuracy, p_speed_cps, p_typed_chars, p_mistyped_count,
    v_rank_status, v_flag_reason
  );

  -- needs_review はランキング集計しない（キャッシュ更新しない）
  if v_rank_status <> 'ranked' then
    return json_build_object(
      'ok', true,
      'rank_status', v_rank_status,
      'flag_reason', v_flag_reason
    );
  end if;

  -- 4) 期間別ランキングキャッシュ upsert（best_score/first_achieved_at）:contentReference[oaicite:8]{index=8}
  foreach v_type in array v_types loop
    v_start := public.period_start(v_type, v_today);

    insert into public.leaderboard_public_cache (
      period_type, period_start,
      mode, theme_id, level, case_mode, duration_sec,
      player_id, best_score, first_achieved_at, updated_at
    )
    values (
      v_type, v_start,
      'word', p_theme_id, p_level, p_case_mode, p_duration_sec,
      p_player_id, p_score, v_now, v_now
    )
    on conflict (period_type, period_start, mode, theme_id, level, case_mode, duration_sec, player_id)
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

  return json_build_object('ok', true, 'rank_status', v_rank_status);
end;
$$;

-- 権限：とりあえず PUBLIC からは剥がす（Edge Functionからだけ叩く運用にしやすい）
revoke all on function public.submit_word_score(uuid,text,text,text,int,int,int,numeric,int,int) from public;