select
  period_type,
  period_start,
  theme_id,
  level,
  case_mode,
  duration_sec,
  player_id,
  best_score,
  updated_at
from public.leaderboard_public_cache
where theme_id = 'animals'
  and level = 'easy'
  and case_mode = 'lower'
  and duration_sec = 60
order by period_start desc, updated_at desc;