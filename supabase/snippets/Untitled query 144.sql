alter table public.leaderboard_public_cache enable row level security;

drop policy if exists leaderboard_cache_public_read on public.leaderboard_public_cache;
create policy leaderboard_cache_public_read
on public.leaderboard_public_cache
for select
using (true);