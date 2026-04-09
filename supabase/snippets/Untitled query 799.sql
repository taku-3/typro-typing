select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'password_reset_tokens'
order by ordinal_position;