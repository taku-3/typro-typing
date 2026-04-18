select
  id,
  player_id,
  used_at,
  used_ip,
  used_user_agent
from public.password_reset_tokens
order by created_at desc
limit 5;