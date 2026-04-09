select indexname, indexdef
from pg_indexes
where tablename = 'password_reset_tokens';