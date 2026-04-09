-- scores という名前のテーブルが存在するか
select table_schema, table_name
from information_schema.tables
where table_name = 'scores'
order by table_schema, table_name;