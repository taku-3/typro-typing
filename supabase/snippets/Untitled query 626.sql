select
  id,
  player_id,
  token_hash,
  expires_at,
  used_at,
  used_ip,
  created_at
from password_reset_tokens
order by created_at desc
limit 5;