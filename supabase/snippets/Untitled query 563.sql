alter table public.scores enable row level security;

drop policy if exists scores_insert_own on public.scores;
create policy scores_insert_own
on public.scores
for insert
with check (player_id = public.request_player_id());

drop policy if exists scores_select_own on public.scores;
create policy scores_select_own
on public.scores
for select
using (player_id = public.request_player_id());