create or replace function public.request_player_id()
returns uuid
language sql
stable
as $$
  select case
    when nullif(current_setting('request.jwt.claims', true), '') is null then null::uuid
    else (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
  end
$$;