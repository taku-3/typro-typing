select
  e.id,
  e.player_id,
  e.email,
  e.is_primary
from emails e
join credentials c
  on c.player_id = e.player_id
where c.username = 'Takumi';