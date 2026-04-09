select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in ('request_player_id','submit_word_score');