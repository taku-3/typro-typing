create view public.leaderboard_public_view as
select
  c.period_type,
  c.period_start,
  c.mode,
  c.theme_id,
  c.level,
  c.case_mode,
  c.duration_sec,
  c.player_id,
  c.best_score,
  c.first_achieved_at,
  p.display_name,
  p.icon_url
from public.leaderboard_public_cache c
join public.players p
  on p.id = c.player_id;