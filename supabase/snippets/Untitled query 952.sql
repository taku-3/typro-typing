select
  c.username,
  e.player_id,
  e.email,
  e.is_primary,
  e.verified_at
from public.credentials c
join public.emails e
  on e.player_id = c.player_id
where c.username = 'testuser123';