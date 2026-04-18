select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'email_verification_tokens'
order by indexname;