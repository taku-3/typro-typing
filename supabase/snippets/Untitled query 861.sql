select
  column_name,
  is_nullable,
  data_type,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'consents'
order by ordinal_position;