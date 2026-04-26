select
  id,
  player_id,
  email_id,
  used_at,
  used_ip,
  used_user_agent
from public.email_verification_tokens
order by created_at desc
limit 5;