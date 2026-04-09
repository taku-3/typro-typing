select
  id,
  player_id,
  email_id,
  token_hash,
  expires_at,
  used_at,
  created_at,
  requested_ip,
  user_agent
from password_reset_tokens
order by created_at desc
limit 5;