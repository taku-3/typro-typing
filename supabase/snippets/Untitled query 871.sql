select
  player_id,
  theme_id,
  level,
  case_mode,
  duration_sec,
  score,
  speed_cps,
  rank_status,
  flag_reason,
  ended_at
from public.scores
order by ended_at desc
limit 10;