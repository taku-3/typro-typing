select username, count(*)
from credentials
group by username
having count(*) > 1;