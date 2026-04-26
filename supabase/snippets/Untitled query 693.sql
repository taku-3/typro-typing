select
  id,
  player_id,
  email_id,
  token_hash,
  expires_at,
  used_at,
  created_at,
  requested_ip,
  requested_user_agent
from public.email_verification_tokens
order by created_at desc
limit 5;