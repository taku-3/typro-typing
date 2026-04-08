select routine_name
from information_schema.routines
where routine_schema='public'
order by routine_name;