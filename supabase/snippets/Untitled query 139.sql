select
  c.username,
  c.player_id,
  e.id as email_id,
  e.email,
  e.is_primary
from credentials c
left join emails e
  on e.player_id = c.player_id
order by c.username, e.is_primary desc, e.email;