create or replace function public.request_player_id()
returns uuid
language sql
stable
as $$
  select nullif((current_setting('request.jwt.claims', true)),'')::json->>'sub'
$$::uuid;