select lower(username) as normalized_username, count(*)
from credentials
group by lower(username)
having count(*) > 1;